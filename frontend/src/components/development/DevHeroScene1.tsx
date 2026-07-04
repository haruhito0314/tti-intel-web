import { getSceneLocalProgress } from './useScrollProgress';
import { AI_FLOAT_CARDS, AI_TOOL_BADGES, getBadgeProgress, getScene1VisualMotion, getTypewriterProgress, TYPEWRITER_TEXT } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterReveal, CHAPTER_VISUAL_REVEAL_END, CHAPTER_VISUAL_REVEAL_START } from './chapterMotion';
import { TechBrandIcon } from './TechBrandIcon';

type DevHeroScene1Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

export function DevHeroScene1({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene1Props) {
    const local = staticMode ? 1 : getSceneLocalProgress(progress, 0);
    const visualMotion = getScene1VisualMotion(local, staticMode);
    const typeProgress = staticMode ? 1 : getTypewriterProgress(local);
    const charCount = Math.floor(typeProgress * TYPEWRITER_TEXT.length);
    const typedText = TYPEWRITER_TEXT.slice(0, charCount);
    const gridOffset = staticMode ? 0 : local * -36;
    const editorReveal = staticMode ? 1 : chapterReveal(local, CHAPTER_VISUAL_REVEAL_START, CHAPTER_VISUAL_REVEAL_END);

    return (
        <div
            className="dev-hero-scene dev-hero-scene--1"
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

            <div className="dev-scene-ambient" aria-hidden="true">
                <div className="dev-orb dev-orb--one" style={{ opacity: 0.35 + local * 0.35 }} />
                <div className="dev-orb dev-orb--two" style={{ opacity: 0.25 + local * 0.3 }} />
                {AI_FLOAT_CARDS.map((card, index) => {
                    const floatReveal = staticMode ? 1 : chapterReveal(local, 0.1 + index * 0.05, 0.26 + index * 0.05);
                    const bob = staticMode ? 0 : Math.sin(local * Math.PI * 2 + index * 1.2) * 5;
                    const drift = staticMode ? 0 : -local * (10 + index * 4);
                    return (
                        <div
                            key={card.name}
                            className={`dev-float-tool-card dev-float-tool-card--${index + 1}`}
                            style={{
                                opacity: floatReveal * 0.92,
                                transform: `translateY(${bob + drift}px) rotate(${index === 0 ? -3 : index === 1 ? 4 : -2}deg)`,
                                ['--float-accent' as string]: card.accent,
                            }}
                        >
                            <div className="dev-float-tool-card-accent" />
                            <div className="dev-float-tool-card-head">
                                <TechBrandIcon slug={card.icon} className="dev-float-tool-card-icon" />
                                <span>{card.name}</span>
                            </div>
                            <p className="dev-float-tool-card-prompt">{card.prompt}</p>
                        </div>
                    );
                })}
            </div>

            <div
                className="dev-hero-grid"
                style={{ transform: `translateY(${gridOffset}px)` }}
                aria-hidden="true"
            />

            <div
                className="dev-laptop"
                style={{
                    transform: staticMode
                        ? 'translateY(0) rotateX(0deg) scale(1)'
                        : `translateY(${(1 - editorReveal) * 48}px) rotateX(${(1 - editorReveal) * 5}deg) scale(${0.92 + editorReveal * 0.08})`,
                    opacity: editorReveal,
                }}
                aria-hidden="true"
            >
                <div className="dev-laptop-shell">
                    <div className="dev-laptop-screen">
                        <div className="dev-editor-chrome">
                            <span />
                            <span />
                            <span />
                            <span className="dev-editor-tab">Development.tsx</span>
                        </div>
                        <div className="dev-editor-body">
                            <div className="dev-editor-sidebar">
                                {['src', 'components', 'pages', 'hooks', 'lib'].map((item, index) => (
                                    <span
                                        key={item}
                                        style={{ opacity: staticMode ? 1 : Math.min(1, local * 6 - index * 0.4) }}
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                            <div className="dev-editor-main">
                                <p
                                    className="dev-editor-prompt"
                                    style={{ opacity: typeProgress > 0 ? 1 : 0.35 }}
                                >
                                    {typedText}
                                    {!staticMode && charCount < TYPEWRITER_TEXT.length && (
                                        <span className="dev-editor-cursor" />
                                    )}
                                </p>
                                <div className="dev-editor-lines" aria-hidden="true">
                                    <span style={{ width: `${55 + local * 20}%` }} />
                                    <span style={{ width: `${42 + local * 15}%` }} />
                                    <span style={{ width: `${68 - local * 10}%` }} />
                                    <span style={{ width: `${36 + local * 12}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="dev-laptop-base" />
                    <div className="dev-laptop-shadow" />
                </div>
            </div>

            <div className="dev-hero-badges">
                {AI_TOOL_BADGES.map((badge, index) => {
                    const badgeProgress = staticMode ? 1 : getBadgeProgress(local, index);
                    return (
                        <span
                            key={badge.name}
                            className="dev-hero-badge"
                            style={{
                                opacity: badgeProgress,
                                transform: `translateX(${(1 - badgeProgress) * -28}px) translateY(${(1 - badgeProgress) * 8}px)`,
                            }}
                        >
                            <TechBrandIcon slug={badge.icon} className="dev-hero-badge-icon" />
                            {badge.name}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
