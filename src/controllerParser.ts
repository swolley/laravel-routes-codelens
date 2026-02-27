/**
 * Extracts controller FQCN and public method names from PHP source.
 * Pure function: no I/O, fully unit-testable.
 */

export interface ControllerAction {
    action: string;
    line: number;
}

/**
 * Returns the 0-based line number for a given character index in source text.
 */
function lineAtIndex(source: string, index: number): number {
    let line = 0;
    for (let i = 0; i < index && i < source.length; i++) {
        if (source[i] === '\n') {
            line++;
        }
    }
    return line;
}

/**
 * Extracts all public method actions (FQCN@method) from PHP controller source.
 * Only considers "public function" methods. Returns array of { action, line }.
 */
export function getControllerActionsFromPhpSource(phpSource: string): ControllerAction[] {
    const result: ControllerAction[] = [];

    const namespaceMatch = phpSource.match(/namespace\s+([^;]+);/);
    const namespace = namespaceMatch ? namespaceMatch[1].trim() : undefined;

    const classMatch = phpSource.match(/class\s+([A-Za-z0-9_]+)/);
    if (!classMatch) {
        return result;
    }
    const className = classMatch[1];
    const fqcn = namespace ? `${namespace}\\${className}` : className;

    const methodRegex = /public\s+function\s+([A-Za-z0-9_]+)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = methodRegex.exec(phpSource)) !== null) {
        const methodName = match[1];
        const action = `${fqcn}@${methodName}`;
        const line = lineAtIndex(phpSource, match.index);
        result.push({ action, line });
    }

    return result;
}
