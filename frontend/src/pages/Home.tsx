import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { Button, Card, CardContent, Badge, Skeleton } from '@/components/ui';
import {
    getDefaultWeeklyMathProblem,
    getCachedHomeWeeklyMath,
    getHomeWeeklyMath,
    toPublicWeeklyMathKey,
    type WeeklyMathProblem,
} from '@/lib/weeklyMath';

const MathMarkdown = lazy(() => import('@/components/MathMarkdown').then(m => ({ default: m.MathMarkdown })));

// Dummy data for MVP
const latestPosts = [
    {
        id: '3',
        slug: 'ai-assistant-launched',
        title: 'サイト内AI Assistantを公開しました',
        excerpt: '活動内容やページの場所など、サイト内の案内をチャットで聞けるAI Assistantを公開しました。画面右下からいつでも開けます。',
        publishedAt: '2026-07-17',
        category: 'お知らせ',
        tags: ['AI Assistant', 'お知らせ'],
        pinned: false,
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
    },
];

const explanationVideos = [
    {
        id: '2di9KexTvLw',
        title: '応用数学 解説動画1',
        publishedAt: '2026-06-12',
        isNew: true,
        url: 'https://www.youtube.com/watch?v=2di9KexTvLw',
    },
    {
        id: 'MBZug3sWW7k',
        title: '2025 力学レポート解説1',
        publishedAt: '2026-06-12',
        isNew: false,
        url: 'https://youtu.be/MBZug3sWW7k?si=1S3duyMKuzePzAU0',
    },
    {
        id: '3VP2Tedn6MY',
        title: '2025 力学レポート解説2',
        publishedAt: '2026-06-12',
        isNew: false,
        url: 'https://youtu.be/3VP2Tedn6MY?si=gOg-gOzTX9gu6Owp',
    },
    {
        id: 'Hsict4E99Og',
        title: '卓球表作成 for 豊田工業大学',
        publishedAt: '2026-06-12',
        isNew: false,
        url: 'https://youtu.be/Hsict4E99Og?si=7uTTVRy7EEH1CsKy',
        thumbnail: '/images/table-tennis-match-maker.webp',
    },
];

const youtubeThumbnailVersion = '2026-06-12';

const getYoutubeThumbnailUrl = (videoId: string, quality: 'maxresdefault' | 'hqdefault' = 'maxresdefault') =>
    `https://i.ytimg.com/vi/${videoId}/${quality}.jpg?v=${youtubeThumbnailVersion}`;

const isRecentVideo = (publishedAt: string, now = new Date()) => {
    const publishedTime = new Date(`${publishedAt}T00:00:00+09:00`).getTime();
    if (!Number.isFinite(publishedTime)) return false;
    const ageMs = now.getTime() - publishedTime;
    return ageMs >= 0 && ageMs <= 30 * 24 * 60 * 60 * 1000;
};

const BRAND_TEXT = 'TTI Intelligence';

function useHomeHeroIntroReady() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let observer: MutationObserver | null = null;
        let fallbackTimer = 0;

        const markReady = () => {
            if (cancelled) return;
            setReady(true);
            observer?.disconnect();
            observer = null;
            if (fallbackTimer) window.clearTimeout(fallbackTimer);
        };

        const canStart = () => {
            const splash = document.querySelector('.initial-splash');
            return !splash || splash.classList.contains('is-overlay-out');
        };

        fallbackTimer = window.setTimeout(markReady, 3200);

        if (canStart()) {
            const frame = window.requestAnimationFrame(() => markReady());
            return () => {
                cancelled = true;
                window.cancelAnimationFrame(frame);
                window.clearTimeout(fallbackTimer);
            };
        }

        observer = new MutationObserver(() => {
            if (canStart()) markReady();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            cancelled = true;
            observer?.disconnect();
            window.clearTimeout(fallbackTimer);
        };
    }, []);

    return ready;
}

function HandwrittenBrand({ text }: { text: string }) {
    return (
        <span className="home-hero-brand-text" aria-label={text}>
            {Array.from(text).map((char, index) => (
                <span
                    key={`${char}-${index}`}
                    className="home-hero-write-char"
                    style={{ '--write-delay': `${0.06 + index * 0.036}s` } as CSSProperties}
                    aria-hidden="true"
                >
                    {char === ' ' ? '\u00A0' : char}
                </span>
            ))}
        </span>
    );
}

