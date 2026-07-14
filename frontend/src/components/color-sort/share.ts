import { COLOR_META } from './config';
import type { Puzzle, PuzzleModeConfig } from './types';

const SHARE_TITLE = 'カラーソートパズル';
const SHARE_PATH = '/app/color-sort';
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 675;

export type ShareOutcome = 'native' | 'x' | 'cancelled';

export interface ShareRuntime {
    createImage: (puzzle: Puzzle, moves: number, config: PuzzleModeConfig) => Promise<File | null>;
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
    openX: (url: string) => void;
    origin: string;
}

export function createShareText(moves: number, config: PuzzleModeConfig): string {
    return `${config.label}のカラーソートパズルを${moves}手で解けました！`;
}

export async function createShareImage(
    puzzle: Puzzle,
    moves: number,
    config: PuzzleModeConfig,
): Promise<File | null> {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    const scale = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * scale;
    canvas.height = CANVAS_HEIGHT * scale;

    const context = canvas.getContext('2d');
    if (!context) return null;

    drawShareScene(context, puzzle, moves, config, scale);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? new File([blob], 'color-sort-result.png', { type: 'image/png' }) : null;
}

const defaultRuntime = (): ShareRuntime => ({
    createImage: createShareImage,
    share: navigator.share?.bind(navigator),
    canShare: navigator.canShare?.bind(navigator),
    openX: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
    origin: window.location.origin,
});

export async function shareResult(
    result: { puzzle: Puzzle; moves: number; config: PuzzleModeConfig },
    runtime: ShareRuntime = defaultRuntime(),
): Promise<ShareOutcome> {
    const text = createShareText(result.moves, result.config);
    const url = `${runtime.origin}${SHARE_PATH}`;
    const image = await runtime.createImage(result.puzzle, result.moves, result.config).catch(() => null);

    if (image && runtime.share && runtime.canShare?.({ files: [image] })) {
        try {
            await runtime.share({ title: SHARE_TITLE, text, url, files: [image] });
            return 'native';
        } catch (error) {
            if (isAbortError(error)) return 'cancelled';
        }
    }

    if (runtime.share) {
        try {
            await runtime.share({ title: SHARE_TITLE, text, url });
            return 'native';
        } catch (error) {
            if (isAbortError(error)) return 'cancelled';
        }
    }

    const intent = new URL('https://twitter.com/intent/tweet');
    intent.searchParams.set('text', text);
    intent.searchParams.set('url', url);
    runtime.openX(intent.toString());
    return 'x';
}

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

function drawShareScene(
    context: CanvasRenderingContext2D,
    puzzle: Puzzle,
    moves: number,
    config: PuzzleModeConfig,
    scale: number,
) {
    context.scale(scale, scale);
    context.fillStyle = '#F5F5F7';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.fillStyle = '#FFFFFF';
    context.shadowColor = 'rgba(0, 0, 0, 0.12)';
    context.shadowBlur = 34;
    context.shadowOffsetY = 18;
    roundRect(context, 96, 76, CANVAS_WIDTH - 192, CANVAS_HEIGHT - 152, 36);
    context.fill();
    context.shadowColor = 'transparent';

    context.fillStyle = '#1D1D1F';
    context.font = '700 54px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText('Color Sort Puzzle', 152, 164);

    context.fillStyle = '#6E6E73';
    context.font = '500 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(`${moves} moves cleared`, 152, 210);

    const bottleWidth = 82;
    const bottleHeight = 310;
    const gap = 28;
    const totalWidth = puzzle.length * bottleWidth + (puzzle.length - 1) * gap;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const startY = 268;

    puzzle.forEach((bottle, index) => {
        const x = startX + index * (bottleWidth + gap);
        drawShareBottle(context, bottle, x, startY, bottleWidth, bottleHeight, config);
    });

    context.fillStyle = '#86868B';
    context.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(`${window.location.origin}${SHARE_PATH}`, 152, 590);
}

function roundRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
}

function drawShareBottle(
    context: CanvasRenderingContext2D,
    bottle: Puzzle[number],
    x: number,
    y: number,
    width: number,
    height: number,
    config: PuzzleModeConfig,
) {
    context.save();
    roundRect(context, x, y, width, height, 28);
    context.fillStyle = 'rgba(255, 255, 255, 0.58)';
    context.fill();
    context.strokeStyle = 'rgba(0, 0, 0, 0.14)';
    context.lineWidth = 2;
    context.stroke();
    context.clip();

    const padding = 10;
    const liquidWidth = width - padding * 2;
    const liquidHeight = height - 28;
    const layerHeight = liquidHeight / config.capacity;
    bottle.forEach((color, layerIndex) => {
        context.fillStyle = COLOR_META[color].canvas;
        context.fillRect(
            x + padding,
            y + height - 12 - (layerIndex + 1) * layerHeight,
            liquidWidth,
            layerHeight + 1,
        );
    });

    const highlight = context.createLinearGradient(x, y, x + width, y);
    highlight.addColorStop(0, 'rgba(255,255,255,0.56)');
    highlight.addColorStop(0.45, 'rgba(255,255,255,0.08)');
    highlight.addColorStop(1, 'rgba(0,0,0,0.04)');
    context.fillStyle = highlight;
    context.fillRect(x, y, width, height);
    context.restore();
}
