# 自然言語対応AIアシスタント・ルーティング再設計

## 位置づけ

本設計は、`2026-08-10-circle-site-assistant-routing-design.md` の回答範囲、Web検索禁止、大学公式サイトへの限定案内、短文回答という方針を維持しつつ、質問の振り分け部分を置き換える。

従来の「限られた単語に一致しなければ即 `out_of_scope`」という方式は廃止する。新方式は、高信頼なローカル判定、曖昧な質問だけを対象とするLuna分類、分類済みtopicに基づく資料選択、資料に限定したLuna回答生成の4段階で構成する。

## 背景と確認済みの問題

現行実装では、サークル判定が実質的に「このサークル」「AIサークル」「TTI Intelligence」「TTIインテリジェンス」に依存している。そのため、利用者にとって自然な「サークルについて教えて」が `out_of_scope` となり、`TTI Intelligenceと、このサイトの内容について案内できます。` だけが返る。

問題は入口だけではない。

- `scope.ts` と `structuredKnowledge.ts` が別々にサークル表現を再判定しており、入口を通しても資料が選ばれない可能性がある。
- 現行100件評価のcircleケースは、すべて既存の明示アンカーを含み、無冠詞、主語省略、自然な口語を評価していない。
- 現行の本番評価runnerは、0-callケースに必須の `sessionId` を付けないため、そのままではローカル応答ケースがHTTP 400になる。
- 現行のLambdaは25秒、フロントエンドは28秒、生成APIは20秒timeoutである。分類と生成を単純に20秒ずつ直列実行する設計は成立しない。
- 評価用価格設定は公式の現行Luna価格と一致していない。

したがって、正規表現へ単語を追加するだけの修正は行わず、ルーティング結果を単一の構造体として後続処理へ渡す。

## 目的

1. TTI Intelligenceやサイトについて、自然な日本語、口語、表記揺れ、主語省略、短い追加質問でも適切に案内する。
2. 豊田工業大学全般、他大学、他団体、一般質問をTTI Intelligenceへ誤って寄せない。
3. 明確な質問は無料のローカル判定で処理し、本当に曖昧な質問だけLunaで分類する。
4. circle/siteに確定した質問には、確定topicに必要な資料だけを選び、根拠付きの短い回答を生成する。
5. Web検索を一切使わず、1質問あたりLunaを最大2回に制限する。
6. 誤分類、呼び出し回数、費用、遅延、リンク、プライバシーを本番評価で測定できるようにする。

## 対象外

- 一般用途チャットAIへの変更
- Web検索、File Search、MCP、その他のOpenAI toolの追加
- 豊田工業大学の詳細FAQや大学資料の再導入
- Luna以外の本番モデルへの切り替え
- フロントエンドの大規模な外観変更
- 質問本文や回答本文のログ保存
- アプリ独自の永続回答キャッシュ

## 回答範囲

### circle

TTI Intelligenceの概要、活動、参加、見学、活動日、費用、初心者、連絡先、Discord、YouTube、制作物、ゲーム交流、今週の数学、公開済みの試験予定を案内する。

このAIアシスタント上で、所属先を明示しない「サークル」「活動」「参加」「入部」「見学」「メンバー」「会費」「Discord」などは、別の大学・団体が明示されていない限りTTI Intelligenceを第一候補とする。

### site

サイトのページ、機能、使い方、アプリ、お知らせ、掲示板、今週の数学、開発ページに掲載しているCodex、Vercel、AWS、Plugin、CLI、MCPを案内する。

### university

豊田工業大学全般、入試、学費、学部、大学全体の課外活動、大学公式性などは生成しない。次の固定文と公式トップだけを返す。

`豊田工業大学については、公式サイトをご確認ください。`

`https://www.toyota-ti.ac.jp/`

### conversation

挨拶、感謝、了承、終了表現だけのメッセージへ短く返す。挨拶と実質質問が同居する場合は、実質質問を優先する。

### out_of_scope

