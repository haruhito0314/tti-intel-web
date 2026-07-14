# About 活動カードのコピー配置統一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aboutページの4活動カードを同じ左上コピー配置と左寄せボタンへ統一し、数学カードの画像もその安全領域に合わせて作り直す。

**Architecture:** `About.tsx`の活動データを維持しながら、数学カードの`copyPosition`を既存3カードと同じ`activity-copy--top-left`へ変える。数学のライト／ダーク画像は同一構図のペアとして再生成し、CSSは右下専用ルールを外して全カードが左上の局所グラデーションと左寄せアクションを共有する。

**Tech Stack:** React 19、TypeScript 5.9、CSS、Vitest、Testing Library、WebP、built-in ImageGen

## Global Constraints

- PCでは4カードを2列×2行、スマートフォンでは1列で縦に4枚表示する。
- 見出し、説明、ボタンはすべて画像内の左上安全領域に残す。
- 数学のライト／ダーク画像は同じ構図とし、タブレットとペンを右下寄り、左上を文字用の空き領域にする。
- 画像内にタイトル、説明、ボタンの文字、ロゴ、UIラベルを描かない。
- テーマ切替時は現在のテーマの画像1枚だけを描画し、代替テキストは1回だけ提供する。
- 既存の活動名、説明、ボタン文言、リンク先は変更しない。
- グラデーションは文字側だけに敷き、画像全体を覆わない。
- 全カードのボタンは説明文の後に一定の余白を置き、左寄せで並べる。

---

### Task 1: 数学カードを左上安全領域へ移す

**Files:**
- Modify: `frontend/src/pages/About.tsx:65-84`
- Modify: `frontend/src/pages/AboutActivityCards.test.tsx:18-61`
- Modify: `frontend/public/images/about/activity-math-light.webp`
- Modify: `frontend/public/images/about/activity-math-dark.webp`

**Interfaces:**
- Consumes: `images: { light: string; dark: string }`と`copyPosition`を持つ`activityShowcases`データ
- Produces: 数学カードにも`activity-copy--top-left`を持たせ、1600×1024の数学ライト／ダーク画像ペアを同じパスに提供する

- [ ] **Step 1: 数学カードが左上クラスであることを要求する失敗テストを書く**

`frontend/src/pages/AboutActivityCards.test.tsx`のクラスアサーションを次へ変更する。

```tsx
        expect(screen.getByRole('heading', { name: '解説動画', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
        expect(screen.getByRole('heading', { name: '開発', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
        expect(screen.getByRole('heading', { name: 'ゲーム交流', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
        expect(screen.getByRole('heading', { name: '今週の数学', level: 3 }).closest('article')).toHaveClass('activity-copy--top-left');
```

- [ ] **Step 2: focused testが旧数学クラスのため失敗することを確認する**

Run:

```bash
cd frontend
set -a
source ../../../frontend/.env
source ../../../frontend/.env.local
set +a
NODE_OPTIONS=--localstorage-file=/tmp/about-unify-copy-localstorage npm test -- src/pages/AboutActivityCards.test.tsx --silent=true
```

Expected: `今週の数学`の`activity-copy--bottom-right`に対するクラスアサーションがFAILする。

- [ ] **Step 3: 数学の活動データを左上配置へ変更する**

`About.tsx`の数学カードのデータを次のようにする。

```tsx
        cardClass: 'activity-card--math',
        copyPosition: 'activity-copy--top-left',
```

- [ ] **Step 4: 数学のライト／ダーク画像を生成・置換する**

`imagegen`スキルとbuilt-in ImageGenを使う。まずライト版を生成し、生成画像を基に照明・配色だけをダーク版へ編集して、構図を固定する。両方とも1600×1024 WebPへ変換して以下へ保存する。

```text
frontend/public/images/about/activity-math-light.webp
frontend/public/images/about/activity-math-dark.webp
```

ライト版のプロンプト:

```text
Use case: photorealistic-natural
Asset type: 16:10 About-page activity card background, 1600 by 1024 composition
Primary request: an unlabeled tablet with abstract mathematical geometry and a white stylus placed in the lower-right half of a pale lavender and warm white desk scene
Composition/framing: reserve the upper-left 48 percent as calm, uncluttered negative space for HTML heading, description, and buttons; keep the tablet and stylus entirely away from this safe area
Style/medium: polished editorial technology photography, realistic and clean, no people
Lighting/mood: bright soft daylight
Constraints: no text, no letters, no numbers, no logos, no UI labels, no buttons, no watermarks
```

