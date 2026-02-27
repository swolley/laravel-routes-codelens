import { parseRouteListJson, type LaravelRouteInfo } from '../routeListParser';

describe('parseRouteListJson', () => {
    const sampleJson = `[
        {
            "method": "GET",
            "uri": "users",
            "name": "users.index",
            "action": "App\\\\Http\\\\Controllers\\\\UserController@index"
        },
        {
            "methods": ["GET", "HEAD"],
            "uri": "users/create",
            "name": "users.create",
            "action": "App\\\\Http\\\\Controllers\\\\UserController@create"
        },
        {
            "method": "POST",
            "uri": "users",
            "name": "users.store",
            "action": "App\\\\Http\\\\Controllers\\\\UserController@store"
        },
        {
            "uri": "closure",
            "action": "Closure"
        },
        {
            "method": "GET",
            "uri": "dashboard",
            "action": ""
        }
    ]`;

    it('parses valid JSON and returns map keyed by action', () => {
        const map = parseRouteListJson(sampleJson);

        expect(map.size).toBe(3);

        const indexRoutes = map.get('App\\Http\\Controllers\\UserController@index');
        expect(indexRoutes).toBeDefined();
        expect(indexRoutes).toHaveLength(1);
        expect(indexRoutes![0].method).toBe('GET');
        expect(indexRoutes![0].uri).toBe('users');
        expect(indexRoutes![0].name).toBe('users.index');

        const createRoutes = map.get('App\\Http\\Controllers\\UserController@create');
        expect(createRoutes).toBeDefined();
        expect(createRoutes).toHaveLength(1);
        expect(createRoutes![0].method).toBe('GET');
        expect(createRoutes![0].uri).toBe('users/create');
        expect(createRoutes![0].name).toBe('users.create');

        const storeRoutes = map.get('App\\Http\\Controllers\\UserController@store');
        expect(storeRoutes).toBeDefined();
        expect(storeRoutes).toHaveLength(1);
        expect(storeRoutes![0].method).toBe('POST');
        expect(storeRoutes![0].uri).toBe('users');
        expect(storeRoutes![0].name).toBe('users.store');
    });

    it('skips Closure actions', () => {
        const map = parseRouteListJson(sampleJson);
        expect(map.has('Closure')).toBe(false);
    });

    it('skips empty action', () => {
        const map = parseRouteListJson(sampleJson);
        expect(map.size).toBe(3);
    });

    it('uses first method when methods array is present', () => {
        const map = parseRouteListJson(sampleJson);
        const createRoutes = map.get('App\\Http\\Controllers\\UserController@create');
        expect(createRoutes?.[0].method).toBe('GET');
    });

    it('returns empty map for invalid JSON', () => {
        const map = parseRouteListJson('not json at all');
        expect(map.size).toBe(0);
    });

    it('returns empty map for empty string', () => {
        const map = parseRouteListJson('');
        expect(map.size).toBe(0);
    });

    it('returns empty map when root is not an array', () => {
        const map = parseRouteListJson('{"foo": "bar"}');
        expect(map.size).toBe(0);
    });

    it('supports alternate field names (path, route_name, action_name)', () => {
        const json = `[{
            "method": "GET",
            "path": "api/ping",
            "route_name": "api.ping",
            "action_name": "App\\\\Http\\\\Controllers\\\\ApiController@ping"
        }]`;
        const map = parseRouteListJson(json);
        const routes = map.get('App\\Http\\Controllers\\ApiController@ping');
        expect(routes).toBeDefined();
        expect(routes).toHaveLength(1);
        expect(routes![0].uri).toBe('api/ping');
        expect(routes![0].name).toBe('api.ping');
    });

    it('uses action_name when action is null or missing', () => {
        const json = `[{
            "action": null,
            "action_name": "App\\\\Http\\\\Controllers\\\\FallbackController@show",
            "uri": "fallback",
            "method": "GET"
        }]`;
        const map = parseRouteListJson(json);
        const routes = map.get('App\\Http\\Controllers\\FallbackController@show');
        expect(routes).toBeDefined();
        expect(routes![0].uri).toBe('fallback');
    });

    it('skips route when both action and action_name are missing', () => {
        const json = `[
            {"action": "App\\\\Http\\\\Controllers\\\\A@index", "method": "GET", "uri": "a"},
            {"method": "GET", "uri": "no-action"},
            {"action": "App\\\\Http\\\\Controllers\\\\B@index", "method": "GET", "uri": "b"}
        ]`;
        const map = parseRouteListJson(json);
        expect(map.size).toBe(2);
        expect(map.has('App\\Http\\Controllers\\A@index')).toBe(true);
        expect(map.has('App\\Http\\Controllers\\B@index')).toBe(true);
    });

    it('defaults method to GET when method and methods are absent', () => {
        const json = `[{
            "action": "App\\\\Http\\\\Controllers\\\\DefaultController@index",
            "uri": "default",
            "name": "default"
        }]`;
        const map = parseRouteListJson(json);
        const routes = map.get('App\\Http\\Controllers\\DefaultController@index');
        expect(routes).toBeDefined();
        expect(routes![0].method).toBe('GET');
    });

    it('defaults uri to empty string when uri and path are absent', () => {
        const json = `[{
            "action": "App\\\\Http\\\\Controllers\\\\NoUriController@index",
            "method": "POST"
        }]`;
        const map = parseRouteListJson(json);
        const routes = map.get('App\\Http\\Controllers\\NoUriController@index');
        expect(routes).toBeDefined();
        expect(routes![0].uri).toBe('');
    });

    it('leaves name undefined when name and route_name are absent', () => {
        const json = `[{
            "action": "App\\\\Http\\\\Controllers\\\\AnonymousController@index",
            "method": "GET",
            "uri": "anon"
        }]`;
        const map = parseRouteListJson(json);
        const routes = map.get('App\\Http\\Controllers\\AnonymousController@index');
        expect(routes).toBeDefined();
        expect(routes![0].name).toBeUndefined();
    });

    it('returns empty map when JSON.parse throws', () => {
        const map = parseRouteListJson('{ invalid }');
        expect(map.size).toBe(0);
    });

    it('collects multiple routes for the same action (e.g. GET and POST)', () => {
        const json = `[
            {"method": "GET", "uri": "items", "name": "items.index", "action": "App\\\\Http\\\\Controllers\\\\ItemController@index"},
            {"method": "POST", "uri": "items", "name": "items.store", "action": "App\\\\Http\\\\Controllers\\\\ItemController@index"}
        ]`;
        const map = parseRouteListJson(json);
        expect(map.size).toBe(1);

        const routes = map.get('App\\Http\\Controllers\\ItemController@index');
        expect(routes).toBeDefined();
        expect(routes).toHaveLength(2);
        expect(routes![0].method).toBe('GET');
        expect(routes![0].uri).toBe('items');
        expect(routes![0].name).toBe('items.index');
        expect(routes![1].method).toBe('POST');
        expect(routes![1].uri).toBe('items');
        expect(routes![1].name).toBe('items.store');
    });
});
