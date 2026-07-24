# Synchronized Codex Development Demo Design

**Date:** 2026-07-24  
**Target:** `.superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html`

## Context

The current demo advances the System Architecture stepper, user message, agent
message, added Diff lines, and test text on a shared timer. However, the Codex
screen does not read as one connected development process for three reasons:

1. The Plan begins with two items already complete and never changes.
2. The composer retains the request after the request also appears as a message.
3. At widths of 820px or less, the Review panel is hidden while the animation
   continues updating the test output inside that hidden panel.

The result is technically timed but visually disconnected. The revised demo
must make every visible Codex state a direct consequence of the active workflow
step.

## Goals

- Present a credible AI-assisted development workflow rather than a chat-send
  or Diff-review showcase.
- Keep the System Architecture stepper and the Codex application synchronized
  through one explicit phase state.
- Show test execution in the central Codex area at every supported viewport.
- Make the cursor a rounded, single-color ice-blue pointer with no outline,
  gradient, secondary color, or outlined click ring.
- Preserve visible-only looping, pause/resume, off-screen reset, and reduced
  motion behavior.

## Non-goals

- No composer typing or send-button sequence.
- No user-message creation animation.
- No Diff-generation phase or animated added lines.
- No claim that the static demo is executing the repository's real test suite.
  It is a visual representation of the development workflow; verification of
  the demo itself remains a separate browser and syntax test.
- No redesign of the surrounding hero, case-study content, or entry animation.

## Workflow

The System Architecture labels and Codex content use the same five phases:

| Step | Label | Codex action | Visible result |
| --- | --- | --- | --- |
| 01 | Goal | Select the existing task request | The task brief receives focus; no send animation |
| 02 | Inspect | Read repository files and responsive constraints | Activity rows show file search and context discovery |
| 03 | Build | Apply the implementation plan | Plan items advance and changed-file summaries appear |
| 04 | Test | Run the test command | The cursor presses a central `Run tests` control and test output streams visibly |
| 05 | Verify | Check required viewports and reduced motion | Viewport badges pass and the final verification summary appears |

### Phase timing

One loop lasts approximately 11 seconds:

1. `Goal` holds long enough for the cursor to click the first step and focus the
   task brief.
2. `Inspect` reveals two activity rows in sequence.
3. `Build` advances the plan from pending to active to complete and reveals
   changed-file summaries.
4. `Test` moves the cursor to the central test control, clicks it, changes the
   control to a running state, and streams at least three test-result rows.
5. `Verify` reveals three viewport badges and a final passed status.
6. The completed state holds briefly, fades, resets, and starts the next loop
   only while the stage is visible and not user-paused.

The controller exposes the active phase on `#stage` as
`data-demo-phase="goal|inspect|build|test|verify"` in addition to the existing
state and cycle attributes. All Codex UI updates derive from this phase.

## Codex Application Layout

### Task brief

The existing development request remains visible as task context from the
beginning. The composer and send button are removed from the animated path.
During `Goal`, the cursor focuses the brief card and the card receives a subtle
ice-blue highlight.

### Central activity feed

The conversation area becomes a development activity feed containing:

- repository inspection rows;
- an implementation plan with pending, active, and complete states;
- changed-file summary cards without line-level Diff content;
- an inline test panel;
- viewport verification badges.

Inactive future sections remain present for layout stability but are visually
muted or collapsed. Only the section associated with the active phase animates
into focus.

### Test panel

The test panel lives in the central column, not the responsive Review sidebar.
It contains:

- a `Run tests` button;
- a command label such as `npm run test`;
- a running indicator;
- individual result rows;
- a final count such as `18 passed`;
- viewport results for `390×844`, `844×390`, and `1280×720`.

The cursor visibly presses `Run tests` during phase 04. The button changes to
`Running…`, result rows appear in order, and phase 05 begins only after the test
results are visible.

### Right sidebar

The desktop sidebar may show changed-file and verification summaries, but it is
supplementary. No required animation state may exist only in this sidebar.
Hiding the sidebar at narrow widths must not remove any core workflow event.

## System Architecture Stepper

Rename the steps:

1. `Goal` — define the task and constraints
2. `Inspect` — read files, history, and responsive conditions
3. `Build` — plan and implement the change
4. `Test` — execute checks and display their results
5. `Verify` — confirm viewports and reduced-motion behavior

`setArchitectureStep()` and the Codex phase renderer are called through a
single `setDemoPhase()` function. This prevents stepper state from advancing
without the corresponding Codex content.

## Cursor

Replace the SVG arrow and click ring with a code-native HTML element:

- 22px circular or softly teardrop-shaped body;
- one color: `rgba(189, 235, 255, 0.82)`;
- no stroke, border, gradient, or differently colored edge;
- a soft shadow using the same ice-blue color only;
- no outlined ripple;
- click feedback uses a short scale-down and rebound on the filled body;
- stage-coordinate positioning and viewport clamping remain unchanged.

The cursor remains hidden for coarse pointers and reduced-motion mode.

## Responsive Behavior

- The central activity feed, test panel, and viewport verification remain
  visible at desktop, tablet, mobile portrait, and short landscape sizes.
- The right sidebar may continue to hide at 820px or below.
- Mobile layouts condense activity copy and test rows without moving required
  status into the hidden sidebar.
- The product window and Architecture dock must not overlap at `390×844`,
  `844×390`, or `1280×720`.
- The cursor must remain inside the viewport whenever it is visible.

## Reduced Motion

Reduced-motion mode shows a static completed workflow:

- phase is `verify`;
- all plan items are complete;
- test results and three viewport badges are visible;
- Architecture is `STEP 5 OF 5`;
- cursor and pause control are hidden;
- no timer-driven state changes occur.

## Validation

Implementation follows test-first browser assertions:

1. Confirm the existing Plan remains unchanged across phases and that required
   test output disappears when the right sidebar is hidden.
2. Confirm the old SVG cursor has a stroke and click ring.
3. After implementation, sample every workflow phase and assert that the active
   Architecture step, `data-demo-phase`, Plan state, activity visibility, test
   state, and verification state agree.
4. At a width below 820px, confirm that clicking phase 04 changes a visible
   central test panel from idle to running to passed.
5. Confirm two loops begin at `Goal`, pause freezes all observable state, leaving
   the section resets it, and re-entry starts a new cycle.
6. Confirm reduced motion remains static at the completed Verify state.
7. Confirm the cursor has no SVG, stroke, border, gradient, click ring, or
   secondary-color shadow.
8. Confirm product, dock, and cursor bounds at the three required viewports.
9. Parse the inline script to catch syntax errors and confirm the visual
   companion server remains active.

