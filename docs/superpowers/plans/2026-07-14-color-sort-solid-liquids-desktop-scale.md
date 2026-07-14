# Color Sort Solid Liquids and Desktop Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove liquid texture overlays and enlarge only the desktop six-bottle board without changing mobile layout or puzzle behavior.

**Architecture:** `BottleView` remains the single rendering boundary for liquid layers and responsive bottle dimensions. The board grid and state markers stay unchanged; tests describe the absence of texture presentation and the desktop-only size contract.

**Tech Stack:** React 19, TypeScript, Tailwind CSS utilities, Vitest, Testing Library.

---

### Task 1: Render solid liquid layers and desktop-scale bottles

**Files:**
- Modify: `frontend/src/components/color-sort/ColorSortBoard.test.tsx`
- Modify: `frontend/src/components/color-sort/BottleView.tsx`

- [ ] **Step 1: Replace the texture assertion with a failing solid-layer and desktop-size test**

  In `ColorSortBoard.test.tsx`, replace the `gives each color a distinct texture while preserving bottom-to-top layer order` test with:

  ```tsx
  it('renders solid color layers in bottom-to-top order without texture overlays', () => {
      const solidPuzzle: Puzzle = [
          ['sky', 'mint', 'coral', 'sun', 'violet', 'rose'],
          [], [], [], [], [],
      ];
      render(<ColorSortBoard {...defaultProps} puzzle={solidPuzzle} />);

      const bottle = screen.getByRole('button', { name: /ボトル 1/ });
      const layers = Array.from(bottle.querySelectorAll('[data-layer-slot]'));
      const filledLayers = layers.slice(0, solidPuzzle[0].length);

      expect(filledLayers.map((layer) => layer.getAttribute('data-color-token'))).toEqual(solidPuzzle[0]);
      expect(filledLayers.every((layer) => !layer.hasAttribute('data-layer-pattern'))).toBe(true);
      expect(filledLayers.every((layer) => layer.querySelector('[data-layer-texture]') === null)).toBe(true);
  });
  ```

  Extend the existing responsive-size test expectation with:

  ```tsx
  'lg:[width:clamp(80px,9vw,96px)]',
  'lg:[height:clamp(210px,32svh,250px)]',
  ```

- [ ] **Step 2: Run the focused test to verify it fails**

  Run from `frontend`:

  ```bash
  npm test -- src/components/color-sort/ColorSortBoard.test.tsx
  ```

  Expected: FAIL because the rendered filled layers still carry `data-layer-pattern` and the desktop size utilities are absent.

- [ ] **Step 3: Remove texture rendering and add desktop-only dimensions**

  In `BottleView.tsx`:

  - remove the `LAYER_PATTERNS` constant and its `CSSProperties` dependency;
  - remove `pattern`, `data-layer-pattern`, and the overlay child from each filled layer;
  - retain `data-color-token`, the gradient class, and the layer divider;
  - append these utilities to the bottle button while retaining the existing mobile dimensions:

  ```tsx
  lg:[width:clamp(80px,9vw,96px)] lg:[height:clamp(210px,32svh,250px)]
  ```

- [ ] **Step 4: Run the focused test to verify it passes**

  Run:

  ```bash
  npm test -- src/components/color-sort/ColorSortBoard.test.tsx
  ```

  Expected: 7 tests PASS.

- [ ] **Step 5: Run full verification**

  Run from `frontend`:

  ```bash
  NODE_OPTIONS=--no-experimental-webstorage npm test
  npx eslint src/components/color-sort/BottleView.tsx src/components/color-sort/ColorSortBoard.test.tsx
  npm run build
  ```

  Expected: full suite passes, scoped lint exits 0, and the build emits a `colorSort.worker` asset.

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/components/color-sort/BottleView.tsx frontend/src/components/color-sort/ColorSortBoard.test.tsx
  git commit -m "Refine color sort liquid presentation"
  ```
