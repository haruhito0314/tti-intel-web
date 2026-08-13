import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AssistantProvider } from '@/features/assistant';
import type { AssistantClient } from '@/features/assistant';
import { AiAssistantProductPage } from './AiAssistantProduct';

const assistantProductCssSource = readFileSync(
    resolve(cwd(), 'src/pages/AiAssistantProduct.css'),
    'utf8',
);

describe('AiAssistantProductPage', () => {
    it('renders a dedicated, usable Assistant workspace', () => {
        const client: AssistantClient = {
            send: async () => ({ answer: '回答です。', links: [] }),
        };
        let id = 0;

        render(
            <MemoryRouter initialEntries={['/app/ai-assistant']}>
                <AssistantProvider client={client} createId={() => `id-${id++}`}>
                    <AiAssistantProductPage />
                </AssistantProvider>
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: 'AI Assistant' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: '質問' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '新しい会話' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'アプリケーション一覧に戻る' })).toHaveAttribute('href', '/app');
        expect(screen.queryByText('Origin allowlist')).not.toBeInTheDocument();
    });

    it('keeps the app shell, message scroller, and composer at stable dimensions', () => {
        expect(assistantProductCssSource).toMatch(
            /\.assistant-app-page\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100dvh;[^}]*min-width:\s*0;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s,
        );
        expect(assistantProductCssSource).toMatch(
            /\.assistant-app-chat\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*900px;[^}]*height:\s*100%;[^}]*max-height:\s*100%;[^}]*overflow:\s*hidden;/s,
        );
        expect(assistantProductCssSource).toMatch(
            /\.assistant-app-chat \.assistant-conversation\s*\{[^}]*width:\s*100%;[^}]*flex:\s*1 1 0;[^}]*overflow:\s*hidden;/s,
        );
        expect(assistantProductCssSource).toMatch(
            /\.assistant-app-chat \.assistant-messages\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*0;[^}]*flex:\s*1 1 0;[^}]*overflow-y:\s*auto;/s,
        );
        expect(assistantProductCssSource).toMatch(
            /\.assistant-app-chat \.assistant-form\s*\{[^}]*width:\s*100%;[^}]*flex:\s*0 0 auto;[^}]*margin-top:\s*auto;/s,
        );
        expect(assistantProductCssSource).toMatch(
            /\.assistant-app-main\s*\{[^}]*grid-template-rows:\s*64px minmax\(0,\s*1fr\);/s,
        );
        expect(assistantProductCssSource).toMatch(
            /@media\s*\(max-width:\s*760px\)[\s\S]*\.assistant-app-main\s*\{[^}]*grid-template-rows:\s*58px minmax\(0,\s*1fr\);/s,
        );
    });

    it('公開済みのTTI Intelligenceとサイト情報を短く案内し、大学の質問は公式サイトへ案内すると明示する', () => {
        const client: AssistantClient = {
            send: async () => ({ answer: '回答です。', links: [] }),
        };

        render(
            <MemoryRouter initialEntries={['/app/ai-assistant']}>
                <AssistantProvider client={client} createId={() => 'id-copy'}>
                    <AiAssistantProductPage />
                </AssistantProvider>
            </MemoryRouter>,
        );

        expect(screen.getByText(/公開されているTTI Intelligenceとこのサイトの情報をもとに、短くお答え/)).toBeInTheDocument();
        expect(screen.getByText(/豊田工業大学に関する一般的な質問には、公式サイトをご案内/)).toBeInTheDocument();
        expect(screen.getByText(/対応していない内容はContactからお問い合わせ/)).toBeInTheDocument();
        expect(screen.getByText(/現在の情報や重要な情報は公式情報源でも確認/)).toBeInTheDocument();

        const description = document.querySelector('meta[name="description"]');
        expect(description).toHaveAttribute(
            'content',
            expect.stringContaining('公開されているTTI Intelligenceとこのサイトの情報をもとに、短くお答え'),
        );
        expect(description).toHaveAttribute(
            'content',
            expect.stringContaining('豊田工業大学に関する一般的な質問には、公式サイトをご案内'),
        );
        expect(description).toHaveAttribute(
            'content',
            expect.stringContaining('対応していない内容はContactからお問い合わせ'),
        );
    });

    it('入力欄の上に質問例を最初だけ表示し、一件質問すると消す', async () => {
        const send = vi.fn(async () => ({ answer: '回答です。', links: [] }));
        const client: AssistantClient = {
            send,
        };

        render(
            <MemoryRouter initialEntries={['/app/ai-assistant']}>
                <AssistantProvider client={client} createId={() => 'id-prompts'}>
                    <AiAssistantProductPage />
                </AssistantProvider>
            </MemoryRouter>,
        );

        const conversation = screen.getByRole('log', { name: '会話' });
        const suggestions = screen.getByRole('navigation', { name: '質問例' });
        const form = screen.getByRole('textbox', { name: '質問' }).closest('form')!;

        expect(conversation.compareDocumentPosition(suggestions))
            .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(suggestions.compareDocumentPosition(form))
            .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(screen.getByRole('button', { name: 'このサークルって普段何をしてる？' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'このサイトでは何があるの？' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '掲示板は投稿していいの？' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'お問い合わせってしていいの？' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /CodexとMCP/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /光合成/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /CLI Practice/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /TOEIC/i })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {
            name: 'このサークルって普段何をしてる？',
        }));

        await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole('navigation', { name: '質問例' }))
            .not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {
            name: '会話を最初からやり直す',
        }));
        expect(screen.getByRole('navigation', { name: '質問例' }))
            .toBeInTheDocument();
    });
});
