import type { WeeklyMathProblem } from './weeklyMath';

const WEEKLY_MATH_ID_PATTERN = /^(?:\d{4}-W\d{2}|default-template|[a-z0-9][a-z0-9-]*[a-z0-9])$/;

export function isValidWeeklyMathId(value: string): boolean {
    return WEEKLY_MATH_ID_PATTERN.test(value);
}

function timestampMillis(value: unknown): number | null {
    if (!value || typeof value !== 'object') return null;

    const timestamp = value as { toMillis?: () => number; toDate?: () => Date };
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
    return null;
}

export function sortWeeklyMathProblemsNewestFirst(items: WeeklyMathProblem[]): WeeklyMathProblem[] {
    return [...items].sort((left, right) => {
        const leftTime = timestampMillis(left.createdAt) ?? timestampMillis(left.updatedAt);
        const rightTime = timestampMillis(right.createdAt) ?? timestampMillis(right.updatedAt);

        if (leftTime !== null || rightTime !== null) return (rightTime ?? 0) - (leftTime ?? 0);
        return right.weekKey.localeCompare(left.weekKey);
    });
}
