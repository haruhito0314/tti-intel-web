# Single Codex Window and Real CLI Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep one Codex window from the launcher through the development demo, keep its cursor visible, and replace fictional Plugin and MCP screens with operations that exist in Codex CLI.

**Architecture:** `CodexDemo` owns one Codex window DOM node and places it inside the launcher workspace beside Terminal and the app panel. CSS state classes move that same node from its initial left position to the central working position. Plugin and MCP scenes remain timed React scenes, but their contents become faithful Codex CLI terminal states instead of invented application dashboards.

**Tech Stack:** React 19, TypeScript, CSS animations, Vitest, Testing Library, Playwright CLI, Vite.

## Global Constraints

- Do not render a second primary Codex window during the launcher-to-work transition.
- Do not hide the pointer between selecting the Codex window and focusing its composer.
- Do not create product controls, dashboards, or commands that do not exist in Codex, Vercel, or AWS.
- Plugin is installed and enabled through `/plugins`; it is not launched with a custom Run button.
- MCP configuration is inspected through `codex mcp list`; connected tools are used from a normal Codex session.
- Browser Use must not be labeled as an MCP server.
- Preserve the existing preview, lower project cards, participation section, and user-owned worktree changes.
- Do not stage or commit files while unrelated user changes remain in the worktree.

---

### Task 1: One persistent Codex window and cursor

**Files:**
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.css`
- Modify: `frontend/src/components/development/developmentMotion.ts`
- Test: `frontend/src/pages/Development.test.tsx`

**Interfaces:**
- Produces: `demoCursorTarget(time: number): 'origin' | 'codex-window' | 'input' | 'send' | 'work' | 'runtime' | null`
- Produces: one element with `data-dx-codex-window="primary"`
- Produces: one title-bar target with `data-dx-cursor-target="codex-window"`

- [ ] **Step 1: Write failing DOM and timing tests**

Add `demoCursorTarget` to the test import and add these assertions:

```tsx
it('keeps one Codex window through the launcher transition', () => {
    const { container } = render(
        <MemoryRouter>
            <Development />
        </MemoryRouter>,
    );

    expect(container.querySelectorAll('[data-dx-codex-window="primary"]')).toHaveLength(1);
    expect(container.querySelector('.dx-product-window')).toBe(
        container.querySelector('.dx-launcher-codex-screen'),
    );
});

