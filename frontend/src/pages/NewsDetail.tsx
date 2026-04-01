import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ArrowLeft, Calendar, User, Tag, Share2 } from 'lucide-react';
import { Badge, Card, CardContent, Button } from '@/components/ui';

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
    'weekly-math-published-2026-04-01': {
        title: '今週の数学の問題を公開しました',
        content: `
## お知らせ

ホームページに「今週の数学」コーナーを追加し、**2026-04-01** の問題を公開しました。

## 今週の数学

+1, -1, ×1, ÷1 がそれぞれ書かれた4種類のカードが、それぞれ十分な枚数あります。

今、\\(a_0=1\\) として、毎回1枚のカードを引きます。  
\\(a_{n+1}\\) は、\\(a_n\\) に対してそのカードに書かれた操作をすることで定めます。  
ただし、\\(n\\) は非負整数です。

例えば、+1、+1、×1 の順でカードを引いた時、

- \\(a_0=1\\)
- \\(a_1=2\\)
- \\(a_2=3\\)
- \\(a_3=3\\)

となります。

\\(2n\\) 回の操作後、\\(a_{2n}=1\\) となるようなカードの引き方の総数を求めてください。

## 補足

答えは後日公開します。まずはぜひ自分で挑戦してみてください。
`,
        publishedAt: '2026-04-01',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['今週の数学', 'サイト更新'],
        relatedPosts: [
            { slug: 'welcome-to-tti-ai-club', title: 'TTI Intelligenceへようこそ！' },
        ],
    },
    'welcome-to-tti-ai-club': {
        title: 'TTI Intelligenceへようこそ！',
        content: `
## はじめに

TTI Intelligenceへようこそ！私たちは豊田工業大学の学生を中心としたAIサークルです。AI技術の学習・研究・開発を通じて、次世代のAIエンジニアを育成しています。

## 活動内容

1. **資格勉強**
   - 基本情報・応用情報技術者試験などのIT資格取得に向けた勉強会を実施

2. **開発**
   - Webアプリやツールなど、チームで実践的なプロダクト開発に取り組む

3. **AI研究**
   - 最新のAI技術や機械学習について学び、研究・実験を行う

4. **情報交流**
   - 技術トレンドや学習方法の共有、メンバー間のナレッジ交換

## 使用しているAIツール

OpenAI Codex、Google Antigravity、Claude Codeなどの最新AIコーディングツールを活用し、実際の開発を通じてこれらのツールの効果的な使い方を学んでいます。

## 活動について

- **活動日**: 主に土日
- **参加**: 自由参加（自分のペースで無理なく続けられます）
- **費用**: 無料（AIツールのサブスクリプション等は各自負担）

## 参加方法

サークルへの参加に興味がある方は、お気軽に[お問い合わせページ](/contact)からご連絡ください。プログラミング未経験の方も大歓迎です！わからないところは1から全部サポートします。

皆さんの参加をお待ちしています！
    `,
        publishedAt: '2026-02-01',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['サークル紹介'],
        relatedPosts: [
            { slug: 'weekly-math-published-2026-04-01', title: '今週の数学の問題を公開しました' },
        ],
    },
};

function normalizeMathDelimiters(markdown: string): string {
    return markdown
        .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expr: string) => `$$${expr}$$`)
        .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, expr: string) => `$${expr}$`);
}

function splitWeeklyMathSections(content: string): {
    before: string;
    problem: string;
    after: string;
} | null {
    const normalized = normalizeMathDelimiters(content);
    const problemHeading = '## 今週の数学';
    const nextHeading = '\n## 補足';
    const start = normalized.indexOf(problemHeading);
    if (start < 0) return null;
    const next = normalized.indexOf(nextHeading, start + problemHeading.length);
    if (next < 0) return null;

    return {
        before: normalized.slice(0, start).trim(),
        problem: normalized.slice(start + problemHeading.length, next).trim(),
        after: normalized.slice(next + 1).trim(),
    };
}

