export function normalizeMathDelimiters(markdown: string): string {
    return markdown
        .replace(/\\+[ \t]*\r?\n/g, '  \n')
        .replace(/\\[ \t]+/g, '  \n')
        .replace(/\\+$/g, '')
        .replace(/\$?\{([^{}\n]+)\}_C_\{([^{}\n]+)\}\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\$?\{([^{}\n]+)\}C\{([^{}\n]+)\}\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\$?([A-Za-z0-9]+)_C_\{([^{}\n]+)\}\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\$?([A-Za-z0-9]+)_C_([A-Za-z0-9]+)\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expr: string) => `$$${expr}$$`)
        .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, expr: string) => `$${expr}$`);
}
