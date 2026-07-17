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
    it('shows an assistant avatar beside AI replies for conversation presence', () => {
        const { container } = renderConversation({
            messages: [
                {
                    id: 'user-1',
                    role: 'user',
                    content: '活動内容を知りたい',
                },
                {
                    id: 'assistant-1',
                    role: 'assistant',
                    content: 'サークルについてをご覧ください。',
                    links: [],
                },
            ],
        });

        expect(container.querySelectorAll('.assistant-avatar')).toHaveLength(2);
        expect(
            screen.getByRole('article', { name: 'あなたの質問' })
                .closest('.assistant-message-row-user')
                ?.querySelector('.assistant-avatar'),
        ).toBeNull();
        expect(
            screen.getAllByRole('article', { name: 'AI Assistantの回答' })[1]
                .closest('.assistant-message-row-assistant')
                ?.querySelector('.assistant-avatar'),
        ).not.toBeNull();
    });

    it('shows the assistant greeting without suggestions or sending on mount', () => {
        const onSubmit = vi.fn(async () => true);

        renderConversation({ onSubmit });

        expect(
            screen.getByRole('article', { name: 'AI Assistantの回答' }),
        ).toHaveTextContent(
            'こんにちは。私はこのサイトを案内するAIアシスタントです。ページの探し方や公開コンテンツについて、気軽に聞いてください。',
        );
        expect(
            screen.queryByRole('button', { name: '活動内容を知りたい' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: '参加方法を知りたい' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: '目的のページを探す' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByLabelText('質問の候補')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '送信' })).toBeDisabled();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('enables the paper-plane send button only when the draft has text', () => {
        renderConversation();
        const sendButton = screen.getByRole('button', { name: '送信' });

        expect(sendButton).toBeDisabled();
        expect(sendButton.querySelector('svg')).not.toBeNull();

        enterQuestion('   ');
        expect(sendButton).toBeDisabled();

        enterQuestion('参加方法を知りたい');
        expect(sendButton).toBeEnabled();
    });

    it('keeps the UI-only greeting before conversation messages', () => {
        const { rerenderConversation } = renderConversation();
        rerenderConversation({
            messages: [{
                id: 'user-1',
                role: 'user',
                content: '今週の数学を見たい',
            }],
        });

        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(2);
        expect(articles[0]).toHaveAccessibleName('AI Assistantの回答');
        expect(articles[0]).toHaveTextContent(
            'こんにちは。私はこのサイトを案内するAIアシスタントです。ページの探し方や公開コンテンツについて、気軽に聞いてください。',
        );
        expect(articles[1]).toHaveAccessibleName('あなたの質問');
        expect(articles[1]).toHaveTextContent('今週の数学を見たい');
    });

    it('labels and limits the textarea, exposes a count, and passes only valid trimmed drafts', async () => {
        const onSubmit = vi.fn(async () => false);
        const inputRef = createRef<HTMLTextAreaElement>();
        renderConversation({ inputRef, onSubmit });

        const textarea = screen.getByRole('textbox', {
            name: '質問',
        }) as HTMLTextAreaElement;
        expect(inputRef.current).toBe(textarea);
        expect(textarea).toHaveAttribute('maxLength', '500');
        expect(textarea).toHaveAttribute('rows', '1');
        expect(textarea).toHaveAttribute(
            'placeholder',
            'メッセージを入力します',
        );
        expect(textarea.labels?.[0]).toHaveClass('assistant-visually-hidden');
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

        // IME confirm Enter can report keyCode 229 without isComposing.
        fireEvent.keyDown(textarea, {
            key: 'Enter',
            code: 'Enter',
            keyCode: 229,
        });
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('disables every submission control while sending and announces loading', () => {
        renderConversation({ isSending: true });

        expect(screen.getByRole('textbox', { name: '質問' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '送信' })).toBeDisabled();

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
                { pageId: 'about', title: 'サークルについて', href: '/about' },
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

        const aboutLink = screen.getByRole('link', { name: 'サークルについて' });
        expect(aboutLink).toHaveAttribute('href', '/about');
        expect(aboutLink).not.toHaveAttribute('target');
        expect(screen.getAllByRole('link')).toHaveLength(2);

        fireEvent.click(aboutLink);
        expect(screen.getByTestId('location')).toHaveTextContent('/about');
    });

    it('opens Discord invite links in a new tab', () => {
        const messages: AssistantUiMessage[] = [{
            id: 'assistant-1',
            role: 'assistant',
            content: 'Discordはこちらです。',
            links: [{
                pageId: 'discord',
                title: 'Discord',
                href: 'https://discord.gg/DFWs8GrHxF',
            }],
        }];
        const props = createProps({ messages });
        render(
            <MemoryRouter initialEntries={['/']}>
                <AssistantConversation {...props} />
            </MemoryRouter>,
        );

        const discordLink = screen.getByRole('link', { name: 'Discord' });
        expect(discordLink).toHaveAttribute('href', 'https://discord.gg/DFWs8GrHxF');
        expect(discordLink).toHaveAttribute('target', '_blank');
        expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders provider errors as alerts and clears them when input changes', () => {
        const onClearError = vi.fn();
        renderConversation({
            errorMessage: '現在AI Assistantを利用できません。',
            onClearError,
        });

        expect(screen.getByRole('alert')).toHaveTextContent(
            '現在AI Assistantを利用できません。',
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