ダーク版はライト版を編集対象にし、次だけを変える。

```text
Change only the environment palette and lighting to deep purple with restrained violet glow. Preserve the tablet, stylus, their exact lower-right placement, camera angle, uncluttered upper-left copy-safe area, and all no-text/no-logo constraints.
```

- [ ] **Step 5: 数学画像とfocused testを検証する**

Run:

```bash
sips -g pixelWidth -g pixelHeight frontend/public/images/about/activity-math-light.webp frontend/public/images/about/activity-math-dark.webp
cd frontend
set -a
source ../../../frontend/.env
source ../../../frontend/.env.local
set +a
NODE_OPTIONS=--localstorage-file=/tmp/about-unify-copy-localstorage npm test -- src/pages/AboutActivityCards.test.tsx --silent=true
```

Expected: 両WebPが`pixelWidth: 1600`と`pixelHeight: 1024`、focused testが`4 passed`。

- [ ] **Step 6: 実装をコミットする**

```bash
git add frontend/src/pages/About.tsx frontend/src/pages/AboutActivityCards.test.tsx frontend/public/images/about/activity-math-light.webp frontend/public/images/about/activity-math-dark.webp
git commit -m "Align About math card copy with activities"
```

---

### Task 2: 全カードのアクションを左寄せに統一する

**Files:**
- Modify: `frontend/src/index.css:721-957`

**Interfaces:**
- Consumes: 4つすべての`activity-card`に付く`activity-copy--top-left`
- Produces: PC／モバイルで左上コピー、左側局所グラデーション、左寄せボタンを共有するCSS

- [ ] **Step 1: 右下専用の数学コピーCSSを削除する**

`index.css`から次の右下専用ルール全体を削除する。

```css
.activity-copy--bottom-right .activity-copy {
  right: 34px;
  bottom: 34px;
  left: auto;
  width: min(48%, 340px);
  text-align: right;
}

.activity-copy--bottom-right::after {
  opacity: 1;
  background: linear-gradient(315deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.26) 42%, transparent 66%);
}

.dark .activity-copy--bottom-right::after {
  opacity: 1;
  background: linear-gradient(315deg, rgba(9, 20, 38, 0.66) 0%, rgba(9, 20, 38, 0.22) 42%, transparent 66%);
}
```

`@media (max-width: 820px)`内の`.activity-copy--bottom-right .activity-copy`とその`bottom: 28px`ルールも削除する。

- [ ] **Step 2: 全カードのボタンを左寄せにする**

`.activity-actions`を次の定義へ置換する。

```css
.activity-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 10px;
  margin-top: 20px;
}
```

PCとモバイルで、見出し・説明・ボタンが左上のコピー領域からはみ出さないことを確認するため、`.activity-copy--top-left .activity-copy`の幅と位置は変更しない。

- [ ] **Step 3: 左側グラデーションを共有ルールとして維持する**

ライト用の`.activity-copy--top-left::after`とダーク用の`.dark .activity-copy--top-left::after`を残し、どちらも左から透明へ抜ける方向であることを確認する。`opacity: 1`を含むダーク用ルールはカードごとの`.dark .activity-card--*::after`より後に置く。

- [ ] **Step 4: 自動テスト・lint・buildを実行する**

Run:

```bash
cd frontend
set -a
source ../../../frontend/.env
source ../../../frontend/.env.local
set +a
NODE_OPTIONS=--localstorage-file=/tmp/about-unify-copy-localstorage npm test -- --run --silent=true
npx eslint src/pages/About.tsx src/pages/AboutActivityCards.test.tsx
npm run build
```

Expected: すべて終了コード0。Vitestは少なくとも64 tests passed、lintは出力なし、buildは成功する。

- [ ] **Step 5: ブラウザで4画面を確認する**

`npm run dev -- --host 127.0.0.1 --port 5176`を、main checkoutの`frontend/.env`と`frontend/.env.local`を読み込んだ状態で起動する。`/about`を以下で確認する。

| Viewport | Theme | 確認内容 |
| --- | --- | --- |
| 1280×720 | light | 2×2、全ボタン左寄せ、数学の文字と主役が重ならない |
| 1280×720 | dark | 対応するダーク画像、局所左グラデーション、同じ配置 |
| 390×844 | light | 縦4枚、全ボタン左寄せ、横スクロールなし |
| 390×844 | dark | 縦4枚、数学を含め文字と主役が重ならない |

- [ ] **Step 6: 実装をコミットする**

```bash
git add frontend/src/index.css
git commit -m "Unify About activity button alignment"
```
