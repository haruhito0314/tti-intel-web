import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Tag, ArrowRight, Pin } from 'lucide-react';
import { Card, CardContent, Badge, Input, Button } from '@/components/ui';

// Dummy data for MVP
const posts = [
    {
        id: '1',
        slug: 'welcome-to-tti-intelligence',
        title: 'TTI Intelligenceへようこそ！',
        excerpt: '私たちは豊田工業大学の学生を中心としたAIサークルです。資格勉強、開発、AI研究、情報交流を中心に活動しています。',
        publishedAt: '2026-04-01',
        category: 'お知らせ',
        tags: ['サークル紹介'],
        pinned: true,
        coverImageUrl: null,
    },
];

const categories = ['すべて', 'お知らせ', '活動報告', 'イベント', '技術記事'];
const allTags = [...new Set(posts.flatMap((p) => p.tags))];

export function News() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('すべて');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const filteredPosts = posts.filter((post) => {
        const matchesSearch =
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
            selectedCategory === 'すべて' || post.category === selectedCategory;
        const matchesTag = !selectedTag || post.tags.includes(selectedTag);
        return matchesSearch && matchesCategory && matchesTag;
    });

    // Sort: pinned first, then by date
    const sortedPosts = [...filteredPosts].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <section className="about-band-hero relative overflow-hidden">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                            お知らせ・記事
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-2xl mx-auto">
                            サークルの活動報告やお知らせ、技術記事を掲載しています
                        </p>
                    </div>
                </div>
            </section>

            <section className="about-band-white">
                <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Search */}
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

                        {/* Category Tabs */}
                        <div className="flex flex-wrap gap-2 mb-8">
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

                        {/* Posts List */}
                        <div className="space-y-6">
                            {sortedPosts.length === 0 ? (
                                <Card variant="default" padding="lg" className="text-center">
                                    <p className="text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        該当する記事が見つかりませんでした
                                    </p>
                                </Card>
                            ) : (
                                sortedPosts.map((post) => (
                                    <Link key={post.id} to={`/news/${post.slug}`} className="block group">
                                        <Card
                                            variant="elevated"
                                            className="hover:scale-[1.01] transition-transform duration-300"
                                        >
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-3">
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
                                                        <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4 line-clamp-2">
                                                            {post.excerpt}
                                                        </p>
                                                        <div className="flex items-center justify-between">
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
                                                            <time className="text-sm text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">
                                                                {post.publishedAt}
                                                            </time>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-5 h-5 text-[#0071E3] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:w-72">
                        <Card variant="default" padding="md" className="sticky top-24">
                            <h3 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-4 flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                タグ
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {allTags.map((tag) => (
                                    <button
                                        key={tag}
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
                            {selectedTag && (
                                <button
                                    onClick={() => setSelectedTag(null)}
                                    className="mt-4 text-sm text-[#0066CC] dark:text-[#2997FF] hover:underline"
                                >
                                    タグをクリア
                                </button>
                            )}
                        </Card>
                    </aside>
                </div>
                </div>
            </section>
        </div>
    );
}
