# Color Sort Mobile UX Refresh Design

## Goal

Improve the color-sort puzzle's smartphone experience without turning the page into a separate full-screen app. The six-bottle board must remain fully visible as one stable 3-by-2 grid on common phone widths, while the rest of the page may scroll. Preserve the current tap-source-then-target interaction and make star mode meaningfully harder by increasing only its bottle capacity from eight to ten layers.

## Success Criteria

- At viewport widths from 320px through 430px, all six bottles appear in a fixed three-column, two-row board with no horizontal scrolling.
- The board itself fits within one 320-by-568 CSS-pixel viewport. The page hero, stats, hints, and controls do not need to fit in that same viewport.
- Tablet layouts retain the stable 3-by-2 board. The board changes to one row of six bottles only at the desktop breakpoint where all bottles fit comfortably.
- Normal mode remains six bottles, four colors, and eight layers per bottle.
- Star mode becomes six bottles, five colors, and ten layers per bottle.
- A bottle remains at least 44 CSS pixels wide as a pointer target in every supported layout.
- Selected sources, legal targets, completed bottles, invalid actions, and generation progress are understandable without relying on color alone.
- Puzzle generation never blocks the main UI thread.
- Existing undo, reset, new-puzzle, star-mode, and share features remain available.

## Approved Product Decisions

### Layout

- Phones use a fixed 3-by-2 grid.
- Tablets continue to use 3-by-2 to avoid the current 640px breakpoint cliff.
- Desktops use a single row of six bottles at `lg` and above.
- Only the board must fit in one phone viewport. Controls remain below the board in normal document flow.
- Phone bottle width is responsive within a range of approximately 52px to 68px.
- Phone bottle height is responsive within a range of approximately 136px to 190px, using small-viewport units with a fixed minimum and maximum. This keeps two rows visible on short phones while giving color layers more height on taller phones.
- Normal and star modes use the same outer bottle dimensions. Star mode divides the liquid area into ten thinner layers.

### Interaction

- The player taps a non-empty bottle to select a source, then taps a legal destination to pour.
- Tapping the selected bottle again cancels selection.
- If the player taps another non-empty, incomplete bottle that is not a legal destination, that bottle consistently becomes the new source and the status says that the source changed.
- A completed, full, single-color bottle is locked because the solver already treats it as a terminal bottle. It displays a completion marker and cannot become a source.
- The selected source uses a blue outline, a small upward offset, and a visible selected label/state.
- Legal destinations use a green outline plus a check marker. Color is never the only legal-target signal.
- A successful pour uses an approximately 200ms transition. Under `prefers-reduced-motion: reduce`, the state changes without translation or liquid movement animation.
- Invalid-action and source-change messages appear in a compact board-level status area and are announced through a polite live region.

### Modes

The current global capacity constant becomes mode configuration:

| Mode | Bottle count | Color count | Capacity | Empty-bottle equivalent |
| --- | ---: | ---: | ---: | ---: |
| Normal | 6 | 4 | 8 | 2 |
| Star | 6 | 5 | 10 | 1 |

Each color still contributes exactly one full bottle's capacity. Normal mode therefore distributes 32 colored layers; star mode distributes 50 colored layers.

Switching mode always creates a fresh board for the destination mode. If the current board has at least one move, switching mode requires confirmation before discarding progress.

## Responsive Board Design

Replace the accidental `flex-wrap` behavior with an explicit CSS grid:

- Base through tablet: three columns and two rows.
- Desktop (`lg`): six columns and one row.
- Use responsive gaps and padding without changing bottle capacity or game state.
- Derive each layer's height from the active mode capacity rather than from a global eight-layer assumption.
- Keep bottle hit areas at least 44-by-44 CSS pixels even when the visible bottle is narrower in a future design.
- Keep the compact status message associated with the board so feedback remains visible when the player is working on the lower row.

The 320px, 375px, 390px, 430px, 640px, and 1024px widths are explicit visual-QA checkpoints. The 320-by-568 checkpoint is also the height acceptance test for the board itself.

## Architecture

The current page combines rules, generation, rendering, sharing, and page layout in one file. Keep page orchestration in `frontend/src/pages/ColorSortPuzzle.tsx` and extract focused units under `frontend/src/components/color-sort/`:

- `types.ts`: color, bottle, mode, configuration, move, worker request, and worker result types.
- `config.ts`: normal and star mode configurations, color display metadata, and generation limits.
- `game.ts`: pure capacity-aware helpers such as `canPour`, `pourBottle`, `isCompletedBottle`, `isSolved`, and puzzle serialization.
- `generator.ts`: seeded scrambling, scoring, bounded solving, validation, and deterministic fallback selection.
- `colorSort.worker.ts`: worker adapter that accepts a mode and seed and returns either a validated puzzle or a structured failure.
- `BottleView.tsx`: one accessible bottle, its layers, visual states, and descriptive label.
- `ColorSortBoard.tsx`: responsive grid, board-level status, and bottle interaction wiring.
- `ColorSortControls.tsx`: undo, reset, new puzzle, star mode, and share controls.
- `share.ts`: capacity-aware result-image rendering and progressive share fallback.

