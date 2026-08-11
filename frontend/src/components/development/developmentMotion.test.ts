import { describe, expect, it } from 'vitest';
import {
    CODEX_AGENT_FINISHED_MS,
    CODEX_IMPLEMENTATION_COMPLETE_MS,
    CODEX_SECOND_FILE_READY_MS,
    codexWorkState,
} from './developmentMotion';

describe('codexWorkState', () => {
    it('opens the file panel with the completed plan, then adds the second file and reply', () => {
        expect(codexWorkState(CODEX_IMPLEMENTATION_COMPLETE_MS - 1, false)).toEqual({
            planComplete: false,
            firstFileReady: false,
            secondFileReady: false,
            agentFinished: false,
        });
        expect(codexWorkState(CODEX_IMPLEMENTATION_COMPLETE_MS, false)).toEqual({
            planComplete: true,
            firstFileReady: true,
            secondFileReady: false,
            agentFinished: false,
        });
        expect(CODEX_SECOND_FILE_READY_MS - CODEX_IMPLEMENTATION_COMPLETE_MS).toBe(200);
        expect(codexWorkState(CODEX_SECOND_FILE_READY_MS, false).secondFileReady).toBe(true);
        expect(CODEX_AGENT_FINISHED_MS).toBeGreaterThan(CODEX_SECOND_FILE_READY_MS);
        expect(codexWorkState(CODEX_AGENT_FINISHED_MS, false).agentFinished).toBe(true);
    });

    it('shows the completed state immediately for reduced motion', () => {
        expect(codexWorkState(0, true)).toEqual({
            planComplete: true,
            firstFileReady: true,
            secondFileReady: true,
            agentFinished: true,
        });
    });
});
