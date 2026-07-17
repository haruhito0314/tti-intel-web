/// <reference types="node" />

import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import {
    Link,
    MemoryRouter,
    Route,
    Routes,
} from 'react-router-dom';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import appSource from '../../App.tsx?raw';
import type {
    AssistantClient,
    AssistantRequest,
    AssistantResponse,
} from '../../features/assistant';
import { Layout } from './Layout';
import layoutSource from './Layout.tsx?raw';

vi.mock('./Header', () => ({
    Header: () => <header data-testid="site-header">Site header</header>,
}));

vi.mock('./DevHeader', () => ({
    DevHeader: () => <header data-testid="dev-header">Dev header</header>,
}));

vi.mock('./Footer', () => ({
    Footer: () => <footer data-testid="site-footer">Site footer</footer>,
}));

const response: AssistantResponse = {
    answer: '目的のページをご案内します。',
    links: [],
};

function installDesktopMatchMedia() {
    const mediaQueryList = {
        matches: false,
        media: '(max-width: 767px)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
    } as unknown as MediaQueryList;

    vi.stubGlobal('matchMedia', vi.fn(() => mediaQueryList));
}

function NewsFixture() {
    return (
        <section>
            <h1>お知らせ</h1>
            <Link to="/weekly-math">今週の数学へ</Link>
        </section>
    );
}

function WeeklyMathFixture() {
    return (
        <section>
            <h1>今週の数学</h1>
            <Link to="/news">お知らせへ</Link>
        </section>
    );
}

function TestRoutes({
    client,
    createId,
}: {
    client: AssistantClient;
    createId: () => string;
}) {
    return (
        <Routes>
            <Route
                element={(
                    <Layout
                        assistantClient={client}
                        assistantCreateId={createId}
                    />
                )}
            >
                <Route path="/news" element={<NewsFixture />} />
                <Route path="/weekly-math" element={<WeeklyMathFixture />} />
                <Route path="/development" element={<div>Development</div>} />
                <Route path="/admin" element={<div>Admin</div>} />
                <Route path="/admin/members" element={<div>Members</div>} />
                <Route
                    path="/administrator"
                    element={<div>Public lookalike</div>}
                />
            </Route>
        </Routes>
    );
}

function renderRoutes({
    initialEntry = '/news',
    client,
    createId,
}: {
    initialEntry?: string;
    client: AssistantClient;
    createId: () => string;
}) {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <TestRoutes client={client} createId={createId} />
        </MemoryRouter>,
    );
}

function createHarness() {
    let nextId = 0;
    const createId = () => `id-${++nextId}`;
    const send = vi.fn(async (request: AssistantRequest) => {
        void request;
        return response;
    });
    const client: AssistantClient = { send };

    return { client, createId, send };
}

function openAssistant() {
    fireEvent.click(
        screen.getByRole('button', { name: 'AI Assistantを開く' }),
    );
    return screen.getByRole('dialog', { name: 'AI Assistant' });
}

async function sendQuestion(question: string) {
    const input = screen.getByRole('textbox', { name: '質問' });
    fireEvent.change(input, { target: { value: question } });
    fireEvent.click(screen.getByRole('button', { name: '送信' }));
    await screen.findByText(response.answer);
}

