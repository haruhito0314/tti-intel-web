import {
    ArrowRight,
    ArrowUpRight,
    Bot,
    Check,
    CheckCircle2,
    Cloud,
    Code2,
    Database,
    Globe2,
    Terminal,
} from 'lucide-react';
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
    type RefObject,
} from 'react';
import { Link } from 'react-router-dom';
import { siClaude, siCursor, siOpenai, siVercel, type SimpleIcon } from 'simple-icons';
import {
    CODEX_LAUNCH_CLICK_MS,
    codexLaunchState,
    codexWorkState,
    demoCursorTarget,
    ecosystemSurfaceHasFrame,
    ecosystemWindowScale,
    shouldShowCodexStory,
} from './developmentMotion';
import './DevelopmentExperience.css';

const HOME_PROMPT = 'サイトのHomeを、活動内容が一目で伝わる構成に作り直して';
const SERVER_PROMPT = 'ローカルサーバーを起動してプレビューを表示して';
const VERCEL_AUTOMATION_PROMPT = 'Vercelへ公開して';
const AWS_AUTOMATION_PROMPT = 'AWSへバックエンドをデプロイして';
const INTRO_TITLE = 'AIと作る開発へ';
const DEMO_PLAY_MS = 18_500;
const DEMO_HOLD_MS = 1_800;
const DEMO_RESET_MS = 650;
/** Codex and ecosystem meet at the same scroll boundary to avoid a dead gap. */
const CODEX_PHASE_END = 0.47;
const ECOSYSTEM_PHASE_START = 0.47;
const SAKURA_PETALS = [
    [6, 9.6, -2.1, 0.52], [13, 11.8, -7.4, 0.42], [21, 8.9, -4.6, 0.48],
    [29, 12.6, -10.2, 0.38], [38, 10.8, -1.8, 0.5], [47, 13.4, -8.7, 0.34],
    [57, 9.8, -5.5, 0.46], [65, 12.1, -11.5, 0.4], [73, 10.2, -3.4, 0.5],
    [81, 13.1, -9.3, 0.36], [89, 9.3, -6.1, 0.46], [95, 11.2, -12.4, 0.4],
] as const;

const PROJECTS = [
    {
        title: 'AI Assistant',
        body: 'サイトの公開情報を検索し、参照先を確かめたうえで回答する案内機能です。安全なリンクと一緒に情報を届けます。',
        path: '/app/ai-assistant',
        image: undefined,
    },
    {
        title: 'カラーソートパズル',
        body: '色の並び替えを楽しめるパズルです。直感的な操作で、空いた時間にすぐ遊べます。',
        path: '/app/color-sort',
        image: '/images/color-sort-puzzle.webp',
    },
    {
        title: '卓球組み合わせ表',
        body: '参加人数や台数に合わせ、偏りを抑えた対戦表をすぐに作れます。履歴の確認や印刷にも対応しています。',
        path: '/app/table-tennis',
        image: '/images/table-tennis-match-maker.webp',
    },
] as const;

type MotionStyle = CSSProperties & Record<`--${string}`, string | number>;

function clamp(value: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
    const t = clamp(value);
    return 1 - (1 - t) ** 3;
}

function easeInOutSmooth(value: number) {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
}

function useReducedMotion() {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    return reduced;
}

function useTypedIntroTitle(reducedMotion: boolean) {
    const characters = useMemo(() => Array.from(INTRO_TITLE), []);
    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        if (reducedMotion) return;

        const timers = characters.map((_, index) => window.setTimeout(
            () => setVisibleCount(index + 1),
            220 + index * 125,
        ));
        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [characters, reducedMotion]);

    return reducedMotion
        ? INTRO_TITLE
        : characters.slice(0, visibleCount).join('');
}

function useTrackProgress(ref: RefObject<HTMLElement | null>, reducedMotion: boolean) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (reducedMotion) return;

        let frame = 0;
        const update = () => {
            frame = 0;
            const node = ref.current;
            if (!node) return;
            const rect = node.getBoundingClientRect();
            const distance = Math.max(1, node.offsetHeight - window.innerHeight);
            setProgress(clamp(-rect.top / distance));
        };
        const requestUpdate = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', requestUpdate);
            window.removeEventListener('resize', requestUpdate);
        };
    }, [reducedMotion, ref]);

    return reducedMotion ? 0.32 : progress;
}

function useDemoTime(active: boolean, reducedMotion: boolean) {
    const [time, setTime] = useState(0);

    useEffect(() => {
        if (reducedMotion) return;
        // Retain the last rendered frame while the pinned stage hands off to
        // the next scene. Resetting here caused a visible snap at the boundary.
        if (!active) return;

        let frame = 0;
        let holdTimer = 0;
        let resetTimer = 0;
        let cancelled = false;

        const startCycle = () => {
            if (cancelled) return;
            const startedAt = performance.now();
            setTime(0);

            const tick = (now: number) => {
                if (cancelled) return;
                const elapsed = now - startedAt;
                if (elapsed < DEMO_PLAY_MS) {
                    setTime(elapsed);
                    frame = window.requestAnimationFrame(tick);
                    return;
                }

                setTime(DEMO_PLAY_MS);
                holdTimer = window.setTimeout(() => {
                    setTime(-1);
                    resetTimer = window.setTimeout(startCycle, DEMO_RESET_MS);
                }, DEMO_HOLD_MS);
            };

            frame = window.requestAnimationFrame(tick);
        };

        startCycle();
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(frame);
            window.clearTimeout(holdTimer);
            window.clearTimeout(resetTimer);
        };
    }, [active, reducedMotion]);

    if (reducedMotion) return 15_800;
    return active ? time : 0;
}

function typedText(text: string, time: number, start: number, duration: number) {
    if (time <= start) return '';
    const count = Math.floor(clamp((time - start) / duration) * text.length);
    return text.slice(0, count);
}

function demoStep(time: number) {
    if (time < 7_280) return 1;
    if (time < 8_250) return 2;
    if (time < 13_050) return 3;
    if (time < 15_720) return 4;
    return 5;
}

function isCursorClicking(time: number) {
    // Dwell briefly after the cursor settles, especially on Send.
    return [CODEX_LAUNCH_CLICK_MS, 5_250, 7_220, 10_700, 12_700, 15_350]
        .some((point) => Math.abs(time - point) < 120);
}

function BrandIcon({ icon }: { icon: SimpleIcon }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d={icon.path} />
        </svg>
    );
}

function BalancedJapaneseTitle({ text }: { text: string }) {
    const phrases = text.split('、');

    return phrases.map((phrase, index) => (
        <span className="dx-balanced-phrase" key={`${phrase}-${index}`}>
            {phrase}{index < phrases.length - 1 ? '、' : ''}
        </span>
    ));
}

