# TTI Intelligence

豊田工業大学の学生を中心とした、AI・開発コミュニティ「TTI Intelligence」の公式Webサイトです。

最新のAI技術を共に学び、実践的な開発を通じてアイデアを形にするための活動拠点として、コミュニティ紹介、解説動画、数学コンテンツ、掲示板、開発成果、サイト内AI Assistantなどを公開しています。

[Live Website](https://tti-intel.com/) · [Portfolio Case Study](https://github.com/haruhito0314/portfolio/blob/main/works/tti-intelligence.md)

## My Role

- サイト企画・情報設計
- UI / UXデザイン
- React / TypeScriptによるフロントエンド開発
- API・バックエンド開発
- サイト内AI Assistantの開発
- AWS CDKによるインフラ構築
- テスト、デプロイ、継続運用

企画から設計、実装、公開、運用まで一貫して担当しています。

## Features

- コミュニティと活動内容の紹介
- 解説動画・今週の数学・ニュースの掲載
- 掲示板、コメント、お問い合わせ
- Webアプリ・ゲーム・開発成果の紹介
- 公開コンテンツを案内するサイト内AI Assistant
- 管理者向けの投稿・コンテンツ管理
- デスクトップ・スマートフォンへのレスポンシブ対応

## Architecture

```text
React / TypeScript frontend
        │
        ▼
Amazon API Gateway
        │
        ▼
AWS Lambda ── DynamoDB / S3 / Cognito
        │
        └── Secrets Manager ── AI service
```

フロントエンドはAWS Amplifyでビルド・配信し、バックエンドとインフラはAWS CDKで管理しています。

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- GSAP
- React Router
- KaTeX / React Markdown

### Backend & Infrastructure

- AWS CDK
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon Cognito
- Amazon S3
- AWS Secrets Manager

### Quality

- Vitest
- Testing Library
- ESLint
- TypeScript type checking

## Project Structure

```text
tti-intel-web/
├── frontend/   # React application
├── lambdas/    # Public APIs and site assistant
├── infra/      # AWS CDK stacks
├── docs/       # Design and deployment documents
└── amplify.yml # Frontend build configuration
```

## Local Development

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

### Checks

```bash
cd frontend
npm run lint
npm run test
npm run build

cd ../lambdas
npm ci
npm run typecheck
npm run test

cd ../infra
npm ci
npm run build
npm run test
```

環境変数やAWS認証情報、外部サービスの認証情報はリポジトリに含めず、各実行環境で設定してください。

## Links

- [Live Website](https://tti-intel.com/)
- [Portfolio Case Study](https://github.com/haruhito0314/portfolio/blob/main/works/tti-intelligence.md)
- [TTI Intelligence YouTube](https://www.youtube.com/@ttiintelligence)
