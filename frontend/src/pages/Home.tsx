import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Users, Sparkles, ExternalLink } from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@/components/ui';

// Dummy data for MVP
const latestPosts = [
    {
        id: '1',
        slug: 'welcome-to-tti-ai-club',
        title: 'TTI Intelligenceへようこそ！',
        excerpt: '私たちのサークルでは、最新のAI技術を学び、実践的なプロジェクトを通じて技術力を高めています。',
        publishedAt: '2026-02-01',
        category: 'お知らせ',
        tags: ['新入生', 'サークル紹介'],
        pinned: true,
    },
    {
        id: '2',
        slug: 'llm-study-session',
        title: '大規模言語モデル勉強会を開催しました',
        excerpt: 'GPT、Claude、Geminiなど最新のLLMについて学ぶ勉強会を開催しました。',
        publishedAt: '2026-01-28',
        category: '活動報告',
        tags: ['LLM', '勉強会'],
        pinned: false,
    },
    {
        id: '3',
        slug: 'spring-hackathon-2026',
        title: '春のAIハッカソン参加者募集！',
        excerpt: '2026年春に開催されるハッカソンへの参加者を募集しています。初心者歓迎！',
        publishedAt: '2026-01-25',
        category: 'イベント',
        tags: ['ハッカソン', '募集'],
        pinned: false,
    },
];

const nextEvent = {
    title: '週次AI勉強会',
    date: '2026年2月15日（土）14:00〜',
    location: '豊田工業大学 8号館 3F',
    description: 'Transformerアーキテクチャの基礎から応用まで学びます',
};

// Floating puzzle piece component
function FloatingPuzzle({
    className = '',
    size = 40,
    delay = 0,
    duration = 8,
    shape = 'square',
    gradient = false,
}: {
    className?: string;
    size?: number;
    delay?: number;
    duration?: number;
    shape?: 'square' | 'hexagon' | 'triangle' | 'diamond' | 'circle' | 'cross';
    gradient?: boolean;
}) {
    const animationStyle = {
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
    };

    const baseClasses = `absolute pointer-events-none ${className}`;

    const gradientBg = gradient
        ? 'bg-gradient-to-br from-primary-400/20 to-accent-400/20 dark:from-primary-500/15 dark:to-accent-500/15'
        : 'bg-primary-500/[0.06] dark:bg-primary-400/[0.06]';

    if (shape === 'hexagon') {
        return (
            <div
                className={`${baseClasses} animate-float-slow`}
                style={{ ...animationStyle, width: size, height: size * 1.15 }}
            >
                <svg viewBox="0 0 100 115" className="w-full h-full">
                    <polygon
                        points="50,0 100,28.75 100,86.25 50,115 0,86.25 0,28.75"
                        className={`${gradient ? 'fill-primary-400/20 dark:fill-primary-500/15' : 'fill-primary-500/10 dark:fill-primary-400/10'}`}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeOpacity="0.2"
                    />
                </svg>
            </div>
        );
    }

    if (shape === 'triangle') {
        return (
            <div
                className={`${baseClasses} animate-float-diagonal`}
                style={{ ...animationStyle, width: size, height: size * 0.87 }}
            >
                <svg viewBox="0 0 100 87" className="w-full h-full">
                    <polygon
                        points="50,0 100,87 0,87"
                        className={`${gradient ? 'fill-accent-400/20 dark:fill-accent-500/15' : 'fill-accent-500/10 dark:fill-accent-400/10'}`}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeOpacity="0.2"
                    />
                </svg>
            </div>
        );
    }

    if (shape === 'diamond') {
        return (
            <div
                className={`${baseClasses} animate-float-orbit`}
                style={{ ...animationStyle, width: size, height: size }}
            >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <polygon
                        points="50,0 100,50 50,100 0,50"
                        className={`${gradient ? 'fill-primary-400/25 dark:fill-primary-500/20' : 'fill-primary-500/15 dark:fill-primary-400/15'}`}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeOpacity="0.2"
                    />
                </svg>
            </div>
        );
    }

    if (shape === 'circle') {
        return (
            <div
                className={`${baseClasses} rounded-full animate-pulse-slow ${gradientBg} border border-primary-400/20 dark:border-primary-500/20`}
                style={{ ...animationStyle, width: size, height: size }}
            />
        );
    }

    if (shape === 'cross') {
        return (
            <div
                className={`${baseClasses} animate-float-fast`}
                style={{ ...animationStyle, width: size, height: size }}
            >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path
                        d="M35,0 L65,0 L65,35 L100,35 L100,65 L65,65 L65,100 L35,100 L35,65 L0,65 L0,35 L35,35 Z"
                        className={`${gradient ? 'fill-accent-400/20 dark:fill-accent-500/15' : 'fill-accent-500/10 dark:fill-accent-400/10'}`}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeOpacity="0.15"
                    />
                </svg>
            </div>
        );
    }

    // Default: square with rounded corners
    return (
        <div
            className={`${baseClasses} rounded-lg animate-float-slow ${gradientBg} border border-primary-400/20 dark:border-primary-500/20 backdrop-blur-sm`}
            style={{ ...animationStyle, width: size, height: size }}
        />
    );
}

