import {
    getSceneCopyOpacity,
    getSceneCopyTransform,
    getSceneLocalProgress,
    getStackSceneLocalProgress,
} from './useScrollProgress';
import {
    CHAPTER_COPY_ENTER_END,
    CHAPTER_COPY_ENTER_START,
    CHAPTER_COPY_EXIT_END,
    CHAPTER_COPY_EXIT_START,
    chapterExit,
    chapterReveal,
    getStackGridExitCompleteLocal,
    getStackGridExitStart,
    getStackGridTimelineEnd,
    resolveStackGridLayout,
    STACK_GRID_SCENE_COUNTS,
} from './chapterMotion';
import { useMobileStackScroll } from './useMobileStackScroll';

const COPY_BLOCKS = [
    {
        title: (
            <>
                つくる力は、AIで<span className="dev-gradient-text">加速する</span>。
            </>
        ),
        subtitle: 'TTI Intelligenceの開発は、最新のAIコーディングツールとの対話から始まります。',
        headingLevel: 'h1' as const,
        large: true,
    },
    {
        title: 'モダンな技術スタック。',
        subtitle: 'Webからネイティブアプリまで、プロジェクトに合わせて選んでいます。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: (
            <>
                <span className="dev-gradient-text">MCP</span>で、AIの手が届く範囲を広げる。
            </>
        ),
        subtitle:
            'MCP（Model Context Protocol）は、AIとツールをつなぐ共通規格。コードの編集からブラウザ操作まで、AIが開発環境そのものを扱えるようにしています。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: 'このページも、私たちの作品です。',
        subtitle:
            'いまスクロールしてきたこの体験も、部員がAIとともに設計・実装したもの。次は、あなたのアイデアを形にしませんか。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: 'AI・開発ツール。',
        subtitle: '開発の相棒として、日々使っているツールです。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: (
            <>
                AIと開発する、私たちの<span className="dev-gradient-text">進め方</span>。
            </>
        ),
        subtitle: '「AIに全部任せる」のではなく、判断と設計は人間が握る。それが私たちのスタイルです。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: '次は、あなたの番。',
        subtitle: '未経験でも大丈夫。1から全部サポートします。まずは気軽に覗いてみてください。',
        headingLevel: 'h2' as const,
        large: false,
    },
];

const STACK_GRID_COPY_COUNTS: Record<number, number> = {
    1: STACK_GRID_SCENE_COUNTS[1],
    4: STACK_GRID_SCENE_COUNTS[4],
};

type DevHeroCopyProps = {
    progress: number;
    staticMode?: boolean;
    staticBlockIndex?: number;
};

export function DevHeroCopy({ progress, staticMode = false, staticBlockIndex }: DevHeroCopyProps) {
    const mobileStackScroll = useMobileStackScroll();

    if (staticMode) {
        const blocks =
            staticBlockIndex !== undefined
                ? [COPY_BLOCKS[staticBlockIndex]].filter(Boolean)
                : COPY_BLOCKS;

        return (
            <>
                {blocks.map((block, index) => {
                    const blockIndex = staticBlockIndex ?? index;
                    return (
                        <div key={blockIndex} className="dev-hero-copy-block dev-hero-copy-block--static">
                            {block.headingLevel === 'h1' ? (
                                <h1 className={`dev-hero-title ${block.large ? '' : 'dev-hero-title--sm'}`}>
                                    {block.title}
                                </h1>
                            ) : (
                                <h2 className={`dev-hero-title ${block.large ? '' : 'dev-hero-title--sm'}`}>
                                    {block.title}
                                </h2>
                            )}
                            <p className="dev-hero-subtitle">{block.subtitle}</p>
                        </div>
                    );
                })}
            </>
        );
    }

    return (
        <div className="dev-hero-copy-stage" aria-live="polite">
            {COPY_BLOCKS.map((block, index) => {
                const sceneOpacity = getSceneCopyOpacity(progress, index);
                const stackCount = STACK_GRID_COPY_COUNTS[index];
                const blockLayout =
                    stackCount !== undefined
                        ? resolveStackGridLayout(mobileStackScroll, stackCount)
                        : 'grid';
                const local =
                    stackCount !== undefined
                        ? getStackSceneLocalProgress(progress, index, blockLayout)
                        : getSceneLocalProgress(progress, index);
                const normalizedLocal =
                    stackCount !== undefined
                        ? local / getStackGridTimelineEnd(stackCount, blockLayout)
                        : local;
                const isFinalChapter = index === COPY_BLOCKS.length - 1;
                const translateY =
                    isFinalChapter
                        ? index === 0
                            ? 0
                            : (1 -
                                  chapterReveal(local, CHAPTER_COPY_ENTER_START, CHAPTER_COPY_ENTER_END)) *
                              48
                        : stackCount !== undefined
                        ? index === 0
                          ? 0
                          : (() => {
                                const enter = chapterReveal(
                                    normalizedLocal,
                                    CHAPTER_COPY_ENTER_START,
                                    CHAPTER_COPY_ENTER_END,
                                );
                                const exit = chapterExit(
                                    local,
                                    getStackGridExitStart(stackCount, blockLayout),
                                    getStackGridExitCompleteLocal(stackCount, blockLayout),
                                );
                                if (enter < 1) return (1 - enter) * 48;
                                if (exit < 1) return -(1 - exit) * 40;
                                return 0;
                            })()
                        : getSceneCopyTransform(progress, index);
                const isActive = sceneOpacity > 0.5;
                const Heading = block.headingLevel;

                const titleReveal =
                    index === 0
                        ? 1
                        : chapterReveal(normalizedLocal, CHAPTER_COPY_ENTER_START, CHAPTER_COPY_ENTER_END);
                const subtitleReveal = index === 0 ? 1 : chapterReveal(normalizedLocal, 0.16, 0.55);
                const blockExit = isFinalChapter
                    ? 1
                    : stackCount !== undefined
                      ? chapterExit(
                            local,
                            getStackGridExitStart(stackCount, blockLayout),
                            getStackGridExitCompleteLocal(stackCount, blockLayout),
                        )
                      : chapterExit(local, CHAPTER_COPY_EXIT_START, CHAPTER_COPY_EXIT_END);

                return (
                    <div
                        key={index}
                        className="dev-hero-copy-block"
                        style={{
                            opacity: sceneOpacity * blockExit,
                            transform: `translateY(${translateY}px)`,
                            visibility: sceneOpacity > 0.04 ? 'visible' : 'hidden',
                            pointerEvents: isActive ? 'auto' : 'none',
                        }}
                        aria-hidden={!isActive}
                    >
                        <Heading
                            className={`dev-hero-title ${block.large ? '' : 'dev-hero-title--sm'}`}
                            style={{
                                opacity: titleReveal,
                                transform: `translateY(${(1 - titleReveal) * 32}px)`,
                            }}
                        >
                            {block.title}
                        </Heading>
                        <p
                            className="dev-hero-subtitle"
                            style={{
                                opacity: subtitleReveal,
                                transform: `translateY(${(1 - subtitleReveal) * 24}px)`,
                            }}
                        >
                            {block.subtitle}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
