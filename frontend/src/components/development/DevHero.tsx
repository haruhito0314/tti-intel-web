import { useRef } from 'react';
import { DevHeroCopy } from './DevHeroCopy';
import { DevHeroScene1 } from './DevHeroScene1';
import { DevHeroScene2 } from './DevHeroScene2';
import { DevHeroScene3 } from './DevHeroScene3';
import { DevHeroScene4 } from './DevHeroScene4';
import { DevHeroScene5 } from './DevHeroScene5';
import { DevHeroScene6 } from './DevHeroScene6';
import { DevHeroScene7 } from './DevHeroScene7';
import { getChapterIndex } from './devScrollMath';
import { useDevScrollProgress } from './useDevScrollProgress';

export function DevHero() {
    const trackRef = useRef<HTMLElement>(null);
    const visualRef = useRef<HTMLDivElement>(null);
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
                    <DevHeroScene4 chapterIndex={3} progress={progress} />
                    <DevHeroScene5 chapterIndex={4} progress={progress} />
                    <DevHeroScene6 chapterIndex={5} progress={progress} />
                    <DevHeroScene7 chapterIndex={6} progress={progress} />
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
