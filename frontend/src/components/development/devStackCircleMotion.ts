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
const STAGE_PAD_Y = 16;
const STACK2_CARD_H_DESKTOP = 120;
const STACK2_CARD_H_MOBILE = 100;

const STACK2_HOLD = 0.02;
const STACK2_MORPH_CIRCLE_SPAN = 0.28;
const STACK2_CIRCLE_HOLD = 0.015;
const STACK2_EXIT_STAGGER = 0.015;
const STACK2_EXIT_SPAN = 0.048;

/** 1.5× the previous 0.9 safe multiplier */
const STACK2_CIRCLE_SAFE_SCALE = 1.35;

export type Stack2StageLayout = {
    width: number;
    height: number;
    cellW: number;
    cellH: number;
    gap: number;
    safeX: number;
    safeY: number;
};

export function computeStack2StageLayout(width: number, height: number): Stack2StageLayout {
    const stageW = Math.min(width, STAGE_MAX_W);
    const gap = Math.max(7.2, Math.min(12, stageW * 0.015));
    const availW = stageW - STAGE_PAD_X * 2;

    const cellW = (availW - (STACK2_COLS - 1) * gap) / STACK2_COLS;
    const cellH = width < 768 ? STACK2_CARD_H_MOBILE : STACK2_CARD_H_DESKTOP;

    const halfDiag = Math.sqrt((cellW / 2) ** 2 + (cellH / 2) ** 2);
    const safeX = Math.max(28, width / 2 - halfDiag - STAGE_PAD_X);
    const safeY = Math.max(24, height / 2 - halfDiag - STAGE_PAD_Y);

    return { width, height, cellW, cellH, gap, safeX, safeY };
}

export function stack2MorphCircleStart(): number {
    return stackGridEnterComplete(STACK2_CARD_COUNT) + STACK2_HOLD;
}

export function stack2MorphCircleEnd(): number {
    return stack2MorphCircleStart() + STACK2_MORPH_CIRCLE_SPAN;
}

export function stack2ExitPhaseStart(): number {
    return stack2MorphCircleEnd() + STACK2_CIRCLE_HOLD;
}

export function stack2ExitComplete(): number {
    return stack2ExitPhaseStart() + (STACK2_CARD_COUNT - 1) * STACK2_EXIT_STAGGER + STACK2_EXIT_SPAN;
}

export function stack2ShellFadeStart(): number {
    return stack2ExitComplete() + 0.02;
}

export function stack2MorphCircleProgress(local: number): number {
    return reveal(local, stack2MorphCircleStart(), stack2MorphCircleEnd());
}

export function stack2CardExitProgress(local: number, index: number): number {
    const start = stack2ExitPhaseStart() + index * STACK2_EXIT_STAGGER;
    const end = start + STACK2_EXIT_SPAN;
    if (local <= start) return 1;
    if (local >= end) return 0;
    return 1 - reveal(local, start, end);
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

function circleRadius(layout: Stack2StageLayout): number {
    const { width, height, safeX, safeY } = layout;
    const isMobile = width < 768;
    const vmin = Math.min(width, height);
    const isWide = width > height * 1.2;

    const fromDisplay = vmin * (isMobile ? 0.45 : isWide ? 0.52 : 0.48);
    const maxSafe = Math.min(safeX, safeY) * STACK2_CIRCLE_SAFE_SCALE;

    return Math.min(fromDisplay, maxSafe);
}

function circlePoint(index: number, cardCount: number, layout: Stack2StageLayout): Point {
    const radius = circleRadius(layout);
    const angle = (index / cardCount) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    return {
        x: Math.cos(rad) * radius,
        y: Math.sin(rad) * radius,
    };
}

export function stack2CardLayout(
    local: number,
    index: number,
    width: number,
    height: number,
): { x: number; y: number; opacity: number; cardW: number; cardH: number } {
    const layout = computeStack2StageLayout(width, height);
    const cardCount = STACK2_CARD_COUNT;
    const morph = stack2MorphCircleProgress(local);

    const grid = gridPoint(index, cardCount, layout);
    const circle = circlePoint(index, cardCount, layout);

    const x = Math.round(lerp(grid.x, circle.x, morph));
    const y = Math.round(lerp(grid.y, circle.y, morph));

    const enter = stackCardReveal(local, index, 1);
    const exit = stack2CardExitProgress(local, index);
    const enterY = enter < 1 ? (1 - enter) * 20 : 0;
    const exitLift = exit < 1 ? (1 - exit) * 28 : 0;

    return {
        x,
        y: y + enterY - exitLift,
        opacity: Math.min(enter, exit),
        cardW: layout.cellW,
        cardH: layout.cellH,
    };
}

export function isStack2CircleChapter(chapterIndex?: number): boolean {
    return chapterIndex === 1;
}
