# Codex Architecture Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Codex demo’s glass materials, cursor actions, and five-step AI development architecture tell one synchronized story.

**Architecture:** Keep the visual companion as one self-contained HTML document. Add a small architecture state controller that maps existing cursor-demo events to five semantic workflow states, while CSS handles glass materials, active/completed node styling, responsive layout, and reduced-motion output.

**Tech Stack:** Semantic HTML, CSS custom properties and media queries, vanilla JavaScript timers, in-app browser Playwright assertions.

## Global Constraints

- The System Architecture is a public AI development workflow concept, not a representation of private Codex internals.
- The Codex surface remains white and uses a light frosted-glass material.
- The architecture surface uses blue-tinted transparent acrylic while keeping labels legible.
- The cursor must not use a black or dark-navy outline or shadow.
- No real repository, private data, backend, or external API is connected.
- The layout must remain within the viewport at 390×844, 844×390, and 1280×720.
- `prefers-reduced-motion: reduce` must preserve all five workflow labels without movement.

---

### Task 1: Glass Material and Luminous Cursor

**Files:**
- Modify: `.superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html`

**Interfaces:**
- Consumes: existing `.product-window`, `.assistant-layer`, `.codex-app`, `.demo-cursor`, `.cursor-arrow`, and `.click-ring` elements.
- Produces: `.cursor-shape`, `#cursor-edge`, and computed styles that expose frosted white glass and a cyan-violet cursor edge.

- [ ] **Step 1: Run the failing browser assertion**

Evaluate against the loaded demo:

```js
(() => {
  const product = getComputedStyle(document.querySelector(".product-window"));
  const app = getComputedStyle(document.querySelector(".codex-app"));
  const path = document.querySelector(".cursor-arrow path");
  return {
    frosted: product.backdropFilter.includes("blur") || app.backdropFilter.includes("blur"),
    translucent: Number.parseFloat(app.backgroundColor.match(/[\d.]+\)$/)?.[0] ?? "1") < 1,
    luminousEdge: path?.getAttribute("stroke") === "url(#cursor-edge)",
    noDarkShadow: !getComputedStyle(document.querySelector(".demo-cursor")).filter.includes("19, 34, 56")
  };
})()
```

Expected: at least `frosted`, `luminousEdge`, and `noDarkShadow` are `false`.

- [ ] **Step 2: Implement the glass and cursor styles**

Update the product and app materials:

```css
.product-window {
  border-color: rgba(255,255,255,.72);
  background: rgba(248,251,255,.58);
  backdrop-filter: blur(28px) saturate(145%);
  -webkit-backdrop-filter: blur(28px) saturate(145%);
  box-shadow:
    0 42px 110px rgba(61,91,138,.22),
    0 10px 34px rgba(94,124,178,.12),
    inset 0 1px rgba(255,255,255,.96);
}
.assistant-layer,
.codex-app {
  background: rgba(255,255,255,.78);
  backdrop-filter: blur(22px) saturate(135%);
  -webkit-backdrop-filter: blur(22px) saturate(135%);
}
.demo-cursor {
  filter:
    drop-shadow(0 0 8px rgba(92,200,255,.62))
    drop-shadow(0 5px 12px rgba(126,106,255,.25));
}
.cursor-shape {
  fill: rgba(255,255,255,.72);
  stroke: url(#cursor-edge);
  stroke-width: 2.4;
  stroke-linejoin: round;
}
.click-ring {
  border-color: rgba(115,203,255,.82);
  box-shadow: 0 0 20px rgba(143,125,255,.52);
}
```

Replace the cursor SVG with:

```html
<svg class="cursor-arrow" viewBox="0 0 20 25" aria-hidden="true">
  <defs>
    <linearGradient id="cursor-edge" x1="2" y1="2" x2="18" y2="23" gradientUnits="userSpaceOnUse">
      <stop stop-color="#8de7ff"/>
      <stop offset=".5" stop-color="#77bfff"/>
      <stop offset="1" stop-color="#b798ff"/>
    </linearGradient>
  </defs>
  <path class="cursor-shape" d="M2 1.5v19.2l5.1-4.5 3.2 7.1 3.7-1.7-3.2-6.8h7.1L2 1.5Z"/>
</svg>
```

- [ ] **Step 3: Re-run the browser assertion**

Expected: all four values are `true`.

- [ ] **Step 4: Commit the independently testable material update**

```bash
git add .superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html
git commit -m "Refine Codex glass and cursor materials"
```

### Task 2: Five-Step Architecture State Controller

