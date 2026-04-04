import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calculator, Plus, Save, Shield } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { deleteDoc, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, Button, Input, Textarea } from '@/components/ui';
import {
    DEFAULT_WEEKLY_MATH_TEMPLATE_KEY,
    getCurrentWeekKey,
    getWeekDateRange,
    getWeeklyMath,
    getWeeklyMathList,
    type WeeklyMathProblem,
    upsertWeeklyMath,
} from '@/lib/weeklyMath';
import { useToast } from '@/components/ui/Toast';
import { auth, db } from '@/lib/firebase';

function formatDateLabel(date: Date): string {
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
    });
}

function formatDateShortLabel(date: Date): string {
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

function formatWeekKeyWithRange(weekKey: string): string {
    const range = getWeekDateRange(weekKey);
    if (!range) return weekKey;
    return `${weekKey}（${formatDateShortLabel(range.start)}〜${formatDateShortLabel(range.end)}）`;
}

function formatUpdatedAtLabel(value: unknown): string | null {
    if (!value) return null;
    let date: Date | null = null;

    if (value instanceof Date) {
        date = value;
    } else if (typeof value === 'object' && value !== null) {
        const maybeTimestamp = value as {
            toDate?: () => Date;
            seconds?: number;
            nanoseconds?: number;
            _seconds?: number;
            _nanoseconds?: number;
        };
        if (typeof maybeTimestamp.toDate === 'function') {
            date = maybeTimestamp.toDate();
        } else if (typeof maybeTimestamp.seconds === 'number') {
            date = new Date(maybeTimestamp.seconds * 1000 + (maybeTimestamp.nanoseconds ?? 0) / 1_000_000);
        } else if (typeof maybeTimestamp._seconds === 'number') {
            date = new Date(maybeTimestamp._seconds * 1000 + (maybeTimestamp._nanoseconds ?? 0) / 1_000_000);
        }
    } else if (typeof value === 'number') {
        date = new Date(value);
    }

    if (!date || Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function AdminWeeklyMath() {
    const { user, isAdmin, loading } = useAuth();
    const { addToast } = useToast();
    const thisWeekKey = useMemo(() => getCurrentWeekKey(), []);
    const [searchParams] = useSearchParams();
    const queryWeekKey = searchParams.get('week')?.trim() || '';

    const [title, setTitle] = useState('');
    const [periodMemo, setPeriodMemo] = useState('');
    const [problem, setProblem] = useState('');
    const [hint, setHint] = useState('');
    const [answer, setAnswer] = useState('');
    const [explanation, setExplanation] = useState('');
    const [loadingProblem, setLoadingProblem] = useState(true);
    const [existingProblem, setExistingProblem] = useState<WeeklyMathProblem | null>(null);
    const [latestItems, setLatestItems] = useState<WeeklyMathProblem[]>([]);
    const [allItems, setAllItems] = useState<WeeklyMathProblem[]>([]);
    const [targetWeekKey, setTargetWeekKey] = useState(queryWeekKey || thisWeekKey);
    const [formOpen, setFormOpen] = useState(Boolean(queryWeekKey));
    const [forcePrefillOnLoad, setForcePrefillOnLoad] = useState(false);
    const [saving, setSaving] = useState(false);
    const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
    const [runningDiagnostic, setRunningDiagnostic] = useState(false);
    const weekRange = useMemo(() => getWeekDateRange(targetWeekKey), [targetWeekKey]);
    const [editorAnchor, setEditorAnchor] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (queryWeekKey) {
            setTargetWeekKey(queryWeekKey);
            setFormOpen(true);
        } else {
            setTargetWeekKey(thisWeekKey);
            setFormOpen(false);
        }
    }, [queryWeekKey, thisWeekKey]);

    const loadLatestItems = async () => {
        try {
            const list = await getWeeklyMathList(200);
            const filtered = list
                .filter((item) => item.weekKey !== 'default-template' && item.weekKey !== 'diagnostic-test')
                .sort((a, b) => b.weekKey.localeCompare(a.weekKey));
            setLatestItems(filtered.slice(0, 3));
            setAllItems(filtered);
        } catch (error) {
            console.error('Failed to load latest weekly math list:', error);
        }
    };

    useEffect(() => {
        if (!user || !isAdmin) {
            setLoadingProblem(false);
            return;
        }

        let mounted = true;
        (async () => {
            try {
                const [data, list] = await Promise.all([
                    getWeeklyMath(targetWeekKey),
                    getWeeklyMathList(10),
                ]);
                if (!mounted) return;
                setExistingProblem(data);
                const filtered = list
                    .filter((item) => item.weekKey !== 'default-template' && item.weekKey !== 'diagnostic-test')
                    .sort((a, b) => b.weekKey.localeCompare(a.weekKey));
                setLatestItems(filtered.slice(0, 3));
                setAllItems(filtered);

                const shouldPrefillFromEditLink = Boolean(queryWeekKey) || forcePrefillOnLoad;
                if (shouldPrefillFromEditLink) {
                    const source = data;
                    if (source) {
                        setTitle(source.title ?? '');
                        setPeriodMemo(source.periodMemo ?? '');
                        setProblem(source.problem ?? '');
                        setHint(source.hint ?? '');
                        setAnswer(source.answer ?? '');
                        setExplanation(source.explanation ?? '');
                    }
                    setForcePrefillOnLoad(false);
                }
            } catch (error) {
                console.error('Failed to load weekly math:', error);
            } finally {
                if (mounted) setLoadingProblem(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [isAdmin, targetWeekKey, user, queryWeekKey, forcePrefillOnLoad]);

    const handleSave = async () => {
        if (!user || !isAdmin) {
            addToast({
                type: 'error',
                title: '権限がありません',
                message: '管理者としてログインしてから保存してください。',
            });
            return;
        }

        if (!problem.trim()) {
            addToast({
                type: 'warning',
                title: '問題文が空です',
                message: '問題文を入力してから保存してください。',
            });
            return;
        }

        const normalizedWeekKey = targetWeekKey.trim();
        const isDefaultTemplate = normalizedWeekKey === DEFAULT_WEEKLY_MATH_TEMPLATE_KEY;
        const isIsoWeekKey = /^\d{4}-W\d{2}$/.test(normalizedWeekKey);
        if (!isDefaultTemplate && !isIsoWeekKey) {
            addToast({
                type: 'warning',
                title: '週キーの形式が不正です',
                message: `YYYY-WNN 形式で入力してください（例: 2026-W14）。デフォルト問題は ${DEFAULT_WEEKLY_MATH_TEMPLATE_KEY} を指定します。`,
            });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: title.trim() || '経路の場合の数',
                periodMemo: periodMemo.trim(),
                problem: problem.trim(),
                hint: hint.trim(),
                answer: answer.trim(),
                explanation: explanation.trim(),
            };

            await upsertWeeklyMath(
                normalizedWeekKey,
                payload,
                user?.email || 'unknown'
            );
            setExistingProblem({
                weekKey: normalizedWeekKey,
                ...payload,
            });
            await loadLatestItems();
            addToast({
                type: 'success',
                title: '保存しました',
                message: `問題（${normalizedWeekKey}）を更新しました。`,
            });
        } catch (error) {
            console.error('Failed to save weekly math:', error);
            const detail = error instanceof FirebaseError
                ? `${error.code}${error.message ? `: ${error.message}` : ''}`
                : '不明なエラー';
            addToast({
                type: 'error',
                title: '保存に失敗しました',
                message: `権限または通信状態を確認してください。（${detail}）`,
            });
        } finally {
            setSaving(false);
        }
    };

    const fillFromExisting = () => {
        if (!existingProblem) return;
        setTitle(existingProblem.title ?? '');
        setPeriodMemo(existingProblem.periodMemo ?? '');
        setProblem(existingProblem.problem ?? '');
        setHint(existingProblem.hint ?? '');
        setAnswer(existingProblem.answer ?? '');
        setExplanation(existingProblem.explanation ?? '');
    };

    const startNewCreate = () => {
        setTargetWeekKey(thisWeekKey);
        setTitle('');
        setPeriodMemo('');
        setProblem('');
        setHint('');
        setAnswer('');
        setExplanation('');
        setFormOpen(true);
    };

    const handleEditFromLatest = (weekKey: string) => {
        setTargetWeekKey(weekKey);
        setFormOpen(true);
        setForcePrefillOnLoad(true);
        window.setTimeout(() => {
            editorAnchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };

    const latestCreatedRange = useMemo(() => {
        if (allItems.length === 0) return null;
        return getWeekDateRange(allItems[0].weekKey);
    }, [allItems]);

    const calendarMonth = useMemo(() => {
        const base = latestCreatedRange?.end ?? new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    }, [latestCreatedRange]);

    const coveredDays = useMemo(() => {
        const set = new Set<string>();
        for (const item of allItems) {
            const range = getWeekDateRange(item.weekKey);
            if (!range) continue;
            const cursor = new Date(range.start);
            while (cursor <= range.end) {
                set.add(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`);
                cursor.setDate(cursor.getDate() + 1);
            }
        }
        return set;
    }, [allItems]);

    const monthCells = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const first = new Date(year, month, 1);
        const startOffset = first.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: Array<{ day: number; covered: boolean } | null> = [];
        for (let i = 0; i < startOffset; i += 1) cells.push(null);
        for (let day = 1; day <= daysInMonth; day += 1) {
            const key = `${year}-${month}-${day}`;
            cells.push({ day, covered: coveredDays.has(key) });
        }
        return cells;
    }, [calendarMonth, coveredDays]);


    const runDiagnostic = async () => {
        setRunningDiagnostic(true);
        setDiagnosticResult(null);
        try {
            const currentUser = auth.currentUser;
            const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '(missing)';
            const appProjectId = db.app.options.projectId || '(missing)';
            const dbName = ((db as unknown as { _databaseId?: { database?: string } })._databaseId?.database) ?? '(unknown)';
            if (!currentUser) {
                setDiagnosticResult(`NG: 未ログインです / envProjectId=${envProjectId} / appProjectId=${appProjectId} / db=${dbName}`);
                return;
            }

            const token = await currentUser.getIdTokenResult();
            const adminPath = `admins/${currentUser.email || '(none)'}`;
            let adminRead = 'NG';
            let adminDocExists = 'unknown';
            try {
                const adminSnap = await getDoc(doc(db, 'admins', currentUser.email || 'unknown'));
                adminRead = 'OK';
                adminDocExists = adminSnap.exists() ? 'YES' : 'NO';
            } catch {
                adminRead = 'NG';
                adminDocExists = 'unknown';
            }

            let adminWrite = 'NG';
            let weeklyMathWrite = 'NG';
            let weeklymathWrite = 'NG';
            let weeklyMathRead = 'NG';
            let weeklymathRead = 'NG';
            let weeklyMathWriteErr = '';
            let weeklymathWriteErr = '';

            try {
                await getDoc(doc(db, 'weeklyMath', 'diagnostic-test'));
                weeklyMathRead = 'OK';
            } catch (e) {
                const err = e as { code?: string; message?: string };
                weeklyMathRead = `NG(${err.code ?? 'unknown'})`;
            }

            try {
                await getDoc(doc(db, 'weeklymath', 'diagnostic-test'));
                weeklymathRead = 'OK';
            } catch (e) {
                const err = e as { code?: string; message?: string };
                weeklymathRead = `NG(${err.code ?? 'unknown'})`;
            }

            try {
                await setDoc(
                    doc(db, 'admins', currentUser.email || 'unknown'),
                    {
                        diagnosticPingAt: Timestamp.now(),
                        diagnosticPingBy: currentUser.email || 'unknown',
                    },
                    { merge: true }
                );
                adminWrite = 'OK';
            } catch {
                adminWrite = 'NG';
            }

            try {
                await setDoc(
                    doc(db, 'weeklyMath', 'diagnostic-test'),
                    {
                        weekKey: 'diagnostic-test',
                        title: 'diagnostic',
                        problem: 'diagnostic',
                        updatedBy: currentUser.email || 'unknown',
                        updatedAt: Timestamp.now(),
                    },
                    { merge: true }
                );
                await deleteDoc(doc(db, 'weeklyMath', 'diagnostic-test'));
                weeklyMathWrite = 'OK';
            } catch (e) {
                weeklyMathWrite = 'NG';
                const err = e as { code?: string; message?: string };
                weeklyMathWriteErr = `${err.code ?? 'unknown'}${err.message ? `: ${err.message}` : ''}`;
            }

            try {
                await setDoc(
                    doc(db, 'weeklymath', 'diagnostic-test'),
                    {
                        weekKey: 'diagnostic-test',
                        title: 'diagnostic',
                        problem: 'diagnostic',
                        updatedBy: currentUser.email || 'unknown',
                        updatedAt: Timestamp.now(),
                    },
                    { merge: true }
                );
                weeklymathWrite = 'OK';
            } catch (e) {
                weeklymathWrite = 'NG';
                const err = e as { code?: string; message?: string };
                weeklymathWriteErr = `${err.code ?? 'unknown'}${err.message ? `: ${err.message}` : ''}`;
            }

            if (weeklyMathWrite === 'OK') {
                setDiagnosticResult(
                    `OK: weeklyMath書き込み成功 / envProjectId=${envProjectId} / appProjectId=${appProjectId} / db=${dbName} / email=${currentUser.email} / uid=${currentUser.uid} / tokenEmail=${token.claims.email ?? '(none)'} / read(${adminPath})=${adminRead} / exists(${adminPath})=${adminDocExists} / write(${adminPath})=${adminWrite} / read(weeklyMath/diagnostic-test)=${weeklyMathRead} / write(weeklyMath/diagnostic-test)=${weeklyMathWrite} / read(weeklymath/diagnostic-test)=${weeklymathRead} / write(weeklymath/diagnostic-test)=${weeklymathWrite}`
                );
            } else {
                const error = new FirebaseError('diagnostic/write-failed', 'weeklyMath write failed');
                const detail = error instanceof FirebaseError
                    ? `${error.code}${error.message ? `: ${error.message}` : ''}`
                    : 'unknown';
                setDiagnosticResult(
                    `NG: weeklyMath書き込み失敗 / envProjectId=${envProjectId} / appProjectId=${appProjectId} / db=${dbName} / email=${currentUser.email} / uid=${currentUser.uid} / tokenEmail=${token.claims.email ?? '(none)'} / read(${adminPath})=${adminRead} / exists(${adminPath})=${adminDocExists} / write(${adminPath})=${adminWrite} / read(weeklyMath/diagnostic-test)=${weeklyMathRead} / write(weeklyMath/diagnostic-test)=${weeklyMathWrite}${weeklyMathWriteErr ? `(${weeklyMathWriteErr})` : ''} / read(weeklymath/diagnostic-test)=${weeklymathRead} / write(weeklymath/diagnostic-test)=${weeklymathWrite}${weeklymathWriteErr ? `(${weeklymathWriteErr})` : ''} / ${detail}`
                );
            }
        } finally {
            setRunningDiagnostic(false);
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
                <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link
                        to="/admin"
                        className="inline-flex items-center gap-2 text-[#0066CC] dark:text-[#2997FF] hover:underline mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        管理者ダッシュボード
                    </Link>
                    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center">
                                    <Calculator className="w-5 h-5 text-[#0071E3] dark:text-[#2997FF]" />
                                </div>
                                <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7]">
                                    今週の数学 管理
                                </h1>
                            </div>
                            <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                対象週: {formatWeekKeyWithRange(targetWeekKey)}
                            </p>
                            {weekRange && (
                                <p className="apple-footnote mt-1 text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                    表示期間（目安）: {formatDateLabel(weekRange.start)} 〜 {formatDateLabel(weekRange.end)}
                                </p>
                            )}
                            <div className="mt-4">
                                <Link to="/admin/weekly-math/preview">
                                    <Button variant="outline" size="sm" className="rounded-full">
                                        保存済み問題のプレビューを開く
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <Card variant="default">
                            <CardContent className="p-4">
                                <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                    作成状況カレンダー
                                </p>
                                <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-3">
                                    {calendarMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                                </p>
                                <div className="grid grid-cols-7 gap-1 text-[10px] text-[#86868B] dark:text-[rgba(235,235,245,0.5)] mb-1">
                                    {['日', '月', '火', '水', '木', '金', '土'].map((d) => <div key={d} className="text-center">{d}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {monthCells.map((cell, idx) => (
                                        <div key={`${idx}-${cell?.day ?? 'b'}`} className={`h-7 rounded-md text-xs flex items-center justify-center ${cell?.covered ? 'bg-[#0071E3]/20 text-[#1D1D1F] dark:bg-[#2997FF]/35 dark:text-[#F5F5F7]' : 'bg-[#F5F5F7] text-[#86868B] dark:bg-[var(--surface-2)] dark:text-[rgba(235,235,245,0.45)]'}`}>
                                            {cell?.day ?? ''}
                                        </div>
                                    ))}
                                </div>
                                {allItems[0] && (
                                    <p className="mt-3 text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        最終作成週: {formatWeekKeyWithRange(allItems[0].weekKey)}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card variant="default" className="mb-6">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <h2 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7]">
                                最新3件
                            </h2>
                            <Link to="/admin/weekly-math/preview">
                                <Button variant="outline" size="sm" className="rounded-full">一覧を見る</Button>
                            </Link>
                        </div>
                        {latestItems.length === 0 ? (
                            <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                まだ保存された問題がありません。
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {latestItems.map((item) => (
                                    <div key={item.weekKey} className="rounded-xl border border-[var(--border)] px-3 py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                                {formatWeekKeyWithRange(item.weekKey)}
                                            </p>
                                            <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] truncate">
                                                {item.title || '経路の場合の数'}
                                            </p>
                                        </div>
                                        <Link to={`/admin/weekly-math?week=${encodeURIComponent(item.weekKey)}`}>
                                            <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); handleEditFromLatest(item.weekKey); }}>
                                                編集
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div ref={setEditorAnchor} />
                <Card variant="glass">
                    <CardContent className="p-6 space-y-5">
                        {loadingProblem ? (
                            <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">読み込み中...</p>
                        ) : !formOpen ? (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                                <h2 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">問題を追加</h2>
                                <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4">
                                    新しい週の問題を作るときは、ここから入力フォームを開いてください。
                                </p>
                                <Button onClick={startNewCreate} className="rounded-full">
                                    <Plus className="w-4 h-4" />
                                    新規作成
                                </Button>
                            </div>
                        ) : (
                            <>
                                <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                    LaTeX記法に対応しています。インラインは <code>$x^2 + y^2$</code>、別行表示は <code>$$\\int_0^1 x^2 dx$$</code> の形式で入力してください。
                                </p>
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                                    <p className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                                        編集画面です。プレビューから来た場合は対象の内容が自動入力されています。
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={fillFromExisting}
                                            disabled={!existingProblem}
                                        >
                                            保存済みを再読み込み
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFormOpen(false)}
                                        >
                                            閉じる
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        {existingProblem
                                            ? `保存済みデータあり（${formatWeekKeyWithRange(targetWeekKey)}）`
                                            : `保存済みデータなし（${formatWeekKeyWithRange(targetWeekKey)}）`}
                                    </p>
                                    {existingProblem && formatUpdatedAtLabel(existingProblem.updatedAt) && (
                                        <p className="mt-1 text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                            最終更新: {formatUpdatedAtLabel(existingProblem.updatedAt)}
                                        </p>
                                    )}
                                </div>
                                <Input
                                    label="週キー（追加/編集対象）"
                                    placeholder="例: 2026-W14"
                                    value={targetWeekKey}
                                    onChange={(e) => setTargetWeekKey(e.target.value)}
                                />
                                <Input
                                    label="タイトル"
                                    placeholder="例: 経路の場合の数"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                                <Input label="期間メモ（任意）" placeholder="例: 4/8〜4/14 掲載分" value={periodMemo} onChange={(e) => setPeriodMemo(e.target.value)} />
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
                                <div className="pt-2">
                                    <Button variant="ghost" onClick={runDiagnostic} isLoading={runningDiagnostic}>
                                        接続診断を実行
                                    </Button>
                                    {diagnosticResult && (
                                        <p className="mt-2 text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] break-all">
                                            {diagnosticResult}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
