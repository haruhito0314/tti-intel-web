import { useEffect, useRef, useState } from 'react';
import type { EditorSession } from './commands';

interface TextEditorProps {
    session: EditorSession;
    onSave: (content: string) => void;
    onExit: (saved: boolean) => void;
}

const EDITOR_META = {
    nano: {
        title: 'GNU nano 7.2',
        hint: '^O 保存   ^X 終了',
        bg: 'bg-[#1C1C1E]',
        header: 'border-white/10 bg-[#2C2C2E] text-[#E5E5EA]',
    },
    vim: {
        title: 'VIM - Vi IMproved',
        hint: 'INSERT モード   ^O 保存   ^X 終了',
        bg: 'bg-[#0D0D0D]',
        header: 'border-[#33AA33]/30 bg-[#1A1A1A] text-[#33AA33]',
    },
    code: {
        title: 'Visual Studio Code',
        hint: '⌘S / ^O 保存   ^X 終了',
        bg: 'bg-[#1E1E1E]',
        header: 'border-[#007ACC]/30 bg-[#252526] text-[#CCCCCC]',
    },
} as const;

export function TextEditor({ session, onSave, onExit }: TextEditorProps) {
    const meta = EDITOR_META[session.editor];
    const [content, setContent] = useState(session.content);
    const [status, setStatus] = useState('');
    const [exitPrompt, setExitPrompt] = useState(false);
    const savedContent = useRef(session.content);
    const savedToDisk = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const dirty = content !== savedContent.current;

    useEffect(() => {
        savedContent.current = session.content;
        savedToDisk.current = false;
        setContent(session.content);
        setStatus('');
        setExitPrompt(false);
    }, [session.file, session.content]);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const save = () => {
        onSave(content);
        savedContent.current = content;
        savedToDisk.current = true;
        const lineCount = content.split('\n').length;
        setStatus(`[ Wrote ${lineCount} line${lineCount === 1 ? '' : 's'} ]`);
        setExitPrompt(false);
    };

    const requestExit = () => {
        if (dirty) {
            setExitPrompt(true);
            setStatus('変更を保存しますか？ Y = 保存して終了 / N = 保存せず終了');
            return;
        }
        onExit(savedToDisk.current);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (exitPrompt) {
            if (e.key === 'y' || e.key === 'Y') {
                e.preventDefault();
                save();
                onExit(true);
            } else if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                onExit(false);
            }
            return;
        }

        if (e.ctrlKey && (e.key === 'o' || e.key === 's')) {
            e.preventDefault();
            save();
        }
        if (e.ctrlKey && e.key === 'x') {
            e.preventDefault();
            requestExit();
        }
    };

    return (
        <div className={`flex h-full min-h-0 flex-1 flex-col ${meta.bg}`}>
            <div className={`shrink-0 border-b px-3 py-2 font-mono text-[11px] ${meta.header}`}>
                <div className="flex items-center justify-between gap-2">
                    <span>{meta.title}</span>
                    <span className="truncate text-[#8E8E93]">{session.file}</span>
                </div>
                {session.editor === 'vim' && (
                    <p className="mt-1 text-[10px] text-[#33AA33]/80">-- INSERT --</p>
                )}
            </div>

            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                    setContent(e.target.value);
                    if (exitPrompt) setExitPrompt(false);
                }}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="min-h-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed text-[#F5F5F7] outline-none caret-[#63E6BE]"
                spellCheck={false}
            />

            <div className="shrink-0 border-t border-white/10 bg-[#2C2C2E] px-3 py-2">
                <p className="font-mono text-[11px] text-[#AEAEB2]">{status || meta.hint}</p>
                <div className="mt-2 flex gap-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            save();
                        }}
                        className="rounded-lg bg-[#007AFF]/20 px-2.5 py-1 text-[11px] font-medium text-[#5AC8FA] hover:bg-[#007AFF]/30"
                    >
                        保存 (^O)
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            requestExit();
                        }}
                        className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-[#AEAEB2] hover:bg-white/10"
                    >
                        終了 (^X)
                    </button>
                </div>
            </div>
        </div>
    );
}
