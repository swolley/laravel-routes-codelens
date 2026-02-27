import * as vscode from 'vscode';
import * as cp from 'child_process';
import { RouteService } from './routeService';
import { getControllerActionsFromPhpSource } from './controllerParser';

function execArtisanRouteList(cwd: string): Promise<string> {
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
        const lenses: vscode.CodeLens[] = [];

        for (const { action, line } of actions) {
            const routeInfo = this.routeService.getRouteForAction(action);
            if (!routeInfo) {
                continue;
            }

            const range = new vscode.Range(line, 0, line, 0);
            const titleParts = [routeInfo.method.toUpperCase(), routeInfo.uri];
            if (routeInfo.name) {
                titleParts.push(`(${routeInfo.name})`);
            }
            const title = titleParts.join(' ');

            lenses.push(
                new vscode.CodeLens(range, {
                    title,
                    command: '',
                    arguments: []
                })
            );
        }

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
