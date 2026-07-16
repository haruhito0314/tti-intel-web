import { describe, expect, it } from 'vitest';

import { isCasualConversation } from './smallTalk.js';

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
    'ありがとうございます',
    'Hello',
    'hi',
    'thanks',
  ])('accepts %j', (message) => {
    expect(isCasualConversation(message)).toBe(true);
  });

  it.each([
    '銀河の年齢を教えてください',
    '天気はどう？',
    '今週の数学はどこ？',
    'Instagramある？',
    'こんにちは、費用はかかりますか？',
    '',
  ])('rejects %j', (message) => {
    expect(isCasualConversation(message)).toBe(false);
  });
});
