import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { ColorSortBoard } from '@/components/color-sort/ColorSortBoard';
import { ColorSortControls } from '@/components/color-sort/ColorSortControls';
import { PUZZLE_MODE_CONFIGS } from '@/components/color-sort/config';
import { createPuzzleGenerationClient } from '@/components/color-sort/generationClient';
import { createPuzzleSeed } from '@/components/color-sort/generator';
import {
    canPour,
    clonePuzzle,
    countCompletedBottles,
    isCompletedBottle,
    isSolved,
    pourBottle,
} from '@/components/color-sort/game';
import { shareResult } from '@/components/color-sort/share';
import type { Puzzle, PuzzleMode, PuzzlePhase } from '@/components/color-sort/types';
import { Button, Dialog } from '@/components/ui';

type PendingAction = 'reset' | 'new' | 'mode';

export function ColorSortPuzzlePage() {
    const [mode, setMode] = useState<PuzzleMode>('normal');
    const config = PUZZLE_MODE_CONFIGS[mode];
    const [phase, setPhase] = useState<PuzzlePhase>('generating');
    const [puzzleNumber, setPuzzleNumber] = useState(1);
    const [initialPuzzle, setInitialPuzzle] = useState<Puzzle>([]);
    const [puzzle, setPuzzle] = useState<Puzzle>([]);
    const [history, setHistory] = useState<Puzzle[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [status, setStatus] = useState('問題を準備中です。');
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [resultOpen, setResultOpen] = useState(false);
    const generatorRef = useRef(createPuzzleGenerationClient());

    const startPuzzle = useCallback(async (nextMode: PuzzleMode, advanceNormalNumber = false) => {
        setPhase('generating');
        setSelectedIndex(null);
        setResultOpen(false);
        setStatus('問題を準備中です。');

        try {
            const outcome = await generatorRef.current.generate(nextMode, createPuzzleSeed());
            setMode(nextMode);
            if (nextMode === 'normal' && advanceNormalNumber) {
                setPuzzleNumber((value) => value + 1);
            }
            setInitialPuzzle(clonePuzzle(outcome.puzzle));
            setPuzzle(clonePuzzle(outcome.puzzle));
            setHistory([]);
            setStatus(outcome.usedFallback ? '安全な予備問題を読み込みました。' : 'ボトルを選んでください。');
            setPhase('playing');
        } catch (error) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                setStatus('問題の準備に失敗しました。もう一度お試しください。');
            }
        }
    }, []);

    useEffect(() => {
        const generator = generatorRef.current;
        let mounted = true;
        queueMicrotask(() => {
            if (mounted) void startPuzzle('normal');
        });
        return () => {
            mounted = false;
            generator.cancel();
        };
    }, [startPuzzle]);

    const legalTargets = useMemo(() => (
        selectedIndex === null
            ? []
            : puzzle
                .map((_, index) => index)
                .filter((index) => canPour(puzzle, selectedIndex, index, config.capacity))
    ), [config.capacity, puzzle, selectedIndex]);

    const handleBottleClick = (index: number) => {
        if (phase !== 'playing') return;

        const bottle = puzzle[index];
        if (!bottle || isCompletedBottle(bottle, config.capacity)) return;

        if (selectedIndex === null) {
            if (bottle.length > 0) {
                setSelectedIndex(index);
                setStatus('注ぎ先を選んでください。');
            }
            return;
        }

        if (selectedIndex === index) {
            setSelectedIndex(null);
            setStatus('選択を解除しました。');
            return;
        }

        if (!canPour(puzzle, selectedIndex, index, config.capacity)) {
            if (bottle.length > 0) {
                setSelectedIndex(index);
                setStatus('移動元を変更しました。');
            } else {
                setStatus('同じ色の上、または空のボトルにだけ注げます。');
            }
            return;
        }

        const next = pourBottle(puzzle, selectedIndex, index, config.capacity);
        setHistory((entries) => [...entries, clonePuzzle(puzzle)]);
        setPuzzle(next);
        setSelectedIndex(null);

        if (isSolved(next, config.capacity)) {
            setPhase('solved');
            setResultOpen(true);
            setStatus('完成しました。');
        } else {
            setStatus('移動しました。');
        }
    };

    const undo = () => {
        const previous = history.at(-1);
        if (!previous) return;

        setPuzzle(clonePuzzle(previous));
        setHistory((entries) => entries.slice(0, -1));
        setSelectedIndex(null);
        setResultOpen(false);
        setPhase('playing');
        setStatus('1手戻しました。');
    };

    const executeAction = (action: PendingAction) => {
        if (action === 'reset') {
            setPuzzle(clonePuzzle(initialPuzzle));
            setHistory([]);
            setSelectedIndex(null);
            setResultOpen(false);
            setPhase('playing');
            setStatus('ボトルを選んでください。');
            return;
        }

        if (action === 'new') {
            void startPuzzle(mode, mode === 'normal');
            return;
        }

        const nextMode: PuzzleMode = mode === 'normal' ? 'star' : 'normal';
        void startPuzzle(nextMode, nextMode === 'normal');
    };

    const requestAction = (action: PendingAction) => {
        if (history.length > 0 && phase !== 'solved') {
            setPendingAction(action);
            return;
        }

        executeAction(action);
    };

    const confirmAction = () => {
        const action = pendingAction;
        setPendingAction(null);
        if (action) executeAction(action);
    };

    const handleShare = () => {
        void shareResult({ puzzle, moves: history.length, config });
    };

    const completedBottleCount = countCompletedBottles(puzzle, config.capacity);
    const heading = phase === 'generating'
        ? '問題を準備中'
        : phase === 'solved'
          ? '完成しました'
          : selectedIndex === null
            ? 'ボトルを選択'
            : '注ぎ先を選択';

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] dark:bg-[#000] dark:text-[#F5F5F7]">
            <PageSeo
                title="カラーソートパズル | TTI Intelligence"
                description="透明なボトルの色を揃える、TTI Intelligenceのミニパズルアプリです。"
            />
            <section className="relative overflow-hidden border-b border-black/5 bg-white dark:border-white/10 dark:bg-[#050505]">
                <div className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                    <Link
                        to="/app"
                        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#0066CC] hover:underline dark:text-[#2997FF]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        アプリに戻る
                    </Link>

                    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)] lg:items-end">
                        <div>
                            <p className="mb-3 text-sm font-semibold text-[#86868B] dark:text-[rgba(235,235,245,0.55)]">
                                Color Sort Puzzle
                            </p>
                            <h1 className="apple-hero mb-5 max-w-3xl">
                                カラーソートパズル
                            </h1>
                            <p className="apple-body max-w-2xl leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.68)]">
                                ボトルを選んで、同じ色だけを静かに注ぎ分けるパズルです。すべての色が美しく揃ったらクリア。
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 rounded-[28px] border border-black/5 bg-[#F5F5F7] p-3 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="rounded-[20px] bg-white px-4 py-4 text-center shadow-sm dark:bg-white/[0.06]">
                                <p className="text-xs text-[#86868B]">Moves</p>
                                <p data-stat="moves" className="mt-1 text-2xl font-semibold">{history.length}</p>
                            </div>
                            <div className="rounded-[20px] bg-white px-4 py-4 text-center shadow-sm dark:bg-white/[0.06]">
                                <p className="text-xs text-[#86868B]">Puzzle</p>
                                <p data-stat="puzzle" className="mt-1 text-2xl font-semibold">
                                    {mode === 'star' ? '★' : puzzleNumber}
                                </p>
                            </div>
                            <div className="rounded-[20px] bg-white px-4 py-4 text-center shadow-sm dark:bg-white/[0.06]">
                                <p className="text-xs text-[#86868B]">Completed</p>
                                <p data-stat="completed" className="mt-1 text-2xl font-semibold">{completedBottleCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                <div className="rounded-[32px] border border-black/5 bg-white/82 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] sm:p-8">
                    <div className="mb-6 h-[58px] overflow-hidden">
                        <h2 className="flex h-7 items-center gap-2 overflow-hidden text-xl font-semibold tracking-normal">
                            <span>{heading}</span>
                            {mode === 'star' && (
                                <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#FFD60A]/20 px-3 text-xs font-semibold text-[#7A5A00] dark:bg-[#FFD60A]/18 dark:text-[#FFD60A]">
                                    <Star className="h-3.5 w-3.5" />
                                    星モード
                                </span>
                            )}
                        </h2>
                        <p className="mt-1 h-5 truncate text-sm text-[#6E6E73] dark:text-[rgba(235,235,245,0.62)]">
                            {phase === 'solved' ? '整った色面が、なかなか気持ちいい。' : status}
                        </p>
                    </div>

                    <ColorSortBoard
                        puzzle={puzzle}
                        config={config}
                        selectedIndex={selectedIndex}
                        legalTargets={legalTargets}
                        status={status}
                        disabled={phase !== 'playing'}
                        onBottleClick={handleBottleClick}
                    />
                    <div className="mt-4" aria-hidden={resultOpen || undefined}>
                        <ColorSortControls
                            phase={phase}
                            moveCount={history.length}
                            starMode={mode === 'star'}
                            onUndo={undo}
                            onReset={() => requestAction('reset')}
                            onNewPuzzle={() => requestAction('new')}
                            onToggleStar={() => requestAction('mode')}
                            onShare={handleShare}
                        />
                    </div>
                </div>
            </section>

            <Dialog
                open={pendingAction !== null}
                onClose={() => setPendingAction(null)}
                title="現在の進捗を破棄しますか"
                description="この操作を続けると、現在の手順は失われます。"
            >
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" onClick={() => setPendingAction(null)}>
                        キャンセル
                    </Button>
                    <Button type="button" onClick={confirmAction}>
                        続ける
                    </Button>
                </div>
            </Dialog>

            <Dialog
                open={resultOpen}
                onClose={() => setResultOpen(false)}
                title="完成しました"
                description={`${history.length}手で色を揃えました。`}
            >
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" onClick={() => requestAction('new')}>
                        次の問題
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleShare}>
                        シェア
                    </Button>
                </div>
            </Dialog>
        </div>
    );
}
