import { describe, expect, it } from 'vitest';
import { executeCommand, saveEditorFile } from './commands';
import { wrapHtmlForPreview } from './htmlPreview';
import { createInitialState, getAboutPagePreview, getUserHtmlPage, readProjectFile } from './virtualFs';

describe('deploy preview content', () => {
    it('shows h1 and p from pages/about.html', () => {
        let state = createInitialState();
        state = executeCommand(state, 'mkdir pages').state;
        state = executeCommand(state, 'cd pages').state;
        const html = '<h1>About Me</h1>\n<p>はじめまして。コマンドラインの練習サイトです。</p>';
        const saved = saveEditorFile(state, 'about.html', html);
        expect('error' in saved).toBe(false);
        if ('error' in saved) return;

        const preview = getAboutPagePreview(saved);
        expect(preview).toEqual({
            title: 'About Me',
            body: 'はじめまして。コマンドラインの練習サイトです。',
            sourcePath: 'pages/about.html',
        });
    });

    it('reads project file by relative path', () => {
        let state = createInitialState();
        state = executeCommand(state, 'mkdir pages').state;
        state = executeCommand(state, 'cd pages').state;
        const saved = saveEditorFile(state, 'about.html', '<h1>Hi</h1>');
        expect('error' in saved).toBe(false);
        if ('error' in saved) return;

        const file = readProjectFile(saved, 'pages/about.html');
        expect(file?.content).toBe('<h1>Hi</h1>');
    });

    it('wraps html fragment for iframe preview', () => {
        const wrapped = wrapHtmlForPreview('<h1>About Me</h1>');
        expect(wrapped).toContain('<h1>About Me</h1>');
        expect(wrapped).toContain('<!DOCTYPE html>');
    });

    it('getUserHtmlPage finds about.html', () => {
        let state = createInitialState();
        state = executeCommand(state, 'mkdir pages').state;
        state = executeCommand(state, 'cd pages').state;
        const saved = saveEditorFile(state, 'about.html', '<h1>Test</h1>');
        expect('error' in saved).toBe(false);
        if ('error' in saved) return;

        expect(getUserHtmlPage(saved)?.sourcePath).toBe('pages/about.html');
    });
});
