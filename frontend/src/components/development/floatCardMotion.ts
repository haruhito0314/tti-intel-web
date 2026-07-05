import type { CSSProperties } from 'react';

/** Desktop-only breakpoint for Ch1 ambient float cards */
export const DESKTOP_FLOAT_CARDS_MQ = '(min-width: 769px)';

/** Original fixed tilts per card */
export const FLOAT_CARD_TILTS_DEG = [-3, 4, -2] as const;

const FLOAT_BOB_AMPLITUDE_PX = 5;
const FLOAT_DRIFT_BASE_PX = 10;
const FLOAT_DRIFT_STEP_PX = 4;

/** Fixed scatter — stays off the centered terminal */
export const FLOAT_CARD_PLACEMENTS = [
    { top: '9%', right: '6%', zIndex: 2 },
    { top: '31%', left: '2%', zIndex: 2 },
    { bottom: '19%', right: '8%', zIndex: 1 },
] as const;

export type FloatCardBob = { x: number; y: number; rotate: number };

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

export function isFloatCardCentered(index: number): boolean {
    const style = getFloatCardPlacementStyle(index);
    return style.left === '50%' || style.right === '50%';
}

/** Original Ch1 motion — vertical bob + scroll-linked drift, fixed tilt */
export function getFloatCardBob(local: number, index: number, staticMode: boolean): FloatCardBob {
    const tilt = getFloatCardTilt(index);
    if (staticMode) {
        return { x: 0, y: 0, rotate: tilt };
    }

    const bob = Math.sin(local * Math.PI * 2 + index * 1.2) * FLOAT_BOB_AMPLITUDE_PX;
    const drift = -local * (FLOAT_DRIFT_BASE_PX + index * FLOAT_DRIFT_STEP_PX);

    return { x: 0, y: bob + drift, rotate: tilt };
}

export function getFloatCardTransform(bob: FloatCardBob, enterY: number): string {
    return `translateY(${bob.y + enterY}px) rotate(${bob.rotate}deg)`;
}
