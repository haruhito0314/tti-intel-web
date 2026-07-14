import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { About } from './About';

const activityImages = [
    ['動画編集用のモニター、マイク、キーボード、トラックパッド', 'activity-video'],
    ['コードエディタを表示したノートPC', 'activity-development'],
    ['ゲームコントローラーとヘッドセット', 'activity-game'],
    ['数学の図形が表示されたタブレットとペン', 'activity-math'],
] as const;

function renderAbout(theme: 'light' | 'dark') {
    localStorage.setItem('tti-ai-theme', theme);
    return render(<MemoryRouter><ThemeProvider><About /></ThemeProvider></MemoryRouter>);
}

beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
});

describe('About活動カード', () => {
    it.each(['light', 'dark'] as const)('%sテーマに対応する4画像を表示する', (theme) => {
        renderAbout(theme);

        activityImages.forEach(([alt, filePrefix]) => {
            expect(screen.getByRole('img', { name: alt })).toHaveAttribute(
                'src',
                `/images/about/${filePrefix}-${theme}.webp`,
            );
        });
    });

    it('既存の活動リンクを維持する', () => {
        renderAbout('light');
        expect(screen.getByRole('link', { name: 'YouTubeを見る' })).toHaveAttribute('href', 'https://www.youtube.com/@ttiintelligence');
        expect(screen.getByRole('link', { name: 'アプリケーション' })).toHaveAttribute('href', '/app');
        expect(screen.getByRole('link', { name: '開発について' })).toHaveAttribute('href', '/development');
        expect(screen.getByRole('link', { name: '詳しく見る' })).toHaveAttribute('href', '/game-community');
        expect(screen.getByRole('link', { name: '問題を見る' })).toHaveAttribute('href', '/weekly-math');
    });

    it('活動カードごとに画像の安全領域へコピーを配置する', () => {
        renderAbout('light');

        expect(screen.getByRole('heading', { name: '解説動画', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
        expect(screen.getByRole('heading', { name: '開発', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
        expect(screen.getByRole('heading', { name: 'ゲーム交流', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
        expect(screen.getByRole('heading', { name: '今週の数学', level: 3 }).closest('article')).toHaveClass('activity-copy--bottom-right');
    });
});
