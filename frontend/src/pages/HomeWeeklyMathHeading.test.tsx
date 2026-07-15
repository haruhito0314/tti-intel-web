import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Home } from './Home';

const { weeklyMathProblem } = vi.hoisted(() => ({
    weeklyMathProblem: {
        weekKey: '2026-W29',
        title: '経路の場合の数',
        problem: 'テスト用の問題文',
        problemPublished: true,
    },
}));

vi.mock('@/lib/weeklyMath', () => ({
    getDefaultWeeklyMathProblem: () => weeklyMathProblem,
    getCachedHomeWeeklyMath: () => weeklyMathProblem,
    getHomeWeeklyMath: vi.fn().mockResolvedValue(weeklyMathProblem),
    toPublicWeeklyMathKey: (weekKey: string) => weekKey,
}));

vi.stubGlobal('ResizeObserver', class ResizeObserverMock {
    observe() { return undefined; }
    unobserve() { return undefined; }
    disconnect() { return undefined; }
});

describe('Homeの今週の数学', () => {
    it('Apple系ブルーのセクション見出しと一段小さい問題タイトルを表示する', () => {
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: '今週の数学', level: 2 })).toHaveClass(
            'text-[#0071E3]',
            'dark:text-[#5CABFF]',
        );
        expect(screen.getByRole('heading', { name: '経路の場合の数', level: 3 })).toHaveClass(
            'text-[22px]',
            'sm:text-[28px]',
        );
    });
});
