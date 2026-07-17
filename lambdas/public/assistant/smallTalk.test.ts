import { describe, expect, it } from 'vitest';

import { isCasualConversation, isShortFollowUpProbe, shouldTreatAsFollowUp, shouldUseFollowUpHistory } from './smallTalk.js';

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
    'こんちゃ',
    'おつ',
    'りょ',
    'サンクス',
    '助かる',
    '了解っす',
    'だいじょぶ',
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
  it.each([
    '何が',
    '何を',
    '何の',
    'なにが',
    'どれ',
    'なぜ',
    'どこ',
    'どこ？',
    'もっと詳しく',
    'ページ',
    'ページは',
    '詳細',
    '詳細は',
    '内容',
    '内容は',
  ])(
    'accepts %j',
    (message) => {
      expect(isShortFollowUpProbe(message)).toBe(true);
    },
  );

  it.each(['何がしたい', 'どこから見るの？', '会社', 'サイト'])('rejects %j', (message) => {
    expect(isShortFollowUpProbe(message)).toBe(false);
  });
});

describe('shouldUseFollowUpHistory', () => {
  it.each([
    'どこから見るの？',
    'もっと詳しく',
    '何が',
    'それってどこ',
    'どこでAPI見る？',
    'もっと詳しくCLI',
    'ページは？',
    'ページ',
    '詳細は？',
    '内容は？',
    'リンクある？',
    'URLは？',
    '続きは？',
    'さっきの',
    '具体的には？',
  ])('allows short clarifications %j', (message) => {
    expect(shouldUseFollowUpHistory(message)).toBe(true);
  });

  it.each([
    'pythonのコードを書いて',
    '銀河の年齢を教えてください',
    '天気はどう？',
    '宇宙について教えて',
    'APIの使い方',
    'どんなプロンプトで作ってるの',
    'どんな仕組みなの',
    'どうやって入部するの',
    'どんなページがあるの',
    '詳しい内容を教えて',
    'ページについて教えて',
    '内容を教えて',
    '詳細を知りたい',
  ])('rejects out-of-scope or new-topic messages %j', (message) => {
    expect(shouldUseFollowUpHistory(message)).toBe(false);
  });

  it.each([
    'どんなの？',
    'どういうこと？',
    'どうやって？',
  ])('allows bare open-question clarifiers %j', (message) => {
    expect(shouldUseFollowUpHistory(message)).toBe(true);
  });
});

describe('shouldTreatAsFollowUp', () => {
  const mathHistory = [{ role: 'user' as const, content: '今週の数学について教えて' }];

  it.each([
    'webサイトについて教えて',
    'このサイトは何ですか？',
    '会社について教えて',
    'どこから見るの？',
  ])('treats self-contained or longer clarifications as new topics without search hit: %j', (message) => {
    expect(shouldTreatAsFollowUp(message, mathHistory, false)).toBe(false);
  });

  it('treats follow-up search hits as continuations', () => {
    expect(shouldTreatAsFollowUp('どこから見るの？', mathHistory, true)).toBe(true);
  });

  it('treats short probes as continuations even without follow-up search', () => {
    expect(shouldTreatAsFollowUp('どこ？', mathHistory, false)).toBe(true);
  });

  it('returns false when there is no user history', () => {
    expect(shouldTreatAsFollowUp('webサイトについて', [], false)).toBe(false);
  });
});
