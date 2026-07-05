export const TYPEWRITER_TEXT = '> AIと一緒に、Webサイトを作る';

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
