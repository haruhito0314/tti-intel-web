export const STEP_STUCK_TIPS: Record<string, string[]> = {
    welcome: [],
    pwd: [
        '「入力」ボタンでコマンドをターミナルに入れ、Enter で実行してください。',
        'コマンドを実行すると自動で次のステップに進みます。',
    ],
    ls: [
        'ls のあとに表示された一覧を右のファイルツリーと見比べてみましょう。',
        'うまくいかないときは「ここまでのステップを再現する」かスキップを使えます。',
    ],
    tree: [
        '右のファイルツリーでも同じ構造が確認できます。',
        'tree がなくても ls で一覧は見られます。',
    ],
    'mkdir-pages': [
        'mkdir pages を実行すると自動で次に進みます。',
        'うまくいかないときは「ここまでのステップを再現する」で、チュートリアル通りの状態に戻せます。',
    ],
    'cd-pages': [
        'pwd で今いる場所を確認してください。末尾が pages なら cd pages のあとに進みます。',
        'ルートにいるときは cd pages を実行します。',
    ],
    'pwd-pages': [
        'pwd の表示の末尾が pages かどうかを確認してください。',
        '違う場所にいるときは cd pages を実行してからもう一度 pwd します。',
    ],
    'touch-about': [
        'pages フォルダの中にいることを pwd で確認してください。',
        'touch about.html を実行すると自動で進みます。',
    ],
    'nano-open': [
        'pages の中にいることを確認してから nano about.html を実行します。',
        'nano を開くと自動で次のステップに進みます。',
    ],
    'nano-write': [
        '例の HTML をコピーして貼り付けても構いません。',
        '^O（Ctrl+O）で保存したあと、^X（Ctrl+X）で終了すると自動で進みます。',
        '<h1> と <p> の両方を含めて保存する必要があります。',
    ],
    'cat-about': [
        'pages フォルダの中で cat about.html を実行してください。',
        'ファイルが空のときは nano about.html で書き直します。',
    ],
    'cd-root': [
        'pages の中にいるときは cd .. でひとつ上に戻ります。',
        'cd .. を実行すると自動で進みます。',
    ],
    'git-init': [
        'my-website（プロジェクトのルート）で実行してください。',
        'git init を実行すると自動で進みます。',
    ],
    'git-add': [
        '先に git init が必要です。about.html ができているか tree で確認してください。',
        'git add . を実行すると自動で進みます。',
    ],
    'git-commit': [
        'git add のあとに実行してください。メッセージは -m "..." で付けます。',
        'git commit を実行すると自動で進みます。',
    ],
    'node-install': [
        'node -v の前に Node.js を入れる必要があります。',
        'brew install node を実行すると自動で進みます。',
    ],
    'node-version': [
        '入っていないときは node -v で command not found と出ます。',
        '先のステップで brew install node を済ませてから実行してください。',
        'which node で場所を確認することもできます。',
    ],
    'npm-install': [
        'インストール前は ls node_modules で No such file or directory と出ます。',
        'npm install 後は package-lock.json と node_modules ができます。',
        'npm run build は install のあとに実行します。',
    ],
    'npm-build': [
        'npm install のあとに実行してください。',
        'npm run build を実行すると自動で進みます。',
    ],
    'npm-deploy': [
        'npm run build のあとに deploy するとプレビューに反映されます。',
        'npm run deploy を実行すると自動で進みます。',
    ],
};
