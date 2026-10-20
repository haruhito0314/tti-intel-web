import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Home } from './Home';
import { News } from './News';
import { NewsDetail } from './NewsDetail';

// Announcement checks do not need a live Firestore request from the home page.
vi.mock('@/lib/weeklyMath', async (importOriginal) => ({
    ...await importOriginal<typeof import('@/lib/weeklyMath')>(),
    getCachedHomeWeeklyMath: () => null,
    getHomeWeeklyMath: vi.fn().mockResolvedValue(null),
}));

vi.stubGlobal('ResizeObserver', class ResizeObserverMock {
    observe() { return undefined; }
    unobserve() { return undefined; }
    disconnect() { return undefined; }
});

describe('お知らせの共通表示', () => {
    it('トップページのお知らせカテゴリは固定状態に関係なく同じ色で表示する', () => {
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>,
        );

        const announcementLink = screen.getByRole('link', { name: /サイト内AI Assistantを公開しました/ });
        const welcomeLink = screen.getByRole('link', { name: /TTI Intelligenceへようこそ/ });

        [announcementLink, welcomeLink].forEach((postLink) => {
            expect(within(postLink).getByText('お知らせ')).toHaveClass(
                'bg-[#0071E3]/10',
                'text-[#004C99]',
            );
        });
    });

    it('既存記事の内部リンクを表示する', () => {
        render(
            <MemoryRouter initialEntries={['/news/welcome-to-tti-intelligence']}>
                <Routes>
                    <Route path="/news/:slug" element={<NewsDetail />} />
                </Routes>
            </MemoryRouter>,
        );

        const contactLink = screen.getByRole('link', { name: 'お問い合わせページ' });
        expect(contactLink).toHaveAttribute('href', '/contact');
        expect(contactLink).toHaveClass('text-[#0071E3]');
        expect(contactLink).not.toHaveClass('bg-[#0066CC]', 'w-full');
    });
});

describe('AI Assistant公開のお知らせ', () => {
    const title = 'サイト内AI Assistantを公開しました';
    const path = '/news/ai-assistant-launched';

    it('トップと一覧から新しいお知らせへ移動できる', () => {
        const { unmount } = render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>,
        );
        expect(screen.getByRole('link', { name: new RegExp(title) }))
            .toHaveAttribute('href', path);
        unmount();

        render(
            <MemoryRouter>
                <News />
            </MemoryRouter>,
        );
        expect(screen.getByRole('link', { name: new RegExp(title) }))
            .toHaveAttribute('href', path);
        expect(screen.getByText(/サイト内の案内をチャットで聞ける/)).toBeInTheDocument();
    });

    it('記事詳細に案内内容を表示し、内部技術の話は含めない', () => {
        render(
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/news/:slug" element={<NewsDetail />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '使い方' })).toBeInTheDocument();
        expect(screen.getByText(/画面右下のボタンから/)).toBeInTheDocument();
        expect(screen.queryByText(/Lambda|OpenAI|Dynamo|API Gateway|CORS/i)).not.toBeInTheDocument();
    });
});
