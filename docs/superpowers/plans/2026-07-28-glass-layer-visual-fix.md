# Glass Layer Visual Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codex起動中の大ガラスを固定し、説明カードを背景光が透けにくい青紫ガラスへ変更する。

**Architecture:** `.dx-demo-camera`を固定座標のコンテナとして扱い、起動時の視覚変化は既存のCodexウィンドウとランチャー内部だけに限定する。説明カードは背景連動色から切り離し、同じ青紫のガラス表現をPC・スマホ・後続シーンで共有する。

**Tech Stack:** React 19、TypeScript、CSS、Vitest、Testing Library、Vite

## Global Constraints

- 大ガラスはCodexを開く前後で位置・大きさ・角度を変えない。
- 起動時の拡大は大ガラス全体へ適用しない。
- 説明カードは青紫の濃いガラスとし、背景光を強く通さない。
- 説明カードの文字は白系を維持する。
- 3ウィンドウを載せる土台は白寄りの半透明ガラスとする。

---

### Task 1: 大ガラスの固定

**Files:**
- Modify: `frontend/src/pages/Development.test.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.css`

**Interfaces:**
- Consumes: `CodexDemo`の`demoTime`と既存の各ウィンドウ用モーション変数
- Produces: 常に固定された`.dx-demo-camera`と、内部だけで完結する起動モーション

- [ ] **Step 1: 固定状態を検証するテストを書く**

`Development.test.tsx`の最初のテストに次を追加する。

```tsx
const camera = container.querySelector('.dx-demo-camera');
expect((camera as HTMLElement).style.getPropertyValue('--dx-camera-scale')).toBe('');
```

- [ ] **Step 2: テストが現在の拡大指定を検出して失敗することを確認する**

Run:

```bash
cd frontend
npm run test -- --run src/pages/Development.test.tsx
```

Expected: `.dx-demo-camera`に`--dx-camera-scale`が設定されているためFAIL。

- [ ] **Step 3: カメラ全体の拡大処理を削除する**

`DevelopmentExperience.tsx`から`launchZoomIn`、`launchZoomOut`、`cameraScale`と`cameraStyle`内の`--dx-camera-scale`を削除する。`DevelopmentExperience.css`の`.dx-demo-camera`およびスマホ向け上書きから`transform: scale(...)`を削除し、ガラスの位置と矩形を固定する。

- [ ] **Step 4: テストを再実行する**

Run:

```bash
cd frontend
npm run test -- --run src/pages/Development.test.tsx
```

Expected: 4 tests PASS。

---

### Task 2: 説明カードの濃い青紫ガラス

**Files:**
- Modify: `frontend/src/components/development/DevelopmentExperience.css`

**Interfaces:**
- Consumes: `.dx-demo-story`と`.dx-ecosystem-mobile-copy`
- Produces: PC・スマホ・後続シーンで共通の高可読性ガラスカード

- [ ] **Step 1: 最終上書きの説明カード配色を一つに揃える**

ファイル末尾の`.dx-demo-story, .dx-ecosystem-mobile-copy`へ次の基準を設定する。

```css
border: 1px solid rgba(220, 230, 255, 0.3);
background:
    linear-gradient(145deg, rgba(86, 101, 139, 0.96), rgba(55, 66, 96, 0.97));
box-shadow:
    0 26px 66px rgba(25, 36, 66, 0.26),
    inset 0 1px rgba(255, 255, 255, 0.18);
backdrop-filter: blur(16px) saturate(0.94);
```

文字は白、補足文は`rgba(238, 242, 255, 0.82)`、番号は薄い青白色にする。背景色の変数は説明カードへ使用しない。

- [ ] **Step 2: PCとスマホでカード位置と可読性を確認する**

ブラウザで`/development`を開き、以下を確認する。

- PC: 左下のカードが大ガラスから適度に外れ、光が文字の後ろへ強く抜けない。
- スマホ: カードがガラス画面の下にあり、同じ青紫色と白文字になる。
- 後続シーン: 01〜03のカードで色と位置が変わらない。

---

### Task 3: 回帰検証

**Files:**
- Test: `frontend/src/pages/Development.test.tsx`
- Verify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Verify: `frontend/src/components/development/DevelopmentExperience.css`

**Interfaces:**
- Consumes: Task 1とTask 2の変更
- Produces: ビルド可能で、画面の重なりと配色が確認済みの開発ページ

- [ ] **Step 1: 自動検証を実行する**

Run:

```bash
cd frontend
npm run test -- --run src/pages/Development.test.tsx
npx eslint src/components/development/DevelopmentExperience.tsx src/pages/Development.test.tsx
npm run build
```

Expected: テスト4件、ESLint、ビルドがすべて成功。

- [ ] **Step 2: 表示を再読み込みして確認する**

`/development`を再読み込みし、Codex起動前後の大ガラスの外周が同じ座標に留まること、説明カードが濃い青紫で読めること、CLI連携の土台が白いガラスであることを確認する。

- [ ] **Step 3: 差分の形式を確認する**

Run:

```bash
git diff --check
```

Expected: 出力なし、exit code 0。

---

### Task 4: 各ウィンドウの個別ガラスとPreview後の説明

**Files:**
- Modify: `frontend/src/pages/Development.test.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.tsx`
- Modify: `frontend/src/components/development/DevelopmentExperience.css`

**Interfaces:**
- Consumes: 初期ランチャー3画面、公開連携3画面、`CodexDemo`の説明表示条件
- Produces: 共通`.dx-window-glass`表現と、Preview後も維持される最終説明

- [ ] **Step 1: 失敗する表示契約テストを書く**

```tsx
expect(container.querySelectorAll('.dx-window-glass')).toHaveLength(6);
expect(shouldShowCodexStory(true, 0.7)).toBe(true);
expect(shouldShowCodexStory(true, 0.84)).toBe(false);
```

- [ ] **Step 2: テストが共通ガラスクラスと説明関数の未実装で失敗することを確認する**

Run:

```bash
cd frontend
npm run test -- --run src/pages/Development.test.tsx
```

Expected: `.dx-window-glass`が0件、`shouldShowCodexStory`が未定義のためFAIL。

- [ ] **Step 3: 共通ガラスクラスと説明表示条件を実装する**

初期ランチャー3画面と公開連携3タイルへ`.dx-window-glass`を追加する。`.dx-window-glass`へアイスブルーの半透明背景、白い境界線、内側ハイライト、柔らかい影を設定する。

```tsx
export function shouldShowCodexStory(contentReady: boolean, progress: number) {
    return contentReady && progress < 0.84;
}
```

`CodexDemo`では`previewVisible`を説明表示条件から外し、`shouldShowCodexStory(contentReady, progress)`を使用する。`.is-preview-hidden`もPreview表示では付けず、`progress >= 0.84`のときだけ付ける。

- [ ] **Step 4: 対象テスト、Lint、ビルドを再実行する**

Run:

```bash
cd frontend
npm run test -- --run src/pages/Development.test.tsx
npx eslint src/components/development/DevelopmentExperience.tsx src/pages/Development.test.tsx
npm run build
```

Expected: テスト4件、ESLint、ビルドが成功する。

- [ ] **Step 5: PCとスマホで表示を確認する**

初期3画面と公開連携3画面の各外周に独立したガラスがあり、Preview表示後も左下の説明が残り、次シーンへの切り替え前に消えることを確認する。
