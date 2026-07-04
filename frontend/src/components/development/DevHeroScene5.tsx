import { getStackSceneLocalProgress } from './useScrollProgress';
import { AI_TOOLS } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import {
    getStackGridLayerMotion,
    getStackGridTimelineEnd,
    stackGridSceneVisible,
} from './chapterMotion';
import { TechBrandIcon } from './TechBrandIcon';

type DevHeroScene5Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

const TOOL_ACCENTS = [
    '#10A37F',
    '#CC785C',
    '#4285F4',
    '#818CF8',
    '#EDECEC',
    '#9CF000',
    '#8E75B2',
    '#A8B1C4',
];

export function DevHeroScene5({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene5Props) {
    const local = staticMode ? getStackGridTimelineEnd(AI_TOOLS.length) : getStackSceneLocalProgress(progress, 4);
    const sceneVisible = stackGridSceneVisible(local, AI_TOOLS.length, staticMode);

    return (
        <div
            className="dev-hero-scene dev-hero-scene--5"
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
                {AI_TOOLS.map((tool, index) => {
                    const motion = getStackGridLayerMotion(
                        local,
                        index,
                        AI_TOOLS.length,
                        staticMode,
                        'sequential',
                    );
                    return (
                        <div
                            key={tool.name}
                            className="dev-stack-layer dev-glass-card"
                            style={{
                                opacity: motion.opacity,
                                transform: motion.transform,
                                ['--layer-accent' as string]: TOOL_ACCENTS[index],
                            }}
                        >
                            <div className="dev-stack-layer-accent" />
                            <div className="dev-stack-layer-head">
                                <TechBrandIcon slug={tool.icon} className="dev-stack-layer-icon" />
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