The page owns the high-level state and passes the active `PuzzleModeConfig` into rules, rendering, generation, completion checks, and sharing. No helper reads a global bottle capacity.

## State and Data Flow

The page state consists of:

- active mode and its configuration;
- phase: `generating`, `playing`, or `solved`;
- current and initial puzzles;
- selected source index;
- move-history snapshots;
- short visible/live status message;
- pending confirmation action, when applicable.

### Starting or replacing a puzzle

1. The page enters `generating`, clears selection, and disables board and replacement controls.
2. It sends the active mode and a seed to the worker.
3. The worker constructs and validates a board using that mode's capacity and solver limits.
4. On success, the page stores the board as both initial and current state, clears history, and enters `playing`.
5. Reset restores the existing initial board and does not invoke the worker.

### Making a move

1. With no selected source, tapping a non-empty, incomplete bottle selects it.
2. Tapping the same source cancels selection.
3. Tapping a legal destination snapshots the current puzzle, performs the capacity-aware pour, clears selection, and checks completion.
4. Tapping a different non-empty, incomplete illegal destination changes the source and announces the change.
5. Completion changes the phase to `solved`, locks the board, and opens the result panel.

Undo restores the final history snapshot, clears selection and status, and returns the phase to `playing` if it was solved.

## Generation and Performance

Ten-layer star boards increase the search space, so generation moves off the main thread.

- The worker receives a request identifier, mode, and seed.
- The UI ignores stale worker responses after a newer request starts.
- A generation attempt has a three-second UI timeout.
- On worker failure or timeout, retry once with a new seed.
- If the retry fails, load a committed, solver-verified fallback board for that mode and show a non-blocking recovery message.
- Replacement controls remain disabled while generation is pending to prevent request races.
- Worker termination occurs when the page unmounts.

The pure generator remains independently testable without the worker. Mode-specific solver depth and state limits are tuned during implementation from deterministic seed samples; the limits must never silently accept an unverified puzzle.

## Feedback, Errors, and Destructive Actions

- Reset, new puzzle, and mode switching ask for confirmation only when move history is non-empty. They proceed immediately before the first move or after completion.
- Long messages are allowed to wrap; no actionable feedback uses truncation.
- A generation fallback still produces a playable board and identifies the recovery in the status area without exposing technical details.
- Completed-bottle progress replaces the current misleading `Full` metric. Only full, uniform bottles count as completed.
- The completion result panel shows move count, a primary next-puzzle action, and share.
- Cancelling native sharing (`AbortError`) ends the share flow without opening X.
- Share fallback order is file-capable native share, text-only native share, then X intent only when native sharing is unavailable or genuinely fails.

## Accessibility

- Every bottle remains a native button.
- Bottle labels include index, fill level, grouped contents from top to bottom, and whether the bottle is selected, completed, or a legal destination.
- Selection uses `aria-pressed`; completed bottles use an appropriate disabled state.
- Board feedback uses `aria-live="polite"`.
- Legal-target and completion markers include shape or text in addition to color.
- Existing keyboard activation with Enter and Space remains supported.
- Focus indicators remain visible in light and dark themes.
- Puzzle transitions honor reduced-motion preferences.

## Sharing

The share renderer receives the active mode configuration and calculates layer height from its capacity. It may continue to render six bottles in one horizontal row because the share image is independent of the interactive phone layout. Shared text includes the mode and move count so a ten-layer star result is distinguishable from a normal result.

## Testing and Verification

### Pure logic tests

- Legal and illegal moves at capacities eight and ten.
- Contiguous top-group pouring with limited destination space.
- Completed-bottle and solved-state detection for both modes.
- Puzzle serialization and clone behavior.
- Deterministic generation invariants: bottle count, capacity, color totals, expected empty capacity, and solver validation for representative fixed seeds.
- Retry and verified-fallback behavior.

### Component tests

- Select, cancel, legal pour, source switching, and completed-bottle locking.
- Undo after a move and after completion.
- Conditional confirmation for reset, new puzzle, and mode switch.
- Generating, error-recovery, playing, and solved phases.
- Accessible labels, `aria-pressed`, live messages, and non-color target markers.
- Native-share cancellation does not invoke the X fallback.

### Responsive QA

- Inspect the board at widths 320, 375, 390, 430, 640, and 1024px.
- At 320-by-568, verify that the complete six-bottle board fits without internal or horizontal scrolling.
- Verify both eight-layer normal and ten-layer star boards in light and dark themes.
- Verify standard and reduced-motion behavior.

### Commands

Run from `frontend`:

```bash
npm test
npm run lint
npm run build
```

## Scope Boundaries

This refresh does not add drag-and-drop, persistence, accounts, leaderboards, hints, new game modes, or backend storage. It does not redesign the surrounding site header, footer, or desktop visual language beyond the responsive board and puzzle-specific controls needed for this work.
