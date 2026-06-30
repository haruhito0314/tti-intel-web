# Color Sort Puzzle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable Apple-inspired color sort puzzle under the app showcase.

**Architecture:** Put the interactive game in one focused page component, with pure helper functions at the top for puzzle generation and move validation. Connect it through the existing React Router routes and app showcase array.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS classes, lucide-react icons, Vite.

---

### Task 1: Add Puzzle Page And Logic

**Files:**
- Create: `frontend/src/pages/ColorSortPuzzle.tsx`

- [ ] **Step 1: Write small pure puzzle helpers first**

Create types for bottles and moves, seeded puzzle presets, `canPour`, `pour`, and `isSolved`.

- [ ] **Step 2: Add the React page**

Render a full page with a compact hero, status strip, bottle board, and controls for undo, reset, and new puzzle.

- [ ] **Step 3: Verify local interactions in code**

Ensure selected bottles are highlighted, illegal taps clear selection safely, move history supports undo, and solved state disables accidental extra moves.

### Task 2: Wire Route And Showcase Card

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/AppShowcase.tsx`

- [ ] **Step 1: Import the page in `App.tsx`**

Add `ColorSortPuzzlePage` as an eager app page import next to the table tennis page.

- [ ] **Step 2: Add route**

Add `<Route path="app/color-sort" element={<ColorSortPuzzlePage />} />`.

- [ ] **Step 3: Add showcase card**

Add an app entry with title `カラーソートパズル`, path `/app/color-sort`, and tags for `React`, `TypeScript`, and `Puzzle`.

### Task 3: Verify

**Files:**
- No additional files.

- [ ] **Step 1: Run build**

Run: `npm run build` from `frontend`.

- [ ] **Step 2: Fix any TypeScript or lint-level build issues**

Keep changes scoped to the new page and route/card wiring.
