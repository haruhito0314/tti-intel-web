import { executeCommand, formatPrompt, saveEditorFile, type TerminalLine } from './commands';
import { TUTORIAL_STEPS } from './tutorialSteps';
import { createInitialState, getNodeAtAbsolutePath, type ProjectState } from './virtualFs';

const PROJECT_ROOT = '/Users/demo/my-website';

function cwdEndsWith(state: ProjectState, suffix: string): boolean {
    return state.cwd === suffix || state.cwd.endsWith(`/${suffix}`);
}

function absPathExists(state: ProjectState, absPath: string): boolean {
    return getNodeAtAbsolutePath(state, absPath) !== null;
}

function readAbsFile(state: ProjectState, absPath: string): string | null {
    const node = getNodeAtAbsolutePath(state, absPath);
    if (!node || node.type !== 'file') return null;
    return node.content ?? '';
}

export interface TutorialReplayResult {
    state: ProjectState;
    lines: TerminalLine[];
    commandsRun: string[];
}

function makeInputLine(cwd: string, command: string, index: number): TerminalLine {
    return {
        id: `replay-in-${index}`,
        type: 'input',
        text: `${formatPrompt(cwd)} ${command}`,
    };
}

function makeLine(type: TerminalLine['type'], text: string, index: number): TerminalLine {
    return { id: `replay-${type}-${index}`, type, text };
}

export function replayTutorialToStep(stepIndex: number): TutorialReplayResult {
    let state = createInitialState();
    const outputLines: TerminalLine[] = [];
    const commandsRun: string[] = [];
    let lineIndex = 0;

    const push = (type: TerminalLine['type'], text: string) => {
        outputLines.push(makeLine(type, text, lineIndex++));
    };

    push(
        'info',
        `チュートリアル: ステップ ${stepIndex} までに必要な環境を再現します（これまでの作業はリセットされます）`,
    );

    for (let i = 0; i < stepIndex; i++) {
        const step = TUTORIAL_STEPS[i];
        if (step.kind === 'intro') continue;

        if (step.id === 'nano-open') {
            const command = step.suggestedCommand ?? 'nano about.html';
            commandsRun.push(command);
            outputLines.push(makeInputLine(state.cwd, command, lineIndex++));
            push('info', '(エディタを開く操作は省略し、ファイルの準備だけ行います)');
            continue;
        }

        if (step.id === 'nano-write') {
            const content = step.sampleContent ?? '<h1>About Me</h1>\n<p>はじめまして。コマンドライン の練習サイトです。</p>';
            commandsRun.push('nano about.html');
            outputLines.push(makeInputLine(state.cwd, 'nano about.html', lineIndex++));
            const saved = saveEditorFile(state, 'about.html', content);
            if ('error' in saved) {
                push('error', saved.error);
                break;
            }
            state = saved;
            push('success', '[ Wrote 3 lines ]');
            continue;
        }

        if (!step.suggestedCommand) continue;

        const cwdBefore = state.cwd;
        commandsRun.push(step.suggestedCommand);
        outputLines.push(makeInputLine(cwdBefore, step.suggestedCommand, lineIndex++));

        const result = executeCommand(state, step.suggestedCommand);
        state = result.state;

        if (result.editor) continue;

        for (const resultLine of result.lines) {
            if (resultLine.text === '__CLEAR__') continue;
            outputLines.push({ ...resultLine, id: `replay-out-${lineIndex++}` });
        }
    }

    push('success', `ステップ ${stepIndex} 用の環境を再現しました。このまま続けてください。`);

    return { state, lines: outputLines, commandsRun };
}

export function describeReplayTarget(stepIndex: number): string {
    if (stepIndex <= 1) {
        return '初期状態に戻します。';
    }
    const step = TUTORIAL_STEPS[stepIndex];
    return step
        ? `「${step.title}」のために、それ以前のステップのコマンドを順に実行した状態に戻します。`
        : 'チュートリアルどおりの状態に戻します。';
}

export function assertReplayState(stepIndex: number, state: ProjectState): boolean {
    const step = TUTORIAL_STEPS[stepIndex];
    if (!step || step.kind === 'intro') return true;

    const pagesSteps = new Set([
        'cd-pages', 'pwd-pages', 'touch-about', 'nano-open', 'nano-write', 'cat-about',
    ]);
    const touchIndex = TUTORIAL_STEPS.findIndex((s) => s.id === 'touch-about');
    const nanoWriteIndex = TUTORIAL_STEPS.findIndex((s) => s.id === 'nano-write');
    const cdRootIndex = TUTORIAL_STEPS.findIndex((s) => s.id === 'cd-root');
    const mkdirIndex = TUTORIAL_STEPS.findIndex((s) => s.id === 'mkdir-pages');

    if (mkdirIndex >= 0 && mkdirIndex < stepIndex && !absPathExists(state, `${PROJECT_ROOT}/pages`)) {
        return false;
    }
    if (touchIndex >= 0 && touchIndex < stepIndex && !absPathExists(state, `${PROJECT_ROOT}/pages/about.html`)) {
        return false;
    }
    if (pagesSteps.has(step.id) && !cwdEndsWith(state, 'pages')) return false;
    if (nanoWriteIndex >= 0 && nanoWriteIndex < stepIndex) {
        const content = readAbsFile(state, `${PROJECT_ROOT}/pages/about.html`);
        if (!content?.includes('<h1>')) return false;
    }
    if (cdRootIndex >= 0 && cdRootIndex < stepIndex && !cwdEndsWith(state, 'my-website')) return false;

    const npmInstallIndex = TUTORIAL_STEPS.findIndex((s) => s.id === 'npm-install');
    const nodeInstallIndex = TUTORIAL_STEPS.findIndex((s) => s.id === 'node-install');
    if (nodeInstallIndex >= 0 && nodeInstallIndex < stepIndex && !state.nodeInstalled) {
        return false;
    }
    if (npmInstallIndex >= 0 && npmInstallIndex < stepIndex) {
        if (!state.dependenciesInstalled || !absPathExists(state, `${PROJECT_ROOT}/node_modules`)) {
            return false;
        }
    }

    return true;
}
