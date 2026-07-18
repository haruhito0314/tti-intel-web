import type { PageId } from './types.js';

export type ExternalLinkId = 'discord' | 'toyota-ti' | 'youtube';

export interface AssistantFactDefinition {
  description: string;
  answer: string;
  compactAnswer: string;
  pageIds: readonly PageId[];
  externalLinks: readonly ExternalLinkId[];
}

/**
 * Canonical, reviewed facts for the public assistant.
 *
 * Answers are intentionally complete enough to return without model-written
 * prose. The model may help select a fact in a future low-confidence path, but
 * it must never replace these factual statements or choose arbitrary links.
 */
export const ASSISTANT_FACTS = {
  'circle.identity': {
    description: 'TTI Intelligenceというサークル・学生コミュニティの説明',
    answer: 'TTI Intelligenceは、豊田工業大学の学生を中心にAI・開発・数学・ゲーム・解説動画に取り組む学生コミュニティです。',
    compactAnswer: 'TTI Intelligenceは、豊田工業大学の学生を中心としたAI系の学生コミュニティです。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'university.identity': {
    description: '豊田工業大学の正式名称・英語名の説明',
    answer: '豊田工業大学の英語名はToyota Technological Instituteで、略称はTTIです。',
    compactAnswer: '豊田工業大学の英語名はToyota Technological Instituteです。',
    pageIds: [],
    externalLinks: ['toyota-ti'],
  },
  'university.abbreviation': {
    description: 'TTIが豊田工業大学の英語名の略であること',
    answer: 'TTIはToyota Technological Instituteの略で、豊田工業大学のことです。',
    compactAnswer: 'TTIはToyota Technological Institute（豊田工業大学）の略です。',
    pageIds: [],
    externalLinks: ['toyota-ti'],
  },
  'identity.tti-difference': {
    description: 'TTIとTTI Intelligenceの違い・関係',
    answer: 'TTIはToyota Technological Institute、つまり豊田工業大学の略です。TTI Intelligenceは、その学生を中心に活動する学生コミュニティの名称です。',
    compactAnswer: 'TTIは豊田工業大学の略、TTI Intelligenceは学生コミュニティの名称です。',
    pageIds: ['about'],
    externalLinks: ['toyota-ti'],
  },
  'university.location': {
    description: '豊田工業大学の所在地・住所・キャンパス',
    answer: '豊田工業大学は、愛知県名古屋市天白区久方二丁目12番地1にあります。',
    compactAnswer: '豊田工業大学は名古屋市天白区にあります。',
    pageIds: [],
    externalLinks: ['toyota-ti'],
  },
  'site.page-inventory': {
    description: '公開サイトにある主なページの一覧',
    answer: '主なページは、サークルについて、お知らせ、アプリ、開発について、掲示板、今週の数学、ゲームコミュニティ、お問い合わせです。',
    compactAnswer: '主なページは、サークルについて、お知らせ、アプリ、開発について、掲示板、今週の数学、ゲームコミュニティ、お問い合わせです。',
    pageIds: [],
    externalLinks: [],
  },
  'site.description': {
    description: 'この公開サイト自体の目的・掲載内容',
    answer: 'このサイトは、TTI Intelligenceの活動紹介、お知らせ、制作したアプリ、掲示板、数学などをまとめた公開サイトです。',
    compactAnswer: 'TTI Intelligenceの活動や作品、公開コンテンツをまとめたサイトです。',
    pageIds: ['home'],
    externalLinks: [],
  },
  'assistant.capabilities': {
    description: 'AI Assistantで質問・案内できること',
    answer: 'このAI Assistantでは、活動内容、参加方法、費用、活動日、大学情報、サイト内のページや公開コンテンツの場所を案内できます。',
    compactAnswer: '活動内容、参加方法、大学情報、サイト内ページの場所を案内できます。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'assistant.usage': {
    description: 'AI Assistantの使い方・質問の送り方',
    answer: '知りたいことを短く入力して送信してください。該当する活動情報やページへのリンクを案内します。',
    compactAnswer: '知りたいことを短く入力して送信してください。',
    pageIds: [],
    externalLinks: [],
  },
  'activity.summary': {
    description: 'サークルの主な活動内容',
    answer: '主な活動は、AIを使った開発、数学、ゲーム交流、解説動画の制作などです。',
    compactAnswer: 'AI開発、数学、ゲーム交流、解説動画制作などに取り組んでいます。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'activity.schedule': {
    description: '活動日・曜日・頻度・毎週いつ集まるか',
    answer: '主に土日に活動しています。参加は自由で、都合の良いときに参加できます。',
    compactAnswer: '活動は主に土日で、都合の良いときに参加できます。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'activity.location': {
    description: 'サークルの活動場所・集合場所',
    answer: '豊田工業大学を中心に活動しています。詳しい集合場所や初回の相談はお問い合わせフォームから確認してください。',
    compactAnswer: '豊田工業大学を中心に活動し、詳しい集合場所はお問い合わせで案内しています。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'activity.ai-tools': {
    description: '活動で利用しているAIコーディングツール',
    answer: 'OpenAI Codex、Google Antigravity、Claude CodeなどのAIコーディングツールやMCPを活用しています。',
    compactAnswer: 'Codex、Antigravity、Claude Code、MCPなどを活用しています。',
    pageIds: ['about', 'development'],
    externalLinks: [],
  },
  'activity.certification-study': {
    description: '応用情報技術者試験など資格試験の勉強',
    answer: '応用情報技術者試験には、メンバー有志で挑戦しています。',
    compactAnswer: '応用情報技術者試験にはメンバー有志で挑戦しています。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'membership.cost': {
    description: 'サークルの参加費・会費',
    answer: 'サークルの参加費は無料です。',
    compactAnswer: '参加費は無料です。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'membership.tool-cost': {
    description: '個人で利用するAIツールやサブスクリプションの費用',
    answer: '個人で利用するAIツールやサブスクリプションの費用は、各自の負担です。',
    compactAnswer: '個人で使うAIツールの費用は各自負担です。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'membership.eligibility': {
    description: '参加できる学年・学部・他大学の学生',
    answer: '学部や学年に制限はなく、他大学の学生も参加できます。',
    compactAnswer: '学年・学部を問わず、他大学の学生も参加できます。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'membership.beginner': {
    description: '初心者・未経験者が参加できるか',
    answer: '初心者・未経験の方も参加できます。基礎からサポートしています。',
    compactAnswer: '初心者・未経験でも参加できます。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'membership.visit': {
    description: '見学・体験だけでも参加できるか',
    answer: '見学や体験だけでも大丈夫です。希望する場合はお問い合わせフォームから相談してください。',
    compactAnswer: '見学・体験も可能で、相談はお問い合わせから受け付けています。',
    pageIds: ['about', 'contact'],
    externalLinks: [],
  },
  'membership.career-support': {
    description: 'アルバイト・就職活動向けサポートの公開情報',
    answer: 'アルバイトや就職活動について、公開しているサポート案内はありません。個別の相談はお問い合わせフォームをご利用ください。',
    compactAnswer: '就職活動などの公開サポート案内はなく、個別相談はお問い合わせで受け付けています。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'contact.form': {
    description: '参加・相談・提携・取材などの問い合わせ方法',
    answer: '参加や活動、提携、取材などの相談は、お問い合わせフォームから送信できます。',
    compactAnswer: '参加や相談はお問い合わせフォームから送信できます。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'contact.phone': {
    description: '運営者・サークルの電話番号が公開されているか',
    answer: '公開している電話番号の案内はありません。連絡はお問い合わせフォームをご利用ください。',
    compactAnswer: '電話番号は公開していないため、お問い合わせフォームをご利用ください。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'contact.discord': {
    description: 'Discordの有無・参加リンク',
    answer: 'Discordには下のリンクから参加できます。',
    compactAnswer: 'Discordには下のリンクから参加できます。',
    pageIds: ['contact'],
    externalLinks: ['discord'],
  },
  'contact.members-private': {
    description: 'メンバー人数・名簿が公開されているか',
    answer: 'メンバー名簿や正確な人数は公開していません。参加や相談はお問い合わせフォームをご利用ください。',
    compactAnswer: 'メンバー名簿と正確な人数は公開していません。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'contact.bug': {
    description: '表示崩れ・不具合・バグの報告方法',
    answer: '表示の不具合は、お問い合わせフォームから状況を詳しく教えてください。',
    compactAnswer: '表示の不具合はお問い合わせフォームから報告できます。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'contact.instagram': {
    description: 'Instagramが公式アカウントか',
    answer: 'フッターのInstagramリンクはサークル公式ではなく、関係者個人のアカウントです。公式の連絡はお問い合わせフォームをご利用ください。',
    compactAnswer: 'Instagramはサークル公式ではなく、公式連絡はお問い合わせをご利用ください。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'contact.other-social': {
    description: 'LINEやXなど案内していないSNS',
    answer: '公式のLINEやXは案内していません。連絡はお問い合わせフォームをご利用ください。',
    compactAnswer: '公式のLINEやXは案内していません。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'video.youtube': {
    description: 'サークルの解説動画・YouTubeチャンネルを見る場所',
    answer: '解説動画はYouTubeで公開しています。下のYouTubeリンクからご覧ください。',
    compactAnswer: '解説動画は下のYouTubeリンクから見られます。',
    pageIds: ['about'],
    externalLinks: ['youtube'],
  },
  'video.request': {
    description: '動画制作の依頼・相談',
    answer: '動画制作の相談は、お問い合わせフォームから送信してください。',
    compactAnswer: '動画制作の相談はお問い合わせから受け付けています。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'math.answer': {
    description: '数学問題の答え・解説・ヒントを見る場所',
    answer: '答え・解説・公開されているヒントは、今週の数学の各問題ページで確認できます。',
    compactAnswer: '答えや解説は今週の数学の各問題ページで確認できます。',
    pageIds: ['weekly-math'],
    externalLinks: [],
  },
  'page.home': {
    description: 'ホーム・トップページへの案内',
    answer: 'トップページはホームから開けます。',
    compactAnswer: 'ホームからトップページを開けます。',
    pageIds: ['home'],
    externalLinks: [],
  },
  'page.about': {
    description: 'サークルについてページへの案内',
    answer: '活動内容や参加対象は、サークルについてページで確認できます。',
    compactAnswer: '活動詳細はサークルについてページで確認できます。',
    pageIds: ['about'],
    externalLinks: [],
  },
  'page.news': {
    description: 'お知らせ・ニュースページへの案内',
    answer: 'お知らせページでは、活動報告、イベント情報、技術記事を確認できます。',
    compactAnswer: '活動報告やイベント情報はお知らせページで確認できます。',
    pageIds: ['news'],
    externalLinks: [],
  },
  'page.apps': {
    description: '制作したアプリ・作品一覧への案内',
    answer: 'アプリページでは、卓球の組み合わせ表、カラーソート、CLI Practice、TOEIC Practiceなどを紹介しています。',
    compactAnswer: '制作したアプリや作品はアプリページで確認できます。',
    pageIds: ['apps'],
    externalLinks: [],
  },
  'page.development': {
    description: '開発についてページへの案内',
    answer: 'AIコーディングツールやMCPを活用したWeb・アプリ開発は、開発についてページで紹介しています。',
    compactAnswer: 'AIツールやMCPを使った開発は、開発についてページで確認できます。',
    pageIds: ['development'],
    externalLinks: [],
  },
  'page.board': {
    description: '掲示板への案内・匿名投稿',
    answer: '質問や相談は掲示板に投稿できます。表示名を空欄にすると匿名で投稿できます。',
    compactAnswer: '質問や相談は掲示板に匿名でも投稿できます。',
    pageIds: ['board'],
    externalLinks: [],
  },
  'page.weekly-math': {
    description: '今週の数学・数学問題一覧への案内',
    answer: '数学の問題と公開中の解説は、今週の数学から確認できます。',
    compactAnswer: '数学の問題は今週の数学から確認できます。',
    pageIds: ['weekly-math'],
    externalLinks: [],
  },
  'page.game-community': {
    description: 'ゲームコミュニティへの案内',
    answer: 'VALORANT、APEX、Minecraftなどの活動は、ゲームコミュニティで紹介しています。',
    compactAnswer: 'ゲーム活動はゲームコミュニティで確認できます。',
    pageIds: ['game-community'],
    externalLinks: [],
  },
  'game.beginner': {
    description: 'ゲーム初心者でもゲーム活動へ参加できるか',
    answer: 'ゲーム初心者も参加できます。VALORANT、APEX、Minecraftなどを気軽に楽しんでいます。',
    compactAnswer: 'ゲーム初心者もゲーム活動へ参加できます。',
    pageIds: ['game-community'],
    externalLinks: [],
  },
  'page.contact': {
    description: 'お問い合わせページへの案内',
    answer: 'お問い合わせフォームは、お問い合わせページから利用できます。',
    compactAnswer: 'お問い合わせページからフォームを利用できます。',
    pageIds: ['contact'],
    externalLinks: [],
  },
  'page.table-tennis': {
    description: '卓球の対戦表アプリ',
    answer: '卓球の対戦組み合わせは、Table Tennis Match Makerで作成できます。',
    compactAnswer: '卓球の対戦表はTable Tennis Match Makerで作れます。',
    pageIds: ['table-tennis'],
    externalLinks: [],
  },
  'page.color-sort': {
    description: 'カラーソート・ボトルの色そろえパズル',
    answer: 'Color Sort Puzzleは、ボトル内の色をそろえるブラウザゲームです。',
    compactAnswer: '色そろえパズルはColor Sort Puzzleで遊べます。',
    pageIds: ['color-sort'],
    externalLinks: [],
  },
  'page.cli-practice': {
    description: 'CLI・Git・npm・ターミナル練習アプリ',
    answer: 'CLI Practiceでは、ブラウザ上でGit、npm、デプロイなどを練習できます。',
    compactAnswer: 'CLI PracticeでGitやnpmを練習できます。',
    pageIds: ['cli-practice'],
    externalLinks: [],
  },
  'prompt.protected': {
    description: '内部プロンプト・システム指示の開示要求',
    answer: '内部の指示文やプロンプトは公開していません。サイトの使い方や活動内容なら案内できます。',
    compactAnswer: '内部の指示文やプロンプトは公開していません。',
    pageIds: [],
    externalLinks: [],
  },
  'small-talk.greeting': {
    description: '挨拶',
    answer: 'こんにちは！活動内容や参加方法、ページの場所などを気軽に聞いてください。',
    compactAnswer: 'こんにちは！気軽に質問してください。',
    pageIds: [],
    externalLinks: [],
  },
  'small-talk.thanks': {
    description: 'お礼・相づち',
    answer: 'どういたしまして！ほかにも知りたいことがあれば聞いてください。',
    compactAnswer: 'どういたしまして！',
    pageIds: [],
    externalLinks: [],
  },
} as const satisfies Record<string, AssistantFactDefinition>;

export type AssistantFactId = keyof typeof ASSISTANT_FACTS;

export const ASSISTANT_FACT_IDS = Object.freeze(
  Object.keys(ASSISTANT_FACTS) as AssistantFactId[],
);
