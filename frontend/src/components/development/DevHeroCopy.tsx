import { useLayoutEffect, useState, type RefObject } from 'react';
import { exit, getChapterLocal, getChapterOpacity } from './devScrollMath';
import { getStack2CopyOpacity, getStackChapterOpacity } from './devStackChapter';
import { stack2SharedPanX } from './devStackCircleMotion';
import { useDevMobileLayout } from './useDevMobileLayout';
import { AI_TOOLS, STACK_LAYERS } from './sceneUtils';
import { CHAPTER_BOUNDARY_FADE, SCENE_RANGES } from './devScrollConfig';
import {
    CHAPTER4_ZOOM_BRIDGE_END,
    CHAPTER4_ZOOM_SECTION_END,
} from './devZoomTiming';

const STACK_CHAPTER_INDEX = 1;

const STACK_GRID_CARD_COUNTS: Record<number, number> = {
    1: STACK_LAYERS.length,
    4: AI_TOOLS.length,
};

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
            'いまスクロールしてきたこの体験も、サークルメンバーがAIとともに設計・実装したもの。次は、あなたのアイデアを形にしませんか。',
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

type DevHeroCopyProps =
    | { progress: number; blockIndex?: never; visualRef?: RefObject<HTMLElement | null>; compact?: never }
    | { progress?: never; blockIndex: number; visualRef?: never; compact?: boolean };

function useVisualStageSize(visualRef?: RefObject<HTMLElement | null>) {
    const [size, setSize] = useState({ width: 920, height: 400 });

    useLayoutEffect(() => {
        const node = visualRef?.current;
        if (!node) return;

        const sync = () => {
            const rect = node.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setSize({ width: rect.width, height: rect.height });
            }
        };

        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(node);
        return () => observer.disconnect();
    }, [visualRef]);

    return size;
}

function DevHeroCopyStatic({ blockIndex, compact }: { blockIndex: number; compact?: boolean }) {
    const block = COPY_BLOCKS[blockIndex];
    if (!block) return null;
    const Heading = block.headingLevel;
    return (
        <div
            className={`dev-hero-copy-block dev-hero-copy-block--static${
                blockIndex === 0 ? ' dev-hero-copy-block--intro' : ''
            }${blockIndex === 2 ? ' dev-hero-copy-block--mcp' : ''}${
                compact || blockIndex >= 4 ? ' dev-hero-copy-block--compact' : ''
            }`}
        >
            <Heading className={`dev-hero-title ${block.large ? '' : 'dev-hero-title--sm'}`}>
                {block.title}
            </Heading>
            <p className="dev-hero-subtitle">{block.subtitle}</p>
        </div>
    );
}

function DevHeroCopyScroll({
    progress,
    visualRef,
}: {
    progress: number;
    visualRef?: RefObject<HTMLElement | null>;
}) {
    const mobileLayout = useDevMobileLayout();
    const visualSize = useVisualStageSize(visualRef);
    const stackLocal = getChapterLocal(progress, STACK_CHAPTER_INDEX);
    const stackPanX = mobileLayout
        ? 0
        : stack2SharedPanX(stackLocal, visualSize.width, visualSize.height);

    return (
        <div className="dev-hero-copy-stage" aria-live="polite">
            {COPY_BLOCKS.map((block, index) => {
                const cardCount = STACK_GRID_CARD_COUNTS[index];
                const standardOpacity =
                    index === STACK_CHAPTER_INDEX
                        ? getStack2CopyOpacity(progress, index, cardCount ?? STACK_LAYERS.length, mobileLayout)
                        : cardCount !== undefined
                          ? getStackChapterOpacity(progress, index, cardCount, mobileLayout)
                          : getChapterOpacity(progress, index);
                const aiToolsCopyHold =
                    !mobileLayout &&
                    index === 4 &&
                    progress >= SCENE_RANGES[4][0] + CHAPTER_BOUNDARY_FADE &&
                    progress < CHAPTER4_ZOOM_SECTION_END;
                const opacity =
                    aiToolsCopyHold
                        ? progress < CHAPTER4_ZOOM_BRIDGE_END
                            ? 1
                            : exit(progress, CHAPTER4_ZOOM_BRIDGE_END, CHAPTER4_ZOOM_SECTION_END)
                        : index === 5 && progress < CHAPTER4_ZOOM_SECTION_END
                        ? 0
                        : standardOpacity;
                const isActive = opacity > 0.5;
                const Heading = block.headingLevel;
                const panX = index === STACK_CHAPTER_INDEX ? stackPanX : 0;

                return (
                    <div
                        key={index}
                        className={`dev-hero-copy-block${index === 0 ? ' dev-hero-copy-block--intro' : ''}${
                            index === 2 ? ' dev-hero-copy-block--mcp' : ''
                        }${index >= 4 ? ' dev-hero-copy-block--compact' : ''}`}
                        style={{
                            opacity,
                            visibility: opacity > 0.04 ? 'visible' : 'hidden',
                            pointerEvents: isActive ? 'auto' : 'none',
                            transform: panX !== 0 ? `translateX(${Math.round(panX)}px)` : undefined,
                        }}
                        aria-hidden={!isActive}
                    >
                        <Heading className={`dev-hero-title ${block.large ? '' : 'dev-hero-title--sm'}`}>
                            {block.title}
                        </Heading>
                        <p className="dev-hero-subtitle">{block.subtitle}</p>
                    </div>
                );
            })}
        </div>
    );
}

export function DevHeroCopy(props: DevHeroCopyProps) {
    if (props.blockIndex !== undefined) {
        return <DevHeroCopyStatic blockIndex={props.blockIndex} compact={props.compact} />;
    }

    return <DevHeroCopyScroll progress={props.progress} visualRef={props.visualRef} />;
}
