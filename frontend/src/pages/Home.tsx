import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Sparkles, ExternalLink, Sigma } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import {
    DEFAULT_WEEKLY_MATH_PROBLEM,
    getCachedHomeWeeklyMath,
    getHomeWeeklyMath,
    toPublicWeeklyMathKey,
    type WeeklyMathProblem,
} from '@/lib/weeklyMath';

// Dummy data for MVP
const latestPosts = [
    {
        id: '1',
        slug: 'welcome-to-tti-intelligence',
        title: 'TTI Intelligenceへようこそ！',
        excerpt: '私たちは豊田工業大学の学生を中心としたAIサークルです。資格勉強、開発、AI研究、情報交流を中心に活動しています。',
        publishedAt: '2026-04-01',
        category: 'お知らせ',
        tags: ['サークル紹介'],
        pinned: true,
    },
];

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
        ? 'bg-gradient-to-br from-[#0071E3]/20 to-[#00AFBE]/20 dark:from-[#0071E3]/15 dark:to-[#00AFBE]/15'
        : 'bg-[#0071E3]/[0.06] dark:bg-[#2997FF]/[0.06]';

    if (shape === 'hexagon') {
        return (
            <div
                className={`${baseClasses} animate-float-slow`}
                style={{ ...animationStyle, width: size, height: size * 1.15 }}
            >
                <svg viewBox="0 0 100 115" className="w-full h-full">
                    <polygon
                        points="50,0 100,28.75 100,86.25 50,115 0,86.25 0,28.75"
                        className={`${gradient ? 'fill-[#0071E3]/20 dark:fill-[#2997FF]/15' : 'fill-[#0071E3]/10 dark:fill-[#2997FF]/10'}`}
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
                        className={`${gradient ? 'fill-[#00AFBE]/20 dark:fill-[#00AFBE]/15' : 'fill-[#00AFBE]/10 dark:fill-[#00AFBE]/10'}`}
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
                        className={`${gradient ? 'fill-[#0071E3]/25 dark:fill-[#2997FF]/20' : 'fill-[#0071E3]/15 dark:fill-[#2997FF]/15'}`}
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
                className={`${baseClasses} rounded-full animate-pulse-slow ${gradientBg} border border-[#0071E3]/20 dark:border-[#2997FF]/20`}
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
                        className={`${gradient ? 'fill-[#00AFBE]/20 dark:fill-[#00AFBE]/15' : 'fill-[#00AFBE]/10 dark:fill-[#00AFBE]/10'}`}
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
            className={`${baseClasses} rounded-lg animate-float-slow ${gradientBg} border border-[#0071E3]/20 dark:border-[#2997FF]/20 backdrop-blur-sm`}
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

function normalizeMathDelimiters(markdown: string): string {
    return markdown
        .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expr: string) => `$$${expr}$$`)
        .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, expr: string) => `$${expr}$`);
}

export function Home() {
    const cachedHomeWeeklyMath = getCachedHomeWeeklyMath();
    const [weeklyMath, setWeeklyMath] = useState<WeeklyMathProblem | null>(cachedHomeWeeklyMath ?? null);
    const [loadingWeeklyMath, setLoadingWeeklyMath] = useState(cachedHomeWeeklyMath === undefined);
    const displayedWeeklyMath = weeklyMath ?? DEFAULT_WEEKLY_MATH_PROBLEM;
    const displayedWeeklyMathTitle =
        displayedWeeklyMath.title === '今週の数学問題（一般化）'
            ? '経路の場合の数'
            : displayedWeeklyMath.title;

    useEffect(() => {
        if (getCachedHomeWeeklyMath() !== undefined) {
            setLoadingWeeklyMath(false);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                const data = await getHomeWeeklyMath();
                if (mounted) setWeeklyMath(data);
            } catch (error) {
                console.error('Failed to load weekly math:', error);
            } finally {
                if (mounted) setLoadingWeeklyMath(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className="animate-fade-in home-page">
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

                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                            <Sparkles className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF]" />
                            <span className="text-sm font-medium text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                TTI Intelligence
                            </span>
                        </div>

                        <h1 className="apple-hero mb-6">
                            <span className="gradient-text">AIの未来を</span>
                            <br />
                            <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">一緒に創ろう</span>
                        </h1>

                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-2xl mx-auto mb-10 leading-relaxed">
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

            <div className="home-main-color-flow">
                {/* Weekly Math */}
                <section className="home-flow-block home-flow-block-event max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center">
                            <Sigma className="w-5 h-5 text-[#0071E3] dark:text-[#66B4FF]" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-3">
                            <h2 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                                今週の数学
                            </h2>
                            <span className="inline-flex items-center w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-[#0066CC] dark:text-[#7FC2FF] bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border border-[#0071E3]/20 dark:border-[#2997FF]/25">
                                by EIKAKUHANSU
                            </span>
                        </div>
                    </div>

                    <Card variant="elevated" className="relative overflow-hidden">
                        {loadingWeeklyMath ? (
                            <CardContent className="p-8">
                                <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                    読み込み中...
                                </p>
                            </CardContent>
                        ) : (
                            <Link to={`/weekly-math/${encodeURIComponent(toPublicWeeklyMathKey(weeklyMath?.weekKey || 'default-template'))}`} className="block group">
                                <CardContent className="p-8">
                                    <>
                                        <h3 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mb-3 group-hover:text-[#0066CC] dark:group-hover:text-[#66B4FF] transition-colors">
                                            {displayedWeeklyMathTitle}
                                        </h3>
                                        <div className="mb-5">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ children }) => (
                                                        <p className="apple-body text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed mb-4">
                                                            {children}
                                                        </p>
                                                    ),
                                                }}
                                            >
                                                {normalizeMathDelimiters(displayedWeeklyMath.problem)}
                                            </ReactMarkdown>
                                        </div>
                                    </>
                                </CardContent>
                            </Link>
                        )}
                    </Card>
                    <div className="mt-4">
                        <Link
                            to="/weekly-math"
                            className="inline-flex items-center gap-1 text-[#0066CC] dark:text-[#66B4FF] hover:underline apple-body"
                        >
                            問題一覧を見る
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>

                {/* Latest Posts */}
                <section className="home-flow-block home-flow-block-news max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7]">
                            最新のお知らせ
                        </h2>
                        <Link
                            to="/news"
                            className="flex items-center gap-1 text-[#0066CC] dark:text-[#2997FF] hover:underline apple-body"
                        >
                            すべて見る
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="home-card-shell home-card-shell-news">
                        <div className="home-card-backdrop home-card-backdrop-news home-card-backdrop-full-bleed" aria-hidden="true" />
                        <div className="grid md:grid-cols-3 gap-6 relative z-10">
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
                                            <h3 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-2 group-hover:text-[#0066CC] dark:group-hover:text-[#2997FF] transition-colors">
                                                {post.title}
                                            </h3>
                                            <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4 line-clamp-2">
                                                {post.excerpt}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <time className="apple-footnote text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">
                                                    {post.publishedAt}
                                                </time>
                                                <ExternalLink className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF] opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

            </div>

            {/* CTA Section */}
            <section className="home-cta-band max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <Card variant="glass" padding="lg" className="text-center relative overflow-hidden">
                    <h2 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-4 relative z-10">
                        一緒にAIを学びませんか？
                    </h2>
                    <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-2xl mx-auto mb-8 relative z-10">
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
