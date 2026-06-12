import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, PencilLine, Sigma, Trash2 } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '@/hooks/useAuth';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import {
    DEFAULT_WEEKLY_MATH_TEMPLATE_KEY,
    DEFAULT_WEEKLY_MATH_PROBLEM,
    deleteWeeklyMath,
    getDefaultWeeklyMathTemplate,
    getWeekDateRange,
    getWeeklyMathList,
    type WeeklyMathProblem,
} from '@/lib/weeklyMath';
import { useToast } from '@/components/ui/useToast';
import { formatDateLabel, formatUpdatedAtLabel, formatWeekKeyWithRange } from '@/lib/dateFormat';
import { normalizeMathDelimiters } from '@/lib/markdown';
import { ROUTE_COUNTING_ANSWER, ROUTE_COUNTING_EXPLANATION } from '@/lib/weeklyMathFallbacks';

export function AdminWeeklyMathPreview() {
    const { user, isAdmin, loading } = useAuth();
    const { addToast } = useToast();
    const [items, setItems] = useState<WeeklyMathProblem[]>([]);
    const [selectedWeekKey, setSelectedWeekKey] = useState<string>('');
    const [loadingItems, setLoadingItems] = useState(true);
    const [deletingWeekKey, setDeletingWeekKey] = useState<string | null>(null);
    const defaultPreviewKey = '__default__';
    const [defaultTemplate, setDefaultTemplate] = useState<WeeklyMathProblem | null>(null);
    const navigate = useNavigate();

    const handleGoBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate('/admin/weekly-math');
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [listRaw, template] = await Promise.all([
                    getWeeklyMathList(),
                    getDefaultWeeklyMathTemplate(),
                ]);
                const list = listRaw.filter((item) =>
                    item.weekKey !== 'diagnostic-test' &&
                    item.weekKey !== DEFAULT_WEEKLY_MATH_TEMPLATE_KEY
                );
                if (!mounted) return;
                setItems(list);
                setDefaultTemplate(template);
                setSelectedWeekKey(list[0]?.weekKey ?? defaultPreviewKey);
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

    const selectedItem = useMemo(
        () => items.find((item) => item.weekKey === selectedWeekKey) ?? null,
        [items, selectedWeekKey]
    );
    const isDefaultSelected = selectedWeekKey === defaultPreviewKey;

    const handleDelete = async (weekKey: string) => {
        if (!window.confirm(`${weekKey} の問題を削除します。よろしいですか？`)) return;

        setDeletingWeekKey(weekKey);
        try {
            await deleteWeeklyMath(weekKey);
            setItems((prev) => {
                const next = prev.filter((item) => item.weekKey !== weekKey);
                if (selectedWeekKey === weekKey) {
                    setSelectedWeekKey(next[0]?.weekKey ?? defaultPreviewKey);
                }
                return next;
            });
            addToast({
                type: 'success',
                title: '削除しました',
                message: `${weekKey} の問題を削除しました。`,
            });
        } catch (error) {
            console.error('Failed to delete weekly math:', error);
            const detail = error instanceof FirebaseError
                ? `${error.code}${error.message ? `: ${error.message}` : ''}`
                : '不明なエラー';
            addToast({
                type: 'error',
                title: '削除に失敗しました',
                message: `権限または通信状態を確認してください。（${detail}）`,
            });
        } finally {
            setDeletingWeekKey(null);
        }
    };

    const previewItem = selectedItem ?? defaultTemplate ?? DEFAULT_WEEKLY_MATH_PROBLEM;
    const previewTitle = previewItem.title?.trim() || '経路の場合の数';
    const previewPeriodMemo = previewItem.periodMemo?.trim() || '';
    const previewProblem = previewItem.problem?.trim() || '';
    const fallbackRoute = previewTitle === '経路の場合の数';
    const previewAnswer = previewItem.answer?.trim() || (fallbackRoute ? ROUTE_COUNTING_ANSWER : '');
    const previewExplanation = previewItem.explanation?.trim() || (fallbackRoute ? ROUTE_COUNTING_EXPLANATION : '');
    const previewSolutionPublished = previewItem.solutionPublished ?? true;
    const selectedRange = selectedItem ? getWeekDateRange(selectedItem.weekKey) : null;
    const previewWeekKey = selectedItem?.weekKey ?? DEFAULT_WEEKLY_MATH_TEMPLATE_KEY;

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <div className="animate-pulse text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                    読み込み中...
                </div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <Card variant="default" className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                            アクセス権限がありません
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-8">
                            このページにアクセスする権限がありません。
                        </p>
                        <Link to="/admin">
                            <Button variant="outline" className="rounded-full">
                                管理者ページへ
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <button
                        type="button"
                        onClick={handleGoBack}
                        className="inline-flex items-center gap-2 text-[#0066CC] dark:text-[#2997FF] hover:underline mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        1つ戻る
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <Eye className="w-5 h-5 text-[#0071E3] dark:text-[#2997FF]" />
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7]">
                            今週の数学 プレビュー
                        </h1>
                    </div>
                    <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                        保存済みの問題を選択して、ホームと同じ表示を確認できます。
                    </p>
                </div>
            </section>

            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
                    <Card variant="default" className="h-fit">
                        <CardContent className="p-5">
                            <h2 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                                保存済み問題
                            </h2>
                            {loadingItems ? (
                                <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">読み込み中...</p>
                            ) : (
                                <div className="space-y-2">
                                    <div className="rounded-xl border border-[#0071E3]/25 bg-[#0071E3]/10 dark:border-[#66B4FF]/25 dark:bg-[#2997FF]/15 px-3 py-3 mb-3">
                                        <p className="text-xs font-semibold tracking-wide text-[#0066CC] dark:text-[#7FC2FF] mb-1">
                                            現在表示中
                                        </p>
                                        <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                                            {isDefaultSelected ? '初期問題（経路の場合の数）' : (selectedItem ? formatWeekKeyWithRange(selectedItem.weekKey) : '未選択')}
                                        </p>
                                        {selectedItem?.periodMemo?.trim() && (
                                            <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mt-1">
                                                メモ: {selectedItem.periodMemo.trim()}
                                            </p>
                                        )}
                                        {selectedItem && formatUpdatedAtLabel(selectedItem.updatedAt) && (
                                            <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mt-1">
                                                最終更新: {formatUpdatedAtLabel(selectedItem.updatedAt)}
                                            </p>
                                        )}
                                    </div>
                                    <div
                                        className={`w-full rounded-xl border px-3 py-3 transition-colors ${isDefaultSelected
                                            ? 'border-[#0071E3]/50 bg-[#0071E3]/12 ring-2 ring-[#0071E3]/25 shadow-sm dark:border-[#66B4FF]/45 dark:bg-[#2997FF]/18 dark:ring-[#66B4FF]/20'
                                            : 'border-[var(--border)] hover:bg-[#F5F5F7] dark:hover:bg-[var(--surface-2)]'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setSelectedWeekKey(defaultPreviewKey)}
                                            className="w-full text-left"
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                                    初期問題
                                                </p>
                                                {isDefaultSelected && <Badge variant="primary">表示中</Badge>}
                                            </div>
                                            <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] truncate mb-1">
                                                {defaultTemplate?.title?.trim() || '経路の場合の数'}
                                            </p>
                                            <p className="text-xs text-[#86868B] dark:text-[rgba(235,235,245,0.4)]">
                                                デフォルト問題（管理画面から編集可）
                                            </p>
                                            <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mt-1">
                                                問題: {(defaultTemplate?.problemPublished ?? true) ? '公開' : '非公開'} / 解答・解説: {(defaultTemplate?.solutionPublished ?? true) ? '公開' : '非公開'}
                                            </p>
                                            {formatUpdatedAtLabel(defaultTemplate?.updatedAt) && (
                                                <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mt-1">
                                                    最終更新: {formatUpdatedAtLabel(defaultTemplate?.updatedAt)}
                                                </p>
                                            )}
                                        </button>
                                        <div className="mt-2 flex justify-end">
                                            <Link to={`/admin/weekly-math?week=${encodeURIComponent(DEFAULT_WEEKLY_MATH_TEMPLATE_KEY)}`}>
                                                <Button variant="outline" size="sm" className="h-8 px-2">
                                                    <PencilLine className="w-4 h-4" />
                                                    編集
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                    {items.length === 0 && (
                                        <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                            まだ保存された問題がありません。
                                        </p>
                                    )}
                                    {items.map((item) => {
                                        const range = getWeekDateRange(item.weekKey);
                                        const active = item.weekKey === selectedWeekKey;
                                        return (
                                            <div
                                                key={item.weekKey}
                                                className={`w-full rounded-xl border px-3 py-3 transition-colors ${active
                                                    ? 'border-[#0071E3]/50 bg-[#0071E3]/12 ring-2 ring-[#0071E3]/25 shadow-sm dark:border-[#66B4FF]/45 dark:bg-[#2997FF]/18 dark:ring-[#66B4FF]/20'
                                                    : 'border-[var(--border)] hover:bg-[#F5F5F7] dark:hover:bg-[var(--surface-2)]'
                                                    }`}
                                            >
                                                <button
                                                    onClick={() => setSelectedWeekKey(item.weekKey)}
                                                    className="w-full text-left"
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                                            {formatWeekKeyWithRange(item.weekKey)}
                                                        </p>
                                                        {active && <Badge variant="primary">表示中</Badge>}
                                                    </div>
                                                    <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] truncate mb-1">
                                                        {item.title || '経路の場合の数'}
                                                    </p>
                                                    {item.periodMemo?.trim() && (
                                                        <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] truncate mb-1">
                                                            メモ: {item.periodMemo.trim()}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] truncate mb-1">
                                                        問題: {(item.problemPublished ?? true) ? '公開' : '非公開'} / 解答・解説: {(item.solutionPublished ?? true) ? '公開' : '非公開'}
                                                    </p>
                                                    {range && (
                                                        <p className="text-xs text-[#86868B] dark:text-[rgba(235,235,245,0.4)]">
                                                            {formatDateLabel(range.start)} 〜 {formatDateLabel(range.end)}
                                                        </p>
                                                    )}
                                                    {formatUpdatedAtLabel(item.updatedAt) && (
                                                        <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mt-1">
                                                            最終更新: {formatUpdatedAtLabel(item.updatedAt)}
                                                        </p>
                                                    )}
                                                </button>
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <Link to={`/admin/weekly-math?week=${encodeURIComponent(item.weekKey)}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 px-2"
                                                        >
                                                            <PencilLine className="w-4 h-4" />
                                                            編集
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                        onClick={() => handleDelete(item.weekKey)}
                                                        isLoading={deletingWeekKey === item.weekKey}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        削除
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="p-1">
                            <section className="max-w-[980px] mx-auto px-0 py-0 relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-full bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center">
                                        <Sigma className="w-5 h-5 text-[#0071E3] dark:text-[#66B4FF]" />
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-end sm:gap-3">
                                        <h2 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                                            今週の数学
                                        </h2>
                                    </div>
                                </div>

                                {selectedItem && selectedRange && (
                                    <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4">
                                        対象週: {selectedItem.weekKey}（{formatDateLabel(selectedRange.start)} 〜 {formatDateLabel(selectedRange.end)}）
                                    </p>
                                )}
                                {previewPeriodMemo && (
                                    <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4">
                                        期間メモ: {previewPeriodMemo}
                                    </p>
                                )}

                                <Card variant="elevated" className="relative overflow-hidden">
                                    <CardContent className="p-8">
                                        <h3 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
                                            {previewTitle}
                                        </h3>
                                        {previewProblem ? (
                                            <div className="mb-5 [&_.katex-display]:my-4">
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
                                                    {normalizeMathDelimiters(previewProblem)}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                                問題文が設定されていません。
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                {(previewAnswer || previewExplanation) && (
                                    <Card variant="default" className="mt-6">
                                        <CardContent className="p-8">
                                            <h3 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
                                                解答・解説プレビュー（管理者）
                                            </h3>
                                            {previewAnswer ? (
                                                <div className="[&_.katex-display]:my-4 mb-4">
                                                    <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                                        解答
                                                    </h4>
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
                                                        {normalizeMathDelimiters(previewAnswer)}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4">
                                                    解答は未入力です。
                                                </p>
                                            )}
                                            {previewExplanation ? (
                                                <div className="[&_.katex-display]:my-4">
                                                    <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                                        解説
                                                    </h4>
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
                                                        {normalizeMathDelimiters(previewExplanation)}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                                    解説は未入力です。
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <Link to={`/weekly-math/${encodeURIComponent(previewWeekKey)}`}>
                                        <Button variant="outline" size="sm">
                                            問題ページを開く
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Link to={`/weekly-math/${encodeURIComponent(previewWeekKey)}/solution`}>
                                        <Button variant="outline" size="sm">
                                            解答・解説ページを開く
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <span className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        公開状態: 問題 {((previewItem.problemPublished ?? true) ? '公開' : '非公開')} / 解答・解説 {(previewSolutionPublished ? '公開' : '非公開')}
                                    </span>
                                </div>

                            </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
