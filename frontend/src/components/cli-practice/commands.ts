import {
    formatHelpByCategory,
    formatManPage,
    formatSearchResults,
    findCommandEntry,
    searchCommands,
} from './commandCatalog';
import {
    addDistFolder,
    addNodeModulesFolder,
    addGitFolder,
    buildTree,
    changeDirectory,
    copyPath,
    createDirectory,
    createFile,
    createInitialState,
    findFiles,
    formatPrompt,
    getNodeAtRelativePath,
    listDir,
    movePath,
    normalizePath,
    readFile,
    relativeToProject,
    removePath,
    writeFile,
    type ProjectState,
} from './virtualFs';

export type TerminalLineType = 'input' | 'output' | 'error' | 'success' | 'info';

export interface TerminalLine {
    id: string;
    type: TerminalLineType;
    text: string;
}

export interface CommandResult {
    state: ProjectState;
    lines: TerminalLine[];
    editor?: EditorSession;
}

export type EditorKind = 'nano' | 'vim' | 'code';

export interface EditorSession {
    file: string;
    content: string;
    editor: EditorKind;
}

export interface ExecuteContext {
    history: string[];
}

let lineId = 0;
function line(type: TerminalLineType, text: string): TerminalLine {
    lineId += 1;
    return { id: `line-${lineId}`, type, text };
}

function lines(type: TerminalLineType, texts: string[]): TerminalLine[] {
    return texts.map((text) => line(type, text));
}

function openEditor(state: ProjectState, fileArg: string | undefined, editor: EditorKind): CommandResult {
    if (!fileArg) {
        return { state, lines: [line('error', `${editor}: missing filename`)] };
    }
    const node = getNodeAtRelativePath(state, fileArg);
    if (node?.type === 'dir') {
        return { state, lines: [line('error', `${editor}: ${fileArg}: Is a directory`)] };
    }
    const existing = readFile(state, fileArg);
    const content = existing ?? '';
    return {
        state,
        lines: [],
        editor: { file: fileArg, content, editor },
    };
}

function saveEditorFile(state: ProjectState, fileArg: string, content: string): ProjectState | { error: string } {
    const node = getNodeAtRelativePath(state, fileArg);
    if (node?.type === 'dir') {
        return { error: `cannot write to '${fileArg}': Is a directory` };
    }
    return writeFile(state, fileArg, content);
}

export { saveEditorFile };

function randomHash(): string {
    return Math.random().toString(16).slice(2, 9);
}

