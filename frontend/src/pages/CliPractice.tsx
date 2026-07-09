import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Keyboard,
    Route,
    ShieldCheck,
} from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { CommandSearch } from '@/components/cli-practice/CommandSearch';
import { DeployPreview } from '@/components/cli-practice/DeployPreview';
import { FileTreePanel } from '@/components/cli-practice/FileTreePanel';
import { TutorialPanel } from '@/components/cli-practice/TutorialPanel';
import { Terminal, useCliState, type TerminalHandle } from '@/components/cli-practice/Terminal';
import { getCurrentMilestone } from '@/components/cli-practice/learningContent';
import { useTutorialProgress } from '@/components/cli-practice/useTutorialProgress';

export function CliPracticePage() {
    const [state, setState] = useCliState();
    const terminalRef = useRef<TerminalHandle>(null);

    const {
        stepIndex,
        completed,
        lastFeedback,
        handleTutorialEvent,
        handleAdvanceIntro,
        handleSkip,
        handleGoBack,
        handleSyncEnvironment,
        handleRestart,
    } = useTutorialProgress(terminalRef, setState);

    const handleInsertCommand = (command: string) => {
        terminalRef.current?.setInput(command);
    };

    const currentMilestone = getCurrentMilestone(stepIndex, completed);

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] dark:bg-[#000] dark:text-[#F5F5F7]">
            <PageSeo
                title="コマンドライン練習 | TTI Intelligence"
                description="初めてでも迷わず完走できる、ブラウザ内のコマンドライン練習環境です。git・npm・デプロイの流れを安全に体験できます。"
            />

            <section className="relative overflow-hidden border-b border-black/5 bg-white dark:border-white/10 dark:bg-[#050505]">
                <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                    <Link
                        to="/app"
                        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#0066CC] hover:underline dark:text-[#2997FF]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        アプリに戻る
                    </Link>

                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
                        <div>
                            <p className="mb-3 text-sm font-semibold text-[#86868B] dark:text-[rgba(235,235,245,0.55)]">
                                CLI Practice
                            </p>
                            <h1 className="apple-hero mb-5 max-w-3xl">
                                コマンドライン練習
                            </h1>
                            <p className="apple-body max-w-2xl leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.68)]">
                                左のチュートリアルを読みながら、中央のターミナルでコマンドを試します。ファイル作成、HTML編集、Git、npm、公開までをブラウザ内で安全に練習できます。
                            </p>
                        </div>

                        <aside className="flex flex-col rounded-[28px] border border-black/5 bg-[#F5F5F7] p-5 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#2997FF]/12 dark:text-[#5AC8FA]">
                                    <Route className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
                                        {currentMilestone.currentLabel}
                                    </p>
                                    <h2 className="mt-1 text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                                        {currentMilestone.chapter}
                                    </h2>
                                    <p className="mt-1 text-sm leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.65)]">
                                        {currentMilestone.title}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
                                <p className="text-xs font-semibold text-[#007AFF] dark:text-[#5AC8FA]">
                                    次にやること
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-[#1D1D1F] dark:text-[rgba(235,235,245,0.82)]">
                                    {currentMilestone.nextAction}
                                </p>
                            </div>

                            <div className="pt-5">
                                <div className="flex items-center gap-2 text-xs leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.58)]">
                                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#30D158]" />
                                    実際のPCやGitHubには影響しない安全なデモ環境です。
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-[#007AFF] dark:text-[#5AC8FA]">
                            Practice workspace
                        </p>
                        <h2 className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            左の手順を読み、中央のターミナルで試す
                        </h2>
                    </div>
                    <p className="max-w-lg text-sm leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.62)]">
                        青いボタンでコマンドを入力し、Enter で実行します。詰まったら「困ったとき」から再現・戻る・スキップを選べます。
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(200px,240px)] lg:items-stretch">
                    <div className="order-1 min-h-0 lg:order-none">
                        <TutorialPanel
                            layout="sidebar"
                            stepIndex={stepIndex}
                            completed={completed}
                            lastFeedback={lastFeedback}
                            onInsertCommand={handleInsertCommand}
                            onAdvance={handleAdvanceIntro}
                            onSkip={handleSkip}
                            onGoBack={handleGoBack}
                            onSyncEnvironment={handleSyncEnvironment}
                            canSyncEnvironment={stepIndex > 0 && !completed}
                            onRestart={handleRestart}
                        />
                    </div>

                    <div className="order-2 min-w-0 lg:order-none">
                        <Terminal
                            ref={terminalRef}
                            state={state}
                            onStateChange={setState}
                            onTutorialEvent={handleTutorialEvent}
                        />
                    </div>

                    <div className="order-3 min-h-0 lg:order-none">
                        <FileTreePanel state={state} />
                    </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
                    <DeployPreview state={state} />
                    <CommandSearch onInsertCommand={handleInsertCommand} />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[20px] border border-black/5 bg-white px-5 py-4 text-sm text-[#6E6E73] dark:border-white/10 dark:bg-[#111113] dark:text-[rgba(235,235,245,0.6)]">
                    <Keyboard className="h-4 w-4 shrink-0 text-[#86868B]" />
                    <span><strong className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Tab</strong> — コマンド補完</span>
                    <span className="hidden sm:inline text-[#D2D2D7] dark:text-white/20">|</span>
                    <span><strong className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">↑ ↓</strong> — 履歴</span>
                    <span className="hidden sm:inline text-[#D2D2D7] dark:text-white/20">|</span>
                    <span><strong className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">search / man</strong> — ターミナル内検索</span>
                    <span className="hidden sm:inline text-[#D2D2D7] dark:text-white/20">|</span>
                    <span><strong className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">help</strong> — 全コマンド一覧</span>
                </div>
            </section>
        </div>
    );
}
