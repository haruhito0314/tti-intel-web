import { describe, expect, it } from 'vitest';
import { stack2DesktopCardExit } from './devSceneMotion';

describe('development scene motion pacing', () => {
    it('finishes the section 2 desktop card exit before the chapter changes', () => {
        const cardCount = 12;

        for (let index = 0; index < cardCount; index += 1) {
            expect(stack2DesktopCardExit(0.99, index, cardCount, 4)).toBe(0);
        }
    });

    it('keeps the section 2 desktop exit stagger readable instead of removing all cards at once', () => {
        const cardCount = 12;

        expect(stack2DesktopCardExit(0.72, 0, cardCount, 4)).toBe(0);
        expect(stack2DesktopCardExit(0.72, cardCount - 1, cardCount, 4)).toBe(1);
    });
});
