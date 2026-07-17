const WEEKLY_MATH_ACCENT_CLASSES = [
    'bg-[#0071E3] dark:bg-[#2997FF]',
    'bg-[#34C759] dark:bg-[#30D158]',
    'bg-[#AF52DE] dark:bg-[#BF5AF2]',
    'bg-[#5AC8FA] dark:bg-[#64D2FF]',
    'bg-[#FF9500] dark:bg-[#FF9F0A]',
    'bg-[#FF3B30] dark:bg-[#FF453A]',
    'bg-[#FF2D55] dark:bg-[#FF375F]',
    'bg-[#5856D6] dark:bg-[#5E5CE6]',
] as const;

export function getWeeklyMathAccentClasses(index: number): string {
    return WEEKLY_MATH_ACCENT_CLASSES[index % WEEKLY_MATH_ACCENT_CLASSES.length];
}

const READABLE_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z]/u;

/**
 * List-card preview: keep prose only. Math is stripped entirely so half-rendered
 * LaTeX (e.g. a_0, \frac remnants) never appears in the list.
 */
export function toWeeklyMathPreviewText(markdown: string, maxLength = 120): string {
    const text = markdown
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')
        .replace(/\$[^$\n]*\$/g, ' ')
        .replace(/\\\[[\s\S]*?\\\]/g, ' ')
        .replace(/\\\([\s\S]*?\\\)/g, ' ')
        .replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, ' ')
        .replace(/\\[a-zA-Z]+\*?/g, ' ')
        .replace(/[*_`>#~|]/g, ' ')
        .replace(/[{}$\\_^]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const readableCount = (text.match(new RegExp(READABLE_CHAR.source, 'gu')) || []).length;
    if (readableCount < 12) return '';

    const chars = Array.from(text);
    if (chars.length <= maxLength) return text;
    return `${chars.slice(0, maxLength - 1).join('')}…`;
}
