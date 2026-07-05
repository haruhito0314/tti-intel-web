import { useRef } from 'react';
import { DevHeroCopy } from './DevHeroCopy';
import { DevHeroScene1 } from './DevHeroScene1';
import { DevHeroScene2 } from './DevHeroScene2';
import { DevHeroScene3 } from './DevHeroScene3';
import { DevHeroScene4 } from './DevHeroScene4';
import { DevHeroScene5 } from './DevHeroScene5';
import { DevHeroScene6 } from './DevHeroScene6';
import { DevHeroScene7 } from './DevHeroScene7';
import { getSceneVisualOpacity, useScrollProgress } from './useScrollProgress';

export function DevHero() {
    const trackRef = useRef<HTMLElement>(null);
    const { progress, reducedMotion } = useScrollProgress(trackRef);

    if (reducedMotion) {
        return (
            <section className="dev-hero-static" aria-label="開発紹介">
                <DevHeroScene1 progress={1} opacity={1} staticMode copyIndex={0} />
                <DevHeroScene2 progress={1} opacity={1} staticMode copyIndex={1} />
                <DevHeroScene3 progress={1} opacity={1} staticMode copyIndex={2} />
                <DevHeroScene4 progress={1} opacity={1} staticMode copyIndex={3} />
                <DevHeroScene5 progress={1} opacity={1} staticMode copyIndex={4} />
                <DevHeroScene6 progress={1} opacity={1} staticMode copyIndex={5} />
                <DevHeroScene7 progress={1} opacity={1} staticMode copyIndex={6} />
            </section>
        );
    }

    return (
        <section ref={trackRef} className="dev-hero-track" aria-label="開発紹介">
            <div className="dev-hero-stage">
                <DevHeroCopy progress={progress} />

                <div className="dev-hero-visual-stage">
                    <DevHeroScene1 progress={progress} opacity={getSceneVisualOpacity(progress, 0)} />
                    <DevHeroScene2 progress={progress} opacity={getSceneVisualOpacity(progress, 1)} />
                    <DevHeroScene3 progress={progress} opacity={getSceneVisualOpacity(progress, 2)} />
                    <DevHeroScene4 progress={progress} opacity={getSceneVisualOpacity(progress, 3)} />
                    <DevHeroScene5 progress={progress} opacity={getSceneVisualOpacity(progress, 4)} />
                    <DevHeroScene6 progress={progress} opacity={getSceneVisualOpacity(progress, 5)} />
                    <DevHeroScene7 progress={progress} opacity={getSceneVisualOpacity(progress, 6)} />
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
