import { Database, FolderOpen, Globe } from 'lucide-react';
import { MCP_SERVERS } from './sceneUtils';
import { DevHeroCopy } from './DevHeroCopy';
import { chapterShellStyle, enterSlideY, enterTranslateX, isSectionEnterComplete } from './devEnterStyle';
import { getChapterLocal, getChapterOpacity } from './devScrollMath';
import { mcpPanelReveal, mcpRowReveal, mcpToggleReveal } from './devSceneMotion';
import { TechBrandIcon, type TechBrandSlug } from './TechBrandIcon';

type DevHeroScene3Props =
    | { copyIndex: number; chapterIndex?: never; progress?: never }
    | { chapterIndex: number; progress: number; copyIndex?: never };

const SERVER_LUCIDE_ICONS = {
    browser: Globe,
    database: Database,
    filesystem: FolderOpen,
} as const;

function ServerIcon({ serverId, brand }: { serverId: string; brand?: TechBrandSlug }) {
    if (brand) {
        return <TechBrandIcon slug={brand} className="dev-mcp-panel-row-icon-svg" />;
    }
    const Icon = SERVER_LUCIDE_ICONS[serverId as keyof typeof SERVER_LUCIDE_ICONS];
    return Icon ? <Icon className="dev-mcp-panel-row-icon-svg dev-mcp-panel-row-icon-svg--lucide" /> : null;
}

export function DevHeroScene3(props: DevHeroScene3Props) {
    const isScroll = props.progress !== undefined;
    const local = isScroll ? getChapterLocal(props.progress, props.chapterIndex) : 1;
    const opacity = isScroll ? getChapterOpacity(props.progress, props.chapterIndex) : 1;
    const frozen = !isScroll || isSectionEnterComplete(local, 2);
    const panelReveal = frozen ? 1 : mcpPanelReveal(local);
    const linkProgress = MCP_SERVERS.map((_, index) =>
        frozen ? 1 : mcpToggleReveal(local, index),
    );
    const railFill = frozen
        ? 1
        : Math.max(0, ...linkProgress.map((value, index) => (value > 0.2 ? (index + value) / MCP_SERVERS.length : 0)));

    return (
        <div className="dev-hero-scene dev-hero-scene--3" aria-hidden={isScroll && opacity < 0.5}>
            {!isScroll && props.copyIndex !== undefined && (
                <DevHeroCopy blockIndex={props.copyIndex} />
            )}

            <div
                className={isScroll ? 'dev-scene-shell' : undefined}
                style={isScroll ? chapterShellStyle(opacity) : undefined}
            >
            <div className="dev-scene-viewport">
                <div
                    className="dev-mcp-panel dev-glass-card"
                    style={enterSlideY(panelReveal, 18, 0.97)}
                    aria-hidden="true"
                >
                    <div className="dev-mcp-panel-chrome">
                        <div className="dev-mcp-panel-title-wrap">
                            <TechBrandIcon slug="modelcontextprotocol" className="dev-mcp-panel-title-icon" />
                            <span className="dev-mcp-panel-title">MCP&nbsp;Servers</span>
                        </div>
                    </div>

                    <div className="dev-mcp-panel-body">
                        <div className="dev-mcp-connect-rail" aria-hidden="true">
                            <span className="dev-mcp-connect-rail-track" />
                            <span
                                className="dev-mcp-connect-rail-fill"
                                style={{ transform: `translateX(-50%) scaleY(${railFill.toFixed(3)})` }}
                            />
                            {MCP_SERVERS.map((server, index) => {
                                const nodeOn = frozen || linkProgress[index] > 0.45;
                                return (
                                    <span
                                        key={server.id}
                                        className={`dev-mcp-connect-node${nodeOn ? ' is-on' : ''}`}
                                        style={{
                                            top: `${((index + 0.5) / MCP_SERVERS.length) * 100}%`,
                                            opacity: Math.max(0.25, linkProgress[index]),
                                            transform: `translate(-50%, -50%) scale(${(0.7 + linkProgress[index] * 0.3).toFixed(3)})`,
                                        }}
                                    />
                                );
                            })}
                        </div>

                        <ul className="dev-mcp-panel-list">
                            {MCP_SERVERS.map((server, index) => {
                                const rowProgress = frozen ? 1 : mcpRowReveal(local, index);
                                const toggleProgress = frozen ? 1 : mcpToggleReveal(local, index);
                                const isOn = frozen || toggleProgress > 0.55;
                                const spur = frozen ? 1 : Math.min(1, Math.max(0, (toggleProgress - 0.15) / 0.45));

                                return (
                                    <li
                                        key={server.id}
                                        className={`dev-mcp-panel-row${isOn ? ' is-connected' : ''}`}
                                        style={enterSlideY(rowProgress, 8)}
                                    >
                                        <span
                                            className="dev-mcp-connect-spur"
                                            style={{
                                                opacity: spur,
                                                transform: `scaleX(${spur.toFixed(3)})`,
                                            }}
                                        />
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
                                                style={{ opacity: frozen || toggleProgress > 0.85 ? 1 : 0 }}
                                            >
                                                接続済み
                                            </span>
                                            <div className={`dev-mcp-panel-toggle${isOn ? ' is-on' : ''}`}>
                                                <span
                                                    className="dev-mcp-panel-toggle-knob"
                                                    style={{
                                                        transform: enterTranslateX(toggleProgress, 18),
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
            </div>
            </div>
        </div>
    );
}
