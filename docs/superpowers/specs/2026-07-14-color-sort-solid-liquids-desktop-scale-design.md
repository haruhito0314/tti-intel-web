# Color Sort: Solid Liquids and Larger Desktop Board

## Goal

Make the liquid layers look like clean colored liquid rather than patterned swatches, while giving the six-bottle desktop board more visual presence.

## Visual behavior

- Every filled layer keeps its existing color gradient and subtle layer divider.
- Remove the per-color stripe, hatch, and dot overlays entirely.
- Keep state communication independent of liquid color:
  - selected source: blue outline and `選択中` pill;
  - legal destination: green outline and down-arrow marker;
  - completed bottle: blue outline and check marker.
- Keep accessible bottle labels, live status, tap-to-pour controls, and reduced-motion behavior unchanged.

## Responsive behavior

- Through tablet widths, retain the existing 3-column by 2-row board and current bottle size contract.
- At `lg` and above, retain exactly 6 columns by 1 row and enlarge each bottle with desktop-only dimensions:
  - width: `clamp(80px, 9vw, 96px)`;
  - height: `clamp(210px, 32svh, 250px)`.
- Existing desktop gaps remain, so the board has no horizontal or internal scroll at the 1024px checkpoint.

## Test plan

- Replace the texture expectation with assertions that filled layers have no pattern attribute or overlay child while preserving color tokens and bottom-to-top order.
- Assert that the desktop-only width and height utilities are present alongside the unchanged mobile size utilities.
- Run the focused board test, the full frontend test suite, scoped lint, and a production build.

## Scope

This change only alters the Color Sort bottle presentation and its responsive sizing. Puzzle rules, capacities, generation, colors, controls, sharing, and surrounding page layout remain unchanged.
