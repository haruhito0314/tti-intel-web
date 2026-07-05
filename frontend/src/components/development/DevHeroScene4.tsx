import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DevHeroCopy } from './DevHeroCopy';
import { DevPagePreview } from './DevPagePreview';
import { chapterShellStyle, enterSlideY, isSectionEnterComplete } from './devEnterStyle';
import { getChapterLocal, getChapterOpacity } from './devScrollMath';
import { scene4StepReveal } from './devSceneMotion';

type DevHeroScene4Props =
    | { copyIndex: number; chapterIndex?: never; progress?: never }
    | { chapterIndex: number; progress: number; copyIndex?: never };

const CTA_STEP = 9;

export function DevHeroScene4(props: DevHeroScene4Props) {
    const isScroll = props.progress !== undefined;
    const local = isScroll ? getChapterLocal(props.progress, props.chapterIndex) : 1;
    const opacity = isScroll ? getChapterOpacity(props.progress, props.chapterIndex) : 1;
    const frozen = !isScroll || isSectionEnterComplete(local, 3);
    const chromeReveal = frozen ? 1 : scene4StepReveal(local, 0);
    const ctaReveal = frozen ? 1 : scene4StepReveal(local, CTA_STEP);

    return (
        <div className="dev-hero-scene dev-hero-scene--4" aria-hidden={isScroll && opacity < 0.5}>
            {!isScroll && props.copyIndex !== undefined && (
                <DevHeroCopy blockIndex={props.copyIndex} />
            )}

            <div
                className={isScroll ? 'dev-scene-shell' : undefined}
                style={isScroll ? chapterShellStyle(opacity) : undefined}
            >
            <div className="dev-scene-viewport">
                <div className="dev-scene-main">
                    <div className="dev-browser-mock" aria-hidden="true">
                        <div
                            className="dev-browser-bar"
                            style={enterSlideY(chromeReveal, 10)}
                        >
                            <span />
                            <span />
                            <span />
                            <div className="dev-browser-url">tti-intel.com/development</div>
                        </div>
                        <div className="dev-browser-content dev-browser-content--preview">
                            <DevPagePreview local={local} animated={isScroll} frozen={frozen} />
                        </div>
                    </div>

                    <div
                        className="dev-hero-cta-row dev-hero-cta-row--scene4"
                        style={{
                            ...enterSlideY(ctaReveal, 16),
                            pointerEvents: opacity * ctaReveal > 0.5 ? 'auto' : 'none',
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
        </div>
    );
}
