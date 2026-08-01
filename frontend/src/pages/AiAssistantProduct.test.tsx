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
        expect(screen.getAllByRole('button', { name: '活動日はいつ？' }).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: '新しい会話' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'アプリケーション一覧に戻る' })).toHaveAttribute('href', '/app');
        expect(screen.queryByText('Origin allowlist')).not.toBeInTheDocument();
    });
});
