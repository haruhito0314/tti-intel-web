# Synchronized Codex Development Demo Implementation Plan

**Design:** `docs/superpowers/specs/2026-07-24-synchronized-codex-development-demo-design.md`  
**Demo:** `.superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html`

## Objective

Replace the disconnected chat/Diff animation with one phase-driven development
workflow:

`Goal → Inspect → Build → Test → Verify`

The Architecture stepper, central Codex activity feed, test panel, and cursor
must all derive from the same phase.

## Task 1: Establish failing phase and responsive tests

At `1280×720` and a width below `820px`, record the current behavior:

- Architecture labels still include `Instruction`, `Context`, `Execute`,
  `Review`, and `Verify`.
- Plan completion is unchanged across all five steps.
- There is no `data-demo-phase` attribute.
- Required test output lives only in `.codex-review`, which is hidden below
  `820px`.
- The cursor is an SVG with a stroke and a separate click ring.

These checks must fail before production changes.

## Task 2: Replace the central Codex content

Keep the existing Codex shell but replace the animated conversation contents
with:

- `.codex-brief` for the existing task request;
- `.activity-row[data-activity="inspect-files"]`;
- `.activity-row[data-activity="inspect-layout"]`;
- `.codex-plan` with three initially pending `.plan-step` elements;
- `.changed-files` summary cards without line-level Diff;
- `.inline-test-panel` with a central `Run tests` button;
- `.test-result` rows;
- `.viewport-check` badges.

Every future section stays in the document for layout stability but begins
muted. The central test panel remains visible even when `.codex-review` is
hidden.

## Task 3: Add one phase renderer

Create `setDemoPhase(phase)` and make it the only function that changes both the
Architecture step and Codex content.

Phase mapping:

- `goal` → step 1, brief focused
- `inspect` → step 2, inspection activity visible
- `build` → step 3, plan advances and changed-file summaries appear
- `test` → step 4, test panel active and test button ready/running
- `verify` → step 5, tests passed and viewport badges visible

Expose the phase as `#stage[data-demo-phase]`.

Reset must restore:

- phase `goal`;
- all Plan items pending;
- no activity rows complete;
- test button text `Run tests`;
- test output hidden;
- viewport badges pending.

Reduced motion must call the same phase renderer with `verify` and then show the
completed static state.

## Task 4: Rebuild the timeline

Remove composer typing, send-button clicking, message creation, and animated
Diff lines.

One loop:

1. Cursor clicks Architecture step 01.
2. Cursor focuses the existing brief.
3. Phase changes to `inspect`; two activity rows appear in sequence.
4. Phase changes to `build`; Plan items progress and file summaries appear.
5. Phase changes to `test`; cursor moves to the central `Run tests` button.
6. Cursor clicks; button changes to `Running…`; result rows stream.
7. Phase changes to `verify`; viewport badges and final passed state appear.
8. Hold, fade, reset, and start the next visible cycle.

The existing visible-only, pause/resume, off-screen reset, and cancellation
mechanisms remain.

## Task 5: Replace the cursor

Replace the SVG and click ring with one `.cursor-dot` element:

- `22px × 22px`;
- single fill `rgba(189,235,255,.82)`;
- no border, stroke, gradient, or secondary color;
- same-color soft shadow;
- click feedback through scale only.

Keep stage-coordinate movement and viewport clamping.

## Task 6: Verify

Run fresh browser checks:

1. Sample all five phases and assert:
   - `data-demo-phase` matches the Architecture step;
   - visible activity, Plan, test, and viewport states match the phase.
2. At a width below `820px`, assert the central test panel is visible while the
   right sidebar is hidden.
3. Confirm `Run tests → Running… → 18 tests passed`.
4. Confirm two loops restart at `goal`.
5. Confirm pause freezes phase, cycle, Plan, tests, and cursor position.
6. Confirm leaving resets and re-entry restarts.
7. Confirm reduced motion is static at `verify`.
8. Confirm no SVG, cursor stroke, border, gradient, or click ring remains.
9. At `390×844`, `844×390`, and `1280×720`, confirm:
   - product and dock are inside the viewport;
   - product and dock do not overlap;
   - visible cursor is inside the viewport.
10. Parse the inline script and verify the visual companion server is active.

