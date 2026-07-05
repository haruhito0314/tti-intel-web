import { siteConfig } from '@/config/site';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterShellStyle, enterSlideY, isSectionEnterComplete } from './devEnterStyle';
import { getChapterLocal, getChapterOpacity } from './devScrollMath';
import { scene7CtaReveal } from './devSceneMotion';

type DevHeroScene7Props =
    | { copyIndex: number; chapterIndex?: never; progress?: never }
    | { chapterIndex: number; progress: number; copyIndex?: never };

export function DevHeroScene7(props: DevHeroScene7Props) {
    const isScroll = props.progress !== undefined;
    const local = isScroll ? getChapterLocal(props.progress, props.chapterIndex) : 1;
    const opacity = isScroll ? getChapterOpacity(props.progress, props.chapterIndex) : 1;
    const frozen = !isScroll || isSectionEnterComplete(local);
    const ctaReveal = frozen ? 1 : scene7CtaReveal(local);

    return (
        <div className="dev-hero-scene dev-hero-scene--7" aria-hidden={isScroll && opacity < 0.5}>
            {!isScroll && props.copyIndex !== undefined && (
                <DevHeroCopy blockIndex={props.copyIndex} />
            )}

            <div
                className={isScroll ? 'dev-scene-shell' : undefined}
                style={isScroll ? chapterShellStyle(opacity) : undefined}
            >
            <div className="dev-scene-viewport">
                <div
                    className="dev-hero-cta-row"
                    style={{
                        ...enterSlideY(ctaReveal, 16),
                        pointerEvents: opacity * ctaReveal > 0.5 ? 'auto' : 'none',
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
        </div>
    );
}
