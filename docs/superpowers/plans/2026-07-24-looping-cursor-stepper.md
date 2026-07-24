# Looping Cursor and Architecture Stepper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multicolor cursor with a translucent single-color ice-blue cursor, start each Codex demo cycle by clicking step 01, repeat the demo only while visible, and make the Architecture stepper large enough to read.

**Architecture:** Keep the visual companion as one self-contained HTML document. Move the cursor into stage coordinates so it can target both the Architecture stepper and Codex UI, introduce an explicit loop controller with cancellation and visibility gates, and expose observable DOM state for browser tests.

**Tech Stack:** Semantic HTML, CSS custom properties and media queries, vanilla JavaScript timers and observers, in-app browser Playwright assertions.

## Global Constraints

- Cursor color is the single ice-blue value `#BDEBFF`.
- Cursor fill, edge, shadow, and click ripple use only alpha variants of `#BDEBFF`.
- No cursor SVG gradient, black edge, dark-navy edge, or purple glow is allowed.
- The demo repeats only while the stage is at least 55% visible and the document is visible.
- A user pause survives leaving and re-entering the viewport.
- Reduced-motion mode is static and never loops.
- The Architecture stepper must not overlap the Codex window.
- The layout must fit 390×844, 844×390, and 1280×720.
- The target mock is under `.superpowers/` and intentionally ignored by Git; do not force-add it.

---

### Task 1: Single-Color Stage Cursor

**Files:**
- Modify: `.superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html`

**Interfaces:**
- Consumes: `#stage`, `.demo-cursor`, `.click-ring`, and target elements with `getBoundingClientRect()`.
- Produces: `moveCursorTo(node: Element): void` in stage coordinates and `.cursor-shape` using only `#BDEBFF`.

- [ ] **Step 1: Run the failing cursor-material assertion**

```js
(() => {
  const svg = document.querySelector(".cursor-arrow");
  const shape = document.querySelector(".cursor-shape");
  const cursor = getComputedStyle(document.querySelector(".demo-cursor"));
  const ring = getComputedStyle(document.querySelector(".click-ring"));
  return {
    noGradient: svg.querySelectorAll("linearGradient, radialGradient").length === 0,
    singleStroke: shape.getAttribute("stroke") === "rgba(189,235,255,.85)",
    singleFill: shape.getAttribute("fill") === "rgba(189,235,255,.35)",
    noPurple: !`${cursor.filter} ${ring.borderColor} ${ring.boxShadow}`.includes("126, 106, 255")
  };
})()
```

Expected: `noGradient`, `singleStroke`, `singleFill`, and `noPurple` are `false`.

- [ ] **Step 2: Move the cursor after the Architecture dock**

Use this markup as a direct child of `#stage`, after `.architecture-dock`:

```html
<div class="demo-cursor" aria-hidden="true">
  <span class="click-ring"></span>
  <svg class="cursor-arrow" viewBox="0 0 20 25" aria-hidden="true">
    <path
      class="cursor-shape"
      d="M2 1.5v19.2l5.1-4.5 3.2 7.1 3.7-1.7-3.2-6.8h7.1L2 1.5Z"
      fill="rgba(189,235,255,.35)"
      stroke="rgba(189,235,255,.85)"
    />
  </svg>
</div>
```

- [ ] **Step 3: Replace cursor CSS**

```css
.demo-cursor {
  --cursor-x: 55%;
  --cursor-y: 76%;
  position: absolute;
  z-index: 90;
  left: 0;
  top: 0;
  width: 34px;
  height: 42px;
  opacity: 0;
  pointer-events: none;
  transform: translate3d(var(--cursor-x), var(--cursor-y), 0);
  transition: transform .72s cubic-bezier(.2,.82,.2,1), opacity .2s ease;
  filter:
    drop-shadow(0 0 8px rgba(189,235,255,.54))
    drop-shadow(0 5px 11px rgba(189,235,255,.24));
  will-change: transform;
}
.cursor-shape {
  fill: rgba(189,235,255,.35);
  stroke: rgba(189,235,255,.85);
  stroke-width: 2.3;
  stroke-linejoin: round;
}
.click-ring {
  border-color: rgba(189,235,255,.78);
  box-shadow: 0 0 18px rgba(189,235,255,.46);
}
```

