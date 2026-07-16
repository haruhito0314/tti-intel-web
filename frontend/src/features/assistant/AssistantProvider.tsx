import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
    assistantApi,
    AssistantApiError,
    ASSISTANT_ERROR_MESSAGES,
} from './assistantApi';
import {
    AssistantContext,
    type AssistantContextValue,
} from './assistantContext';
import type {
    AssistantClient,
    AssistantHistoryMessage,
    AssistantUiMessage,
} from './types';

function createUuid() {
    return crypto.randomUUID();
}

export interface AssistantProviderProps {
    children: ReactNode;
    client?: AssistantClient;
    createId?: () => string;
}

export function AssistantProvider({
    children,
    client = assistantApi,
    createId = createUuid,
}: AssistantProviderProps) {
    const { pathname } = useLocation();
    const [sessionId] = useState(createId);
    const [messages, setMessages] = useState<AssistantUiMessage[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isHiddenForTab, setIsHiddenForTab] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const messagesRef = useRef<AssistantUiMessage[]>([]);
    const pathnameRef = useRef(pathname);
    const skipPathCloseRef = useRef(true);
    const hiddenRef = useRef(false);
    const sendingRef = useRef(false);
    const mountedRef = useRef(true);

    pathnameRef.current = pathname;

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (skipPathCloseRef.current) {
            skipPathCloseRef.current = false;
            return;
        }
        setIsOpen(false);
    }, [pathname]);

    const open = useCallback(() => {
        if (!hiddenRef.current) {
            setIsOpen(true);
        }
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
    }, []);

    const hideForTab = useCallback(() => {
        hiddenRef.current = true;
        setIsHiddenForTab(true);
        setIsOpen(false);
    }, []);

    const clearError = useCallback(() => {
        setErrorMessage(null);
    }, []);

    const sendMessage = useCallback(async (message: string): Promise<boolean> => {
        const trimmedMessage = message.trim();
        if (
            trimmedMessage.length === 0
            || trimmedMessage.length > 500
            || hiddenRef.current
            || sendingRef.current
        ) {
            return false;
        }

        const history: AssistantHistoryMessage[] = messagesRef.current
            .slice(-12)
            .map(({ role, content }) => ({ role, content }));
        const optimisticId = createId();
        const optimisticMessage: AssistantUiMessage = {
            id: optimisticId,
            role: 'user',
            content: trimmedMessage,
        };

        sendingRef.current = true;
        setIsSending(true);
        setErrorMessage(null);
        messagesRef.current = [...messagesRef.current, optimisticMessage];
        setMessages(messagesRef.current);

        try {
            const response = await client.send({
                message: trimmedMessage,
                currentPath: pathnameRef.current,
                sessionId,
                history,
            });

            if (mountedRef.current) {
                const assistantMessage: AssistantUiMessage = {
                    id: createId(),
                    role: 'assistant',
                    content: response.answer,
                    links: response.links,
                };
                messagesRef.current = [...messagesRef.current, assistantMessage];
                setMessages(messagesRef.current);
            }
            return true;
        } catch (error) {
            if (mountedRef.current) {
                messagesRef.current = messagesRef.current.filter(
                    ({ id }) => id !== optimisticId,
                );
                setMessages(messagesRef.current);
                setErrorMessage(
                    error instanceof AssistantApiError
                        ? error.message
                        : ASSISTANT_ERROR_MESSAGES.unavailable,
                );
            }
            return false;
        } finally {
            sendingRef.current = false;
            if (mountedRef.current) {
                setIsSending(false);
            }
        }
    }, [client, createId, sessionId]);

    const value: AssistantContextValue = {
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
    };

    return (
        <AssistantContext.Provider value={value}>
            {children}
        </AssistantContext.Provider>
    );
}
