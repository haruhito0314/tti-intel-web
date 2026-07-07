import { describe, expect, it } from 'vitest';
import { executeCommand, HOMEBREW_INSTALL_COMMAND, saveEditorFile } from './commands';
import { createInitialState, readFile } from './virtualFs';

function installBrew(state = createInitialState()) {
    return executeCommand(state, HOMEBREW_INSTALL_COMMAND).state;
}

function installNode(state = createInitialState()) {
    return executeCommand(installBrew(state), 'brew install node').state;
}

describe('nano save and cat', () => {
    it('cat shows content after saving a new file via editor', () => {
        let state = createInitialState();
        const edited = 'Hello from nano\nSecond line';

        const saved = saveEditorFile(state, 'notes.txt', edited);
        expect('error' in saved).toBe(false);
        if ('error' in saved) return;
        state = saved;

        const catResult = executeCommand(state, 'cat notes.txt');
        expect(catResult.lines.map((l) => l.text)).toEqual(['Hello from nano', 'Second line']);
        expect(readFile(state, 'notes.txt')).toBe(edited);
    });

    it('cat shows updated content after overwriting an existing file', () => {
        let state = createInitialState();
        const updated = '# Updated README\n\nEdited with nano.';

        const saved = saveEditorFile(state, 'README', updated);
        expect('error' in saved).toBe(false);
        if ('error' in saved) return;
        state = saved;

        const catResult = executeCommand(state, 'cat README');
        expect(catResult.lines.map((l) => l.text)).toEqual([
            '# Updated README',
            '',
            'Edited with nano.',
        ]);
    });

    it('nano opens then cat reads saved content end-to-end', () => {
        let state = createInitialState();

        const openResult = executeCommand(state, 'nano memo.txt');
        expect(openResult.editor).toMatchObject({ file: 'memo.txt', content: '', editor: 'nano' });

        const saved = saveEditorFile(state, 'memo.txt', 'memo content');
        expect('error' in saved).toBe(false);
        if ('error' in saved) return;
        state = saved;

        const catResult = executeCommand(state, 'cat memo.txt');
        expect(catResult.lines[0]?.text).toBe('memo content');
    });

    it('clear resets virtual file system', () => {
        let state = createInitialState();
        const saved = saveEditorFile(state, 'notes.txt', 'temp');
        expect('error' in saved).toBe(false);
        if ('error' in saved) return;
        state = saved;

        const clearResult = executeCommand(state, 'clear');
        expect(clearResult.lines.some((l) => l.text === '__CLEAR__')).toBe(true);
        expect(readFile(clearResult.state, 'notes.txt')).toBeNull();
        expect(clearResult.state.git.initialized).toBe(false);
        expect(clearResult.state.built).toBe(false);
        expect(clearResult.state.brewInstalled).toBe(false);
    });

    it('npm run build and deploy work', () => {
        let state = installNode();

        const installResult = executeCommand(state, 'npm install');
        expect(installResult.state.dependenciesInstalled).toBe(true);
        state = installResult.state;

        const devResult = executeCommand(state, 'npm run dev');
        expect(devResult.state.devServerRan).toBe(true);
        state = devResult.state;

        const buildResult = executeCommand(state, 'npm run build');
        expect(buildResult.lines.some((l) => l.text.includes('built in'))).toBe(true);
        expect(buildResult.state.built).toBe(true);
        state = buildResult.state;

        const deployResult = executeCommand(state, 'npm run deploy');
        expect(deployResult.state.deployed).toBe(true);
        expect(deployResult.lines.some((l) => l.text.includes('Production'))).toBe(true);
    });

    it('git push fails without remote', () => {
        let state = createInitialState();
        state = executeCommand(state, 'git init').state;
        state = executeCommand(state, 'git add .').state;
        state = executeCommand(state, 'git commit -m "test"').state;
        const result = executeCommand(state, 'git push');
        expect(result.lines.some((l) => l.text.includes('No configured push destination'))).toBe(true);
        expect(result.state.git.pushed).toBe(false);
    });

    it('git remote add and push work', () => {
        let state = createInitialState();
        state = executeCommand(state, 'git init').state;
        state = executeCommand(state, 'git add .').state;
        state = executeCommand(state, 'git commit -m "test"').state;
        state = executeCommand(state, 'git remote add origin https://github.com/demo/my-website.git').state;
        expect(state.git.remoteUrl).toBe('https://github.com/demo/my-website.git');
        const pushResult = executeCommand(state, 'git push -u origin main');
        expect(pushResult.state.git.pushed).toBe(true);
        expect(pushResult.lines.some((l) => l.text.includes('new branch'))).toBe(true);
    });

    it('npm run dev marks dev server as ran', () => {
        const result = executeCommand(installNode(), 'npm install');
        const devResult = executeCommand(result.state, 'npm run dev');
        expect(devResult.state.devServerRan).toBe(true);
        expect(devResult.lines.some((l) => l.text.includes('localhost:5173'))).toBe(true);
    });

    it('brew command is unavailable before Homebrew is installed', () => {
        const result = executeCommand(createInitialState(), 'brew install node');
        expect(result.lines.some((l) => l.text.includes('command not found'))).toBe(true);
        expect(result.state.nodeInstalled).toBe(false);
    });

    it('homebrew install adds opt/homebrew to file system', () => {
        const result = executeCommand(createInitialState(), HOMEBREW_INSTALL_COMMAND);
        expect(result.state.brewInstalled).toBe(true);
        expect(result.state.systemRoot).not.toBeNull();
        expect(result.lines.some((l) => l.text.includes('Installation successful'))).toBe(true);

        const lsBin = executeCommand(result.state, 'ls /opt/homebrew/bin');
        expect(lsBin.lines[0]?.text).toContain('brew');
        expect(lsBin.lines[0]?.text).not.toContain('node');
    });

    it('npm run build fails without npm install', () => {
        const state = installNode();
        const result = executeCommand(state, 'npm run build');
        expect(result.lines.some((l) => l.text.includes('command not found'))).toBe(true);
        expect(result.state.built).toBe(false);
    });

    it('node -v fails before brew install node', () => {
        const brewOnly = installBrew();
        const result = executeCommand(brewOnly, 'node -v');
        expect(result.lines.some((l) => l.text.includes('command not found'))).toBe(true);
    });

    it('brew install node shows completion output', () => {
        const result = executeCommand(installBrew(), 'brew install node');
        expect(result.state.nodeInstalled).toBe(true);
        expect(result.lines.some((l) => l.text.includes('🍺'))).toBe(true);
        expect(result.lines.some((l) => l.text.includes('Pouring node'))).toBe(true);
    });

    it('brew install node adds node binaries under homebrew', () => {
        const result = executeCommand(installBrew(), 'brew install node');
        const lsBin = executeCommand(result.state, 'ls /opt/homebrew/bin');
        expect(lsBin.lines[0]?.text).toContain('node');
        expect(lsBin.lines[0]?.text).toContain('npm');
    });

    it('node -v shows version after brew install node', () => {
        const result = executeCommand(installNode(), 'node -v');
        expect(result.lines[0]?.text).toBe('v20.11.0');
    });

    it('npm is unavailable before node is installed', () => {
        const result = executeCommand(createInitialState(), 'npm -v');
        expect(result.lines.some((l) => l.text.includes('command not found'))).toBe(true);
    });

    it('node_modules is missing before npm install', () => {
        const state = createInitialState();
        const lsRoot = executeCommand(state, 'ls');
        expect(lsRoot.lines[0]?.text).not.toContain('node_modules');

        const lsModules = executeCommand(state, 'ls node_modules');
        expect(lsModules.lines.some((l) => l.text.includes('No such file or directory'))).toBe(true);

        const cdModules = executeCommand(state, 'cd node_modules');
        expect(cdModules.lines.some((l) => l.text.includes('No such file or directory'))).toBe(true);
    });

    it('npm install creates node_modules in file tree', () => {
        let state = installNode();
        const installResult = executeCommand(state, 'npm install');
        state = installResult.state;

        const lsRoot = executeCommand(state, 'ls');
        expect(lsRoot.lines[0]?.text).toContain('node_modules');

        const lsModules = executeCommand(state, 'ls node_modules');
        expect(lsModules.lines[0]?.text).toContain('react');
    });

    it('npm run without script name shows error', () => {
        const result = executeCommand(installNode(), 'npm run');
        expect(result.lines.some((l) => l.type === 'error' && l.text.includes('missing script'))).toBe(true);
    });
});
