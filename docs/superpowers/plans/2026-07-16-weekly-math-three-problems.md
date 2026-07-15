# 「今週の数学」3問題追加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Photo 2・3・4の問題文を改変せず、それぞれ独立した公開記事として「今週の数学」に追加する。

**Architecture:** 既存の Firestore `weeklyMath` コレクションと `weekKey` フィールドを後方互換のある記事IDとして維持し、新規IDでは小文字スラッグを許可する。ID検証と新着順を純粋関数へ分離し、公開一覧と管理画面で共有する。3記事は管理画面から個別保存し、本文のみ公開・解答は非公開にする。

**Tech Stack:** React 19、TypeScript 5.9、Firebase Auth/Firestore、React Markdown、KaTeX、Vitest、Vite

## Global Constraints

- Photo 1 は使用しない。
- Photo 2・3・4をそれぞれ独立した3記事として掲載する。
- 問題文の表現、条件、数式、小問を変更しない。変更はMarkdown/LaTeX表示用の改行と記法だけに限定する。
- Photo 3・4の「自作問題」表記を残す。
- 3記事とも `problemPublished: true`、`solutionPublished: false` とする。
- 既存の週形式ID、URL、`default-template` を壊さない。
- 新しい依存パッケージは追加しない。

---

### Task 1: 問題ID検証と新着順の共通ロジック

**Files:**
- Create: `frontend/src/lib/weeklyMathIdentity.ts`
- Create: `frontend/src/lib/weeklyMathIdentity.test.ts`
- Modify: `frontend/src/lib/weeklyMath.ts`

**Interfaces:**
- Produces: `isValidWeeklyMathId(value: string): boolean`
- Produces: `sortWeeklyMathProblemsNewestFirst(items: WeeklyMathProblem[]): WeeklyMathProblem[]`
- Consumes: `WeeklyMathProblem` from `frontend/src/lib/weeklyMath.ts`

- [ ] **Step 1: Write failing tests for IDs and stable newest-first ordering**

```ts
import { describe, expect, it } from 'vitest';
import { isValidWeeklyMathId, sortWeeklyMathProblemsNewestFirst } from './weeklyMathIdentity';

describe('isValidWeeklyMathId', () => {
    it.each([
        '2026-W29',
        'default-template',
        'gottsuee-configuration',
        'complex-inequalities-solid',
        'parabola-tangent-circle-chain',
    ])('accepts %s', (value) => {
        expect(isValidWeeklyMathId(value)).toBe(true);
    });

    it.each(['', 'has space', 'UPPERCASE', 'slash/id', '../escape', '-leading'])('rejects %s', (value) => {
        expect(isValidWeeklyMathId(value)).toBe(false);
    });
});

describe('sortWeeklyMathProblemsNewestFirst', () => {
    it('sorts by createdAt and falls back to updatedAt then id', () => {
        const timestamp = (milliseconds: number) => ({ toMillis: () => milliseconds });
        const sorted = sortWeeklyMathProblemsNewestFirst([
            { weekKey: 'older', title: '', problem: '', createdAt: timestamp(1) as never },
            { weekKey: 'newer', title: '', problem: '', createdAt: timestamp(3) as never },
            { weekKey: 'middle', title: '', problem: '', updatedAt: timestamp(2) as never },
        ]);
        expect(sorted.map((item) => item.weekKey)).toEqual(['newer', 'middle', 'older']);
    });

    it('does not mutate the input array', () => {
        const items = [
            { weekKey: 'a', title: '', problem: '' },
            { weekKey: 'b', title: '', problem: '' },
        ];
        sortWeeklyMathProblemsNewestFirst(items);
        expect(items.map((item) => item.weekKey)).toEqual(['a', 'b']);
    });
});
```

- [ ] **Step 2: Run the test and verify it fails because the module is missing**

Run: `cd frontend && npm test -- src/lib/weeklyMathIdentity.test.ts`

Expected: FAIL with `Failed to resolve import "./weeklyMathIdentity"`.

- [ ] **Step 3: Implement the pure helpers**

```ts
import type { WeeklyMathProblem } from './weeklyMath';

const WEEKLY_MATH_ID_PATTERN = /^(?:\d{4}-W\d{2}|default-template|[a-z0-9][a-z0-9-]*[a-z0-9])$/;

export function isValidWeeklyMathId(value: string): boolean {
    return WEEKLY_MATH_ID_PATTERN.test(value);
}

function timestampMillis(value: unknown): number | null {
    if (!value || typeof value !== 'object') return null;
    const timestamp = value as { toMillis?: () => number; toDate?: () => Date };
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
    return null;
}

export function sortWeeklyMathProblemsNewestFirst(items: WeeklyMathProblem[]): WeeklyMathProblem[] {
    return [...items].sort((left, right) => {
        const leftTime = timestampMillis(left.createdAt) ?? timestampMillis(left.updatedAt);
        const rightTime = timestampMillis(right.createdAt) ?? timestampMillis(right.updatedAt);
        if (leftTime !== null || rightTime !== null) return (rightTime ?? 0) - (leftTime ?? 0);
        return right.weekKey.localeCompare(left.weekKey);
    });
}
```

