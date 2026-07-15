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
