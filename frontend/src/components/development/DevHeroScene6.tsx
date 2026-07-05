import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { getSceneLocalProgress } from './useScrollProgress';
import { WORKFLOW_STEPS } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import {
    getWorkflowSceneMotion,
    getWorkflowArrowMotion,
    getWorkflowCurveMotion,
    getWorkflowStepMotion,
} from './chapterMotion';

type DevHeroScene6Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

/** Card 2 bottom-center → card 3 top-center in connector viewBox */
const WORKFLOW_CURVE_PATH = 'M 76 0 C 76 24, 70 38, 54 48 C 38 58, 28 72, 24 86 L 24 99';

type WorkflowCardProps = {
    step: (typeof WORKFLOW_STEPS)[number];
    index: number;
    motion: ReturnType<typeof getWorkflowStepMotion>;
};

function WorkflowCard({ step, index, motion }: WorkflowCardProps) {
    return (
        <div
            className={`dev-workflow-card dev-glass-card dev-workflow-card--${index}`}
            style={{
                opacity: motion.opacity,
                transform: motion.transform,
                ['--layer-accent' as string]: step.accent,
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
}

type WorkflowArrowHorizontalProps = {
    motion: ReturnType<typeof getWorkflowArrowMotion>;
    className?: string;
};

function WorkflowArrowHorizontal({ motion, className = '' }: WorkflowArrowHorizontalProps) {
    return (
        <div className={`dev-workflow-arrow-h ${className}`.trim()} style={{ opacity: motion.opacity }}>
            <span className="dev-workflow-arrow-line" style={{ transform: `scaleX(${motion.progress})` }} />
            <ChevronRight
                className="dev-workflow-arrow-icon"
                style={{ transform: `translateX(${-motion.headShift}px)` }}
            />
        </div>
    );
}

type WorkflowArrowCurveProps = {
    motion: ReturnType<typeof getWorkflowCurveMotion>;
};

type CurveTip = {
    x: number;
    y: number;
    angle: number;
};

function WorkflowArrowCurve({ motion }: WorkflowArrowCurveProps) {
    const gradientId = useId();
    const pathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState(1);
    const [tip, setTip] = useState<CurveTip>({ x: 24, y: 99, angle: 108 });

    useLayoutEffect(() => {
        const path = pathRef.current;
        if (!path) return;

        const length = path.getTotalLength();
        setPathLength(length || 1);

        const progress = Math.min(1, Math.max(0, motion.progress));
        const at = Math.max(0.5, length * progress);
        const point = path.getPointAtLength(at);
        const before = path.getPointAtLength(Math.max(0, at - 1.5));
        const angle = (Math.atan2(point.y - before.y, point.x - before.x) * 180) / Math.PI;

        setTip({ x: point.x, y: point.y, angle });
    }, [motion.progress]);

    const dashOffset = pathLength * (1 - motion.progress);
    const showHead = motion.progress > 0.04;

    return (
        <div className="dev-workflow-arrow-curve" style={{ opacity: motion.opacity }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <linearGradient id={gradientId} x1="76%" y1="0%" x2="24%" y2="100%">
                        <stop offset="0%" stopColor="#66B4FF" />
                        <stop offset="100%" stopColor="#9B51E0" />
                    </linearGradient>
                </defs>
                <path
                    ref={pathRef}
                    d={WORKFLOW_CURVE_PATH}
                    className="dev-workflow-curve-track"
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={pathLength}
                    strokeDashoffset={dashOffset}
                />
                {showHead && (
                    <g
                        className="dev-workflow-curve-head"
                        transform={`translate(${tip.x} ${tip.y}) rotate(${tip.angle})`}
                        opacity={motion.opacity}
                    >
                        <polygon points="0,-4.5 7.5,0 0,4.5" fill="#66B4FF" />
                    </g>
                )}
            </svg>
        </div>
    );
}

export function DevHeroScene6({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene6Props) {
    const local = staticMode ? 1 : getSceneLocalProgress(progress, 5);
    const visualMotion = getWorkflowSceneMotion(local, staticMode);

    const stepMotions = WORKFLOW_STEPS.map((_, index) => getWorkflowStepMotion(local, index, staticMode));
    const arrowTop = getWorkflowArrowMotion(local, 0, staticMode);
    const curve = getWorkflowCurveMotion(local, staticMode);
    const arrowBottom = getWorkflowArrowMotion(local, 2, staticMode);

    return (
        <div
            className="dev-hero-scene dev-hero-scene--6"
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

            <div className="dev-scene-viewport" aria-hidden="true">
                <div className="dev-workflow-grid">
                    <WorkflowCard step={WORKFLOW_STEPS[0]} index={0} motion={stepMotions[0]} />
                    <WorkflowArrowHorizontal motion={arrowTop} className="dev-workflow-arrow-h--top" />
                    <WorkflowCard step={WORKFLOW_STEPS[1]} index={1} motion={stepMotions[1]} />

                    <WorkflowArrowCurve motion={curve} />

                    <WorkflowCard step={WORKFLOW_STEPS[2]} index={2} motion={stepMotions[2]} />
                    <WorkflowArrowHorizontal motion={arrowBottom} className="dev-workflow-arrow-h--bottom" />
                    <WorkflowCard step={WORKFLOW_STEPS[3]} index={3} motion={stepMotions[3]} />
                </div>
            </div>
        </div>
    );
}
