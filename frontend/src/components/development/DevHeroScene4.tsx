import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterShellStyle, enterSlideY, isSectionEnterComplete } from './devEnterStyle';
import { getChapterLocal, getChapterOpacity } from './devScrollMath';
import { scene4StepReveal } from './devSceneMotion';
import { SCENE_RANGES } from './devScrollConfig';
import { AI_TOOLS } from './sceneUtils';
import { TechBrandIcon } from './TechBrandIcon';
import { useDevMobileLayout } from './useDevMobileLayout';

type DevHeroScene4Props =
    | { copyIndex: number; chapterIndex?: never; progress?: never; sourceRef?: never }
    | { chapterIndex: number; progress: number; copyIndex?: never; sourceRef?: RefObject<HTMLDivElement | null> };

const CTA_STEP = 9;
const ZOOM_START = SCENE_RANGES[3][1] - 0.024;
const DESKTOP_TOOL_GRID_WIDTH = 920;
const DESKTOP_TOOL_GRID_HEIGHT = 252;
const TOOL_ACCENTS = [
    '#10A37F',
    '#CC785C',
    '#4285F4',
    '#818CF8',
    '#EDECEC',
    '#9CF000',
    '#886BF9',
    '#A8B1C4',
] as const;

function demoToolReveal(local: number, index: number) {
    const start = 0.22 + index * 0.035;
    return scene4StepReveal(local, 3) * Math.min(1, Math.max(0, (local - start) / 0.08));
}

export function DevHeroScene4(props: DevHeroScene4Props) {
    const mobileLayout = useDevMobileLayout();
    const sourceShellRef = useRef<HTMLDivElement | null>(null);
    const [miniScale, setMiniScale] = useState(520 / DESKTOP_TOOL_GRID_WIDTH);
    const isScroll = props.progress !== undefined;
    const local = isScroll ? getChapterLocal(props.progress, props.chapterIndex) : 1;
    const opacity = isScroll ? getChapterOpacity(props.progress, props.chapterIndex) : 1;
    const frozen = !isScroll || isSectionEnterComplete(local, 3);
    const chromeReveal = frozen ? 1 : scene4StepReveal(local, 0);
    const headerReveal = frozen ? 1 : scene4StepReveal(local, 1);
    const copyReveal = frozen ? 1 : scene4StepReveal(local, 2);
    const ctaReveal = frozen ? 1 : scene4StepReveal(local, CTA_STEP);
    const sourceVisible = !isScroll || mobileLayout || props.progress < ZOOM_START;
    const setSourceShell = useCallback((node: HTMLDivElement | null) => {
        sourceShellRef.current = node;
        if (isScroll && props.sourceRef) {
            (props.sourceRef as MutableRefObject<HTMLDivElement | null>).current = node;
        }
    }, [isScroll, props]);

    useLayoutEffect(() => {
        const node = sourceShellRef.current;
        if (!node) return;

        const sync = () => {
            const width = node.getBoundingClientRect().width;
            if (width > 0) {
                setMiniScale(width / DESKTOP_TOOL_GRID_WIDTH);
            }
        };

        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(node);
        return () => observer.disconnect();
    }, [mobileLayout]);

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
                        <div className="dev-browser-content dev-browser-content--preview dev-browser-content--tools">
                            <div className="dev-browser-tool-preview">
                                <div
                                    className="dev-page-preview-site-header"
                                    style={enterSlideY(headerReveal, 8)}
                                >
                                    <span className="dev-page-preview-logo-mark">
                                        <img src="/load-assets/tti-crest.png" alt="" />
                                    </span>
                                    <span className="dev-page-preview-logo">TTI Intelligence</span>
                                </div>

                                <div className="dev-browser-tool-preview-stage">
                                    <div
                                        className="dev-browser-tool-copy"
                                        style={enterSlideY(copyReveal, 10)}
                                    >
                                        <strong>AI・開発ツール。</strong>
                                        <span>開発の相棒として、日々使っているツールです。</span>
                                    </div>

                                    <div
                                        ref={setSourceShell}
                                        className="dev-browser-mini-stack-shell"
                                        style={{
                                            opacity: sourceVisible ? 1 : 0,
                                            height: `${DESKTOP_TOOL_GRID_HEIGHT * miniScale}px`,
                                        }}
                                    >
                                        <div
                                            className="dev-stack-stage dev-browser-mini-stack"
                                            style={{ transform: `scale(${miniScale})` }}
                                        >
                                            {AI_TOOLS.map((tool, index) => {
                                                const reveal = frozen ? 1 : demoToolReveal(local, index);
                                                return (
                                                    <div
                                                        key={tool.name}
                                                        className="dev-stack-layer dev-ai-tool-layer dev-glass-card"
                                                        style={{
                                                            ...enterSlideY(reveal, 8),
                                                            ['--layer-accent' as string]: TOOL_ACCENTS[index],
                                                        }}
                                                    >
                                                        <div className="dev-stack-layer-accent" />
                                                        <div className="dev-stack-layer-head">
                                                            <TechBrandIcon
                                                                slug={tool.icon}
                                                                className="dev-stack-layer-icon"
                                                                variant="brand"
                                                            />
                                                            <strong>{tool.name}</strong>
                                                        </div>
                                                        <span>{tool.note}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
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
