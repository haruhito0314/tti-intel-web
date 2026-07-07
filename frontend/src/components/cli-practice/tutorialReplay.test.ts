import { describe, expect, it } from 'vitest';
import { getStepIndex } from './tutorialSteps';
import { assertReplayState, replayTutorialToStep } from './tutorialReplay';
import { readFile } from './virtualFs';

describe('tutorial replay', () => {
    it('replays mkdir and cd for touch-about step', () => {
        const stepIndex = getStepIndex('nano-open');
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

    it('replays git init before git add step', () => {
        const stepIndex = getStepIndex('git-add');
        const { state, commandsRun } = replayTutorialToStep(stepIndex);

        expect(commandsRun).toContain('git init');
        expect(state.git.initialized).toBe(true);
        expect(state.cwd.endsWith('my-website')).toBe(true);
        expect(assertReplayState(stepIndex, state)).toBe(true);
    });

    it('replays brew install node before npm install step', () => {
        const stepIndex = getStepIndex('npm-install');
        const { state, commandsRun } = replayTutorialToStep(stepIndex);

        expect(commandsRun).toContain('brew install node');
        expect(state.nodeInstalled).toBe(true);
        expect(assertReplayState(stepIndex, state)).toBe(true);
    });
});
