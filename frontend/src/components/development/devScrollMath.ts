import { CHAPTER_BOUNDARY_FADE, SCENE_RANGES } from './devScrollConfig';

export const PROGRESS_QUANTUM = 1 / 1024;

export function quantizeProgress(value: number): number {
    return Math.round(value / PROGRESS_QUANTUM) * PROGRESS_QUANTUM;
}

export function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function easeOutCubic(t: number): number {
    const c = clamp01(t);
    return 1 - (1 - c) ** 3;
}

/** Map chapter-local progress into 0→1 between thresholds */
export function reveal(local: number, start: number, end: number): number {
    if (local <= start) return 0;
    if (local >= end) return 1;
    return easeOutCubic((local - start) / (end - start));
}

/** Map chapter-local progress into 1→0 between thresholds */
export function exit(local: number, start: number, end: number): number {
    if (local <= start) return 1;
    if (local >= end) return 0;
    return 1 - easeOutCubic((local - start) / (end - start));
}

/** Freeze local after enter completes — prevents hold-phase jitter */
export function freezeAfterEnter(local: number, enterEnd: number): number {
    return Math.min(local, enterEnd);
}

export function getChapterIndex(progress: number): number {
    for (let i = SCENE_RANGES.length - 1; i >= 0; i -= 1) {
        if (progress >= SCENE_RANGES[i][0]) return i;
    }
    return 0;
}

export function getChapterLocal(progress: number, chapterIndex: number): number {
    const [start, end] = SCENE_RANGES[chapterIndex];
    if (progress <= start) return 0;
    if (progress >= end) return 1;
    return (progress - start) / (end - start);
}

export function getChapterOpacity(progress: number, chapterIndex: number): number {
    const [start, end] = SCENE_RANGES[chapterIndex];
    const isLast = chapterIndex === SCENE_RANGES.length - 1;
    const fade = CHAPTER_BOUNDARY_FADE;

    if (progress < start) return 0;
    if (!isLast && progress >= end) return 0;

    if (chapterIndex > 0 && progress < start + fade) {
        return clamp01((progress - start) / fade);
    }

    if (!isLast && progress > end - fade) {
        return clamp01((end - progress) / fade);
    }

    return 1;
}

export function getTrackProgress(track: HTMLElement): number {
    const viewport = document.documentElement.clientHeight;
    const scrollable = Math.max(track.offsetHeight - viewport, 0);
    if (scrollable <= 0) return 0;
    const scrolled = Math.max(0, Math.round(-track.getBoundingClientRect().top));
    return clamp01(scrolled / scrollable);
}
