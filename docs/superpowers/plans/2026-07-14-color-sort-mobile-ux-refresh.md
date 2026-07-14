# Color Sort Mobile UX Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a stable smartphone 3-by-2 color-sort board, keep normal mode at eight layers, increase star mode to ten layers, and improve feedback, accessibility, recovery, sharing, and test coverage.

**Architecture:** Extract capacity-aware pure rules and generation from the current page into focused `components/color-sort` modules. Generate validated puzzles through a Web Worker and a cancellable two-attempt client, while the page remains the state coordinator. Render the board and controls as independent React components and keep sharing behind an injectable runtime so browser fallbacks are testable.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7 Web Workers, Tailwind CSS 4, Vitest 4, Testing Library, React Router, lucide-react.

## Global Constraints

- Phones from 320px through 430px use a fixed three-column, two-row board with no horizontal scrolling.
- The complete six-bottle board fits within a 320-by-568 CSS-pixel viewport; surrounding page content may scroll.
- Tablets retain 3-by-2; desktops switch to one row of six bottles at Tailwind's `lg` breakpoint.
- Normal mode is six bottles, four colors, capacity eight, and two empty-bottle equivalents.
- Star mode is six bottles, five colors, capacity ten, and one empty-bottle equivalent.
- Phone bottle width is `clamp(52px, 18vw, 68px)` and height is `clamp(136px, 28svh, 190px)`.
- Every bottle hit area is at least 44-by-44 CSS pixels.
- Interaction remains source tap followed by destination tap; drag-and-drop is out of scope.
- Successful pour motion lasts 200ms and is removed under `prefers-reduced-motion: reduce`.
- Puzzle generation never blocks the main thread and returns only solver-validated or committed solver-verified boards.
- No persistence, accounts, leaderboard, hints, backend storage, or new game mode is added.

---

## File Structure

Create these focused files:

- `frontend/src/components/color-sort/types.ts` — shared puzzle, mode, configuration, and worker message types.
- `frontend/src/components/color-sort/config.ts` — normal/star configuration and color presentation metadata.
- `frontend/src/components/color-sort/game.ts` — pure capacity-aware move and completion rules.
- `frontend/src/components/color-sort/game.test.ts` — pure rule coverage at capacities eight and ten.
- `frontend/src/components/color-sort/fallbacks.ts` — committed verified recovery boards.
- `frontend/src/components/color-sort/generator.ts` — seeded scrambling, solver, validation, and board construction.
- `frontend/src/components/color-sort/generator.test.ts` — generation invariants and fallback verification.
- `frontend/src/components/color-sort/colorSort.worker.ts` — Vite worker entry point.
- `frontend/src/components/color-sort/generationClient.ts` — timeout, retry, cancellation, stale-response, and fallback orchestration.
- `frontend/src/components/color-sort/generationClient.test.ts` — deterministic Worker lifecycle tests.
- `frontend/src/components/color-sort/BottleView.tsx` — accessible bottle button and layer rendering.
- `frontend/src/components/color-sort/ColorSortBoard.tsx` — explicit responsive grid and live status.
- `frontend/src/components/color-sort/ColorSortBoard.test.tsx` — bottle semantics, markers, and responsive class coverage.
- `frontend/src/components/color-sort/ColorSortControls.tsx` — puzzle actions below the board.
- `frontend/src/components/color-sort/share.ts` — capacity-aware image creation and progressive share flow.
- `frontend/src/components/color-sort/share.test.ts` — native, cancellation, text, and X fallback tests.
- `frontend/src/pages/ColorSortPuzzle.test.tsx` — page state and interaction integration tests.

Modify these existing files:

- `frontend/src/pages/ColorSortPuzzle.tsx` — remove embedded rules/generation/rendering and coordinate the extracted modules.
- `frontend/src/test/setup.ts` — add jsdom `HTMLDialogElement` methods required by the shared Dialog component.

---

### Task 1: Capacity-Aware Types, Configuration, and Pure Rules

**Files:**
- Create: `frontend/src/components/color-sort/types.ts`
- Create: `frontend/src/components/color-sort/config.ts`
- Create: `frontend/src/components/color-sort/game.ts`
- Test: `frontend/src/components/color-sort/game.test.ts`

**Interfaces:**
- Produces: `PuzzleMode`, `PuzzleModeConfig`, `Bottle`, `Puzzle`, `PUZZLE_MODE_CONFIGS`, `clonePuzzle`, `getTopGroup`, `canPour`, `pourBottle`, `isCompletedBottle`, `isSolved`, `countCompletedBottles`, `serializePuzzle`, and `getLegalMoves`.
- Consumes: no new modules.

- [ ] **Step 1: Write the failing pure-rule tests**

Create `frontend/src/components/color-sort/game.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests and confirm the modules are missing**

Run:

```bash
cd frontend
npm test -- src/components/color-sort/game.test.ts
```

Expected: FAIL because `./config`, `./game`, and `./types` do not exist.

- [ ] **Step 3: Add the shared types and exact mode configuration**

Create `types.ts` with these public types:

```ts
export type ColorToken = 'sky' | 'mint' | 'coral' | 'sun' | 'violet' | 'rose';
export type Bottle = ColorToken[];
export type Puzzle = Bottle[];
export type PuzzleMode = 'normal' | 'star';
export type PuzzlePhase = 'generating' | 'playing' | 'solved';

export interface GenerationLimits {
    attempts: number;
    scrambleSteps: number;
    solverDepth: number;
    solverStates: number;
    minPartialBottleCount: number;
    maxLongestRun: number;
    requireNoSolvedBottle: boolean;
}

export interface PuzzleModeConfig {
    mode: PuzzleMode;
    label: string;
    capacity: number;
    bottleCount: number;
    colors: readonly ColorToken[];
    emptyBottleCount: number;
    generation: GenerationLimits;
}

export interface PuzzleGenerationRequest {
    requestId: number;
    mode: PuzzleMode;
    seed: number;
}

export type PuzzleGenerationResult =
    | { requestId: number; mode: PuzzleMode; ok: true; puzzle: Puzzle }
    | { requestId: number; mode: PuzzleMode; ok: false; error: string };
