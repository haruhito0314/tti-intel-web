import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { FilePreview } from './FilePreview';
import { buildOptTree, buildTree, getParentPath, relativeToProject, type ProjectState, type TreeEntry } from './virtualFs';

const ROOT_PATH = '/Users/demo/my-website';
const HOMEBREW_PATH = '/opt/homebrew';

interface FileTreePanelProps {
    state: ProjectState;
}

function collectAncestorPaths(path: string): string[] {
    const paths: string[] = [];
    let current = path;
    while (current.startsWith('/Users/demo')) {
        paths.push(current);
        const parent = getParentPath(current);
        if (parent === current) break;
        current = parent;
    }
    return paths;
}

function TreeNode({
    name,
    type,
    path,
    depth,
    cwd,
    selectedPath,
    children,
    expanded,
    onToggle,
    onSelectFile,
}: {
    name: string;
    type: 'file' | 'dir';
    path: string;
    depth: number;
    cwd: string;
    selectedPath: string | null;
    children?: TreeEntry[];
    expanded: Set<string>;
    onToggle: (path: string) => void;
    onSelectFile: (path: string) => void;
}) {
    const isActive = cwd === path;
    const isSelected = selectedPath === path;
    const isOpen = type === 'dir' && expanded.has(path);

    const handleClick = () => {
        if (type === 'dir') {
            onToggle(path);
            return;
        }
        onSelectFile(path);
    };

    return (
        <div>
            <button
                type="button"
                onClick={handleClick}
                className={`flex w-full items-center gap-1 rounded-lg px-2 py-1 text-left text-[12px] transition-colors cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${
                    isSelected
                        ? 'bg-[#30D158]/12 text-[#248A3D] dark:text-[#30D158]'
                        : isActive
                          ? 'bg-[#007AFF]/15 text-[#007AFF] dark:text-[#5AC8FA]'
                          : 'text-[#1D1D1F] dark:text-[#E5E5EA]'
                }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
                {type === 'dir' ? (
                    isOpen ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-[#86868B]" />
                    ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-[#86868B]" />
                    )
                ) : (
                    <span className="w-3 shrink-0" />
                )}
                {type === 'dir' ? (
                    isOpen ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#FF9F0A]" />
                    ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0 text-[#FF9F0A]" />
                    )
                ) : (
                    <File className="h-3.5 w-3.5 shrink-0 text-[#8E8E93]" />
                )}
                <span className="truncate">{name}</span>
            </button>
            {type === 'dir' && isOpen && children?.map((child) => (
                <TreeNode
                    key={child.path}
                    name={child.name}
                    type={child.type}
                    path={child.path}
                    depth={depth + 1}
                    cwd={cwd}
                    selectedPath={selectedPath}
                    children={child.children}
                    expanded={expanded}
                    onToggle={onToggle}
                    onSelectFile={onSelectFile}
                />
            ))}
        </div>
    );
}

export function FileTreePanel({ state }: FileTreePanelProps) {
    const tree = useMemo(() => buildTree(state), [state]);
    const homebrewTree = useMemo(() => buildOptTree(state), [state]);
    const relCwd = relativeToProject(state.cwd);
    const displayCwd = relCwd === '.' ? 'my-website/' : `my-website/${relCwd}`;

    const [expanded, setExpanded] = useState<Set<string>>(() => new Set(collectAncestorPaths(state.cwd)));
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    useEffect(() => {
        setExpanded((prev) => {
            const next = new Set(prev);
            for (const path of collectAncestorPaths(state.cwd)) {
                next.add(path);
            }
            return next;
        });
    }, [state.cwd]);

    useEffect(() => {
        if (state.brewInstalled) {
            setExpanded((prev) => new Set(prev).add(HOMEBREW_PATH));
        }
    }, [state.brewInstalled]);

    useEffect(() => {
        if (state.nodeInstalled) {
            setExpanded((prev) => {
                const next = new Set(prev);
                next.add(HOMEBREW_PATH);
                next.add(`${HOMEBREW_PATH}/Cellar`);
                next.add(`${HOMEBREW_PATH}/Cellar/node`);
                next.add(`${HOMEBREW_PATH}/Cellar/node/20.11.0`);
                return next;
            });
        }
    }, [state.nodeInstalled]);

    useEffect(() => {
        if (state.dependenciesInstalled) {
            setExpanded((prev) => new Set(prev).add(`${ROOT_PATH}/node_modules`));
        }
    }, [state.dependenciesInstalled]);

    const toggleExpand = (path: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    return (
        <div className="flex h-[min(520px,70vh)] max-h-[520px] flex-col overflow-hidden rounded-[24px] border border-black/5 bg-white dark:border-white/10 dark:bg-[#111113]">
            <div className="shrink-0 border-b border-black/5 px-4 py-3 dark:border-white/10">
                <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">ファイル構造</h3>
                <p className="mt-0.5 truncate font-mono text-[11px] text-[#86868B]">{displayCwd}</p>
            </div>

            <div className="min-h-0 max-h-[42%] shrink-0 overflow-y-auto border-b border-black/5 p-2 dark:border-white/10">
                {homebrewTree.length > 0 && (
                    <TreeNode
                        name="opt/homebrew"
                        type="dir"
                        path={HOMEBREW_PATH}
                        depth={0}
                        cwd={state.cwd}
                        selectedPath={selectedPath}
                        children={homebrewTree}
                        expanded={expanded}
                        onToggle={toggleExpand}
                        onSelectFile={setSelectedPath}
                    />
                )}
                <TreeNode
                    name="my-website"
                    type="dir"
                    path={ROOT_PATH}
                    depth={0}
                    cwd={state.cwd}
                    selectedPath={selectedPath}
                    children={tree}
                    expanded={expanded}
                    onToggle={toggleExpand}
                    onSelectFile={setSelectedPath}
                />
            </div>

            <FilePreview state={state} absolutePath={selectedPath} />

            <div className="shrink-0 border-t border-black/5 px-4 py-3 dark:border-white/10">
                <div className="flex flex-wrap gap-2 text-[10px]">
                    <StatusPill label="brew" active={state.brewInstalled} />
                    <StatusPill label="node" active={state.nodeInstalled} />
                    <StatusPill label="Git" active={state.git.initialized} />
                    <StatusPill label="push" active={state.git.pushed} />
                    <StatusPill label="npm" active={state.dependenciesInstalled} />
                    <StatusPill label="build" active={state.built} />
                    <StatusPill label="deploy" active={state.deployed} />
                </div>
            </div>
        </div>
    );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
    return (
        <span
            className={`rounded-full px-2 py-0.5 font-medium ${
                active
                    ? 'bg-[#30D158]/15 text-[#248A3D] dark:text-[#30D158]'
                    : 'bg-[#F5F5F7] text-[#86868B] dark:bg-white/5'
            }`}
        >
            {label}
        </span>
    );
}
