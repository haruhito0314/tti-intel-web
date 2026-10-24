export interface AnnouncementVideo {
    title: string;
    src: string;
    poster: string;
    captions?: string;
    language: string;
    captionLabel?: string;
}

// Shared by the home page, news list, and article detail.
export const projectAnnouncements = [
    {
        id: '8',
        slug: 'fce-partnership',
        title: '株式会社ＦＣＥと学生団体として提携しました',
        excerpt: 'AIの学びを、社会での実践へ。TTI Intelligenceは株式会社ＦＣＥと学生団体として提携し、AI家庭教師の取り組みに向けた連携を進めています。',
        publishedAt: '2026-10-20',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['ＦＣＥ', '企業連携', 'AI'],
        pinned: false,
        coverImageUrl: null,
        content: `
## AIの学びを、社会での実践へ

TTI Intelligence（豊田工業大学AIサークル）は、株式会社ＦＣＥ（東京都新宿区、代表取締役社長：石川淳悦、証券コード：9564）と学生団体として提携しました。

私たちは、AIを使ったWebサイト・アプリの開発などを通して、学びながら手を動かす活動を続けています。今回の提携を通じて、サークルで培った知識や経験を、企業のAI活用を支える実践につなげていきたいと考えています。

## 「AI家庭教師」の取り組みに向けて

ＦＣＥは、AIを活用したいと考える中小企業の経営者に対し、AIに詳しい学生が「AI家庭教師」として伴走する取り組みを進めています。

TTI Intelligenceは、同社の「AIx ONE Learning」を活用した取り組みに向けて、ＦＣＥとの連携を進めています。AIの使い方を一緒に考え、現場の課題に向き合う経験を通じて、学生自身も学びを深めていくことを目指します。

## 今後の活動について

現在、具体的な活動内容や進め方について、ＦＣＥと確認・調整を進めています。活動の開始時期や参加方法など、詳細が決まり次第、このWebサイトでお知らせします。

AIを学ぶだけでなく、実際の場面で役立てる経験へ。これからも、学生の興味や挑戦を大切にしながら活動していきます。

## 株式会社ＦＣＥについて

- **設立**：2017年4月21日
- **代表取締役社長**：石川淳悦
- **東証上場 証券コード**：9564
- **本社**：〒163-0810 東京都新宿区西新宿２-４-１ 新宿NSビル10階
- **事業内容**：DX推進事業、教育研修事業、出版事業、AIソリューション事業
- **URL**：[https://fce-hd.co.jp/](https://fce-hd.co.jp/)
- **採用サイト**：[https://recruit.fce-hd.co.jp/](https://recruit.fce-hd.co.jp/)

## 関連情報

[株式会社ＦＣＥの公式サイトを見る](https://fce-hd.co.jp/)

[TTI Intelligenceの活動について](/about)

[サークルへの参加・お問い合わせ](/contact)
        `,
        relatedPosts: [
            { slug: 'welcome-to-tti-intelligence', title: 'TTI Intelligenceへようこそ！' },
        ],
    },
    {
        id: '7',
        slug: 'tti-introduction-video-released',
        title: 'TTI Intelligenceの紹介動画を公開しました',
        excerpt: '「AIの未来を、一緒に創ろう。」TTI Intelligenceの活動や雰囲気を約40秒にまとめた紹介動画を制作しました。',
        publishedAt: '2026-09-26',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['サークル紹介', '動画', 'メンバー募集'],
        pinned: false,
        coverImageUrl: '/images/tti-circle-intro-v7-poster.jpg',
        videoIntro: '「AIの未来を、一緒に創ろう。」TTI Intelligenceの活動や雰囲気を約40秒にまとめた紹介動画を制作しました。AIを使って学び、創り、挑戦する私たちのサークルを、ぜひご覧ください。',
        videos: [
            {
                title: 'TTI Intelligence 紹介動画（約40秒）',
                src: '/videos/tti-circle-intro-v7.mp4',
                poster: '/images/tti-circle-intro-v7-poster.jpg',
                language: 'ja',
            },
        ] satisfies AnnouncementVideo[],
        content: `
## 一緒に学び、創り、挑戦しよう

TTI Intelligenceは、豊田工業大学の学生を中心としたAIサークルです。開発・数学・ゲーム・解説動画など、興味に合わせて活動しています。

プログラミング未経験の方も歓迎しています。活動や参加に興味のある方は、お気軽にお問い合わせください。

[サークルについて知る](/about)

[参加について問い合わせる](/contact)
        `,
        relatedPosts: [
            { slug: 'welcome-to-tti-intelligence', title: 'TTI Intelligenceへようこそ！' },
        ],
    },
    {
        id: '6',
        slug: 'kikiha-launched',
        title: '会議AIアシスタント「kikiha」を公開しました',
        excerpt: '会議中の文字起こし・翻訳と要点整理から、AI議事録、Slack共有、ChatGPT・Claude連携まで。「kikiha」のある会議を、約1分の紹介動画とともにご紹介します。',
        publishedAt: '2026-09-14',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['kikiha', 'AI', 'Web制作'],
        pinned: false,
        coverImageUrl: '/images/kikiha-poster-v8.jpg',
        videoIntro: '言葉を越えて、会話の、その先へ。文字起こし・翻訳で会話を追い、聞き逃したことをAIに質問し、議事録をチームで活かす。kikihaのある会議を、ナレーション付きの約1分の紹介動画でご覧ください。',
        videos: [
            {
                title: 'kikiha 紹介動画（約1分）',
                src: '/videos/kikiha-film-ja-v10.mp4',
                poster: '/images/kikiha-poster-v8.jpg',
                language: 'ja',
            },
        ] satisfies AnnouncementVideo[],
        content: `
## 言葉を越えて、会話の、その先へ。

会議AIアシスタント「kikiha（キキハ）」を制作し、[kikiha.com](https://kikiha.com/)を公開しました。

いつもの会議に、文字起こしと翻訳を。会議中の「聞き取れなかった」、途中参加の「ここまでに何が決まったのか知りたい」、会議後の「次にやることを整理したい」。そんな場面で、会話の理解から振り返り、次のアクションまでをサポートするサービスです。

海外チームとの会議や商談、研修・講義、語学学習など、仕事にも学びにも。会話の内容をその場でつかみ、あとからチームで活かせることを目指しています。

## 会議のはじまりから、終わったあとまで

- **リアルタイム文字起こし**：話した言葉をその場で文字にし、聞き逃しを減らして会話への集中を支えます。
- **リアルタイム翻訳**：kikihaのブラウザ画面で原文と訳文を確認し、読みたい言語で会話を追えます。
- **会議中の要点整理**：保存する会議では、必要なときにここまでの要点を生成・更新。決まったことや確認待ちを整理でき、途中参加でも話の流れをつかめます。
- **AI要約・議事録**：会議後に要点・決定事項・TODOをまとめ、振り返りと次のアクションにつなげます。
- **Slack連携・共有**：議事録をSlackや有効期限付きの共有リンクで届け、参加できなかったメンバーとも共有できます。
- **ChatGPT・Claude連携**：いつものAIから会議の内容を質問し、議事録・決定事項・TODOを確認できます。

## いつもの会議ツールでも、対面でも

Zoom・Google Meet・Microsoft Teamsに対応しています。アカウントを登録し、会議URLを入力してkikihaのBotを招待すると、ブラウザ画面で文字起こしと翻訳を確認できます。記録の前に、参加者への説明と必要な同意、主催者の許可を得てご利用ください。

対面の会話では、スマホやPCのマイクから文字起こしを始めることもできます。会議URLやBotは不要で、マイク機能が有効なワークスペースで利用できます。

## 約1分でわかる、kikihaのある会議

Webサイトと紹介動画も更新しました。ナレーション付きの動画では、文字起こし・翻訳、会議中のAIへの質問、AI議事録、Slackでの共有、ChatGPT・Claude連携を、利用画面のイメージとともに紹介しています。画面内の会話はデモです。

## 無料でkikihaを試す

公式サイトからアカウントを登録してお試しいただけます。初回登録では、合計1時間の無料デモをご利用いただけます。登録完了から7日間有効で、カード登録は不要です。有料プランへの自動移行もありません。

ご自身の会議での使い方を知りたい方や、チームへの導入をご検討中の方は、お問い合わせページからお気軽にご相談ください。

[kikihaを無料で試す](https://app.kikiha.com/signup)

[kikihaの公式サイトを見る](https://kikiha.com/)

[導入・デモを相談する](https://kikiha.com/contact)
        `,
        relatedPosts: [],
    },
    {
        id: '4',
        slug: 'crea-website-delivered',
        title: 'CREAのWebサイトを制作・納品しました',
        excerpt: '株式会社CREAのWebサイトを制作・納品しました。事業内容や製品・サービスを伝えるサイトづくりに取り組みました。',
        publishedAt: '2026-08-23',
        author: 'サークル運営',
        category: '活動報告',
        tags: ['Web制作', 'CREA'],
        pinned: false,
        coverImageUrl: null,
        content: `
## CREAのWebサイトを制作

株式会社CREAのWebサイトを制作・納品しました。

CREAは、AI導入や業務自動化、製造業のDX支援などに取り組む企業です。事業内容や製品・サービスが伝わり、必要な情報を見つけやすいサイトを目指して制作しました。

![株式会社CREAのWebサイトのトップページ](/images/crea-website.webp)

*CREAのWebサイト。事業内容や製品・サービスを紹介しています。*

## 制作で取り組んだこと

- 事業内容や製品・サービス、企業情報を整理したページ構成
- 見出しや写真、余白を活かした読みやすいデザイン
- スマートフォンでも情報を確認しやすいレイアウト
- サービスの紹介からお問い合わせへつながる導線

見た目を整えることに加えて、訪れた方に「どのような会社で、何を相談できるのか」が伝わることを大切にしました。

## 制作したサイト

事業内容や製品・サービスなど、実際のページはCREAのWebサイトでご覧いただけます。

[CREAのWebサイトを見る](https://tech-crea.com/)
        `,
        relatedPosts: [],
    },
];
