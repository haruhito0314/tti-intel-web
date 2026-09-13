export interface AnnouncementVideo {
    title: string;
    src: string;
    poster: string;
    captions: string;
    language: string;
    captionLabel: string;
}

// Shared by the home page, news list, and article detail.
export const projectAnnouncements = [
    {
        id: '6',
        slug: 'kikiha-launched',
        title: '会議AIアシスタント「kikiha」を公開しました',
        excerpt: '会話を、チームの力に。リアルタイムの文字起こし・翻訳から、AIによる要約や議事録の共有までをサポートする「kikiha」を制作しました。',
        publishedAt: '2026-09-14',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['kikiha', 'AI', 'Web制作'],
        pinned: false,
        coverImageUrl: null,
        videoIntro: 'kikihaの使い方や会話のイメージを、紹介動画でご覧いただけます。',
        videos: [
            {
                title: 'kikiha 紹介動画',
                src: '/videos/kikiha-introduction-ja.mp4',
                poster: '/images/kikiha-poster.jpg',
                captions: '/videos/kikiha-ja.vtt',
                language: 'ja',
                captionLabel: '日本語',
            },
        ] satisfies AnnouncementVideo[],
        content: `
## 会話を、チームの力に。

会議AIアシスタント「kikiha（キキハ）」を制作し、[kikiha.com](https://kikiha.com/)を公開しました。

会議中の「聞き取れなかった」「途中から参加して流れがわからない」、会議後の「何が決まったか整理したい」。そんな場面で、会話の理解から振り返り、チームへの共有までをサポートするサービスです。

## kikihaでできること

- **リアルタイム文字起こし・翻訳**：話している内容を文字で確認し、違う言語の会話も読みたい言語で追えます。
- **会議中のAIサポート**：ここまでの要点を確認したり、会話の内容について質問したりできます。
- **AI要約・議事録**：会議後に決定事項や次のアクションを整理し、振り返りに役立てられます。
- **共有・Slack連携**：議事録をチームへ共有し、Slackから会議の内容を確認できます。

## 紹介動画について

動画では、多言語での会話から、会議中の要点確認、議事録の作成、Slackでのやり取りまで、利用の流れを紹介しています。画面内の会話はデモです。

## kikihaを見てみる

機能や使い方など、詳しくは公式サイトをご覧ください。

[kikihaの公式サイトを見る](https://kikiha.com/)
        `,
        relatedPosts: [],
    },
    {
        id: '5',
        videoIntro: '制作・納品した紹介動画を、日本語版と英語版でご覧いただけます。',
        slug: 'knowledge-ai-video-delivered',
        title: 'ナレッジAI紹介動画を制作・納品しました',
        excerpt: 'CREAのナレッジAIを紹介する動画を制作・納品しました。日本語版と英語版をご覧いただけます。',
        publishedAt: '2026-09-06',
        author: 'サークル運営',
        category: '活動報告',
        tags: ['動画制作', 'CREA'],
        pinned: false,
        coverImageUrl: null,
        videos: [
            {
                title: '日本語版',
                src: '/videos/knowledge-ai-introduction-ja.mp4',
                poster: '/images/knowledge-ai-video-ja.jpg',
                captions: '/videos/knowledge-ai-ja.vtt',
                language: 'ja',
                captionLabel: '日本語',
            },
            {
                title: 'English version',
                src: '/videos/knowledge-ai-introduction-en.mp4',
                poster: '/images/knowledge-ai-video-en.jpg',
                captions: '/videos/knowledge-ai-en.vtt',
                language: 'en',
                captionLabel: 'English',
            },
        ] satisfies AnnouncementVideo[],
        content: `
## ナレッジAIの紹介動画を制作

株式会社CREAの「ナレッジAI」を紹介する動画を制作・納品しました。

現場で培われた経験や社内の資料を、次の人の判断に役立てる。その利用イメージを伝えるため、日本語版と英語版の2本を制作しました。

## 動画で紹介していること

- 社内のマニュアルや保全記録を、会話で検索する
- 回答の根拠となる資料や過去の事例を確認する
- 現場での経験を会話から整理し、原因・対処・再発防止の記録につなげる

映像は、利用の流れを紹介するデモです。英語版では、画面内の文章やナレーションも英語に合わせて構成しています。

## 伝わりやすさを大切に

画面の見せ方、言葉の出るタイミング、ナレーションと会話のテンポを調整し、初めて見る方にも活用のイメージが伝わる構成を目指しました。

        `,
        relatedPosts: [
            { slug: 'crea-website-delivered', title: 'CREAのWebサイトを制作・納品しました' },
        ],
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
        relatedPosts: [
            { slug: 'knowledge-ai-video-delivered', title: 'ナレッジAI紹介動画を制作・納品しました' },
        ],
    },
];
