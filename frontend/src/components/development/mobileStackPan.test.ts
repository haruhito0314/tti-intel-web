import { describe, expect, it } from 'vitest';
import {
    getMobileStackMaxPanOffset,
    getMobileStackPanProgress,
    getMobileStackStageOffset,
    getStackGridExitStart,
    MOBILE_STACK_TARGET_BOTTOM_FROM_TOP,
    MOBILE_GRID_MAX_CARDS,
    resolveStackGridLayout,
} from './chapterMotion';

describe('mobile stack pan', () => {
    it('targets the lower third of the viewport', () => {
        expect(MOBILE_STACK_TARGET_BOTTOM_FROM_TOP).toBeCloseTo(2 / 3);
        expect(getMobileStackMaxPanOffset(900, 400)).toBe(900 - 400 * (2 / 3));
        expect(getMobileStackMaxPanOffset(300, 400)).toBe(0);
    });

    it('ramps pan progress through the chapter hold window', () => {
        const cardCount = 12;
        const exitStart = getStackGridExitStart(cardCount, 'mobile-scroll');

        expect(getMobileStackPanProgress(0, cardCount, false, 'mobile-scroll')).toBe(0);
        expect(getMobileStackPanProgress(exitStart, cardCount, false, 'mobile-scroll')).toBe(1);
        expect(getMobileStackPanProgress(exitStart * 0.5, cardCount, false, 'mobile-scroll')).toBeGreaterThan(
            0,
        );
    });

    it('applies full offset in static mode', () => {
        expect(getMobileStackStageOffset(0, 12, true, 'mobile-scroll', 240)).toBe(240);
    });

    it('does not pan on desktop grid layout', () => {
        expect(getMobileStackStageOffset(1, 12, false, 'grid', 240)).toBe(0);
    });

    it('uses a 2-column grid for eight cards on mobile', () => {
        expect(MOBILE_GRID_MAX_CARDS).toBe(8);
        expect(resolveStackGridLayout(true, 8)).toBe('grid');
        expect(resolveStackGridLayout(true, 12)).toBe('mobile-scroll');
    });
});
