import { reveal } from './devScrollMath';
import { STACK_LAYERS } from './sceneUtils';
import {
    stackCardReveal,
    stackGridEnterComplete,
} from './devSceneMotion';

export const STACK2_CARD_COUNT = STACK_LAYERS.length;
const STACK2_COLS = 4;
const STAGE_MAX_W = 920;
const STAGE_PAD_X = 12;
const STACK2_CARD_H_DESKTOP = 120;
const STACK2_CARD_H_MOBILE = 100;

const STACK2_HOLD = 0.14;
const STACK2_LINE_HOLD = 0.018;
const STACK2_LINE_STAGGER = 0.012;
const STACK2_LINE_CARD_SPAN = 0.042;
const STACK2_PAN_SCROLL_SPAN = 0.32;
const STACK2_MORPH_CIRCLE_SPAN = 0.2;
const STACK2_CIRCLE_HOLD = 0.035;
const STACK2_EXIT_STAGGER = 0.042;
const STACK2_EXIT_SPAN = 0.056;
const STACK2_EXIT_LIFT = 36;
const STACK2_CIRCLE_RADIUS_SCALE = 1.5;

/** Chapter-local progress when every card has finished exiting (hold follows before chapter end) */
export const STACK2_EXIT_COMPLETE_LOCAL = 0.9;
const STACK2_SHELL_FADE_LOCAL = 0.96;

function copyZoneHeight(): number {
    if (typeof window === 'undefined') return 240;
    return Math.round(Math.min(Math.max(window.innerHeight * 0.28, 210), 320));
}

/** Nudge circle center slightly toward screen center */
function circleCenterOffsetY(): number {
    return -copyZoneHeight() * 0.12;
}

function circleRadius(layout: Stack2StageLayout): number {
    const { width, height, cellW, cellH } = layout;
    const halfDiag = Math.hypot(cellW / 2, cellH / 2);
    const cy = circleCenterOffsetY();
    const pad = 12;

    const maxFromW = width / 2 - halfDiag - pad;
    const maxFromTop = height / 2 + cy - halfDiag - pad;
    const maxFromBottom = height / 2 - cy - halfDiag - pad;
    const maxFit = Math.min(maxFromW, maxFromTop, maxFromBottom);

    const vmin = Math.min(width, height);
    const isMobile = width < 768;
    const target = vmin * (isMobile ? 2.24 : 2.56) * STACK2_CIRCLE_RADIUS_SCALE;

    return Math.max(90, Math.min(target, maxFit));
}

/** Map chapter scroll local (0–1) onto the full stack-2 motion timeline */
export function stack2AnimLocal(local: number): number {
    return local * stack2TimelineEnd();
}

function stack2TimelineEnd(): number {
    return stack2ExitComplete() / STACK2_EXIT_COMPLETE_LOCAL;
}

export type Stack2StageLayout = {
    width: number;
    height: number;
    cellW: number;
    cellH: number;
    gap: number;
};

function computeStack2StageLayout(width: number, height: number): Stack2StageLayout {
    const stageW = Math.min(width, STAGE_MAX_W);
    const gap = Math.max(7.2, Math.min(12, stageW * 0.015));
    const availW = stageW - STAGE_PAD_X * 2;

    const cellW = (availW - (STACK2_COLS - 1) * gap) / STACK2_COLS;
    const cellH = width < 768 ? STACK2_CARD_H_MOBILE : STACK2_CARD_H_DESKTOP;

    return { width: stageW, height, cellW, cellH, gap };
}

function stack2MorphLineStart(): number {
    return stackGridEnterComplete(STACK2_CARD_COUNT) + STACK2_HOLD;
}

function stack2LineMorphStart(index: number): number {
    return stack2MorphLineStart() + index * STACK2_LINE_STAGGER;
}

function stack2LineMorphEnd(index: number): number {
    return stack2LineMorphStart(index) + STACK2_LINE_CARD_SPAN;
}

function stack2PanScrollStart(): number {
    return stack2MorphLineComplete() + STACK2_LINE_HOLD;
}

export function stack2CopyFadeStart(): number {
    return stack2PanScrollStart();
}

export function stack2CopyFadeEnd(): number {
    return stack2CopyFadeStart() + 0.055;
}

function stack2PanScrollEnd(): number {
    return stack2PanScrollStart() + STACK2_PAN_SCROLL_SPAN;
}

function stack2MorphLineComplete(): number {
    return stack2LineMorphEnd(STACK2_CARD_COUNT - 1);
}

function stack2MorphCircleStart(): number {
    return stack2PanScrollEnd() + 0.01;
}

function stack2MorphCircleEnd(): number {
    return stack2MorphCircleStart() + STACK2_MORPH_CIRCLE_SPAN;
}

function stack2ExitPhaseStart(): number {
    return stack2MorphCircleEnd() + STACK2_CIRCLE_HOLD;
}

function stack2ExitComplete(): number {
    return stack2ExitPhaseStart() + (STACK2_CARD_COUNT - 1) * STACK2_EXIT_STAGGER + STACK2_EXIT_SPAN;
}

export function stack2ShellFadeEndLocal(): number {
    return STACK2_SHELL_FADE_LOCAL;
}

function stack2MorphLineProgress(local: number, index: number): number {
    const t = stack2AnimLocal(local);
    return reveal(t, stack2LineMorphStart(index), stack2LineMorphEnd(index));
}

