import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Keyboard } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { CommandSearch } from '@/components/cli-practice/CommandSearch';
import { DeployPreview } from '@/components/cli-practice/DeployPreview';
import { FileTreePanel } from '@/components/cli-practice/FileTreePanel';
import { TutorialPanel } from '@/components/cli-practice/TutorialPanel';
import { Terminal, useCliState, type TerminalHandle } from '@/components/cli-practice/Terminal';
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

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] dark:bg-[#000] dark:text-[#F5F5F7]">
            <PageSeo
                title="コマンドライン練習 | TTI Intelligence"
                description="実際のターミナルに近い環境で、git・npm・デプロイの流れを初心者向けに練習できます。"
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

                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
                        <div>
                            <p className="mb-3 text-sm font-semibold text-[#86868B] dark:text-[rgba(235,235,245,0.55)]">
                                CLI Practice
                            </p>
                            <h1 className="apple-hero mb-5 max-w-3xl">
                                コマンドライン練習
                            </h1>
                            <p className="apple-body max-w-2xl leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.68)]">
                                実際の macOS ターミナルに近い操作感で、git や npm の一連の流れを練習できます。チュートリアル付きで、Tab キーの補完も使えます。
                            </p>
                        </div>

                        <div className="rounded-[28px] border border-black/5 bg-[#F5F5F7] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="flex items-start gap-3">
                                <Keyboard className="mt-0.5 h-5 w-5 shrink-0 text-[#86868B]" />
                                <div>
                                    <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">ブラウザ内の練習環境</p>
                                    <p className="mt-1 text-xs leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        ブラウザ内で動くターミナルです。Node.js は brew install node で入れ、ライブラリは npm install で入れる流れは実際の開発と同じです。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
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