**Files:**
- Modify: `.superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html`

**Interfaces:**
- Consumes: cursor-demo milestones from `startCursorDemo()` and terminal state from `showFinalDemoState()`.
- Produces: `setArchitectureStep(step: number): void`, `.architecture-node[data-step]`, `.is-current`, `.is-complete`, and `data-architecture-step` on `.product-window`.

- [ ] **Step 1: Run the failing structure assertion**

```js
(() => ({
  nodes: document.querySelectorAll(".architecture-node[data-step]").length,
  hasController: typeof window.setArchitectureStep === "function",
  currentNodes: document.querySelectorAll(".architecture-node.is-current").length
}))()
```

Expected: `nodes` is `0` and `hasController` is `false`.

- [ ] **Step 2: Replace the generic four-node architecture**

Use this five-step public workflow:

```html
<div class="system-top">
  <div>
    <span class="system-kicker">AI DEVELOPMENT WORKFLOW</span>
    <h2>System architecture</h2>
  </div>
  <span class="system-status">USER INTENT → VERIFIED CHANGE</span>
</div>
<div class="architecture-flow" aria-label="AIを使った開発ワークフロー">
  <article class="architecture-node" data-step="1"><b>01</b><strong>Instruction Layer</strong><span>intent / constraints / goal</span></article>
  <article class="architecture-node" data-step="2"><b>02</b><strong>Repository Context</strong><span>files / history / scope</span></article>
  <article class="architecture-node" data-step="3"><b>03</b><strong>Model &amp; Tool Execution</strong><span>plan / edit / command</span></article>
  <article class="architecture-node" data-step="4"><b>04</b><strong>Patch &amp; Review</strong><span>diff / decision / feedback</span></article>
  <article class="architecture-node" data-step="5"><b>05</b><strong>Verification</strong><span>test / viewport / result</span></article>
</div>
<div class="architecture-progress"><span></span><i></i></div>
```

- [ ] **Step 3: Add active, completed, and layered-glass styling**

```css
.system-layer {
  background:
    linear-gradient(135deg, rgba(19,47,91,.80), rgba(53,80,139,.64)),
    radial-gradient(circle at 78% 18%, rgba(122,214,255,.32), transparent 42%);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
}
.architecture-flow {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
.architecture-node {
  opacity: .28;
  border: 1px solid rgba(169,221,255,.22);
  background: rgba(225,243,255,.08);
  backdrop-filter: blur(14px);
  transition: opacity .45s ease, transform .55s ease, border-color .45s ease, background .45s ease;
}
.architecture-node.is-current {
  opacity: 1;
  transform: translateY(-8px);
  border-color: rgba(154,224,255,.82);
  background: rgba(188,222,255,.20);
  box-shadow: 0 18px 44px rgba(87,191,255,.18);
}
.architecture-node.is-complete { opacity: .68; }
```

- [ ] **Step 4: Add the minimal controller**

```js
function setArchitectureStep(step) {
  const product = document.querySelector(".product-window");
  product.dataset.architectureStep = String(step);
  document.querySelectorAll(".architecture-node").forEach((node) => {
    const nodeStep = Number(node.dataset.step);
    node.classList.toggle("is-current", nodeStep === step);
    node.classList.toggle("is-complete", nodeStep < step || step === 5);
  });
  document.querySelector(".architecture-progress").style.setProperty("--architecture-progress", `${clamp((step - 1) / 4) * 100}%`);
}
window.setArchitectureStep = setArchitectureStep;
```

- [ ] **Step 5: Synchronize controller calls with existing actions**

Add calls at the causal event, not at arbitrary decorative intervals:

```js
later(1120, () => {
  setArchitectureStep(1);
  typePrompt("この /development ページをCodex中心の画面に作り直して");
});
later(4000, () => {
  clickCursor();
  setArchitectureStep(2);
  document.querySelector(".codex-user").classList.add("is-visible");
});
later(4550, () => {
  setArchitectureStep(3);
  document.querySelector(".codex-agent").classList.add("is-visible");
});
later(5600, () => {
  clickCursor();
  setArchitectureStep(4);
  document.querySelectorAll(".patch-line.added").forEach((line) => line.classList.add("is-visible"));
});
later(6950, () => {
  clickCursor();
  setArchitectureStep(5);
  document.querySelector(".codex-test-output").textContent = "Running responsive checks…";
});
```

Call `setArchitectureStep(5)` from `showFinalDemoState()`.

- [ ] **Step 6: Verify every step has exactly one current node**

