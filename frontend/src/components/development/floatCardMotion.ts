import type { CSSProperties } from 'react';

/** Desktop-only — needs side gutters around the centered terminal */
export const DESKTOP_FLOAT_CARDS_MQ = '(min-width: 1024px)';

export const FLOAT_CARD_TILTS_DEG = [-3, 4, -2] as const;

/**
 * Anchor cards outside the centered terminal column (max 760px).
 * 50% ± 390px clears the terminal edge with a small gap.
 */
export const FLOAT_CARD_PLACEMENTS = [
    { top: '2%', left: 'calc(50% + min(390px, 47vw) + 0.65rem)', zIndex: 2 },
    { top: '44%', left: 'max(0.5rem, calc(50% - min(390px, 47vw) - 10.25rem))', zIndex: 2 },
    { bottom: '4%', left: 'calc(50% + min(390px, 47vw) + 0.65rem)', zIndex: 1 },
] as const;

export function getFloatCardTilt(index: number): number {
    return FLOAT_CARD_TILTS_DEG[index] ?? 0;
}

export function getFloatCardPlacementStyle(index: number): CSSProperties {
    const placement = FLOAT_CARD_PLACEMENTS[index];
    if (!placement) return {};

    const style: CSSProperties = { zIndex: placement.zIndex };

    if ('top' in placement && placement.top) style.top = placement.top;
    if ('bottom' in placement && placement.bottom) style.bottom = placement.bottom;
    if ('left' in placement && placement.left) style.left = placement.left;
    if ('right' in placement && (placement as { right?: string }).right) {
        style.right = (placement as { right?: string }).right;
    }

    return style;
}

export function getFloatCardTransform(index: number): string {
    return `rotate(${getFloatCardTilt(index)}deg)`;
}