天気、医療、金融、料理、旅行、一般知識、他大学・他団体など、TTI Intelligenceとサイトに関係しない質問は詳細回答しない。

## ルーティングモデル

### 共通型

```ts
export type AssistantScope =
  | 'circle'
  | 'site'
  | 'university'
  | 'conversation'
  | 'out_of_scope';

export type AssistantTopic =
  | 'circle_overview'
  | 'circle_participation'
  | 'circle_contact'
  | 'circle_social'
  | 'circle_works'
  | 'circle_game'
  | 'circle_math'
  | 'circle_exam'
  | 'site_overview'
  | 'site_navigation'
  | 'site_contact'
  | 'site_apps'
  | 'site_ai_assistant'
  | 'site_table_tennis'
  | 'site_color_sort'
  | 'site_development'
  | 'site_codex'
  | 'site_vercel'
  | 'site_aws'
  | 'site_plugin'
  | 'site_cli'
  | 'site_mcp'
  | 'site_news'
  | 'site_board'
  | 'site_weekly_math';

export interface AssistantRouteDecision {
  scope: AssistantScope;
  topics: AssistantTopic[];
  contextualFollowUp: boolean;
  source: 'local' | 'luna';
  reasonCode: string;
}

export type LocalRouteResult =
  | { kind: 'resolved'; decision: AssistantRouteDecision }
  | {
      kind: 'ambiguous';
      candidateScopes: AssistantScope[];
      topicHints: AssistantTopic[];
      historyEligible: boolean;
    };
```

`reasonCode` は固定enumとして実装し、利用者の文章やモデルの自由文をログへ入れない。
`candidateScopes` と `topicHints` はLunaへの助言でありhard allowlistではない。ローカル候補の漏れだけを理由に、Lunaの有効な5-way scope判定を拒否しない。`historyEligible` はローカルrouterだけが判定し、分類器で同じ判定を重複実装しない。

### ローカル判定

ローカル判定は「分かるものだけ確定する」役割を持つ。未知の表現を即 `out_of_scope` にしない。

優先順位は次のとおりとする。

1. 現在の質問に実質的な内容がある場合、挨拶や感謝より質問内容を優先する。
2. 豊田工業大学や他大学・他団体が明示され、TTI Intelligence自体が質問の中心でない場合は `university` または `out_of_scope` とする。
3. TTI Intelligence、AIサークル、このサークル、無修飾のサークル質問、活動、参加、見学、会費、Discordなどの高信頼な意図は `circle` とする。
4. このサイト、このページ、既知ページ名、既知アプリ名、Codex、Vercel、AWS、Plugin、CLI、MCPは `site` とする。
5. 全文が挨拶、感謝、了承、終了表現だけなら `conversation` とする。
6. 天気、医療、金融など、明らかな対象外カテゴリは `out_of_scope` とする。
7. 上記で確定できない場合は `ambiguous` とする。

必須の対照ルールは次のとおり。

| 質問 | 結果 |
| --- | --- |
| サークルについて教えて | `circle / circle_overview / local` |
| サークルの活動は？ | `circle / circle_overview / local` |
| 参加したい | `circle / circle_participation / local` |
| Discordある？ | `circle / circle_social / local` |
| 豊田工業大学のサークル一覧は？ | `university / local` |
| 名古屋大学のサークルは？ | `out_of_scope / local` |
| 豊田工業大学のTTI Intelligenceについて | `circle / circle_overview / local` |
| こんにちは、活動について教えて | `circle / circle_overview / local` |
| ありがとう、参加方法も知りたい | `circle / circle_participation / local` |
| 何してるの？ | `ambiguous`。履歴とLuna分類で決定 |

### 履歴

- 現在の明示的な質問を履歴より必ず優先する。
- ローカルの追加質問判定に使う履歴は直前の利用者発話だけとする。
- Luna分類・回答生成へ渡す過去の利用者発話は、現在の質問が省略表現である場合だけ直前1件を許可する。API requestは互換性のため最大2件を受け取るが、モデル入力へ2件前を渡さない。
- 無関係な直前発話を飛び越えて、2件前の話題を復活させない。
- 回答本文は履歴として送らない。

