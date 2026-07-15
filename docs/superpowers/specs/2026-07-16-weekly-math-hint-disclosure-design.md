# Weekly Math Hint Disclosure Design

## Goal

Make hints available on each public weekly-math problem without showing them before the reader asks for help. Keep the solution as the primary action and give the hint a quieter, Apple-like secondary treatment.

## Interaction

- Place the actions immediately below the problem card.
- Keep `解説を見る` as the filled primary button.
- Add a bordered, neutral `ヒント` button directly to its right when a non-empty hint exists.
- The hint starts collapsed.
- Pressing `ヒント` reveals the hint in a card below the action row; pressing it again collapses the card.
- Add `aria-expanded` and `aria-controls` to the hint button so its state and target are available to assistive technology.
- A small chevron rotates to communicate the open state. No decorative icon is needed.

## Visual behavior

- Use the existing Button and Card components so light mode, dark mode, spacing, and focus states remain consistent with the site.
- Give the hint card a subtle blue border and a short fade/slide transition rather than a modal or a strong alert treatment.
- Let the action row wrap on narrow screens while preserving the order `解説を見る`, then `ヒント`.
- If the solution is unpublished, show the existing preparation message and keep the hint button available beside it when a hint exists.

## Testing

- Verify that a saved hint is not visible initially.
- Verify that the secondary `ヒント` button is next to the solution action and exposes the correct collapsed state.
- Verify that pressing the button reveals the hint and updates its expanded state.
- Verify that pressing it again hides the hint.
- Run the focused component test, the relevant weekly-math fallback test, the production build, and a local browser check.
