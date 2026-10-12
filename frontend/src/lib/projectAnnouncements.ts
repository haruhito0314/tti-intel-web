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
        excerpt: '言葉を越えて、会話の、その先へ。Zoom・Google Meet・Teamsの文字起こし・翻訳から、AI議事録やSlack共有までを支える「kikiha」を、最新の紹介動画とともにご紹介します。',
        publishedAt: '2026-09-14',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['kikiha', 'AI', 'Web制作'],
        pinned: false,
        coverImageUrl: '/images/kikiha-poster-v7.jpg',
        videoIntro: 'いつもの会議に、文字起こしと翻訳を。新しいUIでの会話の理解から、議事録、次のアクション、Slackでの共有までを、約1分の紹介動画にまとめています。',
        videos: [
            {
                title: 'kikiha 紹介動画（約1分）',
                src: '/videos/kikiha-film-ja-v9.mp4',
                poster: '/images/kikiha-poster-v7.jpg',
                language: 'ja',
            },
        ] satisfies AnnouncementVideo[],
        content: `
## 言葉を越えて、会話の、その先へ。

会議AIアシスタント「kikiha（キキハ）」を制作し、[kikiha.com](https://kikiha.com/)を公開しました。

いつもの会議に、文字起こしと翻訳を。会議中の「聞き取れなかった」、会議後の「何が決まったか整理したい」。そんな場面で、会話の理解から振り返り、次のアクション、チームへの共有までをサポートするサービスです。

WebサイトとUI、紹介動画を更新しました。新しい紹介動画では、kikihaのある会議の流れを約1分でご覧いただけます。

## kikihaでできること

- **リアルタイム文字起こし・翻訳**：話している内容を文字で確認し、違う言語の会話も読みたい言語で追えます。
- **話者の識別**：誰が何を話したのか、発言を話者ごとに整理します。
- **AI要約・議事録**：会議後に決定事項や次のアクションを整理し、振り返りに役立てられます。
- **共有・Slack連携**：議事録をSlackや共有リンクで届け、参加できなかったメンバーも振り返れます。
- **用語集**：専門用語や固有名詞など、チームで使う言葉の翻訳をサポートします。

## いつもの会議ツールで

Zoom・Google Meet・Teamsに対応しています。会議URLを入力し、Botの参加を許可すると、文字起こしと翻訳で会話を追えます。会議後は、議事録で決定事項と次のアクションを確認できます。

## 紹介動画について

動画では、多言語での文字起こし・翻訳、AI議事録、Slack連携までを、新しいUIの利用イメージとともに紹介しています。画面内の会話はデモです。

## kikihaを見てみる

現在、招待制で提供しています。機能や使い方は公式サイトでご覧いただけます。導入やデモをご希望の方は、kikihaのお問い合わせページからご相談ください。

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
