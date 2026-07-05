import type { CSSProperties } from 'react';
import { CHAPTER_ENTER_END, getChapterEnterEnd } from './devScrollConfig';

/** Chapter-local progress past enter — hold phase uses frozen final layout */
export function isSectionEnterComplete(local: number, chapterIndex?: number): boolean {
    const enterEnd = chapterIndex !== undefined ? getChapterEnterEnd(chapterIndex) : CHAPTER_ENTER_END;
    return local >= enterEnd;
}

/** Opacity-only chapter layer — never transform the scene shell */
export function chapterShellStyle(opacity: number): CSSProperties {
    return {
        opacity,
        visibility: opacity > 0.04 ? 'visible' : 'hidden',
        pointerEvents: opacity > 0.5 ? 'auto' : 'none',
    };
}

export function enterSlideY(
    reveal: number,
    distance: number,
): Pick<CSSProperties, 'opacity' | 'transform'> {
    if (reveal >= 1) {
        return { opacity: 1, transform: 'translateY(0px)' };
    }
    return {
        opacity: reveal,
        transform: `translateY(${Math.round((1 - reveal) * distance)}px)`,
    };
}

export function enterSlideYWithRotate(
    reveal: number,
    distance: number,
    rotateDeg: number,
    opacityScale = 1,
): Pick<CSSProperties, 'opacity' | 'transform'> {
    const rotate = `rotate(${rotateDeg}deg)`;
    if (reveal >= 1) {
        return { opacity: opacityScale, transform: rotate };
    }
    return {
        opacity: reveal * opacityScale,
        transform: `translateY(${Math.round((1 - reveal) * distance)}px) ${rotate}`,
    };
}

export function stackCardMotionStyle(
    enter: number,
    exitProgress: number,
    distance = 22,
): Pick<CSSProperties, 'opacity' | 'transform'> {
    const opacity = Math.min(enter, exitProgress);

    if (exitProgress < 1) {
        const exitT = 1 - exitProgress;
        return {
            opacity,
            transform: `translateY(${Math.round(-exitT * distance)}px)`,
        };
    }

    return enterSlideY(enter, distance);
}

export function enterTranslateX(reveal: number, distance: number): string {
    if (reveal >= 1) return `translateX(${distance}px)`;
    return `translateX(${Math.round(reveal * distance)}px)`;
}
