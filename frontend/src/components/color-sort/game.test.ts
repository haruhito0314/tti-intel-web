import { describe, expect, it } from 'vitest';
import { PUZZLE_MODE_CONFIGS } from './config';
import {
    canPour,
    countCompletedBottles,
    getLegalMoves,
    isCompletedBottle,
    isSolved,
    pourBottle,
} from './game';
import type { Puzzle } from './types';

describe('color-sort game rules', () => {
    it('keeps normal and star capacity mode-specific', () => {
        expect(PUZZLE_MODE_CONFIGS.normal.capacity).toBe(8);
        expect(PUZZLE_MODE_CONFIGS.star.capacity).toBe(10);
    });

    it('pours only the contiguous top group into matching space', () => {
        const puzzle: Puzzle = [
            ['mint', 'sky', 'sky'],
            ['sky', 'sky', 'sky', 'sky', 'sky', 'sky', 'sky', 'sky'],
            [],
        ];

        expect(canPour(puzzle, 0, 1, 10)).toBe(true);
        expect(pourBottle(puzzle, 0, 1, 10)).toEqual([
            ['mint'],
            ['sky', 'sky', 'sky', 'sky', 'sky', 'sky', 'sky', 'sky', 'sky', 'sky'],
            [],
        ]);
        expect(puzzle[0]).toEqual(['mint', 'sky', 'sky']);
    });

    it('rejects a full target and a different top color', () => {
        const puzzle: Puzzle = [
            ['sky'],
            Array.from({ length: 10 }, () => 'sky' as const),
            ['mint'],
        ];

        expect(canPour(puzzle, 0, 1, 10)).toBe(false);
        expect(canPour(puzzle, 0, 2, 10)).toBe(false);
    });

    it('counts only full uniform bottles as completed', () => {
        const fullSky = Array.from({ length: 8 }, () => 'sky' as const);
        const mixed = ['sky', 'sky', 'sky', 'sky', 'mint', 'mint', 'mint', 'mint'] as const;
        const puzzle: Puzzle = [fullSky, [...mixed], [], []];

        expect(isCompletedBottle(fullSky, 8)).toBe(true);
        expect(isCompletedBottle([...mixed], 8)).toBe(false);
        expect(countCompletedBottles(puzzle, 8)).toBe(1);
        expect(isSolved(puzzle, 8)).toBe(false);
        expect(isSolved([fullSky, []], 8)).toBe(true);
    });

    it('does not generate moves from completed bottles', () => {
        const fullSky = Array.from({ length: 8 }, () => 'sky' as const);
        expect(getLegalMoves([fullSky, []], 8)).toEqual([]);
    });
});
