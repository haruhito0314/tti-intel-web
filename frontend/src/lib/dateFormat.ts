import { getWeekDateRange } from './weeklyMath';

export function formatDateLabel(date: Date): string {
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
    });
}

function formatDateShortLabel(date: Date): string {
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

export function formatWeekKeyWithRange(weekKey: string): string {
    const range = getWeekDateRange(weekKey);
    if (!range) return weekKey;
    return `${weekKey}（${formatDateShortLabel(range.start)}〜${formatDateShortLabel(range.end)}）`;
}

export function formatUpdatedAtLabel(value: unknown): string | null {
    if (!value) return null;
    let date: Date | null = null;

    if (value instanceof Date) {
        date = value;
    } else if (typeof value === 'object' && value !== null) {
        const maybeTimestamp = value as {
            toDate?: () => Date;
            seconds?: number;
            nanoseconds?: number;
            _seconds?: number;
            _nanoseconds?: number;
        };
        if (typeof maybeTimestamp.toDate === 'function') {
            date = maybeTimestamp.toDate();
        } else if (typeof maybeTimestamp.seconds === 'number') {
            date = new Date(maybeTimestamp.seconds * 1000 + (maybeTimestamp.nanoseconds ?? 0) / 1_000_000);
        } else if (typeof maybeTimestamp._seconds === 'number') {
            date = new Date(maybeTimestamp._seconds * 1000 + (maybeTimestamp._nanoseconds ?? 0) / 1_000_000);
        }
    } else if (typeof value === 'number') {
        date = new Date(value);
    }

    if (!date || Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
