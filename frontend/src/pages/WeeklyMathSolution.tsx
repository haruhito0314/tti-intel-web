import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Sigma } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Card, CardContent, Button } from '@/components/ui';
import {
    fromPublicWeeklyMathKey,
    getWeeklyMath,
    toPublicWeeklyMathKey,
    type WeeklyMathProblem,
} from '@/lib/weeklyMath';

function normalizeMathDelimiters(markdown: string): string {
    return markdown
        .replace(/\\+[ \t]*\r?\n/g, '  \n')
        .replace(/\\[ \t]+/g, '  \n')
        .replace(/\\+$/g, '')
        .replace(/\$?\{([^{}\n]+)\}_C_\{([^{}\n]+)\}\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\$?\{([^{}\n]+)\}C\{([^{}\n]+)\}\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\$?([A-Za-z0-9]+)_C_\{([^{}\n]+)\}\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\$?([A-Za-z0-9]+)_C_([A-Za-z0-9]+)\$?/g, (_m, n: string, r: string) => `$` + `{}_{${n}}C_{${r}}` + `$`)
        .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expr: string) => `$$${expr}$$`)
        .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, expr: string) => `$${expr}$`);
}

const ROUTE_COUNTING_EXPLANATION = String.raw`以下のようなスコアを考えます.\\
$+$のカードを引いたときスコアを2得る.\\
$\times,\div$のカードを引いたときスコアを1得る.\\
$-$のカードを引いたときスコアを得ない.\\
ここで$+$のカードと$-$のカードの引いた回数が等しければよく、この回数を$k$とおけばこの際のスコアはkによらず,
$$
2k+(n-k-k)+0k=n
$$
となります.ここで次の式を考えます。
$$
f(x)=(x^2+2x+1)^n
$$
これを展開して得られる整式$f(x)=\sigma_{k=0}^{n}A_kx^k$について$x^k$の係数$A_k$はスコアがkであるようなカードの引き方の総数に対応しています.($x^2$と$+$のカード,$x$と$\times$または$\div$のカード,定数項$1$と$-$のカードがそれぞれ対応しており,$(x^2+2x+1)$をかけるたびにカードを引くという操作が再現できます.)\\
したがって求める値はスコアが$n$の時,つまり$A_n$に等しいです.今$f(x)=(1+x)^{2n}$なので二項定理から`;

const ROUTE_COUNTING_ANSWER = '${}_{2n}C_{n}$';

export function WeeklyMathSolution() {
    const { weekKey } = useParams<{ weekKey: string }>();
    const decodedWeekKey = useMemo(() => decodeURIComponent(weekKey || ''), [weekKey]);
    const resolvedWeekKey = useMemo(() => fromPublicWeeklyMathKey(decodedWeekKey), [decodedWeekKey]);
    const [item, setItem] = useState<WeeklyMathProblem | null>(null);
    const [loadingItem, setLoadingItem] = useState(true);

    const fallbackRoute = item?.title?.trim() === '経路の場合の数';
    const answerMarkdown = item?.answer?.trim() || (fallbackRoute ? ROUTE_COUNTING_ANSWER : '');
    const explanationMarkdown = item?.explanation?.trim() || (fallbackRoute ? ROUTE_COUNTING_EXPLANATION : '');
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
                console.error('Failed to load weekly math solution:', error);
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
                                        {normalizeMathDelimiters(answerMarkdown)}
                                    </ReactMarkdown>
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
                                        {normalizeMathDelimiters(explanationMarkdown)}
                                    </ReactMarkdown>
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
