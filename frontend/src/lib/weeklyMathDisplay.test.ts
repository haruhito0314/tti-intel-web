import { describe, expect, it } from 'vitest';
import { getWeeklyMathAccentClasses, toWeeklyMathPreviewText } from './weeklyMathDisplay';

describe('getWeeklyMathAccentClasses', () => {
    it('uses a distinct accent for each of the first five problem cards', () => {
        const accents = Array.from({ length: 5 }, (_, index) => getWeeklyMathAccentClasses(index));

        expect(new Set(accents).size).toBe(5);
    });
});

describe('toWeeklyMathPreviewText', () => {
    it('keeps Japanese prose and strips inline math entirely', () => {
        const preview = toWeeklyMathPreviewText(
            '今、\\(a_0=1\\) として、毎回1枚のカードを引きます。\\(a_{n+1}\\) は、\\(a_n\\) に対して操作します。',
        );

        expect(preview).toContain('として、毎回1枚のカードを引きます');
        expect(preview).not.toMatch(/a_0|a_\{|\\\\|\$/);
    });

    it('returns empty when almost only LaTeX remains', () => {
        expect(toWeeklyMathPreviewText('$$\\frac{1}{2}+\\sqrt{x}$$')).toBe('');
        expect(toWeeklyMathPreviewText('\\(x^2+y^2=z^2\\)')).toBe('');
    });

    it('truncates long prose with an ellipsis', () => {
        const result = toWeeklyMathPreviewText(`**問題** ${'あ'.repeat(140)}`);
        expect(Array.from(result)).toHaveLength(120);
        expect(result.endsWith('…')).toBe(true);
    });
});
