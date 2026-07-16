import { useState } from 'react';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import {
    MemoryRouter,
    useNavigate,
} from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantApiError, ASSISTANT_ERROR_MESSAGES } from './assistantApi';
import assistantContextSource from './assistantContext.ts?raw';
import { AssistantProvider } from './AssistantProvider';
import assistantProviderSource from './AssistantProvider.tsx?raw';
import { useAssistant } from './useAssistant';
import useAssistantSource from './useAssistant.ts?raw';
import type {
    AssistantClient,
    AssistantResponse,
} from './types';

const firstResponse: AssistantResponse = {
    answer: 'About Usで活動内容を確認できます。',
    links: [{ pageId: 'about', title: 'About Us', href: '/about' }],
};

interface Deferred<T> {
    promise: Promise<T>;
    resolve(value: T): void;
    reject(reason: unknown): void;
}

function createDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function createIdFactory() {
    let nextId = 0;
    return vi.fn(() => `id-${++nextId}`);
}

function AssistantHarness() {
    const assistant = useAssistant();
    const navigate = useNavigate();
    const [draft, setDraft] = useState('');
    const [lastResult, setLastResult] = useState<boolean | null>(null);
    const [duplicateResults, setDuplicateResults] = useState<boolean[] | null>(null);

    const submit = async () => {
        const submitted = draft.trim();
        setDraft('');
        const result = await assistant.sendMessage(draft);
        if (!result) {
            setDraft(submitted);
        }
        setLastResult(result);
    };

    const submitTwice = () => {
        void Promise.all([
            assistant.sendMessage(draft),
            assistant.sendMessage(draft),
        ]).then(setDuplicateResults);
    };

    return (
        <>
            <input
                aria-label="質問"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
            />
            <button type="button" onClick={() => void submit()}>質問を送る</button>
            <button type="button" onClick={submitTwice}>同期で二重送信</button>
            <button type="button" onClick={assistant.open}>開く</button>
            <button type="button" onClick={assistant.close}>閉じる</button>
            <button type="button" onClick={assistant.hideForTab}>タブ内で隠す</button>
            <button type="button" onClick={assistant.clearError}>エラーを消す</button>
            <button
                type="button"
                onClick={() => navigate('/about?from=assistant#team')}
            >
                Aboutへ移動
            </button>
            <output data-testid="assistant-state">
                {JSON.stringify({
                    messages: assistant.messages,
                    isOpen: assistant.isOpen,
                    isHiddenForTab: assistant.isHiddenForTab,
                    isSending: assistant.isSending,
                    errorMessage: assistant.errorMessage,
                })}
            </output>
            <output data-testid="last-result">
                {lastResult === null ? 'none' : String(lastResult)}
            </output>
            <output data-testid="duplicate-results">
                {duplicateResults === null ? 'none' : JSON.stringify(duplicateResults)}
            </output>
        </>
    );
}

function PendingRequestConsumer() {
    const { isSending, sendMessage } = useAssistant();

    return (
        <>
            <button
                type="button"
                onClick={() => void sendMessage('pending question')}
            >
                pendingを送る
            </button>
            <output data-testid="pending-state">{String(isSending)}</output>
        </>
    );
}

function MissingProviderConsumer() {
    useAssistant();
    return null;
}

interface RenderProviderOptions {
    client: AssistantClient;
    createId?: () => string;
    initialEntries?: string[];
    consumer?: 'harness' | 'pending';
}

function renderProvider({
    client,
    createId,
    initialEntries = ['/news?from=home#latest'],
    consumer = 'harness',
}: RenderProviderOptions) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <AssistantProvider client={client} createId={createId}>
                {consumer === 'harness'
                    ? <AssistantHarness />
                    : <PendingRequestConsumer />}
            </AssistantProvider>
        </MemoryRouter>,
    );
}

function readState() {
    return JSON.parse(screen.getByTestId('assistant-state').textContent ?? '{}') as {
        messages: Array<{
            id: string;
            role: 'user' | 'assistant';
            content: string;
            links?: AssistantResponse['links'];
        }>;
        isOpen: boolean;
        isHiddenForTab: boolean;
        isSending: boolean;
        errorMessage: string | null;
    };
}

function enterQuestion(value: string) {
    fireEvent.change(screen.getByRole('textbox', { name: '質問' }), {
        target: { value },
    });
}

