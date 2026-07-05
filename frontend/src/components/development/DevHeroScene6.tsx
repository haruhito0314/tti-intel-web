import { forwardRef, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { WORKFLOW_STEPS } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterShellStyle, enterSlideY, isSectionEnterComplete } from './devEnterStyle';
import { getChapterLocal, getChapterOpacity } from './devScrollMath';
import { workflowArrowReveal, workflowStepReveal } from './devSceneMotion';
import { useDevMobileLayout } from './useDevMobileLayout';

type DevHeroScene6Props =
    | { copyIndex: number; chapterIndex?: never; progress?: never }
    | { chapterIndex: number; progress: number; copyIndex?: never };

type WorkflowCardProps = {
    step: (typeof WORKFLOW_STEPS)[number];
    index: number;
    reveal: number;
};

const WorkflowCard = forwardRef<HTMLDivElement, WorkflowCardProps>(function WorkflowCard(
    { step, index, reveal },
    ref,
) {
    return (
        <div
            ref={ref}
            className={`dev-workflow-card dev-glass-card dev-workflow-card--${index}`}
            style={{
                ['--layer-accent' as string]: step.accent,
                ...enterSlideY(reveal, 20),
            }}
        >
            <div className="dev-workflow-card-accent" />
            <div className="dev-workflow-card-head">
                <span className="dev-workflow-step-index">{String(index + 1).padStart(2, '0')}</span>
                <strong>{step.title}</strong>
            </div>
            <p className="dev-workflow-card-body">{step.body}</p>
        </div>
    );
});

type ConnectorGeometry = {
    top: string;
    curve: string;
    bottom: string;
    topTip: { x: number; y: number; angle: number };
    curveTip: { x: number; y: number; angle: number };
    bottomTip: { x: number; y: number; angle: number };
};

type CardRect = {
    left: number;
    right: number;
    top: number;
    bottom: number;
    cx: number;
    cy: number;
};

function getCardRect(element: HTMLElement, gridRect: DOMRect): CardRect {
    const rect = element.getBoundingClientRect();
    return {
        left: rect.left - gridRect.left,
        right: rect.right - gridRect.left,
        top: rect.top - gridRect.top,
        bottom: rect.bottom - gridRect.top,
        cx: (rect.left + rect.right) / 2 - gridRect.left,
        cy: (rect.top + rect.bottom) / 2 - gridRect.top,
    };
}

function pathAngle(x1: number, y1: number, x2: number, y2: number): number {
    return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

function getPathTip(path: SVGPathElement, pathLength: number, progress: number) {
    const clamped = Math.min(1, Math.max(0, progress));
    const at = Math.min(pathLength, Math.max(2, pathLength * clamped));
    const lookback = Math.min(14, at);
    const point = path.getPointAtLength(at);
    const before = path.getPointAtLength(at - lookback);
    const angle = pathAngle(before.x, before.y, point.x, point.y);
    return { x: point.x, y: point.y, angle };
}

function buildConnectorGeometry(cards: CardRect[]): ConnectorGeometry {
    const [c0, c1, c2, c3] = cards;
    const midY = (c1.bottom + c2.top) / 2;
    const pad = 10;

    const topStartX = c0.right + pad;
    const topEndX = c1.left - pad;
    const bottomStartX = c2.right + pad;
    const bottomEndX = c3.left - pad;

    const top = `M ${topStartX} ${c0.cy} L ${topEndX} ${c1.cy}`;
    const curve = `M ${c1.cx} ${c1.bottom + pad} C ${c1.cx} ${midY}, ${c2.cx} ${midY}, ${c2.cx} ${c2.top - pad}`;
    const bottom = `M ${bottomStartX} ${c2.cy} L ${bottomEndX} ${c3.cy}`;

    return {
        top,
        curve,
        bottom,
        topTip: { x: topEndX, y: c1.cy, angle: pathAngle(topStartX, c0.cy, topEndX, c1.cy) },
        curveTip: {
            x: c2.cx,
            y: c2.top - pad,
            angle: pathAngle(c2.cx, midY, c2.cx, c2.top - pad),
        },
        bottomTip: {
            x: bottomEndX,
            y: c3.cy,
            angle: pathAngle(bottomStartX, c2.cy, bottomEndX, c3.cy),
        },
    };
}

function useWorkflowConnectorGeometry(
    gridRef: RefObject<HTMLDivElement | null>,
    cardRefs: RefObject<HTMLDivElement | null>[],
): ConnectorGeometry | null {
    const [geometry, setGeometry] = useState<ConnectorGeometry | null>(null);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid || cardRefs.some((ref) => !ref.current)) return;

        const gridRect = grid.getBoundingClientRect();
        const cards = cardRefs.map((ref) => getCardRect(ref.current!, gridRect));
        setGeometry(buildConnectorGeometry(cards));
    }, [gridRef, cardRefs]);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;

        const observer = new ResizeObserver(() => {
            if (cardRefs.some((ref) => !ref.current)) return;
            const gridRect = grid.getBoundingClientRect();
            const cards = cardRefs.map((ref) => getCardRect(ref.current!, gridRect));
            setGeometry(buildConnectorGeometry(cards));
        });

        observer.observe(grid);
        cardRefs.forEach((ref) => {
            if (ref.current) observer.observe(ref.current);
        });

        return () => observer.disconnect();
    }, [gridRef, cardRefs]);

    return geometry;
}

