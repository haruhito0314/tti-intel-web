# About 解説動画カードのテーマ間形状統一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解説動画カードのダーク画像をライト画像の編集版へ置き換え、テーマ切り替え時にモニターと机上機材の形状・配置を完全に維持する。

**Architecture:** `About.tsx`とCSSの既存テーマ切り替えは変更せず、`activity-video-light.webp`を編集対象としてダーク用WebPを1枚だけ作り直す。編集では画像の幾何構造を不変条件とし、環境の照明・配色・画面発光だけを変更する。

**Tech Stack:** built-in ImageGen、WebP、React 19、Vitest、Playwright CLI

## Global Constraints

- ライト版`frontend/public/images/about/activity-video-light.webp`は変更しない。
- ダーク版`frontend/public/images/about/activity-video-dark.webp`だけを置き換える。
- モニター、スタンド、机上棚、キーボード、マウス、マイクの形状、位置、比率、輪郭、遠近感を維持する。
- カメラ位置、トリミング、左上のコピー用余白、机と壁の境界を維持する。
- 変更するのは環境の照明、背景と机の配色、画面の控えめな青い発光だけとする。
- 人、文字、数字、ロゴ、UIラベル、ボタン、透かしを追加しない。
- 最終画像は1600×1024のWebPとする。
- `About.tsx`、CSS、画像パス、HTMLコピー、リンク、代替テキストは変更しない。

---

### Task 1: ダーク画像をライト画像の編集版へ置き換える

**Files:**
- Modify: `frontend/public/images/about/activity-video-dark.webp`
- Test: `frontend/src/pages/AboutActivityCards.test.tsx`

**Interfaces:**
- Consumes: `About.tsx`が選択する`/images/about/activity-video-light.webp`と`/images/about/activity-video-dark.webp`
- Produces: ライト版と同じ機材形状・配置を持つ1600×1024のダーク版WebP

- [ ] **Step 1: 既存のテーマ別画像パス回帰テストを実行する**

Run:

```bash
cd frontend
NODE_OPTIONS=--localstorage-file=/tmp/about-video-theme-consistency-localstorage npm test -- src/pages/AboutActivityCards.test.tsx --silent=true
```

Expected: `Test Files 1 passed (1)`、`Tests 4 passed (4)`。

- [ ] **Step 2: 現在の視覚的不一致を再現する**

`frontend/public/images/about/activity-video-light.webp`と`frontend/public/images/about/activity-video-dark.webp`を原寸で並べて確認する。

Expected: モニター枠、スタンド、机上棚、キーボード、マウス、マイクの形状または位置が一致せず、視覚テストがFAIL。

- [ ] **Step 3: ライト画像を編集対象としてダーク版を生成する**

`imagegen`スキルとbuilt-in ImageGenを使い、`frontend/public/images/about/activity-video-light.webp`を編集対象にして次のプロンプトを適用する。

```text
Use case: lighting-weather
Asset type: dark-theme 16:10 About-page activity card background
Input image: the provided light-theme image is the edit target
Primary request: transform only the room lighting and environmental color palette into a natural deep-charcoal dark theme with restrained cool-blue monitor glow
Invariants: preserve every pixel-level geometric feature of the original scene as closely as possible; keep the exact monitor frame, monitor dimensions, mountain-and-waveform screen composition, short monitor stand, wooden desktop shelf, keyboard, mouse, tabletop microphone, desk edges, wall boundary, camera position, perspective, crop, object positions, object sizes, and upper-left negative space
Color and lighting changes only: dark charcoal wall, dark walnut shelf and desk, subdued blue-gray ambient light, restrained blue monitor glow; keep objects clearly readable without crushing shadow detail
Constraints: no object replacement, no object redesign, no added or removed objects, no shifted edges, no changed screen content, no text, no letters, no numbers, no logos, no UI labels, no buttons, no watermark
```

生成後、built-in ImageGenが返した実ファイルを`tmp/imagegen/activity-video-dark-edited.png`へコピーする。

Expected: 形状・構図を維持したダーク版候補が`tmp/imagegen/activity-video-dark-edited.png`に保存される。

- [ ] **Step 4: 出力をWebPへ変換して既存パスへ保存する**

生成結果をワークスペースへコピーし、次を実行する。

```bash
cwebp -quiet -resize 1600 1024 tmp/imagegen/activity-video-dark-edited.png -o frontend/public/images/about/activity-video-dark.webp
```

Expected: `frontend/public/images/about/activity-video-dark.webp`が置き換わる。

- [ ] **Step 5: 画像仕様と形状一致を検証する**

Run:

```bash
sips -g pixelWidth -g pixelHeight frontend/public/images/about/activity-video-light.webp frontend/public/images/about/activity-video-dark.webp
```

Expected: 両画像が`pixelWidth: 1600`、`pixelHeight: 1024`。

両画像を原寸で並べ、モニター枠、スタンド、机上棚、キーボード、マウス、マイク、机の境界、画面内容が一致し、照明と配色だけが異なることを確認する。

- [ ] **Step 6: 回帰テストを再実行する**

Run:

```bash
cd frontend
NODE_OPTIONS=--localstorage-file=/tmp/about-video-theme-consistency-localstorage npm test -- src/pages/AboutActivityCards.test.tsx --silent=true
```

Expected: `Test Files 1 passed (1)`、`Tests 4 passed (4)`。

- [ ] **Step 7: PCとスマートフォンで表示を確認する**

`frontend`から開発サーバーを起動し、`/about`を次の条件で確認する。

| Viewport | Theme | Expected |
| --- | --- | --- |
| 1280×720 | light | 左上コピーと右側機材が重ならない |
| 1280×720 | dark | 同じ機材形状でダーク照明が表示される |
| 390×844 | light | 横スクロールがなくコピーが読める |
| 390×844 | dark | 同じ機材形状でコピーが読める |

- [ ] **Step 8: ダーク画像をコミットする**

```bash
git add frontend/public/images/about/activity-video-dark.webp
git commit -m "Match About video artwork across themes"
```
