import {
    useId,
    useRef,
    type KeyboardEvent,
    type RefObject,
} from 'react';
import {
    Ellipsis,
    EyeOff,
    Sparkles,
    X,
} from 'lucide-react';
import { AssistantConversation } from './AssistantConversation';
import { useAssistant } from './useAssistant';
import { useAssistantDialogBehavior } from './useAssistantDialogBehavior';

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
        sendMessage,
    } = useAssistant();
    const generatedId = useId();
    const titleId = `assistant-title-${generatedId}`;
    const dialogRef = useRef<HTMLElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const detailsRef = useRef<HTMLDetailsElement>(null);
    const summaryRef = useRef<HTMLElement>(null);
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

    const handleHide = () => {
        if (detailsRef.current) {
            detailsRef.current.open = false;
        }
        hideForTab();
    };

    return (
        <div
            className={
                active
                    ? 'assistant-root assistant-root-open'
                    : 'assistant-root'
            }
        >
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

            {active && (
                <section
                    ref={dialogRef}
                    className="assistant-panel"
                    role="dialog"
                    aria-labelledby={titleId}
                    aria-modal={isMobile}
                    onKeyDown={handlePanelKeyDown}
                >
                    <header className="assistant-header">
                        <h2 id={titleId} className="assistant-title">
                            AI Assistant
                        </h2>
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
                        <button
                            type="button"
                            className="assistant-menu-button"
                            onClick={handleHide}
                        >
                            <EyeOff aria-hidden="true" />
                            <span>このタブで右下ボタンを非表示</span>
                        </button>
                    </details>
                </section>
            )}
        </div>
    );
}
