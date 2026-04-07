import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sigma } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Card, CardContent, Button } from '@/components/ui';
import {
    DEFAULT_WEEKLY_MATH_TEMPLATE_KEY,
    fromPublicWeeklyMathKey,
    getWeeklyMath,
    toPublicWeeklyMathKey,
    type WeeklyMathProblem,
} from '@/lib/weeklyMath';

function normalizeMathDelimiters(markdown: string): string {
    return markdown
        // Allow LaTeX-style manual line breaks in prose: "\" + newline, "\\" + newline, and "\ " marker.
        .replace(/\\+[ \t]*\r?\n/g, '  \n')
        .replace(/\\[ \t]+/g, '  \n')
        .replace(/\\+$/g, '')
        // Normalize combination notation to subscript style: {}_{2n}C_{n}
        .replace(/\$?\{([^{}\n]+)\}_C_\{([^{}\n]+)\}\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\$?\{([^{}\n]+)\}C\{([^{}\n]+)\}\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\$?([A-Za-z0-9]+)_C_\{([^{}\n]+)\}\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\$?([A-Za-z0-9]+)_C_([A-Za-z0-9]+)\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expr: string) => `$$${expr}$$`)
        .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, expr: string) => `$${expr}$`);
}

export function WeeklyMathDetail() {
    const { weekKey } = useParams<{ weekKey: string }>();
    const decodedWeekKey = useMemo(() => decodeURIComponent(weekKey || ''), [weekKey]);
    const resolvedWeekKey = useMemo(() => fromPublicWeeklyMathKey(decodedWeekKey), [decodedWeekKey]);
    const [item, setItem] = useState<WeeklyMathProblem | null>(null);
    const [loadingItem, setLoadingItem] = useState(true);
    const isProblemPublished = item?.problemPublished ?? true;
    const isSolutionPublished = item?.solutionPublished ?? true;

    useEffect(() => {
        let mounted = true;
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
                if (mounted) setItem(null);
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
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link
                        to="/weekly-math"
                        className="inline-flex items-center gap-2 text-[#0066CC] dark:text-[#2997FF] hover:underline mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        問題一覧へ戻る
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <Sigma className="w-5 h-5 text-[#0071E3] dark:text-[#2997FF]" />
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {item.title?.trim() || '経路の場合の数'}
                        </h1>
                    </div>
                    <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                        {item.weekKey === DEFAULT_WEEKLY_MATH_TEMPLATE_KEY ? '最初の問題' : item.weekKey}
                    </p>
                </div>
            </section>

            <section className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <Card variant="elevated">
                    <CardContent className="p-8">
                        <div className="[&_.katex-display]:my-4">
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
                                {normalizeMathDelimiters(item.problem || '')}
                            </ReactMarkdown>
                        </div>
                    </CardContent>
                </Card>
                <div className="mt-6">
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
            </section>
        </div>
    );
}
