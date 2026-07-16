import { createRef } from 'react';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import {
    MemoryRouter,
    useLocation,
} from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    AssistantConversation,
    type AssistantConversationProps,
} from './AssistantConversation';
import assistantConversationSource from './AssistantConversation.tsx?raw';
import type { AssistantUiMessage } from './types';

const suggestions = [
    '活動内容を知りたい',
    '参加方法を知りたい',
    '目的のページを探す',
] as const;

interface Deferred<T> {
    promise: Promise<T>;
    resolve(value: T): void;
}

function createDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}

function createProps(
    overrides: Partial<AssistantConversationProps> = {},
): AssistantConversationProps {
    return {
        messages: [],
        isSending: false,
        errorMessage: null,
        inputRef: createRef<HTMLTextAreaElement>(),
        onSubmit: vi.fn(async () => true),
        onClearError: vi.fn(),
        ...overrides,
    };
}

function renderConversation(
    overrides: Partial<AssistantConversationProps> = {},
) {
    const props = createProps(overrides);
    const view = render(
        <MemoryRouter>
            <AssistantConversation {...props} />
        </MemoryRouter>,
    );

    return {
        ...view,
        props,
        rerenderConversation(next: Partial<AssistantConversationProps>) {
            Object.assign(props, next);
            view.rerender(
                <MemoryRouter>
                    <AssistantConversation {...props} />
                </MemoryRouter>,
            );
        },
    };
}

function enterQuestion(value: string) {
    fireEvent.change(screen.getByRole('textbox', { name: '質問' }), {
        target: { value },
    });
}

function clickSend() {
    fireEvent.click(screen.getByRole('button', { name: '送信' }));
}

