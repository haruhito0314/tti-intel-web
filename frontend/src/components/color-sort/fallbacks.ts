import { clonePuzzle } from './game';
import type { ColorToken, Puzzle, PuzzleMode } from './types';

const repeat = (color: ColorToken, count: number): ColorToken[] => (
    Array.from({ length: count }, () => color)
);

const FALLBACKS: Record<PuzzleMode, Puzzle> = {
    normal: [repeat('sky', 6), repeat('mint', 5), repeat('coral', 8), repeat('sun', 8), repeat('sky', 2), repeat('mint', 3)],
    star: [repeat('sky', 7), repeat('mint', 10), repeat('coral', 10), repeat('sun', 10), repeat('violet', 10), repeat('sky', 3)],
};

export function getFallbackPuzzle(mode: PuzzleMode): Puzzle {
    return clonePuzzle(FALLBACKS[mode]);
}