function ToolLauncher({
    hidden,
    codexOpen,
    children,
}: {
    hidden: boolean;
    codexOpen: boolean;
    children: ReactNode;
}) {
    return (
        <div
            className={`dx-tool-launcher ${codexOpen ? 'is-opening' : ''} ${hidden ? 'is-hidden' : ''}`}
            aria-label="AI開発ツール"
        >
            {children}

            <section className="dx-launcher-terminal-screen dx-window-glass" aria-label="起動中のTerminal">
                <header>
                    <span className="dx-window-controls" aria-hidden="true"><i /><i /><i /></span>
                    <b>Terminal — web</b>
                </header>
                <div>
                    <code><span>$</span> npm run dev</code>
                    <p>VITE v7.3.1 ready in 428 ms</p>
                    <p>Local: http://127.0.0.1:5173/</p>
                    <code><span>$</span> git status --short</code>
                    <p className="is-changed">M src/pages/Home.tsx</p>
                </div>
            </section>

            <section className="dx-launcher-app-panel dx-window-glass" aria-label="アプリランチャー">
                <div className="dx-launcher-icon-grid">
                    <span
                        className={`dx-launcher-app dx-launcher-app--codex ${codexOpen ? 'is-open' : ''}`}
                        aria-label="Codex"
                    >
                        <i><BrandIcon icon={siOpenai} /></i>
                    </span>
                    <span className="dx-launcher-app dx-launcher-app--claude" aria-label="Claude Code">
                        <i><BrandIcon icon={siClaude} /></i>
                    </span>
                    <span className="dx-launcher-app dx-launcher-app--cursor" aria-label="Cursor">
                        <i><BrandIcon icon={siCursor} /></i>
                    </span>
                    <span className="dx-launcher-app dx-launcher-app--terminal" aria-label="Terminal">
                        <i><Terminal /></i>
                    </span>
                </div>
            </section>
        </div>
    );
}

