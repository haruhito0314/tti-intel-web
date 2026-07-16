import { normalizeSearchText } from './knowledge.js';

const CASUAL_EXACT = new Set([
  'こんにちは',
  'こんばんは',
  'おはよう',
  'おはようございます',
  'はじめまして',
  'よろしく',
  'よろしくお願いします',
  'よろしくお願いいたします',
  'ありがとう',
  'ありがとうね',
  'ありがとうよ',
  'ありがと',
  'ありがとね',
  'ありがとうございます',
  'ありがとうございました',
  'どうも',
  'どうもありがとう',
  'どうもありがとうございます',
  'どうもありがとうございました',
  'サンキュー',
  'さんきゅー',
  'サンキュ',
  'thx',
  'ty',
  'お疲れ',
  'お疲れさま',
  'お疲れ様',
  'お疲れ様です',
  'ハロー',
  'hello',
  'hi',
  'hey',
  'thanks',
  'thanks!',
  'thank you',
  'thank you!',
  'やあ',
  'ども',
]);

const CASUAL_PREFIXES = [
  'こんにちは',
  'こんばんは',
  'おはよう',
  'はじめまして',
  'よろしく',
  'ありがとう',
  'ありがと',
  'どうもありがとう',
  'サンキュー',
  'さんきゅー',
  'お疲れ',
  'hello',
  'hi ',
  'hey ',
  'thanks',
  'thank you',
  'thx',
] as const;

const CASUAL_PREFIX_RESTS = new Set([
  '',
  'です',
  'ございます',
  'ございました',
  'ね',
  'よ',
  'ー',
  '〜',
  '!',
]);

/**
 * Detect short greetings / thanks that should get a warm nano reply
 * instead of the fixed Contact fallback. Keep this narrow so unrelated
 * questions still avoid an OpenAI call.
 */
export function isCasualConversation(message: string): boolean {
  const normalized = normalizeSearchText(message)
    .replace(/[!！?？。．、,，〜~…・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > 40) {
    return false;
  }

  if (CASUAL_EXACT.has(normalized)) {
    return true;
  }

  return CASUAL_PREFIXES.some((prefix) => {
    if (!normalized.startsWith(prefix)) return false;
    const rest = normalized.slice(prefix.length).trim();
    return CASUAL_PREFIX_RESTS.has(rest);
  });
}
