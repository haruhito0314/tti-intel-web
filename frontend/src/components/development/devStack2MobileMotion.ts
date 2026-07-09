import { useLayoutEffect, useState, type RefObject } from 'react';
import { STACK_CARD_SPAN, stackCardEnterStart } from './devSceneMotion';
import { reveal } from './devScrollMath';

const STACK2_MOBILE_COLS = 2;
const STACK2_TARGET_BOTTOM_RATIO = 2 / 3;
const STACK2_PAN_START = 0.18;
const STACK2_PAN_END = 0.9;
const STACK2_VISIBLE_ROWS = 2;
const STACK2_MOBILE_EXIT_START = 0.72;
const STACK2_MOBILE_EXIT_STAGGER = 0.016;
const STACK2_MOBILE_EXIT_SPAN = 0.042;

export function isStack2MobileGridChapter(chapterIndex?: number, mobileLayout = false): boolean {
    return chapterIndex === 1 && mobileLayout;
}

export function stack2MobileExitCompleteLocal(cardCount: number): number {
    return (
        STACK2_MOBILE_EXIT_START +
        Math.max(0, cardCount - 1) * STACK2_MOBILE_EXIT_STAGGER +
        STACK2_MOBILE_EXIT_SPAN
    );
}

export function stack2MobileShellFadeEndLocal(cardCount: number): number {
    return Math.min(1, stack2MobileExitCompleteLocal(cardCount) + 0.05);
}

export type Stack2MobileMetrics = {
    contentH: number;
    scrollTopInStage: number;
    stageH: number;
    viewportH: number;
};

export function stack2MobileScrollProgress(local: number): number {
    return reveal(local, STACK2_PAN_START, STACK2_PAN_END);
}

/** Last row settles ~⅓ from the bottom of the stage as scroll progresses */
export function computeStack2MobileTranslateY(
    local: number,
    metrics: Stack2MobileMetrics,
): number {
    const { contentH, scrollTopInStage, stageH } = metrics;
    if (contentH < 1 || stageH < 1) return 0;

    const t = stack2MobileScrollProgress(local);
    const targetBottom = stageH * STACK2_TARGET_BOTTOM_RATIO;
    const endY = targetBottom - scrollTopInStage - contentH;

    if (endY >= 0) return 0;
    return endY * t;
}

/**
 * Mobile ch2 — top rows enter in place; lower rows reveal in sync with upward pan.
 */
export function stack2MobileCardReveal(local: number, index: number, cardCount: number): number {
    const columns = STACK2_MOBILE_COLS;
    const row = Math.floor(index / columns);
    const rowCount = Math.ceil(cardCount / columns);

    if (row < STACK2_VISIBLE_ROWS) {
        const start = stackCardEnterStart(index, columns);
        return reveal(local, start, start + STACK_CARD_SPAN);
    }

    const panT = stack2MobileScrollProgress(local);
    const panRow = row - STACK2_VISIBLE_ROWS;
    const panRowCount = Math.max(1, rowCount - STACK2_VISIBLE_ROWS);
    const slot = 1 / panRowCount;
    const colDelay = (index % columns) * slot * 0.12;
    const start = panRow * slot + colDelay;
    const end = Math.min(1, start + slot * 0.82);

    return reveal(panT, start, end);
}

/** Mobile ch2 — cards exit one-by-one, all hidden before chapter transition */
export function stack2MobileCardExit(local: number, index: number): number {
    const start = STACK2_MOBILE_EXIT_START + index * STACK2_MOBILE_EXIT_STAGGER;
    const end = start + STACK2_MOBILE_EXIT_SPAN;
    if (local <= start) return 1;
    if (local >= end) return 0;
    return 1 - reveal(local, start, end);
}

export function useStack2MobileMetrics(
    enabled: boolean,
    scrollRef: RefObject<HTMLDivElement | null>,
    contentRef: RefObject<HTMLDivElement | null>,
): Stack2MobileMetrics {
    const [metrics, setMetrics] = useState<Stack2MobileMetrics>({
        contentH: 0,
        scrollTopInStage: 0,
        stageH: 0,
        viewportH: 0,
    });

    useLayoutEffect(() => {
        if (!enabled) return;

        const scroll = scrollRef.current;
        const content = contentRef.current;
        if (!scroll || !content) return;

        const sync = () => {
            const stage = scroll.closest('.dev-hero-stage') as HTMLElement | null;
            if (!stage) return;

            const stageRect = stage.getBoundingClientRect();
            const scrollRect = scroll.getBoundingClientRect();
            const contentH = content.offsetHeight;
            const viewportH = scroll.clientHeight;
            if (stageRect.height < 1 || contentH < 1) return;

            setMetrics({
                contentH,
                scrollTopInStage: scrollRect.top - stageRect.top,
                stageH: stageRect.height,
                viewportH,
            });
        };

        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(scroll);
        observer.observe(content);
        const stage = scroll.closest('.dev-hero-stage');
        if (stage) observer.observe(stage);
        window.addEventListener('resize', sync);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', sync);
        };
    }, [enabled, scrollRef, contentRef]);

    return metrics;
}
