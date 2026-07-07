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
    'git-remote': [
        'GitHub のリポジトリ URL を origin に登録します。',
        'git remote add origin ... を実行すると自動で進みます。',
        'git remote -v で登録を確認できます。',
    ],
    'git-push': [
        '先に git remote add が必要です。',
        'git push -u origin main を実行すると自動で進みます。',
        'デモなので実際の GitHub アカウントは不要です。',
    ],
    'brew-install': [
        'brew コマンドの前に Homebrew 本体のインストールが必要です。',
        '表示されている公式コマンドをそのまま実行してください。',
        '完了するとファイルツリーに opt/homebrew が現れます。',
    ],
    'node-install': [
        'Homebrew を入れたあとに brew install node を実行します。',
        'brew がないときは command not found と出ます。',
    ],
    'node-version': [
        '入っていないときは node -v で command not found と出ます。',
        '先のステップで brew install node を済ませてから実行してください。',
        'which node で場所を確認することもできます。',
    ],
    'npm-install': [
        'インストール前は ls node_modules で No such file or directory と出ます。',
        'npm install 後は package-lock.json と node_modules ができます。',
    ],
    'npm-dev': [
        'npm install のあとに npm run dev を実行します。',
        'localhost:5173 で開発中のサイトを確認するイメージです。',
        'Ctrl+C で止めてから build に進みます（デモでは止めなくても次に進めます）。',
    ],
    'npm-build': [
        'npm run dev で確認したあと、本番用に npm run build します。',
        'npm install のあとに実行してください。',
        'npm run build を実行すると自動で進みます。',
    ],
    'npm-deploy': [
        'npm run build のあとに deploy するとプレビューに反映されます。',
        'npm run deploy を実行すると自動で進みます。',
    ],
};
