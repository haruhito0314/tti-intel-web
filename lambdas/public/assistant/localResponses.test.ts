import { describe, expect, it } from 'vitest';

import { localConversationResponseFor } from './localResponses.js';

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
});