function CodexDemo({
    progress,
    demoTime,
    demoActive,
    reducedMotion,
    stageRef,
}: {
    progress: number;
    demoTime: number;
    demoActive: boolean;
    reducedMotion: boolean;
    stageRef: RefObject<HTMLDivElement | null>;
}) {
    const conversationRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLSpanElement>(null);
    const step = demoStep(demoTime);
    const {
        planComplete,
        firstFileReady,
        secondFileReady,
        agentFinished,
    } = codexWorkState(demoTime, reducedMotion);
    const { opening: launcherOpening } = codexLaunchState(demoTime, reducedMotion);
    const contentReady = reducedMotion || demoTime >= 4_350;
    const workspaceHidden = progress >= 0.995;
    const firstPrompt = typedText(HOME_PROMPT, demoTime, 5_380, 1_250);
    const secondPrompt = typedText(SERVER_PROMPT, demoTime, 10_900, 1_150);
    const firstSent = demoTime >= 7_280;
    const secondSent = demoTime >= 12_780;
    const serverRunning = demoTime >= 13_050;
    const serverReady = demoTime >= 14_200;
    const previewVisible = demoTime >= 15_720;
    const cursor = demoCursorTarget(demoTime);
    const cursorVisible = demoActive && demoTime >= 180 && cursor !== null;
    const cursorDuration = cursor === 'codex-window' && launcherOpening
        ? '0s'
        : cursor === 'origin'
        ? '0s'
        : cursor === 'send'
            ? '0.4s'
            : cursor === 'input'
                ? '0.32s'
                : cursor === 'runtime'
                    ? '0.55s'
                    : '0.55s';
    const activePrompt = secondSent ? '' : agentFinished ? secondPrompt : firstSent ? '' : firstPrompt;
    const composerFocused = (
        demoTime >= 5_100 && demoTime < 7_280
    ) || (
        demoTime >= 10_550 && demoTime < 12_780
    );
    const late = clamp((progress - 0.84) / 0.16);
    const handoffCover = easeInOutSmooth((late - 0.03) / 0.5);
    const windowFade = easeInOutSmooth((late - 0.48) / 0.3);
    const handoffComplete = progress >= 0.995;
    const storyVisible = shouldShowCodexStory(contentReady, progress);

    const motionStyle = {
        '--dx-window-opacity': (1 - windowFade).toFixed(4),
        '--dx-window-y': '0px',
        '--dx-window-scale': (1 - late * 0.04).toFixed(4),
        '--dx-window-rotate': '0deg',
    } as MotionStyle;
    const cameraStyle = {
        '--dx-demo-exit': late.toFixed(4),
        '--dx-handoff-cover-opacity': handoffCover.toFixed(4),
        '--dx-window-fade': windowFade.toFixed(4),
    } as MotionStyle;
    const story = demoTime < 7_280
        ? {
            number: '01',
            label: '意図を伝える',
            title: 'つくりたいものを、言葉で伝える。',
            body: 'コードを書く代わりに、目的と完成像をプロンプトで共有します。',
        }
        : demoTime < 10_200
            ? {
                number: '02',
                label: 'Codexが実装する',
                title: '画面の構成から、動きまで。',
                body: '既存のコードを読み、複雑なアニメーションやスマホ対応まで進めます。',
            }
            : {
                number: '03',
                label: '実際の画面で確かめる',
                title: '完成は、動く画面で判断する。',
                body: '開発サーバーを起動し、意図した体験になっているかを人が確認します。',
            };

    useEffect(() => {
        const conversation = conversationRef.current;
        if (!conversation) return;

        if (!firstSent) {
            const resetFrame = window.requestAnimationFrame(() => {
                conversation.scrollTo({ top: 0, behavior: 'auto' });
            });
            return () => window.cancelAnimationFrame(resetFrame);
        }

        // Keep the opening exchange anchored at the top. On small screens,
        // scrolling before the assistant reply appears makes that reply feel as
        // though it arrived off-screen. Follow new content only after it exists.
        if (!agentFinished) return;

        const delay = serverReady
            ? 320
            : serverRunning
                ? 280
                : secondSent
                    ? 240
                    : 460;
        const timer = window.setTimeout(() => {
            conversation.scrollTo({
                top: Math.max(0, conversation.scrollHeight - conversation.clientHeight),
                behavior: reducedMotion ? 'auto' : 'smooth',
            });
        }, reducedMotion ? 0 : delay);
        return () => window.clearTimeout(timer);
    }, [agentFinished, firstSent, reducedMotion, secondSent, serverReady, serverRunning]);

    useLayoutEffect(() => {
        if (reducedMotion || !cursorVisible || !cursor) return;

        let frame = 0;
        const updateCursor = () => {
            const stage = stageRef.current;
            const target = stage?.querySelector<HTMLElement>(`[data-dx-cursor-target="${cursor}"]`);
            const cursorNode = cursorRef.current;
            if (!stage || !target || !cursorNode) return;

            const stageRect = stage.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const targetX = Number(target.dataset.dxCursorX ?? 0.5);
            const targetY = Number(target.dataset.dxCursorY ?? 0.5);
            cursorNode.style.left = `${targetRect.left - stageRect.left + targetRect.width * targetX}px`;
            cursorNode.style.top = `${targetRect.top - stageRect.top + targetRect.height * targetY}px`;
        };
        const requestUpdate = () => {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(updateCursor);
        };

        const followsOpeningWindow = cursor === 'codex-window' && launcherOpening && !workspaceHidden;
        const followTarget = () => {
            updateCursor();
            if (followsOpeningWindow) frame = window.requestAnimationFrame(followTarget);
        };

        if (followsOpeningWindow) {
            frame = window.requestAnimationFrame(followTarget);
        } else {
            requestUpdate();
        }
        window.addEventListener('resize', requestUpdate);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', requestUpdate);
        };
    }, [
        cursor,
        cursorVisible,
        launcherOpening,
        previewVisible,
        progress,
        reducedMotion,
        stageRef,
        workspaceHidden,
    ]);

    return (
        <>
            <div className="dx-demo-camera" style={cameraStyle}>
            <ToolLauncher hidden={workspaceHidden} codexOpen={launcherOpening}>
            <div
                className={`dx-launcher-codex-screen dx-product-window dx-window-glass is-content-ready ${previewVisible ? 'is-preview-behind' : ''} ${handoffComplete ? 'is-handoff-complete' : ''}`}
                data-dx-codex-window="primary"
                data-dx-cursor-target="codex-window"
                data-dx-cursor-y="0.04"
                aria-label="起動中のCodex"
                style={motionStyle}
            >
                <div className="dx-window-bar">
                    <span className="dx-window-dots" aria-hidden="true"><i /><i /><i /></span>
                    <span className="dx-window-title">Codex — TTI Intelligence / web</span>
                    <span className="dx-window-branch">codex/home-refresh</span>
                </div>

                <div className={`dx-codex-app ${firstFileReady ? 'is-review-visible' : ''}`}>
                    <aside className="dx-codex-sidebar">
                        <strong>Codex</strong>
                        <span className="dx-side-label">PROJECT</span>
                        <b>TTI Intelligence / web</b>
                        <span className="dx-side-label">TASKS</span>
                        <span className="is-active">Redesign Home</span>
                        <span>Content hierarchy</span>
                        <span>Responsive review</span>
                    </aside>

                    <main className="dx-codex-main">
                        <div className="dx-thread-head">
                            <strong>Redesign Home</strong>
                            <span>{step < 5 ? 'Working' : 'Preview ready'}</span>
                        </div>

                        <div ref={conversationRef} className="dx-conversation">
                            <div className={`dx-user-message ${firstSent ? 'is-visible' : ''}`}>
                                {HOME_PROMPT}
                            </div>

                            <div
                                className={`dx-activity ${step >= 2 ? 'is-visible' : ''}`}
                                data-dx-cursor-target="work"
                            >
                                <div className={step >= 2 ? 'is-done' : ''}>
                                    <Check /> <span><b>Inspect Home page</b><small>hero / videos / math / news</small></span>
                                </div>
                                <div className={step >= 3 ? 'is-done' : step === 2 ? 'is-active' : ''}>
                                    <Check /> <span><b>Check responsive constraints</b><small>desktop / mobile / landscape</small></span>
                                </div>
                            </div>

                            <div className={`dx-plan ${step >= 3 ? 'is-visible' : ''}`}>
                                <header><b>Implementation plan</b><span>{planComplete ? '3 / 3' : '2 / 3'}</span></header>
                                <p className="is-done">Clarify the hero hierarchy</p>
                                <p className="is-done">Refine content section flow</p>
                                <p className={planComplete ? 'is-done' : 'is-active'}>Prevent viewport overflow</p>
                            </div>

                            <div className={`dx-changed-files ${firstFileReady ? 'is-visible' : ''}`}>
                                <span className={firstFileReady ? 'is-ready' : ''}>
                                    <b>Home.tsx</b><small>Updated</small>
                                </span>
                                <span className={secondFileReady ? 'is-ready' : ''}>
                                    <b>index.css</b><small>Updated</small>
                                </span>
                            </div>

                            <div className={`dx-agent-message ${agentFinished ? 'is-visible' : ''}`}>
                                <Bot />
                                <div>
                                    <strong>実装しました。</strong>
                                    <p>Heroから解説動画、今週の数学、最新情報へ自然に読み進められる構成に整理し、PCとスマホの表示を調整しました。</p>
                                </div>
                            </div>

                            <div className={`dx-user-message ${secondSent ? 'is-visible' : ''}`}>
                                {SERVER_PROMPT}
                            </div>

                            <div className={`dx-runtime ${serverRunning ? 'is-visible' : ''}`}>
                                <header>
                                    <strong><Code2 /> Ran <code>npm run dev</code></strong>
                                    <span className={serverReady ? 'is-ready' : ''}>{serverReady ? 'Completed' : 'Running'}</span>
                                </header>
                                <code>$ npm run dev</code>
                                <p>VITE v7.3.1 starting…</p>
                                <p className={serverReady ? 'is-visible' : ''}>Local: http://127.0.0.1:5173/</p>
                                <button
                                    type="button"
                                    className={serverReady ? 'is-visible' : ''}
                                    data-dx-cursor-target="runtime"
                                >
                                    Open preview ↗
                                </button>
                            </div>
                        </div>

                        <div className={`dx-composer ${activePrompt ? 'is-active' : ''} ${composerFocused ? 'is-focused' : ''}`}>
                            <div className="dx-composer-field">
                                <input
                                    value={activePrompt}
                                    readOnly
                                    tabIndex={-1}
                                    aria-label="Codexへの入力デモ"
                                    placeholder="Codexにメッセージを送信"
                                    data-dx-cursor-target="input"
                                    data-dx-cursor-x="0.08"
                                />
                                {activePrompt ? (
                                    <span className="dx-composer-caret-track" aria-hidden="true">
                                        <span className="dx-composer-caret-sizer">{activePrompt}</span>
                                        <i />
                                    </span>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                tabIndex={-1}
                                aria-label="送信"
                                data-dx-cursor-target="send"
                            >
                                ↑
                            </button>
                        </div>
                    </main>

                    <aside
                        className={`dx-review ${firstFileReady ? 'is-visible' : ''}`}
                        aria-hidden={!firstFileReady}
                    >
                        <header>Changed files <span>{secondFileReady ? '2' : '1'} files</span></header>
                        <div className={firstFileReady ? 'is-ready' : ''}>
                            <b>Home.tsx</b><small>Updated</small>
                        </div>
                        <div className={secondFileReady ? 'is-ready' : ''}>
                            <b>index.css</b><small>Updated</small>
                        </div>
                        <p>Content hierarchy<br />Responsive layout<br />Section continuity</p>
                    </aside>
                </div>
            </div>
            </ToolLauncher>

            <section className={`dx-preview-window ${previewVisible ? 'is-visible' : ''} ${handoffComplete ? 'is-handoff-complete' : ''}`} aria-hidden={!previewVisible || handoffComplete}>
                <div className="dx-preview-bar">
                    <span className="dx-window-dots" aria-hidden="true"><i /><i /><i /></span>
                    <span>127.0.0.1:5173/</span>
                    <b>Ready</b>
                </div>
                <div className="dx-preview-body">
                    <iframe
                        src="/"
                        title="TTI Intelligence Home preview"
                        tabIndex={-1}
                    />
                </div>
            </section>

            <span
                className="dx-cursor-origin"
                data-dx-cursor-target="origin"
                aria-hidden="true"
            />

            <span className="dx-demo-handoff-cover" aria-hidden="true" />
            </div>

            <aside
                className={`dx-demo-story ${storyVisible ? 'is-visible' : ''} ${progress >= 0.84 ? 'is-preview-hidden' : ''}`}
                aria-label="プロンプトを使った開発の説明"
                aria-hidden={!storyVisible}
            >
                <div className="dx-demo-story-index" aria-hidden="true">{story.number}</div>
                <div className="dx-demo-story-copy" key={story.number}>
                    <span>{story.label}</span>
                    <strong><BalancedJapaneseTitle text={story.title} /></strong>
                    <p>{story.body}</p>
                </div>
            </aside>

            {!reducedMotion && (
                <span
                    ref={cursorRef}
                    className={`dx-demo-cursor ${cursorVisible ? 'is-visible' : ''} ${isCursorClicking(demoTime) ? 'is-clicking' : ''}`}
                    style={{
                        '--dx-cursor-duration': cursorDuration,
                    } as MotionStyle}
                    aria-hidden="true"
                />
            )}
        </>
    );
}

function DevelopmentDemo({
    progress,
    revealed,
    reducedMotion,
    stageRef,
}: {
    progress: number;
    revealed: boolean;
    reducedMotion: boolean;
    stageRef: RefObject<HTMLDivElement | null>;
}) {
    const handoffStarted = progress >= 0.82;
    const demoActive = reducedMotion || (revealed && !handoffStarted);
    const runningDemoTime = useDemoTime(demoActive, reducedMotion);

    return (
        <CodexDemo
            progress={progress}
            demoTime={runningDemoTime}
            demoActive={demoActive}
            reducedMotion={reducedMotion}
            stageRef={stageRef}
        />
    );
}

function useAutoScrollLog(scrollKey: string) {
    const logRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const el = logRef.current;
        if (!el) return;
        if (typeof el.scrollTo === 'function') {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            return;
        }
        el.scrollTop = el.scrollHeight;
    }, [scrollKey]);

    return logRef;
}

