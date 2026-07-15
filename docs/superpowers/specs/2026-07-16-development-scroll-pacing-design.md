# Development Scroll Pacing Design

## Goal

`/development` の7章構成と既存アニメーションを保ちながら、ページ全体のスクロール距離を短縮し、章ごとの滞在時間を読みやすく再配分する。

## Pacing

- Desktop track height: `1640vh` から `1280vh` へ短縮する。
- Mobile track height: `1480vh` から `1200vh` へ短縮する。
- Chapter spans: `[0.13, 0.25, 0.11, 0.10, 0.12, 0.13, 0.16]` とする。
- 第2章の比率を `33.5%` から `25%` へ下げ、ページ中盤の停滞感を減らす。
- 第3章から第6章は各演出を追える最低限の距離を確保する。
- 第7章はCTAを認識して操作できるよう、7章中で十分な余韻を持たせる。

## Implementation

`devScrollConfig.ts` のtrack height定数とchapter spansを唯一の調整値として更新する。現在CSS側にもtrack heightが固定値で定義されているため、同じ値へ同期する。章内のenter、hold、crossfade、zoom timingは変更せず、既存演出の内容と順序を維持する。

Reduced Motion時の静的表示、sticky stage、scroll progress計算には変更を加えない。

## Verification

- chapter spansの合計が1であり、range間にgapがないこと。
- Desktopとmobileのtrack heightが設計値と一致すること。
- 各章の実スクロール距離が極端に短くならず、第7章にCTA操作の余裕があること。
- Development向けfocused tests、lint、production buildが通ること。
- Desktopとmobileで `/development` を確認し、第2章の停滞が減り、後半が駆け足に見えないこと。

## Out of Scope

- 各sceneのビジュアル、コピー、表示順の変更。
- 新しいscroll snappingや慣性scrollの導入。
- Reduced Motion表示の再設計。