type ConnectorSegmentProps = {
    d: string;
    gradientId: string;
    defaultTip: { x: number; y: number; angle: number };
    progress: number;
};

function ConnectorRail({ d, progress }: { d: string; progress: number }) {
    if (progress <= 0) return null;

    return (
        <path
            d={d}
            className="dev-workflow-connector-rail"
            fill="none"
            stroke="rgba(102, 180, 255, 0.28)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: Math.min(1, progress * 1.15) }}
        />
    );
}

function ConnectorSegment({ d, gradientId, defaultTip, progress, glowId }: ConnectorSegmentProps & { glowId: string }) {
    const pathRef = useRef<SVGPathElement>(null);
    const pathLengthRef = useRef(1);
    const [, setMeasureTick] = useState(0);

    useLayoutEffect(() => {
        const path = pathRef.current;
        if (!path) return;
        const length = path.getTotalLength() || 1;
        if (length !== pathLengthRef.current) {
            pathLengthRef.current = length;
            setMeasureTick((tick) => tick + 1);
        }
    }, [d]);

    const pathLength = pathLengthRef.current;
    const clamped = Math.min(1, Math.max(0, progress));
    const tip =
        pathRef.current != null
            ? getPathTip(pathRef.current, pathLength, clamped)
            : defaultTip;

    return (
        <>
            <path
                ref={pathRef}
                d={d}
                className="dev-workflow-connector-track"
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={pathLength}
                strokeDashoffset={pathLength * (1 - clamped)}
                opacity={clamped > 0 ? 1 : 0}
                filter={clamped > 0 ? `url(#${glowId})` : undefined}
            />
            {clamped > 0.02 && (
                <g
                    className="dev-workflow-connector-head"
                    transform={`translate(${tip.x} ${tip.y}) rotate(${tip.angle})`}
                    style={{ opacity: clamped }}
                    filter={`url(#${glowId})`}
                >
                    <polygon points="-14,-8 0,0 -14,8" fill="#9B51E0" />
                    <polygon points="-11,-6 0,0 -11,6" fill="#66B4FF" />
                    <polygon points="-7,-4 0,0 -7,4" fill="rgba(255,255,255,0.9)" />
                </g>
            )}
        </>
    );
}

type WorkflowConnectorsProps = {
    gridRef: RefObject<HTMLDivElement | null>;
    cardRefs: RefObject<HTMLDivElement | null>[];
    arrowProgress: [number, number, number];
};