const AUTOMATION_SCENES = [
    {
        number: '01',
        label: 'Codex / CLI連携',
        title: 'AIの指示から、公開とクラウドへ。',
        body: 'AIやCLIからVercel・AWSへつなぎ、\n公開とクラウド構築を一つの流れで進めます。',
    },
    {
        number: '02',
        label: 'Plugin + CLI',
        title: 'よい手順を、何度でも使える形に。',
        body: '検証や公開の決まりをプラグインにまとめ、CLIの実行まで一貫した手順にします。',
    },
    {
        number: '03',
        label: 'MCP',
        title: '必要な情報と道具を、開発につなぐ。',
        body: 'MCPを通じてデザインとリポジトリへ接続し、確認に必要な情報をCodex上で扱います。',
    },
] as const;

function ecosystemSceneStyle(progress: number, index: number, reducedMotion: boolean) {
    if (reducedMotion) {
        return {
            '--dx-ecosystem-opacity': 1,
            '--dx-ecosystem-scale': 1,
            '--dx-ecosystem-y': '0px',
            '--dx-ecosystem-blur': '0px',
            '--dx-ecosystem-mobile-copy-opacity': 1,
        } as MotionStyle;
    }

    const isLastScene = index === AUTOMATION_SCENES.length - 1;
    const start = 0.005 + index * 0.325;
    const enter = easeOutCubic((progress - start) / 0.075);
    const exit = easeInOutSmooth((progress - (start + 0.235)) / 0.085);
    const expand = easeInOutSmooth(exit / 0.45);
    // MCP stays expanded; no fade-to-empty before the sticky track releases.
    const sceneFade = isLastScene
        ? 0
        : easeInOutSmooth((exit - 0.74) / 0.26);
    const copyFade = isLastScene
        ? easeOutCubic((expand - 0.55) / 0.45)
        : easeOutCubic((exit - 0.9) / 0.1);

    return {
        '--dx-ecosystem-opacity': (enter * (1 - sceneFade)).toFixed(4),
        '--dx-ecosystem-scale': (0.97 + enter * 0.03).toFixed(4),
        '--dx-ecosystem-y': `${((1 - enter) * 34).toFixed(1)}px`,
        '--dx-ecosystem-blur': `${((1 - enter) * 5).toFixed(1)}px`,
        '--dx-ecosystem-enter': enter.toFixed(4),
        '--dx-ecosystem-text-clip': `${((1 - enter) * 100).toFixed(1)}%`,
        '--dx-ecosystem-text-y': `${((1 - enter) * 14).toFixed(1)}px`,
        '--dx-ecosystem-detail-opacity': easeOutCubic((enter - 0.32) / 0.68).toFixed(4),
        '--dx-ecosystem-exit': exit.toFixed(4),
        '--dx-ecosystem-expand': expand.toFixed(4),
        '--dx-ecosystem-copy-opacity': (1 - copyFade).toFixed(4),
        '--dx-ecosystem-mobile-copy-opacity': (enter * (1 - sceneFade) * (1 - copyFade)).toFixed(4),
        '--dx-ecosystem-visual-scale': ecosystemWindowScale(expand).toFixed(4),
        '--dx-ecosystem-mobile-scale': ecosystemWindowScale(expand).toFixed(4),
        '--dx-ecosystem-window-radius': `${(28 * (1 - expand)).toFixed(1)}px`,
    } as MotionStyle;
}

function WindowSelectionCursor({
    run,
    start,
}: {
    run: number;
    start: number;
}) {
    const arrive = easeOutCubic((run - start) / 0.04);
    const appear = easeOutCubic((run - start + 0.012) / 0.024);
    const leave = easeInOutSmooth((run - start - 0.07) / 0.032);
    const clicking = run >= start + 0.04 && run <= start + 0.075;

    const style = {
        '--dx-window-cursor-x': `${(-38 * (1 - arrive)).toFixed(2)}px`,
        '--dx-window-cursor-y': `${(52 * (1 - arrive)).toFixed(2)}px`,
        '--dx-window-cursor-opacity': (appear * (1 - leave)).toFixed(4),
        '--dx-window-cursor-scale': clicking ? 0.68 : 1,
    } as MotionStyle;

    return <i className="dx-window-selection-cursor" style={style} aria-hidden="true" />;
}

function CliInputCursor({
    run,
    start,
}: {
    run: number;
    start: number;
}) {
    const arrive = easeOutCubic((run - start) / 0.045);
    const appear = easeOutCubic((run - start + 0.012) / 0.024);
    const leave = easeInOutSmooth((run - start - 0.085) / 0.032);
    const clicking = run >= start + 0.055 && run <= start + 0.085;

    const style = {
        '--dx-cli-cursor-x': `${(34 * (1 - arrive)).toFixed(2)}px`,
        '--dx-cli-cursor-y': `${(28 * (1 - arrive)).toFixed(2)}px`,
        '--dx-cli-cursor-opacity': (appear * (1 - leave)).toFixed(4),
        '--dx-cli-cursor-scale': clicking ? 0.68 : 1,
    } as MotionStyle;

    return <i className="dx-cli-input-cursor" style={style} aria-hidden="true" />;
}

function useScenePlayback(activeIndex: number, reducedMotion: boolean) {
    const [playback, setPlayback] = useState({ index: -1, progress: 0 });

    useEffect(() => {
        let frame = 0;

        if (activeIndex < 0) {
            frame = window.requestAnimationFrame(() => {
                setPlayback({ index: -1, progress: 0 });
            });
            return () => window.cancelAnimationFrame(frame);
        }

        if (reducedMotion) {
            frame = window.requestAnimationFrame(() => {
                setPlayback({ index: activeIndex, progress: 1 });
            });
            return () => window.cancelAnimationFrame(frame);
        }

        let startTime = 0;
        const delay = 420;
        const duration = activeIndex === 0 ? 14_500 : 5_200;

        const tick = (time: number) => {
            if (!startTime) startTime = time;
            const elapsed = time - startTime;
            const next = clamp((elapsed - delay) / duration);
            setPlayback({ index: activeIndex, progress: next });
            if (next < 1) frame = window.requestAnimationFrame(tick);
        };

        frame = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(frame);
    }, [activeIndex, reducedMotion]);

    return playback;
}

