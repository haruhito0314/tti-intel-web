import { getStackSceneLocalProgress } from './useScrollProgress';
import { DevHeroCopy } from './DevHeroCopy';
import {
    getStackGridLayerMotion,
    getStackGridTimelineEnd,
    resolveStackGridLayout,
    stackGridSceneVisible,
} from './chapterMotion';
import { useMobileStackScroll } from './useMobileStackScroll';
import { useMobileStackStagePan } from './useMobileStackStagePan';
import { TechBrandIcon, type TechBrandSlug } from './TechBrandIcon';

type StackLayer = {
    name: string;
    note: string;
    icon: TechBrandSlug;
};

type DevStackGridSceneProps = {
    sceneIndex: 1 | 4;
    sceneClassName: string;
    layers: readonly StackLayer[];
    accents: readonly string[];
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
    iconVariant?: 'default' | 'brand';
};

export function DevStackGridScene({
    sceneIndex,
    sceneClassName,
    layers,
    accents,
    progress,
    opacity,
    staticMode = false,
    copyIndex,
    iconVariant = 'default',
}: DevStackGridSceneProps) {
    const mobileScroll = useMobileStackScroll();
    const cardCount = layers.length;
    const layout = resolveStackGridLayout(mobileScroll, cardCount);
    const local = staticMode
        ? getStackGridTimelineEnd(cardCount, layout)
        : getStackSceneLocalProgress(progress, sceneIndex, layout);
    const sceneVisible = stackGridSceneVisible(local, cardCount, staticMode, layout);
    const { scrollRef, stageRef, stageOffset } = useMobileStackStagePan({
        enabled: mobileScroll,
        layout,
        local,
        cardCount,
        staticMode,
    });

    const cards = layers.map((layer, index) => {
        const motion = getStackGridLayerMotion(
            local,
            index,
            cardCount,
            staticMode,
            layout,
        );
        return (
            <div
                key={layer.name}
                className="dev-stack-layer dev-glass-card"
                style={{
                    opacity: motion.opacity,
                    transform: motion.transform,
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
        <div
            className={`dev-hero-scene ${sceneClassName}`}
            style={{
                opacity: opacity * (sceneVisible ? 1 : 0),
                visibility: opacity > 0.04 && sceneVisible ? 'visible' : 'hidden',
                pointerEvents: opacity > 0.5 && sceneVisible ? 'auto' : 'none',
            }}
            aria-hidden={opacity < 0.5 || !sceneVisible}
        >
            {staticMode && copyIndex !== undefined && (
                <DevHeroCopy progress={1} staticMode staticBlockIndex={copyIndex} />
            )}

            {mobileScroll ? (
                <div ref={scrollRef} className="dev-stack-scroll" aria-hidden="true">
                    <div
                        ref={stageRef}
                        className="dev-stack-stage dev-stack-stage--mobile-flow"
                        style={
                            stageOffset > 0
                                ? { transform: `translateY(${-stageOffset}px)` }
                                : undefined
                        }
                    >
                        {cards}
                    </div>
                </div>
            ) : (
                <div className="dev-scene-viewport" aria-hidden="true">
                    <div className="dev-stack-stage">{cards}</div>
                </div>
            )}
        </div>
    );
}
