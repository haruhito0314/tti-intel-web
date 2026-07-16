import { z } from 'zod';
import type {
    AssistantApiErrorKind,
    AssistantClient,
    AssistantResponse,
} from './types';

const DEFAULT_TIMEOUT_MS = 28_000;
const INTERNAL_HREF_PATTERN = /^(?:\/(?:[A-Za-z0-9._~%-]+(?:\/[A-Za-z0-9._~%-]+)*)?)$/;

const assistantLinkSchema = z.object({
    pageId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    href: z.string().regex(INTERNAL_HREF_PATTERN),
}).strict();

const assistantResponseSchema = z.object({
    answer: z.string().trim().min(1).max(500),
    links: z.array(assistantLinkSchema).max(3).superRefine((links, context) => {
        const hrefs = new Set<string>();

        links.forEach((link, index) => {
            if (hrefs.has(link.href)) {
                context.addIssue({
                    code: 'custom',
                    message: 'Duplicate href',
                    path: [index, 'href'],
                });
            }
            hrefs.add(link.href);
        });
    }),
}).strict();

export interface CreateAssistantApiOptions {
    baseUrl?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}

export const ASSISTANT_ERROR_MESSAGES: Record<AssistantApiErrorKind, string> = {
    'invalid-request': '質問内容を確認して、もう一度送信してください。',
    'rate-limited': '本日のAI Assistant利用上限に達しました。通常のメニューをご利用ください。',
    timeout: 'AI Assistantの応答に時間がかかっています。しばらくしてからお試しください。',
    unavailable: '現在AI Assistantを利用できません。通常のメニューをご利用ください。',
    'invalid-response': '現在AI Assistantを利用できません。通常のメニューをご利用ください。',
};

export class AssistantApiError extends Error {
    readonly name = 'AssistantApiError';

    constructor(
        readonly kind: AssistantApiErrorKind,
        readonly status?: number,
    ) {
        super(ASSISTANT_ERROR_MESSAGES[kind]);
    }
}

function errorKindForStatus(status: number): AssistantApiErrorKind {
    if (status === 400) {
        return 'invalid-request';
    }
    if (status === 429) {
        return 'rate-limited';
    }
    if (status === 504) {
        return 'timeout';
    }
    return 'unavailable';
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}

export function createAssistantApi(
    options: CreateAssistantApiOptions = {},
): AssistantClient {
    const resolvedBaseUrl = (options.baseUrl ?? import.meta.env.VITE_API_BASE_URL)
        ?.trim()
        .replace(/\/+$/, '');
    const fetchImpl = options.fetchImpl ?? fetch;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return {
        async send(request): Promise<AssistantResponse> {
            if (!resolvedBaseUrl) {
                throw new AssistantApiError('unavailable');
            }

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetchImpl(`${resolvedBaseUrl}/assistant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(request),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new AssistantApiError(errorKindForStatus(response.status), response.status);
                }

                let body: unknown;
                try {
                    body = await response.json();
                } catch (error) {
                    if (controller.signal.aborted || isAbortError(error)) {
                        throw error;
                    }
                    throw new AssistantApiError('invalid-response');
                }

                const parsed = assistantResponseSchema.safeParse(body);
                if (!parsed.success) {
                    throw new AssistantApiError('invalid-response');
                }

                return parsed.data;
            } catch (error) {
                if (error instanceof AssistantApiError) {
                    throw error;
                }
                if (controller.signal.aborted || isAbortError(error)) {
                    throw new AssistantApiError('timeout');
                }
                throw new AssistantApiError('unavailable');
            } finally {
                clearTimeout(timer);
            }
        },
    };
}

export const assistantApi = createAssistantApi();
