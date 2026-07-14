# About 活動カード画像の再設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aboutページの活動カードを、画像内の主役と文字・ボタンが重ならないライト／ダーク対応の画像へ置き換える。

**Architecture:** `About.tsx`の各活動データへテーマ別画像パスと文字の安全配置クラスを持たせる。`useTheme()`の`resolvedTheme`により、テーマに対応する画像を1枚だけ描画する。既存の2×2デスクトップグリッドと1列モバイルグリッドを保ち、局所グラデーションだけで画像内の文字を読みやすくする。

**Tech Stack:** React 19、TypeScript 5.9、React Router、ThemeContext、CSS、Vitest、Testing Library、WebP

## Global Constraints

- PCでは4カードを2列×2行、スマートフォンでは1列で縦に4枚表示する。
- タイトル、説明、ボタンは画像内に残す。
- 画像内のPC、モニター、コントローラー、タブレットなどの主役と、HTMLの文字・ボタンを重ねない。
- 4カードそれぞれにライト用・ダーク用のWebPを用意し、合計8枚とする。
- ライト用とダーク用は主役と構図を揃え、ダーク用は暗い画面でも主役の輪郭を見分けられるようにする。
- 画像にタイトル、説明、ボタンの文字を描かない。
- テーマ切り替え時は現在のテーマの画像だけを描画し、代替テキストは1回だけ提供する。
- 既存の活動名、説明、ボタン文言、リンク先は変更しない。
- 文字側だけにグラデーションを敷き、画像全体は覆わない。

---

### Task 1: テーマ別画像の選択を実装する

**Files:**
- Create: `frontend/src/pages/AboutActivityCards.test.tsx`
- Modify: `frontend/src/pages/About.tsx:1-92,105-179`

**Interfaces:**
- Consumes: `useTheme(): { resolvedTheme: 'light' | 'dark' }`
- Produces: `images: { light: string; dark: string }`と、現在のテーマに対応する`<img className="activity-visual">`

- [ ] **Step 1: テーマ別画像と既存リンクを要求する失敗テストを書く**

`frontend/src/pages/AboutActivityCards.test.tsx`を作成する。

```tsx
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
});
```

- [ ] **Step 2: focused testが旧PNGを検出して失敗することを確認する**

Run:

```bash
cd frontend
set -a
source .env
source .env.local
set +a
npm test -- src/pages/AboutActivityCards.test.tsx
```

Expected: 現行の`/images/about/*-card.png`が表示されるためFAILする。

- [ ] **Step 3: テーマ別画像データと画像選択を実装する**

`About.tsx`へ次を追加する。

```tsx
import { useTheme } from '@/contexts/useTheme';
```

各活動データの`image`を次の形式へ置換する。4つの`filePrefix`は`activity-video`、`activity-development`、`activity-game`、`activity-math`とする。

```tsx
images: {
    light: '/images/about/activity-video-light.webp',
    dark: '/images/about/activity-video-dark.webp',
},
copyPosition: 'activity-copy--top-left',
```

動画・開発・ゲームは`activity-copy--top-left`、数学は`activity-copy--bottom-right`にする。`About`の先頭に次を追加する。

```tsx
const { resolvedTheme } = useTheme();
```

カードのクラスと画像を次へ置換する。

```tsx
className={`activity-card ${item.cardClass} ${item.copyPosition}`}
```

```tsx
<img
    className="activity-visual"
    src={item.images[resolvedTheme]}
    alt={item.imageAlt}
    width={1600}
    height={1024}
    loading="lazy"
/>
```

- [ ] **Step 4: focused testが通ることを確認する**

Run: `cd frontend && npm test -- src/pages/AboutActivityCards.test.tsx`

Expected: `3 passed`。

- [ ] **Step 5: 実装をコミットする**

```bash
git add frontend/src/pages/About.tsx frontend/src/pages/AboutActivityCards.test.tsx
git commit -m "Add theme-aware About activity images"
```

---

### Task 2: 安全領域を持つ8枚のWebP画像を追加する

**Files:**
- Create: `frontend/public/images/about/activity-{video,development,game,math}-{light,dark}.webp`
- Delete: `frontend/public/images/about/video-card.png`
- Delete: `frontend/public/images/about/dev-card.png`
- Delete: `frontend/public/images/about/game-card.png`
- Delete: `frontend/public/images/about/math-card.png`

**Interfaces:**
- Consumes: Task 1の正確な8つの画像パスと各カードの代替テキスト
- Produces: 1600×1024のWebP画像8枚。画像内に文字・ロゴ・UIラベル・ボタンは含めない。

- [ ] **Step 1: 8画像を生成する**

各画像に次の共通条件を指定する。

```text
16:10 landscape web card image, 1600 by 1024 composition, no text, no letters, no logos, no UI labels, no buttons. Preserve a clear empty safe area for HTML overlay copy. Keep the hero subject away from that safe area. Polished editorial technology photography, realistic but clean, no people.
```

ライト／ダークは同じ主役と構図にする。動画・開発・ゲームは左上を安全領域、数学は右下を安全領域にする。

