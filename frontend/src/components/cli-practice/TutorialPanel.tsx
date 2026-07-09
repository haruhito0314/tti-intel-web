import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, Circle, HelpCircle, RotateCcw, Terminal } from 'lucide-react';
import { NEXT_ACTIONS, getCurrentMilestone } from './learningContent';
import { TUTORIAL_CHAPTERS, TUTORIAL_STEPS, type TutorialStep } from './tutorialSteps';
import { STEP_STUCK_TIPS } from './tutorialRecovery';

const PANEL_HEIGHT = 'h-[min(520px,70vh)] max-h-[520px]';

interface TutorialPanelProps {
    layout?: 'default' | 'sidebar';
    stepIndex: number;
    completed: boolean;
    lastFeedback: 'success' | 'error' | 'info' | null;
    onInsertCommand: (command: string) => void;
    onAdvance?: () => void;
    onSkip?: () => void;
    onGoBack?: () => void;
    onSyncEnvironment?: () => void;
    onRestart?: () => void;
    canSyncEnvironment?: boolean;
}

export function TutorialPanel({
    layout = 'default',
    stepIndex,
    completed,
    lastFeedback,
    onInsertCommand,
    onAdvance,
    onSkip,
    onGoBack,
    onSyncEnvironment,
    onRestart,
    canSyncEnvironment = false,
}: TutorialPanelProps) {
    const [helpOpen, setHelpOpen] = useState(false);
    const step = TUTORIAL_STEPS[stepIndex];
    const progress = completed ? 100 : Math.round((stepIndex / TUTORIAL_STEPS.length) * 100);
    const isSidebar = layout === 'sidebar';
    const milestone = getCurrentMilestone(stepIndex, completed);

    const chapterProgress = useMemo(() => {
        return TUTORIAL_CHAPTERS.map((chapter) => {
            const steps = TUTORIAL_STEPS.filter((s) => s.chapter === chapter);
            const done = steps.filter((s) => {
                const idx = TUTORIAL_STEPS.indexOf(s);
                return idx < stepIndex || completed;
            }).length;
            return { chapter, done, total: steps.length };
        });
    }, [stepIndex, completed]);

    if (completed) {
        return (
            <div className={`flex ${PANEL_HEIGHT} flex-col overflow-hidden rounded-[24px] border border-black/5 bg-white dark:border-white/10 dark:bg-[#111113]`}>
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#30D158]/15">
                        <CheckCircle2 className="h-8 w-8 text-[#30D158]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">チュートリアル完了！</h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                        基本操作からファイル作成・編集、Git・デプロイまで体験できました。自由にコマンドを試してみましょう。
                    </p>
                    {onRestart && (
                        <button
                            type="button"
                            onClick={onRestart}
                            className="mt-6 rounded-xl bg-[#007AFF]/10 px-4 py-2 text-sm font-medium text-[#007AFF] hover:bg-[#007AFF]/20 dark:text-[#5AC8FA]"
                        >
                            もう一度最初から
                        </button>
                    )}
                    <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-[#86868B]">
                        最初からやり直すと、作成したフォルダやファイルも消えます。
                    </p>
                    <div className="mt-6 w-full max-w-sm border-t border-black/5 pt-4 dark:border-white/10">
                        <p className="text-xs font-semibold text-[#86868B]">復習に使えるコマンド</p>
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                            {NEXT_ACTIONS.map((action) => (
                                <button
                                    key={action.command}
                                    type="button"
                                    onClick={() => onInsertCommand(action.command)}
                                    className="rounded-full bg-[#F5F5F7] px-3 py-1 font-mono text-[11px] text-[#007AFF] hover:bg-[#007AFF]/10 dark:bg-white/[0.06] dark:text-[#5AC8FA]"
                                >
                                    {action.command}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!step) return null;

    return (
        <div className={`flex ${PANEL_HEIGHT} flex-col overflow-hidden rounded-[24px] border border-black/5 bg-white dark:border-white/10 dark:bg-[#111113]`}>
            <div className={`shrink-0 border-b border-black/5 dark:border-white/10 ${isSidebar ? 'px-3 py-3' : 'px-4 py-4'}`}>
                <div className={`flex items-center justify-between gap-2 ${isSidebar ? 'mb-2' : 'mb-3'}`}>
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 shrink-0 text-[#007AFF] dark:text-[#5AC8FA]" />
                        <h3 className={`font-semibold ${isSidebar ? 'text-sm' : 'text-base'}`}>チュートリアル</h3>
                    </div>
                    <span className="shrink-0 text-xs text-[#86868B]">
                        {stepIndex + 1} / {TUTORIAL_STEPS.length}
                    </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#F5F5F7] dark:bg-white/10">
                    <div
                        className="h-full rounded-full bg-[#007AFF] transition-all duration-300 dark:bg-[#2997FF]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                {!isSidebar && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {chapterProgress.map(({ chapter, done, total }) => (
                            <span
                                key={chapter}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    done === total
                                        ? 'bg-[#30D158]/15 text-[#248A3D] dark:text-[#30D158]'
                                        : done > 0
                                          ? 'bg-[#007AFF]/10 text-[#007AFF] dark:text-[#5AC8FA]'
                                          : 'bg-[#F5F5F7] text-[#86868B] dark:bg-white/5'
                                }`}
                            >
                                {chapter}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className={`min-h-0 flex-1 overflow-y-auto ${isSidebar ? 'p-3' : 'p-4'}`}>
                <StepContent
                    step={step}
                    feedback={lastFeedback}
                    nextAction={milestone.nextAction}
                    compact={isSidebar}
                />
            </div>

            <div className={`shrink-0 space-y-2 border-t border-black/5 dark:border-white/10 ${isSidebar ? 'p-3' : 'p-4'}`}>
                {step.kind === 'intro' && onAdvance && (
                    <button
                        type="button"
                        onClick={onAdvance}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007AFF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0066CC] dark:bg-[#2997FF]"
                    >
                        はじめる
                        <ChevronRight className="h-4 w-4" />
                    </button>
                )}
                {step.suggestedCommand && step.kind === 'command' && (
                    <button
                        type="button"
                        onClick={() => onInsertCommand(step.suggestedCommand!)}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#007AFF] font-medium text-white hover:bg-[#0066CC] dark:bg-[#2997FF] dark:hover:bg-[#1a7ee6] ${
                            isSidebar ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
                        }`}
                    >
                        <Terminal className="h-4 w-4 shrink-0" />
                        {isSidebar ? (
                            <>入力: <span className="font-mono">{step.suggestedCommand}</span></>
                        ) : (
                            <>ターミナルに入力: {step.suggestedCommand}</>
                        )}
                    </button>
                )}
                {step.kind === 'editor' && step.sampleContent && (
                    <div className="rounded-xl bg-[#F5F5F7] p-3 dark:bg-white/[0.04]">
                        <p className="mb-2 text-[11px] font-medium text-[#86868B]">書き込む例（コピー可）</p>
                        <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-[#1D1D1F] dark:text-[#E5E5EA]">
                            {step.sampleContent}
                        </pre>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setHelpOpen((open) => !open)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border border-black/8 text-[#6E6E73] hover:bg-black/[0.03] dark:border-white/10 dark:text-[rgba(235,235,245,0.65)] dark:hover:bg-white/[0.04] ${
                        isSidebar ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'
                    }`}
                >
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    困ったとき
                </button>

                {helpOpen && (
                    <StuckHelp
                        step={step}
                        compact={isSidebar}
                        onGoBack={onGoBack}
                        onSyncEnvironment={onSyncEnvironment}
                        onSkip={onSkip}
                        canGoBack={stepIndex > 0}
                        canSkip={stepIndex < TUTORIAL_STEPS.length - 1}
                        canSyncEnvironment={canSyncEnvironment}
                    />
                )}
            </div>
        </div>
    );
}

function StepContent({
    step,
    feedback,
    nextAction,
    compact = false,
}: {
    step: TutorialStep;
    feedback: 'success' | 'error' | 'info' | null;
    nextAction: string;
    compact?: boolean;
}) {
    return (
        <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#007AFF] dark:text-[#5AC8FA]">
                {step.chapter}
            </p>
            <h4 className={`mt-1 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] ${compact ? 'text-base' : 'text-lg'}`}>
                {step.title}
            </h4>
            <p className={`mt-2 leading-relaxed text-[#1D1D1F] dark:text-[rgba(235,235,245,0.85)] ${compact ? 'text-xs' : 'text-sm'}`}>
                {step.description}
            </p>
            <div className={`rounded-xl border border-[#30D158]/20 bg-[#30D158]/8 dark:border-[#30D158]/25 dark:bg-[#30D158]/10 ${compact ? 'mt-3 p-2.5' : 'mt-4 p-3'}`}>
                <p className="text-[11px] font-semibold text-[#248A3D] dark:text-[#30D158]">次にやること</p>
                <p className={`mt-1 leading-relaxed text-[#1D1D1F] dark:text-[rgba(235,235,245,0.82)] ${compact ? 'text-[11px]' : 'text-xs'}`}>
                    {nextAction}
                </p>
            </div>
            <div className={`rounded-xl border border-[#007AFF]/15 bg-[#007AFF]/5 dark:border-[#2997FF]/20 dark:bg-[#2997FF]/8 ${compact ? 'mt-3 p-2.5' : 'mt-4 p-3'}`}>
                <p className="text-[11px] font-semibold text-[#007AFF] dark:text-[#5AC8FA]">なぜ必要？</p>
                <p className={`mt-1 leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.62)] ${compact ? 'text-[11px]' : 'text-xs'}`}>
                    {step.why}
                </p>
            </div>
            {step.editorHint && (
                <p className="mt-3 text-xs text-[#FF9F0A]">{step.editorHint}</p>
            )}
            {feedback === 'success' && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#30D158]/12 px-3 py-2 text-sm text-[#248A3D] dark:text-[#30D158]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    正解です！次のステップに進みます
                </div>
            )}
            {feedback === 'error' && step.kind === 'command' && (
                <div className="mt-4 rounded-xl bg-[#FF453A]/10 px-3 py-2 text-sm text-[#FF453A]">
                    まだこのステップは完了していません。表示されているコマンドを実行してみてください。
                </div>
            )}
            {feedback === 'error' && step.kind === 'editor' && (
                <div className="mt-4 rounded-xl bg-[#FF453A]/10 px-3 py-2 text-sm text-[#FF453A]">
                    保存した内容を確認できませんでした。&lt;h1&gt; と &lt;p&gt; を含む HTML を書いて保存してください。
                </div>
            )}
        </div>
    );
}

function StuckHelp({
    step,
    compact,
    onGoBack,
    onSyncEnvironment,
    onSkip,
    canGoBack,
    canSkip,
    canSyncEnvironment,
}: {
    step: TutorialStep;
    compact: boolean;
    onGoBack?: () => void;
    onSyncEnvironment?: () => void;
    onSkip?: () => void;
    canGoBack: boolean;
    canSkip: boolean;
    canSyncEnvironment: boolean;
}) {
    const tips = STEP_STUCK_TIPS[step.id] ?? [];

    return (
        <div className={`space-y-2 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.04] ${compact ? 'p-2.5' : 'p-3'}`}>
            <p className={`font-medium text-[#1D1D1F] dark:text-[#F5F5F7] ${compact ? 'text-[11px]' : 'text-xs'}`}>
                うまく進まないとき
            </p>
            {tips.length > 0 ? (
                <ul className={`space-y-1.5 text-[#6E6E73] dark:text-[rgba(235,235,245,0.62)] ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                    {tips.map((tip) => (
                        <li key={tip} className="flex gap-1.5 leading-relaxed">
                            <span className="shrink-0 text-[#86868B]">•</span>
                            <span>{tip}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={`text-[#6E6E73] dark:text-[rgba(235,235,245,0.62)] ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                    表示どおりにコマンドを実行すると自動で進みます。うまくいかないときは下のボタンを使ってください。
                </p>
            )}

            <div className="flex flex-col gap-1.5 pt-1">
                {canSyncEnvironment && onSyncEnvironment && (
                    <button
                        type="button"
                        onClick={onSyncEnvironment}
                        className={`flex items-center justify-center gap-1.5 rounded-lg bg-[#FF9F0A]/12 px-3 py-1.5 font-medium text-[#C93400] hover:bg-[#FF9F0A]/20 dark:text-[#FF9F0A] ${compact ? 'text-[10px]' : 'text-xs'}`}
                    >
                        <RotateCcw className="h-3 w-3 shrink-0" />
                        ここまでのステップを再現する
                    </button>
                )}
                {onGoBack && canGoBack && (
                    <button
                        type="button"
                        onClick={onGoBack}
                        className={`rounded-lg px-3 py-1.5 text-[#6E6E73] hover:bg-black/[0.04] dark:text-[rgba(235,235,245,0.65)] dark:hover:bg-white/[0.06] ${compact ? 'text-[10px]' : 'text-xs'}`}
                    >
                        前のステップに戻る
                    </button>
                )}
                {onSkip && canSkip && (
                    <button
                        type="button"
                        onClick={onSkip}
                        className={`rounded-lg px-3 py-1.5 text-[#86868B] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${compact ? 'text-[10px]' : 'text-xs'}`}
                    >
                        このステップをスキップ
                    </button>
                )}
            </div>
        </div>
    );
}

export function TutorialStepDots({ stepIndex, completed }: { stepIndex: number; completed: boolean }) {
    return (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {TUTORIAL_STEPS.map((s, i) => (
                <span key={s.id} className="shrink-0">
                    {i < stepIndex || completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#30D158]" />
                    ) : i === stepIndex ? (
                        <ChevronRight className="h-3.5 w-3.5 text-[#007AFF]" />
                    ) : (
                        <Circle className="h-3.5 w-3.5 text-[#D2D2D7] dark:text-white/20" />
                    )}
                </span>
            ))}
        </div>
    );
}
