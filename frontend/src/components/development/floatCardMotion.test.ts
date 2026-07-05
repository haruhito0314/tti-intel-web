import { describe, expect, it } from 'vitest';
import { AI_FLOAT_CARDS } from './sceneUtils';
import {
    DESKTOP_FLOAT_CARDS_MQ,
    FLOAT_CARD_PLACEMENTS,
    FLOAT_CARD_TILTS_DEG,
    getFloatCardBob,
    getFloatCardPlacementStyle,
    getFloatCardTilt,
    getFloatCardTransform,
    isFloatCardCentered,
} from './floatCardMotion';

describe('floatCardMotion', () => {
    it('uses a desktop-only media query breakpoint', () => {
        expect(DESKTOP_FLOAT_CARDS_MQ).toBe('(min-width: 769px)');
    });

    it('scatters cards off the centered terminal', () => {
        expect(FLOAT_CARD_PLACEMENTS).toHaveLength(AI_FLOAT_CARDS.length);
        for (let index = 0; index < AI_FLOAT_CARDS.length; index++) {
            expect(isFloatCardCentered(index)).toBe(false);
        }
    });

    it('uses the original fixed tilts', () => {
        expect(FLOAT_CARD_TILTS_DEG).toEqual([-3, 4, -2]);
        expect(getFloatCardTilt(0)).toBe(-3);
        expect(getFloatCardTilt(1)).toBe(4);
        expect(getFloatCardTilt(2)).toBe(-2);
    });

    it('uses vertical bob and scroll drift without horizontal offset', () => {
        const bob = getFloatCardBob(0.5, 1, false);
        const transform = getFloatCardTransform(bob, 8);

        expect(bob.x).toBe(0);
        expect(transform).toMatch(/^translateY\(.+px\) rotate\(4deg\)$/);
        expect(transform).not.toContain('translateX');

        const drift = getFloatCardBob(1, 2, false);
        expect(drift.y).toBeLessThan(getFloatCardBob(0, 2, false).y);
    });

    it('includes the Codex test prompt on the third card', () => {
        expect(AI_FLOAT_CARDS[2]?.prompt).toBe('> テストを書いて');
        expect(getFloatCardPlacementStyle(2).right).toBe('8%');
        expect(getFloatCardPlacementStyle(2).bottom).toBe('19%');
    });
});
