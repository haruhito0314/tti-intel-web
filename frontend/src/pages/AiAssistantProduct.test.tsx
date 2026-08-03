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

    it('回答に使う情報とリアルタイムWeb検索の制約を明示する', () => {
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

        expect(screen.getByText(/TTI Intelligenceのサイトと豊田工業大学の資料/)).toBeInTheDocument();
        expect(screen.getByText(/Lunaの安定した一般知識/)).toBeInTheDocument();
        expect(screen.getByText(/リアルタイムのWeb検索は行いません/)).toBeInTheDocument();
        expect(screen.getByText(/現在の情報や重要な情報は公式情報源でも確認/)).toBeInTheDocument();
    });

    it('対応範囲を示す四種類の質問例を表示する', () => {
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

        expect(screen.getAllByRole('button', { name: '豊田工業大学にはどんなサークルがありますか？' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: 'CodexとMCPの関係を教えて' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: 'Color Sortはどんなアプリ？' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: '光合成を簡単に説明して' })).toHaveLength(2);
        expect(screen.queryByRole('button', { name: /CLI Practice/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /TOEIC/i })).not.toBeInTheDocument();
    });
});
