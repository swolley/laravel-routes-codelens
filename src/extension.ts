import * as vscode from 'vscode';
import * as cp from 'child_process';
import { RouteService } from './routeService';
import { getControllerActionsFromPhpSource } from './controllerParser';
import { buildCodeLensItems } from './codeLensItems';
import { isLaravelProject } from './laravelProject';

function execArtisanRouteList(cwd: string): Promise<string> {
    if (!isLaravelProject(cwd)) {
        return Promise.resolve('[]');
    }
    return new Promise((resolve, reject) => {
        cp.exec('php artisan route:list --json', { cwd }, (err, stdout, stderr) => {
            if (err) {
                return reject(err);
            }
            if (stderr && stderr.trim().length > 0) {
                console.warn('php artisan route:list stderr:', stderr);
            }
            resolve(stdout);
        });
    });
}

class LaravelRouteCodeLensProvider implements vscode.CodeLensProvider {
    private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

    constructor(private routeService: RouteService) {}

    public refresh(): void {
        this.onDidChangeCodeLensesEmitter.fire();
    }

    public async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        await this.routeService.ensureLoaded();
        if (token.isCancellationRequested) {
            return [];
        }

        const text = document.getText();
        const actions = getControllerActionsFromPhpSource(text);
        const items = buildCodeLensItems(actions, (action) =>
            this.routeService.getRoutesForAction(action)
        );

        const lenses: vscode.CodeLens[] = items.map((item) => {
            const range = new vscode.Range(item.line, 0, item.line, 0);
            return new vscode.CodeLens(range, {
                title: item.title,
                command: '',
                arguments: []
            });
        });

        return lenses;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const cwd = workspaceFolder?.uri.fsPath;
    const routeService = new RouteService(cwd, execArtisanRouteList);

    const provider = new LaravelRouteCodeLensProvider(routeService);

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'php', scheme: 'file' }, provider)
    );

    const refreshCommand = vscode.commands.registerCommand('laravelRoutes.refresh', async () => {
        await routeService.refresh();
        provider.refresh();
    });

    context.subscriptions.push(refreshCommand);
}

export function deactivate() {
    // No-op
}
