export type CommandCategory =
    | 'basic'
    | 'file'
    | 'git'
    | 'npm'
    | 'network'
    | 'system';

export interface CommandEntry {
    command: string;
    category: CommandCategory;
    summary: string;
    description: string;
    usage: string;
    example?: string;
    keywords: string[];
    aliases?: string[];
}

export const COMMAND_CATEGORIES: Record<CommandCategory, string> = {
    basic: '基本操作',
    file: 'ファイル操作',
    git: 'Git',
    npm: 'npm / Node',
    network: 'ネットワーク',
    system: 'システム',
};

export const COMMAND_CATALOG: CommandEntry[] = [
    // 基本操作
    {
        command: 'help',
        category: 'basic',
        summary: 'コマンド一覧を表示',
        description: '使えるコマンドの一覧をターミナルに表示します。困ったときはまずこれを試しましょう。',
        usage: 'help',
        keywords: ['ヘルプ', '一覧', '使い方'],
    },
    {
        command: 'search',
        category: 'basic',
        summary: 'コマンドをキーワード検索',
        description: 'キーワードでコマンドを検索し、意味や使い方をターミナルに表示します。「search git」「search デプロイ」のように使えます。',
        usage: 'search <キーワード>',
        example: 'search コミット',
        keywords: ['検索', '探す', '意味', '説明'],
    },
    {
        command: 'man',
        category: 'basic',
        summary: 'コマンドの詳しい説明',
        description: 'man（マニュアル）で、指定したコマンドの詳しい説明・使い方・例を表示します。',
        usage: 'man <コマンド>',
        example: 'man git commit',
        keywords: ['マニュアル', '説明', 'ドキュメント'],
    },
    {
        command: 'clear',
        category: 'basic',
        summary: 'ターミナル画面とファイル構造をリセット',
        description: 'ターミナルの出力を消去し、ファイル・Git・ビルド・デプロイ状態も初期状態に戻します。',
        usage: 'clear',
        keywords: ['クリア', '消す', '画面', 'リセット', '初期化'],
    },
    {
        command: 'reset',
        category: 'basic',
        summary: '環境を初期状態に戻す',
        description: 'ファイル・Git・ビルド・デプロイ状態をすべて初期状態にリセットします。',
        usage: 'reset',
        keywords: ['リセット', '初期化', 'やり直し'],
    },
    {
        command: 'history',
        category: 'basic',
        summary: 'コマンド履歴を表示',
        description: 'これまでに実行したコマンドの履歴を番号付きで表示します。',
        usage: 'history',
        keywords: ['履歴', '過去', '以前'],
    },
    {
        command: 'pwd',
        category: 'basic',
        summary: '現在地（カレントディレクトリ）を表示',
        description: '今いるフォルダのフルパスを表示します。迷子になったときに使います。',
        usage: 'pwd',
        keywords: ['現在地', 'パス', 'ディレクトリ', '場所'],
    },
    {
        command: 'cd',
        category: 'basic',
        summary: 'ディレクトリを移動',
        description: '別のフォルダに移動します。cd .. で一つ上、cd ~ でホームに戻れます。',
        usage: 'cd <パス>',
        example: 'cd src',
        keywords: ['移動', 'フォルダ', 'ディレクトリ', 'change directory'],
    },
    {
        command: 'ls',
        category: 'basic',
        summary: 'ファイル・フォルダ一覧を表示',
        description: '現在のフォルダにあるファイルとフォルダの名前を一覧表示します。',
        usage: 'ls [パス]',
        example: 'ls -la',
        keywords: ['一覧', 'リスト', 'ファイル', 'list'],
    },
    {
        command: 'tree',
        category: 'basic',
        summary: 'フォルダ構造をツリー表示',
        description: 'プロジェクトのフォルダ構造を木のような形で視覚的に表示します。',
        usage: 'tree',
        keywords: ['構造', 'ツリー', '階層', 'フォルダ'],
    },
    {
        command: 'echo',
        category: 'basic',
        summary: 'テキストをそのまま表示',
        description: '引数として渡した文字列をそのままターミナルに出力します。',
        usage: 'echo <テキスト>',
        example: 'echo Hello World',
        keywords: ['表示', '出力', 'print'],
    },

    // ファイル操作
    {
        command: 'cat',
        category: 'file',
        summary: 'ファイルの中身を表示',
        description: 'テキストファイルの内容をターミナルに表示します。設定ファイルの確認によく使います。',
        usage: 'cat <ファイル>',
        example: 'cat package.json',
        keywords: ['読む', '内容', '表示', 'ファイル'],
    },
    {
        command: 'head',
        category: 'file',
        summary: 'ファイルの先頭を表示',
        description: 'ファイルの最初の数行だけを表示します。長いファイルの概要確認に便利です。',
        usage: 'head <ファイル>',
        example: 'head README',
        keywords: ['先頭', '最初', '冒頭', '行'],
    },
    {
        command: 'tail',
        category: 'file',
        summary: 'ファイルの末尾を表示',
        description: 'ファイルの最後の数行を表示します。ログの最新部分を見るときに使います。',
        usage: 'tail <ファイル>',
        example: 'tail package.json',
        keywords: ['末尾', '最後', 'ログ', '行'],
    },
    {
        command: 'wc',
        category: 'file',
        summary: '行数・単語数・文字数をカウント',
        description: 'ファイルの行数、単語数、バイト数を数えます。',
        usage: 'wc <ファイル>',
        example: 'wc README',
        keywords: ['カウント', '行数', '文字数', '単語'],
    },
    {
        command: 'grep',
        category: 'file',
        summary: 'ファイル内を文字列検索',
        description: 'ファイルの中から指定した文字列を含む行だけを抽出して表示します。',
        usage: 'grep <パターン> <ファイル>',
        example: 'grep react src/App.tsx',
        keywords: ['検索', '探す', 'フィルタ', '文字列'],
    },
    {
        command: 'find',
        category: 'file',
        summary: 'ファイル名を検索',
        description: '指定したパターンに一致するファイル名をプロジェクト内から探します。',
        usage: 'find . -name "<パターン>"',
        example: 'find . -name "*.tsx"',
        keywords: ['検索', 'ファイル名', 'パターン', 'glob'],
    },
    {
        command: 'mkdir',
        category: 'file',
        summary: 'フォルダを作成',
        description: '新しいディレクトリ（フォルダ）を作成します。',
        usage: 'mkdir <名前>',
        example: 'mkdir components',
        keywords: ['作成', 'フォルダ', 'ディレクトリ', '新規'],
    },
    {
        command: 'touch',
        category: 'file',
        summary: '空のファイルを作成',
        description: '新しい空のファイルを作成します。',
        usage: 'touch <ファイル>',
        example: 'touch notes.txt',
        keywords: ['作成', 'ファイル', '新規'],
    },
    {
        command: 'cp',
        category: 'file',
        summary: 'ファイルをコピー',
        description: 'ファイルやフォルダを別の場所にコピーします（copy の略）。',
        usage: 'cp <元> <先>',
        example: 'cp README README.bak',
        keywords: ['コピー', '複製', 'copy'],
    },
    {
        command: 'mv',
        category: 'file',
        summary: 'ファイルを移動・リネーム',
        description: 'ファイルやフォルダを別の場所に移動するか、名前を変更します（move の略）。',
        usage: 'mv <元> <先>',
        example: 'mv old.txt new.txt',
        keywords: ['移動', 'リネーム', '名前変更', 'move'],
    },
    {
        command: 'rm',
        category: 'file',
        summary: 'ファイルを削除',
        description: 'ファイルやフォルダを削除します。rm -r でフォルダごと削除。',
        usage: 'rm <ファイル>',
        example: 'rm notes.txt',
        keywords: ['削除', '消す', 'remove', 'delete'],
    },
    {
        command: 'chmod',
        category: 'file',
        summary: 'ファイルの権限を変更',
        description: 'ファイルの読み取り・書き込み・実行権限を変更します。chmod +x で実行可能にします。',
        usage: 'chmod <権限> <ファイル>',
        example: 'chmod +x script.sh',
        keywords: ['権限', 'パーミッション', '実行', 'permission'],
    },
    {
        command: 'nano',
        category: 'file',
        summary: 'テキストエディタでファイルを編集',
        description: 'ターミナル上のエディタ nano でファイルを開き、内容を編集・保存できます。初心者向けの定番エディタです。',
        usage: 'nano <ファイル>',
        example: 'nano README',
        keywords: ['編集', 'エディタ', 'editor', '保存', '書く'],
    },
    {
        command: 'vim',
        category: 'file',
        summary: 'Vim でファイルを編集',
        description: 'Vim（Vi IMproved）でファイルを編集します。INSERT モードで編集できます。',
        usage: 'vim <ファイル>',
        example: 'vim src/App.tsx',
        aliases: ['vi'],
        keywords: ['編集', 'エディタ', 'vim', 'vi'],
    },
    {
        command: 'code',
        category: 'file',
        summary: 'VS Code でファイルを開く',
        description: 'Visual Studio Code 風のエディタでファイルを開いて編集します。',
        usage: 'code <ファイル>',
        example: 'code package.json',
        keywords: ['編集', 'vscode', 'エディタ', 'visual studio code'],
    },

    // Git
    {
        command: 'git init',
        category: 'git',
        summary: 'Git リポジトリを初期化',
        description: '現在のフォルダを Git で管理するリポジトリとして初期化します。バージョン管理の第一歩です。',
        usage: 'git init',
        keywords: ['初期化', 'リポジトリ', 'バージョン管理', '始める'],
    },
    {
        command: 'git status',
        category: 'git',
        summary: '変更状況を確認',
        description: 'どのファイルが変更されたか、ステージングされているかを確認します。作業前後によく使います。',
        usage: 'git status',
        keywords: ['状態', '変更', '確認', 'ステータス'],
    },
    {
        command: 'git add',
        category: 'git',
        summary: '変更をステージング',
        description: '次のコミットに含める変更をステージングエリアに追加します。git add . で全ファイルを追加。',
        usage: 'git add <ファイル>',
        example: 'git add .',
        keywords: ['ステージ', '追加', 'コミット準備'],
    },
    {
        command: 'git commit',
        category: 'git',
        summary: '変更を記録（コミット）',
        description: 'ステージングした変更をリポジトリの履歴として記録します。-m でメッセージを付けます。',
        usage: 'git commit -m "<メッセージ>"',
        example: 'git commit -m "Initial commit"',
        keywords: ['コミット', '記録', '保存', '履歴'],
    },
    {
        command: 'git log',
        category: 'git',
        summary: 'コミット履歴を表示',
        description: '過去のコミット一覧を表示します。いつ・誰が・何を変更したかを確認できます。',
        usage: 'git log',
        keywords: ['履歴', 'ログ', '過去', 'コミット'],
    },
    {
        command: 'git diff',
        category: 'git',
        summary: '変更内容の差分を表示',
        description: 'コミット前の変更内容（差分）を表示します。何が変わったかを確認するのに使います。',
        usage: 'git diff',
        keywords: ['差分', '変更', '比較', 'diff'],
    },
    {
        command: 'git branch',
        category: 'git',
        summary: 'ブランチ一覧を表示',
        description: 'リポジトリ内のブランチ（作業の枝分かれ）一覧を表示します。',
        usage: 'git branch',
        keywords: ['ブランチ', '枝', 'branch'],
    },
    {
        command: 'git checkout',
        category: 'git',
        summary: 'ブランチを切り替え・作成',
        description: '別のブランチに切り替えます。-b オプションで新しいブランチを作成して切り替えます。',
        usage: 'git checkout -b <ブランチ名>',
        example: 'git checkout -b feature/login',
        keywords: ['切り替え', 'ブランチ', 'checkout', '作成'],
    },
    {
        command: 'git push',
        category: 'git',
        summary: 'リモートにプッシュ',
        description: 'ローカルのコミットを GitHub などのリモートリポジトリにアップロードします。',
        usage: 'git push',
        keywords: ['プッシュ', 'アップロード', 'リモート', 'github', '送信'],
    },
    {
        command: 'git pull',
        category: 'git',
        summary: 'リモートから取得',
        description: 'リモートリポジトリの最新の変更をローカルに取得してマージします。',
        usage: 'git pull',
        keywords: ['プル', '取得', 'ダウンロード', '最新', '同期'],
    },
    {
        command: 'git remote',
        category: 'git',
        summary: 'リモートリポジトリを表示',
        description: '接続されているリモートリポジトリ（GitHub など）の URL を表示します。',
        usage: 'git remote -v',
        keywords: ['リモート', 'url', 'github', '接続'],
    },
    {
        command: 'git clone',
        category: 'git',
        summary: 'リポジトリを複製',
        description: 'リモートリポジトリをローカルにコピー（クローン）します。プロジェクトを始めるときによく使います。',
        usage: 'git clone <URL>',
        example: 'git clone https://github.com/demo/my-website.git',
        keywords: ['クローン', '複製', 'ダウンロード', '取得'],
    },

    // npm
    {
        command: 'npm install',
        category: 'npm',
        summary: '依存パッケージをインストール',
        description: 'package.json に書かれたライブラリを node_modules にインストールします。プロジェクト開始時の定番コマンドです。',
        usage: 'npm install',
        aliases: ['npm i'],
        keywords: ['インストール', 'パッケージ', '依存', 'node_modules'],
    },
    {
        command: 'npm run dev',
        category: 'npm',
        summary: '開発サーバーを起動',
        description: 'ローカル開発用サーバーを起動します。コードを変更するとブラウザに自動反映されます。',
        usage: 'npm run dev',
        keywords: ['開発', 'サーバー', '起動', 'vite', 'localhost'],
    },
    {
        command: 'npm run build',
        category: 'npm',
        summary: '本番用にビルド',
        description: 'ソースコードを本番公開用に最適化・変換して dist/ フォルダに出力します。',
        usage: 'npm run build',
        keywords: ['ビルド', 'build', '本番', 'dist', 'コンパイル'],
    },
    {
        command: 'npm run deploy',
        category: 'npm',
        summary: 'サイトをデプロイ（公開）',
        description: 'ビルドしたサイトを Vercel などのホスティングサービスに公開します。',
        usage: 'npm run deploy',
        keywords: ['デプロイ', '公開', 'deploy', 'vercel', '本番環境'],
    },
    {
        command: 'npm start',
        category: 'npm',
        summary: 'アプリを起動',
        description: 'package.json の start スクリプトを実行します。多くの場合 dev サーバーと同じです。',
        usage: 'npm start',
        keywords: ['起動', 'start', 'サーバー'],
    },
    {
        command: 'npm test',
        category: 'npm',
        summary: 'テストを実行',
        description: 'プロジェクトの自動テストを実行します。コードが正しく動くか確認します。',
        usage: 'npm test',
        keywords: ['テスト', 'test', '検証', '自動'],
    },
    {
        command: 'npm run lint',
        category: 'npm',
        summary: 'コード品質チェック',
        description: 'ESLint などでコードの書き方やバグの可能性をチェックします。',
        usage: 'npm run lint',
        keywords: ['lint', '品質', 'チェック', 'eslint'],
    },
    {
        command: 'npm list',
        category: 'npm',
        summary: 'インストール済みパッケージ一覧',
        description: 'プロジェクトにインストールされているパッケージとバージョンを表示します。',
        usage: 'npm list --depth=0',
        keywords: ['一覧', 'パッケージ', 'バージョン', '依存'],
    },
    {
        command: 'npx',
        category: 'npm',
        summary: 'パッケージを一時実行',
        description: 'グローバルインストールなしで npm パッケージのコマンドを実行します。',
        usage: 'npx <パッケージ>',
        example: 'npx vercel',
        keywords: ['npx', '実行', '一時', 'vercel'],
    },

    // ネットワーク
    {
        command: 'curl',
        category: 'network',
        summary: 'URL に HTTP リクエスト',
        description: '指定した URL に HTTP リクエストを送り、レスポンスを表示します。API の動作確認に使います。',
        usage: 'curl <URL>',
        example: 'curl https://api.example.com/users',
        keywords: ['http', 'api', 'リクエスト', '取得'],
    },
    {
        command: 'ping',
        category: 'network',
        summary: 'サーバーへの接続確認',
        description: '指定したホストにパケットを送り、ネットワーク接続が通るか確認します。',
        usage: 'ping <ホスト>',
        example: 'ping google.com',
        keywords: ['接続', 'ネットワーク', '疎通', '確認'],
    },

    // システム
    {
        command: 'whoami',
        category: 'system',
        summary: '現在のユーザー名を表示',
        description: '今ログインしているユーザー名を表示します。',
        usage: 'whoami',
        keywords: ['ユーザー', '名前', 'ログイン'],
    },
    {
        command: 'date',
        category: 'system',
        summary: '現在の日時を表示',
        description: 'システムの現在日時を表示します。',
        usage: 'date',
        keywords: ['日時', '時刻', '今日', '時間'],
    },
    {
        command: 'which',
        category: 'system',
        summary: 'コマンドの場所を表示',
        description: '指定したコマンドがシステムのどこにインストールされているかを表示します。',
        usage: 'which <コマンド>',
        example: 'which node',
        keywords: ['パス', '場所', 'インストール', '場所'],
    },
    {
        command: 'env',
        category: 'system',
        summary: '環境変数を表示',
        description: 'システムに設定されている環境変数の一覧を表示します。',
        usage: 'env',
        keywords: ['環境変数', 'environment', '変数'],
    },
    {
        command: 'export',
        category: 'system',
        summary: '環境変数を設定',
        description: '環境変数を設定します。export VAR=value の形式で使います。',
        usage: 'export <名前>=<値>',
        example: 'export NODE_ENV=development',
        keywords: ['環境変数', '設定', 'export'],
    },
];

