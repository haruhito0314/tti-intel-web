# Development Codex Window Stretch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/development`冒頭で同じCodex画面を表示したまま自然に拡張し、実装計画・変更ファイル・完了メッセージを正しい順序で連動させる。

**Architecture:** 時刻判定を`developmentMotion.ts`の純粋関数へ集約し、React側はその状態だけを表示へ反映する。Codexウィンドウは一つのDOMを維持し、CSSでは位置と寸法のみを補間して、内部UIの透明化や別画面への差し替えを行わない。

**Tech Stack:** React 19、TypeScript、CSS transitions、Vitest、Testing Library、Vite

## Global Constraints

- 既存の一つのCodexウィンドウを維持し、新しいウィンドウを重ねない。
- 拡張中もタイトルバー、サイドバー、スレッド、入力欄を表示し続ける。
- 実装完了と同時に計画を「3 / 3」へ変更し、右側の変更ファイル欄と`Home.tsx`を表示する。
- `Home.tsx`の0.2秒後に`index.css`を表示し、その後に完了メッセージを表示する。
- Preview以降のVercel、AWS、Plugin、MCP場面は変更しない。
- 320px、360px、390px幅で横方向のはみ出しを発生させない。

---

### Task 1: Codex作業状態の時間軸を一つにする

**Files:**
- Create: `frontend/src/components/development/developmentMotion.test.ts`
- Modify: `frontend/src/components/development/developmentMotion.ts:13-34`
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx:307-343,505-596`

**Interfaces:**
- Consumes: `demoTime: number`、`reducedMotion: boolean`
- Produces: `codexWorkState(time: number, reducedMotion: boolean): { planComplete: boolean; firstFileReady: boolean; secondFileReady: boolean; agentFinished: boolean }`

- [ ] **Step 1: 時間順序を固定する失敗テストを書く**

```ts
import { describe, expect, it } from 'vitest';
import {
    CODEX_AGENT_FINISHED_MS,
    CODEX_IMPLEMENTATION_COMPLETE_MS,
    CODEX_SECOND_FILE_READY_MS,
    codexWorkState,
} from './developmentMotion';

describe('codexWorkState', () => {
    it('opens the file panel with the completed plan, then adds the second file and reply', () => {
        expect(codexWorkState(CODEX_IMPLEMENTATION_COMPLETE_MS - 1, false)).toEqual({
            planComplete: false,
            firstFileReady: false,
            secondFileReady: false,
            agentFinished: false,
        });
        expect(codexWorkState(CODEX_IMPLEMENTATION_COMPLETE_MS, false)).toEqual({
            planComplete: true,
            firstFileReady: true,
            secondFileReady: false,
            agentFinished: false,
        });
        expect(CODEX_SECOND_FILE_READY_MS - CODEX_IMPLEMENTATION_COMPLETE_MS).toBe(200);
        expect(codexWorkState(CODEX_SECOND_FILE_READY_MS, false).secondFileReady).toBe(true);
        expect(CODEX_AGENT_FINISHED_MS).toBeGreaterThan(CODEX_SECOND_FILE_READY_MS);
        expect(codexWorkState(CODEX_AGENT_FINISHED_MS, false).agentFinished).toBe(true);
    });

    it('shows the completed state immediately for reduced motion', () => {
        expect(codexWorkState(0, true)).toEqual({
            planComplete: true,
            firstFileReady: true,
            secondFileReady: true,
            agentFinished: true,
        });
    });
});
```

- [ ] **Step 2: テストが未実装の関数で失敗することを確認する**

Run: `cd frontend && npx vitest run src/components/development/developmentMotion.test.ts --reporter=verbose`

Expected: FAIL。`codexWorkState`または時刻定数がexportされていないことが失敗理由になる。

- [ ] **Step 3: 最小限の時刻判定を実装する**

```ts
export const CODEX_IMPLEMENTATION_COMPLETE_MS = 9_450;
export const CODEX_SECOND_FILE_READY_MS = 9_650;
export const CODEX_AGENT_FINISHED_MS = 9_850;

