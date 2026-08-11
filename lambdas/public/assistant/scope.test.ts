import { describe, expect, it } from 'vitest';

import {
  classifyAssistantScope,
  isGenerativeScope,
  shouldSearchDynamicContent,
} from './scope.js';
import type { HistoryMessage } from './types.js';

describe('classifyAssistantScope', () => {
  it.each([
    ['サークルについて教えて', 'circle'],
    ['サークルって何？', 'circle'],
    ['活動は？', 'circle'],
    ['何してるの？', 'circle'],
    ['参加したい', 'circle'],
    ['見学できますか？', 'circle'],
    ['会費は？', 'circle'],
    ['Discordある？', 'circle'],
    ['このサークルについて教えて', 'circle'],
    ['AIサークルに参加したい', 'circle'],
    ['TTI Intelligenceの活動は？', 'circle'],
    ['このサイトについて教えて', 'site'],
    ['サイトマップは？', 'site'],
    ['ページ一覧は？', 'site'],
    ['アプリ一覧は？', 'site'],
    ['開発について教えて', 'site'],
    ['このサイトは何？', 'site'],
    ['掲示板の使い方を教えて', 'site'],
    ['Codexとは？', 'site'],
    ['Vercel、AWS、Plugin、CLI、MCPを説明して', 'site'],
    ['豊田工業大学について教えて', 'university'],
    ['豊田工業大学のサークル一覧は？', 'university'],
    ['豊田工業大学の公式サイトは？', 'university'],
    ['豊工大の学費は？', 'university'],
    ['豊田工大の学費は？', 'university'],
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
    ['名古屋大学のサークルは？', 'out_of_scope'],
    ['Googleのサークルは？', 'out_of_scope'],
    ['病気の治し方は？', 'out_of_scope'],
    ['おすすめの株は？', 'out_of_scope'],
    ['プログラミングを教えて', 'out_of_scope'],
    ['難しいね', 'out_of_scope'],
  ] as const)('classifies %s as %s', (message, scope) => {
    expect(classifyAssistantScope(message, '/', [])).toEqual({
      scope,
      contextualFollowUp: false,
    });
  });

  it.each([
    ['circle', 'サークルについて教えて'],
    ['site', 'このサイトについて教えて'],
    ['university', '豊田工業大学について教えて'],
  ] as const)('uses only the immediately previous explicit %s turn for a follow-up', (
    scope,
    previousMessage,
  ) => {
    const history: HistoryMessage[] = [
      { role: 'user', content: '東京の天気は？' },
      { role: 'user', content: previousMessage },
    ];

    expect(classifyAssistantScope('それは？', '/', history)).toEqual({
      scope,
      contextualFollowUp: true,
    });
  });

  it('does not reuse an older explicit scope when the immediately previous turn is unrelated', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'サークルについて教えて' },
      { role: 'user', content: '東京の天気は？' },
    ];

    expect(classifyAssistantScope('それは？', '/', history)).toEqual({
      scope: 'out_of_scope',
      contextualFollowUp: false,
    });
  });

  it.each([
    ['豊田工業大学の公式サイトは？', 'university'],
    ['東京の天気は？', 'out_of_scope'],
  ] as const)('lets the explicit current question win over circle history: %s', (message, scope) => {
    const history: HistoryMessage[] = [{
      role: 'user',
      content: 'サークルについて教えて',
    }];

    expect(classifyAssistantScope(message, '/', history)).toEqual({
      scope,
      contextualFollowUp: false,
    });
  });

  it('strips a greeting prefix without losing the substantive circle question', () => {
    expect(classifyAssistantScope('こんにちは、活動は？', '/', [])).toEqual({
      scope: 'circle',
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
    expect(classifyAssistantScope('ここにあるのは？', '/development', [])).toMatchObject({
      scope: 'site',
    });
    expect(classifyAssistantScope('ここを見たい', '/development', [])).toMatchObject({
      scope: 'site',
    });
  });

  it('gives university officiality precedence over a circle alias', () => {
    expect(classifyAssistantScope('TTI Intelligenceは大学公認ですか？', '/', [])).toMatchObject({
      scope: 'university',
    });
  });

  it('recognizes university officiality with an ordinary possessive phrase', () => {
    expect(classifyAssistantScope(
      'TTI Intelligenceは大学の公式サークルですか？',
      '/',
      [],
    )).toMatchObject({ scope: 'university' });
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
