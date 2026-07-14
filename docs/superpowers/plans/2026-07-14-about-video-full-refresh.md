# About 解説動画カードの完全新規アートワーク Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解説動画カードの画像を機材も含めてゼロから作り直し、低く自然なモニタースタンドと文字なしの波形プレビューを持つライト／ダーク画像へ置き換える。

**Architecture:** TypeScriptとCSSは変更せず、既存の動画カード画像2枚だけを新規生成したWebPで置き換える。ライト版とダーク版は別々にゼロから生成するが、同じ構図制約と機材配置をプロンプトに明示してそろえる。

**Tech Stack:** built-in ImageGen、WebP、React 19、Vitest、Playwright CLI

## Global Constraints

- 置き換えるのは`activity-video-light.webp`と`activity-video-dark.webp`だけとする。
- カードのレイアウト、HTMLコピー、ボタン、リンク、画像パス、代替テキスト、CSSは変更しない。
- 右側に、低い自然なスタンドのワイドモニター、コンパクトなキーボード、マウス、卓上マイクを置く。
- モニターの上端は画像高の約24〜30%に置き、スタンドは短く、机面に自然に接地させる。
- 左上48%は見出し、説明、ボタン用の静かな余白にし、機材を置かない。
- モニターには文字なしの細い青灰色の音声波形と控えめな抽象映像プレビューだけを映し、色付きの編集タイムラインは使わない。
- ライト版は温かい白と淡いグレー、ダーク版は深いチャコールと控えめな青いモニター発光にする。
- 両方とも1600×1024のWebPとし、画像内に人、文字、番号、ロゴ、UIラベル、ボタン、透かしを含めない。

---

### Task 1: 解説動画カードの画像を完全新規生成する

**Files:**
- Modify: `frontend/public/images/about/activity-video-light.webp`
- Modify: `frontend/public/images/about/activity-video-dark.webp`
- Test: `frontend/src/pages/AboutActivityCards.test.tsx`

**Interfaces:**
- Consumes: `About.tsx`が参照する既存パス`/images/about/activity-video-light.webp`と`/images/about/activity-video-dark.webp`
- Produces: 同じパスに、完全新規の1600×1024 WebP画像ペア

- [ ] **Step 1: 既存の画像パス・リンク回帰テストを実行する**

Run:

```bash
cd frontend
set -a
source ../../../frontend/.env
source ../../../frontend/.env.local
set +a
NODE_OPTIONS=--localstorage-file=/tmp/about-video-full-refresh-localstorage npm test -- src/pages/AboutActivityCards.test.tsx --silent=true
```

Expected: `Test Files 1 passed (1)`、`Tests 4 passed (4)`。

- [ ] **Step 2: ライト版をゼロから生成する**

`imagegen`スキルとbuilt-in ImageGenを使う。既存の画像を参照画像や編集対象に使わず、次のプロンプトだけで新規生成する。

```text
Use case: photorealistic-natural
Asset type: 16:10 About-page activity card background, 1600 by 1024 composition
Primary request: a minimal modern video-production desk, entirely new scene, with a widescreen monitor on a short natural desktop stand, a compact keyboard, a mouse, and a small tabletop studio microphone
Composition/framing: reserve the upper-left 48 percent as calm uncluttered negative space for HTML heading, description, and button; put every piece of equipment in the right half; place the monitor top edge around 24 to 30 percent of image height; use a short stand that is visibly and naturally grounded on the desk, never tall or elongated
Monitor content: only a thin muted blue-gray audio waveform over an understated abstract dark video preview; no readable interface
Style/medium: polished editorial technology photography, realistic and clean, no people
Lighting/mood: warm white and pale gray soft daylight
Constraints: no text, no letters, no numbers, no logos, no UI labels, no buttons, no watermarks, no multicolored timeline blocks, no oversized monitor stand
```

選んだ生成結果を`tmp/imagegen/activity-video-light.png`へ保存する。

- [ ] **Step 3: ダーク版をゼロから生成する**

既存画像・ライト画像を編集対象に使わず、次のプロンプトだけで新規生成する。

```text
Use case: photorealistic-natural
Asset type: 16:10 About-page activity card background, 1600 by 1024 composition
Primary request: a minimal modern video-production desk, entirely new scene, with a widescreen monitor on a short natural desktop stand, a compact keyboard, a mouse, and a small tabletop studio microphone
Composition/framing: use the same camera composition and object arrangement as a matching light card: reserve the upper-left 48 percent as calm uncluttered negative space for HTML heading, description, and button; put every piece of equipment in the right half; place the monitor top edge around 24 to 30 percent of image height; use a short stand that is visibly and naturally grounded on the desk, never tall or elongated
Monitor content: only a thin muted blue-gray audio waveform over an understated abstract dark video preview; no readable interface
Style/medium: polished editorial technology photography, realistic and clean, no people
Lighting/mood: deep charcoal room with restrained blue monitor glow
Constraints: no text, no letters, no numbers, no logos, no UI labels, no buttons, no watermarks, no multicolored timeline blocks, no oversized monitor stand
```

選んだ生成結果を`tmp/imagegen/activity-video-dark.png`へ保存する。

- [ ] **Step 4: WebPへ変換して置き換える**

Run:

```bash
cwebp -quiet -resize 1600 1024 tmp/imagegen/activity-video-light.png -o frontend/public/images/about/activity-video-light.webp
cwebp -quiet -resize 1600 1024 tmp/imagegen/activity-video-dark.png -o frontend/public/images/about/activity-video-dark.webp
```

- [ ] **Step 5: 画像・回帰テストを検証する**

Run:

```bash
sips -g pixelWidth -g pixelHeight frontend/public/images/about/activity-video-light.webp frontend/public/images/about/activity-video-dark.webp
cd frontend
set -a
source ../../../frontend/.env
source ../../../frontend/.env.local
set +a
NODE_OPTIONS=--localstorage-file=/tmp/about-video-full-refresh-localstorage npm test -- src/pages/AboutActivityCards.test.tsx --silent=true
```

Expected: 両画像が`pixelWidth: 1600`と`pixelHeight: 1024`、focused testが4件成功。

画像を高解像度で目視し、以下を確認する。

- モニター上端が画像高の24〜30%にあり、スタンドが短く自然に机面へ接地している。
- モニター、キーボード、マウス、マイクが右側にあり、左上48%が静かなコピー用余白である。
- モニターには文字なしの細い青灰色波形と抽象プレビューがあり、多色タイムラインがない。
- 画像内に人、文字、番号、ロゴ、UIラベル、ボタン、透かしがない。
- ライト／ダークの構図と機材配置が一致している。

- [ ] **Step 6: PCとスマートフォンで表示を確認する**

main checkoutの`frontend/.env`と`frontend/.env.local`を読み込んだ状態で、`frontend`から`npm run dev -- --host 127.0.0.1 --port 5179`を起動し、Playwright CLIで`/about`を確認する。

| Viewport | Theme | 確認内容 |
| --- | --- | --- |
| 1280×720 | light | 右側の低いモニターと左上コピーが重ならない |
| 1280×720 | dark | ダーク画像が表示され、右側の主役と左上コピーが重ならない |
| 390×844 | light | 1列表示、横スクロールなし、コピーと主役が重ならない |
| 390×844 | dark | 1列表示、ダーク画像と左上コピーが読みやすい |

- [ ] **Step 7: 最終画像をコミットする**

```bash
git add frontend/public/images/about/activity-video-light.webp frontend/public/images/about/activity-video-dark.webp
git commit -m "Regenerate About video production artwork"
```
