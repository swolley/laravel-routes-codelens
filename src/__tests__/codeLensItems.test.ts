import { buildCodeLensItems } from '../codeLensItems';
import type { ControllerAction } from '../controllerParser';
import type { LaravelRouteInfo } from '../routeListParser';

describe('buildCodeLensItems', () => {
    it('returns one item per route for each action', () => {
        const actions: ControllerAction[] = [
            { action: 'App\\Http\\Controllers\\UserController@index', line: 10 },
            { action: 'App\\Http\\Controllers\\UserController@store', line: 20 }
        ];
        const getRoutesForAction = (action: string): LaravelRouteInfo[] => {
            if (action === 'App\\Http\\Controllers\\UserController@index') {
                return [
                    { method: 'GET', uri: 'users', name: 'users.index', action }
                ];
            }
            if (action === 'App\\Http\\Controllers\\UserController@store') {
                return [
                    { method: 'POST', uri: 'users', name: 'users.store', action }
                ];
            }
            return [];
        };

        const items = buildCodeLensItems(actions, getRoutesForAction);

        expect(items).toHaveLength(2);
        expect(items[0]).toEqual({ line: 10, title: 'GET users (users.index)' });
        expect(items[1]).toEqual({ line: 20, title: 'POST users (users.store)' });
    });

    it('returns multiple items when one action has multiple routes (multiple lines)', () => {
        const actions: ControllerAction[] = [
            { action: 'App\\Http\\Controllers\\ItemController@show', line: 15 }
        ];
        const getRoutesForAction = (): LaravelRouteInfo[] => [
            { method: 'GET', uri: 'api/items/{id}', name: 'items.show', action: 'ItemController@show' },
            { method: 'PUT', uri: 'api/items/{id}', name: 'items.update', action: 'ItemController@show' }
        ];

        const items = buildCodeLensItems(actions, getRoutesForAction);

        expect(items).toHaveLength(2);
        expect(items[0]).toEqual({ line: 15, title: 'GET api/items/{id} (items.show)' });
        expect(items[1]).toEqual({ line: 15, title: 'PUT api/items/{id} (items.update)' });
    });

    it('skips actions with no routes', () => {
        const actions: ControllerAction[] = [
            { action: 'App\\Http\\Controllers\\MissingController@index', line: 5 }
        ];
        const getRoutesForAction = (): LaravelRouteInfo[] => [];

        const items = buildCodeLensItems(actions, getRoutesForAction);

        expect(items).toHaveLength(0);
    });

    it('omits name from title when route has no name', () => {
        const actions: ControllerAction[] = [
            { action: 'App\\Http\\Controllers\\AnonymousController@index', line: 0 }
        ];
        const getRoutesForAction = (): LaravelRouteInfo[] => [
            { method: 'GET', uri: 'anon', action: 'AnonymousController@index' }
        ];

        const items = buildCodeLensItems(actions, getRoutesForAction);

        expect(items).toHaveLength(1);
        expect(items[0].title).toBe('GET anon');
    });

    it('returns empty array when no actions', () => {
        const items = buildCodeLensItems([], () => [
            { method: 'GET', uri: 'x', action: 'X@index' }
        ]);
        expect(items).toHaveLength(0);
    });
});
