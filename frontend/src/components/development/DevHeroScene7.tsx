import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { getSceneLocalProgress } from './useScrollProgress';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterReveal, getFinalChapterVisualMotion } from './chapterMotion';

type DevHeroScene7Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

export function DevHeroScene7({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene7Props) {
    const local = staticMode ? 1 : getSceneLocalProgress(progress, 6);
    const visualMotion = getFinalChapterVisualMotion(local, staticMode);
    const ctaReveal = staticMode ? 1 : chapterReveal(local, 0.22, 0.42);

    return (
        <div
            className="dev-hero-scene dev-hero-scene--7"
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
                <div
                    className="dev-hero-cta-row is-visible"
                    style={{
                        opacity: ctaReveal,
                        transform: `translateY(${(1 - ctaReveal) * 16}px)`,
                        pointerEvents: ctaReveal > 0.5 ? 'auto' : 'none',
                    }}
                >
                    <a
                        href={siteConfig.social.discord.url}
                        target="_blank"
                        rel="noreferrer"
                        className="dev-hero-cta dev-hero-cta--primary"
                    >
                        Discordに参加する
                        <ArrowRight className="w-5 h-5" />
                    </a>
                    <Link to="/contact" className="dev-hero-cta dev-hero-cta--ghost">
                        お問い合わせ
                    </Link>
                </div>
            </div>
        </div>
    );
}
