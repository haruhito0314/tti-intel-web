import { TUTORIAL_STEPS, type TutorialStep } from './tutorialSteps';

export interface NextAction {
    command: string;
    title: string;
    description: string;
}

export interface CurrentMilestone {
    currentLabel: string;
    chapter: string;
    title: string;
    nextAction: string;
}

export const NEXT_ACTIONS: NextAction[] = [
    {
        command: 'pwd',
        title: '迷ったら現在地',
        description: 'どのフォルダで作業しているかを最初に確認します。',
    },
    {
        command: 'tree',
        title: '全体像を見る',
        description: 'ファイル構造パネルと合わせて、作ったものの位置を確かめます。',
    },
    {
        command: 'git status',
        title: '変更を確認',
        description: 'コミット前に、どのファイルが変わったかを見ます。',
    },
];

function getStepAction(step: TutorialStep): string {
    if (step.kind === 'intro') {
        return '「はじめる」を押して、最初の確認コマンドに進みます。';
    }
    if (step.kind === 'editor') {
        return 'エディタに例の HTML を書き、保存して終了します。';
    }
    if (step.suggestedCommand) {
        return `${step.suggestedCommand} を実行して、表示された結果を見てみましょう。`;
    }
    return '表示されている手順を進めます。';
}

const STEP_ACTIONS: Partial<Record<TutorialStep['id'], string>> = {
    pwd: 'pwd を実行して、表示されたパスを見てみましょう。',
    ls: 'ls を実行して、プロジェクトにあるファイルを確認します。',
    tree: 'tree を実行して、フォルダの入れ子を見てみましょう。',
    'mkdir-pages': 'mkdir pages を実行して、pages フォルダを作ります。',
    'cd-pages': 'cd pages を実行して、作業場所を pages に移動します。',
    'touch-about': 'touch about.html を実行して、空の HTML ファイルを作ります。',
    'code-open': 'code about.html を実行して、編集画面を開きます。',
    'code-write': 'HTML の例を書いて保存し、エディタを終了します。',
    'cat-about': 'cat about.html を実行して、保存した内容を確認します。',
    'cd-root': 'cd .. を実行して、プロジェクトの一番上に戻ります。',
    'git-init': 'git init を実行して、Git で記録する準備をします。',
    'git-status': 'git status を実行して、記録前の変更を確認します。',
    'git-add': 'git add . を実行して、今回の変更をコミット候補にします。',
    'git-commit': 'git commit を実行して、変更を履歴に残します。',
    'git-log': 'git log を実行して、コミットが履歴に残ったか確認します。',
    'node-version': 'node -v を実行して、Node.js が使えることを確認します。',
    'npm-install': 'npm install を実行して、必要なライブラリを入れます。',
    'npm-dev': 'npm run dev を実行して、開発サーバーの起動を確認します。',
    'npm-build': 'npm run build を実行して、公開用ファイルを作ります。',
    'npm-deploy': 'npm run deploy を実行して、プレビューに反映します。',
};

export function getCurrentMilestone(stepIndex: number, completed: boolean): CurrentMilestone {
    if (completed) {
        return {
            currentLabel: 'COMPLETE',
            chapter: '完走',
            title: '公開までの流れを体験しました',
            nextAction: '自由にコマンドを試して、help や search で復習できます。',
        };
    }

    const safeIndex = Math.min(Math.max(stepIndex, 0), TUTORIAL_STEPS.length - 1);
    const step = TUTORIAL_STEPS[safeIndex];

    return {
        currentLabel: `STEP ${safeIndex + 1} / ${TUTORIAL_STEPS.length}`,
        chapter: step.chapter,
        title: step.title,
        nextAction: STEP_ACTIONS[step.id] ?? getStepAction(step),
    };
}
