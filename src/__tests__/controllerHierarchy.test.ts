import { ControllerHierarchy, buildDeclaredRoutesLookup } from '../controllerHierarchy';
import type { LaravelRouteInfo } from '../routeListParser';
import { parsePhpClassLikeSymbol } from '../phpSymbolParser';

function symbolFrom(php: string) {
    const symbol = parsePhpClassLikeSymbol(php);
    expect(symbol).toBeDefined();
    return symbol!;
}

describe('ControllerHierarchy', () => {
    it('V1: resolves declaring class when route points to child and method is inherited', () => {
        const parent = symbolFrom(`<?php
namespace App\\Http\\Controllers;
class ContentController {
    public function index() {}
}
`);
        const child = symbolFrom(`<?php
namespace App\\Http\\Controllers;
class StoriesController extends ContentController {
}
`);

        const hierarchy = new ControllerHierarchy([parent, child]);
        expect(
            hierarchy.resolveDeclaringAction('App\\Http\\Controllers\\StoriesController@index')
        ).toBe('App\\Http\\Controllers\\ContentController@index');
    });

    it('V1: keeps child action when method is overridden', () => {
        const parent = symbolFrom(`<?php
namespace App\\Http\\Controllers;
class ContentController {
    public function index() {}
}
`);
        const child = symbolFrom(`<?php
namespace App\\Http\\Controllers;
class StoriesController extends ContentController {
    public function index() {}
}
`);

        const hierarchy = new ControllerHierarchy([parent, child]);
        expect(
            hierarchy.resolveDeclaringAction('App\\Http\\Controllers\\StoriesController@index')
        ).toBe('App\\Http\\Controllers\\StoriesController@index');
    });

    it('V2: resolves parent using imported alias', () => {
        const parent = symbolFrom(`<?php
namespace App\\Http\\Base;
class ContentController {
    public function index() {}
}
`);
        const child = symbolFrom(`<?php
namespace App\\Http\\Controllers;
use App\\Http\\Base\\ContentController as BaseContent;
class StoriesController extends BaseContent {
}
`);

        const hierarchy = new ControllerHierarchy([parent, child]);
        expect(
            hierarchy.resolveDeclaringAction('App\\Http\\Controllers\\StoriesController@index')
        ).toBe('App\\Http\\Base\\ContentController@index');
    });

    it('V3: resolves methods provided by traits as declared on class action key', () => {
        const trait = symbolFrom(`<?php
namespace App\\Support;
trait HandlesIndex {
    public function index() {}
}
`);
        const controller = symbolFrom(`<?php
namespace App\\Http\\Controllers;
use App\\Support\\HandlesIndex;
class StoriesController {
    use HandlesIndex;
}
`);

        const hierarchy = new ControllerHierarchy([trait, controller]);
        expect(
            hierarchy.resolveDeclaringAction('App\\Http\\Controllers\\StoriesController@index')
        ).toBe('App\\Http\\Controllers\\StoriesController@index');
    });

    it('builds declared-route lookup for inherited actions', () => {
        const parent = symbolFrom(`<?php
namespace App\\Http\\Controllers;
class ContentController {
    public function index() {}
}
`);
        const child = symbolFrom(`<?php
namespace App\\Http\\Controllers;
class StoriesController extends ContentController {}
`);
        const hierarchy = new ControllerHierarchy([parent, child]);

        const routes_by_action = new Map<string, LaravelRouteInfo[]>();
        routes_by_action.set('App\\Http\\Controllers\\StoriesController@index', [
            {
                method: 'GET',
                uri: 'stories',
                name: 'stories.index',
                action: 'App\\Http\\Controllers\\StoriesController@index'
            }
        ]);

        const lookup = buildDeclaredRoutesLookup(routes_by_action, hierarchy);
        expect(
            lookup.getRoutesForDeclaredAction('App\\Http\\Controllers\\ContentController@index')
        ).toHaveLength(1);
    });

    it('returns original action when action format is invalid', () => {
        const hierarchy = new ControllerHierarchy([]);
        expect(hierarchy.resolveDeclaringAction('invalid-action')).toBe('invalid-action');
        expect(hierarchy.resolveDeclaringAction('OnlyClass@')).toBe('OnlyClass@');
    });

    it('returns original action when class is not indexed', () => {
        const hierarchy = new ControllerHierarchy([]);
        const action = 'App\\Http\\Controllers\\Missing@index';
        expect(hierarchy.resolveDeclaringAction(action)).toBe(action);
    });

    it('handles recursive and unknown traits safely', () => {
        const trait_a = symbolFrom(`<?php
namespace App\\Traits;
trait A {
    use B;
}
`);
        const trait_b = symbolFrom(`<?php
namespace App\\Traits;
trait B {
    use A;
}
`);
        const controller = symbolFrom(`<?php
namespace App\\Http\\Controllers;
use App\\Traits\\A;
class StoriesController {
    use A, MissingTrait;
}
`);

        const hierarchy = new ControllerHierarchy([trait_a, trait_b, controller]);
        const action = 'App\\Http\\Controllers\\StoriesController@index';
        expect(hierarchy.resolveDeclaringAction(action)).toBe(action);
    });

    it('resolves method through nested traits recursion', () => {
        const trait_leaf = symbolFrom(`<?php
namespace App\\Traits;
trait Leaf {
    public function index() {}
}
`);
        const trait_parent = symbolFrom(`<?php
namespace App\\Traits;
trait ParentTrait {
    use Leaf;
}
`);
        const controller = symbolFrom(`<?php
namespace App\\Http\\Controllers;
use App\\Traits\\ParentTrait;
class StoriesController {
    use ParentTrait;
}
`);

        const hierarchy = new ControllerHierarchy([trait_leaf, trait_parent, controller]);
        expect(
            hierarchy.resolveDeclaringAction('App\\Http\\Controllers\\StoriesController@index')
        ).toBe('App\\Http\\Controllers\\StoriesController@index');
    });

    it('merges routes into the same declared action bucket', () => {
        const parent = symbolFrom(`<?php
namespace App\\Http\\Controllers;
class ContentController {
    public function index() {}
}
`);
        const first_child = symbolFrom(`<?php
namespace App\\Http\\Controllers;
class StoriesController extends ContentController {}
`);
        const second_child = symbolFrom(`<?php
namespace App\\Http\\Controllers;
class NewsController extends ContentController {}
`);
        const hierarchy = new ControllerHierarchy([parent, first_child, second_child]);

        const routes_by_action = new Map<string, LaravelRouteInfo[]>();
        routes_by_action.set('App\\Http\\Controllers\\StoriesController@index', [
            { method: 'GET', uri: 'stories', action: 'App\\Http\\Controllers\\StoriesController@index' }
        ]);
        routes_by_action.set('App\\Http\\Controllers\\NewsController@index', [
            { method: 'GET', uri: 'news', action: 'App\\Http\\Controllers\\NewsController@index' }
        ]);

        const lookup = buildDeclaredRoutesLookup(routes_by_action, hierarchy);
        expect(
            lookup.getRoutesForDeclaredAction('App\\Http\\Controllers\\ContentController@index')
        ).toHaveLength(2);
    });

    it('returns empty array for missing declared action bucket', () => {
        const hierarchy = new ControllerHierarchy([]);
        const lookup = buildDeclaredRoutesLookup(new Map(), hierarchy);
        expect(lookup.getRoutesForDeclaredAction('Missing@action')).toEqual([]);
    });
});

