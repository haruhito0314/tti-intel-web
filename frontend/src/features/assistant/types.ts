export type AssistantRole = 'user' | 'assistant';

export interface AssistantHistoryMessage {
    role: AssistantRole;
    content: string;
}

export interface AssistantLink {
    pageId: string;
    title: string;
    href: string;
}

export type AssistantUiMessage =
    | { id: string; role: 'user'; content: string }
    | { id: string; role: 'assistant'; content: string; links: AssistantLink[] };

export interface AssistantRequest {
    message: string;
    currentPath: string;
    sessionId: string;
    history: AssistantHistoryMessage[];
}

export interface AssistantResponse {
    answer: string;
    links: AssistantLink[];
}

export type AssistantApiErrorKind =
    | 'invalid-request'
    | 'rate-limited'
    | 'timeout'
    | 'unavailable'
    | 'invalid-response';

export interface AssistantClient {
    send(request: AssistantRequest): Promise<AssistantResponse>;
}
