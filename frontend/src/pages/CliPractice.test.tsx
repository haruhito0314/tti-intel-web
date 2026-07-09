import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CliPracticePage } from './CliPractice';

beforeAll(() => {
    Element.prototype.scrollTo = vi.fn();
});

function renderPage() {
    render(
        <MemoryRouter>
            <CliPracticePage />
        </MemoryRouter>,
    );
}

describe('CliPracticePage', () => {
    it('keeps the beginner page focused on the workspace without overview cards', () => {
        renderPage();

        expect(screen.getByRole('heading', { name: 'コマンドライン練習' })).toBeInTheDocument();
        expect(screen.getByText('左の手順を読み、中央のターミナルで試す')).toBeInTheDocument();
        expect(screen.queryByText('学習の流れ')).not.toBeInTheDocument();
        expect(screen.queryByText('短いステップ')).not.toBeInTheDocument();
        expect(screen.queryByText('PCを汚さない')).not.toBeInTheDocument();
        expect(screen.queryByText('現在地を読む')).not.toBeInTheDocument();
    });
});
