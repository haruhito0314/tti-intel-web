import { DevHeroCopy } from './DevHeroCopy';
import { chapterShellStyle, stackCardMotionStyle } from './devEnterStyle';
import { getStackChapterOpacity } from './devStackChapter';
import { getChapterLocal } from './devScrollMath';
import { stackCardExit, stackCardReveal } from './devSceneMotion';
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
    const cardCount = layers.length;
    const opacity = isScroll ? getStackChapterOpacity(progress, chapterIndex, cardCount) : 1;

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
                            const enter = isScroll ? stackCardReveal(local, index, chapterIndex) : 1;
                            const exitProgress = isScroll
                                ? stackCardExit(local, index, cardCount)
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
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
