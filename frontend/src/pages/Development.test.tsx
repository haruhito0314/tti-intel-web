import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ECOSYSTEM_INITIAL_COVERAGE,
    demoCursorTarget,
    ecosystemSurfaceHasFrame,
    ecosystemWindowScale,
    shouldShowCodexStory,
} from '../components/development/developmentMotion';
import { Development } from './Development';

beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

describe('Development page', () => {
    it('uses the typed headline instead of the former AI mark intro', () => {
        const { container } = render(
            <MemoryRouter>
                <Development />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: 'AIと作る開発へ', level: 1 })).toBeInTheDocument();
        expect(container.querySelector('.ai-mark')).not.toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Codexへの入力デモ' })).toBeInTheDocument();
        expect(screen.getByTitle('TTI Intelligence Home preview')).toHaveAttribute('src', '/');
        expect(screen.getByLabelText('プロンプトを使った開発の説明')).toHaveTextContent('つくりたいものを、言葉で伝える。');
        expect(screen.getByText('コードを書く代わりに、目的と完成像をプロンプトで共有します。')).toBeInTheDocument();
        const camera = container.querySelector('.dx-demo-camera');
        expect((camera as HTMLElement).style.getPropertyValue('--dx-camera-scale')).toBe('');
    });

    it('keeps the lower page focused on working systems and the participation path', () => {
        render(
            <MemoryRouter>
                <Development />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: 'アイデアを、使えるかたちに。' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'AI Assistant' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'カラーソートパズル' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '卓球組み合わせ表' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /活動について見る/ })).toHaveAttribute('href', '/about');
        expect(screen.queryByRole('heading', { name: '速さを、品質につなげる5つの工程。' })).not.toBeInTheDocument();
        expect(screen.queryByText('OUR APPROACH')).not.toBeInTheDocument();
    });

    it('presents the AI tool launcher without repeating the same Assistant case study', () => {
        render(
            <MemoryRouter>
                <Development />
            </MemoryRouter>,
        );

        expect(screen.getByLabelText('AI開発ツール')).toBeInTheDocument();
        expect(screen.getByLabelText('Claude Code')).toBeInTheDocument();
        expect(screen.getByLabelText('Cursor')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'デモを最初から再生' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'AIを使った開発の、ひとつの実例。' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'AI Assistant' })).toBeInTheDocument();
        expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
        expect(screen.queryByText('AWS Lambda')).not.toBeInTheDocument();
        expect(screen.queryByText('Web Worker')).not.toBeInTheDocument();
        expect(screen.queryByText('このサイトで稼働中')).not.toBeInTheDocument();
    });

    it('keeps one Codex window through the launcher transition', () => {
        const { container } = render(
            <MemoryRouter>
                <Development />
            </MemoryRouter>,
        );

        expect(container.querySelectorAll('[data-dx-codex-window="primary"]')).toHaveLength(1);
        expect(container.querySelector('.dx-product-window')).toBe(
            container.querySelector('.dx-launcher-codex-screen'),
        );
    });

    it('keeps the cursor attached while the Codex window becomes the work surface', () => {
        expect(demoCursorTarget(3_900)).toBe('codex-window');
        expect(demoCursorTarget(4_100)).toBe('codex-window');
        expect(demoCursorTarget(4_700)).toBe('codex-window');
        expect(demoCursorTarget(4_900)).toBe('input');
    });

    it('continues from the Codex preview into deployment, plugin, and MCP scenes', () => {
        const { container } = render(
            <MemoryRouter>
                <Development />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: '公開、クラウド、プラグイン、MCPまでつながるAI開発' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'AIの指示から、公開とクラウドへ。' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'バックエンドも、同じ対話から。' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'よい手順を、何度でも使える形に。' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '必要な情報と道具を、開発につなぐ。' })).toBeInTheDocument();
        expect(screen.getByLabelText('vercel deploy --prod')).toBeInTheDocument();
        expect(screen.getByLabelText('sam deploy --guided')).toBeInTheDocument();
        expect(screen.getByText('Codex CLI')).toBeInTheDocument();
        expect(screen.getByLabelText('Vercelへ公開して')).toBeInTheDocument();
        expect(screen.getByLabelText('AWSへバックエンドをデプロイして')).toBeInTheDocument();
        expect(screen.queryByLabelText('VercelとAWSに連携して、このサイトを公開できる状態にして')).not.toBeInTheDocument();
        expect(container.querySelectorAll('.dx-agent-command')).toHaveLength(2);
        expect(container.querySelector('.dx-agent-command .dx-terminal-type-caret')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Claude Code')).toBeInTheDocument();
        expect(screen.getByLabelText('Cursor')).toBeInTheDocument();
        expect(screen.getByLabelText('Terminal')).toBeInTheDocument();
        expect(screen.getByLabelText('起動中のCodex')).toBeInTheDocument();
        expect(screen.getByLabelText('起動中のTerminal')).toBeInTheDocument();
        expect(screen.getByLabelText('アプリランチャー')).toBeInTheDocument();
        expect(screen.getByLabelText('起動中のCodex')).toHaveAttribute('data-dx-cursor-target', 'codex-window');
        expect(screen.getByLabelText('Codex')).not.toHaveAttribute('data-dx-cursor-target');
        expect(screen.getByLabelText('Codex CLI Plugin session')).toHaveTextContent('/plugins');
        expect(screen.getByLabelText('Codex CLI MCP session')).toHaveTextContent('codex mcp list');
        expect(container.querySelector('.dx-ecosystem-layer')).toHaveStyle({
            '--dx-ecosystem-layer-opacity': '0.0000',
        });
        expect(container.querySelector('.dx-vercel-desktop')).not.toHaveClass('is-light-glass');
        expect(
            container.querySelectorAll('.dx-vercel-desktop > .dx-window-stage-tile.dx-window-glass'),
        ).toHaveLength(3);
        expect(container.querySelectorAll('.dx-window-glass')).toHaveLength(8);
        expect(shouldShowCodexStory(true, 0.7)).toBe(true);
        expect(shouldShowCodexStory(true, 0.84)).toBe(false);
    });

    it('shows Plugin installation and enablement instead of executing a fictional Plugin app', () => {
        const { container } = render(
            <MemoryRouter>
                <Development />
            </MemoryRouter>,
        );

        expect(screen.getByLabelText('Codex CLI Plugin session')).toHaveTextContent('/plugins');
        expect(screen.getByLabelText('Codex CLI Plugin session')).toHaveTextContent('Installed');
        expect(screen.getByLabelText('Codex CLI Plugin session')).toHaveTextContent('Enabled');
        expect(screen.getByRole('button', { name: 'Pluginへの指示を送信' })).toBeInTheDocument();
        expect(container.querySelector('.dx-scene-trigger--run')).not.toBeInTheDocument();
        expect(container.querySelector('.dx-plugin-steps')).not.toBeInTheDocument();
        expect(container.querySelector('.dx-plugin-terminal')).not.toBeInTheDocument();
        expect(container.querySelector('.dx-plugin-cli-browser')).not.toBeInTheDocument();
        expect(container.querySelector('.dx-plugin-cli-session')).not.toBeInTheDocument();
    });

    it('shows MCP configuration and tool results in Codex CLI without a fictional connection dashboard', () => {
        const { container } = render(
            <MemoryRouter>
                <Development />
            </MemoryRouter>,
        );

        expect(screen.getByLabelText('Codex CLI MCP session')).toHaveTextContent('codex mcp list');
        expect(screen.getByLabelText('Codex CLI MCP session')).toHaveTextContent('figma');
        expect(screen.getByLabelText('Codex CLI MCP session')).toHaveTextContent('github');
        expect(screen.getByRole('button', { name: 'MCPへの指示を送信' })).toBeInTheDocument();
        expect(container.querySelector('.dx-mcp-route')).not.toBeInTheDocument();
        expect(container.querySelector('.dx-scene-trigger--connect')).not.toBeInTheDocument();
        expect(screen.queryByText('Browser', { exact: true })).not.toBeInTheDocument();
    });

    it('starts the deployment automation as a normal terminal before Codex CLI', () => {
        render(
            <MemoryRouter>
                <Development />
            </MemoryRouter>,
        );

        expect(screen.getByLabelText('codex')).toBeInTheDocument();
        expect(screen.getAllByText('Terminal — web').length).toBeGreaterThan(0);
    });

    it('expands each ecosystem window exactly to the glass bounds', () => {
        expect(ECOSYSTEM_INITIAL_COVERAGE).toBeCloseTo(5 / 6);
        expect(ecosystemWindowScale(0)).toBe(1);
        expect(ecosystemWindowScale(1)).toBeCloseTo(6 / 5);
        expect(
            ECOSYSTEM_INITIAL_COVERAGE * ecosystemWindowScale(1),
        ).toBeCloseTo(1);
    });

    it('keeps the shared glass frame behind every ecosystem workspace', () => {
        expect(ecosystemSurfaceHasFrame(0)).toBe(true);
        expect(ecosystemSurfaceHasFrame(1)).toBe(true);
        expect(ecosystemSurfaceHasFrame(2)).toBe(true);
    });
});