// Grid lines for cyberpunk effect
function GridLines() {
    return (
        <div className="absolute inset-0 overflow-hidden opacity-20 dark:opacity-10">
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, var(--color-primary-500) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--color-primary-500) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                    maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)',
                }}
            />
        </div>
    );
}

export function Home() {
    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="relative overflow-hidden min-h-[85vh] flex items-center">
                {/* Background gradient */}
                <div className="absolute inset-0 gradient-bg-subtle opacity-50" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.15),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(78,179,218,0.15),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(147,51,234,0.1),transparent_40%)]" />

                {/* Grid lines */}
                <GridLines />

                {/* Floating puzzle pieces */}
                <FloatingPuzzle shape="hexagon" size={80} className="top-[10%] left-[5%]" delay={0} duration={12} gradient />
                <FloatingPuzzle shape="square" size={50} className="top-[15%] right-[10%]" delay={1} duration={10} />
                <FloatingPuzzle shape="triangle" size={60} className="top-[25%] left-[15%]" delay={2} duration={14} gradient />
                <FloatingPuzzle shape="diamond" size={45} className="top-[8%] right-[25%]" delay={0.5} duration={15} />
                <FloatingPuzzle shape="circle" size={35} className="top-[35%] right-[8%]" delay={3} duration={8} gradient />
                <FloatingPuzzle shape="cross" size={55} className="top-[20%] left-[40%]" delay={1.5} duration={11} />
                <FloatingPuzzle shape="hexagon" size={40} className="top-[45%] left-[8%]" delay={2.5} duration={13} />
                <FloatingPuzzle shape="square" size={70} className="top-[50%] right-[15%]" delay={0} duration={9} gradient />
                <FloatingPuzzle shape="triangle" size={35} className="top-[60%] left-[20%]" delay={4} duration={12} />
                <FloatingPuzzle shape="diamond" size={55} className="top-[55%] right-[30%]" delay={1} duration={14} gradient />
                <FloatingPuzzle shape="circle" size={25} className="top-[70%] left-[35%]" delay={2} duration={7} />
                <FloatingPuzzle shape="cross" size={40} className="top-[65%] right-[5%]" delay={3.5} duration={10} gradient />
                <FloatingPuzzle shape="hexagon" size={55} className="top-[75%] left-[5%]" delay={0.5} duration={11} gradient />
                <FloatingPuzzle shape="square" size={30} className="top-[80%] right-[20%]" delay={2} duration={8} />
                <FloatingPuzzle shape="diamond" size={65} className="top-[85%] left-[25%]" delay={1.5} duration={13} />

                {/* Additional small particles */}
                <FloatingPuzzle shape="circle" size={15} className="top-[12%] left-[30%]" delay={0} duration={6} />
                <FloatingPuzzle shape="circle" size={20} className="top-[40%] right-[40%]" delay={1} duration={5} gradient />
                <FloatingPuzzle shape="circle" size={12} className="top-[55%] left-[45%]" delay={2} duration={7} />
                <FloatingPuzzle shape="circle" size={18} className="top-[30%] right-[35%]" delay={1.5} duration={6} gradient />
                <FloatingPuzzle shape="circle" size={10} className="top-[68%] left-[55%]" delay={0.5} duration={5} />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 animate-shimmer bg-gradient-to-r from-transparent via-primary-200/30 to-transparent dark:via-primary-700/30">
                            <Sparkles className="w-4 h-4 text-primary-500" />
                            <span className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
                                TTI Intelligence
                            </span>
                        </div>

                        <h1 className="text-[28px] md:text-6xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
                            <span className="gradient-text">AIの未来を</span>
                            <br />
                            <span className="text-text-primary-light dark:text-text-primary-dark">一緒に創ろう</span>
                        </h1>

                        <p className="text-[15px] md:text-xl text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto mb-10 leading-relaxed">
                            TTI Intelligenceは、最新のAI技術を共に学び、
                            実践的な開発を通じてアイデアを形にする学生コミュニティです。
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/about">
                                <Button size="lg" className="group">
                                    <Users className="w-5 h-5" />
                                    サークルについて
                                    <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                </Button>
                            </Link>
                            <Link to="/contact">
                                <Button variant="outline" size="lg">
                                    お問い合わせ
                                    <ArrowRight className="w-5 h-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--background)] to-transparent" />
            </section>

            {/* Next Event */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <Card variant="glass" className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/3 gradient-bg p-8 flex items-center justify-center">
                            <div className="text-center text-white">
                                <Calendar className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-base md:text-lg font-semibold">次回イベント</p>
                            </div>
                        </div>
                        <CardContent className="flex-1 p-8">
                            <h3 className="text-base md:text-xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                                {nextEvent.title}
                            </h3>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
                                {nextEvent.description}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                                    <Calendar className="w-4 h-4" />
                                    {nextEvent.date}
                                </div>
                                <div className="flex items-center gap-2 text-text-muted-light dark:text-text-muted-dark">
                                    📍 {nextEvent.location}
                                </div>
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </section>

            {/* Latest Posts */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl md:text-3xl font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">
                        最新のお知らせ
                    </h2>
                    <Link
                        to="/news"
                        className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        すべて見る
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {latestPosts.map((post, index) => (
                        <Link
                            key={post.id}
                            to={`/news/${post.slug}`}
                            className="group"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <Card
                                variant="elevated"
                                className="h-full hover:scale-[1.015] transition-transform duration-300"
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Badge variant={post.pinned ? 'primary' : 'default'}>
                                            {post.category}
                                        </Badge>
                                        {post.pinned && (
                                            <Badge variant="warning">📌 固定</Badge>
                                        )}
                                    </div>
                                    <h3 className="text-[15px] md:text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="text-[13px] md:text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4 line-clamp-2">
                                        {post.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <time className="text-xs text-text-muted-light dark:text-text-muted-dark">
                                            {post.publishedAt}
                                        </time>
                                        <ExternalLink className="w-4 h-4 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <Card variant="glass" padding="lg" className="text-center relative overflow-hidden">
                    {/* Floating elements in CTA */}
                    <FloatingPuzzle shape="hexagon" size={40} className="top-4 left-4" delay={0} duration={10} />
                    <FloatingPuzzle shape="diamond" size={30} className="top-8 right-8" delay={1} duration={12} gradient />
                    <FloatingPuzzle shape="circle" size={20} className="bottom-4 left-[20%]" delay={2} duration={8} />
                    <FloatingPuzzle shape="triangle" size={35} className="bottom-6 right-[15%]" delay={0.5} duration={11} gradient />

                    <h2 className="text-xl md:text-3xl font-bold gradient-text mb-4 relative z-10 tracking-tight">
                        一緒にAIを学びませんか？
                    </h2>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto mb-8 relative z-10">
                        経験や専攻は問いません。AIに興味がある方なら誰でも大歓迎です。
                        まずはお気軽にお問い合わせください。
                    </p>
                    <Link to="/contact" className="relative z-10">
                        <Button size="lg">
                            入会について問い合わせる
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </Link>
                </Card>
            </section>
        </div>
    );
}
