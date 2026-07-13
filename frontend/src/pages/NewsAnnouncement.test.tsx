import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Home } from './Home';
import { News } from './News';
import { NewsDetail } from './NewsDetail';

const announcementTitle = 'Web開発をゼロから学べるサイトを公開しました';
const announcementPath = '/news/web-development-tutorial-released';

vi.stubGlobal('ResizeObserver', class ResizeObserverMock {
    observe() { return undefined; }
    unobserve() { return undefined; }
    disconnect() { return undefined; }
});

describe('Web開発学習サイト公開のお知らせ', () => {
    it('トップページから新しいお知らせへ移動できる', () => {
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>,
        );

        expect(screen.getByRole('link', { name: new RegExp(announcementTitle) }))
            .toHaveAttribute('href', announcementPath);
    });

    it('お知らせ一覧にタイトル、概要、タグを表示する', () => {
        render(
            <MemoryRouter>
                <News />
            </MemoryRouter>,
        );

        const announcementLink = screen.getByRole('link', { name: new RegExp(announcementTitle) });
        expect(announcementLink).toHaveAttribute('href', announcementPath);
        expect(screen.getByText(/プログラミング未経験者が、ブラウザで教材を読みながら/)).toBeInTheDocument();
        expect(within(announcementLink).getByText('#Web開発')).toBeInTheDocument();
        expect(within(announcementLink).getByText('#学習教材')).toBeInTheDocument();
    });

    it('記事詳細に学習サイトへの安全な外部リンクを表示する', () => {
        render(
            <MemoryRouter initialEntries={[announcementPath]}>
                <Routes>
                    <Route path="/news/:slug" element={<NewsDetail />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: announcementTitle, level: 1 })).toBeInTheDocument();
        expect(screen.getByText(/HTML・CSS・JavaScriptなどを順番に学べます/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '学習サイトを開く' })).toHaveAttribute(
            'href',
            'https://build-tutorial.vercel.app',
        );
        expect(screen.getByRole('link', { name: '学習サイトを開く' })).toHaveAttribute('target', '_blank');
        expect(screen.getByRole('link', { name: '学習サイトを開く' })).toHaveAttribute(
            'rel',
            'noopener noreferrer',
        );
    });
});
