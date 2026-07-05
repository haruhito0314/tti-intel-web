import { describe, expect, it } from 'vitest';
import {
    clampProgressToSingleChapterStep,
    getChapterIndexFromProgress,
} from './scrollChapterGuard';

describe('scrollChapterGuard', () => {
    it('maps progress to the latest chapter start', () => {
        expect(getChapterIndexFromProgress(0)).toBe(0);
        expect(getChapterIndexFromProgress(0.145)).toBe(0);
        expect(getChapterIndexFromProgress(0.147)).toBe(1);
        expect(getChapterIndexFromProgress(0.5)).toBe(2);
        expect(getChapterIndexFromProgress(0.51)).toBe(3);
    });

    it('allows progress within one chapter of the anchor', () => {
        expect(clampProgressToSingleChapterStep(0.2, 1)).toBe(0.2);
        expect(clampProgressToSingleChapterStep(0.47, 1)).toBe(0.47);
    });

    it('clamps fast forward jumps to the next chapter only', () => {
        expect(clampProgressToSingleChapterStep(0.57, 1)).toBe(0.498);
        expect(clampProgressToSingleChapterStep(0.92, 2)).toBe(0.563);
    });

    it('clamps fast backward jumps to the previous chapter only', () => {
        expect(clampProgressToSingleChapterStep(0.2, 3)).toBe(0.423);
        expect(clampProgressToSingleChapterStep(0.45, 4)).toBe(0.503);
    });
});