function VercelDeploymentScene({ run }: { run: number }) {
    const codexCommand = typedText('codex', run, 0.2, 0.035);
    const vercelPrompt = typedText(VERCEL_AUTOMATION_PROMPT, run, 0.4, 0.065);
    const awsPrompt = typedText(AWS_AUTOMATION_PROMPT, run, 0.78, 0.065);
    const cliReady = run >= 0.27;
    const requestSent = run >= 0.47;
    const deployed = run >= 0.52;
    const productionReady = run >= 0.58;
    const awsPromptReady = run >= 0.65;
    const awsRequestSent = run >= 0.85;
    const awsSubmitted = run >= 0.88;
    const stackReady = run >= 0.98;
    const cliLogRef = useAutoScrollLog(
        `${cliReady}:${requestSent}:${productionReady}:${awsPromptReady}:${awsRequestSent}:${awsSubmitted}`,
    );
    const vercelPromptActive = cliReady && !requestSent;
    const awsPromptActive = awsPromptReady && !awsRequestSent;
    const selectedWindow = run >= 0.93
        ? 'aws'
        : run >= 0.66 && run < 0.86
            ? 'terminal'
            : run >= 0.52 && run < 0.64
                ? 'vercel'
                : run >= 0.14 && run < 0.48
                    ? 'terminal'
                    : 'selector';

    return (
        <div className={`dx-automation-window dx-vercel-desktop is-${selectedWindow} ${stackReady ? 'is-complete' : 'is-running'}`}>
            <div className="dx-window-stage-tile dx-window-stage-tile--vercel dx-window-glass">
                <section className="dx-vercel-console-app">
                    <header className="dx-app-window-bar">
                        <span className="dx-window-controls" aria-hidden="true"><i /><i /><i /></span>
                        <p><Globe2 /> vercel.com/tti-intelligence/web</p>
                        <i aria-hidden="true" />
                    </header>
                    <header className="dx-service-bar">
                        <span className="dx-service-brand dx-service-brand--vercel"><BrandIcon icon={siVercel} /> Vercel</span>
                        <span>tti-intelligence / web</span>
                        <b>Production</b>
                    </header>
                    <nav className="dx-service-tabs" aria-label="Vercelの画面例">
                        <b>Overview</b><span>Deployments</span><span>Logs</span><span>Analytics</span>
                    </nav>
                    <div className="dx-vercel-body">
                        <section className="dx-deployment-card">
                            <div className="dx-deployment-head">
                                <span><i /> Production</span>
                                <b className={productionReady ? 'is-ready' : 'is-building'}>
                                    {productionReady ? <CheckCircle2 /> : <i />}
                                    {productionReady ? 'Ready' : 'Building'}
                                </b>
                            </div>
                            <h3>tti-web</h3>
                            <a href="#vercel-deployment" tabIndex={-1}>tti-web.vercel.app <ArrowUpRight /></a>
                            <div className="dx-deployment-meta">
                                <span><small>Branch</small><b>main</b></span>
                                <span><small>Build</small><b>{productionReady ? '42s' : 'Running'}</b></span>
                                <span><small>Region</small><b>Tokyo</b></span>
                            </div>
                            <div className="dx-deployment-preview" aria-hidden="true">
                                <div><span>TTI INTELLIGENCE</span><b>AIと作る、<br />次の開発へ。</b></div>
                            </div>
                        </section>
                    </div>
                    <WindowSelectionCursor run={run} start={0.495} />
                </section>
            </div>

            <div className="dx-window-stage-tile dx-window-stage-tile--aws dx-window-glass">
                <section className="dx-workspace-aws-app">
                    <header className="dx-app-window-bar">
                        <span className="dx-window-controls" aria-hidden="true"><i /><i /><i /></span>
                        <p><Globe2 /> console.aws.amazon.com/cloudformation</p>
                        <i aria-hidden="true" />
                    </header>
                    <header className="dx-service-bar dx-service-bar--aws">
                        <span className="dx-aws-wordmark">aws<i /></span>
                        <span>CloudFormation</span>
                        <b>Tokyo</b>
                    </header>
                    <div className="dx-workspace-aws-body">
                        <div className="dx-aws-heading">
                            <div><small>Stack</small><h3>tti-assistant</h3></div>
                            <span className={stackReady ? 'is-ready' : 'is-building'}>
                                {stackReady ? <CheckCircle2 /> : <i />}
                                {stackReady ? 'CREATE_COMPLETE' : 'CREATE_IN_PROGRESS'}
                            </span>
                        </div>
                        <div className="dx-cloud-map" aria-label="AWSの構成">
                            <span className={awsSubmitted ? 'is-live' : ''}><Globe2 /><b>API Gateway</b></span>
                            <i />
                            <span className={stackReady ? 'is-live' : ''}><Cloud /><b>Lambda</b></span>
                            <i />
                            <span className={stackReady ? 'is-live' : ''}><Database /><b>DynamoDB</b></span>
                        </div>
                    </div>
                    <WindowSelectionCursor run={run} start={0.905} />
                </section>
            </div>

            <div className="dx-window-stage-tile dx-window-stage-tile--terminal dx-window-glass">
                <section className="dx-vercel-shell-app">
                    <header className="dx-shell-window-bar">
                        <span className="dx-window-controls" aria-hidden="true"><i /><i /><i /></span>
                        <b>{cliReady ? 'Terminal — Codex CLI' : 'Terminal — web'}</b>
                        <button className={`dx-scene-trigger ${deployed ? 'is-pressed' : ''}`} tabIndex={-1}>
                            Agent
                        </button>
                    </header>
                    <div className="dx-terminal-card dx-codex-cli-card" ref={cliLogRef}>
                        <div className={`dx-cli-launch-screen ${cliReady ? 'is-complete' : ''}`}>
                            <small>Last login: today on ttys001</small>
                            <code className="is-shown">
                                <span>$</span> cd ~/web
                            </code>
                            <code className="is-shown" aria-label="codex">
                                <span>$</span> {codexCommand}
                                {run >= 0.195 && run < 0.27 ? <i className="dx-terminal-type-caret" aria-hidden="true" /> : null}
                            </code>
                        </div>
                        <header className={cliReady ? 'is-shown' : ''}>
                            <BrandIcon icon={siOpenai} /> <b>Codex CLI</b><small>web / main</small>
                        </header>
                        <code className={`dx-cli-launch-history ${cliReady ? 'is-shown' : ''}`}>
                            <span>$</span> {codexCommand}
                        </code>
                        <div className={`dx-codex-cli-session ${cliReady ? 'is-shown' : ''}`}>
                            <span><BrandIcon icon={siOpenai} /> Codex</span>
                            <small>作業ディレクトリを確認しました</small>
                        </div>
                        <p
                            className={`dx-codex-cli-prompt ${cliReady ? 'is-shown' : ''} ${
                                run >= 0.36 && run < 0.47 ? 'is-focused' : ''
                            }`}
                            aria-label={VERCEL_AUTOMATION_PROMPT}
                        >
                            <span>›</span>{' '}
                            {vercelPrompt || (vercelPromptActive
                                ? <em className="dx-cli-prompt-placeholder">Codexに指示を送る</em>
                                : null)}
                            {run >= 0.4 && run < 0.47 ? <i className="dx-terminal-type-caret" aria-hidden="true" /> : null}
                            <CliInputCursor run={run} start={0.325} />
                        </p>
                        <p className={`dx-codex-cli-agent ${requestSent ? 'is-shown' : ''}`}>
                            Vercelへの公開を開始します。
                        </p>
                        <code className={`dx-agent-command ${requestSent ? 'is-shown' : ''}`} aria-label="vercel deploy --prod">
                            <span>→</span> vercel deploy --prod
                        </code>
                        <p className={`dx-cli-success ${productionReady ? 'is-shown' : ''}`}>✓ Production: tti-web.vercel.app</p>
                        <p
                            className={`dx-codex-cli-prompt dx-codex-cli-prompt--aws ${awsPromptReady ? 'is-shown' : ''} ${
                                run >= 0.74 && run < 0.85 ? 'is-focused' : ''
                            }`}
                            aria-label={AWS_AUTOMATION_PROMPT}
                        >
                            <span>›</span>{' '}
                            {awsPrompt || (awsPromptActive
                                ? <em className="dx-cli-prompt-placeholder">Codexに指示を送る</em>
                                : null)}
                            {run >= 0.78 && run < 0.85 ? <i className="dx-terminal-type-caret" aria-hidden="true" /> : null}
                            <CliInputCursor run={run} start={0.705} />
                        </p>
                        <p className={`dx-codex-cli-agent ${awsRequestSent ? 'is-shown' : ''}`}>
                            AWSへバックエンドをデプロイします。
                        </p>
                        <code className={`dx-agent-command ${awsRequestSent ? 'is-shown' : ''}`} aria-label="sam deploy --guided">
                            <span>→</span> sam deploy --guided
                        </code>
                        <p className={`dx-cli-success ${awsSubmitted ? 'is-shown' : ''}`}>✓ Stack tti-assistant submitted</p>
                    </div>
                    <WindowSelectionCursor run={run} start={0.02} />
                    <WindowSelectionCursor run={run} start={0.635} />
                </section>
            </div>
        </div>
    );
}

