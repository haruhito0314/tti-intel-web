# Game Community Warm Static Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/game-community` visually static, more handwritten, and warmer without changing its content or navigation.

**Architecture:** Keep the page as one presentational React component and remove its page-specific GSAP hook and ref plumbing. Express the new visual language through scoped `.game-*` CSS, keeping body copy in the site font while applying the existing handwritten font token to display and label elements.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Tailwind utilities, scoped CSS in `frontend/src/index.css`.

## Global Constraints

- Remove all GSAP initial-entry, scroll-linked, and staggered animation from `/game-community`.
- Keep only subtle color and shadow transitions for direct pointer interaction; do not translate or rotate on hover.
- Keep body copy in the regular site font for readability.
- Do not change shared animation or colors on other pages.

---

### Task 1: Static semantic page structure

**Files:**
- Create: `frontend/src/pages/GameCommunity.test.tsx`
- Modify: `frontend/src/pages/GameCommunity.tsx`
- Delete: `frontend/src/hooks/useGameCommunityAnimations.ts`

**Interfaces:**
- Consumes: `GameCommunity` React component and existing `.game-*` class names.
- Produces: a page that renders immediately without animation refs, with `game-handwritten` on display headings and compact labels.

- [ ] **Step 1: Write the failing rendering test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GameCommunity } from './GameCommunity';

describe('Game Community の静かな手書き表現', () => {
    it('ページ全体を自動フェードさせず、主要な見出しとラベルを手書きで表示する', () => {
        const { container } = render(<MemoryRouter><GameCommunity /></MemoryRouter>);
        expect(container.firstElementChild).toHaveClass('game-community');
        expect(container.firstElementChild).not.toHaveClass('animate-fade-in');
        expect(screen.getByRole('heading', { name: 'Game Community', level: 1 })).toHaveClass('game-handwritten');
        expect(screen.getByRole('heading', { name: 'Featured Games', level: 2 })).toHaveClass('game-handwritten');
        expect(screen.getByRole('heading', { name: 'Play Style', level: 2 })).toHaveClass('game-handwritten');
        expect(screen.getByRole('link', { name: 'Discordに参加する' })).toHaveClass('game-handwritten');
    });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `cd frontend && npm test -- GameCommunity.test.tsx`
Expected: FAIL because the root still has `animate-fade-in` and the headings/CTA do not all have `game-handwritten`.

- [ ] **Step 3: Remove animation plumbing and mark handwritten display text**

In `GameCommunity.tsx`, remove `useRef`, the `useGameCommunityAnimations` import, all animation refs/setters, and `ref` props used only by the animation hook. Remove `animate-fade-in` from the root. Add `game-handwritten` to the hero title, section headings, card headings, tags, and buttons. Delete `useGameCommunityAnimations.ts` after its only consumer is removed.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `cd frontend && npm test -- GameCommunity.test.tsx`
Expected: PASS with 1 passing test.

### Task 2: Warm paper visual treatment

**Files:**
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: the existing `.game-*` markup and `--game-hand-font` token.
- Produces: warm light/dark palettes, paper-like cards, handwritten typography, and non-moving hover feedback scoped to `.game-community`.

- [ ] **Step 1: Add scoped typography and palette rules**

Update the `.game-community` color tokens to cream, parchment, warm ink, coral, amber, and sage values. Apply `var(--game-hand-font)` to `.game-hero-title`, `.game-section-heading h2`, card `h3`, `.game-tag`, and `.game-btn`; use lighter font weights and relaxed letter spacing.

- [ ] **Step 2: Convert panels to paper surfaces**

Replace neutral white/gray backgrounds and blue-gray shadows on recommendation, featured, play, activity, and photo cards with warm off-white fills, peach-tinted borders, and brown translucent shadows. Add a subtle repeating paper-line gradient only inside `.game-community` light bands and cards.

- [ ] **Step 3: Remove positional hover motion**

Remove `translateY` and rotation overrides from `.game-hero-card:hover`, `.game-featured-card:hover`, `.game-play-card:hover`, `.game-btn:hover`. Keep only background, border, and shadow changes. Add a `.game-community` reduced-motion media rule that disables scoped transitions.

- [ ] **Step 4: Run static checks**

Run: `cd frontend && npm run lint && npm run build`
Expected: both commands exit 0.

### Task 3: Browser visual verification

**Files:**
- Modify if necessary after inspection: `frontend/src/index.css`

**Interfaces:**
- Consumes: local Vite `/game-community` page.
- Produces: verified desktop/mobile light and dark layouts with no scroll-triggered movement.

- [ ] **Step 1: Start the local app and inspect desktop light mode**

Run: `cd frontend && npm run dev -- --host 127.0.0.1`
Expected: Vite prints a local URL. Open `/game-community` at 1280×900, scroll through the page, and confirm content is visible immediately with no parallax or entrance transitions.

- [ ] **Step 2: Inspect mobile and dark mode**

Open `/game-community` at 390×844 and repeat in dark mode. Confirm headings remain legible, handwritten display copy does not clip, three hero cards fit, and paper treatments retain sufficient contrast.

- [ ] **Step 3: Re-run regression checks**

Run: `cd frontend && npm test -- GameCommunity.test.tsx && npm run lint && npm run build`
Expected: all commands exit 0.
