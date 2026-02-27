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

        const indexRoute = map.get('App\\Http\\Controllers\\UserController@index');
        expect(indexRoute).toBeDefined();
        expect(indexRoute?.method).toBe('GET');
        expect(indexRoute?.uri).toBe('users');
        expect(indexRoute?.name).toBe('users.index');

        const createRoute = map.get('App\\Http\\Controllers\\UserController@create');
        expect(createRoute?.method).toBe('GET');
        expect(createRoute?.uri).toBe('users/create');
        expect(createRoute?.name).toBe('users.create');

        const storeRoute = map.get('App\\Http\\Controllers\\UserController@store');
        expect(storeRoute?.method).toBe('POST');
        expect(storeRoute?.uri).toBe('users');
        expect(storeRoute?.name).toBe('users.store');
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
        const create = map.get('App\\Http\\Controllers\\UserController@create');
        expect(create?.method).toBe('GET');
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
        const route = map.get('App\\Http\\Controllers\\ApiController@ping');
        expect(route).toBeDefined();
        expect(route?.uri).toBe('api/ping');
        expect(route?.name).toBe('api.ping');
    });

    it('uses action_name when action is null or missing', () => {
        const json = `[{
            "action": null,
            "action_name": "App\\\\Http\\\\Controllers\\\\FallbackController@show",
            "uri": "fallback",
            "method": "GET"
        }]`;
        const map = parseRouteListJson(json);
        const route = map.get('App\\Http\\Controllers\\FallbackController@show');
        expect(route).toBeDefined();
        expect(route?.uri).toBe('fallback');
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
        const route = map.get('App\\Http\\Controllers\\DefaultController@index');
        expect(route).toBeDefined();
        expect(route?.method).toBe('GET');
    });

    it('defaults uri to empty string when uri and path are absent', () => {
        const json = `[{
            "action": "App\\\\Http\\\\Controllers\\\\NoUriController@index",
            "method": "POST"
        }]`;
        const map = parseRouteListJson(json);
        const route = map.get('App\\Http\\Controllers\\NoUriController@index');
        expect(route).toBeDefined();
        expect(route?.uri).toBe('');
    });

    it('leaves name undefined when name and route_name are absent', () => {
        const json = `[{
            "action": "App\\\\Http\\\\Controllers\\\\AnonymousController@index",
            "method": "GET",
            "uri": "anon"
        }]`;
        const map = parseRouteListJson(json);
        const route = map.get('App\\Http\\Controllers\\AnonymousController@index');
        expect(route).toBeDefined();
        expect(route?.name).toBeUndefined();
    });

    it('returns empty map when JSON.parse throws', () => {
        const map = parseRouteListJson('{ invalid }');
        expect(map.size).toBe(0);
    });
});
