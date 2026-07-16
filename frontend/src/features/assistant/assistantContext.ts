import { createContext } from 'react';
import type { AssistantUiMessage } from './types';

export interface AssistantContextValue {
    messages: readonly AssistantUiMessage[];
    isOpen: boolean;
    isHiddenForTab: boolean;
    isSending: boolean;
    errorMessage: string | null;
    open(): void;
    close(): void;
    hideForTab(): void;
    clearError(): void;
    sendMessage(message: string): Promise<boolean>;
}

export const AssistantContext = createContext<AssistantContextValue | null>(null);
