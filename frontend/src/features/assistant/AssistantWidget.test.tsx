/// <reference types="node" />

import {
    StrictMode,
    useCallback,
    useRef,
} from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import appSource from '../../App.tsx?raw';
import devHeaderSource from '../../components/layout/DevHeader.tsx?raw';
import headerSource from '../../components/layout/Header.tsx?raw';
import toastSource from '../../components/ui/Toast.tsx?raw';
import { AssistantProvider } from './AssistantProvider';
import { AssistantWidget } from './AssistantWidget';
import assistantWidgetSource from './AssistantWidget.tsx?raw';
import assistantIndexSource from './index.ts?raw';
import type {
    AssistantClient,
    AssistantResponse,
} from './types';

const response: AssistantResponse = {
    answer: 'About Usで活動内容を確認できます。',
    links: [{ pageId: 'about', title: 'About Us', href: '/about' }],
};
const assistantCssSource = readFileSync(
    resolve(cwd(), 'src/features/assistant/assistant.css'),
    'utf8',
);
const indexCssSource = readFileSync(
    resolve(cwd(), 'src/index.css'),
    'utf8',
);

interface MatchMediaController {
    mediaQueryList: MediaQueryList;
    setMobile(mobile: boolean): void;
}

function installMatchMedia(initialMobile: boolean): MatchMediaController {
    const media = '(max-width: 767px)';
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    let matches = initialMobile;
    const mediaQueryList = {
        get matches() {
            return matches;
        },
        media,
        onchange: null,
        addEventListener: vi.fn((
            type: string,
            listener: (event: MediaQueryListEvent) => void,
        ) => {
            if (type === 'change') listeners.add(listener);
        }),
        removeEventListener: vi.fn((
            type: string,
            listener: (event: MediaQueryListEvent) => void,
        ) => {
            if (type === 'change') listeners.delete(listener);
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
    } as unknown as MediaQueryList;

    vi.stubGlobal('matchMedia', vi.fn(() => mediaQueryList));

    return {
        mediaQueryList,
        setMobile(mobile: boolean) {
            matches = mobile;
            const event = { matches, media } as MediaQueryListEvent;
            act(() => {
                listeners.forEach((listener) => listener(event));
            });
        },
    };
}

interface WidgetHarnessProps {
    client: AssistantClient;
    createId: () => string;
    enabled: boolean;
    mounted: boolean;
    initiallyInert: boolean;
}

function WidgetHarness({
    client,
    createId,
    enabled,
    mounted,
    initiallyInert,
}: WidgetHarnessProps) {
    const backgroundRef = useRef<HTMLElement>(null);
    const initializedRef = useRef(false);
    const setBackgroundRef = useCallback((node: HTMLDivElement | null) => {
        backgroundRef.current = node;
        if (node && !initializedRef.current) {
            initializedRef.current = true;
            if (initiallyInert) {
                node.inert = true;
                node.setAttribute('inert', 'preset');
            }
        }
    }, [initiallyInert]);

    return (
        <MemoryRouter>
            <div ref={setBackgroundRef} data-testid="page-background">
                <a href="/outside">ページ内リンク</a>
                <main tabIndex={-1}>ページ本文</main>
            </div>
            <AssistantProvider client={client} createId={createId}>
                {mounted && (
                    <AssistantWidget
                        enabled={enabled}
                        backgroundRef={backgroundRef}
                    />
                )}
            </AssistantProvider>
        </MemoryRouter>
    );
}

interface RenderWidgetOptions {
    mobile?: boolean;
    enabled?: boolean;
    client?: AssistantClient;
    initiallyInert?: boolean;
    initialOverflow?: string;
}

function renderWidget({
    mobile = false,
    enabled = true,
    client = {
        send: vi.fn().mockResolvedValue(response),
    },
    initiallyInert = false,
    initialOverflow = '',
}: RenderWidgetOptions = {}) {
    const matchMedia = installMatchMedia(mobile);
    let nextId = 0;
    const createId = vi.fn(() => `widget-id-${++nextId}`);
    let currentEnabled = enabled;
    let currentMounted = true;
    document.body.style.overflow = initialOverflow;

    const view = render(
        <WidgetHarness
            client={client}
            createId={createId}
            enabled={currentEnabled}
            mounted={currentMounted}
            initiallyInert={initiallyInert}
        />,
    );

    return {
        ...view,
        client,
        matchMedia,
        getBackground() {
            return screen.getByTestId('page-background');
        },
        rerenderWidget(next: {
            enabled?: boolean;
            mounted?: boolean;
        }) {
            currentEnabled = next.enabled ?? currentEnabled;
            currentMounted = next.mounted ?? currentMounted;
            view.rerender(
                <WidgetHarness
                    client={client}
                    createId={createId}
                    enabled={currentEnabled}
                    mounted={currentMounted}
                    initiallyInert={initiallyInert}
                />,
            );
        },
    };
}

function openWidget() {
    const trigger = screen.getByRole('button', { name: 'AIガイドを開く' });
    fireEvent.click(trigger);
    return trigger;
}

function getMenuSummary() {
    return screen.getByLabelText('AIガイドのメニュー');
}

function openMenu() {
    const summary = getMenuSummary();
    fireEvent.click(summary);
    const details = summary.closest('details');
    expect(details).toHaveAttribute('open');
    return {
        summary,
        details: details as HTMLDetailsElement,
        hideButton: screen.getByRole('button', {
            name: 'このタブで右下ボタンを非表示',
        }),
    };
}

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue(
        [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList,
    );
});

afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('AssistantWidget', () => {
    it('starts as one static A1 button and does not send or open automatically', () => {
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(response),
        };

        renderWidget({ client, mobile: false });

        expect(
            screen.getAllByRole('button', { name: 'AIガイドを開く' }),
        ).toHaveLength(1);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(client.send).not.toHaveBeenCalled();
    });

    it('opens only on click, focuses the input, and stays nonmodal on desktop', () => {
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(response),
        };
        const { getBackground } = renderWidget({
            client,
            mobile: false,
            initiallyInert: true,
            initialOverflow: 'clip',
        });
        const background = getBackground();
        const originalInert = background.inert;
        const originalInertAttribute = background.getAttribute('inert');

        const trigger = openWidget();

        const dialog = screen.getByRole('dialog', { name: 'AIガイド' });
        expect(dialog).toHaveAttribute('aria-modal', 'false');
        expect(screen.getByRole('textbox', { name: '質問' })).toHaveFocus();
        expect(trigger).toHaveAttribute('hidden');
        expect(
            screen.queryByRole('button', { name: 'AIガイドを開く' }),
        ).not.toBeInTheDocument();
        expect(background.inert).toBe(originalInert);
        expect(background.getAttribute('inert')).toBe(originalInertAttribute);
        expect(document.body.style.overflow).toBe('clip');
        expect(client.send).not.toHaveBeenCalled();
    });

    it('restores trigger focus after close button and Escape', () => {
        renderWidget({ mobile: false });
        const trigger = openWidget();

        fireEvent.click(
            screen.getByRole('button', { name: 'AIガイドを閉じる' }),
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();

        fireEvent.click(trigger);
        const textarea = screen.getByRole('textbox', { name: '質問' });
        expect(textarea).toHaveFocus();
        fireEvent.keyDown(textarea, { key: 'Escape' });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it('falls back inside the mobile dialog when reopening with a disabled input', () => {
        const client: AssistantClient = {
            send: vi.fn(() => new Promise<AssistantResponse>(() => {})),
        };
        renderWidget({ client, mobile: true });
        const trigger = openWidget();
        const textarea = screen.getByRole('textbox', { name: '質問' });

        fireEvent.change(textarea, {
            target: { value: '回答待ちの質問' },
        });
        fireEvent.click(screen.getByRole('button', { name: '送信' }));
        expect(textarea).toBeDisabled();

        fireEvent.click(
            screen.getByRole('button', { name: 'AIガイドを閉じる' }),
        );
        expect(trigger).toHaveFocus();
        fireEvent.click(trigger);

        expect(trigger).toHaveAttribute('hidden');
        expect(screen.getByRole('textbox', { name: '質問' })).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'AIガイドを閉じる' }),
        ).toHaveFocus();
    });

    it('removes every entry point and focuses main after hiding for this tab', () => {
        const { getBackground } = renderWidget({
            mobile: true,
            initialOverflow: 'scroll',
        });
        const background = getBackground();
        const main = within(background).getByRole('main');
        const trigger = openWidget();

        expect(background).toHaveAttribute('inert');
        const { hideButton } = openMenu();
        fireEvent.click(hideButton);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'AIガイドを開く' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('AIガイドを開く'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/元に戻す|AIガイドを表示/),
        ).not.toBeInTheDocument();
        expect(background).not.toHaveAttribute('inert');
        expect(document.body.style.overflow).toBe('scroll');
        expect(main).toHaveFocus();
        expect(trigger).not.toHaveFocus();
    });

    it('uses mobile modal semantics, hides the outside trigger, and restores exact state on close', () => {
        const { getBackground } = renderWidget({
            mobile: true,
            initialOverflow: 'auto',
        });
        const background = getBackground();
        const originalInert = background.inert;
        const originalInertAttribute = background.getAttribute('inert');
        const trigger = openWidget();

        const dialog = screen.getByRole('dialog', { name: 'AIガイド' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(background.inert).toBe(true);
        expect(background).toHaveAttribute('inert');
        expect(document.body.style.overflow).toBe('hidden');
        expect(trigger).toHaveAttribute('hidden');
        expect(
            screen.queryByRole('button', { name: 'AIガイドを開く' }),
        ).not.toBeInTheDocument();

        const root = dialog.closest('.assistant-root');
        expect(root).toHaveClass('assistant-root-open');
        const outsideAssistantButtons = [...root!.querySelectorAll('button')]
            .filter((button) => !dialog.contains(button));
        expect(outsideAssistantButtons).toEqual([trigger]);
        expect(outsideAssistantButtons[0]).toHaveAttribute('hidden');

        fireEvent.click(
            screen.getByRole('button', { name: 'AIガイドを閉じる' }),
        );

        expect(background.inert).toBe(originalInert);
        expect(background.getAttribute('inert')).toBe(originalInertAttribute);
        expect(document.body.style.overflow).toBe('auto');
        expect(trigger).not.toHaveAttribute('hidden');
        expect(trigger).toHaveFocus();
        expect(trigger.closest('.assistant-root')).not.toHaveClass(
            'assistant-root-open',
        );
    });

    it('traps mobile focus while respecting native disclosure and visibility', () => {
        renderWidget({ mobile: true });
        openWidget();
        const dialog = screen.getByRole('dialog', { name: 'AIガイド' });
        const closeButton = screen.getByRole('button', {
            name: 'AIガイドを閉じる',
        });
        const summary = getMenuSummary();
        const details = summary.closest('details') as HTMLDetailsElement;
        const hideButton = screen.getByRole('button', {
            name: 'このタブで右下ボタンを非表示',
            hidden: true,
        });

        const hiddenButton = document.createElement('button');
        hiddenButton.hidden = true;
        hiddenButton.textContent = 'hidden self';
        const hiddenAncestor = document.createElement('div');
        hiddenAncestor.hidden = true;
        hiddenAncestor.append(document.createElement('button'));
        const inertAncestor = document.createElement('div');
        inertAncestor.inert = true;
        inertAncestor.setAttribute('inert', '');
        inertAncestor.append(document.createElement('button'));
        const layoutHiddenButton = document.createElement('button');
        layoutHiddenButton.style.display = 'none';
        layoutHiddenButton.textContent = 'layout hidden';
        dialog.append(
            hiddenButton,
            hiddenAncestor,
            inertAncestor,
            layoutHiddenButton,
        );

        expect(details.open).toBe(false);
        summary.focus();
        fireEvent.keyDown(summary, { key: 'Tab' });
        expect(closeButton).toHaveFocus();

        closeButton.focus();
        fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
        expect(summary).toHaveFocus();

        fireEvent.click(summary);
        expect(details.open).toBe(true);
        closeButton.focus();
        fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
        expect(hideButton).toHaveFocus();

        hideButton.focus();
        fireEvent.keyDown(hideButton, { key: 'Tab' });
        expect(closeButton).toHaveFocus();
    });

    it('layers disclosure Escape and resets uncontrolled details after every unmount path', () => {
        const view = renderWidget({ mobile: false });
        const trigger = openWidget();
        let menu = openMenu();

        menu.hideButton.focus();
        fireEvent.keyDown(menu.hideButton, { key: 'Escape' });
        expect(menu.details.open).toBe(false);
        expect(menu.summary).toHaveFocus();
        expect(screen.getByRole('dialog', { name: 'AIガイド' })).toBeInTheDocument();

        fireEvent.keyDown(menu.summary, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();

        fireEvent.click(trigger);
        expect(
            (getMenuSummary().closest('details') as HTMLDetailsElement).open,
        ).toBe(false);
        menu = openMenu();
        fireEvent.click(
            screen.getByRole('button', { name: 'AIガイドを閉じる' }),
        );
        fireEvent.click(trigger);
        expect(
            (getMenuSummary().closest('details') as HTMLDetailsElement).open,
        ).toBe(false);

        menu = openMenu();
        view.rerenderWidget({ enabled: false });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        view.rerenderWidget({ enabled: true });
        expect(screen.getByRole('dialog', { name: 'AIガイド' })).toBeInTheDocument();
        expect(
            (getMenuSummary().closest('details') as HTMLDetailsElement).open,
        ).toBe(false);
    });

    it('closes an open disclosure before the dialog when Escape starts elsewhere in the panel', () => {
        renderWidget({ mobile: false });
        const trigger = openWidget();
        const menu = openMenu();
        const textarea = screen.getByRole('textbox', { name: '質問' });

        textarea.focus();
        fireEvent.keyDown(textarea, { key: 'Escape' });

        expect(menu.details.open).toBe(false);
        expect(menu.summary).toHaveFocus();
        expect(
            screen.getByRole('dialog', { name: 'AIガイド' }),
        ).toBeInTheDocument();

        fireEvent.keyDown(menu.summary, { key: 'Escape' });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it('switches modal side effects when matchMedia changes while open', () => {
        const { getBackground, matchMedia } = renderWidget({
            mobile: false,
            initialOverflow: 'scroll',
        });
        const background = getBackground();
        const originalInert = background.inert;
        const originalInertAttribute = background.getAttribute('inert');
        const trigger = openWidget();
        const dialog = screen.getByRole('dialog', { name: 'AIガイド' });

        expect(dialog).toHaveAttribute('aria-modal', 'false');
        expect(document.body.style.overflow).toBe('scroll');
        matchMedia.setMobile(true);

        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(background.inert).toBe(true);
        expect(background).toHaveAttribute('inert');
        expect(document.body.style.overflow).toBe('hidden');
        expect(trigger).toHaveAttribute('hidden');

        matchMedia.setMobile(false);

        expect(dialog).toHaveAttribute('aria-modal', 'false');
        expect(background.inert).toBe(originalInert);
        expect(background.getAttribute('inert')).toBe(originalInertAttribute);
        expect(document.body.style.overflow).toBe('scroll');
        expect(trigger).toHaveAttribute('hidden');
    });

    it('moves focus back inside when an open desktop dialog becomes modal', () => {
        const { getBackground, matchMedia } = renderWidget({
            mobile: false,
        });
        const background = getBackground();
        openWidget();
        const outsideLink = within(background).getByRole('link', {
            name: 'ページ内リンク',
        });
        const textarea = screen.getByRole('textbox', { name: '質問' });

        outsideLink.focus();
        expect(outsideLink).toHaveFocus();
        matchMedia.setMobile(true);

        expect(background).toHaveAttribute('inert');
        expect(document.body.style.overflow).toBe('hidden');
        expect(textarea).toHaveFocus();
    });

    it('preserves dialog focus across breakpoint changes when it is already inside', () => {
        const { matchMedia } = renderWidget({
            mobile: false,
        });
        openWidget();
        const summary = getMenuSummary();

        summary.focus();
        matchMedia.setMobile(true);
        expect(summary).toHaveFocus();

        matchMedia.setMobile(false);
        expect(summary).toHaveFocus();
    });

    it('restores pre-existing inert and overflow on disable and unmount', () => {
        const view = renderWidget({
            mobile: true,
            initiallyInert: true,
            initialOverflow: 'clip',
        });
        const background = view.getBackground();
        const main = within(background).getByRole('main');
        const trigger = openWidget();

        expect(background.getAttribute('inert')).toBe('');
        expect(background.inert).toBe(true);
        expect(document.body.style.overflow).toBe('hidden');
        expect(trigger).toHaveAttribute('hidden');

        view.rerenderWidget({ enabled: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('AIガイドを開く'),
        ).not.toBeInTheDocument();
        expect(background.getAttribute('inert')).toBe('preset');
        expect(background.inert).toBe(true);
        expect(document.body.style.overflow).toBe('clip');
        expect(main).toHaveFocus();

        view.rerenderWidget({ enabled: true });
        expect(screen.getByRole('dialog', { name: 'AIガイド' })).toBeInTheDocument();
        expect(document.body.style.overflow).toBe('hidden');
        view.unmount();

        expect(background.getAttribute('inert')).toBe('preset');
        expect(background.inert).toBe(true);
        expect(document.body.style.overflow).toBe('clip');
        expect(
            view.matchMedia.mediaQueryList.removeEventListener,
        ).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('restores main focus after an open mobile widget unmounts', () => {
        const view = renderWidget({
            mobile: true,
            initialOverflow: 'scroll',
        });
        const background = view.getBackground();
        const main = within(background).getByRole('main');
        openWidget();

        expect(background).toHaveAttribute('inert');
        expect(document.body.style.overflow).toBe('hidden');

        view.rerenderWidget({ mounted: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('AIガイドを開く'),
        ).not.toBeInTheDocument();
        expect(background).not.toHaveAttribute('inert');
        expect(document.body.style.overflow).toBe('scroll');
        expect(main).toHaveFocus();
    });

    it('does not steal focus during Strict Mode cleanup while disabled', () => {
        installMatchMedia(true);
        render(<button type="button">既存のフォーカス</button>);
        const outsideButton = screen.getByRole('button', {
            name: '既存のフォーカス',
        });
        outsideButton.focus();
        let nextId = 0;

        const view = render(
            <StrictMode>
                <WidgetHarness
                    client={{
                        send: vi.fn().mockResolvedValue(response),
                    }}
                    createId={() => `strict-id-${++nextId}`}
                    enabled={false}
                    mounted
                    initiallyInert={false}
                />
            </StrictMode>,
        );

        expect(outsideButton).toHaveFocus();

        view.unmount();
    });

    it('preserves unrelated page focus when a closed widget unmounts', () => {
        const view = renderWidget({ mobile: false });
        const background = view.getBackground();
        const outsideLink = within(background).getByRole('link', {
            name: 'ページ内リンク',
        });

        outsideLink.focus();
        view.rerenderWidget({ mounted: false });

        expect(outsideLink).toHaveFocus();
    });

    it('preserves unrelated page focus when a closed widget is disabled', () => {
        const view = renderWidget({ mobile: false });
        const background = view.getBackground();
        const outsideLink = within(background).getByRole('link', {
            name: 'ページ内リンク',
        });

        outsideLink.focus();
        view.rerenderWidget({ enabled: false });

        expect(outsideLink).toHaveFocus();
    });

    it('restores main when a focused closed trigger is disabled or unmounted', () => {
        const disabledView = renderWidget({ mobile: false });
        const disabledBackground = disabledView.getBackground();
        const disabledMain = within(disabledBackground).getByRole('main');
        const disabledTrigger = screen.getByRole('button', {
            name: 'AIガイドを開く',
        });

        disabledTrigger.focus();
        disabledView.rerenderWidget({ enabled: false });
        expect(disabledMain).toHaveFocus();
        disabledView.unmount();

        const unmountedView = renderWidget({ mobile: false });
        const unmountedBackground = unmountedView.getBackground();
        const unmountedMain = within(unmountedBackground).getByRole('main');
        const unmountedTrigger = screen.getByRole('button', {
            name: 'AIガイドを開く',
        });

        unmountedTrigger.focus();
        unmountedView.rerenderWidget({ mounted: false });
        expect(unmountedMain).toHaveFocus();
    });

    it('renders nothing and applies no side effects while disabled', () => {
        const { getBackground } = renderWidget({
            enabled: false,
            mobile: true,
            initialOverflow: 'auto',
        });
        const background = getBackground();

        expect(
            screen.queryByLabelText('AIガイドを開く'),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(background).not.toHaveAttribute('inert');
        expect(document.body.style.overflow).toBe('auto');
    });

    it('uses unique title and conversation IDs across widget instances', () => {
        installMatchMedia(false);
        let nextId = 0;
        const createId = () => `double-id-${++nextId}`;
        const client: AssistantClient = {
            send: vi.fn().mockResolvedValue(response),
        };

        function DoubleWidgetHarness() {
            const firstBackgroundRef = useRef<HTMLDivElement>(null);
            const secondBackgroundRef = useRef<HTMLDivElement>(null);
            return (
                <MemoryRouter>
                    <div ref={firstBackgroundRef}><main tabIndex={-1}>first</main></div>
                    <div ref={secondBackgroundRef}><main tabIndex={-1}>second</main></div>
                    <AssistantProvider client={client} createId={createId}>
                        <AssistantWidget
                            enabled
                            backgroundRef={firstBackgroundRef}
                        />
                    </AssistantProvider>
                    <AssistantProvider client={client} createId={createId}>
                        <AssistantWidget
                            enabled
                            backgroundRef={secondBackgroundRef}
                        />
                    </AssistantProvider>
                </MemoryRouter>
            );
        }

        render(<DoubleWidgetHarness />);
        const triggers = screen.getAllByRole('button', {
            name: 'AIガイドを開く',
        });
        fireEvent.click(triggers[0]);
        fireEvent.click(triggers[1]);

        const dialogs = screen.getAllByRole('dialog', { name: 'AIガイド' });
        const titleIds = dialogs.map((dialog) => (
            within(dialog).getByRole('heading', { name: 'AIガイド' }).id
        ));
        const labelledByIds = dialogs.map(
            (dialog) => dialog.getAttribute('aria-labelledby'),
        );
        const textareas = screen.getAllByRole('textbox', { name: '質問' });

        expect(new Set(titleIds).size).toBe(2);
        expect(labelledByIds).toEqual(titleIds);
        expect(textareas[0].id).not.toBe(textareas[1].id);
        expect(textareas[0].getAttribute('aria-describedby')).not.toBe(
            textareas[1].getAttribute('aria-describedby'),
        );
    });

    it('keeps native disclosure semantics and exports only the public frontend surface', () => {
        expect(assistantWidgetSource).toMatch(/<details/);
        expect(assistantWidgetSource).toMatch(
            /<summary[\s\S]*aria-label="AIガイドのメニュー"/,
        );
        expect(assistantWidgetSource).not.toMatch(
            /role=["'](?:menu|menuitem)["']|aria-haspopup/,
        );
        expect(assistantWidgetSource).not.toMatch(
            /localStorage|sessionStorage|Toast|元に戻す|AIガイドを表示/,
        );
        expect(assistantIndexSource.match(/assistant\.css/g)).toHaveLength(1);
        expect(assistantIndexSource).toMatch(/AssistantProvider/);
        expect(assistantIndexSource).toMatch(/AssistantWidget/);
        expect(assistantIndexSource).toMatch(/\.\/types/);
        expect(assistantIndexSource).not.toMatch(/assistantContext/);
    });

    it('fixes static geometry and preserves the intended source stacking order', () => {
        expect(assistantCssSource).toMatch(
            /\.assistant-root\s*\{[^}]*z-index:\s*30;/s,
        );
        expect(assistantCssSource).toMatch(
            /\.assistant-root\s*\{[^}]*right:\s*max\(20px,\s*env\(safe-area-inset-right,\s*0px\)\);[^}]*bottom:\s*max\(24px,\s*env\(safe-area-inset-bottom,\s*0px\)\);/s,
        );
        expect(assistantCssSource).toMatch(
            /\.assistant-trigger\s*\{[^}]*width:\s*64px;[^}]*height:\s*64px;/s,
        );
        expect(assistantCssSource).toMatch(
            /\.assistant-panel\s*\{[^}]*bottom:\s*10px;[^}]*width:\s*min\(387px,\s*calc\(100vw - 2\.5rem\)\);[^}]*height:\s*min\(594px,\s*calc\(100dvh - 50px\)\);/s,
        );
        expect(assistantCssSource).toMatch(
            /@media\s*\(max-width:\s*767px\)[\s\S]*\.assistant-root-open\s*\{[^}]*z-index:\s*110;/,
        );
        expect(assistantCssSource).toMatch(
            /@media\s*\(max-width:\s*767px\)[\s\S]*\.assistant-trigger\s*\{[^}]*right:\s*max\(20px,\s*env\(safe-area-inset-right,\s*0px\)\);[^}]*bottom:\s*max\(24px,\s*env\(safe-area-inset-bottom,\s*0px\)\);[^}]*width:\s*64px;[^}]*height:\s*64px;/,
        );
        expect(assistantCssSource).toMatch(
            /\.assistant-trigger\[hidden\]\s*\{[^}]*display:\s*none;/s,
        );
        expect(assistantCssSource).toMatch(
            /\.assistant-menu:not\(\[open\]\)\s*>\s*\.assistant-menu-button\s*\{[^}]*display:\s*none;/s,
        );
        expect(assistantCssSource).not.toMatch(
            /\b(?:animation|transition)\s*:|@keyframes|pulse|bounce/i,
        );

        expect(headerSource).toMatch(/\bz-40\b/);
        expect(devHeaderSource).toMatch(/\bz-50\b/);
        expect(toastSource).toMatch(/\bz-50\b/);
        expect(indexCssSource).toMatch(
            /\.site-header--mobile-open\s*\{[^}]*z-index:\s*100;/s,
        );
        expect(indexCssSource).toMatch(
            /\.dev-header--mobile-open\s*\{[^}]*z-index:\s*100;/s,
        );
        expect(appSource).toMatch(/className=.*initial-splash/);
        expect(indexCssSource).toMatch(
            /\.initial-splash\s*\{[^}]*z-index:\s*10000;/s,
        );
        expect([0, 30, 40, 50, 100, 110, 10000]).toEqual(
            [...[0, 30, 40, 50, 100, 110, 10000]]
                .sort((left, right) => left - right),
        );
    });

    it('keeps mobile controls visible by allowing only the message history to shrink', () => {
        expect(assistantCssSource).toMatch(
            /\.assistant-panel\s*\{[^}]*overflow:\s*hidden;/s,
        );
        expect(assistantCssSource).toMatch(
            /\.assistant-messages\s*\{[^}]*overflow-y:\s*auto;/s,
        );
        expect(assistantCssSource).toMatch(
            /@media\s*\(max-width:\s*767px\)[\s\S]*\.assistant-panel\s*\{[^}]*top:\s*0;[^}]*right:\s*0;[^}]*bottom:\s*auto;[^}]*left:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100dvh;[^}]*min-height:\s*calc\(100dvh - 120px\);[^}]*max-height:\s*594px;/s,
        );
        expect(assistantCssSource).toMatch(
            /@media\s*\(max-width:\s*767px\)[\s\S]*\.assistant-messages\s*\{[^}]*min-height:\s*0;/s,
        );
    });
});