```

Create `config.ts` with immutable configurations and shared color metadata:

```ts
import type { ColorToken, PuzzleMode, PuzzleModeConfig } from './types';

export const COLOR_META: Record<ColorToken, { label: string; gradient: string; canvas: string }> = {
    sky: { label: '青', gradient: 'from-[#5AC8FA] to-[#007AFF]', canvas: '#0A84FF' },
    mint: { label: '緑', gradient: 'from-[#63E6BE] to-[#30D158]', canvas: '#30D158' },
    coral: { label: '赤', gradient: 'from-[#FF9F0A] to-[#FF453A]', canvas: '#FF453A' },
    sun: { label: '黄', gradient: 'from-[#FFE066] to-[#FFD60A]', canvas: '#FFD60A' },
    violet: { label: '紫', gradient: 'from-[#BF5AF2] to-[#7D7AFF]', canvas: '#7D7AFF' },
    rose: { label: '桃', gradient: 'from-[#FF8AC5] to-[#FF375F]', canvas: '#FF375F' },
};

export const PUZZLE_MODE_CONFIGS: Record<PuzzleMode, PuzzleModeConfig> = {
    normal: {
        mode: 'normal',
        label: '通常モード',
        capacity: 8,
        bottleCount: 6,
        colors: ['sky', 'mint', 'coral', 'sun'],
        emptyBottleCount: 2,
        generation: {
            attempts: 120,
            scrambleSteps: 180,
            solverDepth: 80,
            solverStates: 18000,
            minPartialBottleCount: 4,
            maxLongestRun: 5,
            requireNoSolvedBottle: false,
        },
    },
    star: {
        mode: 'star',
        label: '星モード',
        capacity: 10,
        bottleCount: 6,
        colors: ['sky', 'mint', 'coral', 'sun', 'violet'],
        emptyBottleCount: 1,
        generation: {
            attempts: 240,
            scrambleSteps: 320,
            solverDepth: 200,
            solverStates: 100000,
            minPartialBottleCount: 5,
            maxLongestRun: 4,
            requireNoSolvedBottle: true,
        },
    },
};
```

- [ ] **Step 4: Implement capacity-aware pure rules**

Create `game.ts`. Move the current rule bodies from `ColorSortPuzzle.tsx:42-186` and `:337-343`, but expose this exact capacity-aware API:

```ts
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
```

- [ ] **Step 5: Run the pure-rule tests**

Run: `npm test -- src/components/color-sort/game.test.ts`

Expected: 5 tests PASS.

- [ ] **Step 6: Commit the pure rule boundary**

```bash
git add frontend/src/components/color-sort/types.ts frontend/src/components/color-sort/config.ts frontend/src/components/color-sort/game.ts frontend/src/components/color-sort/game.test.ts
git commit -m "refactor: extract capacity-aware color sort rules"
```

---

### Task 2: Validated Generation, Recovery Boards, and Worker Entry

**Files:**
- Create: `frontend/src/components/color-sort/fallbacks.ts`
- Create: `frontend/src/components/color-sort/generator.ts`
- Create: `frontend/src/components/color-sort/generator.test.ts`
- Create: `frontend/src/components/color-sort/colorSort.worker.ts`

**Interfaces:**
- Consumes: `PuzzleMode`, `PuzzleModeConfig`, `Puzzle`, `PUZZLE_MODE_CONFIGS`, and pure rules from Task 1.
- Produces: `createPuzzleSeed(): number`, `canSolvePuzzle(puzzle, config): boolean`, `validatePuzzle(puzzle, config): boolean`, `buildPuzzle(mode, seed): Puzzle | null`, and `getFallbackPuzzle(mode): Puzzle`.

- [ ] **Step 1: Write failing generation invariant tests**

Create `generator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PUZZLE_MODE_CONFIGS } from './config';
import { getFallbackPuzzle } from './fallbacks';
import { buildPuzzle, canSolvePuzzle, validatePuzzle } from './generator';
import type { PuzzleMode } from './types';

const seeds = [1, 7, 19, 41, 73, 109, 211, 997, 4099, 8191];

describe.each(['normal', 'star'] as const)('%s puzzle generation', (mode: PuzzleMode) => {
    const config = PUZZLE_MODE_CONFIGS[mode];

    it.each(seeds)('returns a validated puzzle for seed %i', (seed) => {
        const puzzle = buildPuzzle(mode, seed);
        expect(puzzle).not.toBeNull();
        expect(validatePuzzle(puzzle!, config)).toBe(true);
        expect(canSolvePuzzle(puzzle!, config)).toBe(true);
    });

    it('keeps the committed fallback valid and solvable', () => {
        const fallback = getFallbackPuzzle(mode);
        expect(validatePuzzle(fallback, config)).toBe(true);
        expect(canSolvePuzzle(fallback, config)).toBe(true);
    });
});
```

- [ ] **Step 2: Run the generation test and verify it fails**

Run: `npm test -- src/components/color-sort/generator.test.ts`

Expected: FAIL because generator and fallback modules do not exist.

- [ ] **Step 3: Add immutable fallback boards**

Create `fallbacks.ts`. These recovery boards are intentionally near-solved so their solvability is obvious and cheap to verify:

```ts
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
```

- [ ] **Step 4: Extract and parameterize puzzle generation**

Move the seeded-random, longest-run, single-layer move, score, scramble, and DFS bodies from `ColorSortPuzzle.tsx:46-335` into `generator.ts`. Make every capacity read use `config.capacity` and every limit read use `config.generation`. Use these exact public wrappers and validation behavior:

```ts
import { PUZZLE_MODE_CONFIGS } from './config';
import {
    clonePuzzle,
    getLegalMoves,
    isSolved,
    pourBottle,
    serializePuzzle,
} from './game';
import type { ColorToken, Puzzle, PuzzleMode, PuzzleModeConfig } from './types';