function parseQuotedMessage(input: string): string | null {
    const match = input.match(/-m\s+("([^"]*)"|'([^']*)'|(\S+))/);
    return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function getUntrackedFiles(state: ProjectState): string[] {
    if (!state.git.initialized) return [];
    const all: string[] = [];
    function walk(nodePath: string) {
        const entries = listDir(state, nodePath === '.' ? '.' : nodePath);
        for (const entry of entries) {
            const rel = nodePath === '.' ? entry.name : `${nodePath}/${entry.name}`;
            if (entry.name === '.git' || rel.startsWith('dist/')) continue;
            if (entry.type === 'dir') {
                walk(rel);
            } else if (!state.git.staged.includes(rel)) {
                all.push(rel);
            }
        }
    }
    walk('.');
    return [...new Set(all)];
}

function handleGit(state: ProjectState, args: string[], joinedArgs: string): CommandResult | null {
    const sub = args[0];

    if (sub === 'init') {
        if (state.git.initialized) {
            return { state, lines: [line('error', 'Reinitialized existing Git repository.')] };
        }
        let next = addGitFolder(state);
        next = {
            ...next,
            git: {
                ...next.git,
                initialized: true,
                branch: 'main',
                branches: ['main'],
                staged: [],
                commits: [],
                pushed: false,
            },
        };
        return {
            state: next,
            lines: lines('success', [
                'Initialized empty Git repository in /Users/demo/my-website/.git/',
            ]),
        };
    }

    if (!state.git.initialized) {
        return {
            state,
            lines: [line('error', 'fatal: not a git repository (or any of the parent directories): .git')],
        };
    }

    if (sub === 'status') {
        const staged = state.git.staged;
        const untracked = getUntrackedFiles(state).filter((f) => !staged.includes(f));
        const out = [`On branch ${state.git.branch}`];
        if (!staged.length && !untracked.length && state.git.commits.length) {
            out.push('nothing to commit, working tree clean');
        } else {
            if (staged.length) {
                out.push('Changes to be committed:', ...staged.map((f) => `  new file:   ${f}`));
            }
            if (untracked.length) {
                out.push('Untracked files:', ...untracked.map((f) => `  ${f}`));
            }
        }
        return { state, lines: lines('output', out) };
    }

    if (sub === 'add') {
        const target = args[1];
        if (!target) return { state, lines: [line('error', 'git add: missing path')] };
        if (target === '.') {
            const all = getUntrackedFiles(state);
            return {
                state: { ...state, git: { ...state.git, staged: [...new Set([...state.git.staged, ...all])] } },
                lines: [],
            };
        }
        if (!readFile(state, target) && !listDir(state, target).length) {
            return { state, lines: [line('error', `fatal: pathspec '${target}' did not match any files`)] };
        }
        const rel = relativeToProject(normalizePath(`${state.cwd}/${target}`));
        return {
            state: {
                ...state,
                git: { ...state.git, staged: [...new Set([...state.git.staged, rel])] },
            },
            lines: [],
        };
    }

    if (sub === 'commit') {
        const message = parseQuotedMessage(joinedArgs);
        if (!message) {
            return { state, lines: [line('error', 'error: switch `m` expects a value')] };
        }
        if (!state.git.staged.length) {
            return { state, lines: [line('error', 'nothing to commit, working tree clean')] };
        }
        const hash = randomHash();
        const stagedCount = state.git.staged.length;
        const next: ProjectState = {
            ...state,
            git: {
                ...state.git,
                staged: [],
                commits: [...state.git.commits, { hash, message }],
            },
        };
        const fileWord = stagedCount === 1 ? 'file' : 'files';
        return {
            state: next,
            lines: lines('success', [
                `[${state.git.branch} ${hash}] ${message}`,
                ` ${stagedCount} ${fileWord} changed, ${stagedCount} insertion(+)`,
            ]),
        };
    }

    if (sub === 'log') {
        if (!state.git.commits.length) {
            return { state, lines: [line('output', '(no commits yet)')] };
        }
        const out = state.git.commits
            .slice()
            .reverse()
            .flatMap((c) => [`commit ${c.hash}`, `    ${c.message}`, '']);
        return { state, lines: lines('output', out) };
    }

    if (sub === 'diff') {
        if (!state.git.staged.length && !getUntrackedFiles(state).length) {
            return { state, lines: [line('output', '(no changes)')] };
        }
        const out = ['diff --git a/src/App.tsx b/src/App.tsx', '--- a/src/App.tsx', '+++ b/src/App.tsx', '@@ -1,5 +1,6 @@', ' export function App() {', '   return (', '     <main>', '-      <h1>Hello, TTI!</h1>', '+      <h1>Hello, TTI Intelligence!</h1>', '       <p>コマンドラインから作ったサイトです。</p>'];
        return { state, lines: lines('output', out) };
    }

    if (sub === 'branch') {
        const branchName = args[1];
        if (branchName) {
            if (state.git.branches.includes(branchName)) {
                return { state, lines: [line('error', `fatal: A branch named '${branchName}' already exists.`)] };
            }
            return {
                state: {
                    ...state,
                    git: { ...state.git, branches: [...state.git.branches, branchName] },
                },
                lines: [],
            };
        }
        const out = state.git.branches.map((b) => (b === state.git.branch ? `* ${b}` : `  ${b}`));
        return { state, lines: lines('output', out) };
    }

    if (sub === 'checkout') {
        const createBranch = args[1] === '-b';
        const branchName = createBranch ? args[2] : args[1];
        if (!branchName) {
            return { state, lines: [line('error', 'git checkout: missing branch name')] };
        }
        let branches = state.git.branches;
        if (createBranch && !branches.includes(branchName)) {
            branches = [...branches, branchName];
        }
        if (!branches.includes(branchName)) {
            return { state, lines: [line('error', `error: pathspec '${branchName}' did not match any file(s) known to git`)] };
        }
        return {
            state: { ...state, git: { ...state.git, branch: branchName, branches } },
            lines: [line('output', createBranch ? `Switched to a new branch '${branchName}'` : `Switched to branch '${branchName}'`)],
        };
    }

    if (sub === 'push') {
        if (!state.git.commits.length) {
            return { state, lines: [line('error', 'error: no commits to push')] };
        }
        return {
            state: { ...state, git: { ...state.git, pushed: true } },
            lines: lines('output', [
                'Enumerating objects: 12, done.',
                'Counting objects: 100% (12/12), done.',
                'Writing objects: 100% (6/6), 1.24 KiB | 1.24 MiB/s, done.',
                'Total 6 (delta 2), reused 0 (delta 0), pack-reused 0',
                'To github.com:demo/my-website.git',
                `   ${state.git.commits.at(-1)?.hash}..${randomHash()}  ${state.git.branch} -> ${state.git.branch}`,
            ]),
        };
    }

    if (sub === 'pull') {
        return {
            state,
            lines: lines('output', [
                'From github.com:demo/my-website',
                ` * branch            ${state.git.branch}     -> FETCH_HEAD`,
                'Already up to date.',
            ]),
        };
    }

    if (sub === 'remote') {
        return {
            state,
            lines: lines('output', [
                'origin  https://github.com/demo/my-website.git (fetch)',
                'origin  https://github.com/demo/my-website.git (push)',
            ]),
        };
    }

    if (sub === 'clone') {
        return {
            state,
            lines: lines('output', [
                `Cloning into 'my-website'...`,
                'remote: Enumerating objects: 42, done.',
                'remote: Counting objects: 100% (42/42), done.',
                'Receiving objects: 100% (42/42), 12.45 KiB | 12.45 MiB/s, done.',
                'Resolving deltas: 100% (8/8), done.',
            ]),
        };
    }

    return { state, lines: [line('error', `git: '${sub}' is not a git command.`)] };
}

function npmRunMissingBinary(state: ProjectState, script: string, cmd: string): CommandResult {
    const bin = cmd.split(' ')[0] ?? cmd;
    return {
        state,
        lines: [
            line('output', `> my-website@1.0.0 ${script}`),
            line('output', `> ${cmd}`),
            line('output', ''),
            line('error', `sh: ${bin}: command not found`),
        ],
    };
}

function commandNotFound(state: ProjectState, name: string): CommandResult {
    return { state, lines: [line('error', `zsh: command not found: ${name}`)] };
}

function handleNpm(state: ProjectState, args: string[]): CommandResult | null {
    if (!state.nodeInstalled) {
        return commandNotFound(state, 'npm');
    }
    const sub = args[0];
    const runScript = sub === 'run' ? args[1] : undefined;

    if (sub === 'install' || sub === 'i') {
        if (state.dependenciesInstalled) {
            return {
                state,
                lines: lines('output', [
                    '',
                    'up to date, audited 143 packages in 1s',
                    '',
                    '28 packages are looking for funding',
                    '  run `npm fund` for details',
                    '',
                    'found 0 vulnerabilities',
                ]),
            };
        }
        const next = addNodeModulesFolder({ ...state, dependenciesInstalled: true });
        return {
            state: next,
            lines: lines('output', [
                '',
                'added 142 packages, and audited 143 packages in 3s',
                '',
                '28 packages are looking for funding',
                '  run `npm fund` for details',
                '',
                'found 0 vulnerabilities',
            ]),
        };
    }

    if (sub === '-v' || sub === '--version') {
        return { state, lines: [line('output', '10.2.4')] };
    }

    if (sub === 'run' && !runScript) {
        return { state, lines: [line('error', 'npm ERR! missing script: "run" requires a script name')] };
    }

    if ((sub === 'run' && runScript === 'dev') || sub === 'start') {
        if (!state.dependenciesInstalled) {
            return npmRunMissingBinary(state, sub === 'start' ? 'start' : 'dev', 'vite');
        }
        return {
            state,
            lines: lines('output', [
                '> my-website@1.0.0 dev',
                '> vite',
                '',
                '  VITE v5.4.0  ready in 320 ms',
                '',
                '  ➜  Local:   http://localhost:5173/',
                '  ➜  Network: use --host to expose',
            ]),
        };
    }

    if (sub === 'run' && runScript === 'build') {
        if (!state.dependenciesInstalled) {
            return npmRunMissingBinary(state, 'build', 'vite build');
        }
        let next = addDistFolder(state);
        next = { ...next, built: true };
        return {
            state: next,
            lines: lines('output', [
                '> my-website@1.0.0 build',
                '> vite build',
                '',
                'vite v5.4.0 building for production...',
                'transforming...',
                '✓ 32 modules transformed.',
                'rendering chunks...',
                'computing gzip size...',
                'dist/index.html                  0.45 kB │ gzip:  0.30 kB',
                'dist/assets/index-a1b2c3.js    142.50 kB │ gzip: 45.82 kB',
                '✓ built in 1.24s',
            ]),
        };
    }

    if (sub === 'run' && runScript === 'deploy') {
        if (!state.built) {
            return { state, lines: [line('error', '先に npm run build を実行してください')] };
        }
        const url = 'https://my-website-demo.vercel.app';
        return {
            state: { ...state, deployed: true, deployUrl: url },
            lines: lines('output', [
                '> my-website@1.0.0 deploy',
                '> vercel --prod',
                '',
                'Vercel CLI 37.0.0',
                '🔍  Inspect: https://vercel.com/demo/my-website/abc123',
                `✅  Production: ${url} [copied to clipboard]`,
            ]),
        };
    }

    if (sub === 'run' && runScript === 'lint') {
        if (!state.dependenciesInstalled) {
            return npmRunMissingBinary(state, 'lint', 'eslint src/');
        }
        return {
            state,
            lines: lines('output', [
                '> my-website@1.0.0 lint',
                '> eslint src/',
                '',
                '✓ No problems found',
            ]),
        };
    }

    if (sub === 'test') {
        if (!state.dependenciesInstalled) {
            return npmRunMissingBinary(state, 'test', 'vitest run');
        }
        return {
            state,
            lines: lines('output', [
                '> my-website@1.0.0 test',
                '> vitest run',
                '',
                ' RUN  v2.0.0 /Users/demo/my-website',
                '',
                ' ✓ src/App.test.tsx (2 tests) 12ms',
                '',
                ' Test Files  1 passed (1)',
                '      Tests  2 passed (2)',
                '   Start at  13:24:00',
                '   Duration  412ms',
            ]),
        };
    }

    if (sub === 'list' || sub === 'ls') {
        if (!state.dependenciesInstalled) {
            return {
                state,
                lines: lines('error', [
                    'npm error code ELSPROBLEMS',
                    'npm error missing: react@^19.0.0, required by my-website@1.0.0',
                    'npm error missing: react-dom@^19.0.0, required by my-website@1.0.0',
                    'npm error missing: vite@^5.4.0, required by my-website@1.0.0',
                    'npm error A complete log of this run can be found in: /Users/demo/.npm/_logs/2026-07-07T04_24_00_000Z-debug-0.log',
                ]),
            };
        }
        return {
            state,
            lines: lines('output', [
                'my-website@1.0.0 /Users/demo/my-website',
                '├── react@19.0.0',
                '├── react-dom@19.0.0',
                '└── vite@5.4.0',
            ]),
        };
    }

    if (sub === 'run' && runScript) {
        return { state, lines: [line('error', `npm ERR! Missing script: "${runScript}"`)] };
    }

    return null;
}

export function executeCommand(
    state: ProjectState,
    rawInput: string,
    context: ExecuteContext = { history: [] },
): CommandResult {
    const input = rawInput.trim();
    if (!input) {
        return { state, lines: [] };
    }

    const tokens = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
    const command = tokens[0] ?? '';
    const args = tokens.slice(1).map((t) => t.replace(/^['"]|['"]$/g, ''));
    const joinedArgs = args.join(' ');

    switch (command) {
        case 'help':
            return { state, lines: lines('info', formatHelpByCategory()) };

        case 'search': {
            const query = joinedArgs;
            if (!query) {
                return {
                    state,
                    lines: lines('info', [
                        '使い方: search <キーワード>',
                        '例: search git / search デプロイ / search ファイル',
                    ]),
                };
            }
            const results = searchCommands(query);
            return { state, lines: lines('output', formatSearchResults(query, results)) };
        }

        case 'man': {
            const query = joinedArgs;
            if (!query) {
                return { state, lines: [line('error', 'man: missing command name')] };
            }
            const entry = findCommandEntry(query);
            if (!entry) {
                return { state, lines: [line('error', `man: No manual entry for '${query}'. Try 'search ${query}'`)] };
            }
            return { state, lines: lines('output', formatManPage(entry)) };
        }

        case 'history':
            if (!context.history.length) {
                return { state, lines: [line('output', '(no history yet)')] };
            }
            return {
                state,
                lines: lines(
                    'output',
                    context.history
                        .slice()
                        .reverse()
                        .map((cmd, i) => `  ${String(i + 1).padStart(4)}  ${cmd}`),
                ),
            };

        case 'reset': {
            const next = createInitialState();
            return { state: next, lines: [] };
        }

        case 'node': {
            if (!state.nodeInstalled) {
                return commandNotFound(state, 'node');
            }
            if (args[0] === '-v' || args[0] === '--version') {
                return { state, lines: [line('output', 'v20.11.0')] };
            }
            if (!args.length) {
                return {
                    state,
                    lines: [
                        line('output', 'Usage: node [options] [ script.js ]'),
                        line('output', '       node -e "console.log(\'Hello World\')"'),
                        line('output', ''),
                        line('output', 'Options:'),
                        line('output', '  -v, --version  print Node.js version'),
                    ],
                };
            }
            return { state, lines: [line('error', `node:internal/modules/cjs/loader:1053\n  throw err;\n  ^\n\nError: Cannot find module '${args[0]}'\n`)] };
        }

        case 'pwd':
            return { state, lines: [line('output', state.cwd)] };

        case 'whoami':
            return { state, lines: [line('output', state.env.USER ?? 'demo')] };

        case 'date':
            return { state, lines: [line('output', new Date().toString())] };

        case 'which': {
            if (!args[0]) return { state, lines: [line('error', 'which: missing argument')] };
            const nodeTools = new Set(['node', 'npm', 'npx']);
            if (nodeTools.has(args[0]) && !state.nodeInstalled) {
                return { state, lines: [line('error', `${args[0]} not found`)] };
            }
            const paths: Record<string, string> = {
                node: '/usr/local/bin/node',
                npm: '/usr/local/bin/npm',
                git: '/usr/bin/git',
                npx: '/usr/local/bin/npx',
            };
            const found = paths[args[0]];
            return {
                state,
                lines: found ? [line('output', found)] : [line('error', `${args[0]} not found`)],
            };
        }

        case 'env':
            return {
                state,
                lines: lines('output', Object.entries(state.env).map(([k, v]) => `${k}=${v}`)),
            };

        case 'export': {
            const match = joinedArgs.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
            if (!match) {
                return { state, lines: [line('error', 'export: invalid format. Use export VAR=value')] };
            }
            const [, key, value] = match;
            return {
                state: { ...state, env: { ...state.env, [key]: value } },
                lines: [],
            };
        }

        case 'ls': {
            const showAll = args.includes('-la') || args.includes('-a') || args.includes('-l');
            const pathArg = args.find((a) => !a.startsWith('-')) ?? '.';
            const entries = listDir(state, pathArg);
            if (!entries.length && pathArg !== '.') {
                return { state, lines: [line('error', `ls: ${pathArg}: No such file or directory`)] };
            }
            const names = entries
                .filter((e) => showAll || !e.name.startsWith('.'))
                .map((e) => (e.type === 'dir' ? `${e.name}/` : e.name));
            if (showAll) names.unshift('.', '..');
            return { state, lines: [line('output', names.join('  ') || '(empty)')] };
        }

        case 'cd': {
            if (!args[0]) {
                const next = changeDirectory(state, '~');
                if ('error' in next) return { state, lines: [line('error', next.error)] };
                return { state: next, lines: [] };
            }
            const next = changeDirectory(state, args[0]);
            if ('error' in next) return { state, lines: [line('error', next.error)] };
            return { state: next, lines: [] };
        }

        case 'cat': {
            if (!args[0]) return { state, lines: [line('error', 'cat: missing file operand')] };
            const content = readFile(state, args[0]);
            if (content === null) {
                return { state, lines: [line('error', `cat: ${args[0]}: No such file or directory`)] };
            }
            return { state, lines: lines('output', content.split('\n')) };
        }

        case 'head': {
            if (!args[0]) return { state, lines: [line('error', 'head: missing file operand')] };
            const content = readFile(state, args[0]);
            if (content === null) {
                return { state, lines: [line('error', `head: ${args[0]}: No such file or directory`)] };
            }
            return { state, lines: lines('output', content.split('\n').slice(0, 10)) };
        }

        case 'tail': {
            if (!args[0]) return { state, lines: [line('error', 'tail: missing file operand')] };
            const content = readFile(state, args[0]);
            if (content === null) {
                return { state, lines: [line('error', `tail: ${args[0]}: No such file or directory`)] };
            }
            return { state, lines: lines('output', content.split('\n').slice(-10)) };
        }

        case 'wc': {
            if (!args[0]) return { state, lines: [line('error', 'wc: missing file operand')] };
            const content = readFile(state, args[0]);
            if (content === null) {
                return { state, lines: [line('error', `wc: ${args[0]}: No such file or directory`)] };
            }
            const lineCount = content.split('\n').length;
            const wordCount = content.split(/\s+/).filter(Boolean).length;
            const byteCount = new TextEncoder().encode(content).length;
            return {
                state,
                lines: [line('output', `  ${lineCount}  ${wordCount} ${byteCount} ${args[0]}`)],
            };
        }

        case 'grep': {
            if (!args[0] || !args[1]) {
                return { state, lines: [line('error', 'grep: usage: grep <pattern> <file>')] };
            }
            const content = readFile(state, args[1]);
            if (content === null) {
                return { state, lines: [line('error', `grep: ${args[1]}: No such file or directory`)] };
            }
            const pattern = args[0].toLowerCase();
            const matched = content.split('\n').filter((l) => l.toLowerCase().includes(pattern));
            if (!matched.length) return { state, lines: [line('output', '(no matches)')] };
            return { state, lines: lines('output', matched) };
        }

        case 'find': {
            const nameIdx = args.indexOf('-name');
            const pattern = nameIdx >= 0 ? args[nameIdx + 1]?.replace(/^['"]|['"]$/g, '') : '*';
            if (!pattern) {
                return { state, lines: [line('error', 'find: -name requires an argument')] };
            }
            const results = findFiles(state, pattern);
            if (!results.length) return { state, lines: [line('output', '(no matches)')] };
            return { state, lines: lines('output', results) };
        }

        case 'tree': {
            const tree = buildTree(state);
            const output = ['.'];
            function render(entries: ReturnType<typeof buildTree>, prefix = '') {
                entries.forEach((entry, index) => {
                    const isLast = index === entries.length - 1;
                    const branch = isLast ? '└── ' : '├── ';
                    output.push(`${prefix}${branch}${entry.name}${entry.type === 'dir' ? '/' : ''}`);
                    if (entry.children?.length) {
                        const nextPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
                        render(entry.children, nextPrefix);
                    }
                });
            }
            render(tree);
            return { state, lines: lines('output', output) };
        }

        case 'mkdir': {
            const recursive = args.includes('-p') || args.includes('-pv');
            const target = args.find((a) => !a.startsWith('-'));
            if (!target) return { state, lines: [line('error', 'mkdir: missing operand')] };
            const next = createDirectory(state, target, recursive);
            if ('error' in next) return { state, lines: [line('error', next.error)] };
            return { state: next, lines: [] };
        }

        case 'touch': {
            if (!args[0]) return { state, lines: [line('error', 'touch: missing file operand')] };
            const next = createFile(state, args[0]);
            if ('error' in next) return { state, lines: [line('error', next.error)] };
            return { state: next, lines: [] };
        }

        case 'cp': {
            if (!args[0] || !args[1]) {
                return { state, lines: [line('error', 'cp: missing file operand')] };
            }
            const next = copyPath(state, args[0], args[1]);
            if ('error' in next) return { state, lines: [line('error', next.error)] };
            return { state: next, lines: [] };
        }

        case 'mv': {
            if (!args[0] || !args[1]) {
                return { state, lines: [line('error', 'mv: missing file operand')] };
            }
            const next = movePath(state, args[0], args[1]);
            if ('error' in next) return { state, lines: [line('error', next.error)] };
            return { state: next, lines: [] };
        }

        case 'rm': {
            if (!args[0]) return { state, lines: [line('error', 'rm: missing operand')] };
            const recursive = args.includes('-r') || args.includes('-rf');
            const target = args.find((a) => !a.startsWith('-'));
            if (!target) return { state, lines: [line('error', 'rm: missing operand')] };
            const next = removePath(state, target, recursive);
            if ('error' in next) return { state, lines: [line('error', next.error)] };
            return { state: next, lines: [] };
        }

        case 'chmod': {
            if (!args[0] || !args[1]) {
                return { state, lines: [line('error', 'chmod: missing operand')] };
            }
            return { state, lines: [] };
        }

        case 'clear':
            return {
                state: createInitialState(),
                lines: [line('info', '__CLEAR__')],
            };

        case 'echo':
            return { state, lines: [line('output', joinedArgs)] };

        case 'nano':
            return openEditor(state, args[0], 'nano');

        case 'vi':
        case 'vim':
            return openEditor(state, args[0], 'vim');

        case 'code':
            return openEditor(state, args[0], 'code');

        case 'curl': {
            const url = args[0] ?? 'https://api.example.com';
            return {
                state,
                lines: lines('output', [
                    `HTTP/2 200`,
                    `content-type: application/json`,
                    '',
                    `{"status":"ok","message":"Hello from ${url}"}`,
                ]),
            };
        }

        case 'ping': {
            const host = args[0] ?? 'localhost';
            return {
                state,
                lines: lines('output', [
                    `PING ${host}: 56 data bytes`,
                    `64 bytes from ${host}: icmp_seq=0 ttl=64 time=12.3 ms`,
                    `64 bytes from ${host}: icmp_seq=1 ttl=64 time=11.8 ms`,
                    '',
                    `--- ${host} ping statistics ---`,
                    `2 packets transmitted, 2 packets received, 0.0% packet loss`,
                ]),
            };
        }

        case 'brew': {
            if (args[0] === 'install' && args[1] === 'node') {
                if (state.nodeInstalled) {
                    return {
                        state,
                        lines: [line('output', 'Warning: node 20.11.0 is already installed and up-to-date.')],
                    };
                }
                return {
                    state: { ...state, nodeInstalled: true },
                    lines: lines('success', [
                        '==> Fetching downloads for: node',
                        '==> Downloading https://ghcr.io/v2/homebrew/core/node/manifests/20.11.0',
                        '######################################################################### 100.0%',
                        '==> Pouring node--20.11.0',
                        '🍺  /opt/homebrew/Cellar/node/20.11.0: 2,847 files, 89.4MB',
                        '==> Running `brew cleanup node`...',
                        '==> Caveats',
                        'Bash completion has been installed to:',
                        '  /opt/homebrew/etc/bash_completion.d',
                    ]),
                };
            }
            if (args[0] === '--version') {
                return { state, lines: [line('output', 'Homebrew 4.3.0')] };
            }
            return { state, lines: [line('error', `brew: Unknown command: ${args.join(' ')}`)] };
        }

        case 'git': {
            const result = handleGit(state, args, joinedArgs);
            if (result) return result;
            break;
        }

        case 'npm': {
            const result = handleNpm(state, args);
            if (result) return result;
            return { state, lines: [line('error', `npm: Unknown command "${args[0]}"`)] };
        }

        case 'npx': {
            if (!state.nodeInstalled) {
                return commandNotFound(state, 'npx');
            }
            const pkg = args[0] ?? 'vercel';
            return {
                state,
                lines: lines('output', [
                    `Need to install the following packages:`,
                    `${pkg}@latest`,
                    `Ok to proceed? (y) y`,
                    '',
                    `${pkg}@latest`,
                ]),
            };
        }

        default:
            return {
                state,
                lines: [
                    line('error', `${command}: command not found`),
                    line('info', "'search <キーワード>' でコマンドを検索できます"),
                ],
            };
    }

    return { state, lines: [line('error', 'Unknown error')] };
}

export function getWelcomeLines(): TerminalLine[] {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n: number) => String(n).padStart(2, '0');
    const login = `Last login: ${days[now.getDay()]} ${months[now.getMonth()]} ${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} on ttys000`;
    return [line('output', login)];
}

export { formatPrompt };