export function searchCommands(query: string): CommandEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return COMMAND_CATALOG;

    return COMMAND_CATALOG.filter((entry) => {
        const haystack = [
            entry.command,
            entry.summary,
            entry.description,
            entry.usage,
            entry.example ?? '',
            ...entry.keywords,
            ...(entry.aliases ?? []),
            COMMAND_CATEGORIES[entry.category],
        ]
            .join(' ')
            .toLowerCase();
        return haystack.includes(q) || q.split(/\s+/).every((word) => haystack.includes(word));
    });
}

export function findCommandEntry(query: string): CommandEntry | undefined {
    const normalized = query.trim().toLowerCase();
    return COMMAND_CATALOG.find(
        (e) =>
            e.command.toLowerCase() === normalized
            || e.aliases?.some((a) => a.toLowerCase() === normalized),
    );
}

export function getCompletionCommands(): string[] {
    const commands = new Set<string>();
    for (const entry of COMMAND_CATALOG) {
        commands.add(entry.command);
        entry.aliases?.forEach((a) => commands.add(a));
    }
    return [...commands].sort();
}

export function formatHelpByCategory(): string[] {
    const out = ['利用可能なコマンド', ''];
    const categories = Object.keys(COMMAND_CATEGORIES) as CommandCategory[];

    for (const cat of categories) {
        const entries = COMMAND_CATALOG.filter((e) => e.category === cat);
        if (!entries.length) continue;
        out.push(`[${COMMAND_CATEGORIES[cat]}]`);
        for (const e of entries) {
            out.push(`  ${e.command.padEnd(22)} ${e.summary}`);
        }
        out.push('');
    }
    out.push('コマンドの意味を調べる: search <キーワード>  または  man <コマンド>');
    out.push('ヒント: Tab キーで補完、↑↓で履歴');
    return out;
}