export function createPuzzleSeed(): number {
    let cryptoSeed = 0;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const values = new Uint32Array(1);
        crypto.getRandomValues(values);
        cryptoSeed = values[0] ?? 0;
    }
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff) ^ cryptoSeed) >>> 0;
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
```

In the same file, parameterize these moved private helpers with `PuzzleModeConfig`: `createSeededRandom`, `getLongestRun`, `buildSolvedPuzzle`, `moveSingleLayer`, `scoreRandomness`, `scoreHardness`, and `buildScrambledPuzzle`. `buildScrambledPuzzle` must return `bestSolvablePuzzle` or `null`; it must not return a solved board when generation fails.

- [ ] **Step 5: Add the worker adapter**

Create `colorSort.worker.ts`:

```ts
/// <reference lib="webworker" />
import { buildPuzzle } from './generator';
import type { PuzzleGenerationRequest, PuzzleGenerationResult } from './types';

const workerScope: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<PuzzleGenerationRequest>) => {
    const { requestId, mode, seed } = event.data;
    try {
        const puzzle = buildPuzzle(mode, seed);
        const result: PuzzleGenerationResult = puzzle
            ? { requestId, mode, ok: true, puzzle }
            : { requestId, mode, ok: false, error: 'generation-failed' };
        workerScope.postMessage(result);
    } catch {
        const result: PuzzleGenerationResult = { requestId, mode, ok: false, error: 'generation-error' };
        workerScope.postMessage(result);
    }
};

export {};
```

- [ ] **Step 6: Run generation tests and the TypeScript build**

Run:

```bash
npm test -- src/components/color-sort/generator.test.ts
npm run build
```

Expected: 22 generation/fallback assertions PASS and the Worker entry compiles. If a fixed star seed returns `null`, increase only the star mode limits in `config.ts`, rerun all ten star seeds, and retain the smallest limits that make the full fixed corpus pass.

- [ ] **Step 7: Commit validated generation**

```bash
git add frontend/src/components/color-sort/fallbacks.ts frontend/src/components/color-sort/generator.ts frontend/src/components/color-sort/generator.test.ts frontend/src/components/color-sort/colorSort.worker.ts frontend/src/components/color-sort/config.ts
git commit -m "feat: generate validated star puzzles off-thread"
```

---

### Task 3: Cancellable Worker Client with Timeout and Recovery

**Files:**
- Create: `frontend/src/components/color-sort/generationClient.ts`
- Test: `frontend/src/components/color-sort/generationClient.test.ts`

**Interfaces:**
- Consumes: worker request/result types and `getFallbackPuzzle`.
- Produces: `createPuzzleGenerationClient(options?): PuzzleGenerationClient`, where `generate(mode, seed)` resolves `{ puzzle, usedFallback }` and `cancel()` rejects pending work with `AbortError`.

- [ ] **Step 1: Write failing Worker lifecycle tests**

Create `generationClient.test.ts` with a controllable Worker double:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPuzzleGenerationClient, type WorkerLike } from './generationClient';
import type { PuzzleGenerationResult } from './types';

class FakeWorker implements WorkerLike {
    onmessage: ((event: MessageEvent<PuzzleGenerationResult>) => void) | null = null;
    onerror: (() => void) | null = null;
    posted: unknown[] = [];
    terminate = vi.fn();
    postMessage(message: unknown) { this.posted.push(message); }
    respond(result: PuzzleGenerationResult) { this.onmessage?.({ data: result } as MessageEvent<PuzzleGenerationResult>); }
}

afterEach(() => vi.useRealTimers());

describe('PuzzleGenerationClient', () => {
    it('returns the first validated worker result', async () => {
        const workers: FakeWorker[] = [];
        const client = createPuzzleGenerationClient({ workerFactory: () => {
            const worker = new FakeWorker();
            workers.push(worker);
            return worker;
        } });
        const pending = client.generate('normal', 11);
        workers[0].respond({ requestId: 1, mode: 'normal', ok: true, puzzle: [['sky']] });
        await expect(pending).resolves.toEqual({ puzzle: [['sky']], usedFallback: false });
        expect(workers[0].terminate).toHaveBeenCalledOnce();
    });

    it('terminates a timed-out worker and retries once', async () => {
        vi.useFakeTimers();
        const workers: FakeWorker[] = [];
        const client = createPuzzleGenerationClient({
            timeoutMs: 3000,
            workerFactory: () => {
                const worker = new FakeWorker();
                workers.push(worker);
                return worker;
            },
        });
        const pending = client.generate('star', 17);
        await vi.advanceTimersByTimeAsync(3000);
        expect(workers[0].terminate).toHaveBeenCalledOnce();
        workers[1].respond({ requestId: 2, mode: 'star', ok: true, puzzle: [['violet']] });
        await expect(pending).resolves.toEqual({ puzzle: [['violet']], usedFallback: false });
    });

    it('uses the committed fallback after two failures', async () => {
        const workers: FakeWorker[] = [];
        const client = createPuzzleGenerationClient({ workerFactory: () => {
            const worker = new FakeWorker();
            workers.push(worker);
            return worker;
        } });
        const pending = client.generate('normal', 23);
        workers[0].respond({ requestId: 1, mode: 'normal', ok: false, error: 'failed' });
        await Promise.resolve();
        workers[1].respond({ requestId: 2, mode: 'normal', ok: false, error: 'failed' });
        await expect(pending).resolves.toMatchObject({ usedFallback: true });
    });

    it('cancels pending generation without accepting stale results', async () => {
        const workers: FakeWorker[] = [];
        const client = createPuzzleGenerationClient({ workerFactory: () => {
            const worker = new FakeWorker();
            workers.push(worker);
            return worker;
        } });
        const pending = client.generate('normal', 29);
        client.cancel();
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        expect(workers[0].terminate).toHaveBeenCalledOnce();
    });
});
```

- [ ] **Step 2: Run the lifecycle tests and verify failure**

Run: `npm test -- src/components/color-sort/generationClient.test.ts`

Expected: FAIL because `generationClient.ts` does not exist.

- [ ] **Step 3: Implement the two-attempt client**

Create `generationClient.ts` with this interface and lifecycle. Each attempt owns a fresh Worker, so timeout always terminates the blocked Worker before retry:

