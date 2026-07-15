import { render, screen } from '@testing-library/react';
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
    it('shows a saved hint on the public problem page', async () => {
        render(
            <MemoryRouter initialEntries={['/weekly-math/sample-problem']}>
                <Routes>
                    <Route path="/weekly-math/:weekKey" element={<WeeklyMathDetail />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(await screen.findByRole('heading', { name: 'ヒント' })).toBeInTheDocument();
        expect(screen.getByText('ここが公開ヒントです。')).toBeInTheDocument();
    });
});
