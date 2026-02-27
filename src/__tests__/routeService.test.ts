import { RouteService } from '../routeService';

describe('RouteService', () => {
    const mockJson = `[
        {"method":"GET","uri":"users","name":"users.index","action":"App\\\\Http\\\\Controllers\\\\UserController@index"},
        {"method":"POST","uri":"users","name":"users.store","action":"App\\\\Http\\\\Controllers\\\\UserController@store"}
    ]`;

    it('loads routes via injected runner and returns route for action', async () => {
        const runRouteList = jest.fn().mockResolvedValue(mockJson);
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.refresh();

        expect(runRouteList).toHaveBeenCalledWith('/fake/cwd');
        expect(service.loadedRouteCount).toBe(2);

        const index = service.getRouteForAction('App\\Http\\Controllers\\UserController@index');
        expect(index).toBeDefined();
        expect(index?.method).toBe('GET');
        expect(index?.uri).toBe('users');
        expect(index?.name).toBe('users.index');

        const store = service.getRouteForAction('App\\Http\\Controllers\\UserController@store');
        expect(store?.method).toBe('POST');
        expect(store?.uri).toBe('users');
    });

    it('returns undefined for unknown action', async () => {
        const runRouteList = jest.fn().mockResolvedValue(mockJson);
        const service = new RouteService('/fake/cwd', runRouteList);
        await service.refresh();

        const unknown = service.getRouteForAction('App\\Http\\Controllers\\UnknownController@missing');
        expect(unknown).toBeUndefined();
    });

    it('does not call runner when cwd is undefined', async () => {
        const runRouteList = jest.fn();
        const service = new RouteService(undefined, runRouteList);

        await service.refresh();

        expect(runRouteList).not.toHaveBeenCalled();
        expect(service.loadedRouteCount).toBe(0);
    });

    it('ensureLoaded calls refresh when no routes loaded', async () => {
        const runRouteList = jest.fn().mockResolvedValue(mockJson);
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.ensureLoaded();

        expect(runRouteList).toHaveBeenCalledTimes(1);
        expect(service.getRouteForAction('App\\Http\\Controllers\\UserController@index')).toBeDefined();
    });

    it('ensureLoaded does not call refresh again when already loaded', async () => {
        const runRouteList = jest.fn().mockResolvedValue(mockJson);
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.ensureLoaded();
        await service.ensureLoaded();

        expect(runRouteList).toHaveBeenCalledTimes(1);
    });

    it('refresh replaces routes with new data', async () => {
        const runRouteList = jest
            .fn()
            .mockResolvedValueOnce(mockJson)
            .mockResolvedValueOnce(
                `[{"method":"GET","uri":"other","name":null,"action":"App\\\\Http\\\\Controllers\\\\OtherController@index"}]`
            );
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.refresh();
        expect(service.loadedRouteCount).toBe(2);

        await service.refresh();
        expect(service.loadedRouteCount).toBe(1);
        expect(service.getRouteForAction('App\\Http\\Controllers\\UserController@index')).toBeUndefined();
        expect(service.getRouteForAction('App\\Http\\Controllers\\OtherController@index')).toBeDefined();
    });

    it('on runner failure keeps previous routes and does not throw', async () => {
        const runRouteList = jest
            .fn()
            .mockResolvedValueOnce(mockJson)
            .mockRejectedValueOnce(new Error('artisan failed'));
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.refresh();
        expect(service.loadedRouteCount).toBe(2);

        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        await service.refresh();
        spy.mockRestore();

        expect(service.loadedRouteCount).toBe(2);
        expect(service.getRouteForAction('App\\Http\\Controllers\\UserController@index')).toBeDefined();
    });
});
