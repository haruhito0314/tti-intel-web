# Home「今週の数学」見出しカラー調整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Homeの「今週の数学」見出しを水色にし、問題カード内タイトルを一段小さくして情報階層を整える。

**Architecture:** `Home` コンポーネントの既存Tailwindクラスだけを変更し、データ取得やレイアウト構造には触れない。レンダリングテストで、セクション見出しとカード内タイトルに合意済みのクラスが付くことを固定する。

**Tech Stack:** React 19、TypeScript、Tailwind CSS 4、Vitest、Testing Library

## Global Constraints

- 対象は `frontend/src/pages/Home.tsx` のHome「今週の数学」セクションのみ。
- セクション見出しはライトテーマ `#0284C7`、ダークテーマ `#38BDF8` とする。
- 問題カード内タイトルはモバイル `22px`、`sm` 以上 `28px` とする。
- 下線、区切り線、アクセント線などの装飾は追加しない。
- 表示する問題、リンク先、読み込み処理、フォールバック表示は変更しない。

---

## File Structure

- Create: `frontend/src/pages/HomeWeeklyMathHeading.test.tsx` — Homeの週次数学見出しとカードタイトルの表示階層を検証する。
- Modify: `frontend/src/pages/Home.tsx` — 合意済みの色と文字サイズをTailwindクラスで適用する。

### Task 1: 週次数学見出しの色とカードタイトルの階層を調整する

**Files:**
- Create: `frontend/src/pages/HomeWeeklyMathHeading.test.tsx`
- Modify: `frontend/src/pages/Home.tsx:541-561`

**Interfaces:**
- Consumes: `Home(): JSX.Element` と `WeeklyMathProblem` 相当の既存表示データ。
- Produces: ライト `text-[#0284C7]`／ダーク `dark:text-[#38BDF8]` のセクション見出しと、`text-[22px] sm:text-[28px]` の問題カードタイトル。

- [ ] **Step 1: 表示階層を固定する失敗テストを書く**

`frontend/src/pages/HomeWeeklyMathHeading.test.tsx` を次の内容で作成する。

```tsx
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
    it('水色のセクション見出しと一段小さい問題タイトルを表示する', () => {
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: '今週の数学', level: 2 })).toHaveClass(
            'text-[#0284C7]',
            'dark:text-[#38BDF8]',
        );
        expect(screen.getByRole('heading', { name: '経路の場合の数', level: 3 })).toHaveClass(
            'text-[22px]',
            'sm:text-[28px]',
        );
    });
});
```

- [ ] **Step 2: テストが意図どおり失敗することを確認する**

Run:

```bash
cd frontend
npm test -- HomeWeeklyMathHeading.test.tsx
```

Expected: `今週の数学` に `text-[#0284C7]`／`dark:text-[#38BDF8]` がなく、カードタイトルに `text-[22px]`／`sm:text-[28px]` がないためFAILする。

- [ ] **Step 3: 合意済みのクラスへ最小変更する**

`frontend/src/pages/Home.tsx` のセクション見出しを次のクラスへ変更する。

```tsx
<h2 className="text-[24px] sm:text-[34px] font-semibold tracking-[-0.03em] text-[#0284C7] dark:text-[#38BDF8] leading-[1.06]">
    今週の数学
</h2>
```

同じファイルの問題カード内タイトルを次のクラスへ変更する。

```tsx
<h3 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.03em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-3 leading-[1.08]">
    {displayedWeeklyMathTitle}
</h3>
```

- [ ] **Step 4: 対象テストが通ることを確認する**

Run:

```bash
cd frontend
npm test -- HomeWeeklyMathHeading.test.tsx
```

Expected: 1 test PASS。

- [ ] **Step 5: ビルドで型と本番バンドルを確認する**

Run:

```bash
cd frontend
npm run build
```

Expected: TypeScriptとVite buildが終了コード0で完了する。

- [ ] **Step 6: 変更をコミットする**

```bash
git add frontend/src/pages/Home.tsx frontend/src/pages/HomeWeeklyMathHeading.test.tsx
git commit -m "Style Home weekly math heading"
```