## Luna分類

### 呼び出し条件

`localRouteFor()` が `ambiguous` を返した場合だけ呼ぶ。明確なcircle/site、大学、会話、対象外では呼ばない。

### 入力

- `message`
- 正規化済みの `currentPageId`
- 必要最小限の直近利用者発話、最大1件
- 許可されたscopeとtopicの定義
- ローカル判定が返した候補scopeとtopic hint

knowledge、動的コンテンツ、平文session ID、request ID、API内部情報は分類promptへ渡さない。公開サービス向けのOpenAI公式推奨に従い、検証済みUUIDv4 session IDを固定ドメイン文字列とともにSHA-256化した値だけをAPI metadataの `safety_identifier` として分類・回答の両方へ渡す。この値はpromptやログへ入れない。

### 出力

LunaのStructured Outputsを使い、次の厳格なJSON Schemaだけを許可する。

```json
{
  "scope": "circle | site | university | conversation | out_of_scope",
  "topics": ["AssistantTopic enum"],
  "contextualFollowUp": true,
  "confidence": "high | medium | low"
}
```

- 理由、説明、URL、回答文、未知のキーは禁止する。
- `topics` は最大3件とし、scopeと互換性がないtopicはサーバー側で拒否する。
- `confidence: low`、不正JSON、未知scope、拒否、timeout、upstream errorは推測で回答へ進めず、ローカルの確認質問を返す。

### API設定

- model: `gpt-5.6-luna`
- Responses API
- `reasoning.effort: none`
- `max_output_tokens: 96`
- `tools: []`
- `store: false`
- `safety_identifier`: `sha256("tti-intel-assistant:v1:" + sessionId)`
- timeout: 4.5秒
- 自動retry: なし

GPT-5.6 LunaがResponses APIとStructured Outputsをサポートし、`none` を含むreasoning effortを利用できることは、公式OpenAIドキュメントで実行前に再確認する。

## 資料選択

`selectStructuredKnowledge()` が利用者の単語からscopeを再推測する構造を廃止し、`selectKnowledgeForRoute(decision, message, currentPath)` を単一の入口とする。

- scopeは確定済みの `decision.scope` だけを信頼する。
- `decision.topics` を知識IDへ決定的に対応させる。
- messageの語彙スコアは、同一topic内での順位づけにだけ使い、scope変更には使わない。
- `circle` でtopicが空の場合は `circle-identity` を必ず含める。
- `site` でtopicが空の場合に使う、レビュー済みの `site-overview` 資料を追加する。
- circle質問へsite/app資料を混ぜる場合は、`circle_works` など明示的なtopicがある場合だけ許可する。
- 生成に渡す資料は最大5件、動的コンテンツは最大3件を維持する。

## 回答生成

circle/siteだけが回答生成へ進む。

- model: `gpt-5.6-luna`
- `reasoning.effort: low`
- `text.verbosity: low`
- `max_output_tokens: 450`
- `tools: []`
- `store: false`
- 選択済み資料と許可済みリンク候補だけを入力する。
- 回答は原則200文字以内、最大280文字、最大3文とする。
- URLを回答本文へ書かせず、リンクはサーバー側allowlistとIDから組み立てる。
- 資料が0件の場合は生成せず、scope別の短い確認質問と安全な内部リンクを返す。

掲示板の利用者投稿本文はモデルへ渡さない。掲示板の動的案内は、正規化・文字数制限したタイトル、検証済みID、検証済みリンクに限定する。お知らせと今週の数学も既存上限内で必要部分だけを渡し、すべて信用できない外部コンテンツとしてsystem instructionに明記する。

## 呼び出し契約

