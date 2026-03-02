import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
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
    'welcome-to-tti-ai-club': {
        title: 'TTI Intelligenceへようこそ！',
        content: `
## はじめに

TTI Intelligenceへようこそ！私たちのサークルでは、最新のAI技術を学び、実践的なプロジェクトを通じて技術力を高めています。

## サークルの特徴

1. **実践重視の学習環境**
   - 理論だけでなく、実際にコードを書いて学ぶスタイル
   - Kaggleコンペへの参加でデータサイエンスのスキルを磨く

2. **多様なプロジェクト**
   - 画像認識、自然言語処理、生成AIなど幅広い分野
   - チームでの開発経験を積める

3. **活発なコミュニティ**
   - 週1回の勉強会で継続的に学習
   - Discordでの活発な議論・情報共有

## 参加方法

サークルへの参加に興味がある方は、お気軽に[お問い合わせページ](/contact)からご連絡ください。

\`\`\`python
# 一緒にAIを学びましょう！
print("Welcome to TTI AI Club! 🚀")
\`\`\`

皆さんの参加をお待ちしています！
    `,
        publishedAt: '2026-02-01',
        author: 'サークル運営',
        category: 'お知らせ',
        tags: ['新入生', 'サークル紹介'],
        relatedPosts: [
            { slug: 'llm-study-session', title: '大規模言語モデル勉強会を開催しました' },
            { slug: 'spring-hackathon-2026', title: '春のAIハッカソン参加者募集！' },
        ],
    },
    'llm-study-session': {
        title: '大規模言語モデル勉強会を開催しました',
        content: `
## 概要

2026年1月28日に、大規模言語モデル（LLM）についての勉強会を開催しました。

## 取り扱ったトピック

- **GPT-4/GPT-4oの最新動向**
- **Claude 3.5 Sonnetの特徴**
- **Geminiの技術的詳細**
- **ローカルLLMの活用方法**

## 参加者の声

> とても分かりやすく、実践的な内容でした。

> LLMの仕組みが理解できて良かったです。

次回の勉強会もお楽しみに！
    `,
        publishedAt: '2026-01-28',
        author: '勉強会担当',
        category: '活動報告',
        tags: ['LLM', '勉強会', 'GPT', 'Claude'],
        relatedPosts: [
            { slug: 'welcome-to-tti-ai-club', title: 'TTI Intelligenceへようこそ！' },
        ],
    },
};

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
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
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
                        {post.content}
                    </ReactMarkdown>
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
