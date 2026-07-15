import { describe, expect, it } from 'vitest';
import { getWeeklyMathAccentClasses } from './weeklyMathDisplay';

describe('getWeeklyMathAccentClasses', () => {
    it('uses a distinct accent for each of the first five problem cards', () => {
        const accents = Array.from({ length: 5 }, (_, index) => getWeeklyMathAccentClasses(index));

        expect(new Set(accents).size).toBe(5);
    });
});
