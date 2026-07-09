export type FsNodeType = 'file' | 'dir';

export interface FsNode {
    type: FsNodeType;
    content?: string;
    children?: Record<string, FsNode>;
}

export interface GitState {
    initialized: boolean;
    branch: string;
    branches: string[];
    staged: string[];
    commits: { hash: string; message: string }[];
    remoteUrl: string | null;
    pushed: boolean;
}

export interface ProjectState {
    cwd: string;
    root: FsNode;
    systemRoot: FsNode | null;
    git: GitState;
    dependenciesInstalled: boolean;
    brewInstalled: boolean;
    nodeInstalled: boolean;
    built: boolean;
    deployed: boolean;
    deployUrl: string | null;
    devServerRan: boolean;
    env: Record<string, string>;
}

const INITIAL_TREE: FsNode = {
    type: 'dir',
    children: {
        'my-website': {
            type: 'dir',
            children: {
                'package.json': {
                    type: 'file',
                    content: `{
  "name": "my-website",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "vite": "^5.4.0"
  }
}`,
                },
                README: {
                    type: 'file',
                    content: `# My Website

Personal site built with React and Vite.

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\``,
                },
                'index.html': {
                    type: 'file',
                    content: `<!DOCTYPE html>
<html lang="ja">
  <head>
    <title>My Website</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
                },
                src: {
                    type: 'dir',
                    children: {
                        'main.tsx': {
                            type: 'file',
                            content: `import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);`,
                        },
                        'App.tsx': {
                            type: 'file',
                            content: `export function App() {
  return (
    <main>
      <h1>Hello, TTI!</h1>
      <p>コマンドラインから作ったサイトです。</p>
    </main>
  );
}`,
                        },
                        components: {
                            type: 'dir',
                            children: {
                                'Hero.tsx': {
                                    type: 'file',
                                    content: `export function Hero() {
  return <section>Welcome to my site</section>;
}`,
                                },
                            },
                        },
                    },
                },
                public: {
                    type: 'dir',
                    children: {
                        'favicon.ico': { type: 'file', content: '[binary favicon]' },
                    },
                },
            },
        },
    },
};

export function createInitialState(): ProjectState {
    return {
        cwd: '/Users/demo/my-website',
        root: structuredClone(INITIAL_TREE),
        systemRoot: null,
        git: {
            initialized: false,
            branch: 'main',
            branches: ['main'],
            staged: [],
            commits: [],
            remoteUrl: null,
            pushed: false,
        },
        dependenciesInstalled: false,
        brewInstalled: false,
        nodeInstalled: true,
        built: false,
        deployed: false,
        deployUrl: null,
        devServerRan: false,
        env: {
            USER: 'demo',
            HOME: '/Users/demo',
            SHELL: '/bin/zsh',
            NODE_ENV: 'development',
        },
    };
}

function splitPath(path: string): string[] {
    return path.split('/').filter(Boolean);
}

function resolveAbsolutePath(cwd: string, input: string): string {
    if (input.startsWith('/')) {
        return normalizePath(input);
    }
    if (input === '~' || input.startsWith('~/')) {
        const rest = input === '~' ? '' : input.slice(2);
        return normalizePath(`/Users/demo${rest ? `/${rest}` : ''}`);
    }
    return normalizePath(`${cwd}/${input}`);
}

export function normalizePath(path: string): string {
    const parts = splitPath(path);
    const stack: string[] = [];
    for (const part of parts) {
        if (part === '.' || part === '') continue;
        if (part === '..') {
            stack.pop();
        } else {
            stack.push(part);
        }
    }
    return stack.length ? `/${stack.join('/')}` : '/';
}

export function getParentPath(path: string): string {
    const parts = splitPath(path);
    parts.pop();
    return parts.length ? `/${parts.join('/')}` : '/';
}

export function getNodeAtPath(root: FsNode, path: string): FsNode | null {
    const parts = splitPath(path);
    let current: FsNode = root;
    for (const part of parts) {
        if (current.type !== 'dir' || !current.children?.[part]) {
            return null;
        }
        current = current.children[part];
    }
    return current;
}

export function getNodeAtRelativePath(state: ProjectState, input: string): FsNode | null {
    const abs = resolveAbsolutePath(state.cwd, input);
    return getNodeAtAbsolutePath(state, abs);
}

export function getNodeAtAbsolutePath(state: ProjectState, absPath: string): FsNode | null {
    const normalized = normalizePath(absPath);
    if (normalized.startsWith('/opt')) {
        if (!state.systemRoot) return null;
        const rel = normalized.replace(/^\/opt\/?/, '');
        if (!rel) return state.systemRoot;
        return getNodeAtPath(state.systemRoot, rel);
    }
    const rel = normalized.replace(/^\/Users\/demo\/?/, '');
    if (!rel) return state.root;
    return getNodeAtPath(state.root, rel);
}

export function pathExists(state: ProjectState, input: string): boolean {
    return getNodeAtRelativePath(state, input) !== null;
}

export function isDirectory(state: ProjectState, input: string): boolean {
    const node = getNodeAtRelativePath(state, input);
    return node?.type === 'dir';
}

export function listDir(state: ProjectState, input = '.'): { name: string; type: FsNodeType }[] {
    const node = getNodeAtRelativePath(state, input);
    if (!node || node.type !== 'dir' || !node.children) return [];
    return Object.entries(node.children)
        .map(([name, child]) => ({ name, type: child.type }))
        .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
}

export function readFile(state: ProjectState, input: string): string | null {
    const node = getNodeAtRelativePath(state, input);
    if (!node || node.type !== 'file') return null;
    return node.content ?? '';
}

export function changeDirectory(state: ProjectState, input: string): ProjectState | { error: string } {
    const target = resolveAbsolutePath(state.cwd, input);
    if (!target.startsWith('/Users/demo')) {
        return { error: `cd: ${input}: Permission denied` };
    }
    const node = getNodeAtRelativePath(state, input);
    if (!node) {
        return { error: `cd: ${input}: No such file or directory` };
    }
    if (node.type !== 'dir') {
        return { error: `cd: ${input}: Not a directory` };
    }
    return { ...state, cwd: target };
}

export function createDirectory(state: ProjectState, input: string, recursive = false): ProjectState | { error: string } {
    const abs = resolveAbsolutePath(state.cwd, input);
    if (!abs.startsWith('/Users/demo')) {
        return { error: `mkdir: cannot create directory '${input}': Permission denied` };
    }

    const rel = abs.replace(/^\/Users\/demo\/?/, '');
    if (!rel) return { error: `mkdir: cannot create directory '${input}'` };

    if (recursive) {
        return ensureDirectoryPath(state, rel);
    }

    const parts = splitPath(rel);
    const name = parts.at(-1);
    if (!name) return { error: `mkdir: cannot create directory '${input}'` };
    const parentRel = parts.slice(0, -1).join('/');
    const parent = parentRel ? getNodeAtPath(state.root, parentRel) : state.root;

    if (!parent || parent.type !== 'dir' || !parent.children) {
        return { error: `mkdir: cannot create directory '${input}': No such file or directory` };
    }
    if (parent.children[name]) {
        return { error: `mkdir: cannot create directory '${input}': File exists` };
    }

    const next = structuredClone(state);
    const nextParent = parentRel ? getNodeAtPath(next.root, parentRel) : next.root;
    if (!nextParent?.children) return { error: `mkdir: cannot create directory '${input}'` };
    nextParent.children[name] = { type: 'dir', children: {} };
    return next;
}

function ensureDirectoryPath(state: ProjectState, rel: string): ProjectState | { error: string } {
    const parts = splitPath(rel);
    let current = state;
    let pathSoFar = '';

    for (const part of parts) {
        pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
        const node = getNodeAtPath(current.root, pathSoFar);
        if (!node) {
            const created = mkdirAtRootRel(current, pathSoFar);
            if ('error' in created) return created;
            current = created;
        } else if (node.type !== 'dir') {
            return { error: `mkdir: cannot create directory '${part}': File exists` };
        }
    }

    return current;
}

function mkdirAtRootRel(state: ProjectState, rel: string): ProjectState | { error: string } {
    const parts = splitPath(rel);
    const name = parts.at(-1);
    if (!name) return { error: 'mkdir failed' };
    const parentRel = parts.slice(0, -1).join('/');
    const next = structuredClone(state);
    const parent = parentRel ? getNodeAtPath(next.root, parentRel) : next.root;
    if (!parent?.children) return { error: 'mkdir failed' };
    parent.children[name] = { type: 'dir', children: {} };
    return next;
}

export function createFile(state: ProjectState, input: string, content = ''): ProjectState | { error: string } {
    const abs = resolveAbsolutePath(state.cwd, input);
    if (!abs.startsWith('/Users/demo')) {
        return { error: `touch: cannot touch '${input}': Permission denied` };
    }

    const rel = abs.replace(/^\/Users\/demo\/?/, '');
    if (!rel) return { error: `touch: cannot touch '${input}'` };

    const parts = splitPath(rel);
    const name = parts.at(-1);
    if (!name) return { error: `touch: cannot touch '${input}'` };
    const parentRel = parts.slice(0, -1).join('/');
    const parent = parentRel ? getNodeAtPath(state.root, parentRel) : state.root;

    if (!parent || parent.type !== 'dir' || !parent.children) {
        return { error: `touch: cannot touch '${input}': No such file or directory` };
    }

    const next = structuredClone(state);
    const nextParent = parentRel ? getNodeAtPath(next.root, parentRel) : next.root;
    if (!nextParent?.children) return { error: `touch: cannot touch '${input}'` };
    nextParent.children[name] = { type: 'file', content };
    return next;
}

function resolveRelPath(state: ProjectState, input: string): string {
    const abs = resolveAbsolutePath(state.cwd, input);
    return abs.replace(/^\/Users\/demo\/?/, '') || '.';
}

function getParentNode(state: ProjectState, rootRelPath: string): { parent: FsNode; name: string } | { error: string } {
    const parts = splitPath(rootRelPath);
    const name = parts.pop();
    if (!name) return { error: 'invalid path' };
    const parentRel = parts.join('/');
    const parent = parentRel ? getNodeAtPath(state.root, parentRel) : state.root;
    if (!parent || parent.type !== 'dir' || !parent.children) {
        return { error: 'parent not found' };
    }
    return { parent, name };
}

export function removePath(state: ProjectState, input: string, recursive = false): ProjectState | { error: string } {
    const rel = resolveRelPath(state, input);
    if (rel === 'my-website' || rel === '.') {
        return { error: `rm: cannot remove '${input}': Permission denied` };
    }
    const node = getNodeAtRelativePath(state, input);
    if (!node) return { error: `rm: ${input}: No such file or directory` };
    if (node.type === 'dir' && !recursive) {
        return { error: `rm: ${input}: is a directory` };
    }
    const located = getParentNode(state, rel);
    if ('error' in located) return { error: `rm: ${input}: No such file or directory` };
    const next = structuredClone(state);
    const nextRel = resolveRelPath(next, input);
    const nextLocated = getParentNode(next, nextRel);
    if ('error' in nextLocated) return { error: `rm: ${input}: No such file or directory` };
    if (!nextLocated.parent.children) return { error: `rm: ${input}: No such file or directory` };
    delete nextLocated.parent.children[nextLocated.name];
    return next;
}

export function copyPath(state: ProjectState, src: string, dest: string): ProjectState | { error: string } {
    const srcNode = getNodeAtRelativePath(state, src);
    if (!srcNode) return { error: `cp: ${src}: No such file or directory` };
    const destRel = resolveRelPath(state, dest);
    const destLocated = getParentNode(state, destRel);
    if ('error' in destLocated) return { error: `cp: cannot create '${dest}': No such file or directory` };
    if (destLocated.parent.children?.[destLocated.name]) {
        return { error: `cp: '${dest}': File exists` };
    }
    const next = structuredClone(state);
    const nextDestRel = resolveRelPath(next, dest);
    const nextLocated = getParentNode(next, nextDestRel);
    if ('error' in nextLocated) return { error: `cp: cannot create '${dest}'` };
    if (!nextLocated.parent.children) return { error: `cp: cannot create '${dest}'` };
    nextLocated.parent.children[nextLocated.name] = structuredClone(srcNode);
    return next;
}

export function movePath(state: ProjectState, src: string, dest: string): ProjectState | { error: string } {
    const copied = copyPath(state, src, dest);
    if ('error' in copied) return copied;
    return removePath(copied, src, true);
}

export function writeFile(state: ProjectState, input: string, content: string): ProjectState | { error: string } {
    const abs = resolveAbsolutePath(state.cwd, input);
    if (!abs.startsWith('/Users/demo')) {
        return { error: `cannot write to '${input}': Permission denied` };
    }
    const rel = abs.replace(/^\/Users\/demo\/?/, '');
    if (!rel) return { error: `cannot write to '${input}'` };

    const node = rel ? getNodeAtPath(state.root, rel) : null;
    if (!node || node.type !== 'file') {
        return createFile(state, input, content);
    }

    const next = structuredClone(state);
    const fileNode = getNodeAtPath(next.root, rel);
    if (fileNode?.type === 'file') {
        fileNode.content = content;
    }
    return next;
}

export function findFiles(state: ProjectState, pattern: string, base = '.'): string[] {
    const regex = new RegExp(
        `^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
    );
    const results: string[] = [];
    function walk(nodePath: string) {
        const entries = listDir(state, nodePath);
        for (const entry of entries) {
            const rel = nodePath === '.' ? entry.name : `${nodePath}/${entry.name}`;
            if (entry.type === 'dir') {
                if (entry.name !== '.git') walk(rel);
            } else if (regex.test(entry.name) || regex.test(rel)) {
                results.push(`./${rel}`);
            }
        }
    }
    walk(base);
    return results;
}

export function addBrewInstallation(state: ProjectState): ProjectState {
    return {
        ...state,
        brewInstalled: true,
        systemRoot: {
            type: 'dir',
            children: {
                homebrew: {
                    type: 'dir',
                    children: {
                        bin: {
                            type: 'dir',
                            children: {
                                brew: { type: 'file', content: '#!/bin/bash\n# Homebrew' },
                            },
                        },
                        Homebrew: {
                            type: 'dir',
                            children: {
                                'README.md': {
                                    type: 'file',
                                    content: '# Homebrew\n\nPackage manager for macOS (or Linux).',
                                },
                            },
                        },
                        Cellar: { type: 'dir', children: {} },
                        etc: {
                            type: 'dir',
                            children: {
                                'bash_completion.d': { type: 'dir', children: {} },
                            },
                        },
                    },
                },
            },
        },
    };
}

export function addNodeInstallation(state: ProjectState): ProjectState {
    if (!state.brewInstalled || !state.systemRoot) {
        return { ...state, nodeInstalled: true };
    }
    const next = structuredClone(state);
    const homebrew = getNodeAtPath(next.systemRoot!, 'homebrew');
    if (!homebrew?.children) return { ...next, nodeInstalled: true };

    homebrew.children.bin = {
        type: 'dir',
        children: {
            brew: homebrew.children.bin?.children?.brew ?? { type: 'file', content: '#!/bin/bash\n# Homebrew' },
            node: { type: 'file', content: '#!/opt/homebrew/Cellar/node/20.11.0/bin/node' },
            npm: { type: 'file', content: '#!/usr/bin/env node' },
            npx: { type: 'file', content: '#!/usr/bin/env node' },
        },
    };
    homebrew.children.Cellar = {
        type: 'dir',
        children: {
            node: {
                type: 'dir',
                children: {
                    '20.11.0': {
                        type: 'dir',
                        children: {
                            bin: {
                                type: 'dir',
                                children: {
                                    node: { type: 'file', content: '#!/usr/bin/env node' },
                                    npm: { type: 'file', content: '#!/usr/bin/env node' },
                                    npx: { type: 'file', content: '#!/usr/bin/env node' },
                                },
                            },
                            'INSTALL_RECEIPT.json': {
                                type: 'file',
                                content: '{ "homebrew_version": "4.3.0", "used_options": [] }',
                            },
                            include: { type: 'dir', children: {} },
                            lib: { type: 'dir', children: {} },
                        },
                    },
                },
            },
        },
    };

    return { ...next, nodeInstalled: true };
}

export function addNodeModulesFolder(state: ProjectState): ProjectState {
    const next = structuredClone(state);
    const project = getNodeAtPath(next.root, 'my-website');
    if (!project?.children) return next;
    project.children.node_modules = {
        type: 'dir',
        children: {
            '.bin': {
                type: 'dir',
                children: {
                    vite: { type: 'file', content: '#!/usr/bin/env node' },
                },
            },
            react: {
                type: 'dir',
                children: {
                    'package.json': { type: 'file', content: '{ "name": "react", "version": "19.0.0" }' },
                },
            },
            'react-dom': {
                type: 'dir',
                children: {
                    'package.json': { type: 'file', content: '{ "name": "react-dom", "version": "19.0.0" }' },
                },
            },
            vite: {
                type: 'dir',
                children: {
                    'package.json': { type: 'file', content: '{ "name": "vite", "version": "5.4.0" }' },
                },
            },
        },
    };
    project.children['package-lock.json'] = {
        type: 'file',
        content: '{ "name": "my-website", "lockfileVersion": 3, "requires": true, "packages": {} }',
    };
    return next;
}

export function addDistFolder(state: ProjectState): ProjectState {
    const next = structuredClone(state);
    const project = getNodeAtPath(next.root, 'my-website');
    if (!project?.children) return next;
    project.children.dist = {
        type: 'dir',
        children: {
            'index.html': {
                type: 'file',
                content: '<!-- built output -->',
            },
            assets: {
                type: 'dir',
                children: {
                    'index-a1b2c3.js': { type: 'file', content: '// bundled js' },
                    'index-d4e5f6.css': { type: 'file', content: '/* bundled css */' },
                },
            },
        },
    };
    return next;
}

export function addGitFolder(state: ProjectState): ProjectState {
    const next = structuredClone(state);
    const project = getNodeAtPath(next.root, 'my-website');
    if (!project?.children) return next;
    project.children['.git'] = {
        type: 'dir',
        children: {
            HEAD: { type: 'file', content: 'ref: refs/heads/main\n' },
            config: { type: 'file', content: '[core]\n\trepositoryformatversion = 0\n' },
        },
    };
    return next;
}

export interface TreeEntry {
    name: string;
    type: FsNodeType;
    path: string;
    children?: TreeEntry[];
}

export function buildTree(state: ProjectState, basePath = '/Users/demo/my-website'): TreeEntry[] {
    const normalized = normalizePath(basePath);
    let node: FsNode | null;
    if (normalized.startsWith('/opt')) {
        if (!state.systemRoot) return [];
        const rel = normalized.replace(/^\/opt\/?/, '');
        node = rel ? getNodeAtPath(state.systemRoot, rel) : state.systemRoot;
    } else {
        const rel = normalized.replace(/^\/Users\/demo\/?/, '');
        node = rel ? getNodeAtPath(state.root, rel) : state.root;
    }
    if (!node || node.type !== 'dir' || !node.children) return [];

    function walk(current: FsNode, currentPath: string): TreeEntry[] {
        if (!current.children) return [];
        return Object.entries(current.children)
            .sort(([aName, aNode], [bName, bNode]) => {
                if (aNode.type !== bNode.type) return aNode.type === 'dir' ? -1 : 1;
                return aName.localeCompare(bName);
            })
            .map(([name, child]) => {
                const childPath = `${currentPath}/${name}`;
                return {
                    name,
                    type: child.type,
                    path: childPath,
                    children: child.type === 'dir' ? walk(child, childPath) : undefined,
                };
            });
    }

    return walk(node, normalized);
}

export function buildOptTree(state: ProjectState): TreeEntry[] {
    if (!state.systemRoot) return [];
    return buildTree(state, '/opt/homebrew');
}

export function relativeToProject(path: string): string {
    return path.replace(/^\/Users\/demo\/my-website\/?/, '') || '.';
}

export function formatPrompt(cwd: string): string {
    const home = '/Users/demo';
    const display = cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;
    return `demo@tti:${display}$`;
}

export interface AboutPagePreview {
    title: string;
    body: string;
    sourcePath: string;
}

function stripHtmlTags(text: string): string {
    return text.replace(/<[^>]+>/g, '').trim();
}

export function getAboutPagePreview(state: ProjectState): AboutPagePreview | null {
    const file = getUserHtmlPage(state);
    if (!file) return null;

    const titleMatch = file.content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const bodyMatch = file.content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const title = titleMatch ? stripHtmlTags(titleMatch[1]) : 'About';
    const body = bodyMatch ? stripHtmlTags(bodyMatch[1]) : '';

    return { title, body, sourcePath: file.sourcePath };
}

export interface ProjectFileContent {
    sourcePath: string;
    absolutePath: string;
    content: string;
}

export function readProjectFile(state: ProjectState, projectRelativePath: string): ProjectFileContent | null {
    const normalized = projectRelativePath.replace(/^my-website\//, '').replace(/^\.\//, '');
    const absolutePath = `/Users/demo/my-website/${normalized}`;
    const node = getNodeAtAbsolutePath(state, absolutePath);
    if (!node || node.type !== 'file' || node.content === undefined) return null;
    return {
        sourcePath: normalized || projectRelativePath,
        absolutePath,
        content: node.content,
    };
}

export function readProjectFileByAbsolutePath(state: ProjectState, absolutePath: string): ProjectFileContent | null {
    const normalized = normalizePath(absolutePath);
    if (normalized.startsWith('/opt')) {
        const node = getNodeAtAbsolutePath(state, normalized);
        if (!node || node.type !== 'file') return null;
        return {
            sourcePath: normalized,
            absolutePath: normalized,
            content: node.content ?? '',
        };
    }
    const rel = normalized.replace(/^\/Users\/demo\/my-website\/?/, '');
    if (!rel) return null;
    return readProjectFile(state, rel);
}

export function getUserHtmlPage(state: ProjectState): ProjectFileContent | null {
    const candidates = ['pages/about.html', 'about.html'];
    for (const sourcePath of candidates) {
        const file = readProjectFile(state, sourcePath);
        if (file && file.content.trim().length > 0) return file;
        if (file) return file;
    }
    return readProjectFile(state, 'pages/about.html') ?? readProjectFile(state, 'about.html');
}
