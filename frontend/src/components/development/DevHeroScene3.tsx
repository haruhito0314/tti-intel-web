import { Database, FolderOpen, Globe } from 'lucide-react';
import { getSceneLocalProgress } from './useScrollProgress';
import { MCP_SERVERS } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import {
    CHAPTER_VISUAL_REVEAL_END,
    CHAPTER_VISUAL_REVEAL_START,
    chapterReveal,
    getVisualChapterMotion,
} from './chapterMotion';
import { TechBrandIcon, type TechBrandSlug } from './TechBrandIcon';

type DevHeroScene3Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

const SERVER_LUCIDE_ICONS = {
    browser: Globe,
    database: Database,
    filesystem: FolderOpen,
} as const;

function getServerRowProgress(local: number, index: number, staticMode: boolean): number {
    if (staticMode) return 1;
    const stagger = index * 0.14;
    const revealStart = 0.06 + stagger;
    const revealEnd = revealStart + 0.18;
    return chapterReveal(local, revealStart, revealEnd);
}

function getServerToggleProgress(local: number, index: number, staticMode: boolean): number {
    if (staticMode) return 1;
    const stagger = index * 0.14;
    const revealStart = 0.14 + stagger;
    const revealEnd = revealStart + 0.16;
    return chapterReveal(local, revealStart, revealEnd);
}

function ServerIcon({ serverId, brand }: { serverId: string; brand?: TechBrandSlug }) {
    if (brand) {
        return <TechBrandIcon slug={brand} className="dev-mcp-panel-row-icon-svg" />;
    }

    const Icon = SERVER_LUCIDE_ICONS[serverId as keyof typeof SERVER_LUCIDE_ICONS];
    return Icon ? <Icon className="dev-mcp-panel-row-icon-svg dev-mcp-panel-row-icon-svg--lucide" /> : null;
}

export function DevHeroScene3({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene3Props) {
    const local = staticMode ? 1 : getSceneLocalProgress(progress, 2);
    const visualMotion = getVisualChapterMotion(local, staticMode);
    const panelReveal = staticMode ? 1 : chapterReveal(local, CHAPTER_VISUAL_REVEAL_START, CHAPTER_VISUAL_REVEAL_END);

    return (
        <div
            className="dev-hero-scene dev-hero-scene--3"
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

            <div
                className="dev-mcp-panel dev-glass-card"
                aria-hidden="true"
                style={{
                    opacity: panelReveal,
                    transform: `translateY(${(1 - panelReveal) * 32}px) scale(${0.94 + panelReveal * 0.06})`,
                }}
            >
                <div className="dev-mcp-panel-chrome">
                    <div className="dev-mcp-panel-title-wrap">
                        <TechBrandIcon slug="modelcontextprotocol" className="dev-mcp-panel-title-icon" />
                        <span className="dev-mcp-panel-title">MCP&nbsp;Servers</span>
                    </div>
                </div>

                <ul className="dev-mcp-panel-list">
                    {MCP_SERVERS.map((server, index) => {
                        const rowProgress = getServerRowProgress(local, index, staticMode);
                        const toggleProgress = getServerToggleProgress(local, index, staticMode);
                        const isOn = toggleProgress > 0.55;

                        return (
                            <li
                                key={server.id}
                                className={`dev-mcp-panel-row${isOn ? ' is-connected' : ''}`}
                                style={{
                                    opacity: rowProgress,
                                    transform: `translateX(${(1 - rowProgress) * -40}px)`,
                                }}
                            >
                                <div className="dev-mcp-panel-row-icon">
                                    <ServerIcon
                                        serverId={server.id}
                                        brand={'brand' in server ? server.brand : undefined}
                                    />
                                </div>
                                <div className="dev-mcp-panel-row-body">
                                    <strong>{server.label}</strong>
                                    <span>{server.note}</span>
                                </div>
                                <div className="dev-mcp-panel-row-actions">
                                    <span
                                        className="dev-mcp-panel-status"
                                        style={{ opacity: toggleProgress > 0.85 ? 1 : 0 }}
                                    >
                                        接続済み
                                    </span>
                                    <div
                                        className={`dev-mcp-panel-toggle${isOn ? ' is-on' : ''}`}
                                        style={{
                                            ['--toggle-progress' as string]: toggleProgress,
                                        }}
                                    >
                                        <span
                                            className="dev-mcp-panel-toggle-knob"
                                            style={{
                                                transform: `translateX(${toggleProgress * 18}px)`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
