const findFilesMock = jest.fn();
const openTextDocumentMock = jest.fn();
const relativePatternMock = jest.fn().mockImplementation((base, pattern) => ({ base, pattern }));

jest.mock('vscode', () => ({
    workspace: {
        findFiles: (...args: unknown[]) => findFilesMock(...args),
        openTextDocument: (...args: unknown[]) => openTextDocumentMock(...args)
    },
    RelativePattern: relativePatternMock
}), { virtual: true });

import { ControllerIndexService } from '../controllerIndexService';

type MockWorkspaceFolder = {
    uri: { fsPath: string };
};

describe('ControllerIndexService', () => {
    const workspace_folder: MockWorkspaceFolder = {
        uri: { fsPath: '/workspace/project' }
    };

    beforeEach(() => {
        findFilesMock.mockReset();
        openTextDocumentMock.mockReset();
        relativePatternMock.mockClear();
    });

    it('loads files only once with ensureLoaded and builds hierarchy', async () => {
        const service = new ControllerIndexService(workspace_folder as never);
        findFilesMock.mockResolvedValue([
            { fsPath: '/workspace/project/app/Http/Controllers/ContentController.php' },
            { fsPath: '/workspace/project/app/Http/Controllers/StoriesController.php' }
        ]);
        openTextDocumentMock
            .mockResolvedValueOnce({
                getText: () => `<?php
namespace App\\Http\\Controllers;
class ContentController {
    public function index() {}
}`
            })
            .mockResolvedValueOnce({
                getText: () => `<?php
namespace App\\Http\\Controllers;
class StoriesController extends ContentController {}`
            });

        await service.ensureLoaded();
        const action = service
            .getHierarchy()
            .resolveDeclaringAction('App\\Http\\Controllers\\StoriesController@index');

        expect(action).toBe('App\\Http\\Controllers\\ContentController@index');
        expect(findFilesMock).toHaveBeenCalledTimes(1);
        expect(relativePatternMock).toHaveBeenCalledWith(workspace_folder, 'app/**/*.php');

        await service.ensureLoaded();
        expect(findFilesMock).toHaveBeenCalledTimes(1);
    });

    it('refreshAll clears cache and reloads', async () => {
        const service = new ControllerIndexService(workspace_folder as never);
        findFilesMock.mockResolvedValue([
            { fsPath: '/workspace/project/app/Http/Controllers/ContentController.php' }
        ]);
        openTextDocumentMock.mockResolvedValue({
            getText: () => `<?php
namespace App\\Http\\Controllers;
class ContentController {
    public function index() {}
}`
        });

        await service.ensureLoaded();
        const previous_version = service.getVersion();
        await service.refreshAll();

        expect(findFilesMock).toHaveBeenCalledTimes(2);
        expect(service.getVersion()).toBeGreaterThan(previous_version);
    });

    it('reindexFile ignores out-of-workspace and non-php files', async () => {
        const service = new ControllerIndexService(workspace_folder as never);
        const initial_version = service.getVersion();

        await service.reindexFile({ fsPath: '/other/path/TestController.php' } as never);
        await service.reindexFile({ fsPath: '/workspace/project/readme.md' } as never);

        expect(openTextDocumentMock).not.toHaveBeenCalled();
        expect(service.getVersion()).toBe(initial_version);
    });

    it('reindexFile removes symbol when parser finds no class', async () => {
        const service = new ControllerIndexService(workspace_folder as never);
        openTextDocumentMock.mockResolvedValue({
            getText: () => '<?php echo "no class";'
        });

        await service.reindexFile({ fsPath: '/workspace/project/app/Http/Controllers/Empty.php' } as never);

        const action = service
            .getHierarchy()
            .resolveDeclaringAction('App\\Http\\Controllers\\Empty@index');
        expect(action).toBe('App\\Http\\Controllers\\Empty@index');
    });
});