function PluginAutomationScene({ run }: { run: number }) {
    const pluginCommand = typedText('/plugins', run, 0.2, 0.08);
    const pluginSubmitted = run >= 0.3;
    const installed = run >= 0.43;
    const enabled = run >= 0.53;
    const skillPrompt = typedText(
        '$release-workflow を使って、変更を公開前まで確認して',
        run,
        0.62,
        0.14,
    );
    const skillSubmitted = run >= 0.79;
    const skillLoaded = run >= 0.85;
    const checksComplete = run >= 0.95;
    const activeInput = skillSubmitted ? '' : pluginSubmitted ? skillPrompt : pluginCommand;
    const inputFocused = (
        run >= 0.155 && run < 0.3
    ) || (
        run >= 0.575 && run < 0.79
    );
    const logRef = useAutoScrollLog(
        `${pluginSubmitted}:${skillSubmitted}:${skillLoaded}:${checksComplete}`,
    );

    return (
        <div className={`dx-automation-window dx-plugin-window dx-window-glass ${checksComplete ? 'is-complete' : 'is-running'}`}>
            <section className="dx-plugin-cli" aria-label="Codex CLI Plugin session">
                <header className="dx-shell-window-bar">
                    <span className="dx-window-controls" aria-hidden="true"><i /><i /><i /></span>
                    <b>Codex CLI — web</b>
                    <small>same terminal session</small>
                </header>

                <div className="dx-cli-continuous">
                    <header><BrandIcon icon={siOpenai} /><b>Codex</b><small>web / main</small></header>
                    <div className="dx-cli-continuous-log" ref={logRef}>
                        <div className="dx-cli-log-track">
                        <p className={`dx-cli-user-prompt ${pluginSubmitted ? 'is-visible' : ''}`}>
                            <span>›</span> /plugins
                        </p>
                        <div className={`dx-inline-plugin-result ${pluginSubmitted ? 'is-visible' : ''}`}>
                            <div className="dx-cli-browser-title">
                                <BrandIcon icon={siOpenai} />
                                <div><b>Plugins</b><small>Browse and manage installed plugins</small></div>
                            </div>
                            <nav className="dx-cli-plugin-tabs" aria-label="Plugin marketplace">
                                <span>OpenAI</span><span>Personal</span><b>Installed</b>
                            </nav>
                            <div className="dx-cli-plugin-list">
                                <article className="is-selected">
                                    <span>›</span>
                                    <div><b>Release Workflow</b><small>Reusable checks for this website</small></div>
                                    <em className={installed ? 'is-ready' : ''} aria-label={installed ? 'Installed' : 'Install'}>
                                        <span className={installed ? 'is-visible' : ''}>Installed</span>
                                        <span className={!installed ? 'is-visible' : ''}>Install</span>
                                    </em>
                                    <em className={enabled ? 'is-ready' : ''} aria-label={enabled ? 'Enabled' : 'Disabled'}>
                                        <span className={enabled ? 'is-visible' : ''}>Enabled</span>
                                        <span className={!enabled ? 'is-visible' : ''}>Disabled</span>
                                    </em>
                                </article>
                            </div>
                        </div>
                        <p className={`dx-cli-user-prompt ${skillSubmitted ? 'is-visible' : ''}`}>
                            <span>›</span> $release-workflow を使って、変更を公開前まで確認して
                        </p>
                        <div className={`dx-cli-tool-event ${skillLoaded ? 'is-visible' : ''}`}>
                            <Check /> <span><b>Using skill: release-workflow</b><small>Read skills/release/SKILL.md</small></span>
                        </div>
                        <div className={`dx-cli-tool-event ${skillLoaded ? 'is-visible' : ''}`}>
                            <Terminal /> <span><b>Ran npm test</b><small>{checksComplete ? '42 tests passed' : 'Running checks…'}</small></span>
                        </div>
                        <div className={`dx-cli-tool-event ${checksComplete ? 'is-visible' : ''}`}>
                            <Terminal /> <span><b>Ran npm run build</b><small>Build completed</small></span>
                        </div>
                        <p className={`dx-cli-agent-reply ${checksComplete ? 'is-visible' : ''}`}>
                            確認が完了しました。公開前の状態まで整っています。
                        </p>
                        </div>
                    </div>
                    <div className={`dx-cli-composer ${inputFocused ? 'is-focused' : ''}`}>
                        <span>›</span>
                        <p className={activeInput ? undefined : 'is-placeholder'}>
                            {activeInput || 'Codexに指示を送る'}
                            {activeInput ? <i className="dx-terminal-type-caret" aria-hidden="true" /> : null}
                        </p>
                        <button type="button" tabIndex={-1} aria-label="Pluginへの指示を送信">↑</button>
                        <CliInputCursor run={run} start={0.125} />
                        <CliInputCursor run={run} start={0.545} />
                    </div>
                </div>
            </section>
        </div>
    );
}

function McpConnectionScene({ run }: { run: number }) {
    const statusPrompt = typedText('MCPの接続状況を確認して', run, 0.2, 0.09);
    const statusSubmitted = run >= 0.3;
    const mcpPrompt = typedText(
        'FigmaのデザインとGitHubのIssueを確認して、実装との差をまとめて',
        run,
        0.55,
        0.13,
    );
    const mcpSubmitted = run >= 0.7;
    const figmaResult = run >= 0.78;
    const githubResult = run >= 0.87;
    const complete = run >= 0.95;
    const activeInput = mcpSubmitted ? '' : statusSubmitted ? mcpPrompt : statusPrompt;
    const inputFocused = (
        run >= 0.155 && run < 0.3
    ) || (
        run >= 0.505 && run < 0.7
    );
    const logRef = useAutoScrollLog(
        `${statusSubmitted}:${mcpSubmitted}:${figmaResult}:${githubResult}:${complete}`,
    );

    return (
        <div className={`dx-automation-window dx-mcp-window dx-window-glass ${complete ? 'is-complete' : 'is-running'}`}>
            <section className="dx-plugin-cli dx-mcp-cli" aria-label="Codex CLI MCP session">
                <header className="dx-shell-window-bar">
                    <span className="dx-window-controls" aria-hidden="true"><i /><i /><i /></span>
                    <b>Codex CLI — web</b>
                    <small>same terminal session</small>
                </header>

                <div className="dx-cli-continuous dx-mcp-cli-session">
                    <header><BrandIcon icon={siOpenai} /><b>Codex</b><small>web / main</small></header>
                    <div className="dx-cli-continuous-log" ref={logRef}>
                        <div className="dx-cli-log-track">
                        <p className={`dx-cli-user-prompt ${statusSubmitted ? 'is-visible' : ''}`}>
                            <span>›</span> MCPの接続状況を確認して
                        </p>
                        <div className={`dx-mcp-inline-result ${statusSubmitted ? 'is-visible' : ''}`}>
                            <p className="dx-cli-command"><span>→</span> Ran <b>codex mcp list</b></p>
                            <div className="dx-mcp-cli-table" role="table" aria-label="Configured MCP servers">
                                <header role="row"><span>Name</span><span>Status</span><span>Auth</span></header>
                                <p role="row"><b>figma</b><span>enabled</span><small>OAuth</small></p>
                                <p role="row"><b>github</b><span>enabled</span><small>OAuth</small></p>
                            </div>
                        </div>
                        <p className={`dx-cli-user-prompt ${mcpSubmitted ? 'is-visible' : ''}`}>
                            <span>›</span> FigmaのデザインとGitHubのIssueを確認して、実装との差をまとめて
                        </p>
                        <div className={`dx-cli-tool-event ${figmaResult ? 'is-visible' : ''}`}>
                            <Check /> <span><b>Called Figma MCP</b><small>Design context received</small></span>
                        </div>
                        <div className={`dx-cli-tool-event ${githubResult ? 'is-visible' : ''}`}>
                            <Check /> <span><b>Called GitHub MCP</b><small>Issue requirements received</small></span>
                        </div>
                        <p className={`dx-cli-agent-reply ${complete ? 'is-visible' : ''}`}>
                            2つの情報を比較しました。実装との差分を整理します。
                        </p>
                        </div>
                    </div>
                    <div className={`dx-cli-composer ${inputFocused ? 'is-focused' : ''}`}>
                        <span>›</span>
                        <p className={activeInput ? undefined : 'is-placeholder'}>
                            {activeInput || 'Codexに指示を送る'}
                            {activeInput ? <i className="dx-terminal-type-caret" aria-hidden="true" /> : null}
                        </p>
                        <button type="button" tabIndex={-1} aria-label="MCPへの指示を送信">↑</button>
                        <CliInputCursor run={run} start={0.125} />
                        <CliInputCursor run={run} start={0.475} />
                    </div>
                </div>
            </section>
        </div>
    );
}

