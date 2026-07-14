import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PUZZLE_MODE_CONFIGS } from './config';
import { ColorSortBoard } from './ColorSortBoard';
import type { Puzzle } from './types';

const puzzle: Puzzle = [
    ['sky', 'sky'],
    ['mint'],
    Array.from({ length: 8 }, () => 'coral' as const),
    [],
    ['sun'],
    [],
];

const defaultProps = {
    puzzle,
    config: PUZZLE_MODE_CONFIGS.normal,
    selectedIndex: null,
    legalTargets: [] as number[],
    status: '',
    disabled: false,
    onBottleClick: () => undefined,
};

describe('ColorSortBoard', () => {
    it('renders a non-scrolling 3-by-2 grid through tablet and a 6-by-1 grid only at lg', () => {
        render(<ColorSortBoard {...defaultProps} />);

        const board = screen.getByTestId('color-sort-board');
        expect(board).toHaveClass('grid-cols-3', 'grid-rows-2', 'lg:grid-cols-6', 'lg:grid-rows-1');
        expect(board.closest('section')).toHaveClass('w-full', 'min-w-0', 'overflow-x-clip');
        expect(board.className).not.toMatch(/(?:sm|md):grid-(?:cols|rows)-/);
    });

    it('keeps every bottle within the exact responsive size, hit-area, and motion contracts', () => {
        render(<ColorSortBoard {...defaultProps} />);

        const bottle = screen.getByRole('button', { name: /ボトル 1/ });
        expect(bottle).toHaveClass(
            'min-h-11',
            'min-w-11',
            '[width:clamp(52px,18vw,68px)]',
            '[height:clamp(136px,28svh,190px)]',
            'duration-200',
            'motion-reduce:transition-none',
        );
    });

    it('renders exactly one layer slot per unit of mode capacity', () => {
        const { rerender } = render(<ColorSortBoard {...defaultProps} />);

        expect(screen.getByRole('button', { name: /ボトル 1/ }).querySelectorAll('[data-layer-slot]')).toHaveLength(8);

        rerender(<ColorSortBoard {...defaultProps} config={PUZZLE_MODE_CONFIGS.star} />);
        expect(screen.getByRole('button', { name: /ボトル 1/ }).querySelectorAll('[data-layer-slot]')).toHaveLength(10);
    });

    it('exposes selected, target, completed, and content states without color alone', () => {
        render(
            <ColorSortBoard
                {...defaultProps}
                selectedIndex={0}
                legalTargets={[3]}
                status="注ぎ先を選択"
            />,
        );

        const selected = screen.getByRole('button', { name: /ボトル 1.*上から青2層.*選択中/ });
        expect(selected).toHaveAttribute('aria-pressed', 'true');
        expect(selected).toHaveTextContent('選択中');
        expect(screen.getByRole('button', { name: /ボトル 4.*注げます/ })).toHaveTextContent('✓');
        expect(screen.getByRole('button', { name: /ボトル 3.*完成/ })).toBeDisabled();

        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
        expect(status).toHaveTextContent('注ぎ先を選択');
    });

    it('uses source-tap then destination-tap buttons without a drag interaction', () => {
        const onBottleClick = vi.fn();
        render(<ColorSortBoard {...defaultProps} onBottleClick={onBottleClick} />);

        const source = screen.getByRole('button', { name: /ボトル 1/ });
        const destination = screen.getByRole('button', { name: /ボトル 4/ });
        expect(source).not.toHaveAttribute('draggable');
        expect(destination).not.toHaveAttribute('draggable');

        fireEvent.click(source);
        fireEvent.click(destination);
        expect(onBottleClick).toHaveBeenNthCalledWith(1, 0);
        expect(onBottleClick).toHaveBeenNthCalledWith(2, 3);
    });
});
