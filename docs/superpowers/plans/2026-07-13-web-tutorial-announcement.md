# Web開発学習サイト公開のお知らせ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TTI Intelligenceのトップページ、お知らせ一覧、記事詳細に、Web開発学習サイトの詳しい公開案内、2枚のスクリーンショット、外部リンクを掲載する。

**Architecture:** 既存の静的記事データ構造を維持し、`Home.tsx`、`News.tsx`、`NewsDetail.tsx`へ同一のお知らせ情報を追加する。記事詳細はReact Markdownの画像描画をレスポンシブに整え、サイト内へ保存した2枚のWebPを本文の指定位置へ埋め込む。新しいデータ層や依存関係は導入しない。

**Tech Stack:** React 19、TypeScript 5.9、React Router、React Markdown、Vitest、Testing Library

## Global Constraints

- タイトルは `Web開発をゼロから学べるサイトを公開しました` とする。
- 公開日は `2026-07-13`、カテゴリは `お知らせ`、タグは `Web開発` と `学習教材` とする。
- 学習サイトURLは `https://build-tutorial.vercel.app` とする。
- 既存の「TTI Intelligenceへようこそ！」は固定記事として維持する。
- 外部リンクは新しいタブで開き、`noopener noreferrer`を付ける。
- 記事管理方式の共通化やCMS化は実施しない。
- 記事本文は承認済みの約500〜700文字とし、全27章、学習範囲、進捗保存、リセット、卒業課題を説明する。
- 1280×720の学習ダッシュボードと第4章教材画面をWebP形式でサイト内へ保存する。
- 2画像は本文幅いっぱいの縦並びとし、角丸、枠線、日本語の代替テキスト、短い説明を付ける。
- トップページとお知らせ一覧のカードには画像を追加しない。
- 記事末尾に `全27章・ブラウザですぐ読めます` と表示し、学習サイトURLのリンク文言を `無料でWeb開発を学び始める` とする。
- 学習サイトURLだけを青背景・白文字・角丸・外部リンクアイコン付きCTAにし、スマートフォンでは本文幅いっぱい、PCでは自動幅とする。
- CTAはhoverとkeyboard focusを視覚的に示し、既存記事のほかのリンク表示は変更しない。

---

### Task 1: 公開のお知らせを3つの表示場所へ追加する

**Files:**
- Create: `frontend/src/pages/NewsAnnouncement.test.tsx`
- Modify: `frontend/src/pages/Home.tsx:17-28`
- Modify: `frontend/src/pages/News.tsx:8-21`
- Modify: `frontend/src/pages/NewsDetail.tsx:17-65`

**Interfaces:**
- Consumes: React Routerの`MemoryRouter`、`Routes`、`Route`と、既存の`Home`、`News`、`NewsDetail`コンポーネント
- Produces: slug `web-development-tutorial-released` のお知らせ詳細ページ、および `https://build-tutorial.vercel.app` への外部リンク

- [ ] **Step 1: 3つの掲載場所を検証する失敗テストを書く**

`frontend/src/pages/NewsAnnouncement.test.tsx`を作成する。

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Home } from './Home';
import { News } from './News';
import { NewsDetail } from './NewsDetail';

const announcementTitle = 'Web開発をゼロから学べるサイトを公開しました';
const announcementPath = '/news/web-development-tutorial-released';

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
        expect(screen.getByText('#Web開発')).toBeInTheDocument();
        expect(screen.getByText('#学習教材')).toBeInTheDocument();
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
```

- [ ] **Step 2: テストを実行し、記事が未登録のため失敗することを確認する**

Run:

```bash
cd frontend && npm test -- src/pages/NewsAnnouncement.test.tsx
```

Expected: 3件のテストがFAILし、タイトルまたはリンクが見つからない旨が表示される。

- [ ] **Step 3: トップページへ最新のお知らせを追加する**

`frontend/src/pages/Home.tsx`の`latestPosts`先頭へ次の項目を追加する。

```tsx
    {
        id: '2',
        slug: 'web-development-tutorial-released',
        title: 'Web開発をゼロから学べるサイトを公開しました',
        excerpt: 'プログラミング未経験者が、ブラウザで教材を読みながらHTML・CSS・JavaScriptなどを順番に学べるWebサイトを公開しました。',
        publishedAt: '2026-07-13',
        category: 'お知らせ',
        tags: ['Web開発', '学習教材'],
        pinned: false,
    },
