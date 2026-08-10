import { describe, expect, it } from 'vitest';

import {
  classifyAssistantScope,
  isGenerativeScope,
  shouldSearchDynamicContent,
} from './scope.js';
import type { HistoryMessage } from './types.js';

describe('classifyAssistantScope', () => {
  it.each([
    ['このサークルについて教えて', 'circle'],
    ['AIサークルに参加したい', 'circle'],
    ['TTI Intelligenceの活動は？', 'circle'],
    ['このサイトは何？', 'site'],
    ['掲示板の使い方を教えて', 'site'],
    ['Codexとは？', 'site'],
    ['Vercel、AWS、Plugin、CLI、MCPを説明して', 'site'],
    ['豊田工業大学について教えて', 'university'],
    ['豊工大の学費は？', 'university'],
    ['こんにちは', 'conversation'],
    ['ありがとう', 'conversation'],
    ['さようなら', 'conversation'],
    ['またね', 'conversation'],
    ['今週の数学を見せて', 'site'],
    ['カラーソートで遊びたい', 'site'],
    ['Color Sortを遊びたい', 'site'],
    ['卓球組み合わせを作りたい', 'site'],
    ['AI Assistantについて教えて', 'site'],
    ['東京の天気は？', 'out_of_scope'],
    ['プログラミングを教えて', 'out_of_scope'],
    ['難しいね', 'out_of_scope'],
  ] as const)('classifies %s as %s', (message, scope) => {
    expect(classifyAssistantScope(message, '/', [])).toEqual({
      scope,
      contextualFollowUp: false,
    });
  });

  it('resolves a deictic circle follow-up from explicit history', () => {
    const history: HistoryMessage[] = [{
      role: 'user',
      content: 'TTI Intelligenceについて教えて',
    }];

    expect(classifyAssistantScope('それに参加したい', '/', history)).toEqual({
      scope: 'circle',
      contextualFollowUp: true,
    });
  });

  it('resolves a deictic university follow-up from explicit history', () => {
    const history: HistoryMessage[] = [{
      role: 'user',
      content: '豊田工業大学について教えて',
    }];

    expect(classifyAssistantScope('学費は？', '/', history)).toEqual({
      scope: 'university',
      contextualFollowUp: true,
    });
  });

  it('uses the current path only for deictic page references', () => {
    expect(classifyAssistantScope('このページは何？', '/development', [])).toMatchObject({
      scope: 'site',
    });
    expect(classifyAssistantScope('カレーの作り方', '/development', [])).toMatchObject({
      scope: 'out_of_scope',
    });
  });

  it('recognizes ordinary Japanese deictic page references without whitespace', () => {
    expect(classifyAssistantScope('ここは何？', '/development', [])).toMatchObject({
      scope: 'site',
    });
    expect(classifyAssistantScope('ここでできることは？', '/development', [])).toMatchObject({
      scope: 'site',
    });
  });

  it('gives university officiality precedence over a circle alias', () => {
    expect(classifyAssistantScope('TTI Intelligenceは大学公認ですか？', '/', [])).toMatchObject({
      scope: 'university',
    });
  });

  it('does not infer Toyoda university without an anchor or explicit history', () => {
    expect(classifyAssistantScope('学費は？', '/', [])).toMatchObject({
      scope: 'out_of_scope',
    });
    expect(classifyAssistantScope('名古屋大学の学費は？', '/', [])).toMatchObject({
      scope: 'out_of_scope',
    });
  });
});

describe('isGenerativeScope', () => {
  it.each([
    ['circle', true],
    ['site', true],
    ['university', false],
    ['conversation', false],
    ['out_of_scope', false],
  ] as const)('returns %s for %s', (scope, expected) => {
    expect(isGenerativeScope(scope)).toBe(expected);
  });
});

describe('shouldSearchDynamicContent', () => {
  it.each([
    ['site', '最新のお知らせは？', '/', true],
    ['circle', '今週の数学は？', '/', true],
    ['site', 'Codexとは？', '/', false],
    ['university', '最新のお知らせは？', '/', false],
    ['conversation', '今週の数学は？', '/', false],
    ['out_of_scope', '/news', '/', false],
    ['site', '確認', '/news', true],
    ['site', '確認', '/board', true],
    ['site', '確認', '/weekly-math', true],
    ['site', '確認', '/news/latest', false],
    ['site', '確認', '/board/thread-1', false],
    ['site', '確認', '/weekly-math/2026-08-10', false],
    ['site', '/news', '/', true],
    ['site', '/news/latest', '/', false],
  ] as const)('returns %s for %s / %s', (scope, message, currentPath, expected) => {
    expect(shouldSearchDynamicContent(scope, message, currentPath)).toBe(expected);
  });
});
