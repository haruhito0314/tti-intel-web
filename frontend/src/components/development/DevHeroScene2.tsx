import { getStackSceneLocalProgress } from './useScrollProgress';
import { STACK_LAYERS } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import {
    getStackGridLayerMotion,
    getStackGridTimelineEnd,
    stackGridSceneVisible,
} from './chapterMotion';
import { TechBrandIcon } from './TechBrandIcon';

type DevHeroScene2Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

const LAYER_ACCENTS = [
    '#E44D26',
    '#1572B6',
    '#3178C6',
    '#61DAFB',
    '#FFFFFF',
    '#339933',
    '#06B6D4',
    '#646CFF',
    '#FFCA28',
    '#3776AB',
    '#3068B7',
    '#F05138',
];

export function DevHeroScene2({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene2Props) {
    const local = staticMode ? getStackGridTimelineEnd(STACK_LAYERS.length) : getStackSceneLocalProgress(progress, 1);
    const sceneVisible = stackGridSceneVisible(local, STACK_LAYERS.length, staticMode);

    return (
        <div
            className="dev-hero-scene dev-hero-scene--2"
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

            <div className="dev-stack-stage" aria-hidden="true">
                {STACK_LAYERS.map((layer, index) => {
                    const motion = getStackGridLayerMotion(
                        local,
                        index,
                        STACK_LAYERS.length,
                        staticMode,
                        'scatter',
                    );
                    return (
                        <div
                            key={layer.name}
                            className="dev-stack-layer dev-glass-card"
                            style={{
                                opacity: motion.opacity,
                                transform: motion.transform,
                                ['--layer-accent' as string]: LAYER_ACCENTS[index],
                            }}
                        >
                            <div className="dev-stack-layer-accent" />
                            <div className="dev-stack-layer-head">
                                <TechBrandIcon slug={layer.icon} className="dev-stack-layer-icon" />
                                <strong>{layer.name}</strong>
                            </div>
                            <span>{layer.note}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
