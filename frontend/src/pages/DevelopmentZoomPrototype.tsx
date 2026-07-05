import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { TechBrandIcon } from '@/components/development/TechBrandIcon';
import { AI_TOOLS } from '@/components/development/sceneUtils';

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

type PrototypeStyle = CSSProperties & Record<`--${string}`, string | number>;

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(value: number) {
    const t = clamp01(value);
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function reveal(progress: number, start: number, end: number) {
    return easeInOutCubic((progress - start) / (end - start));
}

function useScrollProgress(trackRef: React.RefObject<HTMLElement | null>) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const sync = () => {
            const track = trackRef.current;
            if (!track) return;

            const viewport = document.documentElement.clientHeight;
            const scrollable = Math.max(track.offsetHeight - viewport, 1);
            const top = Math.max(0, -track.getBoundingClientRect().top);
            setProgress(clamp01(top / scrollable));
        };

        sync();
        window.addEventListener('scroll', sync, { passive: true });
        window.addEventListener('resize', sync);
        return () => {
            window.removeEventListener('scroll', sync);
            window.removeEventListener('resize', sync);
        };
    }, [trackRef]);

    return progress;
}

function useCanZoom() {
    const [canZoom, setCanZoom] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 769px) and (prefers-reduced-motion: no-preference)');
        const sync = () => setCanZoom(media.matches);

        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    return canZoom;
}

type FlightMetrics = {
    x: number;
    y: number;
    scale: number;
    width: number;
};

const DEFAULT_FLIGHT_METRICS: FlightMetrics = {
    x: 0,
    y: 0,
    scale: 0.56,
    width: 920,
};

function lerp(from: number, to: number, amount: number) {
    return from + (to - from) * amount;
}

function ToolGrid({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
    return (
        <div
            className={`${compact ? 'dev-zoom-tool-grid dev-zoom-tool-grid--compact' : 'dev-zoom-tool-grid'} ${className}`.trim()}
        >
            {AI_TOOLS.map((tool, index) => (
                <div
                    key={tool.name}
                    className="dev-zoom-tool-card"
                    style={{ '--tool-accent': TOOL_ACCENTS[index] } as PrototypeStyle}
                >
                    <div className="dev-zoom-tool-accent" />
                    <div className="dev-zoom-tool-head">
                        <TechBrandIcon
                            slug={tool.icon}
                            className="dev-zoom-tool-icon"
                            variant="brand"
                        />
                        <strong>{tool.name}</strong>
                    </div>
                    <span>{tool.note}</span>
                </div>
            ))}
        </div>
    );
}

export function DevelopmentZoomPrototype() {
    const trackRef = useRef<HTMLElement>(null);
    const sourceRef = useRef<HTMLDivElement>(null);
    const fullGridRef = useRef<HTMLDivElement>(null);
    const progress = useScrollProgress(trackRef);
    const canZoom = useCanZoom();
    const [flightMetrics, setFlightMetrics] = useState(DEFAULT_FLIGHT_METRICS);

    const motion = useMemo(() => {
        const zoom = canZoom ? reveal(progress, 0.34, 0.7) : 0;
        const settle = canZoom ? reveal(progress, 0.7, 0.86) : progress > 0.55 ? 1 : 0;
        const copyOut = reveal(progress, 0.22, 0.42);
        const chromeOut = canZoom ? reveal(progress, 0.42, 0.66) : 0;
        return {
            zoom,
            settle,
            copyOpacity: 1 - copyOut,
            chromeOpacity: 1 - chromeOut,
            fullOpacity: settle,
            zoomOpacity: 1 - settle,
        };
    }, [canZoom, progress]);

    useLayoutEffect(() => {
        if (!canZoom) return;

        const measure = () => {
            const source = sourceRef.current;
            const target = fullGridRef.current;
            if (!source || !target) return;

            const sourceRect = source.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            if (sourceRect.width <= 0 || targetRect.width <= 0 || targetRect.height <= 0) return;

            const sourceScale = sourceRect.width / targetRect.width;
            const sourceX = sourceRect.left + sourceRect.width / 2 - (targetRect.width * sourceScale) / 2;
            const sourceY = sourceRect.top + sourceRect.height / 2 - (targetRect.height * sourceScale) / 2;
            const targetX = targetRect.left;
            const targetY = targetRect.top;

            setFlightMetrics({
                x: lerp(sourceX, targetX, motion.zoom),
                y: lerp(sourceY, targetY, motion.zoom),
                scale: lerp(sourceScale, 1, motion.zoom),
                width: targetRect.width,
            });
        };

        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [canZoom, motion.zoom]);

    const stageStyle = {
        '--zoom-progress': motion.zoom,
        '--chrome-opacity': motion.chromeOpacity,
        '--copy-opacity': motion.copyOpacity,
        '--full-opacity': motion.fullOpacity,
        '--zoom-opacity': motion.zoomOpacity,
        '--flight-x': `${flightMetrics.x}px`,
        '--flight-y': `${flightMetrics.y}px`,
        '--flight-scale': flightMetrics.scale,
        '--flight-width': `${flightMetrics.width}px`,
    } as PrototypeStyle;

    return (
        <div className="dev-page dev-zoom-prototype">
            <PageSeo
                title="Zoom Prototype | TTI Intelligence"
                description="TTI Intelligence development page transition prototype."
            />

            <section ref={trackRef} className="dev-zoom-track" aria-label="chapter 4 to chapter 5 zoom prototype">
                <div className="dev-zoom-stage" style={stageStyle}>
                    <div className="dev-zoom-copy">
                        <span>CHAPTER 04 / PROTOTYPE</span>
                        <h1>このページも、私たちの作品です。</h1>
                        <p>
                            小さなデモの中に次の章を置き、そこへ視線ごと近づいていくための試作です。
                        </p>
                    </div>

                    <div className="dev-zoom-scene-main">
                        <div className="dev-zoom-browser" aria-hidden="true">
                            <div className="dev-zoom-browser-bar">
                                <i />
                                <i />
                                <i />
                                <div>tti-intel.com/development</div>
                            </div>

                            <div className="dev-zoom-browser-page">
                                <div className="dev-zoom-browser-header">
                                    <span className="dev-page-preview-logo-mark">
                                        <img src="/load-assets/tti-crest.png" alt="" />
                                    </span>
                                    <span>TTI Intelligence</span>
                                </div>

                                <div className="dev-zoom-demo-copy">
                                    <strong>AI・開発ツール。</strong>
                                    <span>開発の相棒として、日々使っているツールです。</span>
                                </div>

                                <div ref={sourceRef} className="dev-zoom-source-anchor">
                                    {!canZoom && <ToolGrid compact />}
                                </div>
                            </div>
                        </div>

                        <div className="dev-zoom-cta-row">
                            <Link to="/app" className="dev-hero-cta dev-hero-cta--primary">
                                アプリを見る
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link to="/contact" className="dev-hero-cta dev-hero-cta--ghost">
                                参加について聞く
                            </Link>
                        </div>
                    </div>

                    {canZoom && (
                        <div className="dev-zoom-flight" aria-hidden="true">
                            <ToolGrid />
                        </div>
                    )}

                    <div className="dev-zoom-full" aria-hidden={motion.fullOpacity < 0.5}>
                        <div className="dev-zoom-full-copy">
                            <span>CHAPTER 05</span>
                            <h2>AI・開発ツール。</h2>
                            <p>開発の相棒として、日々使っているツールです。</p>
                        </div>
                        <div ref={fullGridRef} className="dev-zoom-full-grid-shell">
                            <ToolGrid className="dev-zoom-full-grid" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