function LocationProbe() {
    const { pathname } = useLocation();
    return <output data-testid="location">{pathname}</output>;
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('AssistantConversation', () => {
    it('shows the exact three suggestions without sending on mount', () => {
        const onSubmit = vi.fn(async () => true);

        renderConversation({ onSubmit });

        for (const suggestion of suggestions) {
            expect(
                screen.getByRole('button', { name: suggestion }),
            ).toBeInTheDocument();
        }
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits a clicked suggestion exactly once and hides suggestions after conversation starts', async () => {
        const onSubmit = vi.fn(async () => true);
        const { rerenderConversation } = renderConversation({ onSubmit });

        fireEvent.click(
            screen.getByRole('button', { name: suggestions[1] }),
        );

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });
        expect(onSubmit).toHaveBeenCalledWith(suggestions[1]);

        rerenderConversation({
            messages: [{
                id: 'user-1',
                role: 'user',
                content: suggestions[1],
            }],
        });
        for (const suggestion of suggestions) {
            expect(
                screen.queryByRole('button', { name: suggestion }),
            ).not.toBeInTheDocument();
        }
    });

    it('labels and limits the textarea, exposes a count, and passes only valid trimmed drafts', async () => {
        const onSubmit = vi.fn(async () => false);
        const inputRef = createRef<HTMLTextAreaElement>();
        renderConversation({ inputRef, onSubmit });

        const textarea = screen.getByRole('textbox', { name: '質問' });
        expect(inputRef.current).toBe(textarea);
        expect(textarea).toHaveAttribute('maxLength', '500');
        expect(screen.getByText('0 / 500')).toBeInTheDocument();

        enterQuestion('   ');
        clickSend();
        expect(onSubmit).not.toHaveBeenCalled();

        enterQuestion('x'.repeat(501));
        expect(screen.getByText('501 / 500')).toBeInTheDocument();
        clickSend();
        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(
            '質問は500文字以内で入力してください。',
        );

        enterQuestion(`  ${'x'.repeat(500)}  `);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        clickSend();

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });
        expect(onSubmit).toHaveBeenCalledWith('x'.repeat(500));
    });

    it('submits with Enter, allows Shift+Enter newline, and ignores composing Enter', async () => {
        const onSubmit = vi.fn(async () => false);
        renderConversation({ onSubmit });
        const textarea = screen.getByRole('textbox', { name: '質問' });

        enterQuestion('  Enterで送る  ');
        const enterResult = fireEvent.keyDown(textarea, {
            key: 'Enter',
            code: 'Enter',
        });

        expect(enterResult).toBe(false);
        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith('Enterで送る');
        });

        fireEvent.keyDown(textarea, {
            key: 'Enter',
            code: 'Enter',
            shiftKey: true,
        });
        fireEvent.change(textarea, {
            target: { value: 'Enterで送る\n次の行' },
        });
        expect(textarea).toHaveValue('Enterで送る\n次の行');
        expect(onSubmit).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(textarea, {
            key: 'Enter',
            code: 'Enter',
            isComposing: true,
        });
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('disables every submission control while sending and announces loading', () => {
        renderConversation({ isSending: true });

        expect(screen.getByRole('textbox', { name: '質問' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '送信' })).toBeDisabled();
        for (const suggestion of suggestions) {
            expect(
                screen.getByRole('button', { name: suggestion }),
            ).toBeDisabled();
        }

        const messages = screen.getByRole('log', { name: '会話' });
        expect(messages).toHaveAttribute('aria-live', 'polite');
        expect(within(messages).getByText('回答を準備しています…')).toHaveTextContent(
            '回答を準備しています…',
        );
    });

    it('blocks duplicate submissions while the first local submission is pending', async () => {
        const submission = createDeferred<boolean>();
        const onSubmit = vi.fn(() => submission.promise);
        renderConversation({ onSubmit });

        enterQuestion('二重送信しない');
        clickSend();
        clickSend();

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('textbox', { name: '質問' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '送信' })).toBeDisabled();
        for (const suggestion of suggestions) {
            expect(
                screen.getByRole('button', { name: suggestion }),
            ).toBeDisabled();
        }

        await act(async () => {
            submission.resolve(false);
            await submission.promise;
        });

        expect(screen.getByRole('textbox', { name: '質問' })).toBeEnabled();
        expect(screen.getByRole('textbox', { name: '質問' })).toHaveValue(
            '二重送信しない',
        );
    });

    it('clears the local draft only after a successful submission', async () => {
        const onSubmit = vi.fn(async () => true);
        renderConversation({ onSubmit });

        enterQuestion('  成功する質問  ');
        clickSend();

        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: '質問' })).toHaveValue('');
        });
        expect(onSubmit).toHaveBeenCalledWith('成功する質問');
    });

    it('keeps the original draft editable when submission returns false', async () => {
        const onSubmit = vi.fn(async () => false);
        renderConversation({ onSubmit });

        enterQuestion('  再送できる質問  ');
        clickSend();

        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: '質問' })).toBeEnabled();
        });
        expect(screen.getByRole('textbox', { name: '質問' })).toHaveValue(
            '  再送できる質問  ',
        );
        expect(onSubmit).toHaveBeenCalledWith('再送できる質問');
    });

    it('catches a rejected submission and keeps the original draft editable', async () => {
        const onSubmit = vi.fn(async () => {
            throw new Error('network detail');
        });
        renderConversation({ onSubmit });

        enterQuestion('  失敗した質問  ');
        clickSend();

        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: '質問' })).toBeEnabled();
        });
        expect(screen.getByRole('textbox', { name: '質問' })).toHaveValue(
            '  失敗した質問  ',
        );
        expect(onSubmit).toHaveBeenCalledWith('失敗した質問');
    });

    it('renders assistant HTML-like content as plain text without creating elements', () => {
        const content = '<img src=x onerror=alert(1)>';
        const messages: AssistantUiMessage[] = [{
            id: 'assistant-1',
            role: 'assistant',
            content,
            links: [],
        }];

        const { container } = renderConversation({ messages });

        expect(screen.getByText(content)).toBeInTheDocument();
        expect(container.querySelector('img')).toBeNull();
    });

    it('navigates canonical assistant links through React Router in the same tab', () => {
        const messages: AssistantUiMessage[] = [{
            id: 'assistant-1',
            role: 'assistant',
            content: '活動内容はこちらです。',
            links: [
                { pageId: 'about', title: 'About Us', href: '/about' },
                { pageId: 'contact', title: 'お問い合わせ', href: '/contact' },
            ],
        }];
        const props = createProps({ messages });
        render(
            <MemoryRouter initialEntries={['/news']}>
                <AssistantConversation {...props} />
                <LocationProbe />
            </MemoryRouter>,
        );

        const aboutLink = screen.getByRole('link', { name: 'About Us' });
        expect(aboutLink).toHaveAttribute('href', '/about');
        expect(aboutLink).not.toHaveAttribute('target');
        expect(screen.getAllByRole('link')).toHaveLength(2);

        fireEvent.click(aboutLink);
        expect(screen.getByTestId('location')).toHaveTextContent('/about');
    });

    it('renders provider errors as alerts and clears them when input changes', () => {
        const onClearError = vi.fn();
        renderConversation({
            errorMessage: '現在AIガイドを利用できません。',
            onClearError,
        });

        expect(screen.getByRole('alert')).toHaveTextContent(
            '現在AIガイドを利用できません。',
        );

        enterQuestion('別の質問');
        expect(onClearError).toHaveBeenCalledTimes(1);
    });

    it('uses unique textarea and description IDs across instances', () => {
        const first = createProps();
        const second = createProps();
        render(
            <MemoryRouter>
                <AssistantConversation {...first} />
                <AssistantConversation {...second} />
            </MemoryRouter>,
        );

        const textareas = screen.getAllByRole('textbox', { name: '質問' });
        expect(textareas[0].id).not.toBe(textareas[1].id);
        expect(textareas[0].getAttribute('aria-describedby')).not.toBe(
            textareas[1].getAttribute('aria-describedby'),
        );
    });

    it('scrolls the polite messages log to the newest content', async () => {
        const firstMessages: AssistantUiMessage[] = [{
            id: 'user-1',
            role: 'user',
            content: '最初の質問',
        }];
        const { rerenderConversation } = renderConversation({
            messages: firstMessages,
        });
        const log = screen.getByRole('log', { name: '会話' });
        Object.defineProperty(log, 'scrollHeight', {
            configurable: true,
            value: 480,
        });
        log.scrollTop = 0;

        rerenderConversation({
            messages: [
                ...firstMessages,
                {
                    id: 'assistant-1',
                    role: 'assistant',
                    content: '新しい回答',
                    links: [],
                },
            ],
        });

        await waitFor(() => {
            expect(log.scrollTop).toBe(480);
        });
    });

    it('does not introduce generated HTML rendering, markdown, or browser storage', () => {
        expect(assistantConversationSource).not.toMatch(
            /dangerouslySetInnerHTML|react-markdown|localStorage|sessionStorage/,
        );
    });
});
