# Color Sort Puzzle Design

## Goal

Add a playable color sort puzzle to the app showcase area at `/app/color-sort`, with an Apple-like visual style that fits the existing site.

## Experience

The app showcase gains a new card for `カラーソートパズル`. The card links to a dedicated page. The page opens directly into the playable experience rather than a landing page.

The puzzle uses seven transparent bottle-like columns with eight vertical color slots each. Initial boards use a random-looking distribution of five colors across all seven bottles, not fixed empty helper bottles. Players click or tap one bottle, then another bottle to pour the top contiguous color group when the move is legal. The puzzle is solved when every non-empty bottle contains a single color and is full.

A star control can load a harder optional board using six colors across seven bottles. Generated boards are checked with the normal color-sort rules before adoption, with star mode using a deeper bounded solver check than normal mode. The UI marks star mode with an active star button and a visible star-mode badge.

## Visual Direction

Use the site's existing Apple-inspired tokens and layout conventions: white and near-black surfaces, generous spacing, restrained borders, soft shadows, and clear typography. Color appears mainly in the puzzle liquid layers. Controls use icon buttons where possible, with short labels only where clarity matters.

## Scope

- Add a new React page at `frontend/src/pages/ColorSortPuzzle.tsx`.
- Add route `/app/color-sort` in `frontend/src/App.tsx`.
- Add a card to `frontend/src/pages/AppShowcase.tsx`.
- Keep puzzle state local to the page.
- Include reset, undo, and new puzzle controls.
- Verify with TypeScript build.

## Non-Goals

- No backend storage.
- No leaderboard.
- No generated image asset.
- No external game engine.
