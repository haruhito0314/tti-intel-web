import type { CSSProperties } from 'react';

/** Desktop-only breakpoint for Ch1 ambient float cards */
export const DESKTOP_FLOAT_CARDS_MQ = '(min-width: 769px)';

export const FLOAT_CARD_TILTS_DEG = [-3, 4, -2] as const;

export const FLOAT_CARD_PLACEMENTS = [
    { top: '9%', right: '6%', zIndex: 2 },
    { top: '31%', left: '2%', zIndex: 2 },
    { bottom: '19%', right: '8%', zIndex: 1 },
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
    if ('right' in placement && placement.right) style.right = placement.right;

    return style;
}

export function getFloatCardTransform(index: number): string {
    return `rotate(${getFloatCardTilt(index)}deg)`;
}
