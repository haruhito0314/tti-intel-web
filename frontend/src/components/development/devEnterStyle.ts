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
    scaleFrom = 1,
): Pick<CSSProperties, 'opacity' | 'transform'> {
    if (reveal >= 1) {
        return { opacity: 1, transform: scaleFrom === 1 ? 'translateY(0px)' : 'translateY(0px) scale(1)' };
    }
    const scale =
        scaleFrom === 1 ? 1 : scaleFrom + (1 - scaleFrom) * reveal;
    const translate = `translateY(${Math.round((1 - reveal) * distance)}px)`;
    return {
        opacity: reveal,
        transform: scaleFrom === 1 ? translate : `${translate} scale(${scale.toFixed(4)})`,
    };
}

export function enterSlideYWithRotate(
    reveal: number,
    distance: number,
    rotateDeg: number,
    opacityScale = 1,
    scaleFrom = 0.94,
): Pick<CSSProperties, 'opacity' | 'transform'> {
    const rotate = `rotate(${rotateDeg}deg)`;
    if (reveal >= 1) {
        return { opacity: opacityScale, transform: `scale(1) ${rotate}` };
    }
    const scale = scaleFrom + (1 - scaleFrom) * reveal;
    return {
        opacity: reveal * opacityScale,
        transform: `translateY(${Math.round((1 - reveal) * distance)}px) scale(${scale.toFixed(4)}) ${rotate}`,
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
            transform: `translateY(${Math.round(-exitT * distance)}px) scale(${(1 - exitT * 0.03).toFixed(4)})`,
        };
    }

    return enterSlideY(enter, distance, 0.96);
}

export function enterTranslateX(reveal: number, distance: number): string {
    if (reveal >= 1) return `translateX(${distance}px)`;
    return `translateX(${Math.round(reveal * distance)}px)`;
}
