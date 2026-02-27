/**
 * Parses Laravel `php artisan route:list --json` output into a map of action -> route info.
 * Pure function: no I/O, fully unit-testable.
 */

export interface LaravelRouteInfo {
    method: string;
    uri: string;
    name?: string;
    action: string;
}

interface RawRouteRow {
    action?: string;
    action_name?: string;
    methods?: string[];
    method?: string;
    uri?: string;
    path?: string;
    name?: string;
    route_name?: string;
}

/**
 * Parses JSON string from `php artisan route:list --json` and returns
 * a map of controller action (e.g. "App\\Http\\Controllers\\UserController@index") to an array
 * of route info. When the same action is used by multiple routes (e.g. GET and POST to same URI),
 * all of them are collected so each can be displayed on its own CodeLens line.
 * Skips closures and entries without a valid action.
 */
export function parseRouteListJson(jsonStr: string): Map<string, LaravelRouteInfo[]> {
    const map = new Map<string, LaravelRouteInfo[]>();

    try {
        const raw = JSON.parse(jsonStr) as RawRouteRow[];
        if (!Array.isArray(raw)) {
            return map;
        }

        for (const route of raw) {
            const action: string = route.action ?? route.action_name ?? '';
            if (!action || action === 'Closure') {
                continue;
            }

            const methods: string[] = Array.isArray(route.methods)
                ? route.methods
                : [route.method ?? 'GET'];
            const method = methods[0];
            const uri: string = route.uri ?? route.path ?? '';
            const name: string | undefined = route.name ?? route.route_name;

            const info: LaravelRouteInfo = {
                method,
                uri,
                name,
                action
            };

            const existing = map.get(action);
            if (existing) {
                existing.push(info);
            } else {
                map.set(action, [info]);
            }
        }
    } catch {
        // Return empty map on parse error; caller can handle if needed
    }

    return map;
}
