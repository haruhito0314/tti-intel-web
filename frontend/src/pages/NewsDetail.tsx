import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { PageSeo } from '@/components/PageSeo';
import { ArrowLeft, Calendar, User, Tag, Share2, ExternalLink } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import type { ExtraProps } from 'react-markdown';

// Dummy data for MVP - will be replaced with API call
const postsData: Record<string, {
    title: string;
    content: string;
    publishedAt: string;
    author: string;
    category: string;
    tags: string[];
    relatedPosts: { slug: string; title: string }[];
}> = {
    'ai-assistant-launched': {
        title: 'サイト内AI Assistantを公開しました',
        content: `
## サイト案内をチャットで聞けるようになりました

TTI Intelligenceのサイトに、AI Assistantを追加しました。

活動内容や参加の仕方、各ページの場所など、サイト内の案内をチャット形式で質問できます。はじめて訪れた方でも、目的の情報にたどり着きやすくなることを目指しています。

## 使い方

画面右下のボタンからAI Assistantを開けます。気になることを短く入力して送信してください。

たとえば、次のような質問に答えられます。

- どんな活動をしているのか知りたい
- 参加方法や連絡先を知りたい
- 今週の数学やお知らせはどこで見られるか知りたい
- アプリや掲示板など、目的のページを探したい

回答には、関連ページへのリンクも表示されます。そのままタップして移動できます。

## 案内できること・できないこと

AI Assistantは、このサイトの公開情報をもとに案内します。

サークルの活動やページ構成についてはお手伝いできます。一方で、サイト外の一般的な話題や、個別の記事・投稿の細かい本文の要約などにはお答えできない場合があります。そのときは[お問い合わせ](/contact)からご連絡ください。

## ぜひ試してみてください

右下のボタンから、気軽に話しかけてみてください。サークルの雰囲気や活動内容を知るきっかけになればうれしいです。

参加や活動について詳しく聞きたい方は、[お問い合わせページ](/contact)からもご連絡いただけます。
    `,
        publishedAt: '2026-07-17',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['AI Assistant', 'お知らせ'],
        relatedPosts: [
            { slug: 'welcome-to-tti-intelligence', title: 'TTI Intelligenceへようこそ！' },
        ],
    },
    'web-development-tutorial-released': {
        title: 'Web開発をゼロから学べるサイトを公開しました',
        content: `
## 未経験からWebアプリの公開まで

プログラミングを初めて学ぶ方が、Web開発を基礎から順番に身につけられる学習サイトを公開しました。

教材を読むために特別なアプリを準備する必要はありません。ブラウザで説明を読み、章を進めながら必要な開発環境を一つずつ導入します。

![27章の進捗と次に学ぶ章を確認できる学習ダッシュボード](/images/web-tutorial-dashboard.webp)

*学習状況と次に進む章を一目で確認できるダッシュボード。*

## 27章で段階的に学べます

教材は第0章から第26章までの全27章です。

- HTML・CSSでWebページを作る基礎
- JavaScript・TypeScriptの文法と非同期処理
- Reactを使った画面、フォーム、ページ遷移
- API通信とデータの保存
- AWS CDK・Lambda・DynamoDB・Cognito
- テスト、セキュリティ、公開、安全な削除

単にコードをコピーするだけでなく、「何をしているのか」「なぜ必要なのか」を確認しながら進められる構成にしています。

![第4章HTML教材の本文と目次を表示した学習画面](/images/web-tutorial-html-lesson.webp)

*章の目標、解説、手順、目次を確認しながら学習できます。*

## 自分のペースで繰り返し学習

各章には説明、確認項目、練習問題、解答があります。学習状況はブラウザに保存され、途中から再開できます。リセット機能を使えば、最初から何度でもやり直せます。

最後には、空のフォルダから自分の力でWebアプリを完成させる卒業課題を用意しています。

## 対応環境

現在、開発環境の手順はmacOS向けに書かれています。Windows向けの対応も順次進める予定です。

Web開発に興味はあるものの、何から始めればよいか分からない方におすすめです。

全27章・ブラウザですぐ読めます。

[無料でWeb開発を学び始める](https://build-tutorial.vercel.app)
    `,
        publishedAt: '2026-07-13',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['Web開発', '学習教材'],
        relatedPosts: [],
    },
    'welcome-to-tti-intelligence': {
        title: 'TTI Intelligenceへようこそ！',
        content: `
## はじめに

TTI Intelligenceへようこそ。私たちは豊田工業大学の学生を中心としたAIサークルです。

AI技術を軸に、開発・数学・ゲーム・解説動画へ幅広く挑戦しています。

## 活動内容

1. **開発** — AIを使ったvibe codingで、Webサイトやアプリケーションを開発
2. **数学** — 自作問題を作ることをメインに、数学的な発想力を高める活動
3. **ゲーム** — VALORANT、Apexを中心に、たまにフォートナイト。人数が集まればMinecraft Realms（Java版）も実施予定
4. **解説動画** — 点数だけを目的にせず、科目の本質をついた真の理解を促す勉強解説動画を制作

## 使用しているAIツール

- OpenAI Codex
- Google Antigravity
- Claude Code

実際の開発を通して、これらのツールの使い方を学んでいます。

## 活動について

- **活動日**: 主に土日
- **参加**: 自由参加（自分のペースで無理なく続けられます）
- **費用**: 無料（AIツールのサブスクリプション等は各自負担）

## 参加方法

サークルへの参加に興味がある方は、お気軽に[お問い合わせページ](/contact)からご連絡ください。プログラミング未経験の方も大歓迎です。わからないところは1から全部サポートします。

皆さんの参加をお待ちしています。
    `,
        publishedAt: '2026-04-01',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['サークル紹介'],
        relatedPosts: [],
    },
};

