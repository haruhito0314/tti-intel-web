import { describe, expect, it } from 'vitest';
import { PUZZLE_MODE_CONFIGS } from './config';
import { getFallbackPuzzle } from './fallbacks';
import { buildPuzzle, canSolvePuzzle, validatePuzzle } from './generator';
import { isSolved } from './game';
import type { PuzzleMode } from './types';

const seeds = [1, 7, 19, 41, 73, 109, 211, 997, 4099, 8191];

describe.each(['normal', 'star'] as const)('%s puzzle generation', (mode: PuzzleMode) => {
    const config = PUZZLE_MODE_CONFIGS[mode];

    it.each(seeds)('returns a validated puzzle for seed %i', (seed) => {
        const puzzle = buildPuzzle(mode, seed);
        expect(puzzle).not.toBeNull();
        expect(validatePuzzle(puzzle!, config)).toBe(true);
        expect(canSolvePuzzle(puzzle!, config)).toBe(true);
        expect(isSolved(puzzle!, config.capacity)).toBe(false);
    });

    it('keeps the committed fallback valid and solvable', () => {
        const fallback = getFallbackPuzzle(mode);
        expect(validatePuzzle(fallback, config)).toBe(true);
        expect(canSolvePuzzle(fallback, config)).toBe(true);
    });
});
