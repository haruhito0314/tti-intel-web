import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { DevHeroCopy } from './DevHeroCopy';
import { DevHeroScene1 } from './DevHeroScene1';
import { DevHeroScene2 } from './DevHeroScene2';
import { DevHeroScene3 } from './DevHeroScene3';
import { DevHeroScene4 } from './DevHeroScene4';
import { DevHeroScene5 } from './DevHeroScene5';
import { DevHeroScene6 } from './DevHeroScene6';
import { DevHeroScene7 } from './DevHeroScene7';
import { clamp01, getChapterIndex } from './devScrollMath';
import { SCENE_RANGES } from './devScrollConfig';
import { useDevScrollProgress } from './useDevScrollProgress';
import { AI_TOOLS } from './sceneUtils';
import { TechBrandIcon } from './TechBrandIcon';
import {
    CHAPTER4_ZOOM_END,
    CHAPTER4_ZOOM_HOLD_END,
    CHAPTER4_ZOOM_SECTION_END,
    ZOOM_CARD_EXIT_DURATION,
    ZOOM_CARD_EXIT_STAGGER,
} from './devZoomTiming';

const TOOL_ACCENTS = [
    '#10A37F',
    '#CC785C',
    '#4285F4',
    '#818CF8',
    '#EDECEC',
    '#9CF000',
    '#886BF9',
    '#A8B1C4',
] as const;

type ZoomStyle = CSSProperties & Record<`--${string}`, string | number>;

function easeInOutCubic(value: number) {
    const t = clamp01(value);
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function lerp(from: number, to: number, amount: number) {
    return from + (to - from) * amount;
}

function useDesktopZoom() {
    const [canZoom, setCanZoom] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 769px) and (prefers-reduced-motion: no-preference)');
        const sync = () => setCanZoom(media.matches);

        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    return canZoom;
}