export function codexWorkState(time: number, reducedMotion: boolean) {
    return {
        planComplete: reducedMotion || time >= CODEX_IMPLEMENTATION_COMPLETE_MS,
        firstFileReady: reducedMotion || time >= CODEX_IMPLEMENTATION_COMPLETE_MS,
        secondFileReady: reducedMotion || time >= CODEX_SECOND_FILE_READY_MS,
        agentFinished: reducedMotion || time >= CODEX_AGENT_FINISHED_MS,
    };
}
```

- [ ] **Step 4: React表示を共通状態へ接続する**

`CodexDemo`で次の状態を取得する。

```ts
const {
    planComplete,
    firstFileReady,
    secondFileReady,
    agentFinished,
} = codexWorkState(demoTime, reducedMotion);
```

次の対応へ統一する。

```tsx
<div className={`dx-codex-app ${firstFileReady ? 'is-review-visible' : ''}`}>

<header>
    <b>Implementation plan</b>
    <span>{planComplete ? '3 / 3' : '2 / 3'}</span>
</header>
<p className={planComplete ? 'is-done' : 'is-active'}>Prevent viewport overflow</p>

<div className={`dx-changed-files ${firstFileReady ? 'is-visible' : ''}`}>
    <span className={firstFileReady ? 'is-ready' : ''}>...</span>
    <span className={secondFileReady ? 'is-ready' : ''}>...</span>
</div>

<aside
    className={`dx-review ${firstFileReady ? 'is-visible' : ''}`}
    aria-hidden={!firstFileReady}
>
```

右側の件数表示と各ファイルにも`firstFileReady`、`secondFileReady`を使用する。既存の`filesUpdated`と`secondFileUpdated`は削除する。

- [ ] **Step 5: 時間軸テストとページDOMテストを実行する**

Run: `cd frontend && npx vitest run src/components/development/developmentMotion.test.ts src/pages/Development.test.tsx --reporter=verbose`

Expected: PASS。時間順序のテストと既存の一つのCodexウィンドウ検証がすべて成功する。

- [ ] **Step 6: Task 1をコミットする**

```bash
git add frontend/src/components/development/developmentMotion.ts \
  frontend/src/components/development/developmentMotion.test.ts \
  frontend/src/components/development/DevelopmentExperience.tsx
git commit -m "fix: align Codex file update timing"
```

---

### Task 2: 同じCodex画面を表示したまま拡張する

**Files:**
- Modify: `frontend/src/components/development/developmentMotion.ts:13-40`
- Modify: `frontend/src/components/development/developmentMotion.test.ts`
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx:307-470`
- Modify: `frontend/src/components/development/DevelopmentExperience.css:11890-11935`

**Interfaces:**
- Consumes: `demoTime: number`、`reducedMotion: boolean`、`CODEX_LAUNCH_OPEN_MS`
- Produces: `codexLaunchState(time: number, reducedMotion: boolean): { opening: boolean; contentVisible: true }`

- [ ] **Step 1: 拡張中も内容を維持する失敗テストを書く**

```ts
import {
    CODEX_LAUNCH_OPEN_MS,
    codexLaunchState,
} from './developmentMotion';

it('keeps the same Codex content visible throughout launch', () => {
    expect(codexLaunchState(CODEX_LAUNCH_OPEN_MS - 1, false)).toEqual({
        opening: false,
        contentVisible: true,
    });
    expect(codexLaunchState(CODEX_LAUNCH_OPEN_MS + 100, false)).toEqual({
        opening: true,
        contentVisible: true,
    });
});
```

- [ ] **Step 2: テストが未実装の関数で失敗することを確認する**

Run: `cd frontend && npx vitest run src/components/development/developmentMotion.test.ts --reporter=verbose`

Expected: FAIL。`codexLaunchState`がexportされていないことが失敗理由になる。

- [ ] **Step 3: 起動状態を返す最小実装を書く**

```ts
export function codexLaunchState(time: number, reducedMotion: boolean) {
    return {
        opening: reducedMotion || time >= CODEX_LAUNCH_OPEN_MS,
        contentVisible: true as const,
    };
}
```

