import { useEffect, useRef, useState, type RefObject } from 'react';
import {
    CHAPTER_COPY_ENTER_END,
    CHAPTER_COPY_ENTER_START,
    CHAPTER_COPY_EXIT_END,
    CHAPTER_COPY_EXIT_START,
    chapterExit,
    chapterReveal,
    getStackGridLocalProgress,
    STACK_GRID_SCENE_COUNTS,
    type StackGridLayout,
} from './chapterMotion';

/** Gap between chapters */
export const CHAPTER_GAP = 0.005;

/** Seven chapters — ch2/ch5 widened for slower card reveals */
export const SCENE_VISUAL_RANGES = [
    [0, 0.142],
    [0.147, 0.418],
    [0.423, 0.498],
    [0.503, 0.563],
    [0.568, 0.839],
    [0.844, 0.914],
    [0.919, 0.995],
] as const;

export const SCENE_COPY_RANGES = SCENE_VISUAL_RANGES;

export const SCENE_SCROLL_TARGETS = SCENE_COPY_RANGES.map(([start]) => start);

const FADE = 0.06;

/** Scene fade at range edges is disabled — chapter motion handles exit */
const NO_END_FADE_SCENE_INDICES = new Set([
    0,
    2,
    3,
    ...Object.keys(STACK_GRID_SCENE_COUNTS).map(Number),
    5,
]);

function clamp(value: number, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
}

function getSceneLayerOpacity(progress: number, sceneIndex: number): number {
    const [start, end] = SCENE_COPY_RANGES[sceneIndex];

    if (progress < start || progress > end) {
        return 0;
    }

    const span = end - start;
    const fadeSpan = Math.min(FADE, span * 0.1);
    let opacity = 1;
    const fadeInEnd = start + fadeSpan;
    const fadeOutStart = end - fadeSpan;

    if (sceneIndex > 0 && fadeSpan > 0 && progress < fadeInEnd) {
        opacity = (progress - start) / fadeSpan;
    }

    if (fadeSpan > 0 && progress > fadeOutStart && !NO_END_FADE_SCENE_INDICES.has(sceneIndex)) {
        opacity = Math.min(opacity, (end - progress) / fadeSpan);
    }

    return clamp(opacity);
}

export function getSceneVisualOpacity(progress: number, sceneIndex: number): number {
    return getSceneLayerOpacity(progress, sceneIndex);
}

export function getSceneCopyOpacity(progress: number, sceneIndex: number): number {
    return getSceneLayerOpacity(progress, sceneIndex);
}

export function getSceneCopyTransform(progress: number, sceneIndex: number): number {
    const opacity = getSceneCopyOpacity(progress, sceneIndex);
    if (opacity <= 0) return 0;

    const local = getSceneLocalProgress(progress, sceneIndex);
    const enter = chapterReveal(local, CHAPTER_COPY_ENTER_START, CHAPTER_COPY_ENTER_END);
    const exit = chapterExit(local, CHAPTER_COPY_EXIT_START, CHAPTER_COPY_EXIT_END);

    if (enter < 1) {
        return (1 - enter) * 32;
    }

    if (exit < 1) {
        return -(1 - exit) * 28;
    }

    return 0;
}

export function getSceneLocalProgress(progress: number, sceneIndex: number): number {
    const [start, end] = SCENE_VISUAL_RANGES[sceneIndex];
    if (progress < start) return 0;
    if (progress > end) return 1;
    if (end - start <= 0) return 0;
    return clamp((progress - start) / (end - start));
}

export function getStackSceneLocalProgress(
    progress: number,
    sceneIndex: number,
    layout: StackGridLayout = 'grid',
): number {
    return getStackGridLocalProgress(progress, sceneIndex, SCENE_VISUAL_RANGES[sceneIndex], layout);
}

export function getActiveSceneIndex(progress: number): number {
    for (let index = SCENE_COPY_RANGES.length - 1; index >= 0; index -= 1) {
        if (progress >= SCENE_COPY_RANGES[index][0]) return index;
    }
    return 0;
}

/** @deprecated use getSceneVisualOpacity */
export function getSceneOpacity(progress: number, sceneIndex: number): number {
    return getSceneVisualOpacity(progress, sceneIndex);
}

export function useScrollProgress(trackRef: RefObject<HTMLElement | null>) {
    const [progress, setProgress] = useState(0);
    const [reducedMotion, setReducedMotion] = useState(false);
    const rafRef = useRef(0);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReducedMotion(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const track = trackRef.current;
        if (!track || reducedMotion) return;

        const update = () => {
            const rect = track.getBoundingClientRect();
            const scrollable = track.offsetHeight - window.innerHeight;
            const scrolled = -rect.top;
            const next = scrollable > 0 ? clamp(scrolled / scrollable) : 0;
            setProgress(next);
            track.style.setProperty('--hero-progress', String(next));
        };

        const onScroll = () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            cancelAnimationFrame(rafRef.current);
        };
    }, [trackRef, reducedMotion]);

    return { progress, reducedMotion };
}
