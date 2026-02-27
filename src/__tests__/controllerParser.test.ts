import { getControllerActionsFromPhpSource } from '../controllerParser';

describe('getControllerActionsFromPhpSource', () => {
    it('extracts namespace, class and public methods', () => {
        const php = `<?php

namespace App\\Http\\Controllers;

class UserController extends Controller
{
    public function index()
    {
        return view('users.index');
    }

    public function store(Request $request)
    {
        //
    }
}
`;
        const actions = getControllerActionsFromPhpSource(php);

        expect(actions).toHaveLength(2);
        expect(actions[0]).toEqual({
            action: 'App\\Http\\Controllers\\UserController@index',
            line: 6
        });
        expect(actions[1]).toEqual({
            action: 'App\\Http\\Controllers\\UserController@store',
            line: 11
        });
    });

    it('returns empty array when no class is present', () => {
        const php = `<?php
namespace App\\Foo;
function helper() {}
`;
        const actions = getControllerActionsFromPhpSource(php);
        expect(actions).toHaveLength(0);
    });

    it('uses class name only when no namespace', () => {
        const php = `<?php
class HomeController {
    public function index() {}
}
`;
        const actions = getControllerActionsFromPhpSource(php);
        expect(actions).toHaveLength(1);
        expect(actions[0].action).toBe('HomeController@index');
    });

    it('ignores private and protected methods', () => {
        const php = `<?php
namespace App\\Http\\Controllers;
class ApiController {
    private function secret() {}
    protected function internal() {}
    public function index() {}
}
`;
        const actions = getControllerActionsFromPhpSource(php);
        expect(actions).toHaveLength(1);
        expect(actions[0].action).toBe('App\\Http\\Controllers\\ApiController@index');
    });

    it('reports correct line numbers (0-based)', () => {
        const php = `line0
line1
namespace App\\C;
class X {
line5
    public function a() {}
line7
    public function b() {}
}
`;
        const actions = getControllerActionsFromPhpSource(php);
        expect(actions[0].line).toBe(5);
        expect(actions[1].line).toBe(7);
    });

    it('handles method names with underscores', () => {
        const php = `<?php
namespace App\\Http\\Controllers;
class UserController {
    public function show_profile() {}
}
`;
        const actions = getControllerActionsFromPhpSource(php);
        expect(actions[0].action).toBe('App\\Http\\Controllers\\UserController@show_profile');
    });
});
