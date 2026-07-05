import { useRef } from 'react';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterShellStyle, stackCardMotionStyle } from './devEnterStyle';
import { getStackChapterOpacity } from './devStackChapter';
import { getChapterLocal } from './devScrollMath';
import { stackCardExit, stackCardReveal, stackGridColumns } from './devSceneMotion';
import {
    computeStack2MobileTranslateY,
    stack2MobileCardExit,
    stack2MobileCardReveal,
    useStack2MobileMetrics,
} from './devStack2MobileMotion';
import { isStack2MobileGridChapter } from './devStackCircleMotion';
import { useDevMobileLayout } from './useDevMobileLayout';
import { TechBrandIcon, type TechBrandSlug } from './TechBrandIcon';

type StackLayer = {
    name: string;
    note: string;
    icon: TechBrandSlug;
};

type DevStackGridSceneProps = {
    sceneClassName: string;
    layers: readonly StackLayer[];
    accents: readonly string[];
    copyIndex?: number;
    chapterIndex?: number;
    progress?: number;
    iconVariant?: 'default' | 'brand';
};

export function DevStackGridScene({
    sceneClassName,
    layers,
    accents,
    copyIndex,
    chapterIndex,
    progress,
    iconVariant = 'default',
}: DevStackGridSceneProps) {
    const isScroll = progress !== undefined && chapterIndex !== undefined;
    const mobileLayout = useDevMobileLayout();
    const columns = stackGridColumns(mobileLayout);
    const local = isScroll ? getChapterLocal(progress, chapterIndex) : 1;
    const cardCount = layers.length;
    const opacity = isScroll
        ? getStackChapterOpacity(progress, chapterIndex, cardCount, mobileLayout)
        : 1;
    const shellStyle = isScroll ? chapterShellStyle(opacity) : undefined;
    const isCh2Mobile = isStack2MobileGridChapter(chapterIndex, mobileLayout);
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const metrics = useStack2MobileMetrics(isCh2Mobile, scrollRef, contentRef);
    const flowTranslateY = isCh2Mobile
        ? computeStack2MobileTranslateY(local, metrics)
        : 0;

    const cards = layers.map((layer, index) => {
        const enter = isCh2Mobile && isScroll
            ? stack2MobileCardReveal(local, index, cardCount)
            : isScroll
              ? stackCardReveal(local, index, chapterIndex, columns)
              : 1;
        const exitProgress = isCh2Mobile && isScroll
            ? stack2MobileCardExit(local, index)
            : isScroll
              ? stackCardExit(local, index, cardCount, columns)
              : 1;
        return (
            <div
                key={layer.name}
                className="dev-stack-layer dev-glass-card"
                style={{
                    ...stackCardMotionStyle(enter, exitProgress, 22),
                    ['--layer-accent' as string]: accents[index],
                }}
            >
                <div className="dev-stack-layer-accent" />
                <div className="dev-stack-layer-head">
                    <TechBrandIcon
                        slug={layer.icon}
                        className="dev-stack-layer-icon"
                        variant={iconVariant}
                    />
                    <strong>{layer.name}</strong>
                </div>
                <span>{layer.note}</span>
            </div>
        );
    });

    return (
        <div className={`dev-hero-scene ${sceneClassName}`} aria-hidden={isScroll && opacity < 0.5}>
            {!isScroll && copyIndex !== undefined && <DevHeroCopy blockIndex={copyIndex} />}

            <div
                className={isScroll ? 'dev-scene-shell' : undefined}
                style={shellStyle}
            >
                <div className="dev-scene-viewport" aria-hidden="true">
                    {isCh2Mobile ? (
                        <div ref={scrollRef} className="dev-stack-scroll dev-stack-scroll--ch2-mobile">
                            <div
                                ref={contentRef}
                                className="dev-stack-stage dev-stack-stage--mobile-2col dev-stack-stage--ch2-mobile"
                                style={{ transform: `translate3d(0, ${flowTranslateY.toFixed(2)}px, 0)` }}
                            >
                                {cards}
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`dev-stack-stage${
                                mobileLayout ? ' dev-stack-stage--mobile-2col' : ''
                            }`}
                        >
                            {cards}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
