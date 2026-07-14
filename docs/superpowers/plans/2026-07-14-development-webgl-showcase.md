# Development WebGL Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/development` を、全スクロール区間で視覚的フィードバックが続く7章構成の本格WebGL作品へ更新し、低性能・Reduced Motion・Save-Data・WebGL失敗時にも同じ情報とCTAを確実に提供する。

**Architecture:** route-lazyなDevelopment shellは章manifest、品質判定、HTML overlay、静的版だけを読み込む。high/low profileの時だけ入れ子のdynamic importで単一R3F Canvasと7 sceneを読み込む。章manifestと正規化scroll progressをHTML・WebGL・progress navigationで共有し、Canvas失敗時はエラー文を見せず静的版へ切り替える。旧DOM/CSS sceneはparity確認後に削除する。

**Tech Stack:** React 19、TypeScript 5.9、Three.js、React Three Fiber 9、Drei 10、react-postprocessing 3、GSAP 3、Vite 7、Vitest 4、React Three Test Renderer

## Global Constraints

- Site Shell and UI Foundationのhandoff gateとPublic Page Responsive UXのTask 14完了後に開始し、`DevHeader`, `ButtonLink`, route focus, focus ringを利用する。これにより共有`index.css`の同時編集を避け、最後のsite-wide lintをこの計画で実行する。
- 既存の7章比率 `[0.14, 0.335, 0.095, 0.085, 0.095, 0.115, 0.135]`、PC `1640vh`、mobile `1480vh` を維持する。
- Canvasは一つだけにし、sceneごとの追加network waterfallを作らない。
- Canvas内の文字・iconは装飾であり、章title、説明、技術名、workflow、全CTAをHTMLにも置く。
- 任意のprogressでambientまたは1つ以上のsceneが見え、scene blend weightsの合計を1にする。
- high/low/static profileは初回mount時に一度だけ決め、描画中にflappingさせない。
- Reduced Motion、Save-Data、WebGL2なし、software renderer、低性能mobileではCanvas moduleを取得しない。
- WebGL chunk取得、renderer初期化、context loss、scene実行のfailureは静的版へ無言で切り替える。
- Canvas/post effectsはHTML textとfocus ringへ適用せず、pointer/touch handlerはscrollを妨げない。
- Development以外の初期import closureにThree/R3F/Drei/postprocessingを含めない。
- 3D sceneの乱数は固定seedで生成し、renderごとにgeometryを作り直さない。

## Public contracts

`frontend/src/components/development/developmentTypes.ts` に次を定義し、別名の重複型を作らない。

```ts
import type { RefObject } from 'react';

export type DevChapterIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DevChapterId =
  | 'ai-core'
  | 'technology-constellation'
  | 'mcp-data-corridor'
  | 'build-chamber'
  | 'tool-orbit'
  | 'workflow-pipeline'
  | 'reconstruction-finale';

export type DevCta =
  | { kind: 'internal'; label: string; to: string; variant: 'primary' | 'secondary' }
  | { kind: 'external'; label: string; href: string; variant: 'primary' | 'secondary'; newTab: true };

export interface DevDetailGroup {
  label: string;
  items: readonly string[];
}

export interface DevChapterDefinition {
  index: DevChapterIndex;
  id: DevChapterId;
  number: '01' | '02' | '03' | '04' | '05' | '06' | '07';
  sceneLabel: string;
  title: string;
  description: string;
  range: readonly [number, number];
  details: readonly DevDetailGroup[];
  ctas: readonly DevCta[];
}

export type DevQualityTier = 'high' | 'low' | 'static';
export type DevQualityReason =
  | 'reduced-motion' | 'save-data' | 'webgl-unavailable'
  | 'software-renderer' | 'low-end-mobile'
  | 'high-end-desktop' | 'capability-default'
  | 'runtime-failure' | 'development-override';

export interface DevQualitySignals {
  reducedMotion: boolean;
  saveData: boolean;
  webgl2: boolean;
  majorPerformanceCaveat: boolean;
  softwareRenderer: boolean;
  smallViewport: boolean;
  coarsePointer: boolean;
  finePointer: boolean;
  viewportWidth: number;
  deviceMemoryGB: number | null;
  hardwareConcurrency: number | null;
}

export interface DevWebGLProfile {
  tier: 'high' | 'low';
  reason: DevQualityReason;
  maxDpr: 2 | 1.25;
  antialias: boolean;
  parallaxStrength: number;
  particles: { ambient: number; core: number; packets: number; finale: number };
  effects: {
    bloom: true;
    mipmapBlur: boolean;
    depthOfField: boolean;
    noiseOpacity: number;
    scanlineOpacity: number;
    chromaticAberration: number;
  };
}

export interface DevStaticProfile { tier: 'static'; reason: DevQualityReason }
export type DevRenderProfile = DevWebGLProfile | DevStaticProfile;

export interface DevScrollController {
  progress: number;
  activeChapter: DevChapterIndex;
  progressRef: RefObject<number>;
  scrollToChapter(index: DevChapterIndex, behavior?: ScrollBehavior): void;
}

export interface DevelopmentCanvasProps {
  progressRef: RefObject<number>;
  quality: DevWebGLProfile;
  active: boolean;
  pointerRef: RefObject<{ x: number; y: number }>;
  onFatalError(error: unknown): void;
}

export interface DevSceneProps {
  chapterIndex: DevChapterIndex;
  progressRef: RefObject<number>;
  quality: DevWebGLProfile;
}
```

---

### Task 1: 章manifestと空白のないscroll/blend modelを定義する

