import { RouteService } from '../routeService';

describe('RouteService', () => {
    const mockJson = `[
        {"method":"GET","uri":"users","name":"users.index","action":"App\\\\Http\\\\Controllers\\\\UserController@index"},
        {"method":"POST","uri":"users","name":"users.store","action":"App\\\\Http\\\\Controllers\\\\UserController@store"}
    ]`;

    it('loads routes via injected runner and returns routes for action', async () => {
        const runRouteList = jest.fn().mockResolvedValue(mockJson);
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.refresh();

        expect(runRouteList).toHaveBeenCalledWith('/fake/cwd');
        expect(service.loadedRouteCount).toBe(2);

        const indexRoutes = service.getRoutesForAction('App\\Http\\Controllers\\UserController@index');
        expect(indexRoutes).toHaveLength(1);
        expect(indexRoutes[0].method).toBe('GET');
        expect(indexRoutes[0].uri).toBe('users');
        expect(indexRoutes[0].name).toBe('users.index');

        const storeRoutes = service.getRoutesForAction('App\\Http\\Controllers\\UserController@store');
        expect(storeRoutes).toHaveLength(1);
        expect(storeRoutes[0].method).toBe('POST');
        expect(storeRoutes[0].uri).toBe('users');
    });

    it('returns empty array for unknown action', async () => {
        const runRouteList = jest.fn().mockResolvedValue(mockJson);
        const service = new RouteService('/fake/cwd', runRouteList);
        await service.refresh();

        const unknown = service.getRoutesForAction('App\\Http\\Controllers\\UnknownController@missing');
        expect(unknown).toEqual([]);
    });

    it('does not call runner when cwd is undefined', async () => {
        const runRouteList = jest.fn();
        const service = new RouteService(undefined, runRouteList);

        await service.refresh();

        expect(runRouteList).not.toHaveBeenCalled();
        expect(service.loadedRouteCount).toBe(0);
    });

    it('ensureLoaded calls refresh when no routes loaded', async () => {
        const runRouteList = jest.fn().mockResolvedValue(mockJson);
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.ensureLoaded();

        expect(runRouteList).toHaveBeenCalledTimes(1);
        expect(service.getRoutesForAction('App\\Http\\Controllers\\UserController@index').length).toBeGreaterThan(0);
    });

    it('ensureLoaded does not call refresh again when already loaded', async () => {
        const runRouteList = jest.fn().mockResolvedValue(mockJson);
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.ensureLoaded();
        await service.ensureLoaded();

        expect(runRouteList).toHaveBeenCalledTimes(1);
    });

    it('refresh replaces routes with new data', async () => {
        const runRouteList = jest
            .fn()
            .mockResolvedValueOnce(mockJson)
            .mockResolvedValueOnce(
                `[{"method":"GET","uri":"other","name":null,"action":"App\\\\Http\\\\Controllers\\\\OtherController@index"}]`
            );
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.refresh();
        expect(service.loadedRouteCount).toBe(2);

        await service.refresh();
        expect(service.loadedRouteCount).toBe(1);
        expect(service.getRoutesForAction('App\\Http\\Controllers\\UserController@index')).toHaveLength(0);
        expect(service.getRoutesForAction('App\\Http\\Controllers\\OtherController@index')).toHaveLength(1);
    });

    it('on runner failure keeps previous routes and does not throw', async () => {
        const runRouteList = jest
            .fn()
            .mockResolvedValueOnce(mockJson)
            .mockRejectedValueOnce(new Error('artisan failed'));
        const service = new RouteService('/fake/cwd', runRouteList);

        await service.refresh();
        expect(service.loadedRouteCount).toBe(2);

        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        await service.refresh();
        spy.mockRestore();

        expect(service.loadedRouteCount).toBe(2);
        expect(service.getRoutesForAction('App\\Http\\Controllers\\UserController@index').length).toBeGreaterThan(0);
    });

    it('returns all routes when same action is used by multiple routes', async () => {
        const multiRouteJson = `[
            {"method": "GET", "uri": "api/thing", "name": "thing.show", "action": "App\\\\Http\\\\Controllers\\\\ThingController@show"},
            {"method": "PUT", "uri": "api/thing", "name": "thing.update", "action": "App\\\\Http\\\\Controllers\\\\ThingController@show"}
        ]`;
        const runRouteList = jest.fn().mockResolvedValue(multiRouteJson);
        const service = new RouteService('/fake/cwd', runRouteList);
        await service.refresh();

        const routes = service.getRoutesForAction('App\\Http\\Controllers\\ThingController@show');
        expect(routes).toHaveLength(2);
        expect(routes[0].method).toBe('GET');
        expect(routes[0].uri).toBe('api/thing');
        expect(routes[0].name).toBe('thing.show');
        expect(routes[1].method).toBe('PUT');
        expect(routes[1].uri).toBe('api/thing');
        expect(routes[1].name).toBe('thing.update');
    });
});
