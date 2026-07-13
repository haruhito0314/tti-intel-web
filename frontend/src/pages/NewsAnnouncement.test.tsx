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

    it('記事詳細に詳しい説明、2枚の画像、安全な外部リンクを順番に表示する', () => {
        render(
            <MemoryRouter initialEntries={[announcementPath]}>
                <Routes>
                    <Route path="/news/:slug" element={<NewsDetail />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: announcementTitle, level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '未経験からWebアプリの公開まで' })).toBeInTheDocument();
        const chaptersHeading = screen.getByRole('heading', { name: '27章で段階的に学べます' });
        expect(chaptersHeading).toBeInTheDocument();
        expect(screen.getByText('AWS CDK・Lambda・DynamoDB・Cognito')).toBeInTheDocument();
        expect(screen.getByText(/学習状況はブラウザに保存され、途中から再開できます/)).toBeInTheDocument();
        expect(screen.getByText(/空のフォルダから自分の力でWebアプリを完成させる卒業課題/)).toBeInTheDocument();

        const dashboardImage = screen.getByRole('img', {
            name: '27章の進捗と次に学ぶ章を確認できる学習ダッシュボード',
        });
        const lessonImage = screen.getByRole('img', {
            name: '第4章HTML教材の本文と目次を表示した学習画面',
        });
        expect(dashboardImage).toHaveAttribute('src', '/images/web-tutorial-dashboard.webp');
        expect(lessonImage).toHaveAttribute('src', '/images/web-tutorial-html-lesson.webp');
        expect(dashboardImage).toHaveAttribute('loading', 'lazy');
        expect(lessonImage).toHaveAttribute('loading', 'lazy');
        expect(dashboardImage).toHaveAttribute('width', '1280');
        expect(dashboardImage).toHaveAttribute('height', '720');
        expect(lessonImage).toHaveAttribute('width', '1280');
        expect(lessonImage).toHaveAttribute('height', '720');
        expect(dashboardImage).toHaveClass('w-full', 'h-auto');
        expect(lessonImage).toHaveClass('w-full', 'h-auto');
        expect(screen.getByText('学習状況と次に進む章を一目で確認できるダッシュボード。'))
            .toBeInTheDocument();
        expect(screen.getByText('章の目標、解説、手順、目次を確認しながら学習できます。'))
            .toBeInTheDocument();

        const tutorialLink = screen.getByRole('link', { name: '学習サイトを開く' });
        expect(tutorialLink).toHaveAttribute('href', 'https://build-tutorial.vercel.app');
        expect(tutorialLink).toHaveAttribute('target', '_blank');
        expect(tutorialLink).toHaveAttribute('rel', 'noopener noreferrer');
        const contentSequence = [dashboardImage, chaptersHeading, lessonImage, tutorialLink];
        contentSequence.slice(0, -1).forEach((element, index) => {
            expect(element.compareDocumentPosition(contentSequence[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING)
                .toBeTruthy();
        });
    });
});
