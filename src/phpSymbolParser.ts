export interface PhpClassLikeSymbol {
    fqcn: string;
    kind: 'class' | 'trait';
    method_lines: Map<string, number>;
    parent_fqcn?: string;
    trait_fqcns: string[];
}

function lineAtIndex(source: string, index: number): number {
    let line = 0;
    for (let i = 0; i < index && i < source.length; i++) {
        if (source[i] === '\n') {
            line++;
        }
    }
    return line;
}

function parseUseStatements(header: string): Map<string, string> {
    const use_map = new Map<string, string>();
    const use_regex = /^\s*use\s+([^;]+);/gm;
    let match: RegExpExecArray | null;

    while ((match = use_regex.exec(header)) !== null) {
        const parts = match[1].split(',').map((part) => part.trim()).filter(Boolean);
        for (const part of parts) {
            const alias_match = part.match(/^(.+?)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
            if (alias_match) {
                use_map.set(alias_match[2], alias_match[1].replace(/^\\/, '').trim());
                continue;
            }

            const normalized = part.replace(/^\\/, '').trim();
            const segments = normalized.split('\\');
            const alias = segments[segments.length - 1];
            if (alias) {
                use_map.set(alias, normalized);
            }
        }
    }

    return use_map;
}

function resolveName(raw_name: string, namespace_name: string | undefined, use_map: Map<string, string>): string {
    if (raw_name.startsWith('\\')) {
        return raw_name.slice(1);
    }

    const first_segment = raw_name.split('\\')[0];
    const alias_target = use_map.get(first_segment);
    if (alias_target) {
        const suffix = raw_name.slice(first_segment.length);
        return `${alias_target}${suffix}`;
    }

    if (!namespace_name) {
        return raw_name;
    }

    return `${namespace_name}\\${raw_name}`;
}

export function parsePhpClassLikeSymbol(php_source: string): PhpClassLikeSymbol | undefined {
    const namespace_match = php_source.match(/namespace\s+([^;]+);/);
    const namespace_name = namespace_match ? namespace_match[1].trim() : undefined;

    const class_like_regex = /\b(class|trait)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+extends\s+([A-Za-z0-9_\\]+))?/;
    const class_like_match = class_like_regex.exec(php_source);
    if (!class_like_match) {
        return undefined;
    }

    const header = php_source.slice(0, class_like_match.index);
    const use_map = parseUseStatements(header);
    const kind = class_like_match[1] as 'class' | 'trait';
    const class_name = class_like_match[2];
    const parent_raw = class_like_match[3];
    const fqcn = namespace_name ? `${namespace_name}\\${class_name}` : class_name;

    const method_lines = new Map<string, number>();
    const method_regex = /public\s+function\s+([A-Za-z0-9_]+)\s*\(/g;
    let method_match: RegExpExecArray | null;
    while ((method_match = method_regex.exec(php_source)) !== null) {
        method_lines.set(method_match[1], lineAtIndex(php_source, method_match.index));
    }

    const trait_fqcns: string[] = [];
    const trait_use_regex = /\buse\s+([^;]+);/g;
    let trait_match: RegExpExecArray | null;
    while ((trait_match = trait_use_regex.exec(php_source)) !== null) {
        if (trait_match.index < class_like_match.index) {
            continue;
        }

        const trait_names = trait_match[1].split(',').map((part) => part.trim()).filter(Boolean);
        for (const trait_name of trait_names) {
            const resolved = resolveName(trait_name, namespace_name, use_map);
            if (resolved) {
                trait_fqcns.push(resolved);
            }
        }
    }

    const parent_fqcn = parent_raw
        ? resolveName(parent_raw.trim(), namespace_name, use_map)
        : undefined;

    return {
        fqcn,
        kind,
        method_lines,
        parent_fqcn,
        trait_fqcns
    };
}

