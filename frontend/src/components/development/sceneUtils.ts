import { chapterReveal } from './chapterMotion';

/** Map scroll progress within a chapter to typewriter character reveal (with hold phase) */
export function getTypewriterProgress(local: number): number {
    const typeStart = 0.34;
    const typeEnd = 0.5;

    if (local < typeStart) return 0;
    if (local < typeEnd) {
        return (local - typeStart) / (typeEnd - typeStart);
    }
    return 1;
}

/** Badge stagger after typewriter completes */
export function getBadgeProgress(local: number, index: number): number {
    return chapterReveal(local, 0.5 + index * 0.05, 0.6 + index * 0.05);
}

export const TYPEWRITER_TEXT = '> AIと一緒に、Webサイトを作る';

/** Section 4 — top-to-bottom stagger inside the browser preview */
const SCENE4_REVEAL_START = 0.08;
const SCENE4_REVEAL_SPAN = 0.075;
const SCENE4_REVEAL_GAP = 0.055;

export function getScene4StepReveal(local: number, step: number, staticMode = false): number {
    if (staticMode) return 1;
    const start = SCENE4_REVEAL_START + step * SCENE4_REVEAL_GAP;
    return chapterReveal(local, start, start + SCENE4_REVEAL_SPAN);
}

export function getScene4TypewriterProgress(local: number, staticMode = false): number {
    if (staticMode) return 1;
    const start = SCENE4_REVEAL_START + 4 * SCENE4_REVEAL_GAP;
    const end = start + SCENE4_REVEAL_SPAN + 0.045;
    if (local <= start) return 0;
    if (local >= end) return 1;
    return (local - start) / (end - start);
}

export function getScene4LayerMotion(reveal: number, offsetY = 12) {
    return {
        opacity: reveal,
        transform: reveal >= 0.999 ? 'none' : `translateY(${(1 - reveal) * offsetY}px)`,
    };
}

/** Scene 4 reveal steps: 0 browser chrome, 1 header, 2 copy, 3 terminal, 5 lines, 6–8 badges, 9 CTA */
export const SCENE4_LINES_STEP = 5;
export const SCENE4_PREVIEW_BADGE_STEP = 6;
export const SCENE4_CTA_STEP = 9;

export const AI_TOOLS = [
    { name: 'OpenAI Codex', note: 'AIとペアプログラミングで実装', icon: 'openai' as const },
    { name: 'Claude Code', note: '要件から実装まで伴走', icon: 'claude' as const },
    { name: 'Google Antigravity', note: '最新のAIコーディング環境', icon: 'googleantigravity' as const },
    { name: 'MCP', note: 'AIとツールをつなぐ共通規格', icon: 'modelcontextprotocol' as const },
    { name: 'Cursor', note: 'AI統合エディタでのコーディング', icon: 'cursor' as const },
    { name: 'iTerm', note: 'ターミナルでのビルドと実行', icon: 'iterm2' as const },
    { name: 'Gemini', note: '画像やコードの理解と生成', icon: 'googlegemini' as const },
    { name: 'GitHub', note: 'コード管理と共同開発', icon: 'github' as const },
] as const;

export const AI_TOOL_BADGES = [
    { name: 'OpenAI Codex', icon: 'openai' as const },
    { name: 'Claude Code', icon: 'claude' as const },
    { name: 'Cursor', icon: 'cursor' as const },
] as const;

/** Scene 1 floating mini tool cards around the editor */
export const AI_FLOAT_CARDS = [
    {
        name: 'Claude Code',
        icon: 'claude' as const,
        prompt: '> 要件を整理して',
        accent: '#CC785C',
    },
    {
        name: 'Cursor',
        icon: 'cursor' as const,
        prompt: '> コンポーネントを追加',
        accent: '#EDECEC',
    },
    {
        name: 'OpenAI Codex',
        icon: 'openai' as const,
        prompt: '> テストを書いて',
        accent: '#10A37F',
    },
] as const;

export const STACK_LAYERS = [
    { name: 'HTML', note: 'セマンティックな骨組み', icon: 'html5' as const },
    { name: 'CSS', note: 'レイアウトと見た目', icon: 'css3' as const },
    { name: 'TypeScript', note: '型安全な土台', icon: 'typescript' as const },
    { name: 'React 19', note: 'UIコンポーネント', icon: 'react' as const },
    { name: 'Next.js', note: 'フルスタック React', icon: 'nextdotjs' as const },
    { name: 'Node.js', note: 'サーバーサイド実行', icon: 'nodedotjs' as const },
    { name: 'Tailwind CSS 4', note: 'ユーティリティファーストのUI', icon: 'tailwindcss' as const },
    { name: 'Vite', note: '高速な開発サーバーとビルド', icon: 'vite' as const },
    { name: 'Firebase', note: '認証とデータベース', icon: 'firebase' as const },
    { name: 'Python', note: 'スクリプトとデータ処理', icon: 'python' as const },
    { name: 'Zod', note: 'フォーム入力の型検証', icon: 'zod' as const },
    { name: 'Swift', note: 'iOS/macOSネイティブアプリ', icon: 'swift' as const },
] as const;

export const WORKFLOW_STEPS = [
    { title: '構想する', body: 'アイデアをAIと壁打ちして要件に落とす', accent: '#66B4FF' },
    { title: '作る', body: 'AIコーディングツールとペアで実装', accent: '#9B51E0' },
    { title: '確かめる', body: 'MCP経由のブラウザ操作でAIが動作確認', accent: '#007AFF' },
    { title: '届ける', body: 'レビューして公開、フィードバックで改善', accent: '#FF9500' },
] as const;

export const MCP_SERVERS = [
    { id: 'github', label: 'GitHub', note: 'PR・リポジトリの操作', brand: 'github' as const },
    { id: 'browser', label: 'Browser', note: 'ページの操作と検証' },
    { id: 'database', label: 'Database', note: 'データの読み書き' },
    { id: 'filesystem', label: 'Filesystem', note: 'プロジェクトファイルへのアクセス' },
] as const;
