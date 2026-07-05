import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Sigma } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { Card, CardContent, Button } from '@/components/ui';
import { MathMarkdown } from '@/components/MathMarkdown';
import {
    fromPublicWeeklyMathKey,
    getWeeklyMath,
    toPublicWeeklyMathKey,
    type WeeklyMathProblem,
} from '@/lib/weeklyMath';
import { ROUTE_COUNTING_ANSWER, ROUTE_COUNTING_EXPLANATION } from '@/lib/weeklyMathFallbacks';

export function WeeklyMathSolution() {
    const { weekKey } = useParams<{ weekKey: string }>();
    const decodedWeekKey = useMemo(() => decodeURIComponent(weekKey || ''), [weekKey]);
    const resolvedWeekKey = useMemo(() => fromPublicWeeklyMathKey(decodedWeekKey), [decodedWeekKey]);
    const [item, setItem] = useState<WeeklyMathProblem | null>(null);
    const [loadingItem, setLoadingItem] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    const fallbackRoute = item?.title?.trim() === '経路の場合の数';
    const answerMarkdown = item?.answer?.trim() || (fallbackRoute ? ROUTE_COUNTING_ANSWER : '');
    const explanationMarkdown = item?.explanation?.trim() || (fallbackRoute ? ROUTE_COUNTING_EXPLANATION : '');
    const isProblemPublished = item?.problemPublished ?? true;
    const isSolutionPublished = item?.solutionPublished ?? true;

    useEffect(() => {
        let mounted = true;
        setLoadingItem(true);
        setItem(null);
        setFetchError(false);

        (async () => {
            try {
                if (!resolvedWeekKey) {
                    if (mounted) setItem(null);
                    return;
                }
                const data = await getWeeklyMath(resolvedWeekKey);
                if (mounted) setItem(data);
            } catch (error) {
                console.error('Failed to load weekly math solution:', error);
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

    if (!isSolutionPublished) {
        return (
            <div className="max-w-[980px] mx-auto px-4 py-12">
                <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">解答・解説は非公開です</h1>
                <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-6">
                    この問題の解答・解説ページは現在公開されていません。
                </p>
                <Link to={`/weekly-math/${encodeURIComponent(toPublicWeeklyMathKey(item.weekKey))}`}>
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4" />
                        問題ページへ戻る
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <PageSeo
                title={`${item.title?.trim() || '今週の数学'} 解答・解説 | TTI Intelligence`}
                description="TTI Intelligenceの今週の数学の解答・解説ページです。"
            />
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link
                        to={`/weekly-math/${encodeURIComponent(toPublicWeeklyMathKey(item.weekKey))}`}
                        className="inline-flex items-center gap-2 text-[#0066CC] dark:text-[#2997FF] hover:underline mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        問題ページへ戻る
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <Sigma className="w-5 h-5 text-[#0071E3] dark:text-[#2997FF]" />
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {item.title?.trim() || '経路の場合の数'}
                        </h1>
                    </div>
                    <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                        解答・解説
                    </p>
                </div>
            </section>

            <section className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {(answerMarkdown || explanationMarkdown) ? (
                    <Card variant="default">
                        <CardContent className="p-8">
                            <h2 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                                解答・解説
                            </h2>
                            {answerMarkdown ? (
                                <div className="[&_.katex-display]:my-4 mb-4">
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                        解答
                                    </h3>
                                    <MathMarkdown paragraphClassName="apple-body text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed mb-4">
                                        {answerMarkdown}
                                    </MathMarkdown>
                                </div>
                            ) : (
                                <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4">
                                    解答は未入力です。
                                </p>
                            )}

                            {explanationMarkdown ? (
                                <div className="[&_.katex-display]:my-4">
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                        解説
                                    </h3>
                                    <MathMarkdown paragraphClassName="apple-body text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed mb-4">
                                        {explanationMarkdown}
                                    </MathMarkdown>
                                </div>
                            ) : (
                                <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                    解説は未入力です。
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card variant="default">
                        <CardContent className="p-8">
                            <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                解答・解説はまだ登録されていません。
                            </p>
                        </CardContent>
                    </Card>
                )}
            </section>
        </div>
    );
}
