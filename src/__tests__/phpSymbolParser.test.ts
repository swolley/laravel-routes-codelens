import { parsePhpClassLikeSymbol } from '../phpSymbolParser';

describe('parsePhpClassLikeSymbol', () => {
    it('returns undefined when class-like symbol is missing', () => {
        const parsed = parsePhpClassLikeSymbol('<?php echo "hello";');
        expect(parsed).toBeUndefined();
    });

    it('resolves global parent names and absolute names', () => {
        const parsed = parsePhpClassLikeSymbol(`<?php
class StoriesController extends \\App\\Http\\Controllers\\ContentController {
    public function index() {}
}
`);
        expect(parsed).toBeDefined();
        expect(parsed?.parent_fqcn).toBe('App\\Http\\Controllers\\ContentController');
    });

    it('parses trait kind and skips empty trait names', () => {
        const parsed = parsePhpClassLikeSymbol(`<?php
namespace App\\Support;
use App\\Traits\\A;
trait Worker {
    use A,   ;
    public function run() {}
}
`);

        expect(parsed).toBeDefined();
        expect(parsed?.kind).toBe('trait');
        expect(parsed?.fqcn).toBe('App\\Support\\Worker');
        expect(parsed?.trait_fqcns).toEqual(['App\\Traits\\A']);
    });

    it('returns unqualified parent when no namespace is present', () => {
        const parsed = parsePhpClassLikeSymbol(`<?php
class StoriesController extends ContentController {
    public function index() {}
}
`);
        expect(parsed?.parent_fqcn).toBe('ContentController');
    });
});

