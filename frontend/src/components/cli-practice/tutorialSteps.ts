import { pathExists, readFile, type ProjectState } from './virtualFs';

export type TutorialStepKind = 'intro' | 'command' | 'editor';

export interface TutorialStep {
    id: string;
    chapter: string;
    title: string;
    description: string;
    why: string;
    kind: TutorialStepKind;
    suggestedCommand?: string;
    sampleContent?: string;
    editorHint?: string;
    check: (ctx: TutorialCheckContext) => boolean;
}

export interface TutorialCheckContext {
    command?: string;
    stateBefore: ProjectState;
    stateAfter: ProjectState;
    editorSaved?: { file: string; content: string };
}

export const TUTORIAL_CHAPTERS = [
    'はじめに',
    'ファイルを見る',
    'フォルダとファイルを作る',
    'ファイルを編集する',
    '確認と公開',
] as const;

function norm(cmd: string): string {
    return cmd.trim().replace(/\s+/g, ' ');
}

function cmdStartsWith(ctx: TutorialCheckContext, prefix: string): boolean {
    if (!ctx.command) return false;
    const c = norm(ctx.command);
    const p = norm(prefix);
    return c === p || c.startsWith(`${p} `);
}

function cwdEndsWith(state: ProjectState, suffix: string): boolean {
    return state.cwd === suffix || state.cwd.endsWith(`/${suffix}`);
}

function fileContentIncludes(state: ProjectState, path: string, text: string): boolean {
    const content = readFile(state, path);
    return content !== null && content.includes(text);
}

