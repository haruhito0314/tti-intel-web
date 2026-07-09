import { describe, expect, it } from 'vitest';
import { executeCommand, saveEditorFile } from './commands';
import { createInitialState, pathExists } from './virtualFs';
import { TUTORIAL_STEPS } from './tutorialSteps';

function runTutorialCommands(commands: string[]) {
    let state = createInitialState();
    for (const command of commands) {
        const result = executeCommand(state, command);
        state = result.state;
    }
    return state;
}

describe('tutorial step checks', () => {
    it('uses a focused beginner path from files to deploy', () => {
        const stepIds = TUTORIAL_STEPS.map((step) => step.id);

        expect(stepIds).toEqual([
            'welcome',
            'pwd',
            'ls',
            'tree',
            'mkdir-pages',
            'cd-pages',
            'touch-about',
            'code-open',
            'code-write',
            'cat-about',
            'cd-root',
            'git-init',
            'git-status',
            'git-add',
            'git-commit',
            'git-log',
            'node-version',
            'npm-install',
            'npm-dev',
            'npm-build',
            'npm-deploy',
        ]);
        expect(stepIds).not.toContain('nano-open');
        expect(stepIds).not.toContain('brew-install');
        expect(stepIds).not.toContain('node-install');
        expect(stepIds).not.toContain('git-remote');
        expect(stepIds).not.toContain('git-push');
    });

    it('mkdir pages and touch about.html', () => {
        const mkdirStep = TUTORIAL_STEPS.find((s) => s.id === 'mkdir-pages')!;
        const touchStep = TUTORIAL_STEPS.find((s) => s.id === 'touch-about')!;

        let s = createInitialState();
        const mkdirResult = executeCommand(s, 'mkdir pages');
        expect(mkdirStep.check({
            command: 'mkdir pages',
            stateBefore: s,
            stateAfter: mkdirResult.state,
        })).toBe(true);

        s = mkdirResult.state;
        const cdResult = executeCommand(s, 'cd pages');
        s = cdResult.state;
        const touchResult = executeCommand(s, 'touch about.html');
        expect(touchStep.check({
            command: 'touch about.html',
            stateBefore: s,
            stateAfter: touchResult.state,
        })).toBe(true);
    });

    it('code about.html opens the practice editor', () => {
        const state = runTutorialCommands(['mkdir pages', 'cd pages', 'touch about.html']);
        const openResult = executeCommand(state, 'code about.html');
        const step = TUTORIAL_STEPS.find((s) => s.id === 'code-open')!;

        expect(openResult.editor).toMatchObject({ file: 'about.html', content: '', editor: 'code' });
        expect(step.check({
            command: 'code about.html',
            stateBefore: state,
            stateAfter: openResult.state,
        })).toBe(true);
    });

    it('editor save with h1 and p passes code-write step', () => {
        const state = runTutorialCommands(['mkdir pages', 'cd pages', 'touch about.html']);
        const html = '<h1>About Me</h1>\n<p>Hello</p>';
        const saved = saveEditorFile(state, 'about.html', html);
        expect('error' in saved).toBe(false);
        if ('error' in saved) return;

        const step = TUTORIAL_STEPS.find((s) => s.id === 'code-write')!;
        expect(step.check({
            stateBefore: state,
            stateAfter: saved,
            editorSaved: { file: 'about.html', content: html },
        })).toBe(true);
    });

    it('cat about.html passes when file has content', () => {
        let state = runTutorialCommands(['mkdir pages', 'cd pages', 'touch about.html']);
        const html = '<h1>About Me</h1>\n<p>Hello</p>';
        const saved = saveEditorFile(state, 'about.html', html);
        expect('error' in saved).toBe(false);
        if ('error' in saved) return;
        state = saved;

        const catResult = executeCommand(state, 'cat about.html');
        const step = TUTORIAL_STEPS.find((s) => s.id === 'cat-about')!;
        expect(step.check({
            command: 'cat about.html',
            stateBefore: state,
            stateAfter: catResult.state,
        })).toBe(true);
    });

    it('npm install passes tutorial step and creates node_modules', () => {
        const step = TUTORIAL_STEPS.find((s) => s.id === 'npm-install')!;
        const state = createInitialState();
        expect(state.nodeInstalled).toBe(true);
        expect(pathExists(state, 'node_modules')).toBe(false);

        const installResult = executeCommand(state, 'npm install');
        expect(pathExists(installResult.state, 'node_modules')).toBe(true);
        expect(step.check({
            command: 'npm install',
            stateBefore: state,
            stateAfter: installResult.state,
        })).toBe(true);
    });
});