```ts
import { getFallbackPuzzle } from './fallbacks';
import type { Puzzle, PuzzleGenerationRequest, PuzzleGenerationResult, PuzzleMode } from './types';

export interface WorkerLike {
    onmessage: ((event: MessageEvent<PuzzleGenerationResult>) => void) | null;
    onerror: (() => void) | null;
    postMessage(message: PuzzleGenerationRequest): void;
    terminate(): void;
}

export interface GenerationOutcome { puzzle: Puzzle; usedFallback: boolean }
export interface PuzzleGenerationClient {
    generate(mode: PuzzleMode, seed: number): Promise<GenerationOutcome>;
    cancel(): void;
}

interface Options {
    workerFactory?: () => WorkerLike;
    timeoutMs?: number;
}

const defaultWorkerFactory = (): WorkerLike => (
    new Worker(new URL('./colorSort.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike
);

export function createPuzzleGenerationClient({
    workerFactory = defaultWorkerFactory,
    timeoutMs = 3000,
}: Options = {}): PuzzleGenerationClient {
    let generationToken = 0;
    let requestId = 0;
    let cancelActive: (() => void) | null = null;

    const runAttempt = (mode: PuzzleMode, seed: number, token: number): Promise<Puzzle | null> => (
        new Promise((resolve, reject) => {
            let worker: WorkerLike;
            try {
                worker = workerFactory();
            } catch {
                resolve(null);
                return;
            }
            const currentRequestId = ++requestId;
            let settled = false;
            const finish = (puzzle: Puzzle | null) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                worker.terminate();
                if (cancelActive === cancel) cancelActive = null;
                resolve(puzzle);
            };
            const cancel = () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                worker.terminate();
                reject(new DOMException('Generation cancelled', 'AbortError'));
            };
            const timer = window.setTimeout(() => finish(null), timeoutMs);
            cancelActive = cancel;
            worker.onmessage = (event) => {
                const result = event.data;
                if (token !== generationToken || result.requestId !== currentRequestId || result.mode !== mode) return;
                finish(result.ok ? result.puzzle : null);
            };
            worker.onerror = () => finish(null);
            worker.postMessage({ requestId: currentRequestId, mode, seed });
        })
    );

    return {
        async generate(mode, seed) {
            cancelActive?.();
            const token = ++generationToken;
            for (let attempt = 0; attempt < 2; attempt += 1) {
                const puzzle = await runAttempt(mode, (seed + attempt * 0x9e3779b9) >>> 0, token);
                if (token !== generationToken) throw new DOMException('Generation cancelled', 'AbortError');
                if (puzzle) return { puzzle, usedFallback: false };
            }
            return { puzzle: getFallbackPuzzle(mode), usedFallback: true };
        },
        cancel() {
            generationToken += 1;
            cancelActive?.();
            cancelActive = null;
        },
    };
}
```

- [ ] **Step 4: Run Worker client tests**

Run: `npm test -- src/components/color-sort/generationClient.test.ts`

Expected: 4 tests PASS, including timeout termination and cancellation.

- [ ] **Step 5: Commit Worker orchestration**

```bash
git add frontend/src/components/color-sort/generationClient.ts frontend/src/components/color-sort/generationClient.test.ts
git commit -m "feat: add resilient puzzle generation client"
```

---

### Task 4: Accessible Bottle and Stable Responsive Board

**Files:**
- Create: `frontend/src/components/color-sort/BottleView.tsx`
- Create: `frontend/src/components/color-sort/ColorSortBoard.tsx`
- Test: `frontend/src/components/color-sort/ColorSortBoard.test.tsx`

**Interfaces:**
- Consumes: `Bottle`, `Puzzle`, `PuzzleModeConfig`, `COLOR_META`, and `isCompletedBottle`.
- Produces: `BottleView` and `ColorSortBoard` React components.

- [ ] **Step 1: Write failing semantics and layout tests**

Create `ColorSortBoard.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PUZZLE_MODE_CONFIGS } from './config';
import { ColorSortBoard } from './ColorSortBoard';
import type { Puzzle } from './types';

const puzzle: Puzzle = [
    ['sky', 'sky'],
    ['mint'],
    Array.from({ length: 8 }, () => 'coral' as const),
    [],
    ['sun'],
    [],
];

describe('ColorSortBoard', () => {
    it('renders an explicit 3-by-2 base grid and six-column desktop grid', () => {
        render(<ColorSortBoard puzzle={puzzle} config={PUZZLE_MODE_CONFIGS.normal} selectedIndex={null} legalTargets={[]} status="" disabled={false} onBottleClick={() => undefined} />);
        expect(screen.getByTestId('color-sort-board')).toHaveClass('grid-cols-3', 'lg:grid-cols-6');
    });

    it('exposes selected, target, completed, and content states without color alone', () => {
        render(<ColorSortBoard puzzle={puzzle} config={PUZZLE_MODE_CONFIGS.normal} selectedIndex={0} legalTargets={[3]} status="注ぎ先を選択" disabled={false} onBottleClick={() => undefined} />);
        expect(screen.getByRole('button', { name: /ボトル 1.*選択中/ })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /ボトル 4.*注げます/ })).toHaveTextContent('✓');
        expect(screen.getByRole('button', { name: /ボトル 3.*完成/ })).toBeDisabled();
        expect(screen.getByRole('status')).toHaveTextContent('注ぎ先を選択');
    });

    it('keeps the full bottle as the click target', () => {
        const onBottleClick = vi.fn();
        render(<ColorSortBoard puzzle={puzzle} config={PUZZLE_MODE_CONFIGS.normal} selectedIndex={null} legalTargets={[]} status="" disabled={false} onBottleClick={onBottleClick} />);
        fireEvent.click(screen.getByRole('button', { name: /ボトル 1/ }));
        expect(onBottleClick).toHaveBeenCalledWith(0);
    });
});
```

- [ ] **Step 2: Run the board tests and verify failure**

Run: `npm test -- src/components/color-sort/ColorSortBoard.test.tsx`

Expected: FAIL because `ColorSortBoard` does not exist.

- [ ] **Step 3: Implement descriptive bottle labels and layers**

Create `BottleView.tsx`. Use `COLOR_META[color].label`, group adjacent colors from top to bottom, and render exactly `capacity` layers:

```tsx
import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { COLOR_META } from './config';
import type { Bottle } from './types';

interface Props {
    bottle: Bottle;
    index: number;
    capacity: number;
    selected: boolean;
    legalTarget: boolean;
    completed: boolean;
    disabled: boolean;
    onClick: () => void;
}

function describeContents(bottle: Bottle): string {
    if (bottle.length === 0) return '空';
    const groups: { color: Bottle[number]; count: number }[] = [];
    for (const color of [...bottle].reverse()) {
        const last = groups.at(-1);
        if (last?.color === color) last.count += 1;
        else groups.push({ color, count: 1 });
    }
    return `上から${groups.map(({ color, count }) => `${COLOR_META[color].label}${count}層`).join('、')}`;
}

export function BottleView({ bottle, index, capacity, selected, legalTarget, completed, disabled, onClick }: Props) {
    const state = [selected && '選択中', legalTarget && '注げます', completed && '完成'].filter(Boolean).join('、');
    const label = `ボトル ${index + 1}、${bottle.length}/${capacity}、${describeContents(bottle)}${state ? `、${state}` : ''}`;
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={selected}
            disabled={disabled || completed}
            onClick={onClick}
            style={{ '--slot-count': capacity } as CSSProperties}
            className={`relative min-h-11 min-w-11 [width:clamp(52px,18vw,68px)] [height:clamp(136px,28svh,190px)] lg:h-[360px] lg:w-[86px] overflow-hidden rounded-b-[24px] rounded-t-[16px] border bg-white/55 backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200 motion-reduce:translate-y-0 motion-reduce:transition-none ${selected ? '-translate-y-2 border-[#0071E3] shadow-[0_16px_36px_rgba(0,113,227,0.22)]' : legalTarget ? 'border-[#30D158] shadow-[0_12px_28px_rgba(48,209,88,0.2)]' : 'border-black/10 dark:border-white/15'}`}
        >
            <span className="absolute inset-x-2 bottom-2 top-5 flex flex-col-reverse overflow-hidden rounded-b-[18px] rounded-t-[8px]">
                {Array.from({ length: capacity }, (_, layerIndex) => {
                    const color = bottle[layerIndex];
                    return <span key={layerIndex} style={{ height: 'calc(100% / var(--slot-count))' }} className={color ? `border-t border-white/45 bg-gradient-to-br ${COLOR_META[color].gradient}` : 'border-t border-white/20 bg-white/20 dark:bg-white/[0.03]'} />;
                })}
            </span>
            {legalTarget && <span aria-hidden="true" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#30D158] text-white"><Check className="h-4 w-4" /></span>}
            {completed && <span aria-hidden="true" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#0071E3] text-white"><Check className="h-4 w-4" /></span>}
            {selected && <span aria-hidden="true" className="absolute inset-x-1 top-1 text-[10px] font-semibold text-[#0071E3]">選択中</span>}
        </button>
    );
}
```

- [ ] **Step 4: Implement the explicit grid and live status**

Create `ColorSortBoard.tsx`:

```tsx
import { isCompletedBottle } from './game';
import { BottleView } from './BottleView';
import type { Puzzle, PuzzleModeConfig } from './types';

interface Props {
    puzzle: Puzzle;
    config: PuzzleModeConfig;
    selectedIndex: number | null;
    legalTargets: number[];
    status: string;
    disabled: boolean;
    onBottleClick: (index: number) => void;
}

export function ColorSortBoard({ puzzle, config, selectedIndex, legalTargets, status, disabled, onBottleClick }: Props) {
    return (
        <section aria-label="カラーボトル盤面" className="rounded-[24px] bg-[#F5F5F7] p-3 dark:bg-black/30 sm:p-5">
            <p role="status" aria-live="polite" className="mb-3 min-h-6 text-center text-sm text-[#6E6E73] dark:text-[rgba(235,235,245,0.7)]">
                {status || 'ボトルを選んでください。'}
            </p>
            <div data-testid="color-sort-board" className="grid grid-cols-3 grid-rows-2 place-items-end gap-x-3 gap-y-4 sm:gap-x-6 sm:gap-y-6 lg:grid-cols-6 lg:grid-rows-1">
                {puzzle.map((bottle, index) => (
                    <BottleView
                        key={index}
                        bottle={bottle}
                        index={index}
                        capacity={config.capacity}
                        selected={selectedIndex === index}
                        legalTarget={legalTargets.includes(index)}
                        completed={isCompletedBottle(bottle, config.capacity)}
                        disabled={disabled}
                        onClick={() => onBottleClick(index)}
                    />
                ))}
            </div>
        </section>
    );
}
```

- [ ] **Step 5: Run board tests**

Run: `npm test -- src/components/color-sort/ColorSortBoard.test.tsx`

Expected: 3 tests PASS.

- [ ] **Step 6: Commit the responsive accessible board**

```bash
git add frontend/src/components/color-sort/BottleView.tsx frontend/src/components/color-sort/ColorSortBoard.tsx frontend/src/components/color-sort/ColorSortBoard.test.tsx
git commit -m "feat: add accessible responsive color sort board"
```

---

### Task 5: Capacity-Aware Sharing and Cancellation-Safe Fallbacks

**Files:**
- Create: `frontend/src/components/color-sort/share.ts`
- Test: `frontend/src/components/color-sort/share.test.ts`

**Interfaces:**
- Consumes: `Puzzle`, `PuzzleModeConfig`, and `COLOR_META`.
- Produces: `createShareText`, `createShareImage`, and `shareResult`, returning `'native' | 'x' | 'cancelled'`.

- [ ] **Step 1: Write failing share-flow tests**