- [ ] **Step 4: Change movement to stage coordinates**

```js
function moveCursorTo(node) {
  if (!node) return;
  const cursor = document.querySelector(".demo-cursor");
  const stageRect = stage.getBoundingClientRect();
  const targetRect = node.getBoundingClientRect();
  const rawX = targetRect.left + targetRect.width * .56 - stageRect.left;
  const rawY = targetRect.top + targetRect.height * .52 - stageRect.top;
  const x = clamp(rawX, 8, stage.offsetWidth - cursor.offsetWidth - 8);
  const y = clamp(rawY, 8, stage.offsetHeight - cursor.offsetHeight - 8);
  cursor.style.setProperty("--cursor-x", `${x.toFixed(1)}px`);
  cursor.style.setProperty("--cursor-y", `${y.toFixed(1)}px`);
}
```

- [ ] **Step 5: Re-run the cursor assertion**

Expected: all four values are `true`.

- [ ] **Step 6: Record the ignored-artifact checkpoint**

Run:

```bash
git check-ignore -v .superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html
```

Expected: `.gitignore` reports the `.superpowers/` rule. Do not use `git add -f`.

### Task 2: Large Readable Architecture Stepper

**Files:**
- Modify: `.superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html`

**Interfaces:**
- Consumes: `.architecture-dock`, `.architecture-node[data-step]`, `.architecture-progress`, and `setArchitectureStep(step)`.
- Produces: `.architecture-count`, `.architecture-current`, `.architecture-toggle`, readable 100px desktop layout, and updated step copy.

- [ ] **Step 1: Run the failing readability assertion at 1280×720**

```js
(() => {
  const dock = document.querySelector(".architecture-dock").getBoundingClientRect();
  const active = document.querySelector(".architecture-node.is-current")?.getBoundingClientRect();
  const inactive = document.querySelector(".architecture-node:not(.is-current)")?.getBoundingClientRect();
  const title = document.querySelector(".architecture-node.is-current strong");
  return {
    dockTallEnough: dock.height >= 94,
    activeExpanded: Boolean(active && inactive && active.width / inactive.width >= 1.4),
    titleReadable: Number.parseFloat(getComputedStyle(title).fontSize) >= 10,
    hasCount: Boolean(document.querySelector(".architecture-count")),
    hasToggle: Boolean(document.querySelector(".architecture-toggle"))
  };
})()
```

Expected: all five values are `false`.

- [ ] **Step 2: Add step metadata and controls**

Replace the Architecture dock contents with:

```html
<div class="system-top">
  <div>
    <span class="system-kicker">AI DEVELOPMENT WORKFLOW</span>
    <h2>System architecture</h2>
  </div>
  <span class="architecture-count">STEP 1 OF 5</span>
  <button class="architecture-toggle" type="button" aria-label="アニメーションを一時停止">Ⅱ</button>
</div>
<div class="architecture-flow" aria-label="AIを使った開発ワークフロー">
  <button class="architecture-node" type="button" data-step="1" data-title="Instruction" data-description="目的と制約を指示する"><b>01</b><strong>Instruction</strong><span>目的と制約を指示する</span></button>
  <button class="architecture-node" type="button" data-step="2" data-title="Context" data-description="対象ファイルと履歴を読む"><b>02</b><strong>Context</strong><span>対象ファイルと履歴を読む</span></button>
  <button class="architecture-node" type="button" data-step="3" data-title="Execute" data-description="計画・編集・コマンドを進める"><b>03</b><strong>Execute</strong><span>計画・編集・コマンドを進める</span></button>
  <button class="architecture-node" type="button" data-step="4" data-title="Review" data-description="Diffと判断材料を確認する"><b>04</b><strong>Review</strong><span>Diffと判断材料を確認する</span></button>
  <button class="architecture-node" type="button" data-step="5" data-title="Verify" data-description="テストと画面サイズを検証する"><b>05</b><strong>Verify</strong><span>テストと画面サイズを検証する</span></button>
</div>
<div class="architecture-current">
  <strong>Instruction</strong><span>目的と制約を指示する</span>
</div>
<div class="architecture-progress"><span></span><i></i></div>
```

