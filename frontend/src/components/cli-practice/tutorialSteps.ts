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
        title: 'チュートリアルへようこそ',
        description: 'このチュートリアルでは、ターミナルの基本操作から、ファイルの作成・編集、Git、npm install、デプロイまでを順番に体験します。下の「はじめる」を押してください。',
        why: '実際の開発では、まず「今どこにいるか」を確認してから作業を始めます。',
        kind: 'intro',
        check: () => true,
    },
    {
        id: 'pwd',
        chapter: 'ファイルを見る',
        title: '現在地を確認する（pwd）',
        description: 'pwd は Print Working Directory の略で、今いるフォルダのパスを表示します。',
        why: 'ターミナルで迷子になったとき、まず pwd を使うと安心です。',
        kind: 'command',
        suggestedCommand: 'pwd',
        check: (ctx) => cmdStartsWith(ctx, 'pwd'),
    },
    {
        id: 'ls',
        chapter: 'ファイルを見る',
        title: 'ファイル一覧を見る（ls）',
        description: 'ls で、現在のフォルダにあるファイルとフォルダの名前が一覧表示されます。',
        why: 'プロジェクトに何があるか把握する、いちばんよく使うコマンドです。',
        kind: 'command',
        suggestedCommand: 'ls',
        check: (ctx) => cmdStartsWith(ctx, 'ls'),
    },
    {
        id: 'tree',
        chapter: 'ファイルを見る',
        title: 'フォルダ構造を把握する（tree）',
        description: 'tree はフォルダの入れ子構造を木のような形で表示します。右のパネルとも連動します。',
        why: 'src/ の中に何があるかなど、全体像をつかむのに便利です。',
        kind: 'command',
        suggestedCommand: 'tree',
        check: (ctx) => cmdStartsWith(ctx, 'tree'),
    },
    {
        id: 'mkdir-pages',
        chapter: 'フォルダとファイルを作る',
        title: 'フォルダを作る（mkdir）',
        description: 'pages という名前のフォルダを作成します。Web サイトの「ページ」を入れる場所のイメージです。',
        why: 'ファイルはフォルダに整理して置くのが基本。about ページ用の場所を用意します。',
        kind: 'command',
        suggestedCommand: 'mkdir pages',
        check: (ctx) =>
            cmdStartsWith(ctx, 'mkdir pages')
            && fileExists(ctx.stateAfter, 'pages'),
    },
    {
        id: 'cd-pages',
        chapter: 'フォルダとファイルを作る',
        title: 'フォルダに移動する（cd）',
        description: 'cd pages で、今作った pages フォルダの中に移動します。',
        why: '作業したい場所に移動してから、ファイルを作成するのが一般的な流れです。',
        kind: 'command',
        suggestedCommand: 'cd pages',
        check: (ctx) => cmdStartsWith(ctx, 'cd') && cwdEndsWith(ctx.stateAfter, 'pages'),
    },
    {
        id: 'pwd-pages',
        chapter: 'フォルダとファイルを作る',
        title: '移動できたか確認する',
        description: 'もう一度 pwd を実行して、パスの末尾が pages になっているか確認しましょう。',
        why: 'cd のあとに pwd で確認する習慣をつけると、うっかりミスが減ります。',
        kind: 'command',
        suggestedCommand: 'pwd',
        check: (ctx) => cmdStartsWith(ctx, 'pwd') && cwdEndsWith(ctx.stateAfter, 'pages'),
    },
    {
        id: 'touch-about',
        chapter: 'フォルダとファイルを作る',
        title: '空のファイルを作る（touch）',
        description: 'about.html というファイルを作成します。あとから中身を書き込みます。',
        why: 'touch は「この名前のファイルを用意する」コマンド。エディタで開く前の準備に使えます。',
        kind: 'command',
        suggestedCommand: 'touch about.html',
        check: (ctx) =>
            (cmdStartsWith(ctx, 'touch about.html') || cmdStartsWith(ctx, 'touch ./about.html'))
            && (fileExists(ctx.stateAfter, 'about.html') || fileExists(ctx.stateAfter, 'pages/about.html')),
    },
    {
        id: 'nano-open',
        chapter: 'ファイルを編集する',
        title: 'エディタでファイルを開く（nano）',
        description: 'nano about.html でエディタを開きます。ターミナル内でファイルの中身を編集できます。',
        why: 'GUI のメモ帳のように、ターミナル上でテキストを書き換えられます。',
        kind: 'command',
        suggestedCommand: 'nano about.html',
        check: (ctx) =>
            cmdStartsWith(ctx, 'nano about.html')
            || cmdStartsWith(ctx, 'nano pages/about.html')
            || cmdStartsWith(ctx, 'nano ./about.html'),
    },
    {
        id: 'nano-write',
        chapter: 'ファイルを編集する',
        title: 'HTML を書き込んで保存する',
        description: 'エディタに About ページの HTML を書き、^O（Ctrl+O）で保存、^X（Ctrl+X）で終了してください。',
        why: 'Web ページは HTML という形式のテキストファイルです。<h1> は大きな見出しを意味します。',
        kind: 'editor',
        sampleContent: `<h1>About Me</h1>
<p>はじめまして。コマンドライン の練習サイトです。</p>`,
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
        title: '書いた内容を確認する（cat）',
        description: 'cat about.html で、保存したファイルの中身をターミナルに表示します。',
        why: '保存できたか、正しい内容かをすぐ確認できます。',
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
        title: 'プロジェクトのルートに戻る',
        description: 'cd .. で一つ上のフォルダ（my-website）に戻ります。.. は「ひとつ上の階層」を意味します。',
        why: 'Git や npm は通常、プロジェクトの一番上のフォルダで実行します。',
        kind: 'command',
        suggestedCommand: 'cd ..',
        check: (ctx) => cmdStartsWith(ctx, 'cd ..') && cwdEndsWith(ctx.stateAfter, 'my-website'),
    },
    {
        id: 'git-init',
        chapter: '確認と公開',
        title: 'Git リポジトリを始める（git init）',
        description: 'git init で、このフォルダを Git で管理する準備をします。',
        why: '変更履歴を記録できるようになり、あとからいつでも戻れます。',
        kind: 'command',
        suggestedCommand: 'git init',
        check: (ctx) => cmdStartsWith(ctx, 'git init') && ctx.stateAfter.git.initialized,
    },
    {
        id: 'git-add',
        chapter: '確認と公開',
        title: '変更をステージする（git add）',
        description: 'git add . で、新しく作った pages フォルダと about.html をコミット対象に追加します。',
        why: '「次のコミットに含めるファイル」を選ぶ操作が git add です。',
        kind: 'command',
        suggestedCommand: 'git add .',
        check: (ctx) =>
            (cmdStartsWith(ctx, 'git add .') || cmdStartsWith(ctx, 'git add pages'))
            && ctx.stateAfter.git.staged.length > 0,
    },
    {
        id: 'git-commit',
        chapter: '確認と公開',
        title: '変更を記録する（git commit）',
        description: 'git commit -m "Add about page" で変更を記録します。-m の後ろがコミットメッセージです。',
        why: '「いつ・何をしたか」をメッセージ付きで残すのがコミットです。',
        kind: 'command',
        suggestedCommand: 'git commit -m "Add about page"',
        check: (ctx) => cmdStartsWith(ctx, 'git commit') && ctx.stateAfter.git.commits.length > 0,
    },
    {
        id: 'node-install',
        chapter: '確認と公開',
        title: 'Node.js をインストールする（brew install node）',
        description: 'npm を使うには Node.js が必要です。Mac では brew install node でインストールするのが一般的です。（Windows や Linux では nodejs.org から入れることもあります）',
        why: 'Node.js は JavaScript を PC 上で動かすための土台です。npm も一緒に入ります。',
        kind: 'command',
        suggestedCommand: 'brew install node',
        check: (ctx) =>
            cmdStartsWith(ctx, 'brew install node')
            && ctx.stateAfter.nodeInstalled,
    },
    {
        id: 'node-version',
        chapter: '確認と公開',
        title: 'Node.js を確認する（node -v）',
        description: 'npm は Node.js に付属するツールです。node -v でバージョンを確認しましょう。プロジェクトのライブラリはまだ入っていないので、次のステップで npm install を実行します。',
        why: 'npm を使う前に、Node.js が使える環境か確認するのが一般的です。',
        kind: 'command',
        suggestedCommand: 'node -v',
        check: (ctx) =>
            (cmdStartsWith(ctx, 'node -v') || cmdStartsWith(ctx, 'node --version'))
            && ctx.stateAfter.nodeInstalled,
    },
    {
        id: 'npm-install',
        chapter: '確認と公開',
        title: 'ライブラリをインストールする（npm install）',
        description: 'package.json に書かれた依存パッケージを node_modules にインストールします。clone 直後はフォルダがなく、ls node_modules も失敗します。npm install のあとにファイルツリーへ現れます。',
        why: 'Web サイトのビルドには React などのライブラリが必要。npm install でまとめて取得します。',
        kind: 'command',
        suggestedCommand: 'npm install',
        check: (ctx) =>
            (cmdStartsWith(ctx, 'npm install') || cmdStartsWith(ctx, 'npm i'))
            && ctx.stateAfter.dependenciesInstalled
            && pathExists(ctx.stateAfter, 'node_modules'),
    },
    {
        id: 'npm-build',
        chapter: '確認と公開',
        title: '本番用にビルドする（npm run build）',
        description: 'npm run build でサイトを公開用に変換し、dist/ フォルダができます。npm install のあとに実行します。',
        why: '開発用のコードを、ブラウザで動く形にまとめる工程です。',
        kind: 'command',
        suggestedCommand: 'npm run build',
        check: (ctx) => cmdStartsWith(ctx, 'npm run build') && ctx.stateAfter.built,
    },
    {
        id: 'npm-deploy',
        chapter: '確認と公開',
        title: 'サイトをデプロイする（npm run deploy）',
        description: 'npm run deploy でサイトを公開します。下のプレビューに、about.html に書いた見出しと本文が表示されます。',
        why: 'ビルドした成果物をインターネット上に公開する最後のステップです。',
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