**Files:**
- Create: `frontend/src/components/development/developmentTypes.ts`
- Create: `frontend/src/components/development/developmentContent.ts`
- Create: `frontend/src/components/development/developmentContent.test.ts`
- Modify: `frontend/src/components/development/devScrollConfig.ts`
- Modify: `frontend/src/components/development/devScrollConfig.test.ts`
- Modify: `frontend/src/components/development/devScrollMath.ts`
- Create: `frontend/src/components/development/devScrollMath.test.ts`

**Interfaces:**
- Produces: `DEV_CHAPTERS: readonly DevChapterDefinition[]`
- Produces typed content: `DEV_TECHNOLOGIES`, `DEV_MCP_ENDPOINTS`, `DEV_BUILD_LAYERS`, `DEV_TOOLS`, `DEV_WORKFLOW_STEPS`
- Produces: `getSceneBlendWeights(progress: number): readonly [number,number,number,number,number,number,number]`
- Produces: `getChapterScrollTop(index, trackTop, trackHeight, viewportHeight): number`
- Preserves: `SCENE_RANGES`, `getChapterIndex`, `getChapterLocal`, `getTrackProgress`

- [ ] **Step 1: 章内容・順序・CTAの失敗テストを書く**

```ts
expect(DEV_CHAPTERS.map(chapter => chapter.id)).toEqual([
  'ai-core', 'technology-constellation', 'mcp-data-corridor',
  'build-chamber', 'tool-orbit', 'workflow-pipeline', 'reconstruction-finale',
]);
expect(DEV_CHAPTERS.map(chapter => chapter.range)).toEqual(SCENE_RANGES);
expect(DEV_CHAPTERS[3].ctas).toContainEqual(expect.objectContaining({ label: '制作物を見る', to: '/app' }));
expect(DEV_CHAPTERS[6].ctas.map(cta => cta.label)).toEqual(['Apps', 'Contact', 'Discord']);
```

各章のtitle/description/detailsが空でないこと、12技術、4 MCP endpoint、3 build layer、8 tools、4 workflow stepsをassertする。各typed itemはstable `id` とsceneに必要な `category` / `icon` / `note` / `accent` を持ち、`DEV_CHAPTERS.details`がこれらのlabelから生成されることを検証する。

- [ ] **Step 2: range・blendの失敗テストを書く**

```ts
expect(SCENE_RANGES.at(-1)?.[1]).toBeCloseTo(1, 10);
for (const progress of Array.from({ length: 1001 }, (_, i) => i / 1000)) {
  const weights = getSceneBlendWeights(progress);
  expect(weights.every(Number.isFinite)).toBe(true);
  expect(weights.every(weight => weight >= 0 && weight <= 1)).toBe(true);
  expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 6);
}
for (const [, boundary] of SCENE_RANGES.slice(0, -1)) {
  expect(getSceneBlendWeights(boundary).some(weight => weight > 0)).toBe(true);
}
```

- [ ] **Step 3: testsがmanifest/blend helper未実装で失敗することを確認する**

```bash
cd frontend
npm test -- src/components/development/developmentContent.test.ts src/components/development/devScrollConfig.test.ts src/components/development/devScrollMath.test.ts
```

- [ ] **Step 4: DEV_CHAPTERSを唯一の情報源として実装する**

現在のコピーと `sceneUtils` dataをtyped constantsへ移し、`DEV_CHAPTERS.details`はconstantsから生成する。3D座標だけは後の`sceneLayout.ts`でcontent IDへ対応させ、scene fileで技術/tool/workflow配列を再定義しない。Discord CTAは `siteConfig.social.discord.url` を参照する。章名は以下で固定する。

| # | sceneLabel | title |
| --- | --- | --- |
| 01 | AI Core Formation | AIとの対話から、制作が始まる。 |
| 02 | Technology Constellation | 技術を、組み合わせて使う。 |
| 03 | MCP Data Corridor | AIとツールを、ひとつの流れへ。 |
| 04 | Build Chamber | UI・コード・データを、作品へ。 |
| 05 | Tool Orbit | 日々の開発を加速する相棒たち。 |
| 06 | Workflow Pipeline | 判断は人が、実装はAIと。 |
| 07 | Reconstruction Finale | このページも、私たちの作品です。 |

- [ ] **Step 5: complementary blendとscroll targetを実装する**

境界前後の `CHAPTER_BOUNDARY_FADE` 区間だけcurrent/nextをsmoothstepで補完し、それ以外はactive sceneを1にする。0と1をclampし、どのprogressでも合計1。scroll targetは `trackTop + rangeStart * max(0, trackHeight - viewportHeight)`。

