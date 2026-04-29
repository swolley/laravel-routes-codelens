import type { LaravelRouteInfo } from './routeListParser';
import type { PhpClassLikeSymbol } from './phpSymbolParser';

export interface DeclaredRouteLookup {
    getRoutesForDeclaredAction(action: string): LaravelRouteInfo[];
}

export class ControllerHierarchy {
    private readonly symbols_by_fqcn = new Map<string, PhpClassLikeSymbol>();

    constructor(symbols: PhpClassLikeSymbol[]) {
        for (const symbol of symbols) {
            this.symbols_by_fqcn.set(symbol.fqcn, symbol);
        }
    }

    public resolveDeclaringAction(action: string): string {
        const parts = action.split('@');
        if (parts.length !== 2) {
            return action;
        }

        const [fqcn, method_name] = parts;
        if (!fqcn || !method_name) {
            return action;
        }

        const visited = new Set<string>();
        let current = fqcn;
        while (current && !visited.has(current)) {
            visited.add(current);
            const symbol = this.symbols_by_fqcn.get(current);
            if (!symbol) {
                break;
            }

            if (symbol.method_lines.has(method_name)) {
                return `${current}@${method_name}`;
            }

            if (this.methodExistsInTraits(symbol, method_name, new Set<string>())) {
                return `${current}@${method_name}`;
            }

            current = symbol.parent_fqcn ?? '';
        }

        return action;
    }

    private methodExistsInTraits(
        symbol: PhpClassLikeSymbol,
        method_name: string,
        visited_traits: Set<string>
    ): boolean {
        for (const trait_fqcn of symbol.trait_fqcns) {
            if (visited_traits.has(trait_fqcn)) {
                continue;
            }
            visited_traits.add(trait_fqcn);

            const trait_symbol = this.symbols_by_fqcn.get(trait_fqcn);
            if (!trait_symbol || trait_symbol.kind !== 'trait') {
                continue;
            }

            if (trait_symbol.method_lines.has(method_name)) {
                return true;
            }

            if (this.methodExistsInTraits(trait_symbol, method_name, visited_traits)) {
                return true;
            }
        }

        return false;
    }
}

export function buildDeclaredRoutesLookup(
    routes_by_action: Map<string, LaravelRouteInfo[]>,
    hierarchy: ControllerHierarchy
): DeclaredRouteLookup {
    const routes_by_declared_action = new Map<string, LaravelRouteInfo[]>();

    for (const [action, routes] of routes_by_action.entries()) {
        const declared_action = hierarchy.resolveDeclaringAction(action);
        const existing = routes_by_declared_action.get(declared_action);
        if (existing) {
            existing.push(...routes);
            continue;
        }
        routes_by_declared_action.set(declared_action, [...routes]);
    }

    return {
        getRoutesForDeclaredAction(action: string): LaravelRouteInfo[] {
            return routes_by_declared_action.get(action) ?? [];
        }
    };
}

