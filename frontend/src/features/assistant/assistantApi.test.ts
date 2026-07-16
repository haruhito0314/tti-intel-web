import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    ASSISTANT_ERROR_MESSAGES,
    AssistantApiError,
    createAssistantApi,
} from './assistantApi';
import type {
    AssistantApiErrorKind,
    AssistantRequest,
    AssistantResponse,
} from './types';

const request: AssistantRequest = {
    message: '今週の数学はどこ？',
    currentPath: '/news',
    sessionId: '11111111-1111-4111-8111-111111111111',
    history: [],
};

const response: AssistantResponse = {
    answer: '今週の数学から確認できます。',
    links: [{ pageId: 'weekly-math', title: '今週の数学', href: '/weekly-math' }],
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function injectedFetch(fetchMock: ReturnType<typeof vi.fn>): typeof fetch {
    return fetchMock as unknown as typeof fetch;
}

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('createAssistantApi', () => {
    it('uses the AI Assistant name in user-facing product errors', () => {
        expect(ASSISTANT_ERROR_MESSAGES['rate-limited']).toContain(
            'AI Assistant',
        );
        expect(ASSISTANT_ERROR_MESSAGES.timeout).toContain('AI Assistant');
        expect(ASSISTANT_ERROR_MESSAGES.unavailable).toContain('AI Assistant');
        expect(ASSISTANT_ERROR_MESSAGES['invalid-response']).toContain(
            'AI Assistant',
        );
        expect(Object.values(ASSISTANT_ERROR_MESSAGES).join('\n')).not.toContain(
            'AIガイド',
        );
    });

    it('normalizes the base URL and posts once', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(response));
        const client = createAssistantApi({
            baseUrl: 'https://api.example.com/prod///',
            fetchImpl: injectedFetch(fetchMock),
        });

        await expect(client.send(request)).resolves.toEqual(response);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.example.com/prod/assistant',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            }),
        );
    });

    it('does not fetch when the base URL is unset', async () => {
        vi.stubEnv('VITE_API_BASE_URL', '');
        const fetchMock = vi.fn();
        const client = createAssistantApi({ fetchImpl: injectedFetch(fetchMock) });

        await expect(client.send(request)).rejects.toMatchObject({
            name: 'AssistantApiError',
            kind: 'unavailable',
            message: ASSISTANT_ERROR_MESSAGES.unavailable,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('uses and normalizes the import.meta environment base URL by default', async () => {
        vi.stubEnv('VITE_API_BASE_URL', 'https://env.example.com/prod///');
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(response));
        const client = createAssistantApi({ fetchImpl: injectedFetch(fetchMock) });

        await client.send(request);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://env.example.com/prod/assistant',
            expect.any(Object),
        );
    });

    it.each([
        [400, 'invalid-request'],
        [429, 'rate-limited'],
        [500, 'unavailable'],
        [502, 'unavailable'],
        [503, 'unavailable'],
        [504, 'timeout'],
    ] satisfies Array<[number, AssistantApiErrorKind]>) (
        'maps HTTP %i to %s without retrying',
        async (status, kind) => {
            const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'ignored' }, status));
            const client = createAssistantApi({
                baseUrl: 'https://api.example.com',
                fetchImpl: injectedFetch(fetchMock),
            });

            const error = await client.send(request).catch((reason: unknown) => reason);

            expect(error).toBeInstanceOf(AssistantApiError);
            expect(error).toMatchObject({
                kind,
                status,
                message: ASSISTANT_ERROR_MESSAGES[kind],
            });
            expect(fetchMock).toHaveBeenCalledTimes(1);
        },
    );

    it('uses a fixed error message instead of the server error body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'sensitive detail' }, 500));
        const client = createAssistantApi({
            baseUrl: 'https://api.example.com',
            fetchImpl: injectedFetch(fetchMock),
        });

        const error = await client.send(request).catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(AssistantApiError);
        expect(error).toMatchObject({
            kind: 'unavailable',
            status: 500,
            message: ASSISTANT_ERROR_MESSAGES.unavailable,
        });
        expect((error as Error).message).not.toContain('sensitive detail');
    });

    it('maps a network failure to unavailable without retrying or leaking details', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new TypeError('private network detail'));
        const client = createAssistantApi({
            baseUrl: 'https://api.example.com',
            fetchImpl: injectedFetch(fetchMock),
        });

        const error = await client.send(request).catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(AssistantApiError);
        expect(error).toMatchObject({
            kind: 'unavailable',
            message: ASSISTANT_ERROR_MESSAGES.unavailable,
        });
        expect((error as Error).message).not.toContain('private network detail');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('aborts at 28 seconds and reports timeout without retrying', async () => {
        vi.useFakeTimers();
        let signal: AbortSignal | null = null;
        const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
            signal = init?.signal ?? null;
            return new Promise<Response>((_resolve, reject) => {
                signal?.addEventListener('abort', () => {
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            });
        });
        const client = createAssistantApi({
            baseUrl: 'https://api.example.com',
            fetchImpl: injectedFetch(fetchMock),
        });

        const expectation = expect(client.send(request)).rejects.toMatchObject({
            kind: 'timeout',
            message: ASSISTANT_ERROR_MESSAGES.timeout,
        });
        await vi.advanceTimersByTimeAsync(27_999);
        expect(signal).not.toBeNull();
        expect(signal!.aborted).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(signal!.aborted).toBe(true);
        await expectation;
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('keeps the timeout mapping when aborting during response JSON parsing', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
            const signal = init?.signal;
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => new Promise<unknown>((_resolve, reject) => {
                    signal?.addEventListener('abort', () => {
                        reject(new DOMException('Aborted', 'AbortError'));
                    });
                }),
            } as Response);
        });
        const client = createAssistantApi({
            baseUrl: 'https://api.example.com',
            fetchImpl: injectedFetch(fetchMock),
        });

        const expectation = expect(client.send(request)).rejects.toMatchObject({
            kind: 'timeout',
            message: ASSISTANT_ERROR_MESSAGES.timeout,
        });
        await vi.advanceTimersByTimeAsync(28_000);

        await expectation;
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('maps invalid JSON to invalid-response', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('not json', { status: 200 }));
        const client = createAssistantApi({
            baseUrl: 'https://api.example.com',
            fetchImpl: injectedFetch(fetchMock),
        });

        await expect(client.send(request)).rejects.toMatchObject({
            kind: 'invalid-response',
            message: ASSISTANT_ERROR_MESSAGES['invalid-response'],
        });
    });

    it.each([
        ['empty answer', { ...response, answer: '   ' }],
        ['501 character answer', { ...response, answer: 'a'.repeat(501) }],
        ['4 links', {
            ...response,
            links: [
                { pageId: 'home', title: 'Home', href: '/' },
                { pageId: 'about', title: 'About', href: '/about' },
                { pageId: 'news', title: 'News', href: '/news' },
                { pageId: 'apps', title: 'Apps', href: '/app' },
            ],
        }],
        ['duplicate href', {
            ...response,
            links: [
                { pageId: 'news', title: 'News', href: '/news' },
                { pageId: 'about', title: 'About', href: '/news' },
            ],
        }],
        ['empty pageId', {
            ...response,
            links: [{ pageId: '   ', title: 'News', href: '/news' }],
        }],
        ['empty title', {
            ...response,
            links: [{ pageId: 'news', title: '   ', href: '/news' }],
        }],
        ['protocol-relative href', {
            ...response,
            links: [{ pageId: 'evil', title: 'Evil', href: '//evil.example' }],
        }],
        ['absolute href', {
            ...response,
            links: [{ pageId: 'evil', title: 'Evil', href: 'https://evil.example' }],
        }],
        ['backslash href', {
            ...response,
            links: [{ pageId: 'evil', title: 'Evil', href: '/app\\evil' }],
        }],
        ['extra response property', { ...response, internal: 'secret' }],
        ['extra link property', {
            ...response,
            links: [{ pageId: 'news', title: 'News', href: '/news', external: true }],
        }],
    ])('rejects %s', async (_caseName, invalidResponse) => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(invalidResponse));
        const client = createAssistantApi({
            baseUrl: 'https://api.example.com',
            fetchImpl: injectedFetch(fetchMock),
        });

        await expect(client.send(request)).rejects.toMatchObject({
            kind: 'invalid-response',
            message: ASSISTANT_ERROR_MESSAGES['invalid-response'],
        });
    });

    it('accepts root and fixed nested internal hrefs', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
            answer: '  固定ページを案内します。  ',
            links: [
                { pageId: 'home', title: 'Home', href: '/' },
                { pageId: 'table-tennis', title: 'Table Tennis', href: '/app/table-tennis' },
            ],
        }));
        const client = createAssistantApi({
            baseUrl: 'https://api.example.com',
            fetchImpl: injectedFetch(fetchMock),
        });

        await expect(client.send(request)).resolves.toEqual({
            answer: '固定ページを案内します。',
            links: [
                { pageId: 'home', title: 'Home', href: '/' },
                { pageId: 'table-tennis', title: 'Table Tennis', href: '/app/table-tennis' },
            ],
        });
    });
});
