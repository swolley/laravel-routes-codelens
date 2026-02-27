import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isLaravelProject } from '../laravelProject';

describe('isLaravelProject', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'laravel-codelens-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns false when artisan file does not exist', () => {
        expect(isLaravelProject(tmpDir)).toBe(false);
    });

    it('returns true when artisan file exists', () => {
        fs.writeFileSync(path.join(tmpDir, 'artisan'), '#!/usr/bin/env php\n<?php\n');
        expect(isLaravelProject(tmpDir)).toBe(true);
    });

    it('returns false when path is a file named artisan but not in cwd', () => {
        const subDir = path.join(tmpDir, 'sub');
        fs.mkdirSync(subDir);
        fs.writeFileSync(path.join(subDir, 'artisan'), '');
        expect(isLaravelProject(tmpDir)).toBe(false);
        expect(isLaravelProject(subDir)).toBe(true);
    });
});
