import { describe, expect, it } from 'vitest';

import { buildDynamicContentQuery, shouldSearchDynamicContent } from './scope.js';
import type { HistoryMessage } from './types.js';

describe('shouldSearchDynamicContent', () => {
  it.each([
    ['最新のお知らせは？', '/', true],
    ['東京の最新ニュースは？', '/', true],
    ['掲示板は投稿していいの？', '/', true],
    ['今週の数学は？', '/', true],
    ['「活動報告」という記事について知りたい', '/', true],
    ['新歓イベントのレポートは？', '/', true],
    ['Codexとは？', '/', false],
    ['豊田工業大学について教えて', '/', false],
    ['こんにちは', '/', false],
    ['確認', '/news', true],
    ['確認', '/board', true],
    ['確認', '/weekly-math', true],
    ['確認', '/news/latest', true],
    ['確認', '/board/thread-1', true],
    ['確認', '/weekly-math/2026-08-10', true],
    ['確認', '/newsletter', false],
    ['/news', '/', true],
    ['/news/latest', '/', true],
  ] as const)('returns %s for %s at %s', (message, currentPath, expected) => {
    expect(shouldSearchDynamicContent(message, currentPath)).toBe(expected);
  });

  const newsConversation: HistoryMessage[] = [
    { role: 'user', content: '最近のお知らせを教えて' },
    { role: 'assistant', content: '「新歓体験会のご案内」という記事があります。詳細も説明できます。' },
  ];

  it.each(['もっと詳しく', '内容は？', '2つ目', '難しいね', 'はい'])(
    'looks up the current article for a contextual follow-up: %s',
    (message) => {
      expect(shouldSearchDynamicContent(message, '/', newsConversation)).toBe(true);
      const query = buildDynamicContentQuery(message, newsConversation);
      expect(query).toContain('最近のお知らせを教えて');
      expect(query).toContain('新歓体験会のご案内');
      expect(query.endsWith(message)).toBe(true);
    },
  );

  it('retains the current topic across multiple clarification turns', () => {
    const history: HistoryMessage[] = [
      ...newsConversation,
      { role: 'user', content: 'それは？' },
      { role: 'assistant', content: '見学希望者向けの体験会です。' },
    ];
    expect(buildDynamicContentQuery('日程は？', history)).toContain('新歓体験会のご案内');
    expect(shouldSearchDynamicContent('日程は？', '/', history)).toBe(true);
  });

  it('uses article references introduced in the assistant answer', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: '最近はどんな活動をしているの？' },
      { role: 'assistant', content: '記事は1.「春の勉強会」、2.「新歓体験会のご案内」です。' },
    ];
    expect(shouldSearchDynamicContent('2つ目を詳しく', '/', history)).toBe(true);
    expect(buildDynamicContentQuery('2つ目を詳しく', history)).toContain('新歓体験会のご案内');
  });

  it('uses link-card titles when the last answer only points to the displayed cards', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: '最近の活動を知りたい' },
      { role: 'assistant', content: 'こちらから確認できます。', references: ['春の勉強会', '新歓体験会のご案内'] },
    ];
    expect(shouldSearchDynamicContent('2つ目を詳しく', '/', history)).toBe(true);
    expect(buildDynamicContentQuery('2つ目を詳しく', history)).toContain('新歓体験会のご案内');
  });

  it.each(['東京の天気は？', 'どんなプロンプトで作っているの？', '参加したい', 'ありがとう'])(
    'does not attach old news to a new request: %s',
    (message) => {
      expect(shouldSearchDynamicContent(message, '/', newsConversation)).toBe(false);
      expect(buildDynamicContentQuery(message, newsConversation)).toBe(message);
    },
  );

  it('stops at the most recent substantive topic instead of searching older news', () => {
    const history: HistoryMessage[] = [
      ...newsConversation,
      { role: 'user', content: 'カラーソートの遊び方を教えて' },
      { role: 'assistant', content: '同じ色のボールを試験管に集めるゲームです。' },
    ];
    expect(shouldSearchDynamicContent('もっと詳しく', '/', history)).toBe(false);
    expect(buildDynamicContentQuery('もっと詳しく', history)).toBe('もっと詳しく');
  });

  it('does not mix an explicit new content topic with the previous article', () => {
    expect(buildDynamicContentQuery('掲示板への投稿方法は？', newsConversation))
      .toBe('掲示板への投稿方法は？');
  });
});