export function Home() {
    const introReady = useHomeHeroIntroReady();
    const cachedHomeWeeklyMath = getCachedHomeWeeklyMath();
    const [weeklyMath, setWeeklyMath] = useState<WeeklyMathProblem | null>(cachedHomeWeeklyMath ?? null);
    const [loadingWeeklyMath, setLoadingWeeklyMath] = useState(cachedHomeWeeklyMath === undefined);
    const displayedWeeklyMath = weeklyMath ?? getDefaultWeeklyMathProblem();
    const displayedWeeklyMathTitle =
        displayedWeeklyMath.title === '今週の数学問題（一般化）'
            ? '経路の場合の数'
            : displayedWeeklyMath.title;
    const videosScrollerRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeftVideos, setCanScrollLeftVideos] = useState(false);
    const [canScrollRightVideos, setCanScrollRightVideos] = useState(false);
    const [hasOverflowVideos, setHasOverflowVideos] = useState(false);

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

    useEffect(() => {
        const node = videosScrollerRef.current;
        if (!node) return;

        const updateScrollButtons = () => {
            const maxScrollLeft = node.scrollWidth - node.clientWidth;
            setHasOverflowVideos(maxScrollLeft > 2);
            setCanScrollLeftVideos(node.scrollLeft > 2);
            setCanScrollRightVideos(node.scrollLeft < maxScrollLeft - 2);
        };

        updateScrollButtons();
        requestAnimationFrame(updateScrollButtons);
        const timeoutId = window.setTimeout(updateScrollButtons, 120);
        const resizeObserver = new ResizeObserver(updateScrollButtons);
        resizeObserver.observe(node);
        node.addEventListener('scroll', updateScrollButtons, { passive: true });
        window.addEventListener('resize', updateScrollButtons);
        return () => {
            window.clearTimeout(timeoutId);
            resizeObserver.disconnect();
            node.removeEventListener('scroll', updateScrollButtons);
            window.removeEventListener('resize', updateScrollButtons);
        };
    }, []);

    const scrollVideos = (direction: 'left' | 'right') => {
        const node = videosScrollerRef.current;
        if (!node) return;
        const distance = Math.min(420, node.clientWidth * 0.86);
        node.scrollBy({
            left: direction === 'right' ? distance : -distance,
            behavior: 'smooth',
        });
    };

    return (
        <div className="home-page">
            <PageSeo
                title="TTI Intelligence 公式Webサイト"
                description="豊田工業大学の学生を中心に、AI技術、開発、数学、ゲーム、解説動画へ取り組む学生コミュニティです。"
            />
            <section
                className={`home-hero${introReady ? ' home-hero--play' : ''}`}
                aria-label="TTI Intelligence"
            >
                <div className="home-hero-atmosphere" aria-hidden="true" />

                <div className="home-hero-content">
                    <div className="home-hero-stage">
                        <p className="home-hero-brand">
                            <HandwrittenBrand text={BRAND_TEXT} />
                        </p>
                        <svg
                            className="home-hero-brand-underline"
                            viewBox="0 0 260 18"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                className="home-hero-brand-underline-path"
                                d="M6 11 C52 5, 108 15, 152 9 S220 6, 254 12"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>

                    <h1
                        className="home-hero-title home-hero-rise"
                        style={{ '--rise-delay': '0.95s' } as CSSProperties}
                    >
                        <span className="home-hero-title-line">AIの未来を</span>
                        <span className="home-hero-title-line">一緒に創ろう</span>
                    </h1>

                    <p
                        className="home-hero-lead home-hero-rise"
                        style={{ '--rise-delay': '1.1s' } as CSSProperties}
                    >
                        TTI Intelligenceは、最新のAI技術を共に学び、実践的な開発を通じてアイデアを形にする学生コミュニティです。
                    </p>

                    <div
                        className="home-hero-actions home-hero-rise"
                        style={{ '--rise-delay': '1.2s' } as CSSProperties}
                    >
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

                <div className="home-hero-fade" aria-hidden="true" />
            </section>

            <div className="home-main-color-flow bg-[#F5F5F7] dark:bg-[var(--surface-2)]">
                {/* Explanation Videos */}
                <section className="home-flow-block bg-[#F5F5F7] dark:bg-[#111113] w-full py-14 lg:py-16 relative z-10 border-y border-black/5 dark:border-white/10">
                    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-end justify-between mb-8 gap-4">
                            <h2 className="text-[24px] sm:text-[34px] font-semibold tracking-[-0.03em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-[1.06]">
                                <span className="text-[#FF5A1F] dark:text-[#FF8A5C]">解説動画。</span>{' '}
                                <span className="text-[#6E6E73] dark:text-[rgba(235,235,245,0.66)]">直近の投稿をチェック。</span>
                            </h2>
                            <a
                                href="https://www.youtube.com/@ttiintelligence"
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 flex items-center gap-1 text-[12px] font-medium text-[#0071E3] dark:text-[#5CABFF] hover:underline"
                            >
                                チャンネルを見る
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>

                        <div className="relative">
                            <div ref={videosScrollerRef} className="overflow-x-auto pb-3 md:pb-2 scroll-smooth">
                                <div className="flex gap-4 sm:gap-5 snap-x snap-mandatory pr-6">
                                {explanationVideos.slice(0, 5).map((video, index) => {
                                    const isNew = video.isNew && isRecentVideo(video.publishedAt);
                                    return (
                                    <a
                                        key={`${video.id}-${index}`}
                                        href={video.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group snap-start shrink-0 w-[82vw] max-w-[300px] md:w-[300px]"
                                    >
                                        <Card
                                            variant="default"
                                            className="h-full rounded-[20px] border border-black/5 dark:border-white/10 overflow-hidden bg-white/80 dark:bg-[#1C1C1E]/80 shadow-none hover:bg-white dark:hover:bg-[#1C1C1E] transition-colors duration-300"
                                        >
                                            <div className="px-3 pt-3 pb-2 bg-transparent">
                                                <img
                                                    src={video.thumbnail ?? getYoutubeThumbnailUrl(video.id)}
                                                    alt={video.title}
                                                    width={800}
                                                    height={500}
                                                    className="w-full aspect-[16/10] object-cover rounded-xl group-hover:scale-[1.01] transition-transform duration-500"
                                                    loading="lazy"
                                                    onError={(event) => {
                                                        event.currentTarget.src = getYoutubeThumbnailUrl(video.id, 'hqdefault');
                                                    }}
                                                />
                                            </div>
                                            <CardContent className="p-4 pt-2">
                                                <div className="mb-1.5 min-h-[14px]">
                                                    {isNew && (
                                                        <p className="text-[10px] font-semibold tracking-[0.04em] text-[#FF5A1F] dark:text-[#FF8A5C]">
                                                            NEW
                                                        </p>
                                                    )}
                                                </div>
                                                <h3 className="text-[16px] leading-[1.25] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                                                    {video.title}
                                                </h3>
                                                <p className="text-[13px] text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                                    YouTubeで視聴
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </a>
                                    );
                                })}
                            </div>
                        </div>
                        {(hasOverflowVideos || explanationVideos.length > 1) && (
                            <>
                                <div className="md:hidden mt-4 pr-1 flex justify-end items-center gap-2">
                                    <button
                                        type="button"
                                        aria-label="左に移動"
                                        onClick={() => scrollVideos('left')}
                                        disabled={!canScrollLeftVideos}
                                        className="h-11 w-11 rounded-full flex items-center justify-center transition-colors bg-[#D2D2D7]/95 text-[#5A5A5E] disabled:opacity-45 disabled:cursor-default"
                                    >
                                        <ChevronLeft className="w-8 h-8 text-[#636366] stroke-[2.5] shrink-0" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="右に移動"
                                        onClick={() => scrollVideos('right')}
                                        disabled={!canScrollRightVideos}
                                        className="h-11 w-11 rounded-full flex items-center justify-center transition-colors bg-[#D2D2D7]/95 text-[#5A5A5E] disabled:opacity-45 disabled:cursor-default"
                                    >
                                        <ChevronRight className="w-8 h-8 text-[#636366] stroke-[2.5] shrink-0" />
                                    </button>
                                </div>

                                {canScrollLeftVideos && (
                                    <button
                                        type="button"
                                        aria-label="左に移動"
                                        onClick={() => scrollVideos('left')}
                                        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-[#D2D2D7]/90 hover:bg-[#C8C8CE] text-[#5A5A5E] items-center justify-center transition-colors"
                                    >
                                        <ChevronLeft className="w-7 h-7" />
                                    </button>
                                )}
                                {canScrollRightVideos && (
                                    <button
                                        type="button"
                                        aria-label="右に移動"
                                        onClick={() => scrollVideos('right')}
                                        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-[#D2D2D7]/90 hover:bg-[#C8C8CE] text-[#5A5A5E] items-center justify-center transition-colors"
                                    >
                                        <ChevronRight className="w-7 h-7" />
                                    </button>
                                )}
                            </>
                        )}
                        </div>
                    </div>
                </section>

                {/* Weekly Math */}
                <section className="home-flow-block max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16 relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-3">
                            <h2 className="text-[24px] sm:text-[34px] font-semibold tracking-[-0.03em] text-[#0071E3] dark:text-[#5CABFF] leading-[1.06]">
                                今週の数学
                            </h2>
                        </div>
                    </div>

                    <Card variant="elevated" className="accent-card-soft relative overflow-hidden rounded-[24px] border border-black/5 dark:border-white/10 shadow-[0_8px_22px_rgba(0,0,0,0.08)]">
                        {loadingWeeklyMath ? (
                            <CardContent className="p-8">
                                <div className="space-y-4">
                                    <Skeleton className="h-9 w-2/3 max-w-[360px]" />
                                    <div className="space-y-3 pt-1">
                                        <Skeleton className="h-5 w-full" />
                                        <Skeleton className="h-5 w-11/12" />
                                        <Skeleton className="h-5 w-4/5" />
                                        <Skeleton className="h-5 w-3/5" />
                                    </div>
                                </div>
                            </CardContent>
                        ) : (
                            <Link to={`/weekly-math/${encodeURIComponent(toPublicWeeklyMathKey(displayedWeeklyMath.weekKey))}`} className="block group">
                                <CardContent className="p-8">
                                    <>
                                        <h3 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.03em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-3 leading-[1.08]">
                                            {displayedWeeklyMathTitle}
                                        </h3>
                                        <div className="mb-5 min-h-[112px]">
                                            <Suspense
                                                fallback={
                                                    <div
                                                        className="min-h-[112px] rounded-xl bg-[#F5F5F7] dark:bg-[#111113] animate-pulse"
                                                        aria-hidden="true"
                                                    />
                                                }
                                            >
                                                <MathMarkdown paragraphClassName="text-[17px] sm:text-[19px] text-[#1D1D1F] dark:text-[#F5F5F7] leading-[1.65] tracking-[-0.01em] mb-4">
                                                    {displayedWeeklyMath.problem}
                                                </MathMarkdown>
                                            </Suspense>
                                        </div>
                                    </>
                                </CardContent>
                            </Link>
                        )}
                    </Card>
                    <div className="mt-4">
                        <Link
                            to="/weekly-math"
                            className="inline-flex items-center gap-1 text-[#0071E3] dark:text-[#5CABFF] hover:underline text-[15px] font-medium"
                        >
                            問題一覧を見る
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>

                {/* Latest Posts */}
                <section className="home-flow-block home-flow-block-news max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16 relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-[24px] sm:text-[34px] font-semibold tracking-[-0.03em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-[1.06]">
                            最新のお知らせ
                        </h2>
                        <Link
                            to="/news"
                            className="flex items-center gap-1 text-[#0071E3] dark:text-[#5CABFF] hover:underline apple-body"
                        >
                            すべて見る
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="divide-y divide-black/10 dark:divide-white/12 relative z-10">
                        {latestPosts.map((post) => (
                            <Link
                                key={post.id}
                                to={`/news/${post.slug}`}
                                className="group grid gap-2 py-5 first:pt-0 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6 sm:items-baseline"
                            >
                                <time className="text-[13px] tabular-nums text-[#86868B] dark:text-[rgba(235,235,245,0.4)] sm:pt-1">
                                    {post.publishedAt}
                                </time>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <Badge variant="primary">{post.category}</Badge>
                                        {post.pinned && (
                                            <Badge variant="warning">固定</Badge>
                                        )}
                                    </div>
                                    <h3 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.025em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-[1.25] group-hover:text-[#0071E3] dark:group-hover:text-[#5CABFF] transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="mt-1.5 text-[15px] text-[#6E6E73] dark:text-[rgba(235,235,245,0.66)] line-clamp-2 leading-[1.55]">
                                        {post.excerpt}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

            </div>

            {/* CTA Section */}
            <section className="home-cta-band max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
                <h2 className="text-[24px] sm:text-[34px] font-semibold tracking-[-0.03em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-3 leading-[1.06]">
                    一緒にAIを学びませんか？
                </h2>
                <p className="text-pretty text-[16px] sm:text-[18px] text-[#515154] dark:text-[rgba(235,235,245,0.72)] max-w-[34em] mx-auto mb-7 leading-[1.7] tracking-[-0.01em]">
                    経験や専攻は問いません。AIに興味がある方なら誰でも大歓迎です。まずはお気軽にお問い合わせください。
                </p>
                <Link to="/contact">
                    <Button size="md" className="rounded-full px-7">
                        入会について問い合わせる
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </Link>
            </section>
        </div>
    );
}