export function formatManPage(entry: CommandEntry): string[] {
    return [
        `NAME`,
        `    ${entry.command} — ${entry.summary}`,
        '',
        `DESCRIPTION`,
        `    ${entry.description}`,
        '',
        `SYNOPSIS`,
        `    ${entry.usage}`,
        ...(entry.example ? ['', `EXAMPLE`, `    ${entry.example}`] : []),
        '',
        `CATEGORY`,
        `    ${COMMAND_CATEGORIES[entry.category]}`,
        '',
        `KEYWORDS`,
        `    ${entry.keywords.join(', ')}`,
    ];
}

export function formatSearchResults(query: string, results: CommandEntry[]): string[] {
    if (!results.length) {
        return [`'${query}' に一致するコマンドは見つかりませんでした。`, '別のキーワードを試すか、help で一覧を確認してください。'];
    }
    const out = [`'${query}' の検索結果 (${results.length}件):`, ''];
    for (const e of results.slice(0, 12)) {
        out.push(`  ${e.command}`);
        out.push(`    ${e.summary}`);
        out.push(`    → ${e.description}`);
        out.push('');
    }
    if (results.length > 12) {
        out.push(`  ...他 ${results.length - 12} 件（右の検索パネルで全件表示）`);
    }
    out.push('詳しく見る: man <コマンド>');
    return out;
}
