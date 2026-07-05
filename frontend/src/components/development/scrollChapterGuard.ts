import { SCENE_VISUAL_RANGES } from './sceneScrollRanges';

/** Match the mobile dev-hero track breakpoint */
export const MOBILE_SCROLL_GUARD_MQ = '(max-width: 768px)';

/** Idle time after the last scroll event before a gesture is considered finished */
export const SCROLL_GESTURE_END_MS = 180;

export function getChapterIndexFromProgress(progress: number): number {
    for (let index = SCENE_VISUAL_RANGES.length - 1; index >= 0; index -= 1) {
        if (progress >= SCENE_VISUAL_RANGES[index][0]) return index;
    }
    return 0;
}

/** Limit fast momentum scroll to at most one chapter away from the gesture anchor */
export function clampProgressToSingleChapterStep(progress: number, anchorChapter: number): number {
    const minChapter = Math.max(0, anchorChapter - 1);
    const maxChapter = SCENE_VISUAL_RANGES.length - 1;
    const maxAllowedChapter = Math.min(maxChapter, anchorChapter + 1);
    const chapter = getChapterIndexFromProgress(progress);

    if (chapter >= minChapter && chapter <= maxAllowedChapter) {
        return progress;
    }

    if (chapter > maxAllowedChapter) {
        return SCENE_VISUAL_RANGES[maxAllowedChapter][1];
    }

    return SCENE_VISUAL_RANGES[minChapter][0];
}

export function getTrackScrollTop(track: HTMLElement, progress: number): number {
    const scrollable = track.offsetHeight - window.innerHeight;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    return trackTop + progress * Math.max(scrollable, 0);
}

export function getTrackProgress(track: HTMLElement): number {
    const scrollable = track.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    const scrolled = -track.getBoundingClientRect().top;
    return Math.max(0, Math.min(1, scrolled / scrollable));
}
