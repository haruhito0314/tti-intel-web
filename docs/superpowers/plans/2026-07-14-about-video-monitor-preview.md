# About 解説動画カードのモニター表示刷新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aboutページの解説動画カードを、色付き編集タイムラインではなく、文字なしの音声波形と控えめな映像プレビューを映す画像へ置き換える。

**Architecture:** TypeScriptとCSSは変更せず、既存の2つの動画カード画像パスだけを置換する。ライト画像を先に生成してからダーク画像を同画像の照明編集として作り、カメラ構図、机上オブジェクト、左上のHTMLコピー安全領域を固定する。

**Tech Stack:** built-in ImageGen、WebP、React 19、Vitest、Playwright CLI

## Global Constraints

- 置き換えるのは`activity-video-light.webp`と`activity-video-dark.webp`だけとする。
- カードのレイアウト、HTMLコピー、ボタン、リンク、画像パス、代替テキスト、CSSは変更しない。
- モニター、マイク、キーボード、トラックパッドの配置と、左上の文字安全領域を維持する。
- モニターの中には、文字・数値・ロゴ・UIラベルを含まない音声波形と、控えめな抽象映像プレビューを映す。
- 派手な多色ブロックは使わない。
- ダーク版はライト版を編集して作り、構図とすべての机上オブジェクトを維持する。
- 両方とも1600×1024のWebPとし、画像内に人、文字、番号、ロゴ、UIラベル、ボタン、透かしを含めない。
- About活動カードのテーマ別画像パスと既存リンクは変更しない。

---

### Task 1: 解説動画カードのモニター表示を置き換える

**Files:**
- Modify: `frontend/public/images/about/activity-video-light.webp`
- Modify: `frontend/public/images/about/activity-video-dark.webp`
- Test: `frontend/src/pages/AboutActivityCards.test.tsx`

**Interfaces:**
- Consumes: `About.tsx`が参照する既存パス`/images/about/activity-video-light.webp`と`/images/about/activity-video-dark.webp`
- Produces: 同じパスに、波形と抽象プレビューを映す1600×1024 WebPペア

- [ ] **Step 1: 既存のテーマ別画像パス・リンク回帰テストを先に実行する**

Run:

```bash
cd frontend
set -a
source ../../../frontend/.env
source ../../../frontend/.env.local
set +a
NODE_OPTIONS=--localstorage-file=/tmp/about-video-monitor-localstorage npm test -- src/pages/AboutActivityCards.test.tsx --silent=true
```

Expected: `Test Files 1 passed (1)`、`Tests 4 passed (4)`。画像パスと既存リンクを保つ基準を記録する。

- [ ] **Step 2: ライト画像を生成する**

`imagegen`スキルとbuilt-in ImageGenを使う。生成結果を一度目視し、選んだPNGを`tmp/imagegen/activity-video-light.png`へ保存してからWebPに変換する。以下のプロンプトをそのまま使う。

```text
Use case: photorealistic-natural
Asset type: 16:10 About-page activity card background, 1600 by 1024 composition
Primary request: a video-production desk with a widescreen monitor, studio microphone, keyboard, and trackpad; the monitor displays only a subtle abstract video preview and a thin blue-gray audio waveform, with no readable UI
Composition/framing: preserve a calm uncluttered upper-left 48 percent safe area for HTML heading, description, and button; keep the monitor, microphone, keyboard, and trackpad in the right half and away from that safe area
Style/medium: polished editorial technology photography, realistic and clean, no people
Lighting/mood: warm white and pale gray soft daylight
Constraints: no text, no letters, no numbers, no logos, no UI labels, no buttons, no watermarks, no multicolored timeline blocks
```

- [ ] **Step 3: ライト画像をダーク版へ編集する**

Step 2で生成したライトPNGをbuilt-in ImageGenの編集対象にする。次のプロンプトで、照明と配色だけを変える。

```text
Change only the environment palette and lighting to deep charcoal with restrained blue monitor glow. Preserve the exact monitor, studio microphone, keyboard, trackpad, camera composition, abstract preview and thin audio waveform, and clear upper-left copy-safe area. Keep all no-text/no-logo/no-label/no-button/no-watermark constraints.
```

保存した出力を`tmp/imagegen/activity-video-dark.png`とする。

- [ ] **Step 4: 2画像をWebPへ変換して置換する**

Run:

```bash
cwebp -quiet -resize 1600 1024 tmp/imagegen/activity-video-light.png -o frontend/public/images/about/activity-video-light.webp
cwebp -quiet -resize 1600 1024 tmp/imagegen/activity-video-dark.png -o frontend/public/images/about/activity-video-dark.webp
```

- [ ] **Step 5: 寸法・内容・回帰テストを確認する**

Run:

```bash
sips -g pixelWidth -g pixelHeight frontend/public/images/about/activity-video-light.webp frontend/public/images/about/activity-video-dark.webp
cd frontend
set -a
source ../../../frontend/.env
source ../../../frontend/.env.local
set +a
NODE_OPTIONS=--localstorage-file=/tmp/about-video-monitor-localstorage npm test -- src/pages/AboutActivityCards.test.tsx --silent=true
```

Expected: 両画像が`pixelWidth: 1600`と`pixelHeight: 1024`、focused testが4件成功。

画像を高解像度で目視し、以下を確認する。

- ライト／ダークでモニター、マイク、キーボード、トラックパッドの配置が同じ。
- 左上48%にHTMLコピー用の空き領域がある。
- モニターには文字なしの細い青灰色波形と抽象映像プレビューがあり、多色タイムラインがない。
- 画像内に文字、数値、ロゴ、UIラベル、ボタン、透かし、人がいない。

- [ ] **Step 6: PCとスマートフォンで確認する**

main checkoutの`frontend/.env`と`frontend/.env.local`を読み込んだ状態で、`frontend`から`npm run dev -- --host 127.0.0.1 --port 5177`を起動し、Playwright CLIで`/about`を確認する。

| Viewport | Theme | 確認内容 |
| --- | --- | --- |
| 1280×720 | light | 解説動画のコピー・ボタンが左上安全領域にあり、波形モニターと重ならない |
| 1280×720 | dark | ダーク画像が表示され、主役が見分けられ、コピーと重ならない |
| 390×844 | light | 1列表示、横スクロールなし、コピーと主役が重ならない |
| 390×844 | dark | 1列表示、ダーク画像と左上コピーが読みやすい |

- [ ] **Step 7: 画像をコミットする**

```bash
git add frontend/public/images/about/activity-video-light.webp frontend/public/images/about/activity-video-dark.webp
git commit -m "Refresh About video monitor preview"
```
