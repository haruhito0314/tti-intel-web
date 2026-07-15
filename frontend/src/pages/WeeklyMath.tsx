import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { Badge, Card, CardContent, Skeleton } from '@/components/ui';
import {
    DEFAULT_WEEKLY_MATH_TEMPLATE_KEY,
    getDefaultWeeklyMathTemplate,
    getWeeklyMathList,
    toPublicWeeklyMathKey,
    type WeeklyMathProblem,
} from '@/lib/weeklyMath';
import { getWeeklyMathAccentClasses, toWeeklyMathPreviewText } from '@/lib/weeklyMathDisplay';
import { sortWeeklyMathProblemsNewestFirst } from '@/lib/weeklyMathIdentity';

export function WeeklyMath() {
    const [items, setItems] = useState<WeeklyMathProblem[]>([]);
    const [loadingItems, setLoadingItems] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [list, defaultTemplate] = await Promise.all([
                    getWeeklyMathList(200),
                    getDefaultWeeklyMathTemplate(),
                ]);
                const filtered = sortWeeklyMathProblemsNewestFirst(list
                    .filter((item) => item.weekKey !== 'diagnostic-test')
                    .filter((item) => item.problemPublished ?? true));
                const withDefault = (defaultTemplate && (defaultTemplate.problemPublished ?? true))
                    ? [...filtered.filter((item) => item.weekKey !== DEFAULT_WEEKLY_MATH_TEMPLATE_KEY), defaultTemplate]
                    : filtered;
                if (mounted) setItems(withDefault);
            } catch (error) {
                console.error('Failed to load weekly math list:', error);
            } finally {
                if (mounted) setLoadingItems(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className="animate-fade-in">
            <PageSeo
                title="今週の数学 | TTI Intelligence"
                description="TTI Intelligenceが公開する数学問題の一覧です。問題文と解答・解説を確認できます。"
            />
            <section className="about-band-hero relative overflow-hidden border-b border-[#D2D2D7] dark:border-[rgba(255,255,255,0.16)]">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-5">
                            今週の数学
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-2xl mx-auto">
                            公開済みの問題一覧です。
                        </p>
                    </div>
                </div>
            </section>

            <section className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {loadingItems ? (
                    <div className="space-y-5">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <Card key={index} variant="elevated" className="relative overflow-hidden">
                                <div className="absolute inset-y-0 right-0 w-1.5 bg-gray-200 dark:bg-white/10" aria-hidden="true" />
                                <CardContent className="relative p-6 pr-9">
                                    <div className="space-y-3">
                                        <Skeleton className="h-7 w-2/3 max-w-[360px]" />
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-4 w-full max-w-[680px]" />
                                        <Skeleton className="h-4 w-5/6 max-w-[560px]" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <Card variant="default">
                        <CardContent className="p-6">
                            <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">公開済みの問題はまだありません。</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-5">
                        {items.map((item, index) => {
                            const preview = toWeeklyMathPreviewText(item.problem || '');
                            const isSolutionPublished = item.solutionPublished ?? true;
                            const barClasses = getWeeklyMathAccentClasses(index);
                            return (
                                <Link key={item.weekKey} to={`/weekly-math/${encodeURIComponent(toPublicWeeklyMathKey(item.weekKey))}`} className="block group">
                                    <Card variant="elevated" className="relative overflow-hidden transition-transform duration-300 hover:scale-[1.01]">
                                        <div className={`absolute inset-y-0 right-0 w-1.5 ${barClasses}`} aria-hidden="true" />
                                        <CardContent className="relative p-6 pr-9 flex items-center justify-between gap-4">
                                            <div className="min-w-0 pr-6 space-y-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0066CC] dark:group-hover:text-[#2997FF] transition-colors">
                                                        {item.title?.trim() || '経路の場合の数'}
                                                    </h2>
                                                    <Badge variant={isSolutionPublished ? 'success' : 'warning'}>
                                                        {isSolutionPublished ? '解答公開中' : '解答準備中'}
                                                    </Badge>
                                                </div>
                                                {preview && (
                                                    <p className="text-sm leading-relaxed text-[#515154] dark:text-[rgba(235,235,245,0.72)] line-clamp-2">
                                                        {preview}
                                                    </p>
                                                )}
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-[#0071E3] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
