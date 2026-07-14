import { PUZZLE_MODE_CONFIGS } from './config';
import {
    clonePuzzle,
    getLegalMoves,
    isSolved,
    pourBottle,
    serializePuzzle,
} from './game';
import type { Bottle, ColorToken, Puzzle, PuzzleMode, PuzzleModeConfig } from './types';

function createSeededRandom(seed: number): () => number {
    let value = seed;
    return () => {
        value = (value * 1664525 + 1013904223) % 4294967296;
        return value / 4294967296;
    };
}

export function createPuzzleSeed(): number {
    let cryptoSeed = 0;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const values = new Uint32Array(1);
        crypto.getRandomValues(values);
        cryptoSeed = values[0] ?? 0;
    }
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff) ^ cryptoSeed) >>> 0;
}

function getLongestRun(bottle: Bottle): number {
    let longest = 0;
    let current = 0;
    let previous: ColorToken | null = null;
    bottle.forEach((color) => {
        current = color === previous ? current + 1 : 1;
        previous = color;
        longest = Math.max(longest, current);
    });
    return longest;
}

function buildSolvedPuzzle(config: PuzzleModeConfig): Puzzle {
    return [
        ...config.colors.map((color) => Array.from({ length: config.capacity }, () => color)),
        ...Array.from({ length: config.emptyBottleCount }, () => [] as Bottle),
    ];
}

function moveSingleLayer(puzzle: Puzzle, fromIndex: number, toIndex: number): Puzzle {
    const next = clonePuzzle(puzzle);
    const color = next[fromIndex]?.pop();
    if (color) next[toIndex]?.push(color);
    return next;
}

function scoreRandomness(puzzle: Puzzle, config: PuzzleModeConfig): number {
    const filledBottles = puzzle.filter((bottle) => bottle.length > 0);
    const longestRunPenalty = filledBottles.reduce(
        (score, bottle) => score + Math.max(0, getLongestRun(bottle) - 3),
        0,
    );
    const fullSameColorPenalty = filledBottles.filter((bottle) => (
        bottle.length === config.capacity && bottle.every((color) => color === bottle[0])
    )).length * 4;
    const partialBottleBonus = filledBottles.filter((bottle) => bottle.length < config.capacity).length;
    const topColorVariety = new Set(filledBottles.map((bottle) => bottle.at(-1))).size;
    return partialBottleBonus * 3 + topColorVariety - longestRunPenalty * 2 - fullSameColorPenalty;
}

function scoreHardness(puzzle: Puzzle, config: PuzzleModeConfig): number {
    const filledBottles = puzzle.filter((bottle) => bottle.length > 0);
    const partialBottleCount = filledBottles.filter((bottle) => bottle.length < config.capacity).length;
    const topColorVariety = new Set(filledBottles.map((bottle) => bottle.at(-1))).size;
    const solvedBottlePenalty = filledBottles.filter((bottle) => (
        bottle.length === config.capacity && bottle.every((color) => color === bottle[0])
    )).length * 8;
    const longRunPenalty = filledBottles.reduce(
        (score, bottle) => score + Math.max(0, getLongestRun(bottle) - 3),
        0,
    ) * 3;
    return partialBottleCount * 4 + topColorVariety - solvedBottlePenalty - longRunPenalty;
}

function pourForSolver(puzzle: Puzzle, fromIndex: number, toIndex: number, capacity: number): Puzzle {
    return pourBottle(puzzle, fromIndex, toIndex, capacity);
}

