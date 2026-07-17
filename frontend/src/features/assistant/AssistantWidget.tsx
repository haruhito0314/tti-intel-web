import {
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
    type RefObject,
} from 'react';
import {
    Ellipsis,
    EyeOff,
    RotateCcw,
    Sparkles,
    X,
} from 'lucide-react';
import { AssistantConversation } from './AssistantConversation';
import { useAssistant } from './useAssistant';
import { useAssistantDialogBehavior } from './useAssistantDialogBehavior';

const ASSISTANT_TRIGGER_DELAY_MS = import.meta.env.MODE === 'test' ? 0 : 2800;
const ASSISTANT_TRIGGER_SCROLL_PX = 140;

export interface AssistantWidgetProps {
    enabled: boolean;
    backgroundRef: RefObject<HTMLElement | null>;
}

export function AssistantWidget({
    enabled,
    backgroundRef,
}: AssistantWidgetProps) {
    const {
        messages,
        isOpen,
        isHiddenForTab,
        isSending,
        errorMessage,
        open,
        close,
        hideForTab,
        clearError,
        clearConversation,
        sendMessage,
    } = useAssistant();
    const generatedId = useId();
    const titleId = `assistant-title-${generatedId}`;
    const dialogRef = useRef<HTMLElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const detailsRef = useRef<HTMLDetailsElement>(null);
    const summaryRef = useRef<HTMLElement>(null);
    const [triggerReady, setTriggerReady] = useState(ASSISTANT_TRIGGER_DELAY_MS === 0);
    const active = enabled && isOpen && !isHiddenForTab;
    const { isMobile } = useAssistantDialogBehavior({
        active,
        hidden: isHiddenForTab || !enabled,
        dialogRef,
        inputRef,
        triggerRef,
        backgroundRef,
        onClose: close,
    });

    useEffect(() => {
        if (!enabled || isHiddenForTab || triggerReady) return;

        const markReady = () => setTriggerReady(true);
        const onScroll = () => {
            if (window.scrollY >= ASSISTANT_TRIGGER_SCROLL_PX) {
                markReady();
            }
        };

        if (window.scrollY >= ASSISTANT_TRIGGER_SCROLL_PX) {
            markReady();
            return;
        }

        const timer = window.setTimeout(markReady, ASSISTANT_TRIGGER_DELAY_MS);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('scroll', onScroll);
        };
    }, [enabled, isHiddenForTab, triggerReady]);

    if (!enabled || isHiddenForTab) {
        return null;
    }

    const handlePanelKeyDown = (
        event: KeyboardEvent<HTMLElement>,
    ) => {
        if (event.key !== 'Escape' || !detailsRef.current?.open) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        detailsRef.current.open = false;
        summaryRef.current?.focus();
    };

    const closeMenu = () => {
        if (detailsRef.current) {
            detailsRef.current.open = false;
        }
    };

    const handleHide = () => {
        closeMenu();
        hideForTab();
    };

    const handleClearConversation = () => {
        clearConversation();
        closeMenu();
        inputRef.current?.focus();
    };

    return (
        <div
            className={
                active
                    ? 'assistant-root assistant-root-open'
                    : 'assistant-root'
            }
        >
            {triggerReady && (
                <button
                    ref={triggerRef}
                    type="button"
                    className="assistant-trigger"
                    aria-label="AI Assistantを開く"
                    hidden={isOpen}
                    onClick={open}
                >
                    <Sparkles aria-hidden="true" />
                </button>
            )}

            {active && (
                <>
                    {isMobile && (
                        <div
                            className="assistant-scrim"
                            aria-hidden="true"
                            onClick={close}
                        />
                    )}
                    <section
                        ref={dialogRef}
                        className="assistant-panel"
                        role="dialog"
                        aria-labelledby={titleId}
                        aria-modal={isMobile}
                        onKeyDown={handlePanelKeyDown}
                    >
                        <header className="assistant-header">
                            <div className="assistant-header-title">
                                <span
                                    className="assistant-header-icon"
                                    aria-hidden="true"
                                >
                                    <Sparkles />
                                </span>
                                <h2 id={titleId} className="assistant-title">
                                    AI Assistant
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="assistant-close"
                                aria-label="AI Assistantを閉じる"
                                onClick={close}
                            >
                                <X aria-hidden="true" />
                            </button>
                        </header>

                        <AssistantConversation
                            messages={messages}
                            isSending={isSending}
                            errorMessage={errorMessage}
                            inputRef={inputRef}
                            onSubmit={sendMessage}
                            onClearError={clearError}
                        />

                        <details
                            ref={detailsRef}
                            className="assistant-menu"
                        >
                            <summary
                                ref={summaryRef}
                                className="assistant-menu-summary"
                                aria-label="AI Assistantのメニュー"
                            >
                                <Ellipsis aria-hidden="true" />
                            </summary>
                            <div className="assistant-menu-panel">
                                <button
                                    type="button"
                                    className="assistant-menu-button"
                                    disabled={isSending || messages.length === 0}
                                    onClick={handleClearConversation}
                                >
                                    <RotateCcw aria-hidden="true" />
                                    <span>新しい会話</span>
                                </button>
                                <button
                                    type="button"
                                    className="assistant-menu-button"
                                    onClick={handleHide}
                                >
                                    <EyeOff aria-hidden="true" />
                                    <span>このタブで右下ボタンを非表示</span>
                                </button>
                            </div>
                        </details>
                    </section>
                </>
            )}
        </div>
    );
}