| 接頭辞 | 主役 | ライト背景 | ダーク背景 |
| --- | --- | --- | --- |
| `activity-video` | 動画編集モニター、マイク、キーボード、トラックパッド | 温かい白と淡いグレー | 深いチャコールと控えめなモニター光 |
| `activity-development` | コードエディタを表示したノートPC | 淡い青と白 | 深いネイビーと青い画面光 |
| `activity-game` | ゲームコントローラーとヘッドセット | ミントと明るいグレー | 深いティールと控えめなシアン光 |
| `activity-math` | 数学の図形を表示したタブレットとペン | 薄いラベンダーと白 | 深い紫と控えめなバイオレット光 |

生成結果を次のパスへ保存する。

```text
frontend/public/images/about/activity-video-light.webp
frontend/public/images/about/activity-video-dark.webp
frontend/public/images/about/activity-development-light.webp
frontend/public/images/about/activity-development-dark.webp
frontend/public/images/about/activity-game-light.webp
frontend/public/images/about/activity-game-dark.webp
frontend/public/images/about/activity-math-light.webp
frontend/public/images/about/activity-math-dark.webp
```

- [ ] **Step 2: 画像寸法と旧PNG参照を検証する**

Run:

```bash
sips -g pixelWidth -g pixelHeight frontend/public/images/about/activity-*.webp
rg -n "(video-card|dev-card|game-card|math-card)\\.png" frontend
```

Expected: 8画像がすべて`pixelWidth: 1600`、`pixelHeight: 1024`で、旧PNGの参照は0件。

- [ ] **Step 3: 旧PNGを削除して画像をコミットする**

```bash
git add frontend/public/images/about
git commit -m "Refresh About activity card artwork"
```

---

### Task 3: 画像内コピーを安全領域へ限定する

**Files:**
- Modify: `frontend/src/index.css:643-945`
- Modify: `frontend/src/pages/AboutActivityCards.test.tsx`

**Interfaces:**
- Consumes: `activity-copy--top-left`、`activity-copy--bottom-right`、Task 2の安全領域を持つ画像
- Produces: PC 2×2、スマートフォン1列、主役を覆わない局所グラデーション

- [ ] **Step 1: カードごとの安全配置クラスを要求する失敗テストを書く**

`AboutActivityCards.test.tsx`のライトテーマテストへ次を追加する。

```tsx
        expect(screen.getByRole('heading', { name: '解説動画', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
        expect(screen.getByRole('heading', { name: '開発', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
        expect(screen.getByRole('heading', { name: 'ゲーム交流', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
        expect(screen.getByRole('heading', { name: '今週の数学', level: 3 }).closest('article')).toHaveClass('activity-copy--bottom-right');
```

- [ ] **Step 2: focused testが旧配置クラスのため失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/AboutActivityCards.test.tsx`

Expected: 現行の`text-top`または`text-bottom`クラスによりFAILする。

- [ ] **Step 3: PC・スマートフォン用の安全領域CSSを実装する**

`index.css`の`text-top`／`text-bottom`ルールを削除し、次を追加する。

```css
.activity-copy--top-left .activity-copy {
  top: 34px;
  left: 34px;
  right: auto;
  width: min(48%, 340px);
  text-align: left;
}

.activity-copy--bottom-right .activity-copy {
  right: 34px;
  bottom: 34px;
  left: auto;
  width: min(48%, 340px);
  text-align: right;
}

.activity-copy--top-left::after {
  opacity: 1;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.76) 0%, rgba(255, 255, 255, 0.28) 42%, transparent 62%);
}

.activity-copy--bottom-right::after {
  opacity: 1;
  background: linear-gradient(315deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.26) 42%, transparent 66%);
}

.dark .activity-copy--top-left::after {
  background: linear-gradient(90deg, rgba(9, 20, 38, 0.62) 0%, rgba(9, 20, 38, 0.22) 42%, transparent 62%);
}

.dark .activity-copy--bottom-right::after {
  background: linear-gradient(315deg, rgba(9, 20, 38, 0.66) 0%, rgba(9, 20, 38, 0.22) 42%, transparent 66%);
}

@media (max-width: 820px) {
  .activities-grid { grid-template-columns: 1fr; }
  .activity-copy--top-left .activity-copy,
  .activity-copy--bottom-right .activity-copy {
    right: 24px;
    left: 24px;
    width: auto;
    text-align: left;
  }
  .activity-copy--top-left .activity-copy { top: 28px; }
  .activity-copy--bottom-right .activity-copy { right: 24px; bottom: 28px; left: 24px; }
}
```

- [ ] **Step 4: focused testが通ることを確認する**

Run: `cd frontend && npm test -- src/pages/AboutActivityCards.test.tsx`

Expected: `3 passed`。

- [ ] **Step 5: 目視確認、全体検証、コミットを行う**

`/about`を1280×720と390×844、ライト・ダークで確認する。1280pxでは2×2、390pxでは1列4枚で、すべての文字とボタンが画像内にあり主役と重ならず、横スクロールとコンソールエラーがないことを確認する。

Run:

```bash
cd frontend
set -a
source .env
source .env.local
set +a
npm test
npx eslint src/pages/About.tsx src/pages/AboutActivityCards.test.tsx
npm run build
```

Expected: 全テストがPASSし、対象ESLintは0 errors / 0 warnings、Viteのプロダクションビルドが成功する。

```bash
git add frontend/src/index.css frontend/src/pages/AboutActivityCards.test.tsx
git commit -m "Keep About activity copy clear of artwork"
```
