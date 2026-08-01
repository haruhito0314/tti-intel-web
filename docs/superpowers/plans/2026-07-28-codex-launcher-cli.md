# Codex Launcher and CLI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 正面向きの3画面ワークスペースからCodexを選ぶ冒頭演出と、Terminal上のCodex CLIへ日本語で指示してVercel・AWSを操作する連携演出を作る。

**Architecture:** 既存の`DevelopmentExperience.tsx`の時間軸とカーソル追従を維持し、ランチャーへ正面化フェーズを追加する。CLI連携は既存の3ガラス構成を使い、Terminal内部の表示内容と自動再生時間だけを拡張する。

**Tech Stack:** React 19、TypeScript、CSS animations、Vitest、Testing Library

## Global Constraints

- アプリ画面同士を重ねない。
- Codex、Terminal、ランチャーは最初から正面を向く。
- Codexの選択はアイスブルーのカーソルクリックで示す。
- CLIへの指示は日本語で表示する。
- スクロールではなく、シーン内の操作は自動再生する。

---

### Task 1: 表示内容の回帰テスト

**Files:**
- Modify: `frontend/src/pages/Development.test.tsx`

**Interfaces:**
- Consumes: `Development`ページの表示内容
- Produces: ランチャーとCLI指示の回帰テスト

- [ ] **Step 1: Write the failing test**

`Development.test.tsx`へ、4アプリ名、`Codex CLI`、日本語指示、VercelとAWSのコマンドを確認するアサーションを追加する。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/pages/Development.test.tsx`

Expected: `Codex CLI`または日本語指示が見つからず失敗する。

- [ ] **Step 3: Keep the failing test for the implementation tasks**

テストは変更せず、Task 2とTask 3の完了条件として使用する。

---

### Task 2: 斜めの4アプリランチャー

**Files:**
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.css`
- Test: `frontend/src/pages/Development.test.tsx`

**Interfaces:**
- Consumes: `demoTime: number`、`ToolLauncher`、`data-dx-cursor-target="codex-app"`
- Produces: `launcherFacing: boolean`と4つの起動中アプリ画面

- [ ] **Step 1: Add launcher phase state**

`CodexDemo`で正面化、クリック、Codex展開の時刻を分離し、`ToolLauncher`へ正面化状態を渡す。

- [ ] **Step 2: Render four running app previews**

各アプリ要素へアプリ名、アイコン、タイトルバー、短い画面内容を追加する。

- [ ] **Step 3: Add perspective and focus CSS**

初期は`rotateX`と`rotateY`を持たせ、正面化後は回転を0へ戻す。2×2のグリッドを維持し、Codexクリック後は他の画面を後退させる。

- [ ] **Step 4: Run the focused test**

Run: `npm run test -- --run src/pages/Development.test.tsx`

Expected: CLI指示のアサーションだけが引き続き失敗する。

---

### Task 3: Terminal上のCodex CLI

**Files:**
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.css`
- Test: `frontend/src/pages/Development.test.tsx`

**Interfaces:**
- Consumes: `VercelDeploymentScene({ run })`、`typedText`
- Produces: Codex CLI起動、日本語プロンプト、Vercel/AWSコマンドの自動入力

- [ ] **Step 1: Add Codex CLI typing phases**

`$ codex`、日本語指示、`vercel deploy --prod`、`sam deploy --guided`を別々の時間帯で`typedText`へ渡す。

- [ ] **Step 2: Render CLI conversation**

Terminal内にCodex CLIの起動表示、`›`で始まる日本語指示、Codexの短い応答、実行コマンドと結果を順番に表示する。

- [ ] **Step 3: Align window selection timing**

`Terminal → Vercel → Terminal → AWS`の各選択を、対応する入力・実行が完了してから切り替える。

- [ ] **Step 4: Verify the focused test passes**

Run: `npm run test -- --run src/pages/Development.test.tsx`

Expected: 4 tests pass.

---

### Task 4: 全体検証

**Files:**
- Verify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Verify: `frontend/src/components/development/DevelopmentExperience.css`
- Verify: `frontend/src/pages/Development.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–3の変更
- Produces: 配布可能な開発ページ

- [ ] **Step 1: Run ESLint**

Run: `npx eslint src/components/development/DevelopmentExperience.tsx src/pages/Development.test.tsx`

Expected: exit code 0.

- [ ] **Step 2: Run tests**

Run: `npm run test -- --run src/pages/Development.test.tsx`

Expected: 4 tests pass.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: TypeScriptとViteのビルドが成功する。

- [ ] **Step 4: Check whitespace and stale copy**

Run: `git diff --check`

Expected: 出力なし。