```

- [ ] **Step 4: お知らせ一覧へ検索・絞り込み可能な記事データを追加する**

`frontend/src/pages/News.tsx`の`posts`先頭へ次の項目を追加する。

```tsx
    {
        id: '2',
        slug: 'web-development-tutorial-released',
        title: 'Web開発をゼロから学べるサイトを公開しました',
        excerpt: 'プログラミング未経験者が、ブラウザで教材を読みながらHTML・CSS・JavaScriptなどを順番に学べるWebサイトを公開しました。',
        publishedAt: '2026-07-13',
        category: 'お知らせ',
        tags: ['Web開発', '学習教材'],
        pinned: false,
        coverImageUrl: null,
    },
```

- [ ] **Step 5: お知らせ詳細へ説明文と学習サイトへのリンクを追加する**

`frontend/src/pages/NewsDetail.tsx`の`postsData`へ次の項目を追加する。

```tsx
    'web-development-tutorial-released': {
        title: 'Web開発をゼロから学べるサイトを公開しました',
        content: `
## Web開発をこれから始める方へ

プログラミング未経験者が、ブラウザで教材を読みながらWeb開発をゼロから学べるサイトを公開しました。

HTML・CSS・JavaScriptなどを順番に学べます。章ごとの説明と練習問題を通して、自分のペースで進められる学習サイトです。

## 学習サイト

[学習サイトを開く](https://build-tutorial.vercel.app)
    `,
        publishedAt: '2026-07-13',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['Web開発', '学習教材'],
        relatedPosts: [],
    },
