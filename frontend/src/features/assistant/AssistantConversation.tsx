import {
    useEffect,
    useId,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
    type KeyboardEvent,
    type ReactNode,
    type RefObject,
} from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AssistantUiMessage } from './types';

const MAX_QUESTION_LENGTH = 500;
const TOO_LONG_MESSAGE = '質問は500文字以内で入力してください。';
const GREETING_MESSAGE =
    'こんにちは。私はこのサイトを案内するAIアシスタントです。ページの探し方や公開コンテンツについて、気軽に聞いてください。';

export interface AssistantConversationProps {
    messages: readonly AssistantUiMessage[];
    isSending: boolean;
    errorMessage: string | null;
    inputRef: RefObject<HTMLTextAreaElement | null>;
    onSubmit(message: string): Promise<boolean>;
    onClearError(): void;
}

function AssistantAvatar() {
    return (
        <span className="assistant-avatar" aria-hidden="true">
            <Sparkles />
        </span>
    );
}

function AssistantMessageRow({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="assistant-message-row assistant-message-row-assistant">
            <AssistantAvatar />
            {children}
        </div>
    );
}

export function AssistantConversation({
    messages,
    isSending,
    errorMessage,
    inputRef,
    onSubmit,
    onClearError,
}: AssistantConversationProps) {
    const inputId = useId();
    const countId = `${inputId}-count`;
    const errorId = `${inputId}-error`;
    const messagesRef = useRef<HTMLDivElement>(null);
    const submittingRef = useRef(false);
    const [draft, setDraft] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const sending = isSending || isSubmitting;
    const displayedError = localError ?? errorMessage;
    const canSubmit = draft.trim().length > 0 && !sending;

    const enterCountRef = useRef(0);
    const lastEnterAtRef = useRef(0);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetEnterSequence = () => {
        enterCountRef.current = 0;
        lastEnterAtRef.current = 0;
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
    };

    useEffect(() => {
        const container = messagesRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages, sending]);

    const submitDraft = async (rawDraft = draft) => {
        if (submittingRef.current || isSending) {
            return;
        }

        const trimmedDraft = rawDraft.trim();
        if (trimmedDraft.length === 0) {
            return;
        }
        if (trimmedDraft.length > MAX_QUESTION_LENGTH) {
            setLocalError(TOO_LONG_MESSAGE);
            return;
        }

        setLocalError(null);
        submittingRef.current = true;
        setIsSubmitting(true);

        try {
            const succeeded = await onSubmit(trimmedDraft);
            if (succeeded) {
                setDraft('');
            }
        } catch {
            // The provider exposes a user-safe error and false/rejection both retain the draft.
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        resetEnterSequence();
        setDraft(event.target.value);
        setLocalError(null);
        if (errorMessage !== null) {
            onClearError();
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter') return;
        if (event.nativeEvent.isComposing) return;

        // Keep Shift+Enter as a plain newline (no submit).
        if (event.shiftKey) return;

        // Explicit submit shortcut (Ctrl/Cmd + Enter).
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            resetEnterSequence();
            void submitDraft();
            return;
        }

        // Submit on "Enter twice" (double Enter) to support quick multi-line messages.
        const now = Date.now();
        const DOUBLE_ENTER_WINDOW_MS = 900;

        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }

        // First Enter: allow newline to be inserted by the browser.
        if (enterCountRef.current === 0) {
            enterCountRef.current = 1;
            lastEnterAtRef.current = now;
            resetTimerRef.current = setTimeout(() => {
                resetEnterSequence();
            }, DOUBLE_ENTER_WINDOW_MS);
            return;
        }

        // Second Enter: if it's within the window, submit.
        const delta = now - lastEnterAtRef.current;
        if (delta <= DOUBLE_ENTER_WINDOW_MS) {
            resetEnterSequence();
            event.preventDefault();
            void submitDraft();
            return;
        }

        // Outside the window: treat this Enter as the new first Enter.
        enterCountRef.current = 1;
        lastEnterAtRef.current = now;
        resetTimerRef.current = setTimeout(() => {
            resetEnterSequence();
        }, DOUBLE_ENTER_WINDOW_MS);
    };

    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submitDraft();
    };

    return (
        <div className="assistant-conversation">
            <div
                ref={messagesRef}
                className="assistant-messages"
                role="log"
                aria-label="会話"
                aria-live="polite"
            >
                <AssistantMessageRow>
                    <article
                        className="assistant-message assistant-message-assistant"
                        aria-label="AI Assistantの回答"
                    >
                        <p>{GREETING_MESSAGE}</p>
                    </article>
                </AssistantMessageRow>
                {messages.map((message) => (
                    message.role === 'assistant' ? (
                        <AssistantMessageRow key={message.id}>
                            <article
                                className="assistant-message assistant-message-assistant"
                                aria-label="AI Assistantの回答"
                            >
                                <p>{message.content}</p>
                                {message.links.length > 0 && (
                                    <nav
                                        className="assistant-message-links"
                                        aria-label="関連ページ"
                                    >
                                        <ul>
                                            {message.links.map((link) => (
                                                <li key={`${link.pageId}:${link.href}`}>
                                                    <Link to={link.href}>
                                                        {link.title}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </nav>
                                )}
                            </article>
                        </AssistantMessageRow>
                    ) : (
                        <div
                            key={message.id}
                            className="assistant-message-row assistant-message-row-user"
                        >
                            <article
                                className="assistant-message assistant-message-user"
                                aria-label="あなたの質問"
                            >
                                <p>{message.content}</p>
                            </article>
                        </div>
                    )
                ))}
                {sending && (
                    <AssistantMessageRow>
                        <p className="assistant-status">
                            回答を準備しています…
                        </p>
                    </AssistantMessageRow>
                )}
            </div>

            <form className="assistant-form" onSubmit={handleFormSubmit}>
                <label
                    className="assistant-visually-hidden"
                    htmlFor={inputId}
                >
                    質問
                </label>
                <div className="assistant-input-row">
                    <textarea
                        ref={inputRef}
                        id={inputId}
                        value={draft}
                        rows={1}
                        maxLength={MAX_QUESTION_LENGTH}
                        placeholder="メッセージを入力します"
                        disabled={sending}
                        aria-describedby={`${countId}${displayedError ? ` ${errorId}` : ''}`}
                        aria-invalid={displayedError !== null}
                        onChange={handleDraftChange}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        type="submit"
                        className="assistant-send"
                        aria-label="送信"
                        disabled={!canSubmit}
                    >
                        <Send aria-hidden="true" />
                    </button>
                </div>
                <div className="assistant-form-meta">
                    <span id={countId}>{draft.length} / {MAX_QUESTION_LENGTH}</span>
                </div>
                {displayedError && (
                    <p id={errorId} role="alert">
                        {displayedError}
                    </p>
                )}
            </form>
        </div>
    );
}
