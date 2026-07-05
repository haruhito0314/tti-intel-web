import { describe, expect, it } from 'vitest';
import { AI_FLOAT_CARDS } from './sceneUtils';
import {
    DESKTOP_FLOAT_CARDS_MQ,
    FLOAT_CARD_PLACEMENTS,
    FLOAT_CARD_TILTS_DEG,
    getFloatCardPlacementStyle,
    getFloatCardTilt,
    getFloatCardTransform,
} from './floatCardMotion';

describe('floatCardMotion', () => {
    it('uses a desktop-only media query breakpoint', () => {
        expect(DESKTOP_FLOAT_CARDS_MQ).toBe('(min-width: 769px)');
    });

    it('scatters cards off the centered terminal', () => {
        expect(FLOAT_CARD_PLACEMENTS).toHaveLength(AI_FLOAT_CARDS.length);
        for (let index = 0; index < AI_FLOAT_CARDS.length; index++) {
            const style = getFloatCardPlacementStyle(index);
            expect(style.left === '50%' || style.right === '50%').toBe(false);
        }
    });

    it('uses fixed tilts per card', () => {
        expect(FLOAT_CARD_TILTS_DEG).toEqual([-3, 4, -2]);
        expect(getFloatCardTilt(0)).toBe(-3);
        expect(getFloatCardTransform(1)).toBe('rotate(4deg)');
    });

    it('includes the Codex test prompt on the third card', () => {
        expect(AI_FLOAT_CARDS[2]?.prompt).toBe('> テストを書いて');
        expect(getFloatCardPlacementStyle(2).right).toBe('8%');
        expect(getFloatCardPlacementStyle(2).bottom).toBe('19%');
    });
});
