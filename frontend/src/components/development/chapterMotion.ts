export function easeOutCubic(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - clamped, 3);
}

export function easeInOutCubic(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/** Map local chapter progress into a 0→1 reveal between start/end thresholds */
export function chapterReveal(local: number, start: number, end: number): number {
    if (local <= start) return 0;
    if (local >= end) return 1;
    return easeOutCubic((local - start) / (end - start));
}

/** Hold at 1 until exitStart, then fade out by exitEnd */
export function chapterExit(local: number, exitStart: number, exitEnd: number): number {
    if (local <= exitStart) return 1;
    if (local >= exitEnd) return 0;
    return 1 - easeInOutCubic((local - exitStart) / (exitEnd - exitStart));
}

/** Shared chapter timing — all scenes use the same window */
export const CHAPTER_VISUAL_REVEAL_START = 0.08;
export const CHAPTER_VISUAL_REVEAL_END = 0.36;
/** Local progress where chapter stays fully visible before exit scrubbing */
export const CHAPTER_FULL_HOLD_EXIT_START = 0.93;
export const CHAPTER_VISUAL_EXIT_START = CHAPTER_FULL_HOLD_EXIT_START;
export const CHAPTER_VISUAL_EXIT_END = 0.999;

export const CHAPTER_COPY_ENTER_START = 0.08;
export const CHAPTER_COPY_ENTER_END = 0.36;
export const CHAPTER_COPY_EXIT_START = CHAPTER_FULL_HOLD_EXIT_START;
export const CHAPTER_COPY_EXIT_END = 0.999;

export function getVisualChapterMotion(local: number, staticMode = false) {
    if (staticMode) {
        return { reveal: 1, exit: 1, combined: 1 };
    }
    const reveal = chapterReveal(local, CHAPTER_VISUAL_REVEAL_START, CHAPTER_VISUAL_REVEAL_END);
    const exit = chapterExit(local, CHAPTER_VISUAL_EXIT_START, CHAPTER_VISUAL_EXIT_END);
    return { reveal, exit, combined: reveal * exit };
}

/** Chapter 1 is visible at scroll start — only the exit window is shared */
export function getScene1VisualMotion(local: number, staticMode = false) {
    if (staticMode) {
        return { reveal: 1, exit: 1, combined: 1 };
    }
    const exit = chapterExit(local, CHAPTER_VISUAL_EXIT_START, CHAPTER_VISUAL_EXIT_END);
    return { reveal: 1, exit, combined: exit };
}

/** Final chapter stays visible through the end of the scroll track */
export function getFinalChapterVisualMotion(local: number, staticMode = false) {
    if (staticMode) {
        return { reveal: 1, exit: 1, combined: 1 };
    }
    const reveal = chapterReveal(local, CHAPTER_VISUAL_REVEAL_START, CHAPTER_VISUAL_REVEAL_END);
    return { reveal, exit: 1, combined: reveal };
}

/** Staggered enter for 4-column stack / tool grids (chapters 2 & 5) */
const STACK_GRID_ENTER_DURATION_SCALE = 1.75;

export const STACK_LAYER_ENTER_BASE = 0.03;
export const STACK_LAYER_CARD_SPAN = 0.17 * STACK_GRID_ENTER_DURATION_SCALE;
export const STACK_LAYER_STAGGER_ROW = 0.14 * STACK_GRID_ENTER_DURATION_SCALE;
export const STACK_LAYER_STAGGER_COL = 0.08 * STACK_GRID_ENTER_DURATION_SCALE;

/** Mobile: one card at a time, top → bottom while scrolling */
export const STACK_LAYER_MOBILE_STAGGER = 0.048 * STACK_GRID_ENTER_DURATION_SCALE;
export const STACK_LAYER_MOBILE_SPAN = 0.072 * STACK_GRID_ENTER_DURATION_SCALE;

export type StackGridLayout = 'grid' | 'mobile-scroll';

export function resolveStackGridLayout(mobileScroll: boolean): StackGridLayout {
    return mobileScroll ? 'mobile-scroll' : 'grid';
}

export function getStackLayerStagger(index: number, layout: StackGridLayout = 'grid'): number {
    if (layout === 'mobile-scroll') {
        return index * STACK_LAYER_MOBILE_STAGGER;
    }
    const row = Math.floor(index / 4);
    const col = index % 4;
    return row * STACK_LAYER_STAGGER_ROW + col * STACK_LAYER_STAGGER_COL;
}

export function getStackLayerCardSpan(layout: StackGridLayout = 'grid'): number {
    return layout === 'mobile-scroll' ? STACK_LAYER_MOBILE_SPAN : STACK_LAYER_CARD_SPAN;
}

export function getStackLayerEnterProgress(
    local: number,
    index: number,
    staticMode: boolean,
    layout: StackGridLayout = 'grid',
): number {
    if (staticMode) return 1;
    const stagger = getStackLayerStagger(index, layout);
    const span = getStackLayerCardSpan(layout);
    const revealStart = STACK_LAYER_ENTER_BASE + stagger;
    const revealEnd = revealStart + span;
    return chapterReveal(local, revealStart, revealEnd);
}

/** Hold after every card is visible, then exit with the same span + stagger as enter */
export const STACK_GRID_EXIT_HOLD = 0.28;

/** Extended local timeline — enter, hold, and exit all fit before the chapter ends */
export function getStackGridTimelineEnd(cardCount: number, layout: StackGridLayout = 'grid'): number {
    const lastStagger = getStackLayerStagger(cardCount - 1, layout);
    const span = getStackLayerCardSpan(layout);
    return (
        STACK_LAYER_ENTER_BASE +
        lastStagger +
        span +
        STACK_GRID_EXIT_HOLD +
        lastStagger +
        span
    );
}

export const STACK_GRID_SCENE_COUNTS: Record<number, number> = {
    1: 12,
    4: 8,
};

/** Chapter 6 — 2×2 workflow grid with curved connector to step 3 */
const WORKFLOW_STEP_STARTS = [0.06, 0.24, 0.48, 0.66] as const;
const WORKFLOW_STEP_SPAN = 0.11;
const WORKFLOW_ARROW_STARTS = [0.16, 0.34, 0.58] as const;
const WORKFLOW_ARROW_SPANS = [0.09, 0.42, 0.09] as const;
const WORKFLOW_FULL_HOLD_EXIT_START = 0.975;

export function getWorkflowStepEnter(local: number, index: number, staticMode: boolean): number {
    if (staticMode) return 1;
    const start = WORKFLOW_STEP_STARTS[index] ?? WORKFLOW_STEP_STARTS[0];
    return chapterReveal(local, start, start + WORKFLOW_STEP_SPAN);
}

export function getWorkflowArrowReveal(local: number, index: number, staticMode: boolean): number {
    if (staticMode) return 1;
    const start = WORKFLOW_ARROW_STARTS[index] ?? WORKFLOW_ARROW_STARTS[0];
    const span = WORKFLOW_ARROW_SPANS[index] ?? WORKFLOW_ARROW_SPANS[0];
    return chapterReveal(local, start, start + span);
}

export function getWorkflowSceneExit(local: number, staticMode: boolean): number {
    if (staticMode) return 1;
    return chapterExit(local, WORKFLOW_FULL_HOLD_EXIT_START, 0.995);
}

/** Scene wrapper — hold through step 4, then fade near chapter end */
export function getWorkflowSceneMotion(local: number, staticMode = false) {
    if (staticMode) {
        return { reveal: 1, exit: 1, combined: 1 };
    }
    const reveal = chapterReveal(local, CHAPTER_VISUAL_REVEAL_START, CHAPTER_VISUAL_REVEAL_END);
    const exit = chapterExit(local, 0.985, 0.999);
    return { reveal, exit, combined: reveal * exit };
}

function getWorkflowStepEnterTransform(_index: number, enter: number): string {
    const offset = (1 - enter) * 20;
    return enter >= 0.999 ? 'none' : `translateY(${offset}px)`;
}

export function getWorkflowStepMotion(local: number, index: number, staticMode: boolean) {
    if (staticMode) {
        return { opacity: 1, transform: 'translateX(0) translateY(0) scale(1)' };
    }

    const enter = getWorkflowStepEnter(local, index, staticMode);
    const exit = getWorkflowSceneExit(local, staticMode);

    return {
        opacity: enter * exit,
        transform: getWorkflowStepEnterTransform(index, enter),
    };
}

export function getWorkflowArrowMotion(local: number, index: number, staticMode: boolean) {
    if (staticMode) {
        return { progress: 1, opacity: 1, headShift: 0 };
    }

    const reveal = getWorkflowArrowReveal(local, index, staticMode);
    const exit = getWorkflowSceneExit(local, staticMode);

    return {
        progress: reveal,
        opacity: reveal * exit,
        headShift: (1 - reveal) * 10,
    };
}

/** Curved connector from top row down to step 3 (arrow index 1) */
export function getWorkflowCurveMotion(local: number, staticMode: boolean) {
    if (staticMode) {
        return { progress: 1, opacity: 1 };
    }

    const reveal = getWorkflowArrowReveal(local, 1, staticMode);
    const exit = getWorkflowSceneExit(local, staticMode);

    return {
        progress: reveal,
        opacity: reveal * exit,
    };
}

/** Map scroll progress to extended local time for stack-grid chapters */
export function getStackGridLocalProgress(
    progress: number,
    sceneIndex: number,
    range: readonly [number, number],
    layout: StackGridLayout = 'grid',
): number {
    const [start, end] = range;
    const cardCount = STACK_GRID_SCENE_COUNTS[sceneIndex] ?? 0;
    const timeline = getStackGridTimelineEnd(cardCount, layout);

    if (progress <= start) return 0;
    if (progress >= end) return timeline;

    return ((progress - start) / (end - start)) * timeline;
}

/** Local progress when the last card finishes entering */
export function getStackGridEnterCompleteLocal(cardCount: number, layout: StackGridLayout = 'grid'): number {
    const lastStagger = getStackLayerStagger(cardCount - 1, layout);
    return STACK_LAYER_ENTER_BASE + lastStagger + getStackLayerCardSpan(layout);
}

/** First card begins exiting after every card is visible + hold */
export function getStackGridExitStart(cardCount: number, layout: StackGridLayout = 'grid'): number {
    return getStackGridEnterCompleteLocal(cardCount, layout) + STACK_GRID_EXIT_HOLD;
}

export function getStackGridExitCompleteLocal(cardCount: number, layout: StackGridLayout = 'grid'): number {
    return getStackGridTimelineEnd(cardCount, layout);
}

/** Per-card exit progress scrubbed to scroll (0 = gone, 1 = visible) */
export function getStackLayerExitProgress(
    local: number,
    index: number,
    cardCount: number,
    staticMode: boolean,
    layout: StackGridLayout = 'grid',
): number {
    if (staticMode) return 1;
    const stagger = getStackLayerStagger(index, layout);
    const span = getStackLayerCardSpan(layout);
    const exitStart = getStackGridExitStart(cardCount, layout) + stagger;
    const exitEnd = exitStart + span;
    return chapterExit(local, exitStart, exitEnd);
}

/** Scroll-scrubbed card motion for chapters 2 & 5 */
export function getStackGridLayerMotion(
    local: number,
    index: number,
    cardCount: number,
    staticMode: boolean,
    layout: StackGridLayout = 'grid',
) {
    if (staticMode) {
        return { opacity: 1, transform: 'translateX(0) translateY(0) rotate(0deg) scale(1)' };
    }

    if (layout === 'mobile-scroll') {
        const enter = getStackLayerEnterProgress(local, index, staticMode, layout);
        const exit = getStackLayerExitProgress(local, index, cardCount, staticMode, layout);
        const enterY = (1 - enter) * 40;
        return {
            opacity: enter * exit,
            transform: enter >= 0.999 && exit >= 0.999 ? 'none' : `translateY(${enterY}px)`,
        };
    }

    const enter = getStackLayerEnterProgress(local, index, staticMode, layout);
    const exit = getStackLayerExitProgress(local, index, cardCount, staticMode, layout);
    const enterOffset = (1 - enter) * 24;
    const fadeY = (1 - exit) * -10;

    if (enter >= 0.999 && exit >= 0.999) {
        return { opacity: 1, transform: 'none' };
    }
    return {
        opacity: enter * exit,
        transform: `translateY(${enterOffset + fadeY}px)`,
    };
}

/** Bottom edge of last card targets this fraction of viewport height from the top (≈ lower third) */
export const MOBILE_STACK_TARGET_BOTTOM_FROM_TOP = 2 / 3;

export function getMobileStackPanProgress(
    local: number,
    cardCount: number,
    staticMode: boolean,
    layout: StackGridLayout = 'grid',
): number {
    if (staticMode || layout !== 'mobile-scroll') return staticMode ? 1 : 0;

    const panStart = STACK_LAYER_ENTER_BASE;
    const panEnd = getStackGridExitStart(cardCount, layout);
    if (local <= panStart) return 0;
    if (local >= panEnd) return 1;
    return easeInOutCubic((local - panStart) / (panEnd - panStart));
}

export function getMobileStackMaxPanOffset(stageHeight: number, viewportHeight: number): number {
    if (stageHeight <= 0 || viewportHeight <= 0) return 0;
    if (stageHeight <= viewportHeight) return 0;
    const targetBottom = viewportHeight * MOBILE_STACK_TARGET_BOTTOM_FROM_TOP;
    return Math.max(0, stageHeight - targetBottom);
}

export function getMobileStackStageOffset(
    local: number,
    cardCount: number,
    staticMode: boolean,
    layout: StackGridLayout,
    maxOffsetPx: number,
): number {
    if (layout !== 'mobile-scroll') return 0;
    if (staticMode) return maxOffsetPx;
    return getMobileStackPanProgress(local, cardCount, staticMode, layout) * maxOffsetPx;
}

export function stackGridSceneVisible(
    local: number,
    cardCount: number,
    staticMode: boolean,
    layout: StackGridLayout = 'grid',
): boolean {
    if (staticMode) return true;
    return local < getStackGridExitCompleteLocal(cardCount, layout);
}