- [ ] **Step 6: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/components/development/developmentContent.test.ts src/components/development/devScrollConfig.test.ts src/components/development/devScrollMath.test.ts
npx eslint src/components/development/developmentTypes.ts src/components/development/developmentContent.ts src/components/development/devScrollConfig.ts src/components/development/devScrollMath.ts
npm run build
git add src/components/development/developmentTypes.ts src/components/development/developmentContent.ts src/components/development/developmentContent.test.ts src/components/development/devScrollConfig.ts src/components/development/devScrollConfig.test.ts src/components/development/devScrollMath.ts src/components/development/devScrollMath.test.ts
git commit -m "Define Development chapters and scroll model"
```

---

### Task 2: 一度だけの品質判定と完全な静的版を実装する

**Files:**
- Create: `frontend/src/components/development/developmentQuality.ts`
- Create: `frontend/src/components/development/developmentQuality.test.ts`
- Create: `frontend/src/components/development/DevelopmentStaticFallback.tsx`
- Create: `frontend/src/components/development/DevelopmentStaticFallback.test.tsx`
- Create: `frontend/src/components/development/development.css`

**Interfaces:**
- Produces: `collectDevQualitySignals(): DevQualitySignals`
- Produces: `selectDevRenderProfile(signals, override?): DevRenderProfile`
- Produces: `DevelopmentStaticFallback({ reason }: { reason: DevQualityReason })`

- [ ] **Step 1: 判定順とbudgetの失敗テストを書く**

table testで次を固定する。

```ts
expect(selectDevRenderProfile({ ...capable, reducedMotion: true }).tier).toBe('static');
expect(selectDevRenderProfile({ ...capable, saveData: true }).tier).toBe('static');
expect(selectDevRenderProfile({ ...capable, webgl2: false }).tier).toBe('static');
expect(selectDevRenderProfile({ ...capable, softwareRenderer: true }).tier).toBe('static');
expect(selectDevRenderProfile(highDesktop)).toMatchObject({ tier: 'high', maxDpr: 2 });
expect(selectDevRenderProfile(generalPhone)).toMatchObject({ tier: 'low', maxDpr: 1.25 });
expect(selectDevRenderProfile(safariUnknownMemoryFourCores)).toMatchObject({ tier: 'low' });
expect(selectDevRenderProfile(unknownCapabilities).tier).toBe('low');
```

high/lowのparticle数・色収差・blur/depth-of-field差をexact objectでassertする。

- [ ] **Step 2: 静的版の情報parityを要求する失敗テストを書く**

```tsx
render(<MemoryRouter><DevelopmentStaticFallback reason="reduced-motion" /></MemoryRouter>);
expect(screen.getAllByRole('article')).toHaveLength(7);
for (const chapter of DEV_CHAPTERS) {
  expect(screen.getByRole('heading', { name: chapter.title })).toBeInTheDocument();
  for (const detail of chapter.details.flatMap(group => group.items)) {
    expect(screen.getByText(detail)).toBeInTheDocument();
  }
}
expect(screen.getByRole('link', { name: '制作物を見る' })).toHaveAttribute('href', '/app');
expect(screen.getByRole('link', { name: 'Discord' })).toHaveAttribute('target', '_blank');
expect(document.querySelector('canvas')).toBeNull();
```

- [ ] **Step 3: focused testsが未実装で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/development/developmentQuality.test.ts src/components/development/DevelopmentStaticFallback.test.tsx`

- [ ] **Step 4: capability collectorとpure selectorを実装する**

判定順:

1. Reduced Motion → static
2. Save-Data → static
3. WebGL2なし → static
4. software renderer → static
5. small + coarseでmemory≤2GB / cores≤2 / major caveatのいずれか → static
6. width≥1024 + fine + cores≥8 + memory不明または≥8GB + caveatなし → high
7. その他 → low

developmentだけ `import.meta.env.DEV` の時に `?dev-quality=high|low|static` を許可するが、1〜5のhard gateを上書きしない。

WebGL probeは通常WebGL2 canvasと `{ failIfMajorPerformanceCaveat: true }` canvasを別々に作る。`WEBGL_debug_renderer_info` extensionがある時だけunmasked rendererを読み、SwiftShader / llvmpipe / software / basic rendererをcase-insensitiveに検出する。各probe後は `WEBGL_lose_context.loseContext()` で解放する。`navigator.connection.saveData` と `navigator.deviceMemory` はlocal interface/type guardを介して読み、global型を汚さない。

- [ ] **Step 5: profile budgetsをexact constantで実装する**

```ts
export const HIGH_PROFILE = {
  tier: 'high', maxDpr: 2, antialias: true, parallaxStrength: 0.18,
  particles: { ambient: 1800, core: 3200, packets: 120, finale: 2200 },
  effects: { bloom: true, mipmapBlur: true, depthOfField: true, noiseOpacity: 0.025, scanlineOpacity: 0.08, chromaticAberration: 0.0008 },
} as const;

export const LOW_PROFILE = {
  tier: 'low', maxDpr: 1.25, antialias: false, parallaxStrength: 0.07,
  particles: { ambient: 600, core: 1000, packets: 40, finale: 700 },
  effects: { bloom: true, mipmapBlur: false, depthOfField: false, noiseOpacity: 0.012, scanlineOpacity: 0.04, chromaticAberration: 0 },
} as const;
```

reasonだけselector結果へ加える。

- [ ] **Step 6: static 7章を通常flowで実装する**

manifestをmapし、各articleはnumber/scene label/h2/description/details/CTAの順。CSS gradient/scanline/ambient pseudo-elementsだけを使い、animationしない。CTAはButtonLink。

- [ ] **Step 7: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/components/development/developmentQuality.test.ts src/components/development/DevelopmentStaticFallback.test.tsx
npx eslint src/components/development/developmentQuality.ts src/components/development/DevelopmentStaticFallback.tsx
npm run build
git add src/components/development/developmentQuality.ts src/components/development/developmentQuality.test.ts src/components/development/DevelopmentStaticFallback.tsx src/components/development/DevelopmentStaticFallback.test.tsx src/components/development/development.css
git commit -m "Add Development quality fallback"
```

---

### Task 3: 3D依存・入れ子lazy boundary・bundle guardを追加する

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/scripts/assert-development-bundle.mjs`
- Modify: `frontend/src/pages/Development.tsx`
- Create: `frontend/src/components/development/DevelopmentShowcase.tsx`
- Create: `frontend/src/components/development/DevelopmentShowcase.test.tsx`
- Create: `frontend/src/components/development/DevelopmentExperience.tsx`
- Create: `frontend/src/components/development/DevWebGLErrorBoundary.tsx`
- Create: `frontend/src/components/development/DevWebGLErrorBoundary.test.tsx`
- Create: `frontend/src/components/development/webgl/DevelopmentCanvas.tsx`

