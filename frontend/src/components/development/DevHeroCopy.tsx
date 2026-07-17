import { type RefObject } from 'react';
import { exit, getChapterOpacity } from './devScrollMath';
import { getStackChapterOpacity } from './devStackChapter';
import { useDevMobileLayout } from './useDevMobileLayout';
import { AI_TOOLS, STACK_LAYERS } from './sceneUtils';
import { CHAPTER_BOUNDARY_FADE, SCENE_RANGES } from './devScrollConfig';
import {
    CHAPTER4_ZOOM_BRIDGE_END,
    CHAPTER4_ZOOM_SECTION_END,
} from './devZoomTiming';

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
        subtitle: '最新のAIコーディングツールと対話しながら、アイデアをそのまま形にしています。',
        headingLevel: 'h1' as const,
        large: true,
    },
    {
        title: 'モダンな技術スタック。',
        subtitle: 'Webもアプリも、そのときの最適解を選んで積み上げています。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: (
            <>
                <span className="dev-gradient-text">MCP</span>で、AIの手を伸ばす。
            </>
        ),
        subtitle: 'コード編集からブラウザ操作まで。AIが開発環境そのものを扱えるようにしています。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: 'このページも、作品です。',
        subtitle: 'いまのスクロール体験も、メンバーとAIで設計・実装したもの。次はあなたの番です。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: '毎日使っている相棒。',
        subtitle: '実装もレビューも、これらのツールと並走しています。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: (
            <>
                AIと進める、私たちの<span className="dev-gradient-text">作法</span>。
            </>
        ),
        subtitle: '任せるのは作業。判断と設計は人が握る。それが私たちのスタイルです。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: '次は、あなたの番。',
        subtitle: '未経験でも大丈夫。まずは気軽に覗いてみてください。',
        headingLevel: 'h2' as const,
        large: false,
    },
];

type DevHeroCopyProps =
    | { progress: number; blockIndex?: never; visualRef?: RefObject<HTMLElement | null>; compact?: never }
    | { progress?: never; blockIndex: number; visualRef?: never; compact?: boolean };

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
}: {
    progress: number;
    visualRef?: RefObject<HTMLElement | null>;
}) {
    const mobileLayout = useDevMobileLayout();

    return (
        <div className="dev-hero-copy-stage" aria-live="polite">
            {COPY_BLOCKS.map((block, index) => {
                const cardCount = STACK_GRID_CARD_COUNTS[index];
                const standardOpacity =
                    cardCount !== undefined
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
                        : !mobileLayout && index === 5 && progress < CHAPTER4_ZOOM_SECTION_END
                        ? 0
                        : standardOpacity;
                const isActive = opacity > 0.5;
                const Heading = block.headingLevel;

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
                            transform: `translateY(${((1 - opacity) * 14).toFixed(1)}px)`,
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