- [ ] **Step 3: Implement the desktop stepper**

```css
.architecture-dock {
  bottom: 12px;
  width: min(92vw, 980px);
  height: 100px;
  grid-template-columns: 150px minmax(0,1fr);
  grid-template-rows: minmax(0,1fr) 5px;
  gap: 8px 14px;
  padding: 12px 14px 10px;
}
.architecture-dock .system-top {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-columns: 1fr auto;
  align-content: center;
}
.architecture-count {
  grid-column: 1;
  margin-top: 8px;
  color: rgba(225,243,255,.78);
  font-size: 8px;
  letter-spacing: .1em;
}
.architecture-toggle {
  grid-column: 2;
  grid-row: 1 / 3;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(189,235,255,.42);
  border-radius: 50%;
  color: #eaf8ff;
  background: rgba(189,235,255,.12);
}
.architecture-dock .architecture-flow {
  display: flex;
  gap: 7px;
}
.architecture-dock .architecture-node {
  min-width: 0;
  height: auto;
  flex: 1 1 0;
  padding: 10px;
  text-align: left;
}
.architecture-dock .architecture-node.is-current { flex-grow: 1.65; }
.architecture-dock .architecture-node strong { font-size: 10px; }
.architecture-dock .architecture-node span {
  display: block;
  margin-top: 5px;
  font-size: 7px;
  white-space: nowrap;
}
.architecture-dock .architecture-node.is-complete b {
  font-size: 0;
}
.architecture-dock .architecture-node.is-complete b::after {
  content: "✓";
  font-size: 8px;
}
.architecture-progress { height: 5px; }
.architecture-current { display: none; }
```

- [ ] **Step 4: Update `setArchitectureStep`**

```js
function setArchitectureStep(step) {
  const product = document.querySelector(".product-window");
  const current = document.querySelector(`.architecture-node[data-step="${step}"]`);
  product.dataset.architectureStep = String(step);
  document.querySelectorAll(".architecture-node").forEach((node) => {
    const nodeStep = Number(node.dataset.step);
    node.classList.toggle("is-current", nodeStep === step);
    node.classList.toggle("is-complete", nodeStep < step || step === 5);
  });
  document.querySelector(".architecture-count").textContent = `STEP ${step} OF 5`;
  document.querySelector(".architecture-current strong").textContent = current.dataset.title;
  document.querySelector(".architecture-current span").textContent = current.dataset.description;
  document.querySelector(".architecture-progress").style.setProperty(
    "--architecture-progress",
    `${clamp((step - 1) / 4) * 100}%`
  );
}
```

- [ ] **Step 5: Re-run the readability assertion**

Call `setArchitectureStep(3)` through the existing DOM test hook before measuring.

Expected: all five values are `true`.

- [ ] **Step 6: Record the ignored-artifact checkpoint**

Run `git status --short`.

Expected: no tracked implementation change appears.

### Task 3: Visible-Only Loop Controller

**Files:**
- Modify: `.superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html`

**Interfaces:**
- Consumes: `moveCursorTo(node)`, `clickCursor()`, `typePrompt(text)`, `setArchitectureStep(step)`, `.architecture-toggle`, and `.architecture-node[data-step="1"]`.
- Produces: `demoController`, `resetDemoState()`, `startDemoCycle()`, `stopDemo()`, and observable `data-demo-state` / `data-demo-cycle` attributes on `#stage`.

- [ ] **Step 1: Run the failing controller assertion**

```js
(() => ({
  state: document.querySelector("#stage").getAttribute("data-demo-state"),
  cycle: document.querySelector("#stage").getAttribute("data-demo-cycle"),
  toggleLabel: document.querySelector(".architecture-toggle")?.getAttribute("aria-label"),
  hasCycleStart: document.querySelector(".architecture-node[data-step='1']")?.classList.contains("is-clicked")
}))()
```

Expected: `state` and `cycle` are `null`; `hasCycleStart` is `false`.

- [ ] **Step 2: Add the controller and cancellation helpers**

Remove the current `demoStarted`, `demoTimers`, and `later()` declarations. Replace them with:

```js
const demoController = {
  state: "idle",
  cycle: 0,
  userPaused: false,
  visible: false,
  timers: new Set()
};

function setDemoState(state) {
  demoController.state = state;
  stage.dataset.demoState = state;
  stage.dataset.demoCycle = String(demoController.cycle);
}

function clearDemoTimers() {
  demoController.timers.forEach((timer) => clearTimeout(timer));
  demoController.timers.clear();
}

function scheduleDemo(delay, callback) {
  const cycle = demoController.cycle;
  const timer = setTimeout(() => {
    demoController.timers.delete(timer);
    if (cycle !== demoController.cycle || demoController.state === "paused") return;
    callback();
  }, delay);
  demoController.timers.add(timer);
}
```

- [ ] **Step 3: Add deterministic reset**

```js
function resetDemoState() {
  clearDemoTimers();
  document.querySelector(".typed-prompt").textContent = "";
  document.querySelectorAll(".codex-user, .codex-agent, .patch-line.added")
    .forEach((node) => node.classList.remove("is-visible"));
  const output = document.querySelector(".codex-test-output");
  output.classList.remove("ok");
  output.textContent = "Not run";
  const cursor = document.querySelector(".demo-cursor");
  cursor.classList.remove("is-visible", "is-clicking");
  document.querySelectorAll(".architecture-node")
    .forEach((node) => node.classList.remove("is-clicked"));
  setArchitectureStep(1);
  setDemoState(demoController.userPaused ? "paused" : "idle");
}
```

- [ ] **Step 4: Replace `startCursorDemo` with one complete cycle**

```js
function startDemoCycle() {
  if (!demoController.visible || demoController.userPaused || prefersReducedMotion()) return;
  resetDemoState();
  demoController.cycle += 1;
  setDemoState("playing");

  const cursor = document.querySelector(".demo-cursor");
  const stepOne = document.querySelector(".architecture-node[data-step='1']");
  const input = document.querySelector(".codex-composer");
  const send = document.querySelector(".codex-send");
  const reviewTarget = document.querySelector(".review-file.active");
  const diffTarget = document.querySelector(".codex-diff");
  const testTarget = document.querySelector(".test-run");
  const reviewVisible = isVisible(reviewTarget);

  cursor.classList.add("is-visible");
  moveCursorTo(stepOne);
  scheduleDemo(650, () => {
    clickCursor();
    stepOne.classList.add("is-clicked");
  });
  scheduleDemo(950, () => moveCursorTo(input));
  scheduleDemo(1450, clickCursor);
  scheduleDemo(1650, () => typePrompt("この /development ページをCodex中心の画面に作り直して"));
  scheduleDemo(3900, () => moveCursorTo(send));
  scheduleDemo(4550, () => {
    clickCursor();
    setArchitectureStep(2);
    document.querySelector(".codex-user").classList.add("is-visible");
  });
  scheduleDemo(5100, () => {
    setArchitectureStep(3);
    document.querySelector(".codex-agent").classList.add("is-visible");
  });
  scheduleDemo(5550, () => moveCursorTo(reviewVisible ? reviewTarget : diffTarget));
  scheduleDemo(6150, () => {
    clickCursor();
    setArchitectureStep(4);
    document.querySelectorAll(".patch-line.added").forEach((line) => line.classList.add("is-visible"));
  });
  scheduleDemo(6800, () => moveCursorTo(reviewVisible ? testTarget : diffTarget));
  scheduleDemo(7450, () => {
    clickCursor();
    setArchitectureStep(5);
    document.querySelector(".codex-test-output").textContent = "Running responsive checks…";
  });
  scheduleDemo(8550, () => {
    const output = document.querySelector(".codex-test-output");
    output.classList.add("ok");
    output.textContent = "✓ 18 tests passed · viewport verified";
    setDemoState("holding");
  });
  scheduleDemo(10050, () => {
    setDemoState("resetting");
    cursor.classList.remove("is-visible");
    stage.classList.add("is-resetting");
  });
  scheduleDemo(10550, () => {
    stage.classList.remove("is-resetting");
    startDemoCycle();
  });
}
```

