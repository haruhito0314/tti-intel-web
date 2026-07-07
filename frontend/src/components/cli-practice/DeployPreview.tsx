import { ExternalLink, Globe } from 'lucide-react';
import { wrapHtmlForPreview } from './htmlPreview';
import { getUserHtmlPage, type ProjectState } from './virtualFs';

interface DeployPreviewProps {
    state: ProjectState;
}

export function DeployPreview({ state }: DeployPreviewProps) {
    const userPage = getUserHtmlPage(state);

    if (!state.deployed) {
        return (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-black/10 bg-[#F5F5F7]/80 p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#007AFF]/10 dark:bg-[#2997FF]/10">
                    <Globe className="h-7 w-7 text-[#007AFF] dark:text-[#5AC8FA]" />
                </div>
                <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    デプロイプレビュー
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                    <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">npm run build</code>
                    {' → '}
                    <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">npm run deploy</code>
                    {' '}を実行すると、作った HTML がここに表示されます。
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-lg dark:border-white/10 dark:bg-[#111113]">
            <div className="flex items-center gap-2 border-b border-black/5 bg-[#F5F5F7] px-4 py-2.5 dark:border-white/10 dark:bg-[#1C1C1E]">
                <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                </div>
                <div className="mx-auto flex max-w-[70%] items-center gap-2 rounded-lg bg-white px-3 py-1 font-mono text-[11px] text-[#6E6E73] dark:bg-[#2C2C2E] dark:text-[#AEAEB2]">
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate">{state.deployUrl}</span>
                </div>
            </div>

            <div className="min-h-0 flex-1 bg-white">
                {userPage && userPage.content.trim() ? (
                    <iframe
                        title="デプロイプレビュー"
                        sandbox=""
                        srcDoc={wrapHtmlForPreview(userPage.content)}
                        className="h-full w-full border-0"
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <p className="text-sm text-[#6E6E73] dark:text-[rgba(235,235,245,0.65)]">
                            pages/about.html がまだ空です。nano で書いた内容がここに表示されます。
                        </p>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between border-t border-black/5 px-4 py-2.5 text-xs dark:border-white/10">
                <span className="text-[#86868B]">
                    {userPage ? `表示元: ${userPage.sourcePath}` : 'about.html が見つかりません'}
                </span>
                <span className="inline-flex items-center gap-1 text-[#0066CC] dark:text-[#5AC8FA]">
                    {state.deployUrl}
                    <ExternalLink className="h-3 w-3" />
                </span>
            </div>
        </div>
    );
}
