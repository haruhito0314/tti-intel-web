import { afterEach, describe, expect, it, vi } from 'vitest';
import { COLOR_META, PUZZLE_MODE_CONFIGS } from './config';
import { createShareImage, createShareText, shareResult } from './share';
import type { Puzzle } from './types';

const puzzle: Puzzle = [['sky']];
const result = { puzzle, moves: 12, config: PUZZLE_MODE_CONFIGS.star };

afterEach(() => vi.restoreAllMocks());

describe('shareResult', () => {
    it('stops when the text-only native sheet is cancelled', async () => {
        const openX = vi.fn().mockReturnValue(true);
        const navigateX = vi.fn();
        const runtime = {
            createImage: vi.fn().mockResolvedValue(null),
            share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
            canShare: vi.fn().mockReturnValue(false),
            openX,
            navigateX,
            origin: 'https://tti-intel.com',
        };

        await expect(shareResult(result, runtime)).resolves.toBe('cancelled');
        expect(openX).not.toHaveBeenCalled();
        expect(navigateX).not.toHaveBeenCalled();
    });

    it('falls from file share to text-only native share', async () => {
        const share = vi.fn().mockRejectedValueOnce(new Error('file failed')).mockResolvedValueOnce(undefined);
        const runtime = {
            createImage: vi.fn().mockResolvedValue(new File(['x'], 'result.png', { type: 'image/png' })),
            share,
            canShare: vi.fn().mockReturnValue(true),
            openX: vi.fn().mockReturnValue(true),
            navigateX: vi.fn(),
            origin: 'https://tti-intel.com',
        };

        await expect(shareResult(result, runtime)).resolves.toBe('native');
        expect(share).toHaveBeenCalledTimes(2);
        expect(share.mock.calls[0][0]).toMatchObject({ files: [expect.any(File)] });
        expect(share.mock.calls[1][0]).not.toHaveProperty('files');
        expect(runtime.openX).not.toHaveBeenCalled();
        expect(runtime.navigateX).not.toHaveBeenCalled();
    });

    it('opens X synchronously without creating an image when native sharing is unavailable', async () => {
        const createImage = vi.fn().mockResolvedValue(null);
        const openX = vi.fn().mockReturnValue(true);
        const navigateX = vi.fn();
        const runtime = {
            createImage,
            share: undefined,
            canShare: undefined,
            openX,
            navigateX,
            origin: 'https://tti-intel.com',
        };

        const pending = shareResult(result, runtime);

        expect(openX).toHaveBeenCalledOnce();
        expect(createImage).not.toHaveBeenCalled();
        expect(navigateX).not.toHaveBeenCalled();
        await expect(pending).resolves.toBe('x');
    });

    it('navigates to X synchronously when the non-native popup is blocked', async () => {
        const createImage = vi.fn().mockResolvedValue(null);
        const openX = vi.fn().mockReturnValue(false);
        const navigateX = vi.fn();
        const runtime = {
            createImage,
            share: undefined,
            canShare: undefined,
            openX,
            navigateX,
            origin: 'https://tti-intel.com',
        };

        const pending = shareResult(result, runtime);

        expect(openX).toHaveBeenCalledOnce();
        expect(navigateX).toHaveBeenCalledOnce();
        expect(createImage).not.toHaveBeenCalled();
        await expect(pending).resolves.toBe('x');
    });

    it('stops when the file native sheet is cancelled', async () => {
        const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
        const runtime = {
            createImage: vi.fn().mockResolvedValue(new File(['x'], 'result.png', { type: 'image/png' })),
            share,
            canShare: vi.fn().mockReturnValue(true),
            openX: vi.fn().mockReturnValue(true),
            navigateX: vi.fn(),
            origin: 'https://tti-intel.com',
        };

        await expect(shareResult(result, runtime)).resolves.toBe('cancelled');
        expect(share).toHaveBeenCalledOnce();
        expect(runtime.openX).not.toHaveBeenCalled();
        expect(runtime.navigateX).not.toHaveBeenCalled();
    });

    it('navigates to X after text-only native sharing fails generically', async () => {
        const openX = vi.fn().mockReturnValue(true);
        const navigateX = vi.fn();
        const runtime = {
            createImage: vi.fn().mockResolvedValue(null),
            share: vi.fn().mockRejectedValue(new Error('text failed')),
            canShare: vi.fn().mockReturnValue(false),
            openX,
            navigateX,
            origin: 'https://tti-intel.com',
        };

        await expect(shareResult(result, runtime)).resolves.toBe('x');
        expect(openX).not.toHaveBeenCalled();
        expect(navigateX).toHaveBeenCalledOnce();
    });
});

describe('share content', () => {
    it('includes the star mode label in share text', () => {
        expect(createShareText(12, PUZZLE_MODE_CONFIGS.star)).toContain('星モード');
    });

    it.each([
        ['normal', PUZZLE_MODE_CONFIGS.normal, 282 / 8],
        ['star', PUZZLE_MODE_CONFIGS.star, 282 / 10],
    ] as const)('draws %s layers using mode capacity and the configured canvas color', async (_, config, layerHeight) => {
        const fillRects: Array<{
            fillStyle: string | CanvasGradient | CanvasPattern;
            x: number;
            y: number;
            width: number;
            height: number;
        }> = [];
        const context = createCanvasContext(fillRects);
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
            callback(new Blob(['png'], { type: 'image/png' }));
        });

        await expect(createShareImage(puzzle, 12, config)).resolves.toBeInstanceOf(File);

        expect(fillRects).toContainEqual({
            fillStyle: COLOR_META.sky.canvas,
            x: 569,
            y: 566 - layerHeight,
            width: 62,
            height: layerHeight + 1,
        });
    });
});

function createCanvasContext(
    fillRects: Array<{
        fillStyle: string | CanvasGradient | CanvasPattern;
        x: number;
        y: number;
        width: number;
        height: number;
    }>,
): CanvasRenderingContext2D {
    const context = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetY: 0,
        font: '',
        scale: vi.fn(),
        fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
            fillRects.push({ fillStyle: context.fillStyle, x, y, width, height });
        }),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        arcTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        stroke: vi.fn(),
        clip: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        restore: vi.fn(),
    };

    return context as unknown as CanvasRenderingContext2D;
}
