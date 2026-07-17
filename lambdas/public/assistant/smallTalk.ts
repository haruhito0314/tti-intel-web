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
  'thank you',
  'やあ',
  'ども',
  '大丈夫',
  'だいじょうぶ',
  '大丈夫です',
  'だいじょうぶです',
  '大丈夫だよ',
  'だいじょうぶだよ',
  '了解',
  '了解です',
  '了解しました',
  'りょうかい',
  'わかった',
  'わかりました',
  'オーケー',
  'おけ',
  'おけです',
  'ok',
  'okay',
  'うん',
  'うんうん',
  'はい',
  'はーい',
  'そうなんだ',
  'なるほど',
  'なるほどね',
  'そっか',
  'そうか',
  'いいよ',
  'いいです',
  '問題ない',
  '問題ないです',
  '気にしないで',
  '大丈夫だった',
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
  '大丈夫',
  'だいじょうぶ',
  '了解',
  'わかった',
  'わかりました',
  'オーケー',
  'おけ',
  'なるほど',
  '問題ない',
  'hello',
  'hi ',
  'hey ',
  'thanks',
  'thank you',
  'thx',
  'ok',
  'okay',
] as const;

const CASUAL_PREFIX_RESTS = new Set([
  '',
  'です',
  'だよ',
  'だね',
  'ですよ',
  'でした',
  'ございます',
  'ございました',
  'ね',
  'よ',
  'ー',
  '〜',
]);

/** Safe trailing acknowledgements: "サイト わかりました" should not re-enter guide search. */
const TOPIC_ACK_SUFFIXES = [
  'わかりました',
  'わかった',
  '了解しました',
  '了解です',
  '了解',
  'なるほどです',
  'なるほどね',
  'なるほど',
] as const;

/**
 * Detect short greetings / thanks / acknowledgements that should get a warm
 * nano reply instead of Contact fallback or topic-stuck guide answers.
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

  if (CASUAL_PREFIXES.some((prefix) => {
    if (!normalized.startsWith(prefix)) return false;
    const rest = normalized.slice(prefix.length).trim();
    return CASUAL_PREFIX_RESTS.has(rest);
  })) {
    return true;
  }

  return TOPIC_ACK_SUFFIXES.some((suffix) => {
    if (!normalized.endsWith(suffix)) return false;
    const before = normalized.slice(0, normalized.length - suffix.length).trim();
    if (before.length === 0 || before.length > 16) return false;
    // Avoid turning real questions like 「費用は大丈夫」 into small-talk via suffix alone.
    // These suffixes are confirmation-only, not 「大丈夫」.
    return !/[何誰何時どこなぜどう]|か$|？$|\?$/.test(before);
  });
}

/** Short clarifying probes that need prior user history to mean anything. */
export function isShortFollowUpProbe(message: string): boolean {
  const normalized = normalizeSearchText(message)
    .replace(/[!！?？。．、,，〜~…・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return [
    '何が',
    '何を',
    '何の',
    'なにが',
    'なにを',
    'なにの',
    'どれ',
    'どっち',
    'どうやって',
    'なぜ',
    'どうして',
  ].includes(normalized);
}
