import * as vscode from 'vscode';
import * as cp from 'child_process';
import { RouteService } from './routeService';
import { getControllerActionsFromPhpSource } from './controllerParser';
import { buildCodeLensItems } from './codeLensItems';
import { isLaravelProject } from './laravelProject';
import { ControllerIndexService } from './controllerIndexService';
import { buildDeclaredRoutesLookup, type DeclaredRouteLookup } from './controllerHierarchy';

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
        private readonly get_services_for_document: (
            document: vscode.TextDocument
        ) =>
            | {
                  route_service: RouteService;
                  controller_index_service: ControllerIndexService;
              }
            | undefined
    ) {}

    private declared_lookup_cache = new WeakMap<RouteService, {
        lookup: DeclaredRouteLookup;
        key: string;
    }>();

    public refresh(): void {
        this.onDidChangeCodeLensesEmitter.fire();
    }

    public async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        const services = this.get_services_for_document(document);
        if (!services) {
            return [];
        }
        const { route_service, controller_index_service } = services;

        await route_service.ensureLoaded();
        await controller_index_service.ensureLoaded();
        if (token.isCancellationRequested) {
            return [];
        }

        const text = document.getText();
        const actions = getControllerActionsFromPhpSource(text);
        const lookup = this.getDeclaredLookup(route_service, controller_index_service);
        const items = buildCodeLensItems(actions, (action) => lookup.getRoutesForDeclaredAction(action));

        const lenses: vscode.CodeLens[] = items.map((item) => {
            const range = new vscode.Range(item.line, 0, item.line, 0);
            return new vscode.CodeLens(range, {
                title: item.title,
                command: 'laravelRoutes.noop'
            });
        });

        return lenses;
    }

    private getDeclaredLookup(
        route_service: RouteService,
        controller_index_service: ControllerIndexService
    ): DeclaredRouteLookup {
        const key = `${route_service.getRefreshVersion()}:${controller_index_service.getVersion()}`;
        const existing = this.declared_lookup_cache.get(route_service);
        if (existing && existing.key === key) {
            return existing.lookup;
        }

        const lookup = buildDeclaredRoutesLookup(
            route_service.getAllRoutesByAction(),
            controller_index_service.getHierarchy()
        );
        this.declared_lookup_cache.set(route_service, { lookup, key });
        return lookup;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const output_channel = vscode.window.createOutputChannel('Laravel Routes CodeLens');
    context.subscriptions.push(output_channel);

    const route_services_by_cwd = new Map<string, RouteService>();
    const controller_index_services_by_cwd = new Map<string, ControllerIndexService>();

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

        const cwd = workspace_folder.uri.fsPath;
        const route_service = get_or_create_route_service(cwd);

        let controller_index_service = controller_index_services_by_cwd.get(cwd);
        if (!controller_index_service) {
            controller_index_service = new ControllerIndexService(workspace_folder);
            controller_index_services_by_cwd.set(cwd, controller_index_service);
        }

        return {
            route_service,
            controller_index_service
        };
    });

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'php', scheme: 'file' }, provider)
    );

    const refreshCommand = vscode.commands.registerCommand('laravelRoutes.refresh', async () => {
        const services = [...route_services_by_cwd.values()];
        const index_services = [...controller_index_services_by_cwd.values()];
        await Promise.all(services.map((service) => service.refresh()));
        await Promise.all(index_services.map((service) => service.refreshAll()));
        provider.refresh();
    });

    const noOpCommand = vscode.commands.registerCommand('laravelRoutes.noop', () => {
        // Intentionally empty: CodeLens entries are informative only.
    });

    const onSave = vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (document.languageId !== 'php') {
            return;
        }

        const workspace_folder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspace_folder) {
            return;
        }

        const cwd = workspace_folder.uri.fsPath;
        const route_service = route_services_by_cwd.get(cwd);
        const index_service = controller_index_services_by_cwd.get(cwd);
        if (!route_service || !index_service) {
            return;
        }

        await index_service.reindexFile(document.uri);
        provider.refresh();
    });

    context.subscriptions.push(refreshCommand, noOpCommand, onSave);
}

export function deactivate() {
    // No-op
}
