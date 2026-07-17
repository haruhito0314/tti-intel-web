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
import { isExternalAssistantHref } from './assistantApi';
import {
    MAX_ASSISTANT_QUESTION_LENGTH,
    type AssistantUiMessage,
} from './types';

const TOO_LONG_MESSAGE = `質問は${MAX_ASSISTANT_QUESTION_LENGTH}文字以内で入力してください。`;
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
    const isComposingRef = useRef(false);
    const [draft, setDraft] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const sending = isSending || isSubmitting;
    const displayedError = localError ?? errorMessage;
    const canSubmit = draft.trim().length > 0 && !sending;

    useEffect(() => {
        const container = messagesRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages, sending]);

    const submitDraft = async (rawDraft = draft) => {
        if (submittingRef.current || isSending || isComposingRef.current) {
            return;
        }

        const trimmedDraft = rawDraft.trim();
        if (trimmedDraft.length === 0) {
            return;
        }
        if (trimmedDraft.length > MAX_ASSISTANT_QUESTION_LENGTH) {
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
        setDraft(event.target.value);
        setLocalError(null);
        if (errorMessage !== null) {
            onClearError();
        }
    };

    const handleCompositionStart = () => {
        isComposingRef.current = true;
    };

    const handleCompositionEnd = () => {
        isComposingRef.current = false;
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter') {
            return;
        }

        // Ignore Enter while IME is converting (some browsers still fire
        // keydown with isComposing=false on the confirm Enter; keyCode 229
        // and our composition ref cover that case).
        if (
            event.nativeEvent.isComposing
            || isComposingRef.current
            || event.keyCode === 229
        ) {
            return;
        }

        // Shift+Enter inserts a newline; Enter alone submits.
        if (event.shiftKey) {
            return;
        }

        event.preventDefault();
        void submitDraft();
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
                                                    {isExternalAssistantHref(link.href) ? (
                                                        <a
                                                            href={link.href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {link.title}
                                                        </a>
                                                    ) : (
                                                        <Link to={link.href}>
                                                            {link.title}
                                                        </Link>
                                                    )}
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
                        maxLength={MAX_ASSISTANT_QUESTION_LENGTH}
                        placeholder="メッセージを入力します"
                        disabled={sending}
                        aria-describedby={`${countId}${displayedError ? ` ${errorId}` : ''}`}
                        aria-invalid={displayedError !== null}
                        onChange={handleDraftChange}
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={handleCompositionEnd}
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
                    <span id={countId}>{draft.length} / {MAX_ASSISTANT_QUESTION_LENGTH}</span>
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
