import * as vscode from 'vscode';
import * as cp from 'child_process';
import { RouteService } from './routeService';
import { getControllerActionsFromPhpSource } from './controllerParser';
import { buildCodeLensItems } from './codeLensItems';
import { isLaravelProject } from './laravelProject';

function execArtisanRouteList(cwd: string, output_channel: vscode.OutputChannel): Promise<string> {
    if (!isLaravelProject(cwd)) {
        output_channel.appendLine(`[laravel-routes-codelens] Skipping route list, not a Laravel root: ${cwd}`);
        return Promise.resolve('[]');
    }

    return new Promise((resolve, reject) => {
        cp.execFile('php', ['artisan', 'route:list', '--json'], { cwd }, (err, stdout, stderr) => {
            if (err) {
                output_channel.appendLine(
                    `[laravel-routes-codelens] route:list failed in "${cwd}": ${err.message}`
                );
                if (stderr && stderr.trim().length > 0) {
                    output_channel.appendLine(stderr.trim());
                }
                return reject(err);
            }
            if (stderr && stderr.trim().length > 0) {
                output_channel.appendLine(
                    `[laravel-routes-codelens] route:list stderr in "${cwd}": ${stderr.trim()}`
                );
            }
            resolve(stdout);
        });
    });
}

class LaravelRouteCodeLensProvider implements vscode.CodeLensProvider {
    private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

    constructor(
        private readonly get_route_service_for_document: (
            document: vscode.TextDocument
        ) => RouteService | undefined
    ) {}

    public refresh(): void {
        this.onDidChangeCodeLensesEmitter.fire();
    }

    public async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        const route_service = this.get_route_service_for_document(document);
        if (!route_service) {
            return [];
        }

        await route_service.ensureLoaded();
        if (token.isCancellationRequested) {
            return [];
        }

        const text = document.getText();
        const actions = getControllerActionsFromPhpSource(text);
        const items = buildCodeLensItems(actions, (action) =>
            route_service.getRoutesForAction(action)
        );

        const lenses: vscode.CodeLens[] = items.map((item) => {
            const range = new vscode.Range(item.line, 0, item.line, 0);
            return new vscode.CodeLens(range, {
                title: item.title,
                command: 'laravelRoutes.noop'
            });
        });

        return lenses;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const output_channel = vscode.window.createOutputChannel('Laravel Routes CodeLens');
    context.subscriptions.push(output_channel);

    const route_services_by_cwd = new Map<string, RouteService>();

    const get_or_create_route_service = (cwd: string): RouteService => {
        const existing_service = route_services_by_cwd.get(cwd);
        if (existing_service) {
            return existing_service;
        }

        const new_service = new RouteService(cwd, (service_cwd) =>
            execArtisanRouteList(service_cwd, output_channel)
        );
        route_services_by_cwd.set(cwd, new_service);
        return new_service;
    };

    const provider = new LaravelRouteCodeLensProvider((document) => {
        const workspace_folder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspace_folder) {
            output_channel.appendLine(
                `[laravel-routes-codelens] No workspace folder found for: ${document.uri.fsPath}`
            );
            return undefined;
        }

        return get_or_create_route_service(workspace_folder.uri.fsPath);
    });

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'php', scheme: 'file' }, provider)
    );

    const refreshCommand = vscode.commands.registerCommand('laravelRoutes.refresh', async () => {
        const services = [...route_services_by_cwd.values()];
        await Promise.all(services.map((service) => service.refresh()));
        provider.refresh();
    });

    const noOpCommand = vscode.commands.registerCommand('laravelRoutes.noop', () => {
        // Intentionally empty: CodeLens entries are informative only.
    });

    context.subscriptions.push(refreshCommand, noOpCommand);
}

export function deactivate() {
    // No-op
}
