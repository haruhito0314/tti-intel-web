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
export const CHAPTER_VISUAL_EXIT_START = 0.93;
export const CHAPTER_VISUAL_EXIT_END = 0.999;

export const CHAPTER_COPY_ENTER_START = 0.08;
export const CHAPTER_COPY_ENTER_END = 0.36;
export const CHAPTER_COPY_EXIT_START = 0.93;
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
export const STACK_LAYER_ENTER_BASE = 0.03;
export const STACK_LAYER_CARD_SPAN = 0.17;
export const STACK_LAYER_STAGGER_ROW = 0.14;
export const STACK_LAYER_STAGGER_COL = 0.08;

export function getStackLayerStagger(index: number): number {
    const row = Math.floor(index / 4);
    const col = index % 4;
    return row * STACK_LAYER_STAGGER_ROW + col * STACK_LAYER_STAGGER_COL;
}

export function getStackLayerEnterProgress(local: number, index: number, staticMode: boolean): number {
    if (staticMode) return 1;
    const stagger = getStackLayerStagger(index);
    const revealStart = STACK_LAYER_ENTER_BASE + stagger;
    const revealEnd = revealStart + STACK_LAYER_CARD_SPAN;
    return chapterReveal(local, revealStart, revealEnd);
}

/** Hold after every card is visible, then exit with the same span + stagger as enter */
export const STACK_GRID_EXIT_HOLD = 0.1;

export type StackGridExitStyle = 'scatter' | 'sequential';

/** Extended local timeline — enter, hold, and exit all fit before the chapter ends */
export function getStackGridTimelineEnd(cardCount: number): number {
    const lastStagger = getStackLayerStagger(cardCount - 1);
    return (
        STACK_LAYER_ENTER_BASE +
        lastStagger +
        STACK_LAYER_CARD_SPAN +
        STACK_GRID_EXIT_HOLD +
        lastStagger +
        STACK_LAYER_CARD_SPAN
    );
}

export const STACK_GRID_SCENE_COUNTS: Record<number, number> = {
    1: 12,
    4: 8,
};

/** Chapter 6 — 2×2 workflow grid with curved connector to step 3 */
export const WORKFLOW_STEP_COUNT = 4;

const WORKFLOW_STEP_STARTS = [0.06, 0.24, 0.48, 0.66] as const;
const WORKFLOW_STEP_SPAN = 0.11;
const WORKFLOW_ARROW_STARTS = [0.16, 0.36, 0.58] as const;
const WORKFLOW_ARROW_SPANS = [0.09, 0.16, 0.09] as const;

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
    return chapterExit(local, 0.94, 0.995);
}

/** Scene wrapper — hold through step 4, then fade near chapter end */
export function getWorkflowSceneMotion(local: number, staticMode = false) {
    if (staticMode) {
        return { reveal: 1, exit: 1, combined: 1 };
    }
    const reveal = chapterReveal(local, CHAPTER_VISUAL_REVEAL_START, CHAPTER_VISUAL_REVEAL_END);
    const exit = chapterExit(local, 0.96, 0.999);
    return { reveal, exit, combined: reveal * exit };
}

function getWorkflowStepEnterTransform(index: number, enter: number): string {
    const offset = (1 - enter) * 44;
    if (index === 0) return `translateX(${-offset}px) scale(${0.9 + enter * 0.1})`;
    if (index === 1) return `translateX(${offset}px) scale(${0.9 + enter * 0.1})`;
    if (index === 2) return `translateY(${offset}px) scale(${0.9 + enter * 0.1})`;
    return `translateX(${offset}px) scale(${0.9 + enter * 0.1})`;
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
): number {
    const [start, end] = range;
    const cardCount = STACK_GRID_SCENE_COUNTS[sceneIndex] ?? 0;
    const timeline = getStackGridTimelineEnd(cardCount);

    if (progress <= start) return 0;
    if (progress >= end) return timeline;

    return ((progress - start) / (end - start)) * timeline;
}

/** Local progress when the last card finishes entering */
export function getStackGridEnterCompleteLocal(cardCount: number): number {
    const lastStagger = getStackLayerStagger(cardCount - 1);
    return STACK_LAYER_ENTER_BASE + lastStagger + STACK_LAYER_CARD_SPAN;
}

/** First card begins exiting after every card is visible + hold */
export function getStackGridExitStart(cardCount: number): number {
    return getStackGridEnterCompleteLocal(cardCount) + STACK_GRID_EXIT_HOLD;
}

export function getStackGridExitCompleteLocal(cardCount: number): number {
    return getStackGridTimelineEnd(cardCount);
}

/** Per-card exit progress scrubbed to scroll (0 = gone, 1 = visible) */
export function getStackLayerExitProgress(
    local: number,
    index: number,
    cardCount: number,
    staticMode: boolean,
): number {
    if (staticMode) return 1;
    const stagger = getStackLayerStagger(index);
    const exitStart = getStackGridExitStart(cardCount) + stagger;
    const exitEnd = exitStart + STACK_LAYER_CARD_SPAN;
    return chapterExit(local, exitStart, exitEnd);
}

function getScatterOffset(index: number, exit: number) {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const angle = ((index * 53 + row * 29 + col * 17) % 360) * (Math.PI / 180);
    const distance = (1 - exit) * 88;
    const rotate = (1 - exit) * (index % 2 === 0 ? -14 : 11);
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotate,
    };
}

/** Scroll-scrubbed card motion for chapters 2 & 5 */
export function getStackGridLayerMotion(
    local: number,
    index: number,
    cardCount: number,
    staticMode: boolean,
    exitStyle: StackGridExitStyle,
) {
    if (staticMode) {
        return { opacity: 1, transform: 'translateX(0) translateY(0) rotate(0deg) scale(1)' };
    }

    const enter = getStackLayerEnterProgress(local, index, staticMode);
    const exit = getStackLayerExitProgress(local, index, cardCount, staticMode);
    const enterX = (1 - enter) * -56;
    const baseScale = 0.92 + enter * 0.08;

    if (exitStyle === 'scatter') {
        const { x, y, rotate } = getScatterOffset(index, exit);
        const scale = baseScale * (0.82 + exit * 0.18);
        return {
            opacity: enter * exit,
            transform: `translateX(${enterX + x}px) translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
        };
    }

    const fadeX = (1 - exit) * -22;
    const fadeY = (1 - exit) * -18;
    const scale = baseScale * (0.84 + exit * 0.16);
    return {
        opacity: enter * exit,
        transform: `translateX(${enterX + fadeX}px) translateY(${fadeY}px) rotate(0deg) scale(${scale})`,
    };
}

export function stackGridSceneVisible(local: number, cardCount: number, staticMode: boolean): boolean {
    if (staticMode) return true;
    return local < getStackGridExitCompleteLocal(cardCount);
}

export const CHAPTER_META = [
    { index: '01', label: 'AI Development', tag: 'Prompt' },
    { index: '02', label: 'Tech Stack', tag: 'Build' },
    { index: '03', label: 'MCP Integration', tag: 'Connect' },
    { index: '04', label: 'Ship & Share', tag: 'Deliver' },
    { index: '05', label: 'AI Tools', tag: 'Assist' },
    { index: '06', label: 'Our Process', tag: 'Process' },
    { index: '07', label: 'Join Us', tag: 'Join' },
] as const;
