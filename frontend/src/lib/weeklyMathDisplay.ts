import { DEFAULT_WEEKLY_MATH_TEMPLATE_KEY, getWeekDateRange } from './weeklyMath';

export function formatWeeklyMathWeekLabel(weekKey: string): string {
    if (weekKey === DEFAULT_WEEKLY_MATH_TEMPLATE_KEY) return '最初の問題';

    const range = getWeekDateRange(weekKey);
    if (!range) return weekKey;

    const month = range.start.getUTCMonth() + 1;
    const weekOfMonth = Math.floor((range.start.getUTCDate() - 1) / 7) + 1;
    return `${range.start.getUTCFullYear()}年${month}月 第${weekOfMonth}週`;
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
