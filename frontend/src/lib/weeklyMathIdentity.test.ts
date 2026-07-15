import { describe, expect, it } from 'vitest';
import { isValidWeeklyMathId, sortWeeklyMathProblemsNewestFirst } from './weeklyMathIdentity';

describe('isValidWeeklyMathId', () => {
    it.each([
        '2026-W29',
        'default-template',
        'gottsuee-configuration',
        'complex-inequalities-solid',
        'parabola-tangent-circle-chain',
    ])('accepts %s', (value) => {
        expect(isValidWeeklyMathId(value)).toBe(true);
    });

    it.each(['', 'has space', 'UPPERCASE', 'slash/id', '../escape', '-leading'])('rejects %s', (value) => {
        expect(isValidWeeklyMathId(value)).toBe(false);
    });
});

describe('sortWeeklyMathProblemsNewestFirst', () => {
    it('sorts by createdAt and falls back to updatedAt then id', () => {
        const timestamp = (milliseconds: number) => ({ toMillis: () => milliseconds });
        const sorted = sortWeeklyMathProblemsNewestFirst([
            { weekKey: 'older', title: '', problem: '', createdAt: timestamp(1) as never },
            { weekKey: 'newer', title: '', problem: '', createdAt: timestamp(3) as never },
            { weekKey: 'middle', title: '', problem: '', updatedAt: timestamp(2) as never },
        ]);

        expect(sorted.map((item) => item.weekKey)).toEqual(['newer', 'middle', 'older']);
    });

    it('sorts records without timestamps by id', () => {
        const sorted = sortWeeklyMathProblemsNewestFirst([
            { weekKey: 'a', title: '', problem: '' },
            { weekKey: 'b', title: '', problem: '' },
        ]);

        expect(sorted.map((item) => item.weekKey)).toEqual(['b', 'a']);
    });

    it('does not mutate the input array', () => {
        const items = [
            { weekKey: 'a', title: '', problem: '' },
            { weekKey: 'b', title: '', problem: '' },
        ];

        sortWeeklyMathProblemsNewestFirst(items);

        expect(items.map((item) => item.weekKey)).toEqual(['a', 'b']);
    });
});
