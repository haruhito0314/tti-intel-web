import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calculator, Plus, Save, Shield } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { deleteDoc, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, Button, Input, Textarea } from '@/components/ui';
import {
    DEFAULT_WEEKLY_MATH_TEMPLATE_KEY,
    getCurrentWeekKey,
    getDefaultWeeklyMathTemplate,
    getHomeWeeklyMathKey,
    getWeekDateRange,
    getWeeklyMath,
    getWeeklyMathList,
    setHomeWeeklyMathKey,
    type WeeklyMathProblem,
    upsertWeeklyMath,
} from '@/lib/weeklyMath';
import { useToast } from '@/components/ui/useToast';
import { auth, db } from '@/lib/firebase';
import { formatDateLabel, formatUpdatedAtLabel, formatWeekKeyWithRange } from '@/lib/dateFormat';
import { isValidWeeklyMathId, sortWeeklyMathProblemsNewestFirst } from '@/lib/weeklyMathIdentity';

export function AdminWeeklyMath() {
    const { user, isAdmin, loading } = useAuth();
    const { addToast } = useToast();
    const thisWeekKey = useMemo(() => getCurrentWeekKey(), []);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryWeekKey = searchParams.get('week')?.trim() || '';

    const [title, setTitle] = useState('');
    const [periodMemo, setPeriodMemo] = useState('');
    const [problem, setProblem] = useState('');
    const [problemPublished, setProblemPublished] = useState(true);
    const [hint, setHint] = useState('');
    const [answer, setAnswer] = useState('');
    const [explanation, setExplanation] = useState('');
    const [solutionPublished, setSolutionPublished] = useState(true);
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
    const [togglingPublishKey, setTogglingPublishKey] = useState<string | null>(null);
    const [latestSearchQuery, setLatestSearchQuery] = useState('');
    const [homeWeeklyMathKey, setHomeWeeklyMathKeyState] = useState<string>(DEFAULT_WEEKLY_MATH_TEMPLATE_KEY);
    const [settingHomeWeekKey, setSettingHomeWeekKey] = useState<string | null>(null);
    const weekRange = useMemo(() => getWeekDateRange(targetWeekKey), [targetWeekKey]);
    const [editorAnchor, setEditorAnchor] = useState<HTMLDivElement | null>(null);

    const handleGoBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate('/admin');
    };

    const buildLatestAndAllItems = (
        list: WeeklyMathProblem[],
        defaultTemplate: WeeklyMathProblem | null
    ): { latest: WeeklyMathProblem[]; all: WeeklyMathProblem[] } => {
        const filtered = sortWeeklyMathProblemsNewestFirst(
            list.filter((item) => item.weekKey !== DEFAULT_WEEKLY_MATH_TEMPLATE_KEY && item.weekKey !== 'diagnostic-test')
        );

        const latest = defaultTemplate
            ? [...filtered.slice(0, 5), defaultTemplate]
            : filtered.slice(0, 5);
        const all = defaultTemplate ? [...filtered, defaultTemplate] : filtered;
        return { latest, all };
    };

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
            const [list, defaultTemplate] = await Promise.all([
                getWeeklyMathList(200),
                getDefaultWeeklyMathTemplate(),
            ]);
            const built = buildLatestAndAllItems(list, defaultTemplate);
            setLatestItems(built.latest);
            setAllItems(built.all);
            try {
                const configuredHomeKey = await getHomeWeeklyMathKey();
                setHomeWeeklyMathKeyState(configuredHomeKey ?? DEFAULT_WEEKLY_MATH_TEMPLATE_KEY);
            } catch (error) {
                console.warn('Failed to load home weekly math key:', error);
                setHomeWeeklyMathKeyState(DEFAULT_WEEKLY_MATH_TEMPLATE_KEY);
            }
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
                const [data, list, defaultTemplate] = await Promise.all([
                    getWeeklyMath(targetWeekKey),
                    getWeeklyMathList(200),
                    getDefaultWeeklyMathTemplate(),
                ]);
                if (!mounted) return;
                setExistingProblem(data);
                const built = buildLatestAndAllItems(list, defaultTemplate);
                setLatestItems(built.latest);
                setAllItems(built.all);
                try {
                    const configuredHomeKey = await getHomeWeeklyMathKey();
                    if (mounted) setHomeWeeklyMathKeyState(configuredHomeKey ?? DEFAULT_WEEKLY_MATH_TEMPLATE_KEY);
                } catch (error) {
                    console.warn('Failed to load home weekly math key:', error);
                    if (mounted) setHomeWeeklyMathKeyState(DEFAULT_WEEKLY_MATH_TEMPLATE_KEY);
                }

                const shouldPrefillFromEditLink = Boolean(queryWeekKey) || forcePrefillOnLoad;
                if (shouldPrefillFromEditLink) {
                    const source = data;
                    if (source) {
                        setTitle(source.title ?? '');
                        setPeriodMemo(source.periodMemo ?? '');
                        setProblem(source.problem ?? '');
                        setProblemPublished(source.problemPublished ?? true);
                        setHint(source.hint ?? '');
                        setAnswer(source.answer ?? '');
                        setExplanation(source.explanation ?? '');
                        setSolutionPublished(source.solutionPublished ?? true);
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
        if (!isValidWeeklyMathId(normalizedWeekKey)) {
            addToast({
                type: 'warning',
                title: '問題IDの形式が不正です',
                message: '半角小文字・数字・ハイフンだけで入力してください（例: geometry-circle-chain）。',
            });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: title.trim() || '経路の場合の数',
                periodMemo: periodMemo.trim(),
                problem: problem.trim(),
                problemPublished,
                hint: hint.trim(),
                answer: answer.trim(),
                explanation: explanation.trim(),
                solutionPublished,
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
        setProblemPublished(existingProblem.problemPublished ?? true);
        setHint(existingProblem.hint ?? '');
        setAnswer(existingProblem.answer ?? '');
        setExplanation(existingProblem.explanation ?? '');
        setSolutionPublished(existingProblem.solutionPublished ?? true);
    };

    const startNewCreate = () => {
        setTargetWeekKey('');
        setTitle('');
        setPeriodMemo('');
        setProblem('');
        setProblemPublished(true);
        setHint('');
        setAnswer('');
        setExplanation('');
        setSolutionPublished(true);
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

    const handleTogglePublish = async (
        item: WeeklyMathProblem,
        field: 'problemPublished' | 'solutionPublished'
    ) => {
        if (!user || !isAdmin) return;

        const nextValue = !(item[field] ?? true);
        setTogglingPublishKey(`${item.weekKey}:${field}`);
        try {
            await upsertWeeklyMath(
                item.weekKey,
                {
                    title: item.title ?? '経路の場合の数',
                    periodMemo: item.periodMemo ?? '',
                    problem: item.problem ?? '',
                    problemPublished: field === 'problemPublished' ? nextValue : (item.problemPublished ?? true),
                    hint: item.hint ?? '',
                    answer: item.answer ?? '',
                    explanation: item.explanation ?? '',
                    solutionPublished: field === 'solutionPublished' ? nextValue : (item.solutionPublished ?? true),
                },
                user.email || 'unknown'
            );
            await loadLatestItems();
            if (existingProblem?.weekKey === item.weekKey) {
                setExistingProblem((prev) => prev ? ({
                    ...prev,
                    problemPublished: field === 'problemPublished' ? nextValue : (prev.problemPublished ?? true),
                    solutionPublished: field === 'solutionPublished' ? nextValue : (prev.solutionPublished ?? true),
                }) : prev);
                if (field === 'problemPublished') setProblemPublished(nextValue);
                if (field === 'solutionPublished') setSolutionPublished(nextValue);
            }
            addToast({
                type: 'success',
                title: '公開設定を更新しました',
                message: `${item.weekKey} の${field === 'problemPublished' ? '問題' : '解答・解説'}を${nextValue ? '公開' : '非公開'}にしました。`,
            });
        } catch (error) {
            const detail = error instanceof FirebaseError
                ? `${error.code}${error.message ? `: ${error.message}` : ''}`
                : '不明なエラー';
            addToast({
                type: 'error',
                title: '公開設定の更新に失敗しました',
                message: `権限または通信状態を確認してください。（${detail}）`,
            });
        } finally {
            setTogglingPublishKey(null);
        }
    };

    const handleSetHomeWeeklyMath = async (item: WeeklyMathProblem) => {
        if (!user || !isAdmin) return;
        if (!(item.problemPublished ?? true)) {
            addToast({
                type: 'warning',
                title: 'ホーム表示に設定できません',
                message: '問題が非公開のため、ホームには表示できません。先に問題を公開してください。',
            });
            return;
        }
        setSettingHomeWeekKey(item.weekKey);
        try {
            await setHomeWeeklyMathKey(item.weekKey, user.email || 'unknown');
            setHomeWeeklyMathKeyState(item.weekKey);
            addToast({
                type: 'success',
                title: 'ホーム表示を更新しました',
                message: `${item.weekKey} をホーム表示に設定しました。`,
            });
        } catch (error) {
            const detail = error instanceof FirebaseError
                ? `${error.code}${error.message ? `: ${error.message}` : ''}`
                : '不明なエラー';
            addToast({
                type: 'error',
                title: 'ホーム表示の更新に失敗しました',
                message: `権限または通信状態を確認してください。（${detail}）`,
            });
        } finally {
            setSettingHomeWeekKey(null);
        }
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

    const searchedItems = useMemo(() => {
        const q = latestSearchQuery.trim().toLowerCase();
        if (!q) return [];
        return allItems.filter((item) => {
            const weekKey = item.weekKey?.toLowerCase() ?? '';
            const titleText = item.title?.toLowerCase() ?? '';
            const memoText = item.periodMemo?.toLowerCase() ?? '';
            return weekKey.includes(q) || titleText.includes(q) || memoText.includes(q);
        });
    }, [allItems, latestSearchQuery]);


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
            const adminEmail = (currentUser.email || 'unknown').trim().toLowerCase();
            const adminPath = `admins/${adminEmail}`;
            let adminRead = 'NG';
            let adminDocExists = 'unknown';
            try {
                const adminSnap = await getDoc(doc(db, 'admins', adminEmail));
                adminRead = 'OK';
                adminDocExists = adminSnap.exists() ? 'YES' : 'NO';
            } catch {
                adminRead = 'NG';
                adminDocExists = 'unknown';
            }

            let weeklyMathWrite = 'NG';
            let weeklyMathRead = 'NG';
            let weeklyMathWriteErr = '';

            try {
                await getDoc(doc(db, 'weeklyMath', 'diagnostic-test'));
                weeklyMathRead = 'OK';
            } catch (e) {
                const err = e as { code?: string; message?: string };
                weeklyMathRead = `NG(${err.code ?? 'unknown'})`;
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

            if (weeklyMathWrite === 'OK') {
                setDiagnosticResult(
                    `OK: weeklyMath書き込み成功 / envProjectId=${envProjectId} / appProjectId=${appProjectId} / db=${dbName} / email=${currentUser.email} / uid=${currentUser.uid} / tokenEmail=${token.claims.email ?? '(none)'} / read(${adminPath})=${adminRead} / exists(${adminPath})=${adminDocExists} / read(weeklyMath/diagnostic-test)=${weeklyMathRead} / write(weeklyMath/diagnostic-test)=${weeklyMathWrite}`
                );
            } else {
                setDiagnosticResult(
                    `NG: weeklyMath書き込み失敗 / envProjectId=${envProjectId} / appProjectId=${appProjectId} / db=${dbName} / email=${currentUser.email} / uid=${currentUser.uid} / tokenEmail=${token.claims.email ?? '(none)'} / read(${adminPath})=${adminRead} / exists(${adminPath})=${adminDocExists} / read(weeklyMath/diagnostic-test)=${weeklyMathRead} / write(weeklyMath/diagnostic-test)=${weeklyMathWrite}${weeklyMathWriteErr ? `(${weeklyMathWriteErr})` : ''}`
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
                    <button
                        type="button"
                        onClick={handleGoBack}
                        className="inline-flex items-center gap-2 text-[#0066CC] dark:text-[#2997FF] hover:underline mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        1つ戻る
                    </button>
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
                                問題ID: {targetWeekKey || '未入力'}
                            </p>
                            {weekRange && (
                                <p className="apple-footnote mt-1 text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                    表示期間（目安）: {formatDateLabel(weekRange.start)} 〜 {formatDateLabel(weekRange.end)}
                                </p>
                            )}
                            <div className="mt-4">
                                <div className="flex flex-wrap gap-2">
                                    <Link to="/admin/weekly-math/preview">
                                        <Button variant="outline" size="sm" className="rounded-full">
                                            保存済み問題のプレビューを開く
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Link to={`/weekly-math/${encodeURIComponent(targetWeekKey)}`}>
                                        <Button variant="outline" size="sm" className="rounded-full">
                                            問題ページを確認
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Link to={`/weekly-math/${encodeURIComponent(targetWeekKey)}/solution`}>
                                        <Button variant="outline" size="sm" className="rounded-full">
                                            解答・解説ページを確認
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                </div>
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
                                最新5件
                            </h2>
                            <Link to="/admin/weekly-math/preview">
                                <Button variant="outline" size="sm" className="rounded-full">一覧を見る</Button>
                            </Link>
                        </div>
                        <Input
                            placeholder="問題ID・タイトル・期間メモで検索（全履歴）"
                            value={latestSearchQuery}
                            onChange={(e) => setLatestSearchQuery(e.target.value)}
                            className="mb-3"
                        />
                        {latestSearchQuery.trim() ? (
                            <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-3">
                                検索結果: {searchedItems.length}件（対象: 過去の問題すべて）
                            </p>
                        ) : null}
                        {(latestSearchQuery.trim() ? searchedItems : latestItems).length === 0 ? (
                            <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                {latestSearchQuery.trim() ? '一致する問題が見つかりません。' : 'まだ保存された問題がありません。'}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {(latestSearchQuery.trim() ? searchedItems : latestItems).map((item) => (
                                    <div key={item.weekKey} className="rounded-xl border border-[var(--border)] px-3 py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                                {formatWeekKeyWithRange(item.weekKey)}
                                            </p>
                                            <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] truncate">
                                                {item.title || '経路の場合の数'}
                                            </p>
                                            <p className="mt-1 text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] truncate">
                                                問題: {(item.problemPublished ?? true) ? '公開' : '非公開'} / 解答・解説: {(item.solutionPublished ?? true) ? '公開' : '非公開'}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    isLoading={togglingPublishKey === `${item.weekKey}:problemPublished`}
                                                    onClick={() => handleTogglePublish(item, 'problemPublished')}
                                                >
                                                    問題を{(item.problemPublished ?? true) ? '非公開' : '公開'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    isLoading={togglingPublishKey === `${item.weekKey}:solutionPublished`}
                                                    onClick={() => handleTogglePublish(item, 'solutionPublished')}
                                                >
                                                    解答・解説を{(item.solutionPublished ?? true) ? '非公開' : '公開'}
                                                </Button>
                                                <Button
                                                    variant={homeWeeklyMathKey === item.weekKey ? 'primary' : 'outline'}
                                                    size="sm"
                                                    isLoading={settingHomeWeekKey === item.weekKey}
                                                    onClick={() => handleSetHomeWeeklyMath(item)}
                                                    disabled={homeWeeklyMathKey === item.weekKey || !(item.problemPublished ?? true)}
                                                >
                                                    {homeWeeklyMathKey === item.weekKey
                                                        ? 'ホームに表示中'
                                                        : (item.problemPublished ?? true)
                                                            ? 'ホームに表示する'
                                                            : '問題を公開すると設定可能'}
                                                </Button>
                                            </div>
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
                                    新しい問題を作るときは、ここから入力フォームを開いてください。
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
                                    label="問題ID（追加/編集対象）"
                                    placeholder="例: geometry-circle-chain"
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
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-[var(--border)]"
                                            checked={solutionPublished}
                                            onChange={(e) => setSolutionPublished(e.target.checked)}
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                                                解答・解説ページを公開する
                                            </p>
                                            <p className="text-xs text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                                OFF の場合、問題ページから解答ページへ進めなくなります。
                                            </p>
                                        </div>
                                    </label>
                                </div>
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
