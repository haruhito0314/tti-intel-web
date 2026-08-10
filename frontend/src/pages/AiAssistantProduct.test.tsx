import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AssistantProvider } from '@/features/assistant';
import type { AssistantClient } from '@/features/assistant';
import { AiAssistantProductPage } from './AiAssistantProduct';

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

    it('TTI Intelligenceとサイトに対応し、大学の一般質問は公式サイトへ案内すると明示する', () => {
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

        expect(screen.getByText(/TTI Intelligenceとこのサイトについて案内/)).toBeInTheDocument();
        expect(screen.getByText(/豊田工業大学に関する一般的な質問には、公式サイトをご案内/)).toBeInTheDocument();
        expect(screen.getByText(/対象外の一般的な質問にはLunaを利用しません/)).toBeInTheDocument();
        expect(screen.getByText(/現在の情報や重要な情報は公式情報源でも確認/)).toBeInTheDocument();

        const description = document.querySelector('meta[name="description"]');
        expect(description).toHaveAttribute(
            'content',
            expect.stringContaining('TTI Intelligenceとこのサイトについて案内'),
        );
        expect(description).toHaveAttribute(
            'content',
            expect.stringContaining('豊田工業大学に関する一般的な質問には、公式サイトをご案内'),
        );
        expect(description).toHaveAttribute(
            'content',
            expect.stringContaining('対象外の一般的な質問にはLunaを利用しません'),
        );
    });

    it('対応範囲に沿った四種類の質問例を表示する', () => {
        const client: AssistantClient = {
            send: async () => ({ answer: '回答です。', links: [] }),
        };

        render(
            <MemoryRouter initialEntries={['/app/ai-assistant']}>
                <AssistantProvider client={client} createId={() => 'id-prompts'}>
                    <AiAssistantProductPage />
                </AssistantProvider>
            </MemoryRouter>,
        );

        expect(screen.getAllByRole('button', { name: 'TTI Intelligenceについて教えて' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: 'このサイトでできることは？' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: 'このサイトの使い方を教えて' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: '豊田工業大学の公式サイトを教えて' })).toHaveLength(2);
        expect(screen.queryByRole('button', { name: /CodexとMCP/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /光合成/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /CLI Practice/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /TOEIC/i })).not.toBeInTheDocument();
    });
});
