import { getSceneLocalProgress } from './useScrollProgress';
import { AI_FLOAT_CARDS, AI_TOOL_BADGES, getBadgeProgress, getScene1VisualMotion, getTypewriterProgress, TYPEWRITER_TEXT } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterReveal, CHAPTER_VISUAL_REVEAL_END, CHAPTER_VISUAL_REVEAL_START } from './chapterMotion';
import { getFloatCardBob, getFloatCardPlacementStyle, getFloatCardTransform } from './floatCardMotion';
import { useDesktopFloatCards } from './useDesktopFloatCards';
import { TechBrandIcon } from './TechBrandIcon';

type DevHeroScene1Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

export function DevHeroScene1({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene1Props) {
    const local = staticMode ? 1 : getSceneLocalProgress(progress, 0);
    const showFloatCards = useDesktopFloatCards();
    const visualMotion = getScene1VisualMotion(local, staticMode);
    const typeProgress = staticMode ? 1 : getTypewriterProgress(local);
    const charCount = Math.floor(typeProgress * TYPEWRITER_TEXT.length);
    const typedText = TYPEWRITER_TEXT.slice(0, charCount);
    const terminalReveal = staticMode ? 1 : chapterReveal(local, CHAPTER_VISUAL_REVEAL_START, CHAPTER_VISUAL_REVEAL_END);

    return (
        <div
            className="dev-hero-scene dev-hero-scene--1"
            style={{
                opacity: opacity * visualMotion.combined,
                visibility: opacity > 0.04 ? 'visible' : 'hidden',
                pointerEvents: 'none',
            }}
            aria-hidden={opacity < 0.5}
        >
            {staticMode && copyIndex !== undefined && (
                <DevHeroCopy progress={1} staticMode staticBlockIndex={copyIndex} />
            )}

            <div className="dev-scene-ambient" aria-hidden="true">
                <div className="dev-orb dev-orb--one" style={{ opacity: 0.35 + local * 0.35 }} />
                <div className="dev-orb dev-orb--two" style={{ opacity: 0.25 + local * 0.3 }} />
                {showFloatCards &&
                    AI_FLOAT_CARDS.map((card, index) => {
                        const floatReveal = staticMode
                            ? 1
                            : chapterReveal(local, 0.1 + index * 0.05, 0.26 + index * 0.05);
                        const bob = getFloatCardBob(local, index, staticMode);
                        const enterY = staticMode ? 0 : (1 - floatReveal) * 12;
                        return (
                            <div
                                key={card.name}
                                className="dev-float-tool-card"
                                style={{
                                    ...getFloatCardPlacementStyle(index),
                                    opacity: floatReveal * 0.92,
                                    transform: getFloatCardTransform(bob, enterY),
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
                style={{ transform: staticMode ? 'none' : `translateY(${local * -24}px)` }}
                aria-hidden="true"
            />

            <div className="dev-scene-viewport">
                <div className="dev-scene-main">
                    <div
                        className="dev-terminal dev-glass-card"
                        style={{
                            opacity: terminalReveal,
                            transform:
                                !staticMode && terminalReveal < 0.999
                                    ? `translateY(${(1 - terminalReveal) * 20}px)`
                                    : undefined,
                        }}
                        aria-hidden="true"
                    >
                        <div className="dev-terminal-chrome">
                            <div className="dev-terminal-dots" aria-hidden="true">
                                <span />
                                <span />
                                <span />
                            </div>
                            <span className="dev-terminal-title">zsh — tti-intelligence</span>
                        </div>
                        <div className="dev-terminal-body">
                            <p
                                className="dev-terminal-prompt"
                                style={{ opacity: typeProgress > 0 ? 1 : 0.35 }}
                            >
                                {typedText}
                                {!staticMode && charCount < TYPEWRITER_TEXT.length && (
                                    <span className="dev-terminal-cursor" />
                                )}
                            </p>
                            <div className="dev-terminal-lines" aria-hidden="true">
                                <span style={{ width: `${55 + local * 20}%` }} />
                                <span style={{ width: `${42 + local * 15}%` }} />
                                <span style={{ width: `${68 - local * 10}%` }} />
                            </div>
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
                                        transform: `translateY(${(1 - badgeProgress) * 10}px)`,
                                    }}
                                >
                                    <TechBrandIcon slug={badge.icon} className="dev-hero-badge-icon" />
                                    {badge.name}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