function isCaptionParagraph(node: ExtraProps['node']): boolean {
    if (!node || node.type !== 'element' || node.tagName !== 'p') return false;
    if (node.children.length !== 1) return false;
    const only = node.children[0];
    return only.type === 'element' && only.tagName === 'em';
}

export function NewsDetail() {
    const { slug } = useParams<{ slug: string }>();
    const post = slug ? postsData[slug] : null;

    if (!post) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                    記事が見つかりません
                </h1>
                <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-8">
                    お探しの記事は存在しないか、削除された可能性があります。
                </p>
                <Link to="/news">
                    <Button>
                        <ArrowLeft className="w-4 h-4" />
                        記事一覧に戻る
                    </Button>
                </Link>
            </div>
        );
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title,
                    url: window.location.href,
                });
            } catch {
                // User cancelled share sheet
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(window.location.href);
            alert('URLをコピーしました');
        } catch {
            alert('URLのコピーに失敗しました');
        }
    };

    return (
        <article className="animate-fade-in">
            <PageSeo
                title={`${post.title} | TTI Intelligence`}
                description={post.content.replace(/\s+/g, ' ').trim().slice(0, 120)}
            />
            <header className="about-band-hero relative overflow-hidden border-b border-[#D2D2D7] dark:border-[rgba(255,255,255,0.16)]">
                <div className="relative max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                    <Link
                        to="/news"
                        className="inline-flex items-center gap-2 text-[14px] text-[#0071E3] dark:text-[#5CABFF] hover:underline underline-offset-4 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        記事一覧
                    </Link>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="primary">{post.category}</Badge>
                        {post.tags.map((tag) => (
                            <Badge key={tag} variant="default">
                                #{tag}
                            </Badge>
                        ))}
                    </div>

                    <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-5 text-balance">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4" aria-hidden="true" />
                            {post.author}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" aria-hidden="true" />
                            {post.publishedAt}
                        </div>
                        <button
                            type="button"
                            onClick={handleShare}
                            className="flex items-center gap-2 hover:text-[#0071E3] dark:hover:text-[#5CABFF] transition-colors"
                        >
                            <Share2 className="w-4 h-4" aria-hidden="true" />
                            共有
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                <div className="news-article-body">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            h2: ({ children }) => (
                                <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.03em] text-[#1D1D1F] dark:text-[#F5F5F7] mt-12 mb-4 first:mt-0 leading-[1.25]">
                                    {children}
                                </h2>
                            ),
                            h3: ({ children }) => (
                                <h3 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] mt-8 mb-3 leading-[1.3]">
                                    {children}
                                </h3>
                            ),
                            p: ({ children, node }) => {
                                if (isCaptionParagraph(node)) {
                                    return (
                                        <p className="mt-3 mb-8 text-[13px] leading-relaxed text-center text-[#86868B] dark:text-[rgba(235,235,245,0.45)]">
                                            {children}
                                        </p>
                                    );
                                }
                                return (
                                    <p className="text-[17px] sm:text-[18px] leading-[1.9] text-[#1D1D1F] dark:text-[rgba(245,245,247,0.92)] mb-5 text-pretty">
                                        {children}
                                    </p>
                                );
                            },
                            ul: ({ children }) => (
                                <ul className="mb-6 space-y-2.5 pl-5 list-disc marker:text-[#86868B] dark:marker:text-[rgba(235,235,245,0.35)]">
                                    {children}
                                </ul>
                            ),
                            ol: ({ children }) => (
                                <ol className="mb-6 space-y-3 pl-5 list-decimal marker:font-medium marker:text-[#86868B] dark:marker:text-[rgba(235,235,245,0.45)]">
                                    {children}
                                </ol>
                            ),
                            li: ({ children }) => (
                                <li className="text-[17px] sm:text-[18px] leading-[1.8] text-[#1D1D1F] dark:text-[rgba(245,245,247,0.92)] pl-1">
                                    {children}
                                </li>
                            ),
                            blockquote: ({ children }) => (
                                <blockquote className="my-6 border-l-[3px] border-[#0071E3] pl-5 text-[17px] leading-[1.8] text-[#515154] dark:text-[rgba(235,235,245,0.7)]">
                                    {children}
                                </blockquote>
                            ),
                            img: ({ src, alt }) => (
                                <img
                                    src={src}
                                    alt={alt ?? ''}
                                    loading="lazy"
                                    width={1280}
                                    height={720}
                                    className="mt-8 mb-0 block h-auto w-full rounded-2xl border border-black/10 shadow-sm dark:border-white/10"
                                />
                            ),
                            em: ({ children }) => (
                                <em className="not-italic">{children}</em>
                            ),
                            strong: ({ children }) => (
                                <strong className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                                    {children}
                                </strong>
                            ),
                            code: ({ className, children }) => {
                                const isInline = !className;
                                if (isInline) {
                                    return (
                                        <code className="px-1.5 py-0.5 rounded-md bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#0066CC] dark:text-[#2997FF] text-[0.9em]">
                                            {children}
                                        </code>
                                    );
                                }
                                return (
                                    <code className="block bg-[#1C1C1E] text-[#F5F5F7] p-4 rounded-xl overflow-x-auto my-5 text-[14px] leading-relaxed">
                                        {children}
                                    </code>
                                );
                            },
                            a: ({ href, children }) => {
                                const target = href ?? '';
                                const isExternal =
                                    /^(https?:|mailto:|tel:)/.test(target) || target.startsWith('//');
                                const isTutorialCta = target === 'https://build-tutorial.vercel.app';

                                if (isExternal) {
                                    return (
                                        <a
                                            href={target}
                                            className={isTutorialCta
                                                ? 'mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0066CC] px-6 py-3.5 font-semibold text-white no-underline shadow-sm transition-colors hover:bg-[#004C99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 dark:text-white sm:w-auto'
                                                : 'text-[#0071E3] dark:text-[#5CABFF] underline-offset-4 hover:underline'}
                                            target={target.startsWith('http') ? '_blank' : undefined}
                                            rel={target.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        >
                                            {children}
                                            {isTutorialCta && (
                                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                            )}
                                        </a>
                                    );
                                }

                                return (
                                    <Link
                                        to={target || '#'}
                                        className="text-[#0071E3] dark:text-[#5CABFF] underline-offset-4 hover:underline"
                                    >
                                        {children}
                                    </Link>
                                );
                            },
                        }}
                    >
                        {post.content}
                    </ReactMarkdown>
                </div>

                {post.relatedPosts.length > 0 && (
                    <section className="mt-14 pt-8 border-t border-black/10 dark:border-white/12">
                        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-5 flex items-center gap-2">
                            <Tag className="w-4 h-4" aria-hidden="true" />
                            関連記事
                        </h2>
                        <div className="space-y-0 divide-y divide-black/10 dark:divide-white/12">
                            {post.relatedPosts.map((related) => (
                                <Link
                                    key={related.slug}
                                    to={`/news/${related.slug}`}
                                    className="flex items-center justify-between gap-4 py-4 group"
                                >
                                    <h3 className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] dark:group-hover:text-[#5CABFF] transition-colors">
                                        {related.title}
                                    </h3>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </article>
    );
}
