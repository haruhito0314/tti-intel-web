import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyMathDetail } from './WeeklyMathDetail';

vi.mock('@/lib/weeklyMath', async () => {
    const actual = await vi.importActual<typeof import('@/lib/weeklyMath')>('@/lib/weeklyMath');
    return {
        ...actual,
        getWeeklyMath: vi.fn().mockResolvedValue({
            weekKey: 'sample-problem',
            title: '標本問題',
            problem: '問題文',
            hint: 'ここが公開ヒントです。',
            problemPublished: true,
            solutionPublished: true,
        }),
    };
});

describe('WeeklyMathDetail hint', () => {
    it('reveals and hides a saved hint from a secondary action beside the solution link', async () => {
        render(
            <MemoryRouter initialEntries={['/weekly-math/sample-problem']}>
                <Routes>
                    <Route path="/weekly-math/:weekKey" element={<WeeklyMathDetail />} />
                </Routes>
            </MemoryRouter>,
        );

        const hintButton = await screen.findByRole('button', { name: 'ヒント' });
        const solutionLink = screen.getByRole('link', { name: /解説を見る/ });

        expect(solutionLink.parentElement).toBe(hintButton.parentElement);
        expect(hintButton.nextElementSibling).toBe(solutionLink);
        expect(hintButton).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('ここが公開ヒントです。')).not.toBeInTheDocument();

        fireEvent.click(hintButton);

        expect(hintButton).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('heading', { name: 'ヒント' })).toBeInTheDocument();
        expect(screen.getByText('ここが公開ヒントです。')).toBeInTheDocument();

        fireEvent.click(hintButton);

        expect(hintButton).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('ここが公開ヒントです。')).not.toBeInTheDocument();
    });
});