`CodexDemo`では`launcherOpening`を直接比較せず、この関数の`opening`を使用する。Codexウィンドウには常に`is-content-ready`を付ける。

```tsx
const { opening: launcherOpening } = codexLaunchState(demoTime, reducedMotion);

className={`dx-launcher-codex-screen dx-product-window dx-window-glass is-content-ready ...`}
```

- [ ] **Step 4: 内部画面を隠すCSSを削除する**

以下のセレクタ一式を削除する。

```css
.dx-tool-launcher.is-opening
    > .dx-launcher-codex-screen.dx-product-window:not(.is-content-ready)
    > .dx-window-bar,
.dx-tool-launcher.is-opening
    > .dx-launcher-codex-screen.dx-product-window:not(.is-content-ready)
    > .dx-codex-app {
    opacity: 0;
    transform: none;
    transition: none;
}
```

位置と寸法の既存トランジションは維持し、最終オーバーライドではPCを`left: 8%; top: 2%`、スマホを`left: 4%; top: 2%`の同一座標系で補間する。`translate(-50%)`を再導入しない。

- [ ] **Step 5: 単体テストとページDOMテストを実行する**

Run: `cd frontend && npx vitest run src/components/development/developmentMotion.test.ts src/pages/Development.test.tsx --reporter=verbose`

Expected: PASS。起動前後とも`contentVisible`がtrueで、一つのCodexウィンドウが維持される。

- [ ] **Step 6: Task 2をコミットする**

```bash
git add frontend/src/components/development/developmentMotion.ts \
  frontend/src/components/development/developmentMotion.test.ts \
  frontend/src/components/development/DevelopmentExperience.tsx \
  frontend/src/components/development/DevelopmentExperience.css
git commit -m "fix: preserve Codex screen during stretch"
```

---

### Task 3: 実再生とレスポンシブを検証する

**Files:**
- Verify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Verify: `frontend/src/components/development/DevelopmentExperience.css`
- Verify: `frontend/src/components/development/developmentMotion.ts`

**Interfaces:**
- Consumes: Task 1の`codexWorkState`、Task 2の`codexLaunchState`
- Produces: PC・320px・360px・390pxで確認済みの起動モーション

- [ ] **Step 1: PCで起動モーションを確認する**

ローカルの`/development?qa=codex-stretch-final`を開き、起動前・拡張中・拡張後を確認する。拡張中にタイトルバー、サイドバー、スレッド、入力欄が表示され続けること、ウィンドウが途中で逆方向へ動かないこと、カーソルがCodexウィンドウから外れないことを確認する。

- [ ] **Step 2: PCで変更ファイルの順序を確認する**

実装計画が「3 / 3」へ変わるフレームで右カラムと`Home.tsx`が同時に現れ、約0.2秒後に`index.css`、その後に完了メッセージが現れることを確認する。右側に空のカラムだけが先に表示されるフレームがないことを確認する。

- [ ] **Step 3: スマホ3幅で画面内に収まることを確認する**

320×700、360×800、390×844で同じ場面を再生する。各幅で`document.documentElement.scrollWidth === document.documentElement.clientWidth`を確認し、Codexウィンドウ、説明カード、本文内の変更ファイル表示が左右にはみ出さないことを確認する。

- [ ] **Step 4: 対象テスト、Lint、本番ビルドを新しく実行する**

```bash
cd frontend
npx vitest run src/components/development/developmentMotion.test.ts src/pages/Development.test.tsx --reporter=verbose
npx eslint src/components/development/DevelopmentExperience.tsx \
  src/components/development/developmentMotion.ts \
  src/components/development/developmentMotion.test.ts \
  src/pages/Development.test.tsx
npm run build
cd ..
git diff --check
```

Expected: 全コマンドが終了コード0。Vitestは対象ファイルの全テストが成功し、Lintエラーと差分の空白エラーがなく、本番ビルドが完了する。

- [ ] **Step 5: 検証結果のみを確認して作業を完了する**

コード修正が追加で必要な場合はTask 1またはTask 2の失敗テストへ戻る。検証だけで新しい機能や対象外のリファクタリングを追加しない。
