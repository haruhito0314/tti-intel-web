import { normalizeSearchText } from './runtimeCatalog.js';

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
  'はいはい',
  'そうなんだ',
  'なるほど',
  'なるほどね',
  'そっか',
  'そうか',
  '難しいね',
  'むずかしいね',
  '難しいな',
  'むずかしいな',
  'いいよ',
  'いいです',
  '問題ない',
  '問題ないです',
  '気にしないで',
  '大丈夫だった',
  'こんちゃ',
  'こんちは',
  'ちわーす',
  'おつ',
  'おつかれ',
  'どもです',
  'そだね',
  '了解っす',
  'りょ',
  'サンクス',
  '助かる',
  '助かります',
  '助かりました',
  '助かりましたー',
  '助かった',
  '助かったー',
  'おっす',
  'おす',
  'おっすー',
  'ありがとぅ',
  'だいじょぶ',
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
 * Design / look compliments about the site UI. These must not route through
 * contact (bug-report) or home tour knowledge just because 「UI」「このサイト」 match.
 */
export function isLookOrDesignRemark(message: string): boolean {
  const normalized = normalizeSearchText(message)
    .replace(/[!！?？。．、,，〜~…・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > 80) {
    return false;
  }

  // Bug / fix requests stay on the contact guide path.
  if (/不具合|バグ|おかしい|崩|重な|見えにく|修正|直して|壊|エラー/.test(normalized)) {
    return false;
  }

  const lookTopic = /ui|ユーアイ|デザイン|見た目|雰囲気|画面|レイアウト|フォント|配色|サイト|ページ/;
  const remarkCue = /っぽい|みたい|感じ|おしゃれ|オシャレ|かっこいい|かわいい|可愛い|きれい|綺麗|素敵|すき|好き|いいね|センス|シンプル|スタイリッシュ|洗練|モダン|ミニマル|apple|アップル|ios/;

  if (!lookTopic.test(normalized) || !remarkCue.test(normalized)) {
    return false;
  }

  // Clear how-to / availability questions are not remarks.
  if (/(教えて|どうすれば|どこから|ありますか|ある\?|できる\?|できますか)/.test(normalized)) {
    return false;
  }

  return true;
}

const BARE_EMPATHY_EXACT = new Set([
  '難しいね',
  'むずかしいね',
  '難しいな',
  'むずかしいな',
  '難しい',
  'むずかしい',
  'なるほど',
  'なるほどね',
  'そっか',
  'そうか',
  'そうなんだ',
  'そだね',
]);

const GREETING_EXACT = new Set([
  'こんにちは',
  'こんばんは',
  'おはよう',
  'おはようございます',
  'はじめまして',
  'よろしく',
  'よろしくお願いします',
  'よろしくお願いいたします',
  'ハロー',
  'hello',
  'hi',
  'hey',
  'やあ',
  'ども',
  'こんちゃ',
  'こんちは',
  'ちわーす',
  'どもです',
]);

const GREETING_PREFIXES = [
  'こんにちは',
  'こんばんは',
  'おはよう',
  'はじめまして',
  'よろしく',
  'hello',
  'hi ',
  'hey ',
] as const;

/**
 * Short empathy / acknowledgement only — reply warmly, no page links or
 * activity CTA (ホームへ誘導すると違和感が出る).
 */
export function isBareEmpathyRemark(message: string): boolean {
  const normalized = normalizeSearchText(message)
    .replace(/[!！?？。．、,，〜~…・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return BARE_EMPATHY_EXACT.has(normalized);
}

export function isGreetingMessage(message: string): boolean {
  const normalized = normalizeSearchText(message)
    .replace(/[!！?？。．、,，〜~…・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (GREETING_EXACT.has(normalized)) {
    return true;
  }

  return GREETING_PREFIXES.some((prefix) => {
    if (!normalized.startsWith(prefix)) return false;
    const rest = normalized.slice(prefix.length).trim();
    return CASUAL_PREFIX_RESTS.has(rest);
  });
}

/**
 * Remarks / thanks / acks / greetings that should get a short reply with no
 * verified links. Soft verbal follow-up is fine; home chips on こんにちは are not.
 */
export function shouldOmitAssistantLinks(message: string): boolean {
  if (isLookOrDesignRemark(message) || isBareEmpathyRemark(message)) {
    return true;
  }
  return isCasualConversation(message);
}

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
    'どこ',
    'いつ',
    'それ',
    'あれ',
    'もっと',
    '詳しく',
    'もっと詳しく',
    'ページ',
    'ページは',
    '詳細',
    '詳細は',
    '内容',
    '内容は',
    'リンクは',
    'urlは',
    '続きは',
    'さっきの',
    '前の',
    'もう一回',
    'もういちど',
  ].includes(normalized);
}

const FOLLOW_UP_PREFIXES = [
  'どこ',
  'いつ',
  'なぜ',
  'どうして',
  'どうやって',
  'どういう',
  'どんな',
  'どう',
  'どれ',
  'どっち',
  'なに',
  '何',
  'それ',
  'あれ',
  'もっと',
  '詳しく',
  'リンク',
  'url',
  '続き',
  'さっき',
  '前の',
  'もう一回',
  'もういちど',
  '具体的',
] as const;

/**
 * These starters also begin full new questions (「どんなプロンプトで…」).
 * Only treat as follow-up when the remainder is empty or a short particle.
 */
const OPEN_QUESTION_PREFIXES = new Set([
  'どんな',
  'どういう',
  'どうやって',
  'なに',
  '何',
  'どう',
]);

const OPEN_QUESTION_RESTS = new Set([
  '',
  'の',
  'こと',
  'やつ',
  '感じ',
  '意味',
  '仕組み',
  'ふう',
  '風',
]);

function hasExplicitLocationSubject(rest: string): boolean {
  return /^に.{2,}(?:が|は)(?:あり|ある|いま)/.test(rest);
}

/** Whether a short clarifier is eligible for local history resolution. */
export function shouldUseFollowUpHistory(message: string): boolean {
  if (isShortFollowUpProbe(message)) {
    return true;
  }

  const normalized = normalizeSearchText(message)
    .replace(/[!！?？。．、,，〜~…・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > 20) {
    return false;
  }

  if (/^(?:それ|その|そこ|あれ|これ)(?:$|は|って|の|を|が|も|どこ|どう|何|なに|場所|詳細|内容|リンク)/.test(normalized)) {
    return true;
  }
  if (/^(?:場所|住所|所在地|英語名|正式名称|答え|解答|ヒント|費用|料金|日程|活動日|会費|参加費|ツール代|サブスク代)(?:も|だけ|は|も?教えて|を(?:教えて|お願い(?:します)?)|お願い(?:します)?)$/.test(normalized)) {
    return true;
  }

  // Longer prefixes first so 「どうやって」 wins over 「どう」.
  const prefixes = [...FOLLOW_UP_PREFIXES].sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (normalized !== prefix && !normalized.startsWith(prefix)) {
      continue;
    }
    const rest = normalized.slice(prefix.length).trim();
    if (prefix === 'どこ' && hasExplicitLocationSubject(rest)) {
      return false;
    }
    if (OPEN_QUESTION_PREFIXES.has(prefix) && !OPEN_QUESTION_RESTS.has(rest)) {
      // Full new question, e.g. 「どんなプロンプトで作ってるの」.
      return false;
    }
    return true;
  }

  return false;
}
