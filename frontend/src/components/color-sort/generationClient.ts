import { getFallbackPuzzle } from './fallbacks';
import type { Puzzle, PuzzleGenerationRequest, PuzzleGenerationResult, PuzzleMode } from './types';

export interface WorkerLike {
    onmessage: ((event: MessageEvent<PuzzleGenerationResult>) => void) | null;
    onerror: (() => void) | null;
    postMessage(message: PuzzleGenerationRequest): void;
    terminate(): void;
}

export interface GenerationOutcome {
    puzzle: Puzzle;
    usedFallback: boolean;
}

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
                if (
                    token !== generationToken
                    || result.requestId !== currentRequestId
                    || result.mode !== mode
                ) return;
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
                const attemptSeed = (seed + attempt * 0x9e3779b9) >>> 0;
                const puzzle = await runAttempt(mode, attemptSeed, token);
                if (token !== generationToken) {
                    throw new DOMException('Generation cancelled', 'AbortError');
                }
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
