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