| 経路 | 分類Luna | 回答Luna | 合計 |
| --- | ---: | ---: | ---: |
| 明確な大学・会話・対象外 | 0 | 0 | 0 |
| 明確なcircle/site | 0 | 1 | 1 |
| 曖昧→大学・会話・対象外 | 1 | 0 | 1 |
| 曖昧→circle/site | 1 | 1 | 最大2 |
| 分類失敗 | 1回試行 | 0 | 1 |

1質問あたり2回を絶対上限とし、retryで3回目を発生させない。Web callは全経路で0とする。

## timeoutとdeadline

ハンドラー開始時に単一のdeadlineを作る。

- Lambda timeout: 25秒を維持
- サーバー内部deadline: 開始から23秒
- 分類timeout: 最大4.5秒
- 回答timeout: 18秒以下かつ、内部deadlineまでの残り時間から1秒の応答余裕を引いた値
- フロントエンドtimeout: 28秒を維持
- 分類後の残り時間が回答に不十分なら、回答Lunaを呼ばず短い再試行案内を返す。

分類・回答の両方で20秒を別々に使うことは禁止する。

## quotaと費用保護

利用者に見える質問上限と、実際の有料call上限を分離する。

1. 有料経路へ入る利用者リクエストは、session/request quotaを1回だけ消費する。
2. 各Luna callの直前に、global paid-call budgetをstage別に1回消費する。
3. 分類と回答はそれぞれ `requestId:classification`、`requestId:generation` から冪等トークンを作る。
4. 分類callには独立した日次・session-window副上限を設ける。
5. 失敗したAPI callも費用保護上は消費扱いにし、予約後の自動retryはしない。

初期値は既存利用量を基準にCDKで明示し、少なくとも次を別々に設定可能にする。

- paid user requests/day
- paid calls/day
- paid requests/session window
- classifier calls/day
- classifier calls/session window

Lunaの価格は実装・本番評価日に公式ページで再確認する。2026-08-11時点の公式モデルページ実ページでは、100万tokenあたりinput `$0.20`、cached input `$0.02`、output `$1.20`、cache writeはuncached inputの1.25倍、すなわち `$0.25` である。評価設定はこの値へ更新し、価格確認日と公式URLを保存する。forecastは価格確認から24時間以内だけ有効とする。

費用承認はsmokeで観測したcached料金だけに依存させない。分類の完全なclient payloadをUTF-8で8,000 bytes以下、回答生成を32,000 bytes以下に実装上で制限し、超過時はOpenAIを呼ばない。100件評価の期待値は32分類・60生成だが、誤分類時の費用上限は32件の曖昧質問がすべて生成対象になる場合の32分類・74生成・106 callで計算する。全入力をinput/cache-writeの高い方である `$0.25/M`、全出力を最大token数と `$1.20/M` で評価し、観測値からの期待費用とは別にhard upper boundを提示する。承認額がhard bound未満なら実行しない。

初期リリースではアプリ独自の永続キャッシュや明示的なcache writeを追加しない。分類・生成の安定したprefixを保ち、usageのcached tokenを測定する。低トラフィックでも再利用が確認できた場合だけ、別設計としてキャッシュを検討する。

## 失敗時の応答

| 状況 | 動作 |
| --- | --- |
| Luna分類timeout・拒否・不正出力 | HTTP 200で「サークルについてか、このサイトについてかをもう少し具体的に教えてください。」。回答Lunaは呼ばない |
| `confidence: low` | 同じ確認応答。scopeを推測しない |
| 分類後に資料0件 | scope別の確認応答と許可済み内部リンク。回答Lunaは呼ばない |
| 分類後に回答quota不足 | 429。追加callなし |
| 回答Luna timeout | 504。追加callなし |
| 回答Luna upstream error | 502。追加callなし |
| モデル回答が不正・280文字超過 | unsafe outputとして拒否。切り詰めて返さない |

対象外定型文は、本当に `out_of_scope` と確定した場合だけ使う。曖昧な質問へ同じ対象外文を返すことは禁止する。

## ログと監視

