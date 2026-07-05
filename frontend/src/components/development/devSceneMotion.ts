import { CHAPTER_ENTER_END, getChapterEnterEnd } from './devScrollConfig';
import { exit, freezeAfterEnter, reveal } from './devScrollMath';

/** Motion-local — capped during hold */
export function motionLocal(local: number, chapterIndex?: number): number {
    const enterEnd = chapterIndex !== undefined ? getChapterEnterEnd(chapterIndex) : CHAPTER_ENTER_END;
    return freezeAfterEnter(local, enterEnd);
}

// —— Section 1 ——
export const SCENE1_TYPEWRITER_END = 0.42;
export const SCENE1_TERMINAL_END = 0.22;
export const SCENE1_COMPLETE = 0.55;
export const SCENE1_FLOAT_BASE = 0.22;
export const SCENE1_FLOAT_STAGGER = 0.045;
export const SCENE1_FLOAT_SPAN = 0.14;

export function scene1TypewriterProgress(local: number): number {
    const l = freezeAfterEnter(local, SCENE1_TYPEWRITER_END);
    return reveal(l, 0.18, SCENE1_TYPEWRITER_END);
}

export function scene1TerminalReveal(local: number): number {
    const l = freezeAfterEnter(local, SCENE1_TERMINAL_END);
    return reveal(l, 0.05, SCENE1_TERMINAL_END);
}

export function scene1BadgeReveal(local: number, index: number): number {
    const l = motionLocal(local);
    return reveal(l, 0.4 + index * 0.045, 0.45 + index * 0.045);
}

export function scene1FloatReveal(local: number, index: number): number {
    const l = motionLocal(local);
    const start = SCENE1_FLOAT_BASE + index * SCENE1_FLOAT_STAGGER;
    return reveal(l, start, start + SCENE1_FLOAT_SPAN);
}

// —— Stack grids (sections 2 & 5) ——
export const STACK_CARD_SPAN = 0.11;
export const STACK_CARD_ROW_GAP = 0.09;
export const STACK_CARD_COL_GAP = 0.045;
export const STACK_CARD_BASE = 0.05;
export const STACK_EXIT_HOLD = 0.06;
export const STACK_SHELL_FADE_PAD = 0.02;

export const STACK_GRID_CHAPTER_INDICES = new Set([4]);
export const STACK_GRID_MOBILE_COLS = 2;
export const STACK_GRID_DESKTOP_COLS = 4;

export function stackGridColumns(mobileLayout: boolean): number {
    return mobileLayout ? STACK_GRID_MOBILE_COLS : STACK_GRID_DESKTOP_COLS;
}

export function stackCardStagger(index: number, columns = STACK_GRID_DESKTOP_COLS): number {
    const row = Math.floor(index / columns);
    const col = index % columns;
    return row * STACK_CARD_ROW_GAP + col * STACK_CARD_COL_GAP;
}

export function stackCardEnterStart(index: number, columns = STACK_GRID_DESKTOP_COLS): number {
    return STACK_CARD_BASE + stackCardStagger(index, columns);
}

export function stackGridEnterComplete(cardCount: number, columns = STACK_GRID_DESKTOP_COLS): number {
    return stackCardEnterStart(cardCount - 1, columns) + STACK_CARD_SPAN;
}

export function stackGridExitStart(cardCount: number, columns = STACK_GRID_DESKTOP_COLS): number {
    return stackGridEnterComplete(cardCount, columns) + STACK_EXIT_HOLD;
}

export function stackGridExitComplete(cardCount: number, columns = STACK_GRID_DESKTOP_COLS): number {
    return stackGridExitStart(cardCount, columns) + stackCardStagger(cardCount - 1, columns) + STACK_CARD_SPAN;
}

export function stackGridShellFadeStart(cardCount: number, columns = STACK_GRID_DESKTOP_COLS): number {
    return stackGridExitComplete(cardCount, columns) + STACK_SHELL_FADE_PAD;
}

export function stackCardReveal(
    local: number,
    index: number,
    chapterIndex?: number,
    columns = STACK_GRID_DESKTOP_COLS,
): number {
    const l = motionLocal(local, chapterIndex);
    const start = stackCardEnterStart(index, columns);
    return reveal(l, start, start + STACK_CARD_SPAN);
}

export function stackCardExit(
    local: number,
    index: number,
    cardCount: number,
    columns = STACK_GRID_DESKTOP_COLS,
): number {
    const stagger = stackCardStagger(index, columns);
    const start = stackGridExitStart(cardCount, columns) + stagger;
    return exit(local, start, start + STACK_CARD_SPAN);
}

// —— Section 3 MCP ——
export function mcpPanelReveal(local: number): number {
    return reveal(motionLocal(local, 2), 0.05, 0.2);
}

export function mcpRowReveal(local: number, index: number): number {
    const l = motionLocal(local, 2);
    return reveal(l, 0.06 + index * 0.09, 0.16 + index * 0.09);
}

export function mcpToggleReveal(local: number, index: number): number {
    const l = motionLocal(local, 2);
    return reveal(l, 0.1 + index * 0.09, 0.18 + index * 0.09);
}

// —— Section 4 preview ——
const S4_GAP = 0.046;
const S4_SPAN = 0.062;
const S4_BASE = 0.05;

export function scene4StepReveal(local: number, step: number): number {
    const start = S4_BASE + step * S4_GAP;
    return reveal(motionLocal(local, 3), start, start + S4_SPAN);
}

export function scene4TypewriterProgress(local: number): number {
    const l = motionLocal(local, 3);
    const start = S4_BASE + 4 * S4_GAP;
    const end = start + S4_SPAN + 0.04;
    if (l <= start) return 0;
    if (l >= end) return 1;
    return (l - start) / (end - start);
}

// —— Section 6 workflow ——
const WF_STEP_STARTS = [0.04, 0.14, 0.28, 0.4] as const;
const WF_MOBILE_STEP_STARTS = [0.04, 0.18, 0.32, 0.46] as const;
const WF_STEP_SPAN = 0.08;
const WF_MOBILE_STEP_SPAN = 0.1;
const WF_ARROW_STARTS = [0.12, 0.24, 0.46] as const;
/** ~half previous draw speed (2× span) */
const WF_ARROW_SPANS = [0.22, 0.48, 0.22] as const;

export function workflowStepReveal(local: number, index: number, mobileLayout = false): number {
    const l = motionLocal(local, 5);
    const starts = mobileLayout ? WF_MOBILE_STEP_STARTS : WF_STEP_STARTS;
    const span = mobileLayout ? WF_MOBILE_STEP_SPAN : WF_STEP_SPAN;
    const start = starts[index] ?? starts[0];
    return reveal(l, start, start + span);
}

export function workflowArrowReveal(local: number, index: number): number {
    const l = motionLocal(local, 5);
    const start = WF_ARROW_STARTS[index] ?? WF_ARROW_STARTS[0];
    const span = WF_ARROW_SPANS[index] ?? WF_ARROW_SPANS[0];
    return reveal(l, start, start + span);
}

// —— Section 7 CTA ——
export function scene7CtaReveal(local: number): number {
    return reveal(motionLocal(local), 0.12, 0.38);
}
