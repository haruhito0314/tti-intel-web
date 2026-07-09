import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TutorialPanel } from './TutorialPanel';

describe('TutorialPanel', () => {
    it('shows the next action for the current command step', () => {
        render(
            <TutorialPanel
                layout="sidebar"
                stepIndex={1}
                completed={false}
                lastFeedback={null}
                onInsertCommand={vi.fn()}
            />,
        );

        expect(screen.getByText('次にやること')).toBeInTheDocument();
        expect(screen.getByText('まずは pwd で、今いる場所を確認します。')).toBeInTheDocument();
        expect(screen.getByText('pwd を実行して、表示されたパスを見てみましょう。')).toBeInTheDocument();
    });
});