function fileExists(state: ProjectState, path: string): boolean {
    return pathExists(state, path);
}

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 'welcome',
        chapter: 'はじめに',
        title: 'まずは流れを確認する',
        description: '小さな Web サイトを作りながら、ターミナルの基本を練習します。青いボタンでコマンドを入れ、中央のターミナルで Enter を押してください。',
        why: '最初に画面の見方を知っておくと、次に何を触ればいいか迷いにくくなります。',
        kind: 'intro',
        check: () => true,
    },
    {
        id: 'pwd',
        chapter: 'ファイルを見る',
        title: '今いる場所を見る（pwd）',
        description: 'まずは pwd で、今いる場所を確認します。',
        why: 'ターミナルでは「どのフォルダで作業しているか」が大事です。迷ったら最初に pwd を使います。',
        kind: 'command',
        suggestedCommand: 'pwd',
        check: (ctx) => cmdStartsWith(ctx, 'pwd'),
    },
    {
        id: 'ls',
        chapter: 'ファイルを見る',
        title: '中にあるものを見る（ls）',
        description: 'ls で、今いるフォルダのファイルやフォルダを一覧で見ます。',
        why: '作業前に何が置かれているか確認すると、次に開くファイルや移動先を決めやすくなります。',
        kind: 'command',
        suggestedCommand: 'ls',
        check: (ctx) => cmdStartsWith(ctx, 'ls'),
    },
    {
        id: 'tree',
        chapter: 'ファイルを見る',
        title: 'フォルダ全体を見る（tree）',
        description: 'tree で、フォルダの入れ子をまとめて表示します。右のファイル構造も一緒に見てみましょう。',
        why: '一覧だけでは分かりにくい「どこに何があるか」を、全体図としてつかめます。',
        kind: 'command',
        suggestedCommand: 'tree',
        check: (ctx) => cmdStartsWith(ctx, 'tree'),
    },
    {
        id: 'mkdir-pages',
        chapter: 'フォルダとファイルを作る',
        title: 'ページ用フォルダを作る',
        description: 'mkdir pages で、HTML ファイルを入れる pages フォルダを作ります。',
        why: 'ファイルは役割ごとにフォルダへ分けると、あとから探しやすくなります。',
        kind: 'command',
        suggestedCommand: 'mkdir pages',
        check: (ctx) =>
            cmdStartsWith(ctx, 'mkdir pages')
            && fileExists(ctx.stateAfter, 'pages'),
    },
    {
        id: 'cd-pages',
        chapter: 'フォルダとファイルを作る',
        title: 'pages フォルダに入る',
        description: 'cd pages で、さきほど作ったフォルダへ移動します。',
        why: 'ターミナルでは、ファイルを作りたい場所に移動してから作業します。',
        kind: 'command',
        suggestedCommand: 'cd pages',
        check: (ctx) => cmdStartsWith(ctx, 'cd') && cwdEndsWith(ctx.stateAfter, 'pages'),
    },
    {
        id: 'touch-about',
        chapter: 'フォルダとファイルを作る',
        title: 'HTML ファイルを作る',
        description: 'touch about.html で、空の HTML ファイルを作ります。',
        why: 'touch は「この名前のファイルを用意する」コマンドです。中身は次のステップで書きます。',
        kind: 'command',
        suggestedCommand: 'touch about.html',
        check: (ctx) =>
            (cmdStartsWith(ctx, 'touch about.html') || cmdStartsWith(ctx, 'touch ./about.html'))
            && (fileExists(ctx.stateAfter, 'about.html') || fileExists(ctx.stateAfter, 'pages/about.html')),
    },
    {
        id: 'code-open',
        chapter: 'ファイルを編集する',
        title: 'ファイルを開いて編集する',
        description: 'code about.html で、HTML ファイルを編集画面で開きます。',
        why: '実際の開発でも、ターミナルからエディタを開く流れをよく使います。',
        kind: 'command',
        suggestedCommand: 'code about.html',
        check: (ctx) =>
            cmdStartsWith(ctx, 'code about.html')
            || cmdStartsWith(ctx, 'code pages/about.html')
            || cmdStartsWith(ctx, 'code ./about.html'),
    },
    {
        id: 'code-write',
        chapter: 'ファイルを編集する',
        title: 'HTML を書いて保存する',
        description: '例の HTML を入力し、保存してからエディタを閉じます。',
        why: 'HTML は Web ページの中身を書くためのテキストです。<h1> は見出し、<p> は本文を表します。',
        kind: 'editor',
        sampleContent: `<h1>About Me</h1>
<p>はじめまして。コマンドラインの練習サイトです。</p>`,
        editorHint: 'about.html に <h1> と <p> を含む HTML を書いて保存',
        check: (ctx) => {
            if (!ctx.editorSaved) return false;
            const { file, content } = ctx.editorSaved;
            const isAboutFile = file === 'about.html' || file.endsWith('/about.html') || file === 'pages/about.html';
            return isAboutFile && content.includes('<h1>') && content.includes('<p>');
        },
    },
    {
        id: 'cat-about',
        chapter: 'ファイルを編集する',
        title: '保存した内容を見る',
        description: 'cat about.html で、保存した HTML をターミナルに表示します。',
        why: 'エディタを閉じたあとでも、ファイルの中身をすぐ確認できます。',
        kind: 'command',
        suggestedCommand: 'cat about.html',
        check: (ctx) =>
            cmdStartsWith(ctx, 'cat about.html')
            && (
                fileContentIncludes(ctx.stateAfter, 'about.html', '<h1>')
                || fileContentIncludes(ctx.stateAfter, 'pages/about.html', '<h1>')
            ),
    },
    {
        id: 'cd-root',
        chapter: '確認と公開',
        title: 'プロジェクトの一番上に戻る',
        description: 'cd .. で、pages の一つ上に戻ります。',
        why: 'Git や npm のコマンドは、プロジェクトの一番上で実行することが多いです。',
        kind: 'command',
        suggestedCommand: 'cd ..',
        check: (ctx) => cmdStartsWith(ctx, 'cd ..') && cwdEndsWith(ctx.stateAfter, 'my-website'),
    },
    {
        id: 'git-init',
        chapter: '確認と公開',
        title: 'Git の記録を始める',
        description: 'git init で、このプロジェクトを Git で記録できる状態にします。',
        why: 'Git を使うと、どんな変更をしたかをあとから確認できます。',
        kind: 'command',
        suggestedCommand: 'git init',
        check: (ctx) => cmdStartsWith(ctx, 'git init') && ctx.stateAfter.git.initialized,
    },
    {
        id: 'git-status',
        chapter: '確認と公開',
        title: '変更の状態を見る',
        description: 'git status で、まだ記録していない変更を確認します。',
        why: 'コミット前に状態を見ると、何を記録しようとしているかを落ち着いて確認できます。',
        kind: 'command',
        suggestedCommand: 'git status',
        check: (ctx) => cmdStartsWith(ctx, 'git status') && ctx.stateAfter.git.initialized,
    },
    {
        id: 'git-add',
        chapter: '確認と公開',
        title: '記録する変更を選ぶ',
        description: 'git add . で、今回作ったファイルを次のコミットに含めます。',
        why: 'git add は「この変更を記録します」と選ぶための準備です。',
        kind: 'command',
        suggestedCommand: 'git add .',
        check: (ctx) =>
            (cmdStartsWith(ctx, 'git add .') || cmdStartsWith(ctx, 'git add pages'))
            && ctx.stateAfter.git.staged.length > 0,
    },
    {
        id: 'git-commit',
        chapter: '確認と公開',
        title: '変更を履歴に残す',
        description: 'git commit -m "Add about page" で、変更をメッセージ付きで記録します。',
        why: 'コミットしておくと、「何をしたか」をひとまとまりで振り返れます。',
        kind: 'command',
        suggestedCommand: 'git commit -m "Add about page"',
        check: (ctx) => cmdStartsWith(ctx, 'git commit') && ctx.stateAfter.git.commits.length > 0,
    },
    {
        id: 'git-log',
        chapter: '確認と公開',
        title: '履歴を確認する',
        description: 'git log で、今作ったコミットが履歴に残ったか確認します。',
        why: '記録した変更は、あとから git log で順番に振り返れます。',
        kind: 'command',
        suggestedCommand: 'git log',
        check: (ctx) => cmdStartsWith(ctx, 'git log') && ctx.stateAfter.git.commits.length > 0,
    },
    {
        id: 'node-version',
        chapter: '確認と公開',
        title: 'Node.js が使えるか確認する',
        description: 'node -v で、Node.js のバージョンが表示されるか確認します。',
        why: 'この練習環境では Node.js が用意済みです。npm を使う前に、コマンドが動くことだけ確認します。',
        kind: 'command',
        suggestedCommand: 'node -v',
        check: (ctx) =>
            (cmdStartsWith(ctx, 'node -v') || cmdStartsWith(ctx, 'node --version'))
            && ctx.stateAfter.nodeInstalled,
    },
    {
        id: 'npm-install',
        chapter: '確認と公開',
        title: '必要なライブラリを入れる',
        description: 'npm install で、package.json に書かれたライブラリを入れます。完了すると node_modules ができます。',
        why: 'React などのライブラリが入っていないと、開発サーバーやビルドを動かせません。',
        kind: 'command',
        suggestedCommand: 'npm install',
        check: (ctx) =>
            (cmdStartsWith(ctx, 'npm install') || cmdStartsWith(ctx, 'npm i'))
            && ctx.stateAfter.dependenciesInstalled
            && pathExists(ctx.stateAfter, 'node_modules'),
    },
    {
        id: 'npm-dev',
        chapter: '確認と公開',
        title: '開発サーバーを起動する',
        description: 'npm run dev で、手元でサイトを確認するためのサーバーを起動します。',
        why: '公開前に、まず自分の環境で表示を確認するのが基本です。',
        kind: 'command',
        suggestedCommand: 'npm run dev',
        check: (ctx) =>
            cmdStartsWith(ctx, 'npm run dev')
            && ctx.stateAfter.devServerRan,
    },
    {
        id: 'npm-build',
        chapter: '確認と公開',
        title: '公開用ファイルを作る',
        description: 'npm run build で、サイトを公開用のファイルにまとめます。',
        why: 'デプロイ前に、ブラウザで配信しやすい形へ変換します。',
        kind: 'command',
        suggestedCommand: 'npm run build',
        check: (ctx) => cmdStartsWith(ctx, 'npm run build') && ctx.stateAfter.built,
    },
    {
        id: 'npm-deploy',
        chapter: '確認と公開',
        title: 'サイトを公開する',
        description: 'npm run deploy で公開をシミュレーションします。下のプレビューに作ったページが表示されます。',
        why: 'ビルドした成果物を公開場所へ送るのが、デプロイの基本的な流れです。',
        kind: 'command',
        suggestedCommand: 'npm run deploy',
        check: (ctx) => cmdStartsWith(ctx, 'npm run deploy') && ctx.stateAfter.deployed,
    },
];

export function getStepIndex(id: string): number {
    return TUTORIAL_STEPS.findIndex((s) => s.id === id);
}

export function normalizeCommand(cmd: string): string {
    return norm(cmd);
}
