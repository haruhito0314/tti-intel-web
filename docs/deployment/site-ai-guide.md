# Site AI Assistant deployment runbook

この手順書は、サイトのAI AssistantをAWSへ反映し、承認済みの本番確認を1回だけ行うための運用手順です。ローカル実装の完了は、AWSリソース作成、Amplify設定変更、OpenAI API利用の承認を意味しません。

## 1. 対象環境を確認する

デプロイ対象はAWSリージョン `ap-northeast-1` です。最初に、承認されたAWSアカウントIDと現在の認証先を照合します。

```bash
aws sts get-caller-identity
aws configure get region
```

`CDK_DEFAULT_REGION`、`AWS_REGION`、AWS profileのいずれかが `ap-northeast-1` 以外を指している場合は停止してください。対象アカウントIDが不明、または認証先と一致しない場合もデプロイしません。CDKコマンドを実行するシェルでは、承認済みprofileと `CDK_DEFAULT_REGION=ap-northeast-1` を明示します。

## 2. OpenAIの利用条件を再確認する

デプロイ直前に、次のOpenAI公式ページを確認します。

- [GPT-5.6 Luna model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [OpenAI model catalog](https://developers.openai.com/api/docs/models)
- [Responses API reference](https://platform.openai.com/docs/api-reference/responses)

確認項目は次のとおりです。

1. 対象OpenAI project/accountでモデルID `gpt-5.6-luna`を利用できる。
2. Responses API `POST /v1/responses`を利用できる。
3. Structured Outputsを利用できる。
4. `reasoning.effort: "none"`を利用できる。
5. 現在のテキスト料金を確認する。2026-07-17時点の公式model pageでは、100万tokenあたり入力 `$1.00`、cached input `$0.10`、出力 `$6.00`。

モデル、API、Structured Outputs、reasoning設定、価格のいずれかが変更されている、または対象accountで利用できない場合は停止します。モデルを無断で差し替えたり、予算上限を変更したりせず、モデルと予算の再承認を得てください。

## 3. OpenAI API keyをSecrets Managerへ登録する

Secret名は `tti-ai/openai-api-key`、リージョンは `ap-northeast-1` です。Secret valueは次のJSON objectにします。

```json
{
  "apiKey": "実際のOpenAI API key"
}
```

AWS Secrets Manager consoleでcreateまたはupdateし、暗号化keyは既定のAWS managed key `aws/secretsmanager`を使用する方法を推奨します。実際のkeyをソースコード、`.env`、手順書、チャット、command history、スクリーンショット、clipboard logへ残さないでください。

shellを使う場合は、端末の非表示入力から標準入力でAWS CLIへ渡し、keyをコマンド引数や一時ファイルに埋め込まない運用にします。終了後はshell変数を破棄します。

既存secretがcustomer-managed KMS keyを使っている場合は停止してください。対象CMKだけへの `kms:Decrypt` を別途設計・レビュー・承認してから、Lambda roleへ最小権限で追加します。

## 4. ローカルgateを実行する

リポジトリrootで、ロックファイルどおりに依存関係を入れ直して検証します。

```bash
npm ci --prefix lambdas
npm --prefix lambdas run typecheck
npm --prefix lambdas test
npm ci --prefix infra
npm --prefix infra test
npm --prefix infra run build
npm --prefix infra run synth
```

`synth`出力のARN、API URL、asset regionが `ap-northeast-1` であることを確認します。別regionが出た場合はデプロイせず、AWS/CDK環境変数とprofileを修正して最初から再実行します。ここまでのコマンドはAWSを変更しません。

## 5. 承認後だけCDKを反映する

AWS変更の明示承認を得た後に限り、次を実行します。

```bash
npm --prefix infra run diff
npm --prefix infra run deploy
```

`diff`で、Assistant Lambda、`tti-ai-assistant-usage` table、`/assistant` methods、最小IAM、stage throttle以外に意図しない変更がないことを確認します。`deploy`を自動実行やAmplify buildへ組み込まないでください。

## 6. `ApiUrl`をAmplifyへ設定する

CloudFormation output `ApiUrl`を取得し、Amplifyの公開環境変数 `VITE_API_BASE_URL`へ設定します。末尾の `/` はあってもなくてもfrontend clientが正規化します。

この値は公開API base URLであり、OpenAI API keyではありません。OpenAI API keyを `VITE_` から始まる変数へ設定してはいけません。

Amplify環境変数の変更も別途承認後だけ行います。

## 7. frontendをbuild・deployする

frontendの検証とbuildを行い、承認済みのAmplify手順でdeployします。

```bash
npm ci --prefix frontend
npm --prefix frontend test -- --maxWorkers=1 --no-file-parallelism
npm --prefix frontend run build
```

`amplify.yml`はfrontend専用のまま維持します。CDK deploy、secret作成、OpenAI smoke testをAmplify buildへ混ぜません。

## 8. 本番smoke testを1回だけ行う

AWS・Amplify反映と有料API利用の明示承認後、本番Originから次の質問をexactly 1回送信します。

```text
今週の数学はどこ？
```

次を確認します。

- HTTP 200で完了する。
- answerが500文字以内である。
- linkがcanonical path `/weekly-math`を指す。
- UIへ任意のserver error本文や内部情報が出ない。

失敗しても自動retryや追加の手動送信をしません。CloudWatchのrequestIdで原因を調査し、修正・再承認後に別の確認計画を立てます。

## 9. 保存データとログのprivacyを確認する

DynamoDB `tti-ai-assistant-usage` itemには、次の属性だけが保存されていることを確認します。

- `pk`
- `sk`
- `count`
- `kind`
- `expiresAt`

CloudWatchにはrequestId、outcome、status、latency、token totalsだけが記録されることを確認します。質問本文、history、平文sessionId、OpenAI API key、secret valueがDynamoDBまたはCloudWatchへ出ていた場合は運用を停止します。

## 10. 監視と予算管理

次を監視します。

- Lambdaの日次上限・session上限による429
- 5xxとtimeout
- latency
- input/output/total token totals
- OpenAI残高と実測cost

既定値は日次100回、sessionあたり10分間に20回、API Gateway stage throttleはrate 2・burst 4です。`ASSISTANT_DAILY_LIMIT=100`を上げる前に、残高、1回あたりの実測token、実測costを確認して再承認を得ます。

REST APIではresource単位のGatewayResponseを安全に追加できないため、API Gateway自身がLambdaより先に2/4 throttleを返した場合だけ、browserからCORS network errorとして見える可能性があります。その場合、AI Assistantは固定の一時利用不可メッセージを表示します。CORSを認証や予算保護として扱わず、DynamoDB quotaとstage throttleを継続して監視します。

## 11. rollback

問題があれば、前のfrontend artifactと前のCloudFormation stack versionへ戻します。

- frontendを直前の正常artifactへ戻す。
- CDK stackを直前の承認済みtemplateへ戻す。
- `RemovalPolicy.RETAIN`のusage tableを自動削除しない。
- 既存の `tti-ai/openai-api-key` secretを自動削除しない。
- データ削除やsecret rotationが必要な場合は、影響範囲を確認して別途承認を得る。

rollback後は追加の有料smoke testを無断で行わず、ログとメトリクスで復旧状態を確認します。

## 実行権限の境界

ローカル実装・test・build・synthだけでは、次の操作は許可されません。

- AWS secretのcreate/update
- `cdk diff` / `cdk deploy`
- Amplify環境変数変更または本番deploy
- OpenAI APIを使うlive smoke

これらは、それぞれの対象と費用を理解した明示承認後だけ実行します。
