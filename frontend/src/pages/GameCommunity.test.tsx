import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GameCommunity } from './GameCommunity';

vi.hoisted(() => {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }),
    });
});

describe('Game Community の静かな手書き表現', () => {
    it('ページ全体を自動フェードさせず、主要な見出しとラベルを手書きで表示する', () => {
        const { container } = render(
            <MemoryRouter>
                <GameCommunity />
            </MemoryRouter>,
        );

        expect(container.firstElementChild).toHaveClass('game-community');
        expect(container.firstElementChild).not.toHaveClass('animate-fade-in');
        expect(screen.getByRole('heading', { name: 'Game Community', level: 1 })).toHaveClass(
            'game-handwritten',
        );
        expect(screen.getByRole('heading', { name: 'Featured Games', level: 2 })).toHaveClass(
            'game-handwritten',
        );
        expect(screen.getByRole('heading', { name: 'Play Style', level: 2 })).toHaveClass(
            'game-handwritten',
        );
        expect(screen.getByRole('link', { name: 'Discordに参加する' })).toHaveClass(
            'game-handwritten',
        );
    });
});