- [ ] **Step 4: Return all Firestore items and sort them through the helper**

In `getWeeklyMathList`, replace the `orderBy('weekKey', 'desc')` query with `getDocs(collection(db, 'weeklyMath'))`, map the documents, sort with `sortWeeklyMathProblemsNewestFirst`, then slice to `maxItems`. Keep the function signature unchanged.

```ts
export async function getWeeklyMathList(maxItems: number = 50): Promise<WeeklyMathProblem[]> {
    const snap = await getDocs(collection(db, 'weeklyMath'));
    return sortWeeklyMathProblemsNewestFirst(
        snap.docs.map((d) => d.data() as WeeklyMathProblem)
    ).slice(0, maxItems);
}
```

- [ ] **Step 5: Run the focused tests**

Run: `cd frontend && npm test -- src/lib/weeklyMathIdentity.test.ts`

Expected: 2 suites pass; all parameterized cases pass.

- [ ] **Step 6: Commit the helper and tests**

```bash
git add frontend/src/lib/weeklyMathIdentity.ts frontend/src/lib/weeklyMathIdentity.test.ts frontend/src/lib/weeklyMath.ts
git commit -m "Support free-form weekly math problem ids"
```

### Task 2: 管理画面を週形式に依存しない記事編集へ調整

**Files:**
- Modify: `frontend/src/pages/AdminWeeklyMath.tsx`
- Modify: `frontend/src/pages/WeeklyMath.tsx`
- Modify: `frontend/src/pages/AdminWeeklyMathPreview.tsx`
- Test: `frontend/src/lib/weeklyMathIdentity.test.ts`

**Interfaces:**
- Consumes: `isValidWeeklyMathId(value: string): boolean`
- Consumes: `sortWeeklyMathProblemsNewestFirst(items: WeeklyMathProblem[]): WeeklyMathProblem[]`

- [ ] **Step 1: Extend the tests with the three production IDs and invalid slash/whitespace cases**

Ensure the Task 1 table explicitly contains all three IDs from Global Constraints and rejects both `slash/id` and `has space`.

- [ ] **Step 2: Run the focused test before changing the UI**

Run: `cd frontend && npm test -- src/lib/weeklyMathIdentity.test.ts`

Expected: PASS, proving the UI can consume a tested validator.

- [ ] **Step 3: Replace ISO-week-only validation in `handleSave`**

Import `isValidWeeklyMathId` and replace the `isIsoWeekKey` branch with:

```ts
if (!isValidWeeklyMathId(normalizedWeekKey)) {
    addToast({
        type: 'warning',
        title: '問題IDの形式が不正です',
        message: '半角小文字・数字・ハイフンだけで入力してください（例: geometry-circle-chain）。',
    });
    return;
}
```

- [ ] **Step 4: Update article-facing admin copy without removing legacy compatibility**

Change `対象週` to `問題ID`, `週キー（追加/編集対象）` to `問題ID（追加/編集対象）`, and the search placeholder to `問題ID・タイトル・期間メモで検索（全履歴）`. For slug IDs, do not render the date-range paragraph. Retain the calendar for legacy week records because removing it is outside scope.

- [ ] **Step 5: Use the shared sorter in public/admin lists**

Replace direct `weekKey.localeCompare` sorting in `WeeklyMath.tsx` and `AdminWeeklyMath.tsx` with `sortWeeklyMathProblemsNewestFirst`. In `AdminWeeklyMathPreview.tsx`, sort fetched non-diagnostic records with the same helper before selecting the first item.

- [ ] **Step 6: Run lint, focused tests, and build**

Run: `cd frontend && npm run lint`

Expected: exit 0 with no ESLint errors.

Run: `cd frontend && npm test -- src/lib/weeklyMathIdentity.test.ts`

Expected: PASS.

Run: `cd frontend && npm run build`

Expected: exit 0 and a generated `frontend/dist` bundle.

- [ ] **Step 7: Commit the UI compatibility changes**

```bash
git add frontend/src/pages/AdminWeeklyMath.tsx frontend/src/pages/WeeklyMath.tsx frontend/src/pages/AdminWeeklyMathPreview.tsx frontend/src/lib/weeklyMathIdentity.test.ts
git commit -m "Allow independent weekly math articles"
```

