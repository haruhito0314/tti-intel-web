import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import {
    executeCommand,
    formatPrompt,
    getWelcomeLines,
    saveEditorFile,
    type EditorSession,
    type TerminalLine,
} from './commands';
import { getBestCompletion, getCompletions } from './completions';
import { TextEditor } from './TextEditor';
import { createInitialState, type ProjectState } from './virtualFs';

export interface TerminalHandle {
    runCommand: (command: string) => void;
    setInput: (command: string) => void;
    appendTutorialMessage: (text: string, type?: 'success' | 'info') => void;
    showReplay: (lines: TerminalLine[]) => void;
}

export interface TerminalTutorialEvent {
    type: 'command';
    command: string;
    stateBefore: ProjectState;
    stateAfter: ProjectState;
}

export interface TerminalEditorSavedEvent {
    type: 'editor_saved';
    file: string;
    content: string;
    stateAfter: ProjectState;
}

interface TerminalProps {
    state: ProjectState;
    onStateChange: (state: ProjectState) => void;
    onTutorialEvent?: (event: TerminalTutorialEvent | TerminalEditorSavedEvent) => void;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
    { state, onStateChange, onTutorialEvent },
    ref,
) {
    const [lines, setLines] = useState<TerminalLine[]>(getWelcomeLines);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [completionSession, setCompletionSession] = useState<{
        baseInput: string;
        candidates: string[];
    } | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [editorSession, setEditorSession] = useState<EditorSession | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const stateRef = useRef(state);
    const historyRef = useRef<string[]>([]);
    const lastEditorContentRef = useRef('');
    const lastSavedStateRef = useRef<ProjectState | null>(null);
    stateRef.current = state;
    historyRef.current = history;

    const ghostSuffix = editorSession || completionSession ? null : getBestCompletion(state, input);
    const suggestions = showSuggestions && !editorSession
        ? (completionSession?.candidates ?? getCompletions(state, input))
        : [];

    const clearCompletionSession = useCallback(() => {
        setCompletionSession(null);
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [lines]);

    const focusInput = useCallback(() => {
        if (!editorSession) {
            inputRef.current?.focus();
        }
    }, [editorSession]);

    const appendLines = useCallback((newLines: TerminalLine[]) => {
        setLines((prev) => {
            const next = [...prev, ...newLines];
            const MAX_LINES = 200;
            return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
        });
    }, []);

    const runCommand = useCallback(
        (raw: string) => {
            const trimmed = raw.trim();
            const currentState = stateRef.current;

            if (!trimmed) {
                setLines((prev) => [
                    ...prev,
                    { id: `in-${Date.now()}`, type: 'input', text: `${formatPrompt(currentState.cwd)} ${raw}` },
                ]);
                return;
            }

            setHistory((prev) => {
                const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 50);
                historyRef.current = next;
                return next;
            });
            setHistoryIndex(-1);

            const inputLine: TerminalLine = {
                id: `in-${Date.now()}`,
                type: 'input',
                text: `${formatPrompt(currentState.cwd)} ${raw}`,
            };

            const stateBefore = currentState;
            const result = executeCommand(currentState, trimmed, { history: historyRef.current });

            if (result.lines.some((l) => l.text === '__CLEAR__')) {
                setLines([]);
                setEditorSession(null);
                onStateChange(result.state);
                onTutorialEvent?.({
                    type: 'command',
                    command: trimmed,
                    stateBefore,
                    stateAfter: result.state,
                });
                return;
            }

            if (result.editor) {
                appendLines([inputLine]);
                setEditorSession(result.editor);
                lastEditorContentRef.current = result.editor.content;
                onStateChange(result.state);
                onTutorialEvent?.({
                    type: 'command',
                    command: trimmed,
                    stateBefore,
                    stateAfter: result.state,
                });
                return;
            }

            appendLines([inputLine, ...result.lines]);
            onStateChange(result.state);
            onTutorialEvent?.({
                type: 'command',
                command: trimmed,
                stateBefore,
                stateAfter: result.state,
            });
        },
        [appendLines, onStateChange, onTutorialEvent],
    );

    const handleEditorSave = useCallback((content: string) => {
        if (!editorSession) return;
        lastEditorContentRef.current = content;
        const result = saveEditorFile(stateRef.current, editorSession.file, content);
        if ('error' in result) return;
        lastSavedStateRef.current = result;
        onStateChange(result);
    }, [editorSession, onStateChange]);

    const handleEditorExit = useCallback((saved: boolean) => {
        if (!editorSession) return;
        const file = editorSession.file;
        const content = lastEditorContentRef.current;
        const stateAfter = lastSavedStateRef.current ?? stateRef.current;
        setEditorSession(null);
        lastSavedStateRef.current = null;
        if (saved) {
            appendLines([
                {
                    id: `ed-${Date.now()}`,
                    type: 'output',
                    text: `[ Wrote ${content.split('\n').length} line${content.split('\n').length === 1 ? '' : 's'} ]`,
                },
            ]);
            onTutorialEvent?.({
                type: 'editor_saved',
                file,
                content,
                stateAfter,
            });
        }
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [editorSession, appendLines, onTutorialEvent]);

    useImperativeHandle(ref, () => ({
        runCommand: (command: string) => {
            runCommand(command);
            setInput('');
            setShowSuggestions(false);
            clearCompletionSession();
            focusInput();
        },
        setInput: (command: string) => {
            setInput(command);
            setShowSuggestions(command.length > 0);
            clearCompletionSession();
            setTimeout(() => {
                inputRef.current?.focus();
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }, 0);
        },
        appendTutorialMessage: (text: string, type: 'success' | 'info' = 'info') => {
            appendLines([{ id: `tut-${Date.now()}`, type, text }]);
        },
        showReplay: (replayLines: TerminalLine[]) => {
            setLines(replayLines);
            setInput('');
            setShowSuggestions(false);
            clearCompletionSession();
            setEditorSession(null);
            focusInput();
        },
    }), [runCommand, focusInput, appendLines, clearCompletionSession]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();

            const inSession = completionSession
                && (input === completionSession.baseInput || completionSession.candidates.includes(input));
            const candidates = inSession
                ? completionSession.candidates
                : getCompletions(state, input);

            if (!candidates.length) return;

            if (candidates.length === 1) {
                setInput(candidates[0]);
                clearCompletionSession();
                setShowSuggestions(false);
                return;
            }

            const session = inSession
                ? completionSession
                : { baseInput: input, candidates };
            if (!inSession) {
                setCompletionSession(session);
            }

            const currentIndex = session.candidates.includes(input)
                ? session.candidates.indexOf(input)
                : -1;
            const nextIndex = e.shiftKey
                ? (currentIndex - 1 + candidates.length) % candidates.length
                : (currentIndex + 1) % candidates.length;

            setInput(candidates[nextIndex]);
            setShowSuggestions(true);
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!history.length) return;
            const nextIndex = Math.min(historyIndex + 1, history.length - 1);
            setHistoryIndex(nextIndex);
            setInput(history[nextIndex]);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex <= 0) {
                setHistoryIndex(-1);
                setInput('');
                return;
            }
            const nextIndex = historyIndex - 1;
            setHistoryIndex(nextIndex);
            setInput(history[nextIndex]);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            runCommand(input);
            setInput('');
            setShowSuggestions(false);
            clearCompletionSession();
        }
    };

    const lineColor = (type: TerminalLine['type']) => {
        switch (type) {
            case 'error':
                return 'text-[#FF6B6B]';
            case 'success':
                return 'text-[#63E6BE]';
            case 'info':
                return 'text-[#8E8E93]';
            case 'input':
                return 'text-[#F5F5F7]';
            default:
                return 'text-[#E5E5EA]';
        }
    };

    const headerTitle = editorSession
        ? editorSession.editor === 'nano'
            ? 'GNU nano'
            : editorSession.editor === 'vim'
              ? 'vim'
              : 'code'
        : 'demo@tti — zsh';

    return (
        <div
            className="flex h-[min(520px,70vh)] max-h-[520px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#1C1C1E] shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
            onClick={focusInput}
        >
            <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
                <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="ml-2 flex items-center gap-2 text-xs text-[#8E8E93]">
                    <TerminalIcon className="h-3.5 w-3.5" />
                    {headerTitle}
                </div>
                <span className="ml-auto rounded-full bg-[#FF9F0A]/20 px-2 py-0.5 text-[10px] font-semibold text-[#FF9F0A]">
                    DEMO
                </span>
            </div>

            {editorSession ? (
                <TextEditor
                    session={editorSession}
                    onSave={handleEditorSave}
                    onExit={handleEditorExit}
                />
            ) : (
                <>
                    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 font-mono text-[13px] leading-relaxed">
                        {lines.map((l) => (
                            <div key={l.id} className={`whitespace-pre-wrap break-words ${lineColor(l.type)}`}>
                                {l.text}
                            </div>
                        ))}
                    </div>

                    <div className="shrink-0 border-t border-white/10 bg-[#1C1C1E] px-4 py-3">
                        <div className="flex items-center">
                            <span className="shrink-0 text-[#63E6BE]">{formatPrompt(state.cwd)}</span>
                            <div className="grid min-h-5 min-w-[8ch] flex-1 items-baseline font-mono text-[13px] leading-5 [font-feature-settings:normal]">
                                {ghostSuffix && (
                                    <span
                                        className="pointer-events-none col-start-1 row-start-1 whitespace-pre text-[13px] leading-5 tracking-[0]"
                                        aria-hidden
                                    >
                                        <span className="text-transparent">{input}</span>
                                        <span className="text-[#48484A]">{ghostSuffix}</span>
                                    </span>
                                )}
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        clearCompletionSession();
                                        setShowSuggestions(e.target.value.length > 0);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    onBlur={() => setTimeout(() => {
                                        setShowSuggestions(false);
                                        clearCompletionSession();
                                    }, 150)}
                                    onFocus={() => input.length > 0 && setShowSuggestions(true)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="col-start-1 row-start-1 w-full min-w-0 appearance-none border-0 bg-transparent p-0 font-mono text-[13px] leading-5 tracking-[0] text-[#F5F5F7] caret-[#63E6BE] outline-none [font-feature-settings:normal]"
                                    spellCheck={false}
                                    autoComplete="off"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    aria-label="ターミナル入力"
                                />
                            </div>
                        </div>

                        {showSuggestions && suggestions.length > 1 && (
                            <div className="mt-2 max-h-[140px] overflow-y-auto rounded-xl border border-white/10 bg-[#2C2C2E] p-2">
                                <p className="mb-1 px-2 text-[10px] uppercase tracking-wider text-[#8E8E93]">
                                    Tab で候補を切り替え
                                </p>
                                {suggestions.slice(0, 8).map((s, i) => (
                                    <div
                                        key={`${s}-${i}`}
                                        className={`rounded-lg px-2 py-1 text-[12px] ${
                                            s === input
                                                ? 'bg-[#007AFF]/25 text-[#5AC8FA]'
                                                : 'text-[#AEAEB2]'
                                        }`}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
});

export function useCliState() {
    return useState<ProjectState>(createInitialState);
}
