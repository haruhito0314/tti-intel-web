import { describe, expect, it } from 'vitest';

import { isCasualConversation, isShortFollowUpProbe } from './smallTalk.js';

describe('isCasualConversation', () => {
  it.each([
    'こんにちは',
    'こんにちは！',
    'こんばんは',
    'おはよう',
    'おはようございます',
    'はじめまして',
    'よろしくお願いします',
    'ありがとう',
    'ありがとう！',
    'ありがとうね',
    'ありがとうございます',
    'ありがとうございました',
    'どうもありがとう',
    'どうもありがとうございます',
    'どうもありがとうございました',
    'ありがと',
    'サンキュー',
    'thx',
    '大丈夫',
    '大丈夫です',
    'だいじょうぶ',
    '了解',
    'わかった',
    'わかりました',
    'サイト わかりました',
    'なるほど',
    'ok',
    'Hello',
    'hi',
    'thanks',
    'Thank you!',
  ])('accepts %j', (message) => {
    expect(isCasualConversation(message)).toBe(true);
  });

  it.each([
    '銀河の年齢を教えてください',
    '天気はどう？',
    '今週の数学はどこ？',
    'Instagramある？',
    'こんにちは、費用はかかりますか？',
    'ありがとう、費用はいくら？',
    'サイトについて教えて',
    '会社と提携したい',
    '何が',
    '',
  ])('rejects %j', (message) => {
    expect(isCasualConversation(message)).toBe(false);
  });
});

describe('isShortFollowUpProbe', () => {
  it.each(['何が', '何を', '何の', 'なにが', 'どれ', 'なぜ'])(
    'accepts %j',
    (message) => {
      expect(isShortFollowUpProbe(message)).toBe(true);
    },
  );

  it.each(['何がしたい', '会社', 'サイト'])('rejects %j', (message) => {
    expect(isShortFollowUpProbe(message)).toBe(false);
  });
});