LambdaはAWSのJSON loggingを有効にし、アプリ側は文字列化せず1個のobjectを `console.info` へ渡す。CloudWatch上のapplication eventは `{ timestamp, level, requestId, message: assistantRecord }` とし、評価相関・metric filterは必ず `$.message.*` を参照する。構造化ログへ次を追加する。

- `routingSource: none | local | luna`（CORS・validation・preflightなど未判定経路は `none`）
- `assistantScope: circle | site | university | conversation | out_of_scope | ambiguous | unclassified`
- `routingReasonCode`
- `assistantScope`
- topic ID、最大3件
- `classifierCallCount`
- `generationCallCount`
- `lunaCallCount`
- stage別duration
- stage別のinput、cached input、cache write、output、total token
- `knowledgeCount`
- `knowledgeDomains`
- `dynamicContentCount`
- `webCallCount: 0`

質問、履歴、回答、knowledge本文、動的本文、平文session ID、`safety_identifier` は記録しない。

CloudWatchでは次を監視する。

- paid-call日次上限の80%
- classifier利用率の急増
- classifier fallback率
- scope別件数
- classifier、generation、全体のp50/p95 latency
- 429、502、504、unsafe output
- Web callが0以外になった場合

## フロントエンド

- 質問例の先頭を、実障害そのものの `サークルについて教えて` にする。
- `活動は？`、`参加方法は？` など、自然な短文例を含める。
- 「対象外の一般質問にはLunaを利用しません」という断定は削除する。曖昧な質問では分類のためLunaを使う可能性があるため、`質問内容を判定するためAIを利用する場合があります。` と説明する。
- 回答の原則200文字、最大280文字、最大3文という表示契約を維持する。
- API request形式は維持し、直近2件の利用者発話だけを送る。

## 評価設計

### ローカル単体評価

少なくとも200件の固定gold setを作り、実装用ルールから独立したfixtureとして管理する。

- 無冠詞・自然な言い換え
- 主語省略・口語
- 誤字、ひらがな、全角半角、空白、記号ノイズ
- 挨拶＋実質質問、感謝＋追加質問
- 1件履歴、2件履歴、話題変更、明示質問優先
- 豊田工業大学とTTI Intelligenceの対照
- 他大学、他団体、一般質問
- prompt injection

最重要回帰ケースは別配列で管理し、全件100%を要求する。

### Luna分類評価

- strict schemaの正常・異常parse
- scope/topic互換性
- `confidence: low` fallback
- timeout、拒否、不正JSON、未知enum、余分なキー
- prompt injectionによりscopeを強制できないこと
- 同一の重要な曖昧質問を3回実行し、3回とも同じscopeになること

### ハンドラー統合評価

- 0/1/2-call契約
- stage別quotaと冪等性
- scope確定前に資料検索・動的検索を行わないこと
- Web call 0
- deadlineと残時間計算
- ログに本文が含まれないこと
- circle/site確定後に資料0件で生成しないこと

### 新しい100件本番評価

fixture schemaを更新し、各caseに次を持たせる。

- `expectedScope`
- `expectedScopeSource: local | luna`
- `expectedTopics`
- `expectedClassifierCallCount`
- `expectedGenerationCallCount`
- `expectedLunaCallCount: 0 | 1 | 2`
- `expectedWebCallCount: 0`
- `maxAnswerChars`
- `maxSentences`
- `critical`
- `contrastPairId`

分布は次の100件とする。

- circle: 36
- site: 24
- university: 16
- out_of_scope: 16
- conversation: 8

表現軸は、通常言い換え20、主語省略・口語20、typo・記号・空白ノイズ15、省略・履歴20、大学/circle対照とhard negative 15、複合質問・prompt injection 10とする。

本番runnerは全ケースへUUIDv4 `sessionId` を必ず付ける。dry-runは「fixtureを読み込めた」証拠に限定し、本番精度の証拠として表示しない。実測0件のレポートへ正答率や費用を表示せず、`NOT_EVALUATED` 専用manifestとして本番PASS/FAIL manifestと型・検証経路を分離する。

