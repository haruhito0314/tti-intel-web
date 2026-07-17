import { forwardRef, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { WORKFLOW_STEPS } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterShellStyle, enterSlideY, isSectionEnterComplete } from './devEnterStyle';
import { getChapterOpacity, getDeferredChapterLocal } from './devScrollMath';
import { workflowArrowReveal, workflowStepReveal } from './devSceneMotion';
import { useDevMobileLayout } from './useDevMobileLayout';

type DevHeroScene6Props =
    | { copyIndex: number; chapterIndex?: never; progress?: never }
    | { chapterIndex: number; progress: number; copyIndex?: never; deferUntilProgress?: number };

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
                ...enterSlideY(reveal, 26, 0.95),
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

type ConnectorSegmentData = {
    d: string;
    tip: { x: number; y: number; angle: number };
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

function buildConnectorSegments(cards: CardRect[]): ConnectorSegmentData[] {
    const pad = 8;
    const segments: ConnectorSegmentData[] = [];

    for (let index = 0; index < cards.length - 1; index += 1) {
        const from = cards[index];
        const to = cards[index + 1];
        const startX = from.right + pad;
        const endX = to.left - pad;
        const y = (from.cy + to.cy) / 2;
        const d = `M ${startX} ${y} L ${endX} ${y}`;
        segments.push({
            d,
            tip: { x: endX, y, angle: pathAngle(startX, y, endX, y) },
        });
    }

    return segments;
}

function useWorkflowConnectorSegments(
    gridRef: RefObject<HTMLDivElement | null>,
    cardRefs: RefObject<HTMLDivElement | null>[],
    syncKey: number,
): ConnectorSegmentData[] | null {
    const [segments, setSegments] = useState<ConnectorSegmentData[] | null>(null);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid || cardRefs.some((ref) => !ref.current)) return;

        const sync = () => {
            const gridRect = grid.getBoundingClientRect();
            const cards = cardRefs.map((ref) => getCardRect(ref.current!, gridRect));
            setSegments(buildConnectorSegments(cards));
        };

        sync();

        const observer = new ResizeObserver(sync);
        observer.observe(grid);
        cardRefs.forEach((ref) => {
            if (ref.current) observer.observe(ref.current);
        });

        return () => observer.disconnect();
    }, [gridRef, cardRefs, syncKey]);

    return segments;
}

type ConnectorSegmentProps = {
    d: string;
    gradientId: string;
    defaultTip: { x: number; y: number; angle: number };
    progress: number;
    glowId: string;
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

function ConnectorSegment({ d, gradientId, defaultTip, progress, glowId }: ConnectorSegmentProps) {
    const pathRef = useRef<SVGPathElement>(null);
    const [segmentMetrics, setSegmentMetrics] = useState({
        pathLength: 1,
        tip: defaultTip,
    });

    useLayoutEffect(() => {
        const path = pathRef.current;
        if (!path) return;
        const length = path.getTotalLength() || 1;
        const clamped = Math.min(1, Math.max(0, progress));
        const nextTip = getPathTip(path, length, clamped);
        setSegmentMetrics({ pathLength: length, tip: nextTip });
    }, [d, progress, defaultTip]);

    const { pathLength, tip } = segmentMetrics;
    const clamped = Math.min(1, Math.max(0, progress));
    const pulseReady = clamped >= 0.98;

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
            {pulseReady && (
                <path
                    d={d}
                    className="dev-workflow-connector-pulse"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.92)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={`${Math.max(18, pathLength * 0.18)} ${pathLength}`}
                    pathLength={pathLength}
                />
            )}
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
    syncKey: number;
};

function WorkflowConnectors({ gridRef, cardRefs, arrowProgress, syncKey }: WorkflowConnectorsProps) {
    const gradientId = useId();
    const glowId = useId();
    const segments = useWorkflowConnectorSegments(gridRef, cardRefs, syncKey);

    if (!segments) return null;

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
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(102, 180, 255, 0.5)" />
                    <stop offset="55%" stopColor="#66B4FF" />
                    <stop offset="100%" stopColor="#9B51E0" />
                </linearGradient>
            </defs>
            {segments.map((segment, index) => (
                <ConnectorRail key={`rail-${index}`} d={segment.d} progress={arrowProgress[index]} />
            ))}
            {segments.map((segment, index) => (
                <ConnectorSegment
                    key={`segment-${index}`}
                    d={segment.d}
                    gradientId={gradientId}
                    defaultTip={segment.tip}
                    progress={arrowProgress[index]}
                    glowId={glowId}
                />
            ))}
        </svg>
    );
}

export function DevHeroScene6(props: DevHeroScene6Props) {
    const mobileLayout = useDevMobileLayout();
    const isScroll = props.progress !== undefined;
    const deferred =
        isScroll &&
        props.deferUntilProgress !== undefined &&
        props.progress < props.deferUntilProgress;
    const local =
        isScroll && props.chapterIndex !== undefined
            ? getDeferredChapterLocal(props.progress, props.chapterIndex, props.deferUntilProgress)
            : 1;
    const opacity =
        isScroll && !deferred && props.chapterIndex !== undefined
            ? getChapterOpacity(props.progress, props.chapterIndex)
            : isScroll
              ? 0
              : 1;
    const frozen = !isScroll || isSectionEnterComplete(local, 5);
    const arrowProgress: [number, number, number] = mobileLayout
        ? [1, 1, 1]
        : deferred
          ? [0, 0, 0]
          : [
                workflowArrowReveal(local, 0),
                workflowArrowReveal(local, 1),
                workflowArrowReveal(local, 2),
            ];
    const syncKey = Math.round(local * 200);

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

            <div className={isScroll ? 'dev-scene-shell' : undefined} style={shellStyle}>
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
                                syncKey={syncKey}
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
