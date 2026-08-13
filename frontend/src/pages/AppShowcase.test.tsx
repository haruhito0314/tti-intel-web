import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShowcase } from './AppShowcase';

describe('AppShowcase', () => {
    it('features the AI Assistant and omits retired showcase entries', () => {
        render(
            <MemoryRouter>
                <AppShowcase />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: 'AI Assistant' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /アプリを見る/ })[0]).toHaveAttribute('href', '/app/ai-assistant');
        expect(screen.queryByText('TOEIC Practice')).not.toBeInTheDocument();
        expect(screen.queryByText('コマンドライン練習')).not.toBeInTheDocument();
        expect(screen.queryByText('OpenAI')).not.toBeInTheDocument();
        expect(screen.queryByText('AWS Lambda')).not.toBeInTheDocument();
        expect(screen.queryByText('Grounded AI')).not.toBeInTheDocument();
        expect(screen.queryByText('TypeScript')).not.toBeInTheDocument();
        expect(screen.getAllByTestId('app-card-visual')).toHaveLength(3);
        for (const visual of screen.getAllByTestId('app-card-visual')) {
            expect(visual).toHaveClass('aspect-[4/3]');
        }
    });

    it('keeps the AI Assistant card preview in fixed non-overlapping rows', () => {
        render(
            <MemoryRouter>
                <AppShowcase />
            </MemoryRouter>,
        );

        const preview = screen.getByRole('img', {
            name: 'AI Assistantのプレビュー',
        });
        const shell = within(preview).getByTestId('assistant-preview-shell');
        const messages = within(preview).getByTestId('assistant-preview-messages');
        const composer = within(preview).getByTestId('assistant-preview-composer');

        expect(preview).toHaveClass('aspect-[4/3]', 'overflow-hidden');
        expect(shell).toHaveClass('grid', 'h-full', 'min-h-0', 'overflow-hidden');
        expect(messages).toHaveClass('min-h-0', 'overflow-hidden');
        expect(composer).not.toHaveClass('absolute');
        expect(messages.compareDocumentPosition(composer))
            .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
});
