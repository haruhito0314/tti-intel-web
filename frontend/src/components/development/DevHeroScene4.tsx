import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getSceneLocalProgress } from './useScrollProgress';
import { DevHeroCopy } from './DevHeroCopy';
import { DevPagePreview } from './DevPagePreview';
import {
    CHAPTER_VISUAL_REVEAL_END,
    CHAPTER_VISUAL_REVEAL_START,
    chapterReveal,
    getVisualChapterMotion,
} from './chapterMotion';

type DevHeroScene4Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

export function DevHeroScene4({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene4Props) {
    const local = staticMode ? 1 : getSceneLocalProgress(progress, 3);
    const visualMotion = getVisualChapterMotion(local, staticMode);
    const visualReveal = staticMode ? 1 : chapterReveal(local, CHAPTER_VISUAL_REVEAL_START, CHAPTER_VISUAL_REVEAL_END);
    const ctaOpacity = staticMode ? 1 : chapterReveal(local, 0.32, 0.42);

    return (
        <div
            className="dev-hero-scene dev-hero-scene--4"
            style={{
                opacity: opacity * visualMotion.combined,
                visibility: opacity > 0.04 ? 'visible' : 'hidden',
                pointerEvents: opacity > 0.5 ? 'auto' : 'none',
            }}
            aria-hidden={opacity < 0.5}
        >
            {staticMode && copyIndex !== undefined && (
                <DevHeroCopy progress={1} staticMode staticBlockIndex={copyIndex} />
            )}

            <div className="dev-scene-viewport">
                <div className="dev-scene-main">
                    <div
                        className="dev-browser-mock"
                        style={{
                            transform: `translateY(${(1 - visualReveal) * 24}px)`,
                            opacity: visualReveal,
                        }}
                        aria-hidden="true"
                    >
                        <div className="dev-browser-bar">
                            <span />
                            <span />
                            <span />
                            <div className="dev-browser-url">tti-intel.com/development</div>
                        </div>
                        <div className="dev-browser-content dev-browser-content--preview dev-hero-background">
                            <DevPagePreview />
                        </div>
                    </div>

                    <div
                        className="dev-hero-cta-row"
                        style={{
                            opacity: ctaOpacity,
                            transform: `translateY(${(1 - ctaOpacity) * 16}px)`,
                            pointerEvents: ctaOpacity > 0.5 ? 'auto' : 'none',
                        }}
                    >
                        <Link to="/app" className="dev-hero-cta dev-hero-cta--primary">
                            アプリを見る
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link to="/contact" className="dev-hero-cta dev-hero-cta--ghost">
                            参加について聞く
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