export function canSolvePuzzle(puzzle: Puzzle, config: PuzzleModeConfig): boolean {
    const seen = new Map<string, number>();
    const stack: { puzzle: Puzzle; depth: number }[] = [{ puzzle: clonePuzzle(puzzle), depth: 0 }];
    let exploredStates = 0;
    while (stack.length > 0 && exploredStates < config.generation.solverStates) {
        const current = stack.pop();
        if (!current) break;
        const key = serializePuzzle(current.puzzle);
        const seenDepth = seen.get(key);
        if (seenDepth !== undefined && seenDepth <= current.depth) continue;
        seen.set(key, current.depth);
        exploredStates += 1;
        if (isSolved(current.puzzle, config.capacity)) return true;
        if (current.depth >= config.generation.solverDepth) continue;
        const moves = getLegalMoves(current.puzzle, config.capacity);
        for (let index = moves.length - 1; index >= 0; index -= 1) {
            const move = moves[index];
            stack.push({
                puzzle: pourForSolver(current.puzzle, move.from, move.to, config.capacity),
                depth: current.depth + 1,
            });
        }
    }
    return false;
}

function buildScrambledPuzzle(config: PuzzleModeConfig, seed: number): Puzzle | null {
    const { generation } = config;
    let bestSolvablePuzzle: Puzzle | null = null;
    let bestSolvableScore = Number.NEGATIVE_INFINITY;
    const scorePuzzle = config.mode === 'star' ? scoreHardness : scoreRandomness;

    for (let attempt = 0; attempt < generation.attempts; attempt += 1) {
        const random = createSeededRandom(seed + attempt * 9973);
        let puzzle = buildSolvedPuzzle(config);
        let previousMove: { from: number; to: number } | null = null;

        for (let step = 0; step < generation.scrambleSteps; step += 1) {
            const moves: { from: number; to: number }[] = [];
            for (let from = 0; from < puzzle.length; from += 1) {
                if (puzzle[from]?.length === 0) continue;
                for (let to = 0; to < puzzle.length; to += 1) {
                    if (from === to || (puzzle[to]?.length ?? config.capacity) >= config.capacity) continue;
                    if (previousMove?.from === to && previousMove.to === from) continue;
                    moves.push({ from, to });
                }
            }
            if (moves.length === 0) break;
            const move = moves[Math.floor(random() * moves.length)];
            puzzle = moveSingleLayer(puzzle, move.from, move.to);
            previousMove = move;
        }

        const score = scorePuzzle(puzzle, config);
        const solvedBottleCount = puzzle.filter((bottle) => (
            bottle.length === config.capacity && bottle.every((color) => color === bottle[0])
        )).length;
        const partialBottleCount = puzzle.filter((bottle) => (
            bottle.length > 0 && bottle.length < config.capacity
        )).length;
        const hasLargeBlock = puzzle.some((bottle) => getLongestRun(bottle) > generation.maxLongestRun);
        const solved = isSolved(puzzle, config.capacity);
        const solvable = canSolvePuzzle(puzzle, config);

        if (!solved && solvable && score > bestSolvableScore) {
            bestSolvablePuzzle = puzzle;
            bestSolvableScore = score;
        }
        if (
            !solved
            && solvable
            && partialBottleCount >= generation.minPartialBottleCount
            && !hasLargeBlock
            && (!generation.requireNoSolvedBottle || solvedBottleCount === 0)
        ) {
            return puzzle;
        }
    }
    return bestSolvablePuzzle;
}

export function validatePuzzle(puzzle: Puzzle, config: PuzzleModeConfig): boolean {
    if (puzzle.length !== config.bottleCount) return false;
    if (puzzle.some((bottle) => bottle.length > config.capacity)) return false;
    const allowed = new Set<ColorToken>(config.colors);
    const counts = new Map<ColorToken, number>();
    for (const bottle of puzzle) {
        for (const color of bottle) {
            if (!allowed.has(color)) return false;
            counts.set(color, (counts.get(color) ?? 0) + 1);
        }
    }
    return config.colors.every((color) => counts.get(color) === config.capacity);
}

export function buildPuzzle(mode: PuzzleMode, seed: number): Puzzle | null {
    const config = PUZZLE_MODE_CONFIGS[mode];
    const puzzle = buildScrambledPuzzle(config, seed);
    if (!puzzle || !validatePuzzle(puzzle, config) || !canSolvePuzzle(puzzle, config)) return null;
    return puzzle;
}
