import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Puzzle, PuzzleMode } from '@/components/color-sort/types';

const generation = vi.hoisted(() => ({ generate: vi.fn(), cancel: vi.fn() }));
vi.mock('@/components/color-sort/generationClient', () => ({
    createPuzzleGenerationClient: () => generation,
}));

import { ColorSortPuzzlePage } from './ColorSortPuzzle';

const normalPuzzle: Puzzle = [
    ['sky', 'sky', 'sky', 'sky', 'sky', 'sky'],
    ['mint', 'mint', 'mint', 'mint', 'mint'],
    Array.from({ length: 8 }, () => 'coral' as const),
    Array.from({ length: 8 }, () => 'sun' as const),
    ['sky', 'sky'],
    ['mint', 'mint', 'mint'],
];

const starPuzzle: Puzzle = [
    [...Array.from({ length: 9 }, () => 'sky' as const), 'violet'],
    Array.from({ length: 10 }, () => 'mint' as const),
    Array.from({ length: 10 }, () => 'coral' as const),
    Array.from({ length: 10 }, () => 'sun' as const),
    [...Array.from({ length: 9 }, () => 'violet' as const), 'sky'],
    [],
];

const oneMovePuzzle: Puzzle = [
    ['sky', 'sky', 'sky', 'sky', 'sky', 'sky'],
    Array.from({ length: 8 }, () => 'mint' as const),
    Array.from({ length: 8 }, () => 'coral' as const),
    Array.from({ length: 8 }, () => 'sun' as const),
    ['sky', 'sky'],
    [],
];

function renderPage() {
    return render(<MemoryRouter><ColorSortPuzzlePage /></MemoryRouter>);
}

function renderStrictPage() {
    return render(
        <StrictMode>
            <MemoryRouter><ColorSortPuzzlePage /></MemoryRouter>
        </StrictMode>,
    );
}

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((next) => {
        resolve = next;
    });
    return { promise, resolve };
}

beforeEach(() => {
    generation.generate.mockReset().mockImplementation((mode: PuzzleMode) => Promise.resolve({
        puzzle: mode === 'star' ? starPuzzle : normalPuzzle,
        usedFallback: false,
    }));
    generation.cancel.mockReset();
});