**Interfaces:**
- Produces: `DevelopmentShowcase({ loadCanvas?, resolveProfile? })` with injectable test seams
- Produces: DOM-only `DevelopmentExperience({ CanvasComponent, profile, onFatalError })`
- Produces: `DevWebGLErrorBoundary({ onError, fallback, children })`
- Produces script: `npm run check:development-bundle`

```ts
export type DevCanvasLoader = () => Promise<{ default: ComponentType<DevelopmentCanvasProps> }>;
export interface DevelopmentShowcaseProps {
  loadCanvas?: DevCanvasLoader;
  resolveProfile?: () => DevRenderProfile;
}
```

- [ ] **Step 1: React 19互換のstable依存をinstallする**

```bash
cd frontend
npm install three@^0.185.1 @react-three/fiber@^9.6.1 @react-three/drei@^10.7.7 @react-three/postprocessing@^3.0.4 postprocessing@^6.39.2
npm install -D @react-three/test-renderer@^9.1.0
```

R3F 10 alphaは採用しない。lockfileを必ず含める。

- [ ] **Step 2: static/high/low loader behaviorの失敗テストを書く**

```tsx
const loadCanvas = vi.fn(() => Promise.resolve({ default: FakeCanvas }));
render(<DevelopmentShowcase loadCanvas={loadCanvas} resolveProfile={() => ({ tier: 'static', reason: 'development-override' })} />);
expect(loadCanvas).not.toHaveBeenCalled();
expect(screen.getAllByRole('article')).toHaveLength(7);

render(<DevelopmentShowcase loadCanvas={loadCanvas} resolveProfile={() => ({ ...HIGH_PROFILE, reason: 'development-override' })} />);
await waitFor(() => expect(loadCanvas).toHaveBeenCalledOnce());
expect(await screen.findByTestId('development-canvas')).toBeInTheDocument();
```

rejecting loaderとthrowing childの両方でstatic 7章へ切り替わり、error textを出さないtestも書く。

- [ ] **Step 3: focused testsがlazy boundary未実装で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/development/DevelopmentShowcase.test.tsx src/components/development/DevWebGLErrorBoundary.test.tsx`

- [ ] **Step 4: static-first Showcaseとerror boundaryを実装する**

productionの品質判定は `useState(() => selectDevRenderProfile(collectDevQualitySignals(), readDevOverride()))` で一度だけ。testだけ`resolveProfile`を注入できる。static branchでは`lazy()` component自体をrenderしない。high/low branchだけ `loadCanvas()` を開始し、reject/throw時はstateをruntime-failureへ切り替え、静的版だけをrenderする。

import graphを次で固定する。

```text
Development.tsx
  -> DevelopmentShowcase.tsx       quality / fatal state
    -> DevelopmentExperience.tsx   DOM track / controller / overlay / Suspense
      -> dynamic DevelopmentCanvas webgl-only component