export function NewsDetail() {
    const { slug } = useParams<{ slug: string }>();
    const post = slug ? postsData[slug] : null;
    const weeklyMathSections =
        slug === 'weekly-math-published-2026-04-01'
            ? splitWeeklyMathSections(post?.content ?? '')
            : null;

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

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: post.title,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('URLをコピーしました');
        }
    };

    return (
        <article className="animate-fade-in">
            {/* Header */}
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link
                        to="/news"
                        className="inline-flex items-center gap-2 text-[#0066CC] dark:text-[#2997FF] hover:underline mb-6"
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

                    <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-6">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {post.author}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {post.publishedAt}
                        </div>
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 hover:text-[#0066CC] dark:hover:text-[#2997FF] transition-colors"
                        >
                            <Share2 className="w-4 h-4" />
                            共有
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    {weeklyMathSections ? (
                        <>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    h2: ({ children }) => (
                                        <h2 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mt-8 mb-4">
                                            {children}
                                        </h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mt-6 mb-3">
                                            {children}
                                        </h3>
                                    ),
                                    p: ({ children }) => (
                                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4 leading-relaxed">
                                            {children}
                                        </p>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="list-disc list-inside space-y-2 mb-4 text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                            {children}
                                        </ul>
                                    ),
                                    ol: ({ children }) => (
                                        <ol className="list-decimal list-inside space-y-2 mb-4 text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                            {children}
                                        </ol>
                                    ),
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-[#0071E3] pl-4 italic text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] my-4">
                                            {children}
                                        </blockquote>
                                    ),
                                    code: ({ className, children }) => {
                                        const isInline = !className;
                                        if (isInline) {
                                            return (
                                                <code className="px-1.5 py-0.5 rounded bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#0066CC] dark:text-[#2997FF] text-sm">
                                                    {children}
                                                </code>
                                            );
                                        }
                                        return (
                                            <code className="block bg-[#1C1C1E] text-[#F5F5F7] p-4 rounded-xl overflow-x-auto my-4">
                                                {children}
                                            </code>
                                        );
                                    },
                                    a: ({ href, children }) => (
                                        <Link
                                            to={href || '#'}
                                            className="text-[#0066CC] dark:text-[#2997FF] hover:underline"
                                        >
                                            {children}
                                        </Link>
                                    ),
                                }}
                            >
                                {weeklyMathSections.before}
                            </ReactMarkdown>

                            <div className="my-8 rounded-2xl border border-[#D2D2D7] dark:border-[var(--border)] bg-[#F5F5F7] dark:bg-[var(--surface-2)] p-6 md:p-8">
                                <h2 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                                    経路の場合の数
                                </h2>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        p: ({ children }) => (
                                            <p className="apple-body text-[#1D1D1F] dark:text-[#F5F5F7] mb-4 leading-relaxed">
                                                {children}
                                            </p>
                                        ),
                                        ul: ({ children }) => (
                                            <ul className="list-disc list-inside space-y-2 mb-4 text-[#1D1D1F] dark:text-[#F5F5F7]">
                                                {children}
                                            </ul>
                                        ),
                                        ol: ({ children }) => (
                                            <ol className="list-decimal list-inside space-y-2 mb-4 text-[#1D1D1F] dark:text-[#F5F5F7]">
                                                {children}
                                            </ol>
                                        ),
                                    }}
                                >
                                    {weeklyMathSections.problem}
                                </ReactMarkdown>
                            </div>

                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    h2: ({ children }) => (
                                        <h2 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mt-8 mb-4">
                                            {children}
                                        </h2>
                                    ),
                                    p: ({ children }) => (
                                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4 leading-relaxed">
                                            {children}
                                        </p>
                                    ),
                                }}
                            >
                                {weeklyMathSections.after}
                            </ReactMarkdown>
                        </>
                    ) : (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                h2: ({ children }) => (
                                    <h2 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mt-8 mb-4">
                                        {children}
                                    </h2>
                                ),
                                h3: ({ children }) => (
                                    <h3 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mt-6 mb-3">
                                        {children}
                                    </h3>
                                ),
                                p: ({ children }) => (
                                    <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4 leading-relaxed">
                                        {children}
                                    </p>
                                ),
                                ul: ({ children }) => (
                                    <ul className="list-disc list-inside space-y-2 mb-4 text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        {children}
                                    </ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="list-decimal list-inside space-y-2 mb-4 text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        {children}
                                    </ol>
                                ),
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-[#0071E3] pl-4 italic text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] my-4">
                                        {children}
                                    </blockquote>
                                ),
                                code: ({ className, children }) => {
                                    const isInline = !className;
                                    if (isInline) {
                                        return (
                                            <code className="px-1.5 py-0.5 rounded bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#0066CC] dark:text-[#2997FF] text-sm">
                                                {children}
                                            </code>
                                        );
                                    }
                                    return (
                                        <code className="block bg-[#1C1C1E] text-[#F5F5F7] p-4 rounded-xl overflow-x-auto my-4">
                                            {children}
                                        </code>
                                    );
                                },
                                a: ({ href, children }) => (
                                    <Link
                                        to={href || '#'}
                                        className="text-[#0066CC] dark:text-[#2997FF] hover:underline"
                                    >
                                        {children}
                                    </Link>
                                ),
                            }}
                        >
                            {normalizeMathDelimiters(post.content)}
                        </ReactMarkdown>
                    )}
                </div>

                {/* Related Posts */}
                {post.relatedPosts.length > 0 && (
                    <section className="mt-16 pt-8 border-t border-[var(--border)]">
                        <h2 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mb-6 flex items-center gap-2">
                            <Tag className="w-5 h-5" />
                            関連記事
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {post.relatedPosts.map((related) => (
                                <Link key={related.slug} to={`/news/${related.slug}`}>
                                    <Card variant="default" className="hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] transition-colors">
                                        <CardContent className="p-4">
                                            <h3 className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0066CC] dark:hover:text-[#2997FF]">
                                                {related.title}
                                            </h3>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </article>
    );
}