### Task 3: Photo 2を「ごっつええ配置」として公開

**Files:**
- External data: Firestore document `weeklyMath/gottsuee-configuration`

**Interfaces:**
- Consumes: Admin editor accepting ID `gottsuee-configuration`
- Produces: Public route `/weekly-math/gottsuee-configuration`

- [ ] **Step 1: Enter the exact article payload in the admin editor**

Use title `ごっつええ配置`, ID `gottsuee-configuration`, empty hint/answer/explanation, `problemPublished: true`, and `solutionPublished: false`. Enter the provided reference text without changing its wording; use Markdown numbering and `\(...\)` / `\[...\]` only for rendering.

- [ ] **Step 2: Save and confirm the Firestore document exists**

Expected: success toast `保存しました` and the item appears as a separate card in the saved-problem list.

- [ ] **Step 3: Open the public detail page and compare against Photo 2**

Verify the sphere definition, condition `(*)`, `k=n/3`, orthogonality statement, centroid condition, and regular tetrahedron conclusion. Expected: no solution button; `解答・解説は準備中です。` is shown.

### Task 4: Photo 3を「複素数条件で定まる立体」として公開

**Files:**
- External data: Firestore document `weeklyMath/complex-inequalities-solid`

**Interfaces:**
- Consumes: Admin editor accepting ID `complex-inequalities-solid`
- Produces: Public route `/weekly-math/complex-inequalities-solid`

- [ ] **Step 1: Enter the exact article payload in the admin editor**

Use title `複素数条件で定まる立体`, ID `complex-inequalities-solid`, empty hint/answer/explanation, `problemPublished: true`, and `solutionPublished: false`. Preserve the definitions `w_1=x-iy`, `w_2=y-iz`, `w_3=z-ix`; conditions (A), (B), (C); `-1<t<1`; `Q(0,0,5/2)`; questions (1)–(3); and the terminal `[自作問題]` label.

- [ ] **Step 2: Save and confirm the Firestore document exists**

Expected: success toast and a second independent card appears.

- [ ] **Step 3: Open the public detail page and compare against Photo 3**

Verify the conjugates `\overline{w_1}`, `\overline{w_2}`, `\overline{w_3}`, the squared real parts, rotation descriptions for `D`, `E`, `K`, and all three questions. Expected: KaTeX renders without error and the solution-preparing message appears.

### Task 5: Photo 4を「放物線と接する円列」として公開

**Files:**
- External data: Firestore document `weeklyMath/parabola-tangent-circle-chain`

**Interfaces:**
- Consumes: Admin editor accepting ID `parabola-tangent-circle-chain`
- Produces: Public route `/weekly-math/parabola-tangent-circle-chain`

- [ ] **Step 1: Enter the exact article payload in the admin editor**

Use title `放物線と接する円列`, ID `parabola-tangent-circle-chain`, empty hint/answer/explanation, `problemPublished: true`, and `solutionPublished: false`. Preserve `C:y=x^2`, `y\ge x^2`, centers `(0,y_n)`, `y_n>r_n>0`, conditions (i)–(iii), definitions of `P_n`, `D_n`, `V_n`, `A_n`, `B_n`, the limit `\lim_{n\to\infty}\frac1n\sum_{k=1}^n(A_k-B_k)`, and the terminal `[自作問題]` label.

- [ ] **Step 2: Save and confirm the Firestore document exists**

Expected: success toast and a third independent card appears.

- [ ] **Step 3: Open the public detail page and compare against Photo 4**

Verify subscripts, inequalities, tangent/external-tangent conditions, rotations about the `y` axis, and the final limit. Expected: KaTeX renders without error and the solution-preparing message appears.

### Task 6: End-to-end verification

**Files:**
- Verify only: no new files

**Interfaces:**
- Consumes: the three public routes from Tasks 3–5

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd frontend && npm test`

Expected: all Vitest suites pass.

- [ ] **Step 2: Run final lint and production build**

Run: `cd frontend && npm run lint`

Expected: exit 0.

Run: `cd frontend && npm run build`

Expected: exit 0.

- [ ] **Step 3: Inspect the public list and all three detail pages at desktop and mobile widths**

Expected: three separate cards, correct titles, readable line wrapping, no horizontal overflow, no KaTeX error fallback, and `解答準備中` badges on the list.

- [ ] **Step 4: Confirm the working tree contains only intended implementation changes**

Run: `git status --short`

Expected: no unrelated changes; external Firestore writes do not create local files.

- [ ] **Step 5: Commit any final verification-only corrections**

```bash
git add frontend/src
git commit -m "Polish independent math problem publishing"
```
