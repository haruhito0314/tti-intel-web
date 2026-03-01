import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Tag, ArrowRight, Pin } from 'lucide-react';
import { Card, CardContent, Badge, Input, Button } from '@/components/ui';

// Dummy data for MVP
const posts = [
    {
        id: '1',
        slug: 'welcome-to-tti-ai-club',
        title: 'TTI Intelligenceへようこそ！',
        excerpt: '私たちのサークルでは、最新のAI技術を学び、実践的なプロジェクトを通じて技術力を高めています。',
        publishedAt: '2026-02-01',
        category: 'お知らせ',
        tags: ['新入生', 'サークル紹介'],
        pinned: true,
        coverImageUrl: null,
    },
    {
        id: '2',
        slug: 'llm-study-session',
        title: '大規模言語モデル勉強会を開催しました',
        excerpt: 'GPT、Claude、Geminiなど最新のLLMについて学ぶ勉強会を開催しました。参加者からは「とても分かりやすかった」との声が多く寄せられました。',
        publishedAt: '2026-01-28',
        category: '活動報告',
        tags: ['LLM', '勉強会', 'GPT', 'Claude'],
        pinned: false,
        coverImageUrl: null,
    },
    {
        id: '3',
        slug: 'spring-hackathon-2026',
        title: '春のAIハッカソン参加者募集！',
        excerpt: '2026年春に開催されるハッカソンへの参加者を募集しています。初心者歓迎！チームでAIを使ったプロダクトを開発しましょう。',
        publishedAt: '2026-01-25',
        category: 'イベント',
        tags: ['ハッカソン', '募集', '初心者歓迎'],
        pinned: false,
        coverImageUrl: null,
    },
    {
        id: '4',
        slug: 'kaggle-competition-report',
        title: 'Kaggleコンペで銅メダルを獲得しました',
        excerpt: 'チームTTI-AIがKaggleの画像分類コンペで銅メダルを獲得しました。使用した手法と学びを共有します。',
        publishedAt: '2026-01-20',
        category: '活動報告',
        tags: ['Kaggle', 'コンペ', '画像分類'],
        pinned: false,
        coverImageUrl: null,
    },
    {
        id: '5',
        slug: 'python-basics-workshop',
        title: 'Python基礎ワークショップを開催',
        excerpt: 'AI開発の基礎となるPythonプログラミングの入門ワークショップを開催しました。',
        publishedAt: '2026-01-15',
        category: 'イベント',
        tags: ['Python', 'ワークショップ', '初心者向け'],
        pinned: false,
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
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <h1 className="text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
                        お知らせ・記事
                    </h1>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark">
                        サークルの活動報告やお知らせ、技術記事を掲載しています
                    </p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Search */}
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
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
                                    <p className="text-text-secondary-light dark:text-text-secondary-dark">
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
                                                        <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                            {post.title}
                                                        </h2>
                                                        <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4 line-clamp-2">
                                                            {post.excerpt}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-wrap gap-2">
                                                                {post.tags.slice(0, 3).map((tag) => (
                                                                    <span
                                                                        key={tag}
                                                                        className="text-xs text-text-muted-light dark:text-text-muted-dark"
                                                                    >
                                                                        #{tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <time className="text-sm text-text-muted-light dark:text-text-muted-dark">
                                                                {post.publishedAt}
                                                            </time>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-5 h-5 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
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
                            <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-4 flex items-center gap-2">
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
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-700'
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
                                    className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                                >
                                    タグをクリア
                                </button>
                            )}
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    );
}
