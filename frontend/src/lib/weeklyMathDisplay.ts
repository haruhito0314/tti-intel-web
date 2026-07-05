export function toWeeklyMathPreviewText(markdown: string): string {
    return markdown
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')
        .replace(/\$[^$\n]*\$/g, ' ')
        .replace(/\\\[[\s\S]*?\\\]/g, ' ')
        .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(/[*_`>#-]/g, ' ')
        .replace(/[{}$\\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
