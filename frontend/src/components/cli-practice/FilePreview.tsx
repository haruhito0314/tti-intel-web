import { useEffect, useMemo, useState } from 'react';
import { Code2, Eye } from 'lucide-react';
import { isHtmlFile, wrapHtmlForPreview } from './htmlPreview';
import { readProjectFileByAbsolutePath, type ProjectState } from './virtualFs';

interface FilePreviewProps {
    state: ProjectState;
    absolutePath: string | null;
}

export function FilePreview({ state, absolutePath }: FilePreviewProps) {
    const [view, setView] = useState<'preview' | 'source'>('preview');

    const file = useMemo(() => {
        if (!absolutePath) return null;
        return readProjectFileByAbsolutePath(state, absolutePath);
    }, [absolutePath, state]);

    useEffect(() => {
        setView('preview');
    }, [absolutePath]);

    if (!absolutePath) {
        return (
            <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center px-4 py-6 text-center">
                <p className="text-xs leading-relaxed text-[#86868B]">
                    ファイルをクリックすると、ここに中身が表示されます。
                </p>
            </div>
        );
    }

    if (!file) {
        return (
            <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center px-4 py-6 text-center">
                <p className="text-xs text-[#FF453A]">ファイルを読み込めませんでした。</p>
            </div>
        );
    }

    const html = isHtmlFile(file.sourcePath);
    const isEmpty = file.content.length === 0;

    return (
        <div className="flex min-h-0 flex-1 flex-col border-t border-black/5 dark:border-white/10">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/5 px-3 py-2 dark:border-white/10">
                <p className="truncate font-mono text-[10px] text-[#86868B]">{file.sourcePath}</p>
                {html && !isEmpty && (
                    <div className="flex shrink-0 gap-1 rounded-lg bg-[#F5F5F7] p-0.5 dark:bg-white/[0.06]">
                        <button
                            type="button"
                            onClick={() => setView('preview')}
                            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                                view === 'preview'
                                    ? 'bg-white text-[#007AFF] shadow-sm dark:bg-[#2C2C2E] dark:text-[#5AC8FA]'
                                    : 'text-[#86868B]'
                            }`}
                        >
                            <Eye className="h-3 w-3" />
                            表示
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('source')}
                            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                                view === 'source'
                                    ? 'bg-white text-[#007AFF] shadow-sm dark:bg-[#2C2C2E] dark:text-[#5AC8FA]'
                                    : 'text-[#86868B]'
                            }`}
                        >
                            <Code2 className="h-3 w-3" />
                            ソース
                        </button>
                    </div>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
                {isEmpty ? (
                    <div className="flex h-full items-center justify-center p-4 text-xs text-[#86868B]">
                        （空のファイル）
                    </div>
                ) : html && view === 'preview' ? (
                    <iframe
                        title={`プレビュー: ${file.sourcePath}`}
                        sandbox=""
                        srcDoc={wrapHtmlForPreview(file.content)}
                        className="h-full w-full border-0 bg-white"
                    />
                ) : (
                    <pre className="h-full overflow-auto p-3 font-mono text-[11px] leading-relaxed text-[#1D1D1F] dark:text-[#E5E5EA]">
                        {file.content}
                    </pre>
                )}
            </div>
        </div>
    );
}