function WorkflowConnectors({ gridRef, cardRefs, arrowProgress }: WorkflowConnectorsProps) {
    const gradientHId = useId();
    const gradientCurveId = useId();
    const glowId = useId();
    const geometry = useWorkflowConnectorGeometry(gridRef, cardRefs);

    if (!geometry) return null;

    return (
        <svg className="dev-workflow-connectors" aria-hidden="true">
            <defs>
                <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <linearGradient id={gradientHId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(102, 180, 255, 0.5)" />
                    <stop offset="55%" stopColor="#66B4FF" />
                    <stop offset="100%" stopColor="#9B51E0" />
                </linearGradient>
                <linearGradient id={gradientCurveId} x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#66B4FF" />
                    <stop offset="100%" stopColor="#9B51E0" />
                </linearGradient>
            </defs>
            <ConnectorRail d={geometry.top} progress={arrowProgress[0]} />
            <ConnectorRail d={geometry.curve} progress={arrowProgress[1]} />
            <ConnectorRail d={geometry.bottom} progress={arrowProgress[2]} />
            <ConnectorSegment
                d={geometry.top}
                gradientId={gradientHId}
                defaultTip={geometry.topTip}
                progress={arrowProgress[0]}
                glowId={glowId}
            />
            <ConnectorSegment
                d={geometry.curve}
                gradientId={gradientCurveId}
                defaultTip={geometry.curveTip}
                progress={arrowProgress[1]}
                glowId={glowId}
            />
            <ConnectorSegment
                d={geometry.bottom}
                gradientId={gradientHId}
                defaultTip={geometry.bottomTip}
                progress={arrowProgress[2]}
                glowId={glowId}
            />
        </svg>
    );
}

export function DevHeroScene6(props: DevHeroScene6Props) {
    const mobileLayout = useDevMobileLayout();
    const isScroll = props.progress !== undefined;
    const local = isScroll ? getChapterLocal(props.progress, props.chapterIndex) : 1;
    const opacity = isScroll ? getChapterOpacity(props.progress, props.chapterIndex) : 1;
    const frozen = !isScroll || isSectionEnterComplete(local, 5);
    const arrowProgress: [number, number, number] =
        mobileLayout || frozen
            ? [1, 1, 1]
            : [
                  workflowArrowReveal(local, 0),
                  workflowArrowReveal(local, 1),
                  workflowArrowReveal(local, 2),
              ];

    const gridRef = useRef<HTMLDivElement>(null);
    const cardRef0 = useRef<HTMLDivElement>(null);
    const cardRef1 = useRef<HTMLDivElement>(null);
    const cardRef2 = useRef<HTMLDivElement>(null);
    const cardRef3 = useRef<HTMLDivElement>(null);
    const cardRefs = [cardRef0, cardRef1, cardRef2, cardRef3];
    const shellStyle = isScroll ? chapterShellStyle(opacity) : undefined;

    return (
        <div className="dev-hero-scene dev-hero-scene--6" aria-hidden={isScroll && opacity < 0.5}>
            {!isScroll && props.copyIndex !== undefined && (
                <DevHeroCopy blockIndex={props.copyIndex} />
            )}

            <div
                className={isScroll ? 'dev-scene-shell' : undefined}
                style={shellStyle}
            >
            <div className="dev-scene-viewport" aria-hidden="true">
                <div
                    ref={gridRef}
                    className={`dev-workflow-grid${mobileLayout ? ' dev-workflow-grid--mobile-stack' : ''}`}
                >
                    {!mobileLayout && (
                        <WorkflowConnectors
                            gridRef={gridRef}
                            cardRefs={cardRefs}
                            arrowProgress={arrowProgress}
                        />
                    )}
                    <WorkflowCard
                        ref={cardRef0}
                        step={WORKFLOW_STEPS[0]}
                        index={0}
                        reveal={frozen ? 1 : workflowStepReveal(local, 0, mobileLayout)}
                    />
                    <WorkflowCard
                        ref={cardRef1}
                        step={WORKFLOW_STEPS[1]}
                        index={1}
                        reveal={frozen ? 1 : workflowStepReveal(local, 1, mobileLayout)}
                    />
                    <WorkflowCard
                        ref={cardRef2}
                        step={WORKFLOW_STEPS[2]}
                        index={2}
                        reveal={frozen ? 1 : workflowStepReveal(local, 2, mobileLayout)}
                    />
                    <WorkflowCard
                        ref={cardRef3}
                        step={WORKFLOW_STEPS[3]}
                        index={3}
                        reveal={frozen ? 1 : workflowStepReveal(local, 3, mobileLayout)}
                    />
                </div>
            </div>
            </div>
        </div>
    );
}
