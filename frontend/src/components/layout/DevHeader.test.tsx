import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DevHeader } from './DevHeader';

beforeAll(() => {
    const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
        configurable: true,
    });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
});

function renderDevHeader() {
    return render(
        <ThemeProvider>
            <MemoryRouter>
                <DevHeader />
            </MemoryRouter>
        </ThemeProvider>,
    );
}

describe('DevHeader', () => {
    it('does not render a separate bar background while the mobile menu is closed', () => {
        const { container } = renderDevHeader();

        expect(container.querySelector('.dev-header-bar-bg')).not.toBeInTheDocument();
    });

    it('keeps the full-screen mobile menu background when the menu is open', () => {
        const { container } = renderDevHeader();

        fireEvent.click(screen.getByRole('button', { name: 'メニューを開く' }));

        expect(container.querySelector('.dev-header-mobile-bg')).toBeInTheDocument();
    });
});
