import type { Bottle, ColorToken, Puzzle } from './types';

export function clonePuzzle(puzzle: Puzzle): Puzzle {
    return puzzle.map((bottle) => [...bottle]);
}

export function getTopGroup(bottle: Bottle): { color: ColorToken; count: number } | null {
    const color = bottle.at(-1);
    if (!color) return null;
    let count = 0;
    for (let index = bottle.length - 1; index >= 0; index -= 1) {
        if (bottle[index] !== color) break;
        count += 1;
    }
    return { color, count };
}

export function isUniformBottle(bottle: Bottle): boolean {
    return bottle.length > 0 && bottle.every((color) => color === bottle[0]);
}

export function isCompletedBottle(bottle: Bottle, capacity: number): boolean {
    return bottle.length === capacity && isUniformBottle(bottle);
}

export function canPour(puzzle: Puzzle, fromIndex: number, toIndex: number, capacity: number): boolean {
    if (fromIndex === toIndex) return false;
    const from = puzzle[fromIndex];
    const to = puzzle[toIndex];
    if (!from || !to) return false;
    const topGroup = getTopGroup(from);
    if (!topGroup || to.length >= capacity) return false;
    const targetTop = to.at(-1);
    return !targetTop || targetTop === topGroup.color;
}

export function pourBottle(puzzle: Puzzle, fromIndex: number, toIndex: number, capacity: number): Puzzle {
    const next = clonePuzzle(puzzle);
    const from = next[fromIndex];
    const to = next[toIndex];
    const topGroup = from ? getTopGroup(from) : null;
    if (!from || !to || !topGroup || !canPour(puzzle, fromIndex, toIndex, capacity)) return next;
    const pourCount = Math.min(topGroup.count, capacity - to.length);
    for (let count = 0; count < pourCount; count += 1) {
        const color = from.pop();
        if (color) to.push(color);
    }
    return next;
}

export function isSolved(puzzle: Puzzle, capacity: number): boolean {
    return puzzle.every((bottle) => bottle.length === 0 || isCompletedBottle(bottle, capacity));
}

export function countCompletedBottles(puzzle: Puzzle, capacity: number): number {
    return puzzle.filter((bottle) => isCompletedBottle(bottle, capacity)).length;
}

export function serializePuzzle(puzzle: Puzzle): string {
    return puzzle.map((bottle) => bottle.join(',')).sort().join('|');
}

export function getLegalMoves(puzzle: Puzzle, capacity: number): { from: number; to: number }[] {
    const moves: { from: number; to: number }[] = [];
    for (let from = 0; from < puzzle.length; from += 1) {
        const source = puzzle[from];
        if (!source || source.length === 0 || isCompletedBottle(source, capacity)) continue;
        for (let to = 0; to < puzzle.length; to += 1) {
            if (!canPour(puzzle, from, to, capacity)) continue;
            const target = puzzle[to];
            if (target?.length === 0 && isUniformBottle(source)) continue;
            moves.push({ from, to });
        }
    }
    return moves.sort((a, b) => Number(puzzle[a.to]?.length === 0) - Number(puzzle[b.to]?.length === 0));
}
