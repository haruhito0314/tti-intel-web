import {
    COMMAND_CATALOG,
    getCompletionCommands,
} from './commandCatalog';
import { listDir, type ProjectState } from './virtualFs';

const GIT_SUBCOMMANDS = [
    'init', 'status', 'add', 'commit -m', 'log', 'diff', 'branch',
    'checkout -b', 'push', 'pull', 'remote -v', 'clone',
];

const BREW_COMMANDS = ['install node', '--version'];

const HOMEBREW_INSTALL_SNIPPET = 'curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh';

const NPM_COMMANDS = [
    'install', 'i', 'start', 'test', 'list --depth=0',
    'run dev', 'run build', 'run deploy', 'run lint',
];

const NPX_PACKAGES = ['vercel', 'create-vite', 'eslint'];

function getPathCompletions(state: ProjectState, partial: string): string[] {
    const parts = partial.split(/\s+/);
    const prefix = parts.slice(0, -1).join(' ');
    const last = parts.at(-1) ?? '';

    let dirPath = '.';
    let filePrefix = last;

    if (last.includes('/')) {
        const idx = last.lastIndexOf('/');
        dirPath = last.slice(0, idx) || '.';
        filePrefix = last.slice(idx + 1);
    }

    const entries = listDir(state, dirPath);
    const matches = entries
        .filter((e) => e.name.startsWith(filePrefix))
        .map((e) => {
            const base = dirPath === '.' ? '' : `${dirPath}/`;
            return `${base}${e.name}${e.type === 'dir' ? '/' : ''}`;
        });

    if (!prefix) return matches;
    return matches.map((m) => `${prefix} ${m}`);
}

export function getCompletions(state: ProjectState, input: string): string[] {
    const trimmed = input.trimStart();
    if (!trimmed) return getCompletionCommands();

    const parts = trimmed.split(/\s+/);

    if (parts.length === 1) {
        return getCompletionCommands().filter((cmd) => cmd.startsWith(trimmed));
    }

    const isPathCommand = ['cd', 'cat', 'head', 'tail', 'wc', 'grep', 'mkdir', 'touch', 'cp', 'mv', 'rm', 'chmod', 'ls', 'nano', 'vim', 'vi', 'code']
        .includes(parts[0])
        || (parts[0] === 'git' && parts[1] === 'add');

    if (isPathCommand) {
        const partial = parts.slice(1).join(' ');
        return getPathCompletions(state, partial);
    }

    if (parts[0] === 'man' || parts[0] === 'search') {
        const sub = parts.slice(1).join(' ');
        if (!sub) {
            return COMMAND_CATALOG.map((e) => `${parts[0]} ${e.command}`).filter((c) => c.startsWith(trimmed));
        }
        return COMMAND_CATALOG
            .filter((e) => e.command.includes(sub) || e.summary.includes(sub))
            .map((e) => `${parts[0]} ${e.command}`)
            .filter((c) => c.startsWith(trimmed));
    }

    if (parts[0] === 'which') {
        return ['node', 'npm', 'git', 'npx'].map((c) => `which ${c}`).filter((c) => c.startsWith(trimmed));
    }

    if (parts[0] === 'git') {
        const sub = parts[1] ?? '';
        if (parts.length === 2) {
            return GIT_SUBCOMMANDS
                .filter((c) => c.startsWith(sub))
                .map((c) => `git ${c}`);
        }
        if (parts[1] === 'commit' && parts.length === 3 && parts[2] === '-m') {
            return ['git commit -m "Initial commit"'];
        }
        if (parts[1] === 'checkout' && parts[2] === '-b' && parts.length === 3) {
            return ['git checkout -b feature/new'];
        }
        if (parts[1] === 'remote' && parts.length === 2) {
            return ['git remote -v', 'git remote add origin https://github.com/demo/my-website.git'];
        }
        if (parts[1] === 'remote' && parts[2] === 'add' && parts.length === 3) {
            return ['git remote add origin https://github.com/demo/my-website.git'];
        }
        if (parts[1] === 'push' && parts.length === 2) {
            return ['git push -u origin main', 'git push'];
        }
        if (parts[1] === 'clone' && parts.length === 2) {
            return ['git clone https://github.com/demo/my-website.git'];
        }
    }

    if (parts[0] === 'curl' && parts.length === 1) {
        return [
            HOMEBREW_INSTALL_SNIPPET,
            'curl https://api.example.com/users',
        ].filter((c) => c.startsWith(trimmed));
    }

    if (parts[0] === '/bin/bash' || trimmed.startsWith('/bin/bash')) {
        return [
            '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
        ].filter((c) => c.startsWith(trimmed));
    }

    if (parts[0] === 'brew') {
        const sub = parts.slice(1).join(' ');
        return BREW_COMMANDS
            .filter((c) => c.startsWith(sub))
            .map((c) => `brew ${c}`)
            .filter((c) => c.startsWith(trimmed));
    }

    if (parts[0] === 'npm') {
        const sub = parts.slice(1).join(' ');
        return NPM_COMMANDS
            .filter((c) => c.startsWith(sub))
            .map((c) => `npm ${c}`)
            .filter((c) => c.startsWith(trimmed));
    }

    if (parts[0] === 'npx') {
        const sub = parts[1] ?? '';
        return NPX_PACKAGES
            .filter((p) => p.startsWith(sub))
            .map((p) => `npx ${p}`);
    }

    if (parts[0] === 'find' && parts.length <= 3) {
        return ['find . -name "*.tsx"', 'find . -name "*.json"'].filter((c) => c.startsWith(trimmed));
    }

    if (parts[0] === 'curl' && parts.length === 1) {
        return ['curl https://api.example.com/users'];
    }

    if (parts[0] === 'ping' && parts.length === 1) {
        return ['ping google.com', 'ping localhost'];
    }

    if (parts[0] === 'export' && parts.length === 1) {
        return ['export NODE_ENV=development', 'export API_URL=https://api.example.com'];
    }

    return getCompletionCommands().filter((cmd) => cmd.startsWith(trimmed));
}

export function getBestCompletion(state: ProjectState, input: string): string | null {
    const trimmed = input.trimStart();
    if (!trimmed) return null;

    const completions = getCompletions(state, input);
    if (!completions.length) return null;

    const common = completions[0];
    if (common.length <= trimmed.length) return null;

    if (common.startsWith(trimmed)) {
        return common.slice(trimmed.length);
    }
    return null;
}
