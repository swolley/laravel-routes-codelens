/**
 * Pure logic to build CodeLens item descriptors (line + title) from controller actions
 * and route lookup. Used by the extension to produce one item per route so that
 * multiple routes for the same method appear on multiple lines.
 * No VS Code dependency — fully unit-testable.
 */

import type { ControllerAction } from './controllerParser';
import type { LaravelRouteInfo } from './routeListParser';

export interface CodeLensItem {
    line: number;
    title: string;
}

/**
 * Builds one CodeLens item per route for each action that has at least one route.
 * When an action is linked to multiple routes (e.g. GET and POST), returns multiple
 * items with the same line so the UI can show them on separate lines.
 */
export function buildCodeLensItems(
    actions: ControllerAction[],
    getRoutesForAction: (action: string) => LaravelRouteInfo[]
): CodeLensItem[] {
    const items: CodeLensItem[] = [];

    for (const { action, line } of actions) {
        const routes = getRoutesForAction(action);
        if (routes.length === 0) {
            continue;
        }

        for (const routeInfo of routes) {
            const titleParts = [routeInfo.method.toUpperCase(), routeInfo.uri];
            if (routeInfo.name) {
                titleParts.push(`(${routeInfo.name})`);
            }
            items.push({
                line,
                title: titleParts.join(' ')
            });
        }
    }

    return items;
}