it('keeps the cursor attached while the Codex window becomes the work surface', () => {
    expect(demoCursorTarget(3_900)).toBe('codex-window');
    expect(demoCursorTarget(4_100)).toBe('codex-window');
    expect(demoCursorTarget(4_700)).toBe('codex-window');
    expect(demoCursorTarget(4_900)).toBe('input');
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
cd frontend
npx vitest run src/pages/Development.test.tsx --reporter=verbose
```

Expected: the primary-window count or identity assertion fails, and `demoCursorTarget` is not exported.

- [ ] **Step 3: Move cursor timing into the motion module**

Add this exported function to `developmentMotion.ts` and remove the local `cursorTarget` implementation:

```ts
export function demoCursorTarget(time: number) {
    if (time < 250) return 'origin';
    if (time < 4_800) return 'codex-window';
    if (time < 6_000) return 'input';
    if (time < 6_850) return 'send';
    if (time < 10_050) return 'work';
    if (time < 12_300) return 'input';
    if (time < 13_100) return 'send';
    if (time < 14_350) return null;
    if (time < 15_550) return 'runtime';
    return null;
}
```

Import and use it from `DevelopmentExperience.tsx`.

- [ ] **Step 4: Render the full Codex content as the launcher’s Codex child**

Change `ToolLauncher` to accept a `codexWindow: ReactNode` prop:

```tsx
function ToolLauncher({
    hidden,
    codexOpen,
    codexWindow,
}: {
    hidden: boolean;
    codexOpen: boolean;
    codexWindow: ReactNode;
}) {
    return (
        <div className={`dx-tool-launcher ${codexOpen ? 'is-opening' : ''} ${hidden ? 'is-hidden' : ''}`}>
            {codexWindow}
            <section className="dx-launcher-terminal-screen dx-window-glass" aria-label="起動中のTerminal">
                {/* existing Terminal content */}
            </section>
            <section className="dx-launcher-app-panel dx-window-glass" aria-label="アプリランチャー">
                {/* existing launcher content */}
            </section>
        </div>
    );
}
```

Build the single primary window in `CodexDemo` using both existing class names:

```tsx
const codexWindow = (
    <div
        className={`dx-launcher-codex-screen dx-product-window dx-window-glass ${contentReady ? 'is-content-ready' : ''}`}
        data-dx-codex-window="primary"
        style={motionStyle}
    >
        <div className="dx-window-bar" data-dx-cursor-target="codex-window" data-dx-cursor-y="0.5">
            {/* existing title bar */}
        </div>
        {/* existing full .dx-codex-app content */}
    </div>
);
```

Remove the standalone `.dx-product-window` wrapper and pass `codexWindow` into `ToolLauncher`.

- [ ] **Step 5: Keep the launcher container alive until the scene handoff**

Replace the old early hiding condition:

```ts
const launcherHidden = reducedMotion || progress >= 0.995;
```

Use `is-opening` only to fade Terminal and the app panel. Do not hide `.dx-tool-launcher` at 4.2 seconds.

- [ ] **Step 6: Add final CSS overrides for the single node**

Add a focused block at the end of `DevelopmentExperience.css`:

```css
.dx-tool-launcher > .dx-launcher-codex-screen.dx-product-window {
    position: absolute;
    inset: auto;
    z-index: 7;
    opacity: 1;
}

.dx-tool-launcher:not(.is-opening) > .dx-launcher-codex-screen.dx-product-window {
    left: 0;
    top: 7%;
    width: 56.5%;
    height: 86%;
}

.dx-tool-launcher.is-opening > .dx-launcher-codex-screen.dx-product-window {
    left: 50%;
    top: 50%;
    width: 84%;
    height: 96%;
    transform: translate(-50%, -50%);
}

.dx-demo-cursor {
    z-index: 240;
}
```

Before `.is-content-ready`, reduce internal detail without replacing the node:

```css
.dx-launcher-codex-screen:not(.is-content-ready) .dx-codex-sidebar,
.dx-launcher-codex-screen:not(.is-content-ready) .dx-review {
    opacity: 0;
}
```

Use a mobile override with `width: 92%` and a height that remains within the existing glass surface.

- [ ] **Step 7: Run the focused tests and verify GREEN**

Run:

```bash
cd frontend
npx vitest run src/pages/Development.test.tsx --reporter=verbose
```

Expected: all Development tests pass.

### Task 2: Real Codex CLI Plugin flow

**Files:**
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.css`
- Test: `frontend/src/pages/Development.test.tsx`

**Interfaces:**
- Produces: `.dx-plugin-cli` with `aria-label="Codex CLI Plugin browser"`
- Produces: visible `/plugins`, Installed, and Enabled states
- Removes: `.dx-plugin-steps`, `.dx-plugin-terminal`, and `.dx-scene-trigger--run`

- [ ] **Step 1: Write a failing Plugin reality test**

```tsx
it('shows Plugin installation and enablement instead of executing a fictional Plugin app', () => {
    const { container } = render(
        <MemoryRouter>
            <Development />
        </MemoryRouter>,
    );

    expect(screen.getByLabelText('Codex CLI Plugin browser')).toHaveTextContent('/plugins');
    expect(screen.getByLabelText('Codex CLI Plugin browser')).toHaveTextContent('Installed');
    expect(screen.getByLabelText('Codex CLI Plugin browser')).toHaveTextContent('Enabled');
    expect(container.querySelector('.dx-scene-trigger--run')).not.toBeInTheDocument();
    expect(container.querySelector('.dx-plugin-steps')).not.toBeInTheDocument();
    expect(container.querySelector('.dx-plugin-terminal')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
cd frontend
npx vitest run src/pages/Development.test.tsx --reporter=verbose
```

Expected: `Codex CLI Plugin browser` is missing and the old fictional controls still exist.

- [ ] **Step 3: Replace `PluginAutomationScene` with a CLI browser and normal session**

Render one terminal window. During the first half of `run`, show:

```text
› /plugins
Plugins
OpenAI    Personal    Installed
Release Workflow
Reusable checks for this website
Installed    Enabled
Space Toggle    Enter Details    Esc Back
```

During the second half, show a new normal Codex session:

```text
› $release-workflow を使って、変更を公開前まで確認して
Using skill: release-workflow
Read skills/release/SKILL.md
Ran npm test
Ran npm run build
確認が完了しました。
```

Do not render a button labeled `実行`, a Plugin-specific task dashboard, or a nested fake terminal.

- [ ] **Step 4: Restyle the scene as a faithful terminal TUI**

Use one `.dx-window-glass` around the terminal window. Add tab, selected-row, status-pill, composer, and streamed tool-result styles under `.dx-plugin-cli`. Remove selectors that only supported the old manifest/dashboard split.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
cd frontend
npx vitest run src/pages/Development.test.tsx --reporter=verbose
```

Expected: all Development tests pass.

### Task 3: Real MCP configuration and tool-use flow

**Files:**
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.css`
- Test: `frontend/src/pages/Development.test.tsx`

**Interfaces:**
- Produces: `.dx-mcp-cli` with `aria-label="Codex CLI MCP session"`
- Produces: visible `codex mcp list` and configured Figma/GitHub rows
- Removes: `.dx-mcp-route` and `.dx-scene-trigger--connect`

- [ ] **Step 1: Write a failing MCP reality test**

```tsx
it('shows MCP configuration and tool results in Codex CLI without a fictional connection dashboard', () => {
    const { container } = render(
        <MemoryRouter>
            <Development />
        </MemoryRouter>,
    );

    expect(screen.getByLabelText('Codex CLI MCP session')).toHaveTextContent('codex mcp list');
    expect(screen.getByLabelText('Codex CLI MCP session')).toHaveTextContent('figma');
    expect(screen.getByLabelText('Codex CLI MCP session')).toHaveTextContent('github');
    expect(container.querySelector('.dx-mcp-route')).not.toBeInTheDocument();
    expect(container.querySelector('.dx-scene-trigger--connect')).not.toBeInTheDocument();
    expect(screen.queryByText('Browser', { exact: true })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
cd frontend
npx vitest run src/pages/Development.test.tsx --reporter=verbose
```

Expected: `Codex CLI MCP session` is missing and the old connection diagram remains.

- [ ] **Step 3: Replace `McpConnectionScene` with terminal configuration and a Codex turn**

During the first phase, render:

```text
$ codex mcp list
Name       Status      Auth
figma      enabled     OAuth
github     enabled     OAuth
```

During the second phase, show a normal Codex prompt and tool events:

```text
› FigmaのデザインとGitHubのIssueを確認して、実装との差をまとめて
Called Figma MCP
Design context received
Called GitHub MCP
Issue requirements received
2つの情報を比較しました。
```

Do not display Browser as an MCP server. Do not add a connection button or a node-and-arrow architecture diagram.

- [ ] **Step 4: Style the MCP scene with the same terminal primitives**

Reuse the terminal bar, monospace output, composer, tool-event row, and success status styles from Task 2. Keep Figma and GitHub as text rows and tool events rather than product cards.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
cd frontend
npx vitest run src/pages/Development.test.tsx --reporter=verbose
```

Expected: all Development tests pass.

### Task 4: Responsive motion and regression verification

**Files:**
- Modify if required by evidence: `frontend/src/components/development/DevelopmentExperience.css`
- Verify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Verify: `frontend/src/pages/Development.test.tsx`

**Interfaces:**
- Consumes: the single Codex node and real CLI scenes from Tasks 1–3
- Produces: verified PC, 390px, and 360px layouts

- [ ] **Step 1: Start the local preview**

Run:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5176
```

- [ ] **Step 2: Verify single-node motion and cursor visibility in a real browser**

At desktop width, inspect the transition from 3.8 to 5.0 seconds. Confirm:

```text
[data-dx-codex-window="primary"] count = 1
.dx-demo-cursor opacity remains 1
The primary node moves from the left workspace slot to the centre
Terminal and launcher fade after the primary node starts moving
```

- [ ] **Step 3: Verify Plugin and MCP frames**

Capture one screenshot of `/plugins`, one of the installed Plugin being used in a new Codex session, one of `codex mcp list`, and one of MCP tool-result rows. Confirm that none contains the removed buttons, dashboard, or connection diagram.

- [ ] **Step 4: Verify responsive bounds**

At `390x844` and `360x800`, measure the primary Codex window, Plugin terminal, and MCP terminal against their glass positioning surface:

```js
const outside = child.left < host.left - 1
    || child.right > host.right + 1
    || child.top < host.top - 1
    || child.bottom > host.bottom + 1;
```

Expected: `outside` is `false` for every checked window.

- [ ] **Step 5: Run full verification**

Run:

```bash
cd frontend
npx vitest run src/pages/Development.test.tsx --reporter=verbose
npx eslint src/components/development/DevelopmentExperience.tsx src/components/development/developmentMotion.ts src/pages/Development.test.tsx
npm run build
cd ..
git diff --check
```

Expected: tests, ESLint, build, and diff check exit successfully.