function DevChapterZoomBridge({
    progress,
    sourceRef,
    targetRef,
}: {
    progress: number;
    sourceRef: RefObject<HTMLDivElement | null>;
    targetRef: RefObject<HTMLDivElement | null>;
}) {
    const canZoom = useDesktopZoom();
    const [metrics, setMetrics] = useState({
        x: 0,
        y: 0,
        scale: 0.56,
        width: 920,
        ready: false,
    });
    const chapter4End = SCENE_RANGES[3][1];
    const bridgeStart = chapter4End - 0.024;
    const zoomStart = chapter4End - 0.01;
    const zoomEnd = CHAPTER4_ZOOM_END;
    const holdEnd = CHAPTER4_ZOOM_HOLD_END;
    const fadeEnd = holdEnd + (AI_TOOLS.length - 1) * ZOOM_CARD_EXIT_STAGGER + ZOOM_CARD_EXIT_DURATION;
    const zoom = easeInOutCubic((progress - zoomStart) / (zoomEnd - zoomStart));
    const active = canZoom && progress >= bridgeStart && progress <= fadeEnd;

    useLayoutEffect(() => {
        if (!active) return;

        const source = sourceRef.current;
        const target = targetRef.current;
        if (!source || !target) return;

        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        if (sourceRect.width <= 0 || targetRect.width <= 0 || targetRect.height <= 0) return;

        const sourceCard = source.querySelector('.dev-stack-layer');
        const targetCard = target.querySelector('.dev-stack-layer');
        const sourceCardRect = sourceCard?.getBoundingClientRect();
        const targetCardRect = targetCard?.getBoundingClientRect();
        const sourceScale = sourceCardRect && targetCardRect && targetCardRect.width > 0
            ? sourceCardRect.width / targetCardRect.width
            : sourceRect.width / targetRect.width;
        const sourceX = sourceRect.left + sourceRect.width / 2 - (targetRect.width * sourceScale) / 2;
        const sourceY = sourceRect.top + sourceRect.height / 2 - (targetRect.height * sourceScale) / 2;

        setMetrics({
            x: lerp(sourceX, targetRect.left, zoom),
            y: lerp(sourceY, targetRect.top, zoom),
            scale: lerp(sourceScale, 1, zoom),
            width: targetRect.width,
            ready: true,
        });
    }, [active, progress, sourceRef, targetRef, zoom]);

    if (!active || !metrics.ready) return null;

    return (
        <div
            className="dev-chapter-zoom-bridge"
            aria-hidden="true"
            style={{
                '--zoom-bridge-x': `${metrics.x}px`,
                '--zoom-bridge-y': `${metrics.y}px`,
                '--zoom-bridge-scale': metrics.scale,
                '--zoom-bridge-width': `${metrics.width}px`,
            } as ZoomStyle}
        >
            <div className="dev-stack-stage">
                {AI_TOOLS.map((tool, index) => {
                    const cardExit = easeInOutCubic(
                        (progress - (holdEnd + index * ZOOM_CARD_EXIT_STAGGER)) / ZOOM_CARD_EXIT_DURATION,
                    );

                    return (
                        <div
                            key={tool.name}
                            className="dev-stack-layer dev-ai-tool-layer dev-glass-card"
                            style={{
                                ['--layer-accent' as string]: TOOL_ACCENTS[index],
                                opacity: 1 - cardExit,
                                transform: cardExit > 0
                                    ? `translateY(${Math.round(-10 * cardExit)}px) scale(${(1 - cardExit * 0.012).toFixed(4)})`
                                    : 'translateY(0px) scale(1)',
                            }}
                        >
                            <div className="dev-stack-layer-accent" />
                            <div className="dev-stack-layer-head">
                                <TechBrandIcon
                                    slug={tool.icon}
                                    className="dev-stack-layer-icon"
                                    variant="brand"
                                />
                                <strong>{tool.name}</strong>
                            </div>
                            <span>{tool.note}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function DevHero() {
    const trackRef = useRef<HTMLElement>(null);
    const visualRef = useRef<HTMLDivElement>(null);
    const zoomSourceRef = useRef<HTMLDivElement>(null);
    const zoomTargetRef = useRef<HTMLDivElement>(null);
    const { progress, reducedMotion } = useDevScrollProgress(trackRef);

    if (reducedMotion) {
        return (
            <section className="dev-hero-static" aria-label="開発紹介">
                <DevHeroScene1 copyIndex={0} />
                <DevHeroScene2 copyIndex={1} />
                <DevHeroScene3 copyIndex={2} />
                <DevHeroScene4 copyIndex={3} />
                <DevHeroScene5 copyIndex={4} />
                <DevHeroScene6 copyIndex={5} />
                <DevHeroScene7 copyIndex={6} />
            </section>
        );
    }

    const activeChapter = getChapterIndex(progress);

    return (
        <section ref={trackRef} className="dev-hero-track" aria-label="開発紹介">
            <div className="dev-hero-stage" data-dev-chapter={activeChapter}>
                <DevHeroCopy progress={progress} visualRef={visualRef} />

                <div ref={visualRef} className="dev-hero-visual-stage">
                    <DevHeroScene1 chapterIndex={0} progress={progress} />
                    <DevHeroScene2 chapterIndex={1} progress={progress} />
                    <DevHeroScene3 chapterIndex={2} progress={progress} />
                    <DevHeroScene4 chapterIndex={3} progress={progress} sourceRef={zoomSourceRef} />
                    <DevHeroScene5 chapterIndex={4} progress={progress} stageRef={zoomTargetRef} />
                    <DevHeroScene6
                        chapterIndex={5}
                        progress={progress}
                        deferUntilProgress={CHAPTER4_ZOOM_SECTION_END}
                    />
                    <DevHeroScene7 chapterIndex={6} progress={progress} />
                    <DevChapterZoomBridge
                        progress={progress}
                        sourceRef={zoomSourceRef}
                        targetRef={zoomTargetRef}
                    />
                </div>

                <div
                    className={`dev-hero-scroll-hint ${progress > 0.03 ? 'is-hidden' : ''}`}
                    aria-hidden="true"
                >
                    Scroll
                </div>
            </div>
        </section>
    );
}
