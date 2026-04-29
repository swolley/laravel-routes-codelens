/**
 * Extracts controller FQCN and public method names from PHP source.
 * Pure function: no I/O, fully unit-testable.
 */

export interface ControllerAction {
    action: string;
    line: number;
}

import { parsePhpClassLikeSymbol } from './phpSymbolParser';

/**
 * Extracts all public method actions (FQCN@method) from PHP controller source.
 * Only considers "public function" methods. Returns array of { action, line }.
 */
export function getControllerActionsFromPhpSource(phpSource: string): ControllerAction[] {
    const symbol = parsePhpClassLikeSymbol(phpSource);
    if (!symbol) {
        return [];
    }

    const result: ControllerAction[] = [];
    for (const [method_name, line] of symbol.method_lines.entries()) {
        result.push({
            action: `${symbol.fqcn}@${method_name}`,
            line
        });
    }
    return result;
}
