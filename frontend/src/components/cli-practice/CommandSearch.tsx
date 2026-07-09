import { useMemo, useState } from 'react';
import { Copy, Search, Terminal } from 'lucide-react';
import {
    COMMAND_CATALOG,
    COMMAND_CATEGORIES,
    searchCommands,
    type CommandCategory,
    type CommandEntry,
} from './commandCatalog';

interface CommandSearchProps {
    onInsertCommand?: (command: string) => void;
}

const CATEGORY_ORDER: CommandCategory[] = ['basic', 'file', 'git', 'npm', 'network', 'system'];

export function CommandSearch({ onInsertCommand }: CommandSearchProps) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<CommandCategory | 'all'>('basic');
    const [copied, setCopied] = useState<string | null>(null);

    const results = useMemo(() => {
        let list = searchCommands(query);
        if (category !== 'all') {
            list = list.filter((e) => e.category === category);
        }
        return list;
    }, [query, category]);

    const handleCopy = async (cmd: string) => {
        try {
            await navigator.clipboard.writeText(cmd);
            setCopied(cmd);
            setTimeout(() => setCopied(null), 1500);
        } catch {
            // ignore
        }
    };

    return (
        <div className="flex h-[min(560px,68vh)] max-h-[560px] flex-col overflow-hidden rounded-[24px] border border-black/5 bg-white dark:border-white/10 dark:bg-[#111113]">
            <div className="shrink-0 border-b border-black/5 px-4 py-4 dark:border-white/10">
                <div className="mb-3 flex items-center gap-2">
                    <Search className="h-5 w-5 text-[#007AFF] dark:text-[#5AC8FA]" />
                    <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">コマンド検索</h3>
                </div>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868B]" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="キーワードで検索（例: git, デプロイ, ファイル）"
                        className="w-full rounded-xl border border-black/10 bg-[#F5F5F7] py-2.5 pl-10 pr-4 text-sm text-[#1D1D1F] outline-none ring-[#007AFF]/30 placeholder:text-[#86868B] focus:border-[#007AFF] focus:ring-2 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#F5F5F7] dark:placeholder:text-[rgba(235,235,245,0.45)]"
                    />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <CategoryChip
                        label="すべて"
                        active={category === 'all'}
                        onClick={() => setCategory('all')}
                    />
                    {CATEGORY_ORDER.map((cat) => (
                        <CategoryChip
                            key={cat}
                            label={COMMAND_CATEGORIES[cat]}
                            active={category === cat}
                            onClick={() => setCategory(cat)}
                        />
                    ))}
                </div>
                <p className="mt-2 text-xs text-[#86868B] dark:text-[rgba(235,235,245,0.5)]">
                    {results.length} 件 / 全 {COMMAND_CATALOG.length} コマンド
                </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {results.length === 0 ? (
                    <p className="px-2 py-8 text-center text-sm text-[#86868B]">
                        一致するコマンドがありません
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {results.map((entry) => (
                            <CommandCard
                                key={entry.command}
                                entry={entry}
                                copied={copied === entry.command}
                                onCopy={() => handleCopy(entry.command)}
                                onTry={() => onInsertCommand?.(entry.example ?? entry.command)}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function CategoryChip({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                    ? 'bg-[#007AFF] text-white dark:bg-[#2997FF]'
                    : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#E8E8ED] dark:bg-white/[0.06] dark:text-[rgba(235,235,245,0.65)] dark:hover:bg-white/10'
            }`}
        >
            {label}
        </button>
    );
}

function CommandCard({
    entry,
    copied,
    onCopy,
    onTry,
}: {
    entry: CommandEntry;
    copied: boolean;
    onCopy: () => void;
    onTry: () => void;
}) {
    return (
        <li className="rounded-xl border border-black/5 bg-[#F5F5F7]/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <code className="font-mono text-sm font-semibold text-[#007AFF] dark:text-[#5AC8FA]">
                            {entry.command}
                        </code>
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-[#86868B] dark:bg-white/8">
                            {COMMAND_CATEGORIES[entry.category]}
                        </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {entry.summary}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.58)]">
                        {entry.description}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-[#86868B] dark:text-[rgba(235,235,245,0.45)]">
                        {entry.usage}
                    </p>
                </div>
            </div>
            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTry();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#007AFF]/10 px-2.5 py-1.5 text-xs font-medium text-[#007AFF] transition-colors hover:bg-[#007AFF]/20 dark:bg-[#2997FF]/15 dark:text-[#5AC8FA] dark:hover:bg-[#2997FF]/25"
                >
                    <Terminal className="h-3.5 w-3.5" />
                    ターミナルに入力
                </button>
                <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#6E6E73] transition-colors hover:bg-black/5 dark:text-[rgba(235,235,245,0.6)] dark:hover:bg-white/8"
                >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'コピーしました' : 'コピー'}
                </button>
            </div>
        </li>
    );
}