For each `step` from 1 through 5, evaluate:

```js
setArchitectureStep(step);
({
  step: document.querySelector(".product-window").dataset.architectureStep,
  current: document.querySelectorAll(".architecture-node.is-current").length,
  completed: document.querySelectorAll(".architecture-node.is-complete").length
})
```

Expected: `step` matches the input, `current` is `1`, and `completed` increases monotonically.

- [ ] **Step 7: Commit the synchronized architecture**

```bash
git add .superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html
git commit -m "Synchronize Codex actions with architecture"
```

### Task 3: Responsive and Reduced-Motion Delivery

**Files:**
- Modify: `.superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html`

**Interfaces:**
- Consumes: `.architecture-flow`, `.architecture-node`, `setArchitectureStep()`, and existing viewport-safe product sizing.
- Produces: a one-row mobile timeline, compact short-height labels, and a static complete reduced-motion view.

- [ ] **Step 1: Run the failing mobile assertion**

At 390×844, evaluate:

```js
(() => {
  const product = document.querySelector(".product-window").getBoundingClientRect();
  const nodes = [...document.querySelectorAll(".architecture-node")].map((node) => node.getBoundingClientRect());
  return {
    productInside: product.left >= 0 && product.right <= innerWidth && product.top >= 0 && product.bottom <= innerHeight,
    allNodesInside: nodes.every((rect) => rect.left >= product.left && rect.right <= product.right),
    fiveLabels: nodes.length === 5,
    mobileTimeline: getComputedStyle(document.querySelector(".architecture-flow")).display === "flex",
    mobileCopyCompacted: [...document.querySelectorAll(".architecture-node span")]
      .every((label) => getComputedStyle(label).display === "none")
  };
})()
```

Expected before responsive styling: `mobileTimeline` and `mobileCopyCompacted` are `false`.

- [ ] **Step 2: Add mobile timeline and short-height rules**

```css
@media (max-width: 760px) {
  .architecture-flow {
    display: flex;
    gap: 8px;
    overflow: hidden;
  }
  .architecture-node {
    min-width: 0;
    flex: 1 1 0;
    padding: 10px 7px;
  }
  .architecture-node span { display: none; }
  .architecture-node strong { font-size: 8px; line-height: 1.25; }
}
@media (max-height: 520px) {
  .system-kicker,
  .system-status,
  .architecture-node span { display: none; }
  .architecture-node { padding-block: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .system-layer { opacity: 1; }
  .architecture-node { opacity: .72; transform: none; transition: none; }
  .architecture-progress span { width: 100%; }
}
```

- [ ] **Step 3: Verify the three required viewports**

At 390×844, 844×390, and 1280×720, run:

```js
(() => {
  const product = document.querySelector(".product-window").getBoundingClientRect();
  const cursor = document.querySelector(".demo-cursor").getBoundingClientRect();
  const nodes = [...document.querySelectorAll(".architecture-node")].map((node) => node.getBoundingClientRect());
  return {
    viewport: [innerWidth, innerHeight],
    productInside: product.left >= 0 && product.right <= innerWidth && product.top >= 0 && product.bottom <= innerHeight,
    cursorInside: getComputedStyle(document.querySelector(".demo-cursor")).display === "none" ||
      (cursor.left >= product.left && cursor.right <= product.right && cursor.top >= product.top && cursor.bottom <= product.bottom),
    architectureInside: nodes.every((rect) => rect.left >= product.left && rect.right <= product.right && rect.top >= product.top && rect.bottom <= product.bottom)
  };
})()
```

Expected: all three booleans are `true` at every viewport.

- [ ] **Step 4: Verify the full animated sequence**

Reload at 1280×720, scroll until the demo starts, wait 8.2 seconds, and assert:

```js
({
  user: document.querySelector(".codex-user").classList.contains("is-visible"),
  agent: document.querySelector(".codex-agent").classList.contains("is-visible"),
  patch: [...document.querySelectorAll(".patch-line.added")].every((line) => line.classList.contains("is-visible")),
  tests: document.querySelector(".codex-test-output").classList.contains("ok"),
  architectureStep: document.querySelector(".product-window").dataset.architectureStep,
  nodes: document.querySelectorAll(".architecture-node").length
})
```

Expected: `user`, `agent`, `patch`, and `tests` are `true`, `architectureStep` is `"5"`, and `nodes` is `5`.

- [ ] **Step 5: Commit the responsive delivery**

```bash
git add .superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html
git commit -m "Make architecture motion viewport safe"
```
