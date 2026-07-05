import { AI_TOOL_BADGES, TYPEWRITER_TEXT } from './sceneUtils';
import { enterSlideY } from './devEnterStyle';
import { scene4StepReveal, scene4TypewriterProgress } from './devSceneMotion';
import { TechBrandIcon } from './TechBrandIcon';

type DevPagePreviewProps = {
    local?: number;
    animated?: boolean;
    frozen?: boolean;
};

/** Miniature of /development chapter 1 inside the section 4 browser mock */
export function DevPagePreview({ local = 1, animated = false, frozen = false }: DevPagePreviewProps) {
    const headerReveal = frozen ? 1 : animated ? scene4StepReveal(local, 1) : 1;
    const copyReveal = frozen ? 1 : animated ? scene4StepReveal(local, 2) : 1;
    const terminalReveal = frozen ? 1 : animated ? scene4StepReveal(local, 3) : 1;
    const typeProgress = frozen ? 1 : animated ? scene4TypewriterProgress(local) : 1;
    const charCount = Math.floor(typeProgress * TYPEWRITER_TEXT.length);
    const typedText = frozen || !animated ? TYPEWRITER_TEXT : TYPEWRITER_TEXT.slice(0, charCount);
    const linesReveal = frozen ? 1 : animated ? scene4StepReveal(local, 5) : 1;

    return (
        <div className="dev-page-preview" aria-hidden="true">
            <div className="dev-page-preview-site-header" style={enterSlideY(headerReveal, 8)}>
                <span className="dev-page-preview-logo-mark">
                    <img src="/load-assets/tti-crest.png" alt="" />
                </span>
                <span className="dev-page-preview-logo">TTI Intelligence</span>
            </div>

            <div className="dev-page-preview-stage dev-hero-background">
                <div className="dev-page-preview-copy" style={enterSlideY(copyReveal, 10)}>
                    <h3 className="dev-page-preview-title">
                        つくる力は、AIで<span className="dev-gradient-text">加速する</span>。
                    </h3>
                    <p className="dev-page-preview-subtitle">
                        TTI Intelligenceの開発は、最新のAIコーディングツールとの対話から始まります。
                    </p>
                </div>

                <div
                    className="dev-page-preview-terminal dev-terminal dev-glass-card"
                    style={enterSlideY(terminalReveal, 14)}
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
                            {animated && !frozen && charCount < TYPEWRITER_TEXT.length && (
                                <span className="dev-terminal-cursor" />
                            )}
                        </p>
                        <div className="dev-terminal-lines" aria-hidden="true" style={enterSlideY(linesReveal, 6)}>
                            <span style={{ width: '62%' }} />
                            <span style={{ width: '48%' }} />
                            <span style={{ width: '71%' }} />
                        </div>
                    </div>
                </div>

                <div className="dev-page-preview-badges">
                    {AI_TOOL_BADGES.map((badge, index) => {
                        const badgeReveal = frozen ? 1 : animated ? scene4StepReveal(local, 6 + index) : 1;
                        return (
                            <span
                                key={badge.name}
                                className="dev-page-preview-badge"
                                style={enterSlideY(badgeReveal, 8)}
                            >
                                <TechBrandIcon slug={badge.icon} className="dev-page-preview-badge-icon" />
                                {badge.name}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
