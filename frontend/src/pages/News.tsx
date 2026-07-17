import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pin, Search } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { Card, Badge, Input, Button } from '@/components/ui';

// Dummy data for MVP
const posts = [
    {
        id: '3',
        slug: 'ai-assistant-launched',
        title: 'サイト内AI Assistantを公開しました',
        excerpt: '活動内容やページの場所など、サイト内の案内をチャットで聞けるAI Assistantを公開しました。画面右下からいつでも開けます。',
        publishedAt: '2026-07-17',
        category: 'お知らせ',
        tags: ['AI Assistant', 'お知らせ'],
        pinned: false,
        coverImageUrl: null,
    },
    {
        id: '2',
        slug: 'web-development-tutorial-released',
        title: 'Web開発をゼロから学べるサイトを公開しました',
        excerpt: 'プログラミング未経験者が、ブラウザで教材を読みながらHTML・CSS・JavaScriptなどを順番に学べるWebサイトを公開しました。',
        publishedAt: '2026-07-13',
        category: 'お知らせ',
        tags: ['Web開発', '学習教材'],
        pinned: false,
        coverImageUrl: null,
    },
    {
        id: '1',
        slug: 'welcome-to-tti-intelligence',
        title: 'TTI Intelligenceへようこそ！',
        excerpt: '私たちは豊田工業大学の学生を中心としたAIサークルです。開発、数学、ゲーム、解説動画を中心に活動しています。',
        publishedAt: '2026-04-01',
        category: 'お知らせ',
        tags: ['サークル紹介'],
        pinned: true,
        coverImageUrl: null,
    },
];

export function News() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('すべて');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const categories = useMemo(
        () => ['すべて', ...Array.from(new Set(posts.map((post) => post.category)))],
        [],
    );
    const allTags = useMemo(() => [...new Set(posts.flatMap((post) => post.tags))], []);
    const showCategoryFilters = categories.length > 2;
    const showTagFilters = allTags.length >= 4;

    const filteredPosts = posts.filter((post) => {
        const matchesSearch =
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
            selectedCategory === 'すべて' || post.category === selectedCategory;
        const matchesTag = !selectedTag || post.tags.includes(selectedTag);
        return matchesSearch && matchesCategory && matchesTag;
    });

    const sortedPosts = [...filteredPosts].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return (
        <div className="animate-fade-in">
            <PageSeo
                title="お知らせ・記事 | TTI Intelligence"
                description="TTI Intelligenceの活動報告、お知らせ、イベント情報、技術記事を掲載しています。"
            />
            <section className="about-band-hero relative overflow-hidden">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-5">
                            お知らせ・記事
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-2xl mx-auto">
                            サークルの活動報告やお知らせ、技術記事を掲載しています
                        </p>
                    </div>
                </div>
            </section>

            <section className="about-band-white">
                <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
                    {posts.length > 5 && (
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B] dark:text-[rgba(235,235,245,0.3)]" />
                            <Input
                                type="search"
                                placeholder="記事を検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12"
                            />
                        </div>
                    )}

                    {showCategoryFilters && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {categories.map((category) => (
                                <Button
                                    key={category}
                                    variant={selectedCategory === category ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setSelectedCategory(category)}
                                >
                                    {category}
                                </Button>
                            ))}
                        </div>
                    )}

                    {showTagFilters && (
                        <div className="flex flex-wrap gap-2 mb-8">
                            {allTags.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                    className={`
                      px-3 py-1 rounded-full text-sm transition-all duration-200
                      ${selectedTag === tag
                                            ? 'bg-[#0071E3] text-white'
                                            : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] hover:bg-[#E8E8ED] dark:hover:bg-[#2C2C2E]'
                                        }
                    `}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="space-y-0 divide-y divide-black/8 dark:divide-white/10">
                        {sortedPosts.length === 0 ? (
                            <Card variant="default" padding="lg" className="text-center">
                                <p className="text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                    該当する記事が見つかりませんでした
                                </p>
                            </Card>
                        ) : (
                            sortedPosts.map((post) => (
                                <Link key={post.id} to={`/news/${post.slug}`} className="block group py-6 first:pt-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="primary">{post.category}</Badge>
                                                {post.pinned && (
                                                    <Badge variant="warning" className="flex items-center gap-1">
                                                        <Pin className="w-3 h-3" />
                                                        固定
                                                    </Badge>
                                                )}
                                            </div>
                                            <h2 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-2 group-hover:text-[#0066CC] dark:group-hover:text-[#2997FF] transition-colors">
                                                {post.title}
                                            </h2>
                                            <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-3 line-clamp-2">
                                                {post.excerpt}
                                            </p>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {post.tags.slice(0, 3).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="text-xs text-[#86868B] dark:text-[rgba(235,235,245,0.3)]"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                <time className="text-sm text-[#86868B] dark:text-[rgba(235,235,245,0.3)] shrink-0">
                                                    {post.publishedAt}
                                                </time>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-[#0071E3] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