本番runnerは回答収集とCloudWatch回収・確定を二段階に分け、回答収集済みファイルを上書きしない。ログ伝播待ちや一時的な回収不足では質問を再送せず、固定済みcorrelationからrun ID・時刻範囲を再読込して、read-onlyログ回収、telemetry生成、zero-network finalizationだけを再開する。

## 公開条件

- 最重要回帰ケース: 100%
- university/circle対照ペア: 100%
- 履歴・話題変更ケース: 100%
- 全体scope accuracy: 98%以上
- macro-F1: 0.97以上
- circle recall: 98%以上
- out_of_scopeからcircle/site生成への誤送信: 全体1%以下、危険質問は0件
- classifier/generation/合計call数一致率: 100%
- Web call: 0件
- 大学の詳細生成: 0件、公式root URL完全一致100%
- 回答: 100%が280文字以下、95%以上が200文字以下、中央値140文字以下、最大3文
- inline URL、allowlist外リンク、質問・履歴・回答のログ漏洩: 0件
- 曖昧→生成経路: p95 20秒以下、全件23秒以内
- 本番費用: `null` 0件、事前予測の115%以内かつ承認済み予算内
- 重要な曖昧ケースの3回反復: scope一致3/3

1項目でも満たさない場合は公開しない。

## デプロイと確認

1. Lambda単体、統合、型検査、frontend、infra、評価器をすべて実行する。
2. 100件fixtureのdry-runで、production/OpenAI callが0であることを確認する。
3. 評価PDFを生成し、全ページをrenderして目視確認する。
4. Lambda/CDKをAWSへデプロイする。
5. 重要な8質問を本番APIへ送り、stage別call数、scope、遅延、usageをCloudWatchで確認する。
6. 承認された100件本番評価を1回実行し、公開条件を満たすことを確認する。
7. Gitの最新コミットをAmplifyへデプロイする。
8. 公開サイトの実画面で `サークルについて教えて`、大学質問、対象外質問、曖昧な質問を確認する。
9. LambdaのCloudFormation状態とAmplify jobの両方が成功したことを記録する。

Lambdaだけ、またはAmplifyだけを更新した状態を完成扱いにしない。

8問smokeまたは100件公開条件が失敗した場合、Amplify公開まで待たない。APIが正常で意味判定だけが不合格なら、事前承認されたCDK変更でsemantic classifierを即時無効化する。HTTP、schema、基盤、privacyの障害なら、事前に取得・checksum検証した直前CloudFormation templateとLambda assetへ戻す。100件実行直前にはJST当日のquotaをread-only取得し、最大106 call/32 classifier/74 paid-requestに安全余裕を足した残量がなければresetせず翌日へ延期する。DynamoDB BatchGetの `UnprocessedKeys` が空でない場合も実行しない。

## ロールバック

- 実装前に現行CloudFormation stack、Lambda version/code hash、Amplify job ID、Git commitを記録する。
- APIの重大障害は、デプロイ前に取得してchecksum・`CodeSha256`・template参照assetの一致を検証した直前のCloudFormation processed templateとLambda assetへ戻す。Git commitが実際のlive artifactと同じとは仮定しない。
- UIの重大障害は直前の成功Amplify jobを再デプロイする。
- 回答精度だけが公開条件を下回った場合は、semantic classifier経路を無効化できる環境変数を用意し、ローカル高信頼経路だけへ即時縮退する。
- ロールバック後もWeb検索を有効化しない。

## 公式OpenAI仕様の基準

- モデル: `gpt-5.6-luna`
- API: Responses API
- Structured Outputs: 対応
- reasoning effort: `none`、`low`を含む設定に対応
- tools: 本システムでは常に空配列
- 価格基準日: 2026-08-11
- 公式モデルページ: `https://developers.openai.com/api/docs/models/gpt-5.6-luna`

本番評価日の直前に公式ページを再確認し、価格、機能、reasoning設定が変わっていれば、コード、評価設定、PDFの3箇所を同じコミットで更新する。
