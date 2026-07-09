import { describe, expect, it } from 'vitest';
import { getStepIndex } from './tutorialSteps';
import { assertReplayState, replayTutorialToStep } from './tutorialReplay';
import { readFile } from './virtualFs';

describe('tutorial replay', () => {
    it('replays mkdir and cd for code-open step', () => {
        const stepIndex = getStepIndex('code-open');
        const { state, commandsRun } = replayTutorialToStep(stepIndex);

        expect(commandsRun).toContain('mkdir pages');
        expect(commandsRun).toContain('cd pages');
        expect(commandsRun).toContain('touch about.html');
        expect(state.cwd.endsWith('pages')).toBe(true);
        expect(readFile(state, 'about.html')).toBe('');
        expect(assertReplayState(stepIndex, state)).toBe(true);
    });

    it('replays html content before cat-about step', () => {
        const stepIndex = getStepIndex('cat-about');
        const { state } = replayTutorialToStep(stepIndex);

        const content = readFile(state, 'about.html');
        expect(content).toContain('<h1>');
        expect(content).toContain('<p>');
        expect(assertReplayState(stepIndex, state)).toBe(true);
    });

    it('replays git init before git status step', () => {
        const stepIndex = getStepIndex('git-status');
        const { state, commandsRun } = replayTutorialToStep(stepIndex);

        expect(commandsRun).toContain('git init');
        expect(state.git.initialized).toBe(true);
        expect(state.cwd.endsWith('my-website')).toBe(true);
        expect(assertReplayState(stepIndex, state)).toBe(true);
    });

    it('replays git commit before git log step', () => {
        const stepIndex = getStepIndex('git-log');
        const { state, commandsRun } = replayTutorialToStep(stepIndex);

        expect(commandsRun).toContain('git status');
        expect(commandsRun).toContain('git add .');
        expect(commandsRun).toContain('git commit -m "Add about page"');
        expect(state.git.commits).toHaveLength(1);
        expect(assertReplayState(stepIndex, state)).toBe(true);
    });

    it('replays npm run dev before npm build step', () => {
        const stepIndex = getStepIndex('npm-build');
        const { state, commandsRun } = replayTutorialToStep(stepIndex);

        expect(commandsRun).toContain('npm run dev');
        expect(state.devServerRan).toBe(true);
        expect(assertReplayState(stepIndex, state)).toBe(true);
    });

    it('replays node version check before npm install without setup detours', () => {
        const stepIndex = getStepIndex('npm-install');
        const { state, commandsRun } = replayTutorialToStep(stepIndex);

        expect(commandsRun).toContain('node -v');
        expect(commandsRun.some((command) => command.includes('brew'))).toBe(false);
        expect(commandsRun.some((command) => command.startsWith('git remote'))).toBe(false);
        expect(commandsRun.some((command) => command.startsWith('git push'))).toBe(false);
        expect(state.brewInstalled).toBe(false);
        expect(state.nodeInstalled).toBe(true);
        expect(assertReplayState(stepIndex, state)).toBe(true);
    });
});