function clickButton(name: string) {
    act(() => {
        screen.getByRole('button', { name }).click();
    });
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('AssistantProvider', () => {
    it('starts closed, visible, empty, idle, and without an error', () => {
        const createId = createIdFactory();
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(firstResponse),
        };

        renderProvider({ client, createId });

        expect(readState()).toEqual({
            messages: [],
            isOpen: false,
            isHiddenForTab: false,
            isSending: false,
            errorMessage: null,
        });
        expect(createId).toHaveBeenCalledTimes(1);
        expect(client.send).not.toHaveBeenCalled();
    });

    it('requires useAssistant consumers to be inside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => render(<MissingProviderConsumer />)).toThrow(
            'useAssistant must be used within an AssistantProvider',
        );
    });

    it('opens, closes, and permanently hides the panel for the mount', () => {
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(firstResponse),
        };
        renderProvider({ client, createId: createIdFactory() });

        clickButton('開く');
        expect(readState()).toMatchObject({
            isOpen: true,
            isHiddenForTab: false,
        });

        clickButton('閉じる');
        expect(readState()).toMatchObject({
            isOpen: false,
            isHiddenForTab: false,
        });

        clickButton('開く');
        clickButton('タブ内で隠す');
        expect(readState()).toMatchObject({
            isOpen: false,
            isHiddenForTab: true,
        });

        clickButton('開く');
        expect(readState()).toMatchObject({
            isOpen: false,
            isHiddenForTab: true,
        });
    });

    it('uses a UUIDv4 session by default and keeps it for the mount', async () => {
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(firstResponse),
        };
        renderProvider({ client });

        enterQuestion('first');
        clickButton('質問を送る');
        await waitFor(() => expect(readState().messages).toHaveLength(2));

        enterQuestion('second');
        clickButton('質問を送る');
        await waitFor(() => expect(readState().messages).toHaveLength(4));

        const firstSessionId = vi.mocked(client.send).mock.calls[0][0].sessionId;
        const secondSessionId = vi.mocked(client.send).mock.calls[1][0].sessionId;
        expect(firstSessionId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        expect(secondSessionId).toBe(firstSessionId);
    });

    it('adds the optimistic user before the linked assistant response', async () => {
        const response = createDeferred<AssistantResponse>();
        const client: AssistantClient = {
            send: vi.fn().mockReturnValue(response.promise),
        };
        renderProvider({ client, createId: createIdFactory() });

        enterQuestion('  活動内容は？  ');
        clickButton('質問を送る');

        expect(readState()).toMatchObject({
            messages: [{
                id: 'id-2',
                role: 'user',
                content: '活動内容は？',
            }],
            isSending: true,
            errorMessage: null,
        });
        expect(client.send).toHaveBeenCalledWith({
            message: '活動内容は？',
            currentPath: '/news',
            sessionId: 'id-1',
            history: [],
        });

        await act(async () => {
            response.resolve(firstResponse);
            await response.promise;
        });

        await waitFor(() => expect(readState()).toMatchObject({
            messages: [
                {
                    id: 'id-2',
                    role: 'user',
                    content: '活動内容は？',
                },
                {
                    id: 'id-3',
                    role: 'assistant',
                    content: firstResponse.answer,
                    links: firstResponse.links,
                },
            ],
            isSending: false,
        }));
        expect(screen.getByTestId('last-result')).toHaveTextContent('true');
    });

    it('sends exactly the previous 12 role/content messages without duplicating the current one', async () => {
        const client: AssistantClient = {
            send: vi.fn(async ({ message }) => ({
                answer: `answer-${message}`,
                links: [],
            })),
        };
        renderProvider({ client, createId: createIdFactory() });

        for (let index = 1; index <= 7; index += 1) {
            enterQuestion(`question-${index}`);
            clickButton('質問を送る');
            await waitFor(() => {
                expect(readState().messages).toHaveLength(index * 2);
            });
        }

        enterQuestion('  question-8  ');
        clickButton('質問を送る');
        await waitFor(() => expect(client.send).toHaveBeenCalledTimes(8));

        const requests = vi.mocked(client.send).mock.calls.map(([request]) => request);
        expect(new Set(requests.map((request) => request.sessionId))).toEqual(
            new Set(['id-1']),
        );
        expect(requests[7]).toEqual({
            message: 'question-8',
            currentPath: '/news',
            sessionId: 'id-1',
            history: [
                { role: 'user', content: 'question-4' },
                { role: 'user', content: 'question-5' },
                { role: 'user', content: 'question-6' },
                { role: 'user', content: 'question-7' },
            ],
        });
        expect(requests[7].history).not.toContainEqual({
            role: 'user',
            content: 'question-8',
        });
        expect(requests[7].history.every((entry) => entry.role === 'user')).toBe(
            true,
        );
    });

    it('suppresses a synchronous duplicate while the first request is pending', async () => {
        const response = createDeferred<AssistantResponse>();
        const client: AssistantClient = {
            send: vi.fn().mockReturnValue(response.promise),
        };
        renderProvider({ client, createId: createIdFactory() });

        enterQuestion('same question');
        clickButton('同期で二重送信');

        expect(client.send).toHaveBeenCalledTimes(1);
        expect(readState()).toMatchObject({
            messages: [{
                role: 'user',
                content: 'same question',
            }],
            isSending: true,
        });

        await act(async () => {
            response.resolve(firstResponse);
            await response.promise;
        });

        await waitFor(() => {
            expect(screen.getByTestId('duplicate-results')).toHaveTextContent(
                '[true,false]',
            );
        });
        expect(readState().messages).toHaveLength(2);
    });

    it('removes only the failed optimistic message and restores the trimmed draft', async () => {
        const client: AssistantClient = {
            send: vi.fn()
                .mockResolvedValueOnce(firstResponse)
                .mockRejectedValueOnce(new Error('private failure detail')),
        };
        renderProvider({ client, createId: createIdFactory() });

        enterQuestion('successful question');
        clickButton('質問を送る');
        await waitFor(() => expect(readState().messages).toHaveLength(2));

        enterQuestion('  retry this question  ');
        clickButton('質問を送る');
        await waitFor(() => {
            expect(screen.getByTestId('last-result')).toHaveTextContent('false');
        });

        expect(readState()).toMatchObject({
            messages: [
                {
                    role: 'user',
                    content: 'successful question',
                },
                {
                    role: 'assistant',
                    content: firstResponse.answer,
                    links: firstResponse.links,
                },
            ],
            isSending: false,
            errorMessage: ASSISTANT_ERROR_MESSAGES.unavailable,
        });
        expect(readState().errorMessage).not.toContain('private failure detail');
        expect(screen.getByRole('textbox', { name: '質問' }))
            .toHaveValue('retry this question');

        clickButton('エラーを消す');
        expect(readState().errorMessage).toBeNull();
    });

    it('uses the fixed message carried by an AssistantApiError', async () => {
        const apiError = new AssistantApiError('rate-limited', 429);
        const client: AssistantClient = {
            send: vi.fn().mockRejectedValue(apiError),
        };
        renderProvider({ client, createId: createIdFactory() });

        enterQuestion('rate limit');
        clickButton('質問を送る');

        await waitFor(() => {
            expect(readState().errorMessage).toBe(apiError.message);
        });
        expect(readState().messages).toEqual([]);
        expect(screen.getByTestId('last-result')).toHaveTextContent('false');
    });

    it('rejects blank, over-500-character, and hidden sends without calling the client', async () => {
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(firstResponse),
        };
        renderProvider({ client, createId: createIdFactory() });

        enterQuestion('   ');
        clickButton('質問を送る');
        await waitFor(() => {
            expect(screen.getByTestId('last-result')).toHaveTextContent('false');
        });

        enterQuestion(`  ${'x'.repeat(501)}  `);
        clickButton('質問を送る');
        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: '質問' }))
                .toHaveValue('x'.repeat(501));
        });

        clickButton('タブ内で隠す');
        enterQuestion('hidden question');
        clickButton('質問を送る');
        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: '質問' }))
                .toHaveValue('hidden question');
        });

        expect(client.send).not.toHaveBeenCalled();
        expect(readState()).toMatchObject({
            messages: [],
            isOpen: false,
            isHiddenForTab: true,
            isSending: false,
        });
    });

    it('closes the open panel on pathname change while keeping conversation history', async () => {
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(firstResponse),
        };
        renderProvider({ client, createId: createIdFactory() });

        clickButton('開く');
        enterQuestion('keep this thread');
        clickButton('質問を送る');
        await waitFor(() => expect(readState().messages).toHaveLength(2));
        expect(readState().isOpen).toBe(true);

        clickButton('Aboutへ移動');

        expect(readState()).toMatchObject({
            isOpen: false,
            isHiddenForTab: false,
            messages: [
                { role: 'user', content: 'keep this thread' },
                {
                    role: 'assistant',
                    content: firstResponse.answer,
                    links: firstResponse.links,
                },
            ],
        });

        clickButton('開く');
        expect(readState().isOpen).toBe(true);
        expect(readState().messages).toHaveLength(2);
    });

    it('reads the current pathname at each send event', async () => {
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(firstResponse),
        };
        renderProvider({ client, createId: createIdFactory() });

        enterQuestion('news question');
        clickButton('質問を送る');
        await waitFor(() => expect(readState().messages).toHaveLength(2));

        clickButton('Aboutへ移動');
        enterQuestion('about question');
        clickButton('質問を送る');
        await waitFor(() => expect(readState().messages).toHaveLength(4));

        expect(vi.mocked(client.send).mock.calls[0][0].currentPath).toBe('/news');
        expect(vi.mocked(client.send).mock.calls[1][0].currentPath).toBe('/about');
    });

    it('creates a new empty, visible session after unmount and remount', async () => {
        const createId = createIdFactory();
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(firstResponse),
        };
        const firstMount = renderProvider({ client, createId });

        clickButton('開く');
        enterQuestion('first mount');
        clickButton('質問を送る');
        await waitFor(() => expect(readState().messages).toHaveLength(2));
        const firstSessionId = vi.mocked(client.send).mock.calls[0][0].sessionId;
        clickButton('タブ内で隠す');
        firstMount.unmount();

        renderProvider({ client, createId });
        expect(readState()).toEqual({
            messages: [],
            isOpen: false,
            isHiddenForTab: false,
            isSending: false,
            errorMessage: null,
        });

        enterQuestion('second mount');
        clickButton('質問を送る');
        await waitFor(() => expect(client.send).toHaveBeenCalledTimes(2));
        const secondSessionId = vi.mocked(client.send).mock.calls[1][0].sessionId;
        expect(secondSessionId).not.toBe(firstSessionId);
    });

    it('does not read or write browser storage in source or at runtime', async () => {
        expect([
            assistantContextSource,
            assistantProviderSource,
            useAssistantSource,
        ].join('\n')).not.toMatch(
            /\b(?:localStorage|sessionStorage)\b/,
        );

        const storageSpies = [
            vi.spyOn(window.localStorage, 'getItem'),
            vi.spyOn(window.localStorage, 'setItem'),
            vi.spyOn(window.localStorage, 'removeItem'),
            vi.spyOn(window.localStorage, 'clear'),
            vi.spyOn(window.sessionStorage, 'getItem'),
            vi.spyOn(window.sessionStorage, 'setItem'),
            vi.spyOn(window.sessionStorage, 'removeItem'),
            vi.spyOn(window.sessionStorage, 'clear'),
        ];
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(firstResponse),
        };
        renderProvider({ client, createId: createIdFactory() });

        clickButton('開く');
        enterQuestion('memory only');
        clickButton('質問を送る');
        await waitFor(() => expect(readState().messages).toHaveLength(2));
        clickButton('タブ内で隠す');

        storageSpies.forEach((storageSpy) => {
            expect(storageSpy).not.toHaveBeenCalled();
        });
    });

    it('does not update React state after unmounting a pending request', async () => {
        const response = createDeferred<AssistantResponse>();
        const createId = createIdFactory();
        const client: AssistantClient = {
            send: vi.fn().mockReturnValue(response.promise),
        };
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const mounted = renderProvider({
            client,
            createId,
            consumer: 'pending',
        });

        clickButton('pendingを送る');
        expect(screen.getByTestId('pending-state')).toHaveTextContent('true');
        expect(createId).toHaveBeenCalledTimes(2);
        mounted.unmount();

        await act(async () => {
            response.resolve(firstResponse);
            await response.promise;
            await Promise.resolve();
        });

        expect(consoleError).not.toHaveBeenCalled();
        expect(createId).toHaveBeenCalledTimes(2);
    });
});