Create `share.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { PUZZLE_MODE_CONFIGS } from './config';
import { shareResult } from './share';
import type { Puzzle } from './types';

const puzzle: Puzzle = [['sky']];
const result = { puzzle, moves: 12, config: PUZZLE_MODE_CONFIGS.star };

describe('shareResult', () => {
    it('stops when the native sheet is cancelled', async () => {
        const openX = vi.fn();
        const runtime = {
            createImage: vi.fn().mockResolvedValue(null),
            share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
            canShare: vi.fn().mockReturnValue(false),
            openX,
            origin: 'https://tti-intel.com',
        };
        await expect(shareResult(result, runtime)).resolves.toBe('cancelled');
        expect(openX).not.toHaveBeenCalled();
    });

    it('falls from file share to text-only native share', async () => {
        const share = vi.fn().mockRejectedValueOnce(new Error('file failed')).mockResolvedValueOnce(undefined);
        const runtime = {
            createImage: vi.fn().mockResolvedValue(new File(['x'], 'result.png', { type: 'image/png' })),
            share,
            canShare: vi.fn().mockReturnValue(true),
            openX: vi.fn(),
            origin: 'https://tti-intel.com',
        };
        await expect(shareResult(result, runtime)).resolves.toBe('native');
        expect(share).toHaveBeenCalledTimes(2);
        expect(runtime.openX).not.toHaveBeenCalled();
    });

    it('opens X only after native sharing is unavailable', async () => {
        const openX = vi.fn();
        const runtime = {
            createImage: vi.fn().mockResolvedValue(null),
            share: undefined,
            canShare: undefined,
            openX,
            origin: 'https://tti-intel.com',
        };
        await expect(shareResult(result, runtime)).resolves.toBe('x');
        expect(openX).toHaveBeenCalledOnce();
    });
});
```

- [ ] **Step 2: Run the share test and verify failure**

Run: `npm test -- src/components/color-sort/share.test.ts`

Expected: FAIL because `share.ts` does not exist.

- [ ] **Step 3: Extract image drawing and implement progressive sharing**

Move `roundRect`, `drawShareBottle`, and canvas creation from `ColorSortPuzzle.tsx:354-455` into `share.ts`. Replace the global capacity and canvas color maps with `config.capacity` and `COLOR_META[color].canvas`. Add this exact public share flow:

```ts
import { COLOR_META } from './config';
import type { Puzzle, PuzzleModeConfig } from './types';

export type ShareOutcome = 'native' | 'x' | 'cancelled';
export interface ShareRuntime {
    createImage: (puzzle: Puzzle, moves: number, config: PuzzleModeConfig) => Promise<File | null>;
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
    openX: (url: string) => void;
    origin: string;
}

export function createShareText(moves: number, config: PuzzleModeConfig): string {
    return `${config.label}のカラーソートパズルを${moves}手で解けました！`;
}

export async function createShareImage(puzzle: Puzzle, moves: number, config: PuzzleModeConfig): Promise<File | null> {
    const canvas = document.createElement('canvas');
    canvas.width = 1200 * (window.devicePixelRatio || 1);
    canvas.height = 675 * (window.devicePixelRatio || 1);
    const context = canvas.getContext('2d');
    if (!context) return null;
    drawShareScene(context, puzzle, moves, config, window.devicePixelRatio || 1);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? new File([blob], 'color-sort-result.png', { type: 'image/png' }) : null;
}

const defaultRuntime = (): ShareRuntime => ({
    createImage: createShareImage,
    share: navigator.share?.bind(navigator),
    canShare: navigator.canShare?.bind(navigator),
    openX: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
    origin: window.location.origin,
});

export async function shareResult(
    result: { puzzle: Puzzle; moves: number; config: PuzzleModeConfig },
    runtime: ShareRuntime = defaultRuntime(),
): Promise<ShareOutcome> {
    const text = createShareText(result.moves, result.config);
    const url = `${runtime.origin}/app/color-sort`;
    const image = await runtime.createImage(result.puzzle, result.moves, result.config).catch(() => null);
    if (image && runtime.share && runtime.canShare?.({ files: [image] })) {
        try {
            await runtime.share({ title: 'カラーソートパズル', text, url, files: [image] });
            return 'native';
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        }
    }
    if (runtime.share) {
        try {
            await runtime.share({ title: 'カラーソートパズル', text, url });
            return 'native';
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        }
    }
    const intent = new URL('https://twitter.com/intent/tweet');
    intent.searchParams.set('text', text);
    intent.searchParams.set('url', url);
    runtime.openX(intent.toString());
    return 'x';
}
```

Implement `drawShareScene` and `drawShareBottle` privately using the existing geometry. The only formula change is `const layerHeight = liquidHeight / config.capacity`; use `COLOR_META[color].canvas` for each layer.

- [ ] **Step 4: Run share tests**

Run: `npm test -- src/components/color-sort/share.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the share boundary**

```bash
git add frontend/src/components/color-sort/share.ts frontend/src/components/color-sort/share.test.ts
git commit -m "fix: make color sort sharing cancellation-safe"
```

---

### Task 6: Puzzle Controls and Page Integration

**Files:**
- Create: `frontend/src/components/color-sort/ColorSortControls.tsx`
- Create: `frontend/src/pages/ColorSortPuzzle.test.tsx`
- Modify: `frontend/src/pages/ColorSortPuzzle.tsx`
- Modify: `frontend/src/test/setup.ts`

**Interfaces:**
- Consumes: all public modules from Tasks 1-5 and the shared `Button` and `Dialog` components.
- Produces: the final routed `ColorSortPuzzlePage` behavior and control surface.

- [ ] **Step 1: Add jsdom dialog support**

Append to `frontend/src/test/setup.ts` so page dialogs can be tested. Assign both methods unconditionally because jsdom versions may expose a stub that still throws:

```ts
HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
};