beforeEach(() => {
    installDesktopMatchMedia();
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue(
        [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList,
    );
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Layout assistant integration', () => {
    it('keeps conversation and session across public route changes while closing the panel', async () => {
        const { client, createId, send } = createHarness();
        renderRoutes({ client, createId });

        openAssistant();
        await sendQuestion('お知らせについて教えて');

        fireEvent.click(
            screen.getByRole('link', { name: '今週の数学へ' }),
        );
        await screen.findByRole('heading', { name: '今週の数学' });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        openAssistant();
        expect(
            screen.getByRole('dialog', { name: 'AI Assistant' }),
        ).toBeInTheDocument();
        expect(screen.getByText('お知らせについて教えて')).toBeInTheDocument();
        expect(screen.getByText(response.answer)).toBeInTheDocument();

        await waitFor(() => {
            expect(
                screen.getByRole('textbox', { name: '質問' }),
            ).toHaveValue('');
        });
        const input = screen.getByRole('textbox', { name: '質問' });
        fireEvent.change(input, {
            target: { value: '今週の数学も教えて' },
        });
        fireEvent.click(screen.getByRole('button', { name: '送信' }));

        await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
        const firstRequest = send.mock.calls[0][0];
        const secondRequest = send.mock.calls[1][0];

        expect(firstRequest.currentPath).toBe('/news');
        expect(secondRequest.currentPath).toBe('/weekly-math');
        expect(secondRequest.sessionId).toBe(firstRequest.sessionId);
        expect(secondRequest.history).toEqual([
            { role: 'user', content: 'お知らせについて教えて' },
        ]);
    });

    it('keeps the assistant hidden across navigation and moves focus to main', async () => {
        const { client, createId } = createHarness();
        renderRoutes({ client, createId });

        const main = screen.getByRole('main');
        openAssistant();
        const summary = screen.getByLabelText('AI Assistantのメニュー');
        fireEvent.click(summary);
        fireEvent.click(
            screen.getByRole('button', {
                name: 'このタブで右下ボタンを非表示',
            }),
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'AI Assistantを開く' }),
        ).not.toBeInTheDocument();
        expect(main).toHaveFocus();

        fireEvent.click(
            screen.getByRole('link', { name: '今週の数学へ' }),
        );
        await screen.findByRole('heading', { name: '今週の数学' });

        expect(
            screen.queryByRole('button', { name: 'AI Assistantを開く' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('resets hidden, open, messages, and session after a fresh mount', async () => {
        const { client, createId, send } = createHarness();
        const firstMount = renderRoutes({ client, createId });

        openAssistant();
        await sendQuestion('最初の質問');
        await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
        const firstSessionId = send.mock.calls[0][0].sessionId;
        fireEvent.click(screen.getByLabelText('AI Assistantのメニュー'));
        fireEvent.click(
            screen.getByRole('button', {
                name: 'このタブで右下ボタンを非表示',
            }),
        );
        expect(
            screen.queryByRole('button', { name: 'AI Assistantを開く' }),
        ).not.toBeInTheDocument();

        firstMount.unmount();

        renderRoutes({ client, createId });
        expect(
            screen.getByRole('button', { name: 'AI Assistantを開く' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        openAssistant();
        expect(screen.queryByText('最初の質問')).not.toBeInTheDocument();
        expect(screen.queryByText(response.answer)).not.toBeInTheDocument();
        expect(
            screen.getByRole('article', { name: 'AI Assistantの回答' }),
        ).toHaveTextContent(
            'こんにちは。私はこのサイトを案内するAIアシスタントです。ページの探し方や公開コンテンツについて、気軽に聞いてください。',
        );
        expect(screen.queryByLabelText('質問の候補')).not.toBeInTheDocument();

        await sendQuestion('新しい質問');
        await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
        const secondSessionId = send.mock.calls[1][0].sessionId;

        expect(secondSessionId).not.toBe(firstSessionId);
    });

    it.each([
        '/admin',
        '/admin/members',
        '/Admin',
        '/ADMIN/MEMBERS',
        '/aDmIn/MeMbErS',
    ])(
        'does not expose the assistant on %s',
        (initialEntry) => {
            const { client, createId, send } = createHarness();
            renderRoutes({ initialEntry, client, createId });

            expect(
                screen.queryByRole('button', { name: 'AI Assistantを開く' }),
            ).not.toBeInTheDocument();
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(send).not.toHaveBeenCalled();
        },
    );

    it.each(['/administrator', '/Administrator', '/aDmInIsTrAtOr'])(
        'does not treat the public lookalike %s as an admin route',
        (initialEntry) => {
            const { client, createId } = createHarness();
            renderRoutes({
                initialEntry,
                client,
                createId,
            });

            expect(screen.getByText('Public lookalike')).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: 'AI Assistantを開く' }),
            ).toBeInTheDocument();
        },
    );

    it('keeps the existing layout contracts and places the widget outside its background', () => {
        const { client, createId } = createHarness();
        renderRoutes({ client, createId });

        const main = screen.getByRole('main');
        const background = main.parentElement;
        const trigger = screen.getByRole('button', {
            name: 'AI Assistantを開く',
        });

        expect(main).toHaveAttribute('tabindex', '-1');
        expect(background).not.toBeNull();
        expect(
            within(background as HTMLElement).getByTestId('site-header'),
        ).toBeInTheDocument();
        expect(
            within(background as HTMLElement).getByTestId('site-footer'),
        ).toBeInTheDocument();
        expect(background).not.toContainElement(trigger);
        expect(layoutSource).not.toMatch(
            /\bkey\s*=\s*\{[^}]*(?:pathname|location)/,
        );
        expect(appSource).toMatch(
            /<Route path="\/" element=\{<Layout \/>\}>/,
        );
    });

    it('preserves the development header selection', () => {
        const { client, createId } = createHarness();
        renderRoutes({
            initialEntry: '/development',
            client,
            createId,
        });

        expect(screen.getByTestId('dev-header')).toBeInTheDocument();
        expect(screen.queryByTestId('site-header')).not.toBeInTheDocument();
        expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    });
});
