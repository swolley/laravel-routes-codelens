import type { LaravelRouteInfo } from './routeListParser';
import { parseRouteListJson } from './routeListParser';

export type RouteListRunner = (cwd: string) => Promise<string>;

/**
 * Service that holds the route list and provides lookup by action.
 * The runner (e.g. php artisan route:list --json) is injected for testability.
 * Each action can have multiple routes (e.g. same controller method for GET and POST).
 */
export class RouteService {
    private routesByAction = new Map<string, LaravelRouteInfo[]>();
    private isRefreshing = false;

    constructor(
        private readonly cwd: string | undefined,
        private readonly runRouteList: RouteListRunner
    ) {}

    public async ensureLoaded(): Promise<void> {
        if (this.routesByAction.size > 0 || this.isRefreshing) {
            return;
        }
        await this.refresh();
    }

    public async refresh(): Promise<void> {
        if (!this.cwd) {
            return;
        }

        this.isRefreshing = true;
        try {
            const output = await this.runRouteList(this.cwd);
            this.routesByAction = parseRouteListJson(output);
        } catch (error) {
            console.error('Failed to refresh Laravel routes', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Returns all routes registered for the given controller action.
     * When a method is linked to multiple routes (e.g. GET /resource and POST /resource),
     * all of them are returned so each can be shown on its own CodeLens line.
     */
    public getRoutesForAction(action: string): LaravelRouteInfo[] {
        return this.routesByAction.get(action) ?? [];
    }

    /** Exposed for tests: current number of unique actions with at least one route. */
    public get loadedRouteCount(): number {
        return this.routesByAction.size;
    }
}
