import { render, screen } from '@testing-library/react';
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
    });
});