- [ ] **Step 5: Add the reset fade and make text/click helpers cancellable**

```css
.codex-user,
.codex-agent,
.patch-line.added,
.architecture-node,
.architecture-progress span {
  transition:
    opacity .35s ease,
    transform .35s ease,
    width .6s cubic-bezier(.2,.82,.2,1);
}
.stage.is-resetting .codex-user,
.stage.is-resetting .codex-agent,
.stage.is-resetting .patch-line.added,
.stage.is-resetting .architecture-node,
.stage.is-resetting .architecture-progress span {
  opacity: 0;
}
```

```js
function clickCursor() {
  const cursor = document.querySelector(".demo-cursor");
  cursor.classList.remove("is-clicking");
  void cursor.offsetWidth;
  cursor.classList.add("is-clicking");
  scheduleDemo(450, () => cursor.classList.remove("is-clicking"));
}

function typePrompt(text, index = 0) {
  const target = document.querySelector(".typed-prompt");
  if (!target || index > text.length) return;
  target.textContent = text.slice(0, index);
  if (index < text.length) scheduleDemo(42, () => typePrompt(text, index + 1));
}
```

- [ ] **Step 6: Add viewport, tab-visibility, and pause control**

```js
function stopDemo() {
  demoController.cycle += 1;
  resetDemoState();
}

function syncDemoPlayback() {
  if (prefersReducedMotion()) {
    showFinalDemoState();
    return;
  }
  if (!demoController.visible || document.hidden || demoController.userPaused) {
    stopDemo();
    return;
  }
  startDemoCycle();
}

const stageObserver = new IntersectionObserver(([entry]) => {
  demoController.visible = entry.intersectionRatio >= .55;
  syncDemoPlayback();
}, { threshold: [.55] });

stageObserver.observe(stage);
document.addEventListener("visibilitychange", syncDemoPlayback);
document.querySelector(".architecture-toggle").addEventListener("click", () => {
  demoController.userPaused = !demoController.userPaused;
  const button = document.querySelector(".architecture-toggle");
  button.textContent = demoController.userPaused ? "▶" : "Ⅱ";
  button.setAttribute(
    "aria-label",
    demoController.userPaused ? "アニメーションを再生" : "アニメーションを一時停止"
  );
  syncDemoPlayback();
});
```

Delete the old progress-coupled start line from `updateProgress()`:

```js
if (progress > .19) startCursorDemo();
```

The IntersectionObserver is now the only automatic start source.

- [ ] **Step 7: Verify two cycles and pause**

Observe `data-demo-cycle` until it reaches `"2"`.

Expected:
- Cycle 1 and cycle 2 both add `.is-clicked` to step 01 before prompt text appears.
- `data-demo-state` visits `playing`, `holding`, and `resetting`.
- After pressing `.architecture-toggle`, `data-demo-state` is `"paused"` and remains unchanged for 2 seconds.

- [ ] **Step 8: Record the ignored-artifact checkpoint**

Run `git status --short`.

Expected: no tracked implementation change appears.

### Task 4: Responsive Stepper and Final Verification

**Files:**
- Modify: `.superpowers/brainstorm/93082-1784892073/content/development-codex-light-v18.html`

**Interfaces:**
- Consumes: `.architecture-dock`, `.architecture-flow`, `.architecture-current`, `.architecture-toggle`, stage-level cursor, and the existing scroll-progress transform.
- Produces: readable 92px mobile layout, compact 58px short-height layout, static reduced-motion output, and non-overlapping required viewports.

- [ ] **Step 1: Run the failing mobile assertion at 390×844**

```js
(() => {
  const dock = document.querySelector(".architecture-dock").getBoundingClientRect();
  const current = getComputedStyle(document.querySelector(".architecture-current"));
  return {
    dockHeight: Math.round(dock.height),
    currentVisible: current.display !== "none",
    currentFont: Number.parseFloat(getComputedStyle(document.querySelector(".architecture-current strong")).fontSize),
    noOverlap: dock.top >= document.querySelector(".product-window").getBoundingClientRect().bottom
  };
})()
```

Expected before mobile CSS: `dockHeight` is not `92` and `currentVisible` is `false`.

