import { AI_FLOAT_CARDS, AI_TOOL_BADGES, TYPEWRITER_TEXT } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterShellStyle, enterSlideY, enterSlideYWithRotate, isSectionEnterComplete } from './devEnterStyle';
import { getChapterLocal, getChapterOpacity } from './devScrollMath';
import {
    scene1BadgeReveal,
    scene1FloatReveal,
    scene1TerminalReveal,
    scene1TypewriterProgress,
} from './devSceneMotion';
import { getFloatCardPlacementStyle, getFloatCardTilt } from './floatCardMotion';
import { useDesktopFloatCards } from './useDesktopFloatCards';
import { TechBrandIcon } from './TechBrandIcon';

type DevHeroScene1Props =
    | { copyIndex: number; chapterIndex?: never; progress?: never }
    | { chapterIndex: number; progress: number; copyIndex?: never };

export function DevHeroScene1(props: DevHeroScene1Props) {
    const isScroll = props.progress !== undefined;
    const local = isScroll ? getChapterLocal(props.progress, props.chapterIndex) : 1;
    const opacity = isScroll ? getChapterOpacity(props.progress, props.chapterIndex) : 1;
    const frozen = !isScroll || isSectionEnterComplete(local);
    const showFloatCards = useDesktopFloatCards();

    const typeProgress = frozen ? 1 : scene1TypewriterProgress(local);
    const charCount = Math.floor(typeProgress * TYPEWRITER_TEXT.length);
    const typedText = frozen ? TYPEWRITER_TEXT : TYPEWRITER_TEXT.slice(0, charCount);
    const terminalReveal = frozen ? 1 : scene1TerminalReveal(local);

    const shellStyle = isScroll ? chapterShellStyle(opacity) : undefined;

    return (
        <div className="dev-hero-scene dev-hero-scene--1" aria-hidden={isScroll && opacity < 0.5}>
            {!isScroll && props.copyIndex !== undefined && (
                <DevHeroCopy blockIndex={props.copyIndex} />
            )}

            <div className={isScroll ? 'dev-scene-shell' : undefined} style={shellStyle}>
            <div className="dev-scene-ambient" aria-hidden="true">
                <div className="dev-orb dev-orb--one" />
                <div className="dev-orb dev-orb--two" />
                {showFloatCards &&
                    AI_FLOAT_CARDS.map((card, index) => {
                        const floatReveal = frozen ? 1 : scene1FloatReveal(local, index);
                        const tilt = getFloatCardTilt(index);
                        return (
                            <div
                                key={card.name}
                                className="dev-float-tool-card"
                                style={{
                                    ...getFloatCardPlacementStyle(index),
                                    ...enterSlideYWithRotate(floatReveal, 12, tilt, 0.92),
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

            <div className="dev-hero-grid" aria-hidden="true" />

            <div className="dev-scene-viewport">
                <div className="dev-scene-main">
                    <div
                        className="dev-terminal dev-glass-card"
                        style={enterSlideY(terminalReveal, 20)}
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
                            <p className="dev-terminal-prompt" style={{ opacity: typeProgress > 0 ? 1 : 0.35 }}>
                                {typedText}
                                {isScroll && !frozen && charCount < TYPEWRITER_TEXT.length && (
                                    <span className="dev-terminal-cursor" />
                                )}
                            </p>
                            <div className="dev-terminal-lines" aria-hidden="true">
                                <span style={{ width: '65%' }} />
                                <span style={{ width: '50%' }} />
                                <span style={{ width: '63%' }} />
                            </div>
                        </div>
                    </div>

                    <div className="dev-hero-badges">
                        {AI_TOOL_BADGES.map((badge, index) => {
                            const badgeProgress = frozen ? 1 : scene1BadgeReveal(local, index);
                            return (
                                <span
                                    key={badge.name}
                                    className="dev-hero-badge"
                                    style={enterSlideY(badgeProgress, 10)}
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
        </div>
    );
}
