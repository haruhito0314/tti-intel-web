# Web開発学習サイト公開のお知らせ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TTI Intelligenceのトップページ、お知らせ一覧、記事詳細に、Web開発学習サイトの公開案内と外部リンクを掲載する。

**Architecture:** 既存の静的記事データ構造を維持し、`Home.tsx`、`News.tsx`、`NewsDetail.tsx`へ同一のお知らせ情報を追加する。新しいデータ層や依存関係は導入せず、既存のReact RouterリンクとMarkdown外部リンク描画を利用する。

**Tech Stack:** React 19、TypeScript 5.9、React Router、React Markdown、Vitest、Testing Library

## Global Constraints

- タイトルは `Web開発をゼロから学べるサイトを公開しました` とする。
- 公開日は `2026-07-13`、カテゴリは `お知らせ`、タグは `Web開発` と `学習教材` とする。
- 学習サイトURLは `https://build-tutorial.vercel.app` とする。
- 既存の「TTI Intelligenceへようこそ！」は固定記事として維持する。
- 外部リンクは新しいタブで開き、`noopener noreferrer`を付ける。
- 記事管理方式の共通化やCMS化は実施しない。

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
