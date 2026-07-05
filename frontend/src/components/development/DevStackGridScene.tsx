import { DevHeroCopy } from './DevHeroCopy';
import { chapterShellStyle, enterSlideY, isSectionEnterComplete } from './devEnterStyle';
import { getChapterLocal, getChapterOpacity } from './devScrollMath';
import { stackCardReveal } from './devSceneMotion';
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
    const local = isScroll ? getChapterLocal(progress, chapterIndex) : 1;
    const opacity = isScroll ? getChapterOpacity(progress, chapterIndex) : 1;
    const frozen = !isScroll || isSectionEnterComplete(local);

    return (
        <div className={`dev-hero-scene ${sceneClassName}`} aria-hidden={isScroll && opacity < 0.5}>
            {!isScroll && copyIndex !== undefined && <DevHeroCopy blockIndex={copyIndex} />}

            <div
                className={isScroll ? 'dev-scene-shell' : undefined}
                style={isScroll ? chapterShellStyle(opacity) : undefined}
            >
            <div className="dev-scene-viewport" aria-hidden="true">
                <div className="dev-stack-stage">
                    {layers.map((layer, index) => {
                        const enter = frozen ? 1 : stackCardReveal(local, index);
                        return (
                            <div
                                key={layer.name}
                                className="dev-stack-layer dev-glass-card"
                                style={{
                                    ...enterSlideY(enter, 22),
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
                    })}
                </div>
            </div>
            </div>
        </div>
    );
}
