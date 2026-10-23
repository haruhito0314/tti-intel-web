import { describe, expect, it } from 'vitest';

import { localConversationResponseFor } from './localResponses.js';
import type { HistoryMessage } from './types.js';

describe('localConversationResponseFor', () => {
  it.each([
    ['greeting', 'こんにちは！', 'こんにちは！TTI Intelligenceや、このサイトについて案内できます。'],
    ['thanks', 'ありがとうございます', 'どういたしまして！'],
    ['farewell', 'またね', 'またいつでも聞いてください。'],
    ['acknowledgement', '了解です', '了解です！'],
  ])('returns a short %s response', (_kind, message, answer) => {
    expect(localConversationResponseFor(message)).toEqual({ answer, links: [] });
  });

  it.each([
    'このサイトでは何があるの？',
    'お問い合わせってしていいの？',
    'このサークルって普段何をしてる？',
    '掲示板は投稿していいの？',
    '豊田工業大学について教えて',
    '東京の天気は？',
    'こんにちは、活動内容を教えて',
  ])('defers every substantive request to Luna: %s', (message) => {
    expect(localConversationResponseFor(message)).toBeNull();
  });

  const conversation: HistoryMessage[] = [
    { role: 'user', content: '参加するには何が必要？' },
    { role: 'assistant', content: 'まずDiscordで見学の相談ができます。手順を説明しましょうか？' },
  ];

  it.each(['はい', 'うん', 'いいです', 'OK'])(
    'lets the model interpret an acceptance of its previous offer: %s',
    (message) => {
      expect(localConversationResponseFor(message, conversation)).toBeNull();
    },
  );

  it.each(['難しいね', '難しい', 'なるほど', 'それで？'])(
    'does not dismiss a contextual remark with a canned acknowledgement: %s',
    (message) => {
      expect(localConversationResponseFor(message, conversation)).toBeNull();
    },
  );

  it('keeps pure greetings and thanks local even with substantive history', () => {
    expect(localConversationResponseFor('こんにちは！', conversation)?.answer).toContain('こんにちは');
    expect(localConversationResponseFor('ありがとう', conversation)?.answer).toBe('どういたしまして！');
  });

  it('can acknowledge a standalone yes or one following a greeting', () => {
    expect(localConversationResponseFor('はい')?.answer).toBe('了解です！');
    expect(localConversationResponseFor('はい', [
      { role: 'assistant', content: 'こんにちは！' },
    ])?.answer).toBe('了解です！');
  });
});
