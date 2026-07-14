import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFallbackPuzzle } from './fallbacks';
import { createPuzzleGenerationClient, type WorkerLike } from './generationClient';
import type { PuzzleGenerationRequest, PuzzleGenerationResult } from './types';

class FakeWorker implements WorkerLike {
    onmessage: ((event: MessageEvent<PuzzleGenerationResult>) => void) | null = null;
    onerror: (() => void) | null = null;
    posted: PuzzleGenerationRequest[] = [];
    terminate = vi.fn();

    postMessage(message: PuzzleGenerationRequest) {
        this.posted.push(message);
    }

    respond(result: PuzzleGenerationResult) {
        this.onmessage?.({ data: result } as MessageEvent<PuzzleGenerationResult>);
    }
}

afterEach(() => vi.useRealTimers());

describe('PuzzleGenerationClient', () => {
    it('returns the first correlated worker result', async () => {
        const workers: FakeWorker[] = [];
        const client = createPuzzleGenerationClient({
            workerFactory: () => {
                const worker = new FakeWorker();
                workers.push(worker);
                return worker;
            },
        });

        const pending = client.generate('normal', 11);
        workers[0].respond({ requestId: 999, mode: 'normal', ok: true, puzzle: [['coral']] });
        workers[0].respond({ requestId: 1, mode: 'normal', ok: true, puzzle: [['sky']] });

        await expect(pending).resolves.toEqual({ puzzle: [['sky']], usedFallback: false });
        expect(workers[0].posted).toEqual([{ requestId: 1, mode: 'normal', seed: 11 }]);
        expect(workers[0].terminate).toHaveBeenCalledOnce();
    });

    it('terminates a timed-out worker and retries once with a different seed', async () => {
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

        expect(workers).toHaveLength(2);
        expect(workers[0].terminate).toHaveBeenCalledOnce();
        expect(workers[1].posted[0].seed).not.toBe(17);
        workers[1].respond({ requestId: 2, mode: 'star', ok: true, puzzle: [['violet']] });

        await expect(pending).resolves.toEqual({ puzzle: [['violet']], usedFallback: false });
        expect(workers[1].terminate).toHaveBeenCalledOnce();
    });

    it('uses the committed fallback after exactly two failures', async () => {
        const workers: FakeWorker[] = [];
        const client = createPuzzleGenerationClient({
            workerFactory: () => {
                const worker = new FakeWorker();
                workers.push(worker);
                return worker;
            },
        });

        const pending = client.generate('normal', 23);
        workers[0].respond({ requestId: 1, mode: 'normal', ok: false, error: 'failed' });
        await Promise.resolve();
        workers[1].respond({ requestId: 2, mode: 'normal', ok: false, error: 'failed' });

        await expect(pending).resolves.toEqual({
            puzzle: getFallbackPuzzle('normal'),
            usedFallback: true,
        });
        expect(workers).toHaveLength(2);
        expect(workers.every((worker) => worker.terminate.mock.calls.length === 1)).toBe(true);
    });

    it('treats a synchronous worker factory throw as an attempt failure', async () => {
        const workers: FakeWorker[] = [];
        let factoryCalls = 0;
        const workerFactory = vi.fn(() => {
            factoryCalls += 1;
            if (factoryCalls === 1) throw new Error('worker unavailable');
            const worker = new FakeWorker();
            workers.push(worker);
            return worker;
        });
        const client = createPuzzleGenerationClient({ workerFactory });

        const pending = client.generate('star', 31);
        await Promise.resolve();
        const retryRequest = workers[0].posted[0];
        workers[0].respond({
            requestId: retryRequest.requestId,
            mode: retryRequest.mode,
            ok: true,
            puzzle: [['sun']],
        });

        await expect(pending).resolves.toEqual({ puzzle: [['sun']], usedFallback: false });
        expect(workerFactory).toHaveBeenCalledTimes(2);
        expect(retryRequest.seed).not.toBe(31);
    });

    it('cancels pending generation without accepting a stale result', async () => {
        const workers: FakeWorker[] = [];
        const client = createPuzzleGenerationClient({
            workerFactory: () => {
                const worker = new FakeWorker();
                workers.push(worker);
                return worker;
            },
        });

        const pending = client.generate('normal', 29);
        const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        client.cancel();
        workers[0].respond({ requestId: 1, mode: 'normal', ok: true, puzzle: [['mint']] });

        await rejected;
        expect(workers[0].terminate).toHaveBeenCalledOnce();
    });

    it('aborts old pending work when a new generation starts and ignores its stale result', async () => {
        const workers: FakeWorker[] = [];
        const client = createPuzzleGenerationClient({
            workerFactory: () => {
                const worker = new FakeWorker();
                workers.push(worker);
                return worker;
            },
        });

        const oldPending = client.generate('normal', 37);
        const oldRejected = expect(oldPending).rejects.toMatchObject({ name: 'AbortError' });
        const currentPending = client.generate('star', 41);
        workers[0].respond({ requestId: 1, mode: 'normal', ok: true, puzzle: [['coral']] });
        workers[1].respond({ requestId: 2, mode: 'star', ok: true, puzzle: [['violet']] });

        await oldRejected;
        await expect(currentPending).resolves.toEqual({ puzzle: [['violet']], usedFallback: false });
        expect(workers[0].terminate).toHaveBeenCalledOnce();
        expect(workers[1].terminate).toHaveBeenCalledOnce();
    });
});
