import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandSearch } from './CommandSearch';

describe('CommandSearch', () => {
    it('starts with basic commands so beginners are not shown advanced Git commands first', () => {
        render(<CommandSearch onInsertCommand={vi.fn()} />);

        expect(screen.getAllByText('pwd').length).toBeGreaterThan(0);
        expect(screen.getAllByText('ls').length).toBeGreaterThan(0);
        expect(screen.queryByText('git push')).not.toBeInTheDocument();
    });

    it('can still show every command when the all category is selected', () => {
        render(<CommandSearch onInsertCommand={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'すべて' }));

        expect(screen.getAllByText('git push').length).toBeGreaterThan(0);
    });
});
