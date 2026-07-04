import { AI_TOOL_BADGES, TYPEWRITER_TEXT } from './sceneUtils';
import { TechBrandIcon } from './TechBrandIcon';

export function DevPagePreview() {
    return (
        <div className="dev-page-preview" aria-hidden="true">
            <div className="dev-page-preview-site-header">
                <span className="dev-page-preview-logo">TTI Intelligence</span>
            </div>

            <div className="dev-page-preview-hero">
                <div className="dev-page-preview-chapter">01 / 05</div>

                <h3 className="dev-page-preview-title">
                    つくる力は、AIで<span className="dev-gradient-text">加速する</span>。
                </h3>
                <p className="dev-page-preview-subtitle">
                    TTI Intelligenceの開発は、最新のAIコーディングツールとの対話から始まります。
                </p>

                <div className="dev-page-preview-editor">
                    <div className="dev-page-preview-editor-chrome">
                        <span className="dev-page-preview-tab">Development.tsx</span>
                    </div>
                    <div className="dev-page-preview-editor-body">
                        <p className="dev-page-preview-prompt">{TYPEWRITER_TEXT}</p>
                        <div className="dev-page-preview-lines">
                            <span style={{ width: '68%' }} />
                            <span style={{ width: '52%' }} />
                            <span style={{ width: '74%' }} />
                        </div>
                    </div>
                </div>

                <div className="dev-page-preview-badges">
                    {AI_TOOL_BADGES.map((badge) => (
                        <span key={badge.name} className="dev-page-preview-badge">
                            <TechBrandIcon slug={badge.icon} className="dev-page-preview-badge-icon" />
                            {badge.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