- [ ] **Step 2: Add mobile and short-height layouts**

```css
@media (max-width: 520px) {
  .architecture-dock {
    bottom: 10px;
    width: calc(100% - 24px);
    height: 92px;
    grid-template-columns: minmax(0,1fr);
    grid-template-rows: 34px minmax(0,1fr) 5px;
    gap: 5px;
    padding: 8px 9px 7px;
  }
  .architecture-dock .system-top { display: none; }
  .architecture-dock .architecture-flow {
    grid-column: 1;
    grid-row: 1;
    gap: 5px;
  }
  .architecture-dock .architecture-node {
    height: 34px;
    padding: 6px 4px;
    text-align: center;
  }
  .architecture-dock .architecture-node.is-current { flex-grow: 1; }
  .architecture-dock .architecture-node b { display: block; margin: 0 0 2px; }
  .architecture-dock .architecture-node strong { display: block; font-size: 6px; }
  .architecture-dock .architecture-node span { display: none; }
  .architecture-current {
    grid-column: 1;
    grid-row: 2;
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  .architecture-current strong { color: #fff; font-size: 13px; }
  .architecture-current span {
    overflow: hidden;
    color: rgba(225,243,255,.74);
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .architecture-progress { grid-row: 3; }
}
@media (max-height: 520px) {
  .architecture-dock {
    bottom: 8px;
    height: 58px;
    grid-template-rows: minmax(0,1fr) 4px;
    padding-block: 7px 5px;
  }
  .architecture-dock .system-top,
  .architecture-current,
  .architecture-dock .architecture-node span { display: none; }
  .architecture-dock .architecture-flow { grid-column: 1 / -1; }
  .architecture-dock .architecture-node { padding: 7px 6px; }
  .architecture-dock .architecture-node strong { font-size: 8px; }
}
```

- [ ] **Step 3: Lift the desktop Codex window**

In `updateProgress()`, add:

```js
const dockLift = clamp((progress - .18) / .08) * 46;
const effectiveDockLift = window.innerHeight <= 520 ? 0 : dockLift;
const y = (155 - clamp(progress / .52) * 155 - late * 42 - effectiveDockLift) * heightFactor;
```

- [ ] **Step 4: Keep reduced motion static**

Use the existing `prefersReducedMotion()` branch to call `showFinalDemoState()`, set `data-demo-state="paused"`, hide `.architecture-toggle`, and never call `startDemoCycle()`.

- [ ] **Step 5: Verify required viewports**

At 390×844, 844×390, and 1280×720, assert:

```js
(() => {
  const product = document.querySelector(".product-window").getBoundingClientRect();
  const dock = document.querySelector(".architecture-dock").getBoundingClientRect();
  const cursor = document.querySelector(".demo-cursor").getBoundingClientRect();
  const cursorStyle = getComputedStyle(document.querySelector(".demo-cursor"));
  return {
    productInside: product.left >= 0 && product.right <= innerWidth && product.top >= 0 && product.bottom <= innerHeight,
    dockInside: dock.left >= 0 && dock.right <= innerWidth && dock.top >= 0 && dock.bottom <= innerHeight,
    noOverlap: dock.top >= product.bottom,
    cursorInside: cursorStyle.display === "none" || Number(cursorStyle.opacity) < .1 ||
      (cursor.left >= 0 && cursor.right <= innerWidth && cursor.top >= 0 && cursor.bottom <= innerHeight)
  };
})()
```

Expected: all four values are `true` in all three viewports.

- [ ] **Step 6: Verify looping, pause, and reduced motion**

Expected:
- Two full cycles reach step 5 and the second cycle begins at step 1.
- Pause freezes `data-demo-cycle`, `data-demo-state`, prompt text, and cursor transform for 2 seconds.
- Leaving the section resets to step 1.
- Re-entry starts a new cycle only when not user-paused.
- Reduced motion shows `STEP 5 OF 5`, five visible steps, full progress, no cursor, and no timer-driven state change.

- [ ] **Step 7: Restore the default viewport and finalize the visual companion**

Reset the temporary viewport override, reload the demo at scroll position 0, confirm the visual-companion server is active, and finalize the local tab as the deliverable.
