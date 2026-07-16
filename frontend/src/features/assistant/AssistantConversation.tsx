import {
    useEffect,
    useId,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
    type KeyboardEvent,
    type RefObject,
} from 'react';
import { Link } from 'react-router-dom';
import type { AssistantUiMessage } from './types';

const MAX_QUESTION_LENGTH = 500;
const TOO_LONG_MESSAGE = '質問は500文字以内で入力してください。';
const GREETING_MESSAGE = '何かお困りですか？このサイトをご案内します。';

export interface AssistantConversationProps {
    messages: readonly AssistantUiMessage[];
    isSending: boolean;
    errorMessage: string | null;
    inputRef: RefObject<HTMLTextAreaElement | null>;
    onSubmit(message: string): Promise<boolean>;
    onClearError(): void;
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
        setDraft(event.target.value);
        setLocalError(null);
        if (errorMessage !== null) {
            onClearError();
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (
            event.key !== 'Enter'
            || event.shiftKey
            || event.nativeEvent.isComposing
        ) {
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
                <article
                    className="assistant-message assistant-message-assistant"
                    aria-label="AI Assistantの回答"
                >
                    <p>{GREETING_MESSAGE}</p>
                </article>
                {messages.map((message) => (
                    <article
                        key={message.id}
                        className={`assistant-message assistant-message-${message.role}`}
                        aria-label={
                            message.role === 'user'
                                ? 'あなたの質問'
                                : 'AI Assistantの回答'
                        }
                    >
                        <p>{message.content}</p>
                        {message.role === 'assistant' && message.links.length > 0 && (
                            <nav
                                className="assistant-message-links"
                                aria-label="関連ページ"
                            >
                                <ul>
                                    {message.links.map((link) => (
                                        <li key={link.pageId}>
                                            <Link to={link.href}>{link.title}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        )}
                    </article>
                ))}
                {sending && (
                    <p className="assistant-status">
                        回答を準備しています…
                    </p>
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
                    <button type="submit" disabled={sending}>
                        送信
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
