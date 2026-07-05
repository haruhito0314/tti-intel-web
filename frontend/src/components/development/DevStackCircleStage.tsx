import { useLayoutEffect, useRef, useState } from 'react';
import { chapterShellStyle } from './devEnterStyle';
import { getStackChapterOpacity } from './devStackChapter';
import { getChapterLocal } from './devScrollMath';
import { stack2CardLayout } from './devStackCircleMotion';
import { TechBrandIcon, type TechBrandSlug } from './TechBrandIcon';

type StackLayer = {
    name: string;
    note: string;
    icon: TechBrandSlug;
};

type DevStackCircleStageProps = {
    sceneClassName: string;
    layers: readonly StackLayer[];
    accents: readonly string[];
    chapterIndex: number;
    progress: number;
};

export function DevStackCircleStage({
    sceneClassName,
    layers,
    accents,
    chapterIndex,
    progress,
}: DevStackCircleStageProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 640, height: 320 });
    const local = getChapterLocal(progress, chapterIndex);
    const opacity = getStackChapterOpacity(progress, chapterIndex, layers.length);

    useLayoutEffect(() => {
        const node = stageRef.current ?? viewportRef.current;
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
    }, []);

    return (
        <div className={`dev-hero-scene ${sceneClassName}`} aria-hidden={opacity < 0.5}>
            <div className="dev-scene-shell" style={chapterShellStyle(opacity)}>
                <div ref={viewportRef} className="dev-scene-viewport" aria-hidden="true">
                    <div ref={stageRef} className="dev-stack-circle-stage">
                        {layers.map((layer, index) => {
                            const layout = stack2CardLayout(
                                local,
                                index,
                                size.width,
                                size.height,
                            );
                            return (
                                <div
                                    key={layer.name}
                                    className="dev-stack-layer dev-stack-layer--float dev-glass-card"
                                    style={{
                                        opacity: layout.opacity,
                                        ['--stack-card-w' as string]: `${layout.cardW}px`,
                                        ['--stack-card-h' as string]: `${layout.cardH}px`,
                                        transform: `translate(-50%, -50%) translate3d(${layout.x}px, ${layout.y}px, 0)`,
                                        ['--layer-accent' as string]: accents[index],
                                    }}
                                >
                                    <div className="dev-stack-layer-accent" />
                                    <div className="dev-stack-layer-head">
                                        <TechBrandIcon
                                            slug={layer.icon}
                                            className="dev-stack-layer-icon"
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