```

`DevelopmentExperience`はCanvas componentをpropsで受け取り、直接`webgl/**`をimportしない。SuspenseはCanvas slotだけを包み、HTML overlay/background/progressは外側へ常時残す。`webgl/**`以外からThree/R3F/Drei/postprocessingをimportしない。

- [ ] **Step 5: route-local CSSとDevelopment pageを接続する**

`Development.tsx`だけで `import '@/components/development/development.css'`。PageSeo + DevelopmentShowcaseにする。`App.tsx`の既存route-level `lazy(() => import('@/pages/Development'))` は維持する。

- [ ] **Step 6: Vite manifestと3D vendor isolationを実装する**

`build.manifest = true`。既存firebase/markdown chunkを維持しつつ、module IDが `/three/`, `/@react-three/`, `/postprocessing/` に一致する時だけ `development-webgl-vendor` を返すmanualChunks関数を追加する。

scriptは `dist/.vite/manifest.json` を読み、`collectStaticClosure(key)`は`imports`だけ、`collectReachableClosure(key)`は`imports`と`dynamicImports`を別々に再帰する。

- `index.html` static `imports` closureに `DevelopmentCanvas` / `development-webgl-vendor` がない。
- `src/pages/Development.tsx` のreachable closureからCanvas chunkとvendor chunkへ到達できる。
- manifest内のDevelopment/Canvas以外の全dynamic entryのstatic closureにvendorがない。

- [ ] **Step 7: tests・build guardを通しコミットする**

```bash
cd frontend
npm test -- src/components/development/DevelopmentShowcase.test.tsx src/components/development/DevWebGLErrorBoundary.test.tsx
npm run build
npm run check:development-bundle
npx eslint src/pages/Development.tsx src/components/development/DevelopmentShowcase.tsx src/components/development/DevelopmentExperience.tsx src/components/development/DevWebGLErrorBoundary.tsx vite.config.ts
git add package.json package-lock.json vite.config.ts scripts/assert-development-bundle.mjs src/pages/Development.tsx src/components/development/DevelopmentShowcase.tsx src/components/development/DevelopmentShowcase.test.tsx src/components/development/DevelopmentExperience.tsx src/components/development/DevWebGLErrorBoundary.tsx src/components/development/DevWebGLErrorBoundary.test.tsx src/components/development/webgl/DevelopmentCanvas.tsx
git commit -m "Isolate Development WebGL bundle"
```

---

### Task 4: Canvas lifecycle、camera、pointer、post effectsを実装する

**Files:**
- Create: `frontend/src/components/development/useDevRenderActivity.ts`
- Create: `frontend/src/components/development/useDevRenderActivity.test.ts`
- Create: `frontend/src/components/development/useDevPointerParallax.ts`
- Create: `frontend/src/components/development/webgl/useDevSafeFrame.ts`
- Create: `frontend/src/components/development/webgl/useDevSafeFrame.test.tsx`
- Create: `frontend/src/components/development/webgl/DevContextLossMonitor.tsx`
- Create: `frontend/src/components/development/webgl/DevCanvasFailureSignal.tsx`
- Create: `frontend/src/components/development/webgl/DevelopmentWorld.tsx`
- Create: `frontend/src/components/development/webgl/DevelopmentCameraRig.tsx`
- Create: `frontend/src/components/development/webgl/DevelopmentPostEffects.tsx`
- Create: `frontend/src/components/development/webgl/DevSceneLayer.tsx`
- Create: `frontend/src/components/development/webgl/sceneLayout.ts`
- Create: `frontend/src/components/development/webgl/sceneLayout.test.ts`
- Modify: `frontend/src/components/development/webgl/DevelopmentCanvas.tsx`

**Interfaces:**
- Produces: `useDevRenderActivity(trackRef): boolean`
- Produces: `useDevPointerParallax(trackRef): RefObject<{x:number;y:number}>`
- Produces: 8 camera key poses and `sampleCameraPose(progress)`
- Produces: `DevSceneLayer({ chapterIndex, progressRef, children })`
- Produces: `useDevSafeFrame(callback, onFatalError)` and per-frame `DevSceneFrame`

```ts
export interface DevSceneFrame {
  progress: number;
  localProgress: number;
  weight: number;
}
```

`useFrame`内で毎frame `getSceneBlendWeights()` / local progressを計算し、mutable frame contextへ書く。React state更新はしない。scene-owned materialsは共通frame hookからopacity/emissive intensityへweightを反映し、groupはweightが小さい時だけ`visible=false`にする。

- [ ] **Step 1: activity pauseの失敗テストを書く**

IntersectionObserverとvisibilityStateをmockし、visible+intersectingだけtrue、offscreen/hiddenはfalse、cleanup後observer disconnectをassertする。

- [ ] **Step 2: camera pathのpure testを書く**

8 posesのposition/target/FOVが有限、progress 0/1で端pose一致、境界前後 `±0.0001` の距離が許容値内、全sampleでNaNがないことをassertする。同じprogressでpointerを複数frame動かしてもbase poseがdriftしないこと、scene境界で前後layerのmaterialへ補完weightが反映されることもtestする。

- [ ] **Step 3: testsがhooks/layout未実装で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/development/useDevRenderActivity.test.ts src/components/development/webgl/sceneLayout.test.ts`

- [ ] **Step 4: Canvas lifecycleを実装する**

```tsx
<Canvas
  dpr={[1, quality.maxDpr]}
  frameloop={active ? 'always' : 'never'}
  gl={{ antialias: quality.antialias, powerPreference: quality.tier === 'high' ? 'high-performance' : 'default' }}
  fallback={<DevCanvasFailureSignal onFatalError={onFatalError} />}
>
  <DevContextLossMonitor onFatalError={onFatalError} />
  <DevelopmentWorld {...props} />
</Canvas>
```

active復帰時は `invalidate()`。`DevContextLossMonitor`は`useThree()` + `useEffect()`で`webglcontextlost`を登録・解除する。fatal callbackはrefで一度だけ通知する。Canvas wrapperは `aria-hidden="true"`。

dynamic import reject、React render throw、`webglcontextlost`、frame callback throwを別々にtestする。全scene/cameraのraw `useFrame`は禁止し、try/catch + fatal dedupeを持つ`useDevSafeFrame`経由にする。

- [ ] **Step 5: paused GSAP camera directorを実装する**

8 posesを既存chapter spansのdurationでpaused timelineへ登録する。timelineはcameraではなくplain `basePose` objectを更新し、毎frame `camera.position.set(base.x + parallax.x, ...)` とtargetを絶対値で再構成して累積driftを防ぐ。`sampleCameraPose()`とtimelineは同じkey poses/span/ease定義を使い、unmount時に`timeline.kill()`する。touch/pointer eventはpassiveで、`preventDefault()`しない。

- [ ] **Step 6: quality別post effectsを実装する**

HTML overlayはCanvas sibling。highはBloom + Noise + Scanline + subtle ChromaticAberration + DepthOfField、lowはBloom + weaker Noise/Scanlineのみ。profile値が0/falseのeffectをmountしない。色収差をtextへ適用しない。

- [ ] **Step 7: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/components/development/useDevRenderActivity.test.ts src/components/development/webgl/sceneLayout.test.ts
npm test -- src/components/development/webgl/useDevSafeFrame.test.tsx
npx eslint src/components/development/DevelopmentExperience.tsx src/components/development/useDevRenderActivity.ts src/components/development/useDevPointerParallax.ts src/components/development/webgl
npm run build
git add src/components/development/DevelopmentExperience.tsx src/components/development/useDevRenderActivity.ts src/components/development/useDevRenderActivity.test.ts src/components/development/useDevPointerParallax.ts src/components/development/webgl
git commit -m "Add Development WebGL stage and camera director"
```

---

### Task 5: procedural primitivesとScenes 1–2を実装する

**Files:**
- Create: `frontend/src/components/development/webgl/proceduralGeometry.ts`
- Create: `frontend/src/components/development/webgl/proceduralGeometry.test.ts`
- Create: `frontend/src/components/development/webgl/sceneModels.ts`
- Create: `frontend/src/components/development/webgl/sceneModels.test.ts`
- Create: `frontend/src/components/development/webgl/primitives/AmbientField.tsx`
- Create: `frontend/src/components/development/webgl/primitives/GlowNode.tsx`
- Create: `frontend/src/components/development/webgl/scenes/AiCoreFormationScene.tsx`
- Create: `frontend/src/components/development/webgl/scenes/TechnologyConstellationScene.tsx`
- Create: `frontend/src/components/development/webgl/scenes/sceneRegistry.ts`
- Create: `frontend/src/components/development/webgl/scenes/sceneRegistry.test.tsx`
- Modify: `frontend/src/components/development/webgl/DevelopmentWorld.tsx`

**Interfaces:**
- Produces seeded generators: `createSeededRandom`, `createSpherePointCloud`, `createPacketOffsets`
- Produces: typed partial `DEV_SCENE_REGISTRY` with first two slots in this task; Task 7 requires all seven

- [ ] **Step 1: seed再現性とparticle budgetの失敗テストを書く**

同じseed/countのtyped arraysが完全一致、別seedは不一致、全positionがfinite、high/lowのattribute countがprofileと一致することをassertする。

- [ ] **Step 2: pure scene modelとrenderer smokeの失敗テストを書く**

node/edge/packet数は`sceneModels.test.ts`でpure dataとしてassertする。R3F test rendererは`await create()`でScene 1/2がthrowせずroot groupを作るsmoke testだけにし、各test後に`unmount()`する。Drei Text/Lineの内部構造、shader、postprocessingのsnapshot/countには依存しない。

- [ ] **Step 3: testsがgeometry/scenes未実装で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/development/webgl/proceduralGeometry.test.ts src/components/development/webgl/sceneModels.test.ts src/components/development/webgl/scenes/sceneRegistry.test.tsx`

- [ ] **Step 4: AmbientFieldとAI Core Formationを実装する**

AmbientFieldは全章で表示し、quality.ambient countのPoints + sparse lines。AI coreはseeded pointsのstart/target attributesをshaderで収束、emissive icosahedron、pulse ring、code fragment planes。geometry/materialを`useMemo`しdisposeする。sceneはprocedural geometryとrepository内bundled assetだけに限定し、Drei Textのdefault CDN font、remote texture/GLTFを使わない。

- [ ] **Step 5: Technology Constellationを実装する**

manifestの12技術を固定3D座標のGlowNodeへmapし、categoryごとのedgeをDrei Lineで結ぶ。Canvas labelはoptional/decorative、HTML detailsを唯一のaccessible listとする。

`DevelopmentWorld`はこのTaskからregistryをmapする。未実装slotはintermediate commitではAmbientFieldだけを残し、Task 7でregistry exact 7をtestする。

- [ ] **Step 6: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/components/development/webgl/proceduralGeometry.test.ts src/components/development/webgl/scenes/sceneRegistry.test.tsx
npm test -- src/components/development/webgl/sceneModels.test.ts
npx eslint src/components/development/webgl/proceduralGeometry.ts src/components/development/webgl/primitives src/components/development/webgl/scenes
npm run build
git add src/components/development/webgl/proceduralGeometry.ts src/components/development/webgl/proceduralGeometry.test.ts src/components/development/webgl/sceneModels.ts src/components/development/webgl/sceneModels.test.ts src/components/development/webgl/primitives src/components/development/webgl/scenes src/components/development/webgl/DevelopmentWorld.tsx
git commit -m "Add AI core and technology constellation scenes"
```

---

### Task 6: Scenes 3–4と中間CTAを実装する

**Files:**
- Create: `frontend/src/components/development/webgl/primitives/PacketStream.tsx`
- Create: `frontend/src/components/development/webgl/scenes/McpDataCorridorScene.tsx`
- Create: `frontend/src/components/development/webgl/scenes/BuildChamberScene.tsx`
- Create: `frontend/src/components/development/DevelopmentChapterOverlay.tsx`
- Create: `frontend/src/components/development/DevelopmentChapterOverlay.test.tsx`
- Modify: `frontend/src/components/development/webgl/scenes/sceneRegistry.ts`

**Interfaces:**
- Produces: 4 endpoint MCP corridor and instanced packets
- Produces: UI / Code / Data build layers and browser frame
- Produces: active HTML overlay with CTA pointer/tab isolation

- [ ] **Step 1: Scene 3–4とoverlayの失敗テストを書く**

pure scene model testでcentral `mcp-model-hub` 1つ、`mcp-endpoint` exact 4（GitHub / Browser / Database / Filesystem）、packet countがprofile budget、`build-layer` labels UI/Code/Data、`browser-frame` 1つをassertする。R3F側はsmoke testに限定する。

```tsx
render(<MemoryRouter><DevelopmentChapterOverlay activeChapter={3} progress={0.62} /></MemoryRouter>);
expect(screen.getByRole('heading', { name: DEV_CHAPTERS[3].title })).toBeInTheDocument();
expect(screen.getByRole('link', { name: '制作物を見る' })).toHaveAttribute('href', '/app');
expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
expect(screen.getAllByTestId('inactive-dev-chapter').every(node => node.getAttribute('aria-hidden') === 'true')).toBe(true);
expect(screen.getAllByTestId('inactive-dev-chapter').every(node => node.hasAttribute('inert'))).toBe(true);
```

- [ ] **Step 2: focused testsが未実装で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/development/webgl/scenes/sceneRegistry.test.tsx src/components/development/DevelopmentChapterOverlay.test.tsx`

- [ ] **Step 3: MCP corridorとBuild Chamberを実装する**

Modelをcentral hub、GitHub/Browser/Database/Filesystemを4 endpointとしてdepth方向に配置する。PacketStreamはInstancedMeshでbudgetを守る。Build Chamberは3 translucent planesがbrowser frameへ組み上がり、local progressで位置/rotationを補間する。

- [ ] **Step 4: HTML overlayを実装する**

7 blockをDOMに保ち、activeだけ `aria-hidden=false` / pointer events auto。inactive blockは`inert` + `aria-hidden` + pointer-events noneを併用する。number、sceneLabel、title、description、details、CTAの順。第4章ButtonLinkは「制作物を見る」 `/app`。

- [ ] **Step 5: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/components/development/webgl/scenes/sceneRegistry.test.tsx src/components/development/DevelopmentChapterOverlay.test.tsx
npx eslint src/components/development/webgl/primitives/PacketStream.tsx src/components/development/webgl/scenes/McpDataCorridorScene.tsx src/components/development/webgl/scenes/BuildChamberScene.tsx src/components/development/DevelopmentChapterOverlay.tsx
npm run build
git add src/components/development/webgl src/components/development/DevelopmentChapterOverlay.tsx src/components/development/DevelopmentChapterOverlay.test.tsx
git commit -m "Add MCP corridor and build chamber scenes"
```

---

### Task 7: Scenes 5–7とfinal reconstructionを実装する

**Files:**
- Create: `frontend/src/components/development/webgl/scenes/ToolOrbitScene.tsx`
- Create: `frontend/src/components/development/webgl/scenes/WorkflowPipelineScene.tsx`
- Create: `frontend/src/components/development/webgl/scenes/ReconstructionFinaleScene.tsx`
- Modify: `frontend/src/components/development/webgl/scenes/sceneRegistry.ts`
- Modify: `frontend/src/components/development/webgl/scenes/sceneRegistry.test.tsx`

**Interfaces:**
- Produces: 8 orbit tool nodes
- Produces: 4 workflow nodes + rails + moving state packets
- Produces: finale groups core/node/packet/panel/orbit → page frame

- [ ] **Step 1: Scene 5–7の失敗テストを書く**

```ts
expect(findAllByName(toolOrbit, 'tool-orbit-node')).toHaveLength(8);
expect(findAllByName(workflow, 'workflow-step')).toHaveLength(4);
expect(findAllByName(workflow, 'workflow-rail')).toHaveLength(3);
expect(findAllByName(finale, 'reconstruction-group').map(node => node.instance.userData.kind)).toEqual(
  expect.arrayContaining(['core', 'node', 'packet', 'panel', 'orbit']),
);
expect(Object.keys(DEV_SCENE_REGISTRY)).toHaveLength(7);
```

overlay testで章7のApps `/app`、Contact `/contact`、Discord external linkの`target="_blank" rel="noopener noreferrer"`をassertする。object countはpure scene model、R3Fは3 sceneのsmoke/unmountだけを検証する。

- [ ] **Step 2: testがregistry slots未実装で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/development/webgl/scenes/sceneRegistry.test.tsx src/components/development/DevelopmentChapterOverlay.test.tsx`

- [ ] **Step 3: Tool OrbitとWorkflow Pipelineを実装する**

8 nodeを異なるradius/velocityでcore周回。4 workflow stepをrailで接続しpacket/status pulseを順に移動。qualityでmesh数だけ削減し、4 step自体は常に残す。

- [ ] **Step 4: Reconstruction Finaleを実装する**

過去sceneの代表geometryを再利用し、local progressで散開状態→current page frameへ集約する。終端でもambientとframeを保持し、progress=1で消さない。

- [ ] **Step 5: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/components/development/webgl/scenes/sceneRegistry.test.tsx src/components/development/DevelopmentChapterOverlay.test.tsx
npx eslint src/components/development/webgl/scenes
npm run build
git add src/components/development/webgl/scenes src/components/development/DevelopmentChapterOverlay.test.tsx
git commit -m "Complete Development WebGL scenes"
```

---

### Task 8: progress navigation、responsive CSS、旧scene削除を統合する

**Files:**
- Create: `frontend/src/components/development/DevelopmentProgressNav.tsx`
- Create: `frontend/src/components/development/DevelopmentProgressNav.test.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Modify: `frontend/src/components/development/DevelopmentShowcase.tsx`
- Modify: `frontend/src/components/development/development.css`
- Modify: `frontend/src/index.css`
- Delete after parity verification:
  - `frontend/src/components/development/DevHero.tsx`
  - `frontend/src/components/development/DevHeroCopy.tsx`
  - `frontend/src/components/development/DevHeroScene1.tsx` through `DevHeroScene7.tsx`
  - `frontend/src/components/development/DevHeroScene1.test.tsx`
  - `frontend/src/components/development/DevPagePreview.tsx`
  - `frontend/src/components/development/DevStackGridScene.tsx`
  - `frontend/src/components/development/devEnterStyle.ts`
  - `frontend/src/components/development/devSceneMotion.ts`
  - `frontend/src/components/development/devSceneMotion.test.ts`
  - `frontend/src/components/development/devStack2MobileMotion.ts`
  - `frontend/src/components/development/devStackChapter.ts`
  - `frontend/src/components/development/devZoomTiming.ts`
  - `frontend/src/components/development/floatCardMotion.ts`
  - `frontend/src/components/development/floatCardMotion.test.ts`
  - `frontend/src/components/development/sceneUtils.ts`
  - `frontend/src/components/development/useDesktopFloatCards.ts`
  - `frontend/src/components/development/useDevMobileLayout.ts`

**Interfaces:**
- Produces: `DevelopmentProgressNav({ controller })`
- Produces: persistent progressbar, 7 chapter jumps, 「最終章へ」
- Guarantees: inactive overlay actions absent from tab order

- [ ] **Step 1: navigationとscroll targetの失敗テストを書く**

```tsx
render(<DevelopmentProgressNav controller={mockController} />);
expect(screen.getByRole('progressbar', { name: 'Development進捗' })).toHaveAttribute('aria-valuenow', '42');
expect(screen.getByRole('progressbar', { name: 'Development進捗' })).toHaveAttribute('aria-valuetext', '4 / 7 Build Chamber');
expect(screen.getAllByRole('button', { name: /章へ移動/ })).toHaveLength(7);
expect(screen.getByRole('button', { name: '04 Build Chamber章へ移動' })).toHaveAttribute('aria-current', 'step');
await user.click(screen.getByRole('button', { name: '04 Build Chamber章へ移動' }));
expect(mockController.scrollToChapter).toHaveBeenCalledWith(3, 'smooth');
await user.click(screen.getByRole('button', { name: '最終章へ' }));
expect(mockController.scrollToChapter).toHaveBeenCalledWith(6, 'smooth');
```

Reduced Motionの場合behaviorが`auto`になるtestも書く。

- [ ] **Step 2: testがprogress UI未実装で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/development/DevelopmentProgressNav.test.tsx src/components/development/DevelopmentChapterOverlay.test.tsx`

- [ ] **Step 3: controllerとpersistent UIを接続する**

`useDevScrollProgress`はstate `progress` と毎frame参照用 `progressRef` を同時更新する。scrollToChapterはTask 1 helperを使う。左/右端へnumber、active title、progressbar、「最終章へ」、introだけ「スクロールして探索」を表示する。active chapter buttonへ`aria-current="step"`、progressbarへ`aria-valuetext="4 / 7 Build Chamber"`形式を付ける。rootへ`data-dev-quality`と`data-dev-render-active`を付け、UIはCanvasより高いz-index。

- [ ] **Step 4: route-local responsive CSSを完成する**

PC `height:1640vh`、mobile `1480vh`、stage sticky 100dvh。overlay本文16px以上、support 13px以上、CTA 44px。390/320pxではprogressをcompact rail、detailsは読みやすい最大幅、touch canvasは `pointer-events:none`。focus ringをpostprocessingより前面にする。

- [ ] **Step 5: 旧CSSと旧componentsを削除する**

`index.css`から旧 `.dev-hero-*`, `.dev-scene-*`, `.dev-stack-*`, `.dev-workflow-*` showcase rulesを削除し、Foundation所有のdevelopment tone Header rulesだけ残す。`rg "DevHero|DevPagePreview|devSceneMotion|devZoomTiming" frontend/src` が0件になってから旧filesを削除する。

- [ ] **Step 6: Development focused suiteを通しコミットする**

```bash
cd frontend
npm test -- src/components/development
npx eslint src/components/development src/pages/Development.tsx
npm run build
git add src/components/development src/pages/Development.tsx src/index.css
git commit -m "Integrate accessible Development showcase"
```

---

### Task 9: 全検証と3形態browser QAを実行する

**Files:**
- Modify only if verification exposes a regression in Development-owned files

- [ ] **Step 1: full automated gateを実行する**

```bash
cd frontend
npm test -- --run
npm run lint
npm run build
npm run check:development-bundle
git diff --check
```

Expected: 全コマンド終了コード0。manifest guardが3D chunk isolationを確認する。

- [ ] **Step 2: 3 quality routesを起動する**

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5176
```

- `/development?dev-quality=high`
- `/development?dev-quality=low`
- `/development?dev-quality=static`

- [ ] **Step 3: viewport/theme/motion matrixを確認する**

| Viewport | Expected profile | 確認 |
| --- | --- | --- |
| 1440×1000 | high override | full effects、max particles、7 scene continuity |
| 1024×768 | high/low | camera/copy衝突なし、進捗常時表示 |
| 390×844 | low | touch scroll維持、DPR≤1.25、compact nav |
| 320×700 | static/low | no overflow、text/CTA欠落なし |

light/dark、Reduced Motionを追加し、Reduced Motionはquery overrideよりstatic hard gateが優先することを確認する。

- [ ] **Step 4: interaction/failure matrixを確認する**

- progress UIで7章すべてへ移動し、scene/ambient/章情報のいずれかが常に見える。
- 第4章「制作物を見る」、第7章Apps/Contact/Discordをkeyboardだけで操作できる。
- `scrollWidth === clientWidth`、CTA 44px以上、body 16px以上、support 13px以上。
- touch/pointer parallaxがpage scrollを阻害しない。
- tabを非active、trackをoffscreenにするとframeloopが停止し、復帰時に最新progressへ戻る。
- WebGL2無効、Save-Data、context loss、Canvas chunk rejectの各条件で、error messageなしの静的7章と全CTAが出る。

failureは次の再現可能な手順で確認する。

- context loss: Canvas contextの`WEBGL_lose_context.loseContext()`を実行。
- WebGLなし: Chromiumを`--disable-webgl`で起動。
- chunk reject: Network interceptionで`DevelopmentCanvas-*.js` requestをabortしてreload。
- Save-Data: document script開始前に`navigator.connection.saveData`をtrueへoverride。
- pause: rootの`data-dev-render-active`がtab hidden/offscreenで`false`、復帰で`true`になることを確認。
- quality: rootの`data-dev-quality`がhigh/low/static overrideと一致することを確認。

- [ ] **Step 5: non-Development routeのbundle/networkを確認する**

fresh `/` loadで `development-webgl-vendor` requestがなく、`/development` high/lowへ遷移した時だけ取得されることをbrowser Networkとmanifestの両方で確認する。

- [ ] **Step 6: 最終statusを確認する**

```bash
git status --short
git log --oneline -10
```

Expected: 意図したDevelopment、dependency、Vite、plan準拠の変更だけが残る。
