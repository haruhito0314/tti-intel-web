import { afterEach, describe, expect, it, vi } from 'vitest';
import { COLOR_META, PUZZLE_MODE_CONFIGS } from './config';
import { createShareImage, createShareText, shareResult } from './share';
import type { Puzzle } from './types';

const puzzle: Puzzle = [['sky']];
const result = { puzzle, moves: 12, config: PUZZLE_MODE_CONFIGS.star };

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('shareResult', () => {
    it('stops when the text-only native sheet is cancelled', async () => {
        const openX = vi.fn().mockReturnValue(true);
        const navigateX = vi.fn();
        const runtime = {
            share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
            openX,
            navigateX,
            origin: 'https://tti-intel.com',
        };

        await expect(shareResult(result, runtime)).resolves.toBe('cancelled');
        expect(openX).not.toHaveBeenCalled();
        expect(navigateX).not.toHaveBeenCalled();
    });

    it('shares only text and the puzzle link through the native sheet', async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        const runtime = {
            share,
            openX: vi.fn().mockReturnValue(true),
            navigateX: vi.fn(),
            origin: 'https://tti-intel.com',
        };

        await expect(shareResult(result, runtime)).resolves.toBe('native');
        expect(share).toHaveBeenCalledOnce();
        expect(share).toHaveBeenCalledWith({
            title: 'カラーソートパズル',
            text: expect.stringContaining('12手で解けました'),
            url: 'https://tti-intel.com/app/color-sort',
        });
        expect(share.mock.calls[0][0]).not.toHaveProperty('files');
        expect(runtime.openX).not.toHaveBeenCalled();
        expect(runtime.navigateX).not.toHaveBeenCalled();
    });

    it('opens X synchronously without creating an image when native sharing is unavailable', async () => {
        const openX = vi.fn().mockReturnValue(true);
        const navigateX = vi.fn();
        const runtime = {
            share: undefined,
            openX,
            navigateX,
            origin: 'https://tti-intel.com',
        };

        const pending = shareResult(result, runtime);

        expect(openX).toHaveBeenCalledOnce();
        expect(navigateX).not.toHaveBeenCalled();
        await expect(pending).resolves.toBe('x');
    });

    it('navigates to X synchronously when the non-native popup is blocked', async () => {
        const openX = vi.fn().mockReturnValue(false);
        const navigateX = vi.fn();
        const runtime = {
            share: undefined,
            openX,
            navigateX,
            origin: 'https://tti-intel.com',
        };

        const pending = shareResult(result, runtime);

        expect(openX).toHaveBeenCalledOnce();
        expect(navigateX).toHaveBeenCalledOnce();
        await expect(pending).resolves.toBe('x');
    });

    it('opens and detaches a blank default popup before navigating it to the X intent', async () => {
        const replace = vi.fn();
        const fakePopup = {
            opener: window,
            location: { replace },
            close: vi.fn(),
        } as unknown as WindowProxy;
        const { assign, open } = stubNonNativeDefaultRuntime(fakePopup);

        const pending = shareResult(result);

        expect(open).toHaveBeenCalledWith('about:blank', '_blank');
        expect(fakePopup.opener).toBeNull();
        expect(replace).toHaveBeenCalledOnce();
        expect(replace.mock.calls[0][0]).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?/);
        expect(assign).not.toHaveBeenCalled();
        await expect(pending).resolves.toBe('x');
    });

    it('closes a failed default popup and navigates the current tab to X', async () => {
        const close = vi.fn();
        const replace = vi.fn(() => {
            throw new Error('popup navigation failed');
        });
        const fakePopup = {
            opener: window,
            location: { replace },
            close,
        } as unknown as WindowProxy;
        const { assign, open } = stubNonNativeDefaultRuntime(fakePopup);

        await expect(shareResult(result)).resolves.toBe('x');

        expect(open).toHaveBeenCalledWith('about:blank', '_blank');
        expect(fakePopup.opener).toBeNull();
        expect(close).toHaveBeenCalledOnce();
        expect(assign).toHaveBeenCalledOnce();
        expect(assign.mock.calls[0][0]).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?/);
    });

    it('navigates to X after text-only native sharing fails generically', async () => {
        const openX = vi.fn().mockReturnValue(true);
        const navigateX = vi.fn();
        const runtime = {
            share: vi.fn().mockRejectedValue(new Error('text failed')),
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

function stubNonNativeDefaultRuntime(fakePopup: WindowProxy) {
    const realWindow = window;
    const assign = vi.fn();
    const windowFacade = Object.create(realWindow) as Window & typeof globalThis;
    Object.defineProperties(windowFacade, {
        location: {
            configurable: true,
            value: { assign, origin: 'https://tti-intel.com' },
        },
        open: {
            configurable: true,
            value: () => null,
            writable: true,
        },
    });
    vi.stubGlobal('window', windowFacade);

    const navigatorFacade = Object.create(navigator) as Navigator;
    Object.defineProperties(navigatorFacade, {
        canShare: { configurable: true, value: undefined },
        share: { configurable: true, value: undefined },
    });
    vi.stubGlobal('navigator', navigatorFacade);

    return {
        assign,
        open: vi.spyOn(window, 'open').mockReturnValue(fakePopup),
    };
}
