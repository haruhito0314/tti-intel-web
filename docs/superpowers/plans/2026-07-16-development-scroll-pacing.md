# Development Scroll Pacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/development` のスクロール距離を短縮し、7章を読みやすい比率へ再配分する。

**Architecture:** 既存のprogress計算と章内animation timingは維持し、`devScrollConfig.ts` のtrack heightとchapter spansだけを変更する。CSSのdesktop/mobile track heightを同じ値へ同期し、既存テストで設定値と章ごとの最低距離を固定する。

**Tech Stack:** React 19、TypeScript 5.9、CSS、Vitest 4、Vite 7

## Global Constraints

- Desktop track heightは`1280vh`とする。
- Mobile track heightは`1200vh`とする。
- Chapter spansは`[0.13, 0.25, 0.11, 0.10, 0.12, 0.13, 0.16]`とする。
- 章内のenter、hold、crossfade、zoom timingは変更しない。
- Reduced Motion時の静的表示は変更しない。

---

### Task 1: Scroll pacing configuration

**Files:**
- Modify: `frontend/src/components/development/devScrollConfig.test.ts`
- Modify: `frontend/src/components/development/devScrollConfig.ts`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: `DEV_TRACK_HEIGHT_VH = 1280`
- Produces: `DEV_TRACK_HEIGHT_MOBILE_VH = 1200`
- Preserves: `SCENE_RANGES: readonly (readonly [number, number])[]`
- Preserves: `getChapterEnterEnd(chapterIndex: number): number`

- [x] **Step 1: Write the failing pacing test**

Update the exact height and span assertions in `devScrollConfig.test.ts`:

```ts
expect(DEV_TRACK_HEIGHT_VH).toBe(1280);
expect(DEV_TRACK_HEIGHT_MOBILE_VH).toBe(1200);

const expectedSpans = [0.13, 0.25, 0.11, 0.10, 0.12, 0.13, 0.16];
expectedSpans.forEach((expected, index) => {
    expect(spans[index]).toBeCloseTo(expected, 5);
});
expect(spans[0] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(160);
expect(spans[1] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(300);
expect(spans[2] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(140);
expect(spans[3] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(125);
expect(spans[4] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(150);
expect(spans[5] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(165);
expect(spans[6] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(200);
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `cd frontend && npm test -- src/components/development/devScrollConfig.test.ts`

Expected: FAIL because the current values remain `1640`, `1480`, and `[0.14, 0.335, 0.095, 0.085, 0.095, 0.115, 0.135]`.

- [x] **Step 3: Implement the compact balanced pacing**

Update `devScrollConfig.ts`:

```ts
const CHAPTER_SPANS = [0.13, 0.25, 0.11, 0.10, 0.12, 0.13, 0.16] as const;

export const DEV_TRACK_HEIGHT_VH = 1280;
export const DEV_TRACK_HEIGHT_MOBILE_VH = 1200;
```

Update `index.css`:

```css
.dev-hero-track {
  position: relative;
  height: 1280vh;
}

@media (max-width: 768px) {
  .dev-hero-track {
    height: 1200vh;
    overflow-x: clip;
  }
}
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `cd frontend && npm test -- src/components/development/devScrollConfig.test.ts`

Expected: PASS with 2 tests passing.

- [x] **Step 5: Run full verification**

Run:

```bash
cd frontend
npm test -- src/components/development
npx eslint src/components/development/devScrollConfig.ts src/components/development/devScrollConfig.test.ts
npm run build
```

Expected: all Development tests pass, ESLint exits 0, and Vite production build exits 0.

- [x] **Step 6: Commit the implementation**

```bash
git add docs/superpowers/plans/2026-07-16-development-scroll-pacing.md frontend/src/components/development/devScrollConfig.test.ts frontend/src/components/development/devScrollConfig.ts frontend/src/index.css
git commit -m "Tune Development scroll pacing"
```