HTMLDialogElement.prototype.close = function close() {
    this.open = false;
};
```

- [ ] **Step 2: Write failing page interaction tests**

Create `ColorSortPuzzle.test.tsx`. Mock only the generation client; keep actual rules and components:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Puzzle } from '@/components/color-sort/types';

const generation = vi.hoisted(() => ({ generate: vi.fn(), cancel: vi.fn() }));
vi.mock('@/components/color-sort/generationClient', () => ({
    createPuzzleGenerationClient: () => generation,
}));

import { ColorSortPuzzlePage } from './ColorSortPuzzle';

const normalPuzzle: Puzzle = [
    ['sky', 'sky', 'sky', 'sky', 'sky', 'sky'],
    ['mint', 'mint', 'mint', 'mint', 'mint'],
    Array.from({ length: 8 }, () => 'coral' as const),
    Array.from({ length: 8 }, () => 'sun' as const),
    ['sky', 'sky'],
    ['mint', 'mint', 'mint'],
];

const oneMovePuzzle: Puzzle = [
    ['sky', 'sky', 'sky', 'sky', 'sky', 'sky'],
    Array.from({ length: 8 }, () => 'mint' as const),
    Array.from({ length: 8 }, () => 'coral' as const),
    Array.from({ length: 8 }, () => 'sun' as const),
    ['sky', 'sky'],
    [],
];

function renderPage() {
    return render(<MemoryRouter><ColorSortPuzzlePage /></MemoryRouter>);
}

beforeEach(() => {
    generation.generate.mockReset().mockResolvedValue({ puzzle: normalPuzzle, usedFallback: false });
    generation.cancel.mockReset();
});

describe('ColorSortPuzzlePage', () => {
    it('selects, cancels, and consistently switches sources', async () => {
        renderPage();
        const first = await screen.findByRole('button', { name: /ボトル 1/ });
        const second = screen.getByRole('button', { name: /ボトル 2/ });
        fireEvent.click(first);
        expect(first).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(first);
        expect(first).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(first);
        fireEvent.click(second);
        expect(second).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('status')).toHaveTextContent('移動元を変更しました');
    });

    it('pours a legal group and supports undo', async () => {
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        expect(screen.getByText('1', { selector: '[data-stat="moves"]' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '戻す' }));
        expect(screen.getByText('0', { selector: '[data-stat="moves"]' })).toBeInTheDocument();
    });

    it.each(['リセット', '新しい問題', '星'])('confirms %s after a move', async (actionName) => {
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        fireEvent.click(screen.getByRole('button', { name: actionName }));
        expect(screen.getByRole('dialog')).toHaveTextContent('現在の進捗を破棄しますか');
    });

    it('executes a confirmed new puzzle', async () => {
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        fireEvent.click(screen.getByRole('button', { name: '新しい問題' }));
        fireEvent.click(screen.getByRole('button', { name: '続ける' }));
        await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(2));
    });

    it('generates star mode with capacity ten', async () => {
        renderPage();
        await screen.findByRole('button', { name: /ボトル 1/ });
        fireEvent.click(screen.getByRole('button', { name: '星' }));
        await waitFor(() => expect(generation.generate).toHaveBeenLastCalledWith('star', expect.any(Number)));
        expect(await screen.findByText('星モード')).toBeInTheDocument();
    });

    it('shows recovery status when the client uses a fallback', async () => {
        generation.generate.mockResolvedValue({ puzzle: normalPuzzle, usedFallback: true });
        renderPage();
        expect(await screen.findByRole('status')).toHaveTextContent('安全な予備問題を読み込みました');
    });

    it('opens the result actions when the final move solves the board', async () => {
        generation.generate.mockResolvedValue({ puzzle: oneMovePuzzle, usedFallback: false });
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        expect(screen.getByRole('dialog')).toHaveTextContent('完成しました');
        expect(screen.getByRole('button', { name: '次の問題' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'シェア' })).toBeEnabled();
    });
});
```

- [ ] **Step 3: Run the page tests and confirm they fail**

Run: `npm test -- src/pages/ColorSortPuzzle.test.tsx`

Expected: FAIL because the current page is synchronous, uses the embedded board, and lacks confirmations.

- [ ] **Step 4: Add the extracted controls**

Create `ColorSortControls.tsx`:

```tsx
import { RotateCcw, Share2, Sparkles, Star, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { PuzzlePhase } from './types';

interface Props {
    phase: PuzzlePhase;
    moveCount: number;
    starMode: boolean;
    onUndo: () => void;
    onReset: () => void;
    onNewPuzzle: () => void;
    onToggleStar: () => void;
    onShare: () => void;
}

export function ColorSortControls({ phase, moveCount, starMode, onUndo, onReset, onNewPuzzle, onToggleStar, onShare }: Props) {
    const generating = phase === 'generating';
    return (
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-5">
            <Button type="button" variant="secondary" onClick={onUndo} disabled={generating || moveCount === 0}><Undo2 className="h-4 w-4" />戻す</Button>
            <Button type="button" variant="secondary" onClick={onReset} disabled={generating}><RotateCcw className="h-4 w-4" />リセット</Button>
            <Button type="button" onClick={onNewPuzzle} disabled={generating}><Sparkles className="h-4 w-4" />新しい問題</Button>
            <Button type="button" variant={starMode ? 'primary' : 'secondary'} onClick={onToggleStar} disabled={generating}><Star className="h-4 w-4" />星</Button>
            <Button type="button" variant="secondary" onClick={onShare} disabled={phase !== 'solved'}><Share2 className="h-4 w-4" />シェア</Button>
        </div>
    );
}
```

- [ ] **Step 5: Replace embedded page logic with the state coordinator**

In `ColorSortPuzzle.tsx`, retain the SEO, hero, back link, and page shell. Delete the embedded rule, generator, canvas, and `BottleView` definitions. Import the extracted modules and implement these exact state transitions:

```tsx
const [mode, setMode] = useState<PuzzleMode>('normal');
const config = PUZZLE_MODE_CONFIGS[mode];
const [phase, setPhase] = useState<PuzzlePhase>('generating');
const [puzzleNumber, setPuzzleNumber] = useState(1);
const [initialPuzzle, setInitialPuzzle] = useState<Puzzle>([]);
const [puzzle, setPuzzle] = useState<Puzzle>([]);
const [history, setHistory] = useState<Puzzle[]>([]);
const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
const [status, setStatus] = useState('問題を準備中です。');
const [pendingAction, setPendingAction] = useState<'reset' | 'new' | 'mode' | null>(null);
const [resultOpen, setResultOpen] = useState(false);
const generatorRef = useRef(createPuzzleGenerationClient());

const startPuzzle = useCallback(async (nextMode: PuzzleMode, advanceNormalNumber = false) => {
    setPhase('generating');
    setSelectedIndex(null);
    setResultOpen(false);
    setStatus('問題を準備中です。');
    try {
        const outcome = await generatorRef.current.generate(nextMode, createPuzzleSeed());
        setMode(nextMode);
        if (nextMode === 'normal' && advanceNormalNumber) setPuzzleNumber((value) => value + 1);
        setInitialPuzzle(clonePuzzle(outcome.puzzle));
        setPuzzle(clonePuzzle(outcome.puzzle));
        setHistory([]);
        setStatus(outcome.usedFallback ? '安全な予備問題を読み込みました。' : 'ボトルを選んでください。');
        setPhase('playing');
    } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
            setStatus('問題の準備に失敗しました。もう一度お試しください。');
        }
    }
}, []);

useEffect(() => {
    void startPuzzle('normal');
    return () => generatorRef.current.cancel();
}, [startPuzzle]);

const legalTargets = useMemo(() => selectedIndex === null ? [] : puzzle
    .map((_, index) => index)
    .filter((index) => canPour(puzzle, selectedIndex, index, config.capacity)), [config.capacity, puzzle, selectedIndex]);

const handleBottleClick = (index: number) => {
    if (phase !== 'playing') return;
    const bottle = puzzle[index];
    if (!bottle || isCompletedBottle(bottle, config.capacity)) return;
    if (selectedIndex === null) {
        if (bottle.length > 0) {
            setSelectedIndex(index);
            setStatus('注ぎ先を選んでください。');
        }
        return;
    }
    if (selectedIndex === index) {
        setSelectedIndex(null);
        setStatus('選択を解除しました。');
        return;
    }
    if (!canPour(puzzle, selectedIndex, index, config.capacity)) {
        if (bottle.length > 0) {
            setSelectedIndex(index);
            setStatus('移動元を変更しました。');
        } else {
            setStatus('同じ色の上、または空のボトルにだけ注げます。');
        }
        return;
    }
    const next = pourBottle(puzzle, selectedIndex, index, config.capacity);
    setHistory((entries) => [...entries, clonePuzzle(puzzle)]);
    setPuzzle(next);
    setSelectedIndex(null);
    if (isSolved(next, config.capacity)) {
        setPhase('solved');
        setResultOpen(true);
        setStatus('完成しました。');
    } else {
        setStatus('移動しました。');
    }
};
```

Implement `undo` by restoring `history.at(-1)`, clearing selection, closing `resultOpen`, and setting `phase` to `playing`. Implement `requestAction` so reset/new/mode show the confirmation only when `history.length > 0 && phase !== 'solved'`. `executeAction` restores `initialPuzzle` for reset; for new it calls `startPuzzle(mode, mode === 'normal')`; for mode it calculates the destination mode and calls `startPuzzle(nextMode, nextMode === 'normal')`.

Replace the board/control JSX with:

```tsx
<ColorSortBoard
    puzzle={puzzle}
    config={config}
    selectedIndex={selectedIndex}
    legalTargets={legalTargets}
    status={status}
    disabled={phase !== 'playing'}
    onBottleClick={handleBottleClick}
/>
<div className="mt-4">
    <ColorSortControls
        phase={phase}
        moveCount={history.length}
        starMode={mode === 'star'}
        onUndo={undo}
        onReset={() => requestAction('reset')}
        onNewPuzzle={() => requestAction('new')}
        onToggleStar={() => requestAction('mode')}
        onShare={() => void shareResult({ puzzle, moves: history.length, config })}
    />
</div>
```

Change the stats markup so the move value has `data-stat="moves"`, the mode value displays `★` or `puzzleNumber`, and `Full` becomes `Completed` using `countCompletedBottles(puzzle, config.capacity)`.

Render the shared `Dialog` for `pendingAction` with title `現在の進捗を破棄しますか`, buttons `キャンセル` and `続ける`. Render a second Dialog with `open={resultOpen}` and `onClose={() => setResultOpen(false)}` containing the title `完成しました`, move count, `次の問題`, and `シェア`; closing it leaves `phase === 'solved'` and the solved board visible.

- [ ] **Step 6: Run page, component, and share tests**

Run:

```bash
npm test -- src/pages/ColorSortPuzzle.test.tsx src/components/color-sort/ColorSortBoard.test.tsx src/components/color-sort/share.test.ts
```

Expected: all interaction, board, and share tests PASS.

- [ ] **Step 7: Commit the integrated page**

```bash
git add frontend/src/pages/ColorSortPuzzle.tsx frontend/src/pages/ColorSortPuzzle.test.tsx frontend/src/test/setup.ts frontend/src/components/color-sort/ColorSortControls.tsx
git commit -m "feat: refresh color sort mobile interactions"
```

---

### Task 7: Full Verification and Responsive QA

**Files:**
- Modify only files from Tasks 1-6 if verification exposes a defect.

**Interfaces:**
- Consumes: the fully integrated puzzle.
- Produces: a verified implementation with clean test, lint, and build output.

- [ ] **Step 1: Run the complete automated suite**

Run from `frontend`:

```bash
npm test
npm run lint
npm run build
```

Expected: every Vitest test passes, ESLint reports zero errors, and Vite completes a production build including the Worker chunk.

- [ ] **Step 2: Verify responsive checkpoints**

Start the local app with `npm run dev -- --host 127.0.0.1`, open `/app/color-sort`, and inspect these exact viewports:

```text
320 × 568
375 × 667
390 × 844
430 × 932
640 × 960
1024 × 768
```

At 320, 375, 390, 430, and 640px, verify exactly three bottle columns and two rows with no horizontal or internal board scroll. At 1024px, verify six columns and one row. At 320-by-568, scroll the page until the board begins at the viewport top and verify the entire board ends before the viewport bottom.

- [ ] **Step 3: Verify both modes and accessibility states**

In light and dark themes:

```text
Normal: 8 visible layer slots per bottle
Star: 10 visible layer slots per bottle
Selected: blue outline + 選択中
Legal target: green outline + check marker
Completed: disabled + completion marker
Reduced motion: no bottle translation or layer transition
Generation: controls disabled + 問題を準備中です。
```

Use keyboard Tab, Enter, and Space to select bottles and controls. Confirm the live status changes for selection, source switching, valid moves, and completion.

- [ ] **Step 4: Inspect repository state and commit any verification-only correction**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only intentional files are modified. If verification required a correction, rerun the affected focused test plus `npm run lint && npm run build`, then commit only that correction:

```bash
git add frontend/src/components/color-sort frontend/src/pages/ColorSortPuzzle.tsx frontend/src/pages/ColorSortPuzzle.test.tsx frontend/src/test/setup.ts
git commit -m "fix: complete color sort responsive verification"
```
