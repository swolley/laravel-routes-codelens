import * as fs from 'fs';
import * as path from 'path';

/**
 * Returns true if the given directory looks like a Laravel project (has an artisan file).
 * Used to skip running `php artisan route:list` in non-Laravel workspaces.
 */
export function isLaravelProject(cwd: string): boolean {
    const artisanPath = path.join(cwd, 'artisan');
    return fs.existsSync(artisanPath);
}
