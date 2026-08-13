import { describe, expect, it } from 'vitest';
import {
    CODEX_AGENT_FINISHED_MS,
    CODEX_CURSOR_DEPART_MS,
    CODEX_LAUNCH_CLICK_MS,
    CODEX_IMPLEMENTATION_COMPLETE_MS,
    CODEX_LAUNCH_OPEN_MS,
    CODEX_SECOND_FILE_READY_MS,
    codexLaunchState,
    codexWorkState,
    demoCursorTarget,
} from './developmentMotion';

describe('codexLaunchState', () => {
    it('moves the cursor promptly, then leaves a readable beat before clicking Codex', () => {
        expect(demoCursorTarget(CODEX_CURSOR_DEPART_MS - 1)).toBe('origin');
        expect(demoCursorTarget(CODEX_CURSOR_DEPART_MS)).toBe('codex-window');
        expect(demoCursorTarget(3_199)).toBe('codex-window');
        expect(demoCursorTarget(3_200)).toBe('input');
        expect(demoCursorTarget(5_049)).toBe('input');
        expect(demoCursorTarget(5_050)).toBe('send');
        expect(CODEX_LAUNCH_CLICK_MS - CODEX_CURSOR_DEPART_MS).toBeGreaterThanOrEqual(800);
        expect(CODEX_LAUNCH_OPEN_MS - CODEX_LAUNCH_CLICK_MS).toBe(180);
    });

    it('keeps the same Codex content visible throughout launch', () => {
        expect(codexLaunchState(CODEX_LAUNCH_OPEN_MS - 1, false)).toEqual({
            opening: false,
            contentVisible: true,
        });
        expect(codexLaunchState(CODEX_LAUNCH_OPEN_MS + 100, false)).toEqual({
            opening: true,
            contentVisible: true,
        });
    });
});

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
