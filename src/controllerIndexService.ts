import * as vscode from 'vscode';
import { ControllerHierarchy } from './controllerHierarchy';
import { parsePhpClassLikeSymbol, type PhpClassLikeSymbol } from './phpSymbolParser';

export class ControllerIndexService {
    private symbols_by_file = new Map<string, PhpClassLikeSymbol>();
    private hierarchy_cache = new ControllerHierarchy([]);
    private version = 0;
    private is_loaded = false;

    constructor(private readonly workspace_folder: vscode.WorkspaceFolder) {}

    public async ensureLoaded(): Promise<void> {
        if (this.is_loaded) {
            return;
        }

        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(this.workspace_folder, 'app/**/*.php')
        );
        for (const file_uri of files) {
            await this.reindexFile(file_uri);
        }

        this.is_loaded = true;
        this.rebuildHierarchy();
    }

    public async refreshAll(): Promise<void> {
        this.symbols_by_file.clear();
        this.is_loaded = false;
        await this.ensureLoaded();
    }

    public async reindexFile(file_uri: vscode.Uri): Promise<void> {
        if (!file_uri.fsPath.startsWith(this.workspace_folder.uri.fsPath)) {
            return;
        }

        if (!file_uri.fsPath.endsWith('.php')) {
            return;
        }

        const doc = await vscode.workspace.openTextDocument(file_uri);
        const symbol = parsePhpClassLikeSymbol(doc.getText());
        if (symbol) {
            this.symbols_by_file.set(file_uri.fsPath, symbol);
        } else {
            this.symbols_by_file.delete(file_uri.fsPath);
        }
        this.rebuildHierarchy();
    }

    public getHierarchy(): ControllerHierarchy {
        return this.hierarchy_cache;
    }

    public getVersion(): number {
        return this.version;
    }

    private rebuildHierarchy(): void {
        this.hierarchy_cache = new ControllerHierarchy([...this.symbols_by_file.values()]);
        this.version++;
    }
}