```

既存のMarkdown外部リンク描画処理が、HTTPリンクへ`target="_blank"`と`rel="noopener noreferrer"`を設定するため、その処理は変更しない。

- [ ] **Step 6: 新しいお知らせのテストが通ることを確認する**

Run:

```bash
cd frontend && npm test -- src/pages/NewsAnnouncement.test.tsx
```

Expected: `3 passed`。

- [ ] **Step 7: フロントエンド全体を検証する**

Run:

```bash
cd frontend && npm test && npm run lint && npm run build
```

Expected: 全テストがPASSし、ESLintがエラー0件で終了し、Viteのプロダクションビルドが成功する。

- [ ] **Step 8: お知らせ実装だけをコミットする**

```bash
git add frontend/src/pages/Home.tsx frontend/src/pages/News.tsx frontend/src/pages/NewsDetail.tsx frontend/src/pages/NewsAnnouncement.test.tsx docs/superpowers/plans/2026-07-13-web-tutorial-announcement.md
git commit -m "Add web tutorial release announcement"
```

---

### Task 2: 詳細本文と教材スクリーンショットを追加する

**Files:**
- Create: `frontend/public/images/web-tutorial-dashboard.webp`
- Create: `frontend/public/images/web-tutorial-html-lesson.webp`
- Modify: `frontend/src/pages/NewsAnnouncement.test.tsx:41-68`
- Modify: `frontend/src/pages/NewsDetail.tsx:21-42,180-265`

**Interfaces:**
- Consumes: 1280×720の撮影済みPNG `.superpowers/brainstorm/81563-1783942280/content/tutorial-home.png` と `.superpowers/brainstorm/81563-1783942280/content/tutorial-lesson.png`
- Produces: `/images/web-tutorial-dashboard.webp` と `/images/web-tutorial-html-lesson.webp`、詳細化した記事本文、レスポンシブなMarkdown画像描画

- [ ] **Step 1: 詳細本文、画像、表示順を検証する失敗テストを書く**

`frontend/src/pages/NewsAnnouncement.test.tsx`の詳細記事テストを次の内容へ置き換える。

```tsx
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
        expect(screen.getByRole('heading', { name: '27章で段階的に学べます' })).toBeInTheDocument();
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
        expect(dashboardImage).toHaveClass('w-full', 'h-auto');
        expect(lessonImage).toHaveClass('w-full', 'h-auto');
        expect(dashboardImage.compareDocumentPosition(lessonImage) & Node.DOCUMENT_POSITION_FOLLOWING)
            .toBeTruthy();

        const tutorialLink = screen.getByRole('link', { name: '学習サイトを開く' });
        expect(tutorialLink).toHaveAttribute('href', 'https://build-tutorial.vercel.app');
        expect(tutorialLink).toHaveAttribute('target', '_blank');
        expect(tutorialLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
```

- [ ] **Step 2: focused testを実行し、新しい本文と画像が未実装のため失敗することを確認する**

Run:

```bash
cd frontend
set -a
source /Users/haruhito/Documents/Github/web/frontend/.env
source /Users/haruhito/Documents/Github/web/frontend/.env.local
set +a
npm test -- src/pages/NewsAnnouncement.test.tsx
```

Expected: 詳細記事の1件がFAILし、`未経験からWebアプリの公開まで`または画像が見つからないと表示される。トップと一覧の2件はPASSする。

- [ ] **Step 3: 撮影済みPNGをサイト内のWebPへ変換する**

Run:

```bash
cwebp -quiet -q 82 .superpowers/brainstorm/81563-1783942280/content/tutorial-home.png -o frontend/public/images/web-tutorial-dashboard.webp
cwebp -quiet -q 82 .superpowers/brainstorm/81563-1783942280/content/tutorial-lesson.png -o frontend/public/images/web-tutorial-html-lesson.webp
sips -g pixelWidth -g pixelHeight frontend/public/images/web-tutorial-dashboard.webp frontend/public/images/web-tutorial-html-lesson.webp
```

Expected: 2ファイルがWebPとして作成され、どちらも`pixelWidth: 1280`、`pixelHeight: 720`と表示される。

- [ ] **Step 4: 承認済みの詳しい本文と2画像を記事へ追加する**

`frontend/src/pages/NewsDetail.tsx`の`web-development-tutorial-released`本文を次へ置き換える。

```tsx
        content: `
## 未経験からWebアプリの公開まで

プログラミングを初めて学ぶ方が、Web開発を基礎から順番に身につけられる学習サイトを公開しました。

教材を読むために特別なアプリを準備する必要はありません。ブラウザで説明を読み、章を進めながら必要な開発環境を一つずつ導入します。

![27章の進捗と次に学ぶ章を確認できる学習ダッシュボード](/images/web-tutorial-dashboard.webp)

*学習状況と次に進む章を一目で確認できるダッシュボード。*

## 27章で段階的に学べます

教材は第0章から第26章までの全27章です。

- HTML・CSSでWebページを作る基礎
- JavaScript・TypeScriptの文法と非同期処理
- Reactを使った画面、フォーム、ページ遷移
- API通信とデータの保存
- AWS CDK・Lambda・DynamoDB・Cognito
- テスト、セキュリティ、公開、安全な削除

単にコードをコピーするだけでなく、「何をしているのか」「なぜ必要なのか」を確認しながら進められる構成にしています。

![第4章HTML教材の本文と目次を表示した学習画面](/images/web-tutorial-html-lesson.webp)

*章の目標、解説、手順、目次を確認しながら学習できます。*

## 自分のペースで繰り返し学習

各章には説明、確認項目、練習問題、解答があります。学習状況はブラウザに保存され、途中から再開できます。リセット機能を使えば、最初から何度でもやり直せます。

最後には、空のフォルダから自分の力でWebアプリを完成させる卒業課題を用意しています。

Web開発に興味はあるものの、何から始めればよいか分からない方におすすめです。

[学習サイトを開く](https://build-tutorial.vercel.app)
    `,
```

- [ ] **Step 5: Markdown画像を全記事で安全にレスポンシブ表示する**

`ReactMarkdown`の`components`へ、`code`の前に次の`img` rendererを追加する。

```tsx
                            img: ({ src, alt }) => (
                                <img
                                    src={src}
                                    alt={alt ?? ''}
                                    loading="lazy"
                                    className="my-6 block h-auto w-full rounded-2xl border border-black/10 shadow-sm dark:border-white/10"
                                />
                            ),
```

このrendererはサイト内・外部を問わずMarkdown画像を本文幅に収める。画像リンクの許可範囲はReact Markdownの既存動作を維持し、新しいURL処理は追加しない。

- [ ] **Step 6: focused testが通ることを確認する**

Run:

```bash
cd frontend
set -a
source /Users/haruhito/Documents/Github/web/frontend/.env
source /Users/haruhito/Documents/Github/web/frontend/.env.local
set +a
npm test -- src/pages/NewsAnnouncement.test.tsx
```

Expected: `3 passed`。

- [ ] **Step 7: 変更範囲とフロントエンド全体を検証する**

Run:

```bash
cd frontend
set -a
source /Users/haruhito/Documents/Github/web/frontend/.env
source /Users/haruhito/Documents/Github/web/frontend/.env.local
set +a
npm test
npx eslint src/pages/NewsDetail.tsx src/pages/NewsAnnouncement.test.tsx
npm run build
```

Expected: 全58件以上のテストがPASSし、変更ファイルのESLintが0 errors / 0 warnings、Viteのプロダクションビルドが成功する。

- [ ] **Step 8: PCとスマートフォンで詳細ページを目視確認する**

ローカルサイトを起動し、`/news/web-development-tutorial-released`を1280×720と390×844で確認する。

Expected:

- 2画像が縦順で表示される。
- 画像の横幅が本文を超えず、横スクロールがない。
- 画像内のダッシュボードと教材本文を判別できる。
- 画像説明、本文、外部リンクが読みやすい間隔で表示される。
- ブラウザコンソールにエラーがない。

- [ ] **Step 9: 詳細本文と画像をコミットする**

```bash
git add frontend/public/images/web-tutorial-dashboard.webp frontend/public/images/web-tutorial-html-lesson.webp frontend/src/pages/NewsDetail.tsx frontend/src/pages/NewsAnnouncement.test.tsx docs/superpowers/plans/2026-07-13-web-tutorial-announcement.md
git commit -m "Add tutorial screenshots to announcement"
```

---

### Task 3: 学習サイトへのリンクを明確なCTAにする

**Files:**
- Modify: `frontend/src/pages/NewsAnnouncement.test.tsx:43-100`
- Modify: `frontend/src/pages/NewsDetail.tsx:1-8,70-75,272-306`

**Interfaces:**
- Consumes: `https://build-tutorial.vercel.app`へのReact Markdown外部リンクとLucideの`ExternalLink`アイコン
- Produces: 補足文`全27章・ブラウザですぐ読めます`、CTA文言`無料でWeb開発を学び始める`、学習サイトURLだけに適用するレスポンシブCTA表示

- [ ] **Step 1: CTA文言、表示、既存リンク維持を要求する失敗テストを書く**

`frontend/src/pages/NewsAnnouncement.test.tsx`の詳細記事テスト内で、既存の`学習サイトを開く`リンク取得を次へ置き換える。

```tsx
        expect(screen.getByText('全27章・ブラウザですぐ読めます。')).toBeInTheDocument();
        const tutorialLink = screen.getByRole('link', { name: '無料でWeb開発を学び始める' });
        expect(tutorialLink).toHaveAttribute('href', 'https://build-tutorial.vercel.app');
        expect(tutorialLink).toHaveAttribute('target', '_blank');
        expect(tutorialLink).toHaveAttribute('rel', 'noopener noreferrer');
        expect(tutorialLink).toHaveClass(
            'w-full',
            'sm:w-auto',
            'bg-[#0066CC]',
            'text-white',
            'focus-visible:ring-2',
        );
        expect(tutorialLink.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
```

同じ`describe`へ、既存記事の内部リンクがCTA化されないことを検証するテストを追加する。

```tsx
    it('既存記事の通常リンクはCTAに変更しない', () => {
        render(
            <MemoryRouter initialEntries={['/news/welcome-to-tti-intelligence']}>
                <Routes>
                    <Route path="/news/:slug" element={<NewsDetail />} />
                </Routes>
            </MemoryRouter>,
        );

        const contactLink = screen.getByRole('link', { name: 'お問い合わせページ' });
        expect(contactLink).toHaveAttribute('href', '/contact');
        expect(contactLink).toHaveClass('text-[#0066CC]');
        expect(contactLink).not.toHaveClass('bg-[#0066CC]', 'w-full');
    });
```

- [ ] **Step 2: focused testを実行し、新CTAが未実装のため失敗することを確認する**

Run:

```bash
cd frontend
set -a
source .env
source .env.local
set +a
npm test -- src/pages/NewsAnnouncement.test.tsx
```

Expected: 詳細記事テストがFAILし、`全27章・ブラウザですぐ読めます。`または`無料でWeb開発を学び始める`が見つからないと表示される。既存リンクのテストはPASSする。

- [ ] **Step 3: 記事末尾の補足文とリンク文言を更新する**

`frontend/src/pages/NewsDetail.tsx`の学習サイト記事本文末尾を次へ置き換える。

```markdown
全27章・ブラウザですぐ読めます。

[無料でWeb開発を学び始める](https://build-tutorial.vercel.app)
```

- [ ] **Step 4: 学習サイトURLだけを専用CTAとして描画する**

Lucide importへ`ExternalLink`を追加する。

```tsx
import { ArrowLeft, Calendar, User, Tag, Share2, ExternalLink } from 'lucide-react';
```

`ReactMarkdown`の`a` rendererを次へ置き換える。

```tsx
                            a: ({ href, children }) => {
                                const target = href ?? '';
                                const isExternal =
                                    /^(https?:|mailto:|tel:)/.test(target) || target.startsWith('//');
                                const isTutorialCta = target === 'https://build-tutorial.vercel.app';

                                if (isExternal) {
                                    return (
                                        <a
                                            href={target}
                                            className={isTutorialCta
                                                ? 'mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0066CC] px-6 py-3.5 font-semibold text-white no-underline shadow-sm transition-colors hover:bg-[#004C99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 dark:bg-[#2997FF] dark:text-[#0A0A0A] dark:hover:bg-[#5DABFF] sm:w-auto'
                                                : 'text-[#0066CC] dark:text-[#2997FF] hover:underline'}
                                            target={target.startsWith('http') ? '_blank' : undefined}
                                            rel={target.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        >
                                            {children}
                                            {isTutorialCta && (
                                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                            )}
                                        </a>
                                    );
                                }

                                return (
                                    <Link
                                        to={target || '#'}
                                        className="text-[#0066CC] dark:text-[#2997FF] hover:underline"
                                    >
                                        {children}
                                    </Link>
                                );
                            },
```

- [ ] **Step 5: focused testが通ることを確認する**

Run:

```bash
cd frontend
set -a
source .env
source .env.local
set +a
npm test -- src/pages/NewsAnnouncement.test.tsx
```

Expected: `4 passed`。

- [ ] **Step 6: 変更範囲とフロントエンド全体を検証する**

Run:

```bash
cd frontend
set -a
source .env
source .env.local
set +a
npm test
npx eslint src/pages/NewsDetail.tsx src/pages/NewsAnnouncement.test.tsx
npm run build
```

Expected: 全59件以上のテストがPASSし、変更ファイルのESLintが0 errors / 0 warnings、Viteのプロダクションビルドが成功する。

- [ ] **Step 7: PCとスマートフォンでCTAを目視確認する**

ローカルサイトの`/news/web-development-tutorial-released`を1280×720と390×844で確認する。

Expected:

- 補足文とCTAが記事末尾に表示される。
- PCではCTAが文言に合う幅、390pxでは本文幅いっぱいになる。
- 青背景、白文字、外部リンクアイコン、hover、keyboard focusが視認できる。
- 横スクロールがなく、ブラウザコンソールにエラーがない。

- [ ] **Step 8: CTA実装だけをコミットする**

```bash
git add frontend/src/pages/NewsDetail.tsx frontend/src/pages/NewsAnnouncement.test.tsx docs/superpowers/plans/2026-07-13-web-tutorial-announcement.md
git commit -m "Clarify tutorial announcement CTA"
```