function AutomationEcosystem({
    progress,
    reducedMotion,
}: {
    progress: number;
    reducedMotion: boolean;
}) {
    const currentScene = progress < 0.005
        ? -1
        : Math.min(2, Math.max(0, Math.floor(progress / 0.325)));
    const playback = useScenePlayback(currentScene, reducedMotion);

    const stageStyle = {
        '--dx-ecosystem-progress': progress.toFixed(4),
    } as MotionStyle;
    const layerStyle = {
        '--dx-ecosystem-layer-opacity': (
            reducedMotion ? 1 : easeOutCubic(progress / 0.025)
        ).toFixed(4),
    } as MotionStyle;

    return (
        <div
            className="dx-ecosystem-layer"
            style={layerStyle}
            aria-labelledby="automation-ecosystem-title"
        >
            <div className="dx-ecosystem-stage" style={stageStyle}>
                <div className="dx-ecosystem-atmosphere" aria-hidden="true" />
                <h2 id="automation-ecosystem-title" className="dx-visually-hidden">
                    公開、クラウド、プラグイン、MCPまでつながるAI開発
                </h2>

                <div
                    className={`dx-ecosystem-scenes ${
                        ecosystemSurfaceHasFrame(currentScene) ? '' : 'is-frameless'
                    }`}
                >
                    {AUTOMATION_SCENES.map((scene, index) => {
                        const run = playback.index === index
                            ? playback.progress
                            : index < currentScene ? 1 : 0;

                        return (
                        <article
                            key={scene.number}
                            className={`dx-ecosystem-scene dx-ecosystem-scene--${index + 1} ${currentScene === index ? 'is-current' : ''}`}
                            style={ecosystemSceneStyle(progress, index, reducedMotion)}
                        >
                            <div className="dx-ecosystem-copy">
                                <span>{scene.number}</span>
                                <small>{scene.label}</small>
                                <h3>{scene.title}</h3>
                                <p>{scene.body}</p>
                            </div>
                            <div className="dx-ecosystem-visual">
                                {index === 0 && <VercelDeploymentScene run={run} />}
                                {index === 1 && <PluginAutomationScene run={run} />}
                                {index === 2 && <McpConnectionScene run={run} />}
                            </div>
                        </article>
                        );
                    })}
                </div>
                <div className="dx-ecosystem-mobile-copies" aria-hidden="true">
                    {AUTOMATION_SCENES.map((scene, index) => (
                        <div
                            key={scene.number}
                            className={`dx-ecosystem-mobile-copy dx-ecosystem-mobile-copy--${index + 1}`}
                            style={ecosystemSceneStyle(progress, index, reducedMotion)}
                        >
                            <div className="dx-ecosystem-mobile-title">
                                <span>{scene.number}</span>
                                <small>{scene.label}</small>
                                <strong><BalancedJapaneseTitle text={scene.title} /></strong>
                            </div>
                            <p className="dx-ecosystem-mobile-body">{scene.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function DevelopmentExperience() {
    const experienceRef = useRef<HTMLDivElement>(null);
    const introTrackRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const reducedMotion = useReducedMotion();
    const typedIntroTitle = useTypedIntroTitle(reducedMotion);
    const introProgress = useTrackProgress(introTrackRef, reducedMotion);
    const progress = useTrackProgress(trackRef, reducedMotion);
    const codexProgress = clamp(progress / CODEX_PHASE_END);
    const ecosystemProgress = clamp(
        (progress - ECOSYSTEM_PHASE_START) / (1 - ECOSYSTEM_PHASE_START),
    );
    const introExit = easeInOutSmooth((introProgress - 0.24) / 0.6);
    const introLight = easeInOutSmooth((introProgress - 0.06) / 0.94);
    const stageRevealed = introProgress >= 0.94;

    useEffect(() => {
        let frame = 0;

        const updateAtmosphere = () => {
            frame = 0;
            const root = experienceRef.current;
            if (!root) return;

            const introTrack = introTrackRef.current;
            const motionTrack = trackRef.current;
            const introRect = introTrack?.getBoundingClientRect();
            const introDistance = Math.max(
                1,
                (introTrack?.offsetHeight ?? window.innerHeight) - window.innerHeight,
            );
            const introPhase = introRect ? clamp(-introRect.top / introDistance) : 0;
            // The seasonal background begins with the same scroll gesture that
            // reveals the centred Codex surface, then reaches full spring before
            // the Codex section becomes interactive.
            const seasonReveal = easeInOutSmooth((introPhase - 0.24) / 0.6);
            const motionRect = motionTrack?.getBoundingClientRect();
            const motionDistance = Math.max(
                1,
                (motionTrack?.offsetHeight ?? window.innerHeight) - window.innerHeight,
            );
            const motionProgress = motionRect ? clamp(-motionRect.top / motionDistance) : 0;
            const ecosystemPhase = clamp(
                (motionProgress - CODEX_PHASE_END) / (1 - CODEX_PHASE_END),
            );
            const seasonWeights = Array.from({ length: 6 }, () => 0);
            const setSeasonBlend = (from: number, to: number, mix: number) => {
                const easedMix = easeInOutSmooth(mix);
                seasonWeights[from] = 1 - easedMix;
                seasonWeights[to] = easedMix;
            };

            // Background changes belong to the gaps between demonstrations.
            // Each active workflow therefore keeps one stable atmosphere.
            if (ecosystemPhase < 0.005) {
                seasonWeights[0] = 1; // Codex: spring
            } else if (ecosystemPhase < 0.08) {
                setSeasonBlend(0, 1, (ecosystemPhase - 0.005) / 0.075);
            } else if (ecosystemPhase < 0.24) {
                seasonWeights[1] = 1; // Codex / CLI: early summer
            } else if (ecosystemPhase < 0.325) {
                setSeasonBlend(1, 3, (ecosystemPhase - 0.24) / 0.085);
            } else if (ecosystemPhase < 0.565) {
                seasonWeights[3] = 1; // Plugin + CLI: autumn
            } else if (ecosystemPhase < 0.65) {
                setSeasonBlend(3, 5, (ecosystemPhase - 0.565) / 0.085);
            } else {
                seasonWeights[5] = 1; // MCP and the following content: winter
            }
            const headerLight = seasonWeights[5] * 0.94;
            const headerMain = Math.round(18 + (246 - 18) * headerLight);
            const headerBlue = Math.round(35 + (249 - 35) * headerLight);
            const headerMuted = (0.7 + headerLight * 0.2).toFixed(3);
            seasonWeights.forEach((weight, index) => {
                document.body.style.setProperty(
                    `--dx-season-${index + 1}`,
                    (weight * seasonReveal).toFixed(4),
                );
            });
            document.body.style.setProperty(
                '--dx-season-reveal-radius',
                `${(-1 + seasonReveal * 79).toFixed(2)}vmax`,
            );
            document.body.style.setProperty('--dx-header-fg', `rgb(${headerMain} ${headerBlue} ${Math.round(headerBlue + (255 - headerBlue) * headerLight)} / ${headerMuted})`);
            document.body.style.setProperty('--dx-header-fg-strong', `rgb(${headerMain} ${headerBlue} ${Math.round(headerBlue + (255 - headerBlue) * headerLight)} / 0.98)`);
            document.body.style.setProperty('--dx-header-space', headerLight.toFixed(4));
        };

        const requestUpdate = () => {
            if (!frame) frame = window.requestAnimationFrame(updateAtmosphere);
        };

        updateAtmosphere();
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', requestUpdate);
            window.removeEventListener('resize', requestUpdate);
            [
                '--dx-season-1',
                '--dx-season-2',
                '--dx-season-3',
                '--dx-season-4',
                '--dx-season-5',
                '--dx-season-6',
                '--dx-season-reveal-radius',
                '--dx-header-fg',
                '--dx-header-fg-strong',
                '--dx-header-space',
            ].forEach((property) => document.body.style.removeProperty(property));
        };
    }, []);

    const introStyle = useMemo(() => ({
        '--dx-intro-title-opacity': 1,
        '--dx-intro-title-y': '0px',
        '--dx-intro-visibility': introExit >= 0.999 ? 'hidden' : 'visible',
        '--dx-intro-light-opacity': introLight.toFixed(4),
        '--dx-intro-light-scale': (0.05 + introLight * 3.25).toFixed(4),
        '--dx-intro-cue-opacity': clamp(1 - introProgress / 0.1).toFixed(4),
    } as MotionStyle), [introExit, introLight, introProgress]);
    const heroStyle = useMemo(() => ({
        '--dx-progress': progress.toFixed(4),
        '--dx-sky-warm-opacity': (
            easeInOutSmooth((ecosystemProgress - 0.12) / 0.24)
            * (1 - easeInOutSmooth((ecosystemProgress - 0.52) / 0.2))
        ).toFixed(4),
        '--dx-sky-evening-opacity': easeInOutSmooth((ecosystemProgress - 0.46) / 0.42).toFixed(4),
        '--dx-sky-drift': `${(ecosystemProgress * 6).toFixed(2)}%`,
        '--dx-sky-drift-reverse': `${(-ecosystemProgress * 3.3).toFixed(2)}%`,
    } as MotionStyle), [ecosystemProgress, progress]);

    return (
        <div ref={experienceRef} className="development-experience">
            <div className="dx-page-atmosphere" aria-hidden="true">
                {[
                    '01-spring-sakura.webp',
                    '02-early-summer.webp',
                    '03-summer.webp',
                    '04-autumn.webp',
                    '05-winter-snow.webp',
                    '06-winter-blue-hour.webp',
                ].map((file, index) => (
                    <img
                        key={file}
                        className={`dx-season-background dx-season-background--${index + 1}`}
                        src={`/images/development/seasons/${file}`}
                        alt=""
                        decoding="async"
                    />
                ))}
                <div className="dx-sakura-petals">
                    {SAKURA_PETALS.map(([x, duration, delay, opacity], index) => (
                        <i
                            key={`${x}-${duration}`}
                            style={{
                                '--dx-petal-x': `${x}%`,
                                '--dx-petal-duration': `${duration}s`,
                                '--dx-petal-delay': `${delay}s`,
                                '--dx-petal-opacity': opacity,
                                '--dx-petal-drift': `${index % 2 === 0 ? 54 : -46}px`,
                            } as MotionStyle}
                        />
                    ))}
                </div>
            </div>
            <section ref={introTrackRef} className="dx-intro-track" aria-label="AIと作る開発への導入">
                <div
                    className="dx-intro-section"
                    style={introStyle}
                    aria-labelledby="development-hero-title"
                >
                    <div className="dx-intro">
                        <h1 id="development-hero-title" aria-label={INTRO_TITLE}>
                            <span className="dx-intro-title-frame" aria-hidden="true">
                                <span className="dx-intro-title-sizer">{INTRO_TITLE}</span>
                                <span className="dx-intro-title-live">
                                    {typedIntroTitle}
                                    <i />
                                </span>
                            </span>
                        </h1>
                        <p className="dx-intro-lead">対話から実装へ。実装から、確かな体験へ。</p>
                    </div>
                    <div className="dx-scroll-cue" aria-hidden="true">
                        <span>スクロールして見る</span>
                        <i />
                    </div>
                </div>
            </section>

            <section ref={trackRef} className="dx-motion-track" aria-label="AIを使った開発">
                <div ref={stageRef} className="dx-stage" style={heroStyle}>
                    <div className="dx-gradient-bg" aria-hidden="true" />
                    <DevelopmentDemo
                        progress={codexProgress}
                        revealed={stageRevealed}
                        reducedMotion={reducedMotion}
                        stageRef={stageRef}
                    />
                    <AutomationEcosystem
                        progress={ecosystemProgress}
                        reducedMotion={reducedMotion}
                    />
                </div>
            </section>

            <main className="dx-content">
                <section className="dx-projects">
                    <div className="dx-projects-backdrop" aria-hidden="true" />
                    <div className="dx-projects-inner">
                        <header>
                            <h2>アイデアを、<br />使えるかたちに。</h2>
                        </header>
                        <div className="dx-project-grid">
                            {PROJECTS.map((project, index) => (
                                <article key={project.title} className="dx-view-card" style={{ '--dx-order': `${index * 5}px` } as MotionStyle}>
                                    <div className={`dx-project-visual dx-project-visual--${index + 1}`} aria-hidden="true">
                                        {project.image ? (
                                            <img src={project.image} alt="" loading="lazy" />
                                        ) : (
                                            <div className="dx-project-assistant">
                                                <header><BrandIcon icon={siOpenai} /><i /></header>
                                                <p>活動日はいつ？</p>
                                                <p><BrandIcon icon={siOpenai} /> 公開情報を確認して回答します。</p>
                                                <footer><span /><b>↑</b></footer>
                                            </div>
                                        )}
                                    </div>
                                    <div className="dx-project-copy">
                                        <h3>{project.title}</h3>
                                        <p>{project.body}</p>
                                        <Link to={project.path} className="dx-project-link">
                                            実際に使う <ArrowRight />
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="dx-cta">
                    <div className="dx-cta-sticky">
                        <div>
                            <h2>見るだけでなく、<br />一緒に作る。</h2>
                            <p>経験よりも、作ってみたい気持ちから。</p>
                        </div>
                        <div>
                            <Link to="/about">活動について見る <ArrowRight /></Link>
                            <Link to="/contact" className="is-secondary">参加について聞く</Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