describe('ColorSortPuzzlePage', () => {
    it('cancels pending generation on unmount and tolerates its late completion', async () => {
        const pending = createDeferred<{ puzzle: Puzzle; usedFallback: boolean }>();
        generation.generate.mockReturnValue(pending.promise);
        const view = renderPage();

        await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
        expect(generation.generate).toHaveBeenCalledWith('normal', expect.any(Number));

        view.unmount();
        expect(generation.cancel).toHaveBeenCalledTimes(1);

        await act(async () => {
            pending.resolve({ puzzle: normalPuzzle, usedFallback: false });
            await pending.promise;
        });
        expect(view.container).toBeEmptyDOMElement();
    });

    it('starts generation once across StrictMode effect replay', async () => {
        const view = renderStrictPage();

        await screen.findByRole('button', { name: /ボトル 1/ });
        expect(generation.generate).toHaveBeenCalledTimes(1);
        expect(generation.cancel).toHaveBeenCalledTimes(1);

        view.unmount();
        expect(generation.cancel).toHaveBeenCalledTimes(2);
    });

    it('disables replacement controls while a puzzle is generating', () => {
        generation.generate.mockReturnValue(new Promise(() => undefined));
        renderPage();

        expect(screen.getByRole('button', { name: 'リセット' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '新しい問題' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '星' })).toBeDisabled();
    });

    it('enables a new-puzzle retry after initial generation fails', async () => {
        generation.generate
            .mockRejectedValueOnce(new Error('generation unavailable'))
            .mockResolvedValueOnce({ puzzle: normalPuzzle, usedFallback: false });
        renderPage();

        expect(await screen.findByRole('status')).toHaveTextContent('問題の準備に失敗しました');
        const retry = screen.getByRole('button', { name: '新しい問題' });
        expect(retry).toBeEnabled();
        fireEvent.click(retry);

        await screen.findByRole('button', { name: /ボトル 1/ });
        expect(generation.generate).toHaveBeenCalledTimes(2);
        expect(screen.getByRole('status')).toHaveTextContent('ボトルを選んでください');
    });

    it('selects, cancels, and consistently switches sources', async () => {
        renderPage();
        const first = await screen.findByRole('button', { name: /ボトル 1/ });
        const second = screen.getByRole('button', { name: /ボトル 2/ });
        fireEvent.click(first);
        expect(first).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(first);
        expect(first).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(first);
        fireEvent.click(second);
        expect(second).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('status')).toHaveTextContent('移動元を変更しました');
    });

    it('pours a legal group and supports undo', async () => {
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        expect(screen.getByText('1', { selector: '[data-stat="moves"]' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '戻す' }));
        expect(screen.getByText('0', { selector: '[data-stat="moves"]' })).toBeInTheDocument();
    });

    it.each(['リセット', '新しい問題', '星'])('confirms %s after a move', async (actionName) => {
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        fireEvent.click(screen.getByRole('button', { name: actionName }));
        expect(screen.getByRole('dialog', { name: '現在の進捗を破棄しますか' })).toBeInTheDocument();
    });

    it('keeps the current board when discard confirmation is cancelled', async () => {
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        fireEvent.click(screen.getByRole('button', { name: '新しい問題' }));
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('1', { selector: '[data-stat="moves"]' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ボトル 1、0\/8、空/ })).toBeInTheDocument();
        expect(generation.generate).toHaveBeenCalledTimes(1);
    });

    it('restores the initial puzzle and move count after confirmed reset', async () => {
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        fireEvent.click(screen.getByRole('button', { name: 'リセット' }));
        fireEvent.click(screen.getByRole('button', { name: '続ける' }));

        expect(screen.getByText('0', { selector: '[data-stat="moves"]' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ボトル 1、6\/8/ })).toBeInTheDocument();
        expect(generation.generate).toHaveBeenCalledTimes(1);
    });

    it('executes a confirmed new puzzle', async () => {
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        fireEvent.click(screen.getByRole('button', { name: '新しい問題' }));
        fireEvent.click(screen.getByRole('button', { name: '続ける' }));
        await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(2));
    });

    it('generates star mode with capacity ten', async () => {
        renderPage();
        await screen.findByRole('button', { name: /ボトル 1/ });
        fireEvent.click(screen.getByRole('button', { name: '星' }));
        await waitFor(() => expect(generation.generate).toHaveBeenLastCalledWith('star', expect.any(Number)));
        expect(await screen.findByText('星モード')).toBeInTheDocument();
        const starBottle = screen.getByRole('button', { name: /ボトル 1、10\/10、上から紫1層、青9層/ });
        expect(starBottle.querySelectorAll('[data-layer-slot]')).toHaveLength(10);
        expect(screen.getByTestId('color-sort-board').querySelectorAll('[data-color-token]')).toHaveLength(50);
    });

    it('switches from star mode back to a newly numbered normal puzzle', async () => {
        renderPage();
        await screen.findByRole('button', { name: /ボトル 1/ });
        fireEvent.click(screen.getByRole('button', { name: '星' }));
        await screen.findByText('星モード');
        fireEvent.click(screen.getByRole('button', { name: '星' }));

        await waitFor(() => expect(generation.generate).toHaveBeenLastCalledWith('normal', expect.any(Number)));
        expect(screen.queryByText('星モード')).not.toBeInTheDocument();
        expect(screen.getByText('2', { selector: '[data-stat="puzzle"]' })).toBeInTheDocument();
    });

    it('shows recovery status when the client uses a fallback', async () => {
        generation.generate.mockResolvedValue({ puzzle: normalPuzzle, usedFallback: true });
        renderPage();
        expect(await screen.findByRole('status')).toHaveTextContent('安全な予備問題を読み込みました');
    });

    it('opens the result actions when the final move solves the board', async () => {
        generation.generate.mockResolvedValue({ puzzle: oneMovePuzzle, usedFallback: false });
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        expect(screen.getByRole('dialog', { name: '完成しました' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '次の問題' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'シェア' })).toBeEnabled();
    });

    it('keeps a solved board and sharing enabled after the result dialog closes', async () => {
        generation.generate.mockResolvedValue({ puzzle: oneMovePuzzle, usedFallback: false });
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /ボトル 1/ }));
        fireEvent.click(screen.getByRole('button', { name: /ボトル 5/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('完成しました');
        expect(screen.getByRole('button', { name: 'シェア' })).toBeEnabled();
        expect(screen.getByRole('button', { name: /ボトル 6/ })).toBeDisabled();
    });
});
