import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calculator, Save, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, Button, Input, Textarea } from '@/components/ui';
import {
    DEFAULT_WEEKLY_MATH_PROBLEM,
    getCurrentWeekKey,
    getWeeklyMath,
    upsertWeeklyMath,
} from '@/lib/weeklyMath';
import { useToast } from '@/components/ui/Toast';

export function AdminWeeklyMath() {
    const { user, isAdmin, loading } = useAuth();
    const { addToast } = useToast();
    const currentWeekKey = useMemo(() => getCurrentWeekKey(), []);

    const [title, setTitle] = useState('');
    const [problem, setProblem] = useState('');
    const [hint, setHint] = useState('');
    const [answer, setAnswer] = useState('');
    const [explanation, setExplanation] = useState('');
    const [loadingProblem, setLoadingProblem] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await getWeeklyMath(currentWeekKey);
                if (!mounted) return;
                setTitle(data?.title ?? DEFAULT_WEEKLY_MATH_PROBLEM.title);
                setProblem(data?.problem ?? DEFAULT_WEEKLY_MATH_PROBLEM.problem);
                setHint(data?.hint ?? DEFAULT_WEEKLY_MATH_PROBLEM.hint ?? '');
                setAnswer(data?.answer ?? DEFAULT_WEEKLY_MATH_PROBLEM.answer ?? '');
                setExplanation(data?.explanation ?? DEFAULT_WEEKLY_MATH_PROBLEM.explanation ?? '');
            } catch (error) {
                console.error('Failed to load weekly math:', error);
            } finally {
                if (mounted) setLoadingProblem(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [currentWeekKey]);

    const handleSave = async () => {
        if (!problem.trim()) {
            addToast({
                type: 'warning',
                title: '問題文が空です',
                message: '問題文を入力してから保存してください。',
            });
            return;
        }

        setSaving(true);
        try {
            await upsertWeeklyMath(
                currentWeekKey,
                {
                    title: title.trim() || '経路の場合の数',
                    problem: problem.trim(),
                    hint: hint.trim(),
                    answer: answer.trim(),
                    explanation: explanation.trim(),
                },
                user?.email || 'unknown'
            );
            addToast({
                type: 'success',
                title: '保存しました',
                message: `ホームの「今週の数学」を ${currentWeekKey} に更新しました。`,
            });
        } catch (error) {
            console.error('Failed to save weekly math:', error);
            addToast({
                type: 'error',
                title: '保存に失敗しました',
                message: '権限または通信状態を確認してください。',
            });
        } finally {
            setSaving(false);
        }
    };

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
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-red-500" />
                        </div>
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
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link
                        to="/admin"
                        className="inline-flex items-center gap-2 text-[#0066CC] dark:text-[#2997FF] hover:underline mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        管理者ダッシュボード
                    </Link>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center">
                            <Calculator className="w-5 h-5 text-[#0071E3] dark:text-[#2997FF]" />
                        </div>
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7]">
                            今週の数学 管理
                        </h1>
                    </div>
                    <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                        対象週: {currentWeekKey}
                    </p>
                </div>
            </section>

            <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card variant="glass">
                    <CardContent className="p-6 space-y-5">
                        {loadingProblem ? (
                            <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">読み込み中...</p>
                        ) : (
                            <>
                                <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                    LaTeX記法に対応しています。インラインは <code>$x^2 + y^2$</code>、別行表示は <code>$$\\int_0^1 x^2 dx$$</code> の形式で入力してください。
                                </p>
                                <Input
                                    label="タイトル"
                                    placeholder="例: 経路の場合の数"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                                <Textarea
                                    label="問題文（必須）"
                                    placeholder="問題文を入力"
                                    value={problem}
                                    onChange={(e) => setProblem(e.target.value)}
                                    rows={5}
                                />
                                <Textarea
                                    label="ヒント"
                                    placeholder="必要なら入力"
                                    value={hint}
                                    onChange={(e) => setHint(e.target.value)}
                                    rows={3}
                                />
                                <Textarea
                                    label="解答"
                                    placeholder="解答を入力"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    rows={3}
                                />
                                <Textarea
                                    label="解説"
                                    placeholder="解説を入力"
                                    value={explanation}
                                    onChange={(e) => setExplanation(e.target.value)}
                                    rows={4}
                                />
                                <div className="pt-2">
                                    <Button onClick={handleSave} isLoading={saving} className="rounded-full">
                                        <Save className="w-4 h-4" />
                                        保存
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
