import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevHeroScene1 } from './DevHeroScene1';

vi.mock('./useDesktopFloatCards', () => ({
    useDesktopFloatCards: vi.fn(),
}));

import { useDesktopFloatCards } from './useDesktopFloatCards';

const mockedUseDesktopFloatCards = vi.mocked(useDesktopFloatCards);

describe('DevHeroScene1 float cards', () => {
    beforeEach(() => {
        mockedUseDesktopFloatCards.mockReset();
    });

    it('does not render float cards on non-desktop viewports', () => {
        mockedUseDesktopFloatCards.mockReturnValue(false);

        render(<DevHeroScene1 copyIndex={0} />);

        expect(screen.queryByText('> テストを書いて')).not.toBeInTheDocument();
        expect(document.querySelectorAll('.dev-float-tool-card')).toHaveLength(0);
    });

    it('renders all float cards on desktop', () => {
        mockedUseDesktopFloatCards.mockReturnValue(true);

        render(<DevHeroScene1 copyIndex={0} />);

        expect(screen.getByText('> 要件を整理して')).toBeInTheDocument();
        expect(screen.getByText('> コンポーネントを追加')).toBeInTheDocument();
        expect(screen.getByText('> テストを書いて')).toBeInTheDocument();
        expect(document.querySelectorAll('.dev-float-tool-card')).toHaveLength(3);
    });

    it('applies scattered placement to the Codex card', () => {
        mockedUseDesktopFloatCards.mockReturnValue(true);

        render(<DevHeroScene1 copyIndex={0} />);

        const codexCard = screen.getByText('> テストを書いて').closest('.dev-float-tool-card');
        expect(codexCard).toHaveStyle({ bottom: '19%', right: '8%' });
        expect(codexCard).toHaveStyle({ transform: 'rotate(-2deg)' });
    });
});
