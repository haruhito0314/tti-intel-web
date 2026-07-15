# Weekly Math Hint Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the always-visible weekly-math hint card with an Apple-like secondary disclosure button beside the primary solution action.

**Architecture:** Keep the interaction local to `WeeklyMathDetail` with one boolean state. Render the hint action only for non-empty hints, connect it to the collapsible card with ARIA attributes, and retain the existing markdown renderer and card styling.

**Tech Stack:** React, TypeScript, React Router, Vitest, Testing Library, Tailwind CSS, lucide-react

## Global Constraints

- `解説を見る` remains the filled primary action.
- `ヒント` is a neutral outlined action directly to its right.
- The hint is collapsed initially and toggles inline below the action row.
- The action row wraps on narrow screens in solution-then-hint order.
- No new dependencies.

---

### Task 1: Hint disclosure interaction

**Files:**
- Modify: `frontend/src/pages/WeeklyMathDetailHint.test.tsx`
- Modify: `frontend/src/pages/WeeklyMathDetail.tsx`

**Interfaces:**
- Consumes: `WeeklyMathProblem.hint?: string`, existing `Button`, `Card`, and `MathMarkdown` components.
- Produces: a `ヒント` button with `aria-expanded` and `aria-controls="weekly-math-hint"`, plus a conditionally rendered hint card with `id="weekly-math-hint"`.

- [x] **Step 1: Write the failing disclosure test**

Update the component test to assert the hint text is initially absent, the hint button starts with `aria-expanded="false"`, one click reveals the text and changes the attribute to `true`, and a second click hides it again. Also assert that `解説を見る` precedes `ヒント` in the action row.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/pages/WeeklyMathDetailHint.test.tsx`

Expected: FAIL because the current hint is visible immediately and no hint disclosure button exists.

- [x] **Step 3: Implement the minimal disclosure UI**

In `WeeklyMathDetail.tsx`, add `hintOpen` state and reset it whenever `resolvedWeekKey` changes. Move the action row above the hint card, use `flex flex-wrap items-center gap-3`, render the solution link first, then render an outlined hint button for a non-empty hint. Give the button `aria-expanded={hintOpen}`, `aria-controls="weekly-math-hint"`, and a `ChevronDown` whose rotation follows the state. Render the existing hint card only while `hintOpen` is true and give it `id="weekly-math-hint"` with a short fade-in animation.

- [x] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- src/pages/WeeklyMathDetailHint.test.tsx src/lib/weeklyMathFallbacks.test.ts`

Expected: 2 test files pass with 0 failures.

- [x] **Step 5: Run build verification**

Run: `npm run build`

Expected: exit code 0 with a successful Vite production build.

- [x] **Step 6: Verify the real local page**

Open `http://localhost:5173/weekly-math/parabola-tangent-circle-chain`, confirm the two buttons are side by side, confirm the hint is hidden initially, then open and close it. Confirm no `.katex-error` elements appear on the problem or solution page.

- [ ] **Step 7: Commit the implementation**

Run:

```bash
git add frontend/src/pages/WeeklyMathDetail.tsx frontend/src/pages/WeeklyMathDetailHint.test.tsx docs/superpowers/plans/2026-07-16-weekly-math-hint-disclosure.md
git commit -m "Add weekly math hint disclosure"
```
