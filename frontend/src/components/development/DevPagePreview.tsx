import {
    AI_TOOL_BADGES,
    getScene4LayerMotion,
    getScene4StepReveal,
    getScene4TypewriterProgress,
    SCENE4_LINES_STEP,
    SCENE4_PREVIEW_BADGE_STEP,
    TYPEWRITER_TEXT,
} from './sceneUtils';
import { TechBrandIcon } from './TechBrandIcon';

type DevPagePreviewProps = {
    local: number;
    staticMode?: boolean;
};

/** Miniature of /development chapter 1 inside the section 4 browser mock */
export function DevPagePreview({ local, staticMode = false }: DevPagePreviewProps) {
    const headerReveal = getScene4StepReveal(local, 1, staticMode);
    const copyReveal = getScene4StepReveal(local, 2, staticMode);
    const terminalReveal = getScene4StepReveal(local, 3, staticMode);
    const typeProgress = getScene4TypewriterProgress(local, staticMode);
    const charCount = Math.floor(typeProgress * TYPEWRITER_TEXT.length);
    const typedText = TYPEWRITER_TEXT.slice(0, charCount);
    const linesReveal = getScene4StepReveal(local, SCENE4_LINES_STEP, staticMode);

    return (
        <div className="dev-page-preview" aria-hidden="true">
            <div className="dev-page-preview-site-header" style={getScene4LayerMotion(headerReveal, 8)}>
                <span className="dev-page-preview-logo-mark">
                    <img src="/load-assets/tti-crest.png" alt="" />
                </span>
                <span className="dev-page-preview-logo">TTI Intelligence</span>
            </div>

            <div className="dev-page-preview-stage dev-hero-background">
                <div className="dev-page-preview-copy" style={getScene4LayerMotion(copyReveal, 10)}>
                    <h3 className="dev-page-preview-title">
                        つくる力は、AIで<span className="dev-gradient-text">加速する</span>。
                    </h3>
                    <p className="dev-page-preview-subtitle">
                        TTI Intelligenceの開発は、最新のAIコーディングツールとの対話から始まります。
                    </p>
                </div>

                <div
                    className="dev-page-preview-terminal dev-terminal dev-glass-card"
                    style={getScene4LayerMotion(terminalReveal, 14)}
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
                        <div
                            className="dev-terminal-lines"
                            aria-hidden="true"
                            style={getScene4LayerMotion(linesReveal, 6)}
                        >
                            <span style={{ width: '62%' }} />
                            <span style={{ width: '48%' }} />
                            <span style={{ width: '71%' }} />
                        </div>
                    </div>
                </div>

                <div className="dev-page-preview-badges">
                    {AI_TOOL_BADGES.map((badge, index) => {
                        const badgeReveal = getScene4StepReveal(
                            local,
                            SCENE4_PREVIEW_BADGE_STEP + index,
                            staticMode,
                        );
                        return (
                            <span
                                key={badge.name}
                                className="dev-page-preview-badge"
                                style={getScene4LayerMotion(badgeReveal, 8)}
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
