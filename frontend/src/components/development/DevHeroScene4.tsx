import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getSceneLocalProgress } from './useScrollProgress';
import { DevHeroCopy } from './DevHeroCopy';
import { DevPagePreview } from './DevPagePreview';
import { getVisualChapterMotion } from './chapterMotion';
import {
    getScene4LayerMotion,
    getScene4StepReveal,
    SCENE4_CTA_STEP,
} from './sceneUtils';

type DevHeroScene4Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

export function DevHeroScene4({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene4Props) {
    const local = staticMode ? 1 : getSceneLocalProgress(progress, 3);
    const visualMotion = getVisualChapterMotion(local, staticMode);
    const chromeReveal = getScene4StepReveal(local, 0, staticMode);
    const ctaReveal = getScene4StepReveal(local, SCENE4_CTA_STEP, staticMode);
    const browserOpacity = opacity * visualMotion.combined;
    const ctaOpacity = opacity * ctaReveal;

    return (
        <div
            className="dev-hero-scene dev-hero-scene--4"
            style={{
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
                        style={{ opacity: browserOpacity }}
                        aria-hidden="true"
                    >
                        <div className="dev-browser-bar" style={getScene4LayerMotion(chromeReveal, 10)}>
                            <span />
                            <span />
                            <span />
                            <div className="dev-browser-url">tti-intel.com/development</div>
                        </div>
                        <div className="dev-browser-content dev-browser-content--preview">
                            <DevPagePreview local={local} staticMode={staticMode} />
                        </div>
                    </div>

                    <div
                        className="dev-hero-cta-row dev-hero-cta-row--scene4"
                        style={{
                            opacity: ctaOpacity,
                            transform: ctaReveal >= 0.999 ? 'none' : `translateY(${(1 - ctaReveal) * 16}px)`,
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