function stack2MorphCircleProgress(local: number): number {
    const t = stack2AnimLocal(local);
    return reveal(t, stack2MorphCircleStart(), stack2MorphCircleEnd());
}

function stack2CardExitProgress(local: number, index: number): number {
    const t = stack2AnimLocal(local);
    const start = stack2ExitPhaseStart() + index * STACK2_EXIT_STAGGER;
    const end = start + STACK2_EXIT_SPAN;
    if (t <= start) return 1;
    if (t >= end) return 0;
    return 1 - reveal(t, start, end);
}

type Point = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function gridPoint(index: number, cardCount: number, layout: Stack2StageLayout): Point {
    const col = index % STACK2_COLS;
    const row = Math.floor(index / STACK2_COLS);
    const rows = Math.ceil(cardCount / STACK2_COLS);
    const { cellW, cellH, gap } = layout;
    const totalW = STACK2_COLS * cellW + (STACK2_COLS - 1) * gap;
    const totalH = rows * cellH + (rows - 1) * gap;
    return {
        x: col * (cellW + gap) - totalW / 2 + cellW / 2,
        y: row * (cellH + gap) - totalH / 2 + cellH / 2,
    };
}

function lineRowStartX(layout: Stack2StageLayout): number {
    const halfW = layout.width / 2;
    return -halfW + STAGE_PAD_X + layout.cellW * 0.5;
}

function linePoint(index: number, layout: Stack2StageLayout): Point {
    const spacing = layout.cellW + layout.gap * 0.55;
    return { x: lineRowStartX(layout) + index * spacing, y: 0 };
}

function linePanTarget(layout: Stack2StageLayout, cardCount: number): number {
    const halfW = layout.width / 2;
    const maxRight = halfW - STAGE_PAD_X - layout.cellW * 0.5;

    const tailX = linePoint(cardCount - 1, layout).x;

    if (tailX + layout.cellW * 0.5 <= maxRight) return 0;
    return maxRight - layout.cellW * 0.5 - tailX;
}

function linePanProgress(local: number): number {
    const t = stack2AnimLocal(local);
    if (t < stack2PanScrollStart()) return 0;
    return reveal(t, stack2PanScrollStart(), stack2PanScrollEnd());
}

function linePanOffset(local: number, layout: Stack2StageLayout, cardCount: number): number {
    const t = linePanProgress(local);
    if (t <= 0) return 0;
    return lerp(0, linePanTarget(layout, cardCount), t);
}

function circlePoint(index: number, cardCount: number, layout: Stack2StageLayout): Point {
    const radius = circleRadius(layout);
    const cy = circleCenterOffsetY();
    const angle = (index / cardCount) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    return {
        x: Math.cos(rad) * radius,
        y: Math.sin(rad) * radius + cy,
    };
}

export function stack2SharedPanX(local: number, width: number, height: number): number {
    const layout = computeStack2StageLayout(width, height);
    const morphCircle = stack2MorphCircleProgress(local);
    const t = stack2AnimLocal(local);
    if (t < stack2PanScrollStart()) return 0;

    const panLine = linePanOffset(local, layout, STACK2_CARD_COUNT);
    if (morphCircle <= 0) return panLine;

    const panTarget = linePanTarget(layout, STACK2_CARD_COUNT);
    const panAtLineEnd = panTarget;
    return lerp(panAtLineEnd, 0, morphCircle);
}

export function stack2CardLayout(
    local: number,
    index: number,
    width: number,
    height: number,
): { x: number; y: number; opacity: number; cardW: number; cardH: number } {
    const layout = computeStack2StageLayout(width, height);
    const cardCount = STACK2_CARD_COUNT;
    const morphLine = stack2MorphLineProgress(local, index);
    const morphCircle = stack2MorphCircleProgress(local);

    const grid = gridPoint(index, cardCount, layout);
    const line = linePoint(index, layout);
    const circle = circlePoint(index, cardCount, layout);

    let x: number;
    let y: number;
    const pan = stack2SharedPanX(local, width, height);
    const rowComplete = stack2AnimLocal(local) >= stack2MorphLineComplete();

    if (morphCircle > 0) {
        x = lerp(line.x, circle.x, morphCircle);
        y = lerp(line.y, circle.y, morphCircle);
        x += pan;
    } else if (rowComplete || morphLine > 0) {
        const lineT = rowComplete ? 1 : morphLine;
        x = lerp(grid.x, line.x, lineT);
        y = lerp(grid.y, line.y, lineT);
        x += pan;
    } else {
        x = grid.x;
        y = grid.y;
    }

    const enter = stackCardReveal(local, index, 1);
    const exit = stack2CardExitProgress(local, index);
    const enterY = enter < 1 ? (1 - enter) * 20 : 0;
    const exitLift = exit < 1 ? (1 - exit) * STACK2_EXIT_LIFT : 0;

    return {
        x: Math.round(x),
        y: Math.round(y + enterY - exitLift),
        opacity: Math.min(enter, exit),
        cardW: layout.cellW,
        cardH: layout.cellH,
    };
}

export function isStack2CircleChapter(chapterIndex?: number, mobileLayout = false): boolean {
    return chapterIndex === 1 && !mobileLayout;
}

export function isStack2MobileGridChapter(chapterIndex?: number, mobileLayout = false): boolean {
    return chapterIndex === 1 && mobileLayout;
}
