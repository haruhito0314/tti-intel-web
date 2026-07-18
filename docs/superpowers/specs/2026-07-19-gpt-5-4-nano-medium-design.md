# GPT-5.4 nano Medium Production Switch Design

## Goal

サイトの本番AI Assistantで使うfact selectorを、`gpt-5.6-luna`から評価済みの`gpt-5.4-nano-2026-03-17`へ切り替え、`reasoning.effort: "medium"`と`max_output_tokens: 512`を使用する。

## Selected approach

評価に使用したsnapshotをCDKとLambdaの既定値へ明示し、コード・テスト・運用手順を同じ設定へ揃える。OpenAI呼び出しは従来どおり、ローカル計画で確定できない質問のfact ID選択にだけ使う。回答文とリンクはレビュー済みfactから決定論的に生成し、モデルへ生成させない。

この方式を選ぶ理由は、検証したモデル版を固定でき、CDK deploy後も設定ドリフトを残さず、Lunaへ戻す場合も同じ箇所を差し戻せるためである。

## Considered alternatives

1. `gpt-5.4-nano` aliasを使う。将来のsnapshot更新を自動で受けられるが、今回の評価結果との再現性が失われるため採用しない。
2. Lambda環境変数だけをAWS CLIで変更する。反映は速いがCDKとの差分が残り、次回deployでLunaへ戻るため採用しない。
3. 評価済みsnapshotをCDKで管理する。再現性とIaC整合性が最も高いため採用する。

## Code changes

- `lambdas/public/assistant/openaiTransport.ts`
  - `gpt-5.4-nano` aliasとsnapshotをgeneric nano判定より先に検出する。
  - 5.4 nanoだけ`medium`を返す。
  - legacy `gpt-5-nano`と`gpt-5-mini`は既存の`minimal`、GPT-5.6は`low`、その他は`none`を維持する。
- `lambdas/public/assistant/factPlanner.ts`
  - 既定モデルを`gpt-5.4-nano-2026-03-17`へ変更する。
  - 出力上限を評価済みの512へ変更する。Responses APIではこの値にvisible outputとreasoning tokenの両方が含まれる。
- `infra/lib/tti-ai-stack.ts`
  - `ASSISTANT_MODEL`を同じsnapshotへ変更する。
  - Lambda 25秒、OpenAI 20秒、利用上限、IAM、fact schemaは変更しない。
- `docs/deployment/site-ai-guide.md`
  - モデル、reasoning、上限、公式確認先を新設定へ更新する。
- 旧`openai.ts`のguide/small-talk生成経路は本番bundleから未使用なので、既定Luna設定をこの切替では変更しない。

## Request flow

1. Lambdaの決定論的plannerが質問を処理する。
2. 高確信または対象外と確定できる質問はOpenAIを呼ばない。
3. 低確信の場合だけ、46件の静的fact descriptionと質問を5.4 nanoへ送る。
4. 5.4 nanoはstrict JSON schemaで最大4件のfact IDと`unsupported`だけを返す。
5. LambdaがID、重複、`unsupported`不変条件を再検証する。
6. 検証済みfactだけから回答文とcanonical linkを決定論的に生成する。

## Failure and safety behavior

- timeout、refusal、不完全出力、schema違反、未知ID、重複ID、不整合な`unsupported`は既存どおり安全なエラーへ変換する。
- モデル出力を回答文やURLとして直接表示しない。
- 質問本文、history、API keyをログへ追加しない。
- 評価で重大誤支持が1/40残った事実を残余リスクとして扱い、今回のモデル切替で解消済みとは見なさない。

## Test strategy

1. `reasoningEffortForModel`で5.4 nano alias/snapshotが`medium`になる失敗テストを先に追加する。
2. fact plannerの既定payloadがsnapshot、`medium`、512、strict schemaを使う失敗テストを追加する。
3. CDK testでLambda環境変数がsnapshotになる失敗テストを追加する。
4. 実装後にLambdaの対象test、全test、typecheckを実行する。
5. infra test、build、synthを実行し、生成templateとassistant assetに新snapshotが入り、本番経路にLuna設定が残らないことを確認する。
6. CDK diffで変更対象がAssistant Lambdaのcode/environmentと関連metadataに限定されることを確認する。

## Deployment and verification

1. AWS accountとregionが承認済みの`ap-northeast-1`であることを確認する。
2. ローカルgateとCDK diffが成功した場合だけCDK deployする。
3. Lambda configurationが`gpt-5.4-nano-2026-03-17`でactiveになったことを読み取る。
4. 本番Originからrunbook所定の高確信質問を1回だけ送り、HTTP 200、200文字以内、`/weekly-math` linkを確認する。このsmokeは正常時OpenAIを呼ばない。
5. モデル経路の確認には、すでに実行済みの直接API評価結果を用い、追加の有料・利用枠消費smokeは行わない。

## Rollback

問題が出た場合は、`ASSISTANT_MODEL`、5.4 nano専用effort、fact planner上限を直前のLuna設定へ戻した検証済み成果物をCDKで再deployする。Secret、DynamoDB table、利用上限は変更・削除しない。

## Success criteria

- production configurationが`gpt-5.4-nano-2026-03-17`を使用する。
- fact planner payloadが`reasoning.effort: "medium"`と`max_output_tokens: 512`を使用する。
- 既存の決定論的回答生成と安全検証が維持される。
- Lambdaとinfraの全test、typecheck、build、synthが成功する。
- CDK diffに意図しないAWS resource変更がない。
- deploy後のLambdaがactiveで、本番の高確信smokeがHTTP 200になる。
