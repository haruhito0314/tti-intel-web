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
import { SCENE_VISUAL_RANGES } from './sceneScrollRanges';
import {
    clampProgressToSingleChapterStep,
    getChapterIndexFromProgress,
    getTrackProgress,
    getTrackScrollTop,
    MOBILE_SCROLL_GUARD_MQ,
    SCROLL_GESTURE_END_MS,
} from './scrollChapterGuard';

export { SCENE_VISUAL_RANGES };

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
    const [start, end] = SCENE_VISUAL_RANGES[sceneIndex];

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

export function useScrollProgress(trackRef: RefObject<HTMLElement | null>) {
    const [progress, setProgress] = useState(0);
    const [reducedMotion, setReducedMotion] = useState(false);
    const rafRef = useRef(0);
    const mobileGuardRef = useRef(false);
    const anchorChapterRef = useRef(0);
    const lastProgressRef = useRef(0);
    const isAdjustingScrollRef = useRef(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReducedMotion(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const mobileMq = window.matchMedia(MOBILE_SCROLL_GUARD_MQ);
        const syncMobile = () => {
            mobileGuardRef.current = mobileMq.matches;
        };
        syncMobile();
        mobileMq.addEventListener('change', syncMobile);
        return () => mobileMq.removeEventListener('change', syncMobile);
    }, []);

    useEffect(() => {
        const track = trackRef.current;
        if (!track || reducedMotion) return;

        const finishGesture = () => {
            anchorChapterRef.current = getChapterIndexFromProgress(lastProgressRef.current);
        };

        const update = () => {
            if (isAdjustingScrollRef.current) return;

            const raw = getTrackProgress(track);
            const next = mobileGuardRef.current
                ? clampProgressToSingleChapterStep(raw, anchorChapterRef.current)
                : raw;

            if (mobileGuardRef.current && Math.abs(next - raw) > 0.0005) {
                isAdjustingScrollRef.current = true;
                window.scrollTo({ top: getTrackScrollTop(track, next), behavior: 'auto' });
                requestAnimationFrame(() => {
                    isAdjustingScrollRef.current = false;
                });
            }

            lastProgressRef.current = next;
            setProgress(next);
        };

        const onScroll = () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(update);
        };

        let gestureEndTimer = 0;
        const onScrollWithGestureEnd = () => {
            onScroll();
            window.clearTimeout(gestureEndTimer);
            gestureEndTimer = window.setTimeout(finishGesture, SCROLL_GESTURE_END_MS);
        };

        const onTouchStart = () => {
            if (!mobileGuardRef.current) return;
            anchorChapterRef.current = getChapterIndexFromProgress(lastProgressRef.current);
        };

        update();
        anchorChapterRef.current = getChapterIndexFromProgress(lastProgressRef.current);
        track.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('scroll', onScrollWithGestureEnd, { passive: true });
        window.addEventListener('scrollend', finishGesture, { passive: true });
        window.addEventListener('resize', onScrollWithGestureEnd, { passive: true });

        return () => {
            track.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('scroll', onScrollWithGestureEnd);
            window.removeEventListener('scrollend', finishGesture);
            window.removeEventListener('resize', onScrollWithGestureEnd);
            window.clearTimeout(gestureEndTimer);
            cancelAnimationFrame(rafRef.current);
        };
    }, [trackRef, reducedMotion]);

    return { progress, reducedMotion };
}
