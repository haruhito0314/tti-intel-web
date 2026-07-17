import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { Card, CardContent, Button } from '@/components/ui';
import { MathMarkdown } from '@/components/MathMarkdown';
import {
    fromPublicWeeklyMathKey,
    getWeeklyMath,
    toPublicWeeklyMathKey,
    type WeeklyMathProblem,
} from '@/lib/weeklyMath';

export function WeeklyMathDetail() {
    const { weekKey } = useParams<{ weekKey: string }>();
    const decodedWeekKey = useMemo(() => decodeURIComponent(weekKey || ''), [weekKey]);
    const resolvedWeekKey = useMemo(() => fromPublicWeeklyMathKey(decodedWeekKey), [decodedWeekKey]);
    const [item, setItem] = useState<WeeklyMathProblem | null>(null);
    const [loadingItem, setLoadingItem] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [hintOpen, setHintOpen] = useState(false);
    const isProblemPublished = item?.problemPublished ?? true;
    const isSolutionPublished = item?.solutionPublished ?? true;

    useEffect(() => {
        let mounted = true;
        setLoadingItem(true);
        setItem(null);
        setFetchError(false);
        setHintOpen(false);

        (async () => {
            try {
                if (!resolvedWeekKey) {
                    if (mounted) setItem(null);
                    return;
                }
                const data = await getWeeklyMath(resolvedWeekKey);
                if (mounted) setItem(data);
            } catch (error) {
                console.error('Failed to load weekly math detail:', error);
                if (mounted) {
                    setItem(null);
                    setFetchError(true);
                }
            } finally {
                if (mounted) setLoadingItem(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [resolvedWeekKey]);

    if (loadingItem) {
        return (
            <div className="max-w-[980px] mx-auto px-4 py-12">
                <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">読み込み中...</p>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="max-w-[980px] mx-auto px-4 py-12">
                <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">読み込みに失敗しました</h1>
                <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-6">
                    問題の取得中にエラーが発生しました。時間をおいて再度お試しください。
                </p>
                <Link to="/weekly-math">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4" />
                        一覧へ戻る
                    </Button>
                </Link>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="max-w-[980px] mx-auto px-4 py-12">
                <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">問題が見つかりません</h1>
                <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-6">
                    指定された問題は存在しないか、削除された可能性があります。
                </p>
                <Link to="/weekly-math">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4" />
                        一覧へ戻る
                    </Button>
                </Link>
            </div>
        );
    }

    if (!isProblemPublished) {
        return (
            <div className="max-w-[980px] mx-auto px-4 py-12">
                <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">問題は非公開です</h1>
                <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-6">
                    この問題ページは現在公開されていません。
                </p>
                <Link to="/weekly-math">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4" />
                        一覧へ戻る
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <PageSeo
                title={`${item.title?.trim() || '今週の数学'} | TTI Intelligence`}
                description="TTI Intelligenceの今週の数学の問題詳細ページです。"
            />
            <section className="about-band-hero relative overflow-hidden border-b border-[#D2D2D7] dark:border-[rgba(255,255,255,0.16)]">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
                    <Link
                        to="/weekly-math"
                        className="inline-flex items-center gap-2 text-[14px] text-[#0071E3] dark:text-[#5CABFF] hover:underline underline-offset-4 mb-5"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        問題一覧へ戻る
                    </Link>
                    <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] break-words">
                        {item.title?.trim() || '経路の場合の数'}
                    </h1>
                </div>
            </section>

            <section className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <Card variant="elevated" className="min-w-0 overflow-hidden">
                    <CardContent className="p-5 sm:p-8 min-w-0">
                        <MathMarkdown paragraphClassName="apple-body text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed mb-4">
                            {item.problem || ''}
                        </MathMarkdown>
                    </CardContent>
                </Card>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                    {item.hint?.trim() ? (
                        <Button
                            type="button"
                            variant="outline"
                            aria-expanded={hintOpen}
                            aria-controls="weekly-math-hint"
                            onClick={() => setHintOpen((open) => !open)}
                        >
                            ヒント
                            <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${hintOpen ? 'rotate-180' : ''}`}
                            />
                        </Button>
                    ) : null}
                    {isSolutionPublished ? (
                        <Link to={`/weekly-math/${encodeURIComponent(toPublicWeeklyMathKey(item.weekKey))}/solution`}>
                            <Button>
                                解説を見る
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    ) : (
                        <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                            解答・解説は準備中です。
                        </p>
                    )}
                </div>
                {item.hint?.trim() && hintOpen ? (
                    <Card
                        id="weekly-math-hint"
                        className="mt-6 animate-fade-in min-w-0 overflow-hidden border-[#0071E3]/25 dark:border-[#2997FF]/30"
                    >
                        <CardContent className="p-5 sm:p-8 min-w-0">
                            <h2 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                                ヒント
                            </h2>
                            <MathMarkdown paragraphClassName="apple-body text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed mb-4 last:mb-0">
                                {item.hint}
                            </MathMarkdown>
                        </CardContent>
                    </Card>
                ) : null}
            </section>
        </div>
    );
}
