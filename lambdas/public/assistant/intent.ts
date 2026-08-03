import type {
  AssistantPageId,
  HistoryMessage,
} from './types.js';
import {
  shouldOmitAssistantLinks,
  shouldTreatAsFollowUp,
} from './smallTalk.js';

export type ExcludedExternalLink = 'discord' | 'youtube' | 'toyota-ti';

/**
 * Narrow request policy used only to constrain history and verified links.
 * Answer text always comes from the single Luna generation call.
 */
export interface AssistantRoutingIntent {
  requiresHistory: boolean;
  excludedPageIds: AssistantPageId[];
  excludedExternalLinks: ExcludedExternalLink[];
  suppressLinks: boolean;
}

const REJECTION = '(?:ではなく|じゃなくて?|じゃない|ではない|以外|聞いていない|聞いていません|聞いてません|聞いてない|いらない|要らない|必要ない|不要|なし|抜き|除いて|除外|やめて)';

const PAGE_EXCLUSION_ALIASES: readonly [
  AssistantPageId,
  readonly string[],
][] = [
  ['home', ['ホーム', 'トップページ']],
  ['about', ['サークルについてページ', '活動紹介ページ']],
  ['news', ['お知らせ', 'ニュース', '告知']],
  ['apps', ['アプリ一覧', '作品一覧', '制作物一覧']],
  ['development', ['開発ページ', '開発について']],
  ['board', ['掲示板', '匿名投稿']],
  ['contact', ['お問い合わせ', 'お問合せ', '問い合わせ', '問合せ', '問い合わせフォーム', '連絡先', '連絡方法']],
  ['game-community', ['ゲームコミュニティ', 'ゲームページ']],
  ['weekly-math', ['今週の数学', '数学', '数学ページ', '数学のページ']],
  ['table-tennis', ['卓球', '対戦表', '組み合わせ表']],
  ['color-sort', ['カラーソート', '色そろえ', '色をそろえるゲーム']],
];

const EXTERNAL_EXCLUSION_ALIASES: readonly [
  ExcludedExternalLink,
  readonly string[],
][] = [
  ['discord', ['discord', 'ディスコード', 'でぃすこーど', 'ディスコ']],
  ['youtube', ['youtube', 'ユーチューブ']],
  ['toyota-ti', ['豊田工業大学公式', '大学公式', 'toyota technological institute']],
];

function normalizeRoutingText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/[\s\u3000!！?？。．.、,，〜~…・:：;；/／\\()[\]{}「」『』【】"'`´]/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rejectsAlias(value: string, alias: string): boolean {
  const normalizedAlias = normalizeRoutingText(alias);
  return new RegExp(
    `${escapeRegExp(normalizedAlias)}(?:の?(?:リンク|ページ)|は|が)?(?:.{0,12})${REJECTION}`,
  ).test(value);
}

function requiresHistory(
  message: string,
  history: readonly HistoryMessage[],
  usedFollowUpSearch: boolean,
): boolean {
  if (history.length === 0) return false;
  const value = normalizeRoutingText(message);
  const lastUserMessage = normalizeRoutingText(history.at(-1)?.content ?? '');
  const universityLocationFollowUp = (
    /(?:住所|所在地|アクセス)(?:も|は|を|お願い|教えて)?/.test(value)
    && /豊田工業大学|豊田工大|豊工|tti/.test(lastUserMessage)
  );
  const mathAnswerFollowUp = (
    /(?:解答|答え|ヒント|解説)(?:のほう|の方)?(?:は|も|お願い|教えて)?/.test(value)
    && /数学|問題/.test(lastUserMessage)
  );

  return shouldTreatAsFollowUp(message, history, usedFollowUpSearch)
    || universityLocationFollowUp
    || mathAnswerFollowUp;
}

export function routingIntentFor(
  message: string,
  history: readonly HistoryMessage[],
  usedFollowUpSearch = false,
): AssistantRoutingIntent {
  const value = normalizeRoutingText(message);
  const excludedPageIds = PAGE_EXCLUSION_ALIASES
    .filter(([, aliases]) => aliases.some((alias) => rejectsAlias(value, alias)))
    .map(([pageId]) => pageId);
  const excludedExternalLinks = EXTERNAL_EXCLUSION_ALIASES
    .filter(([, aliases]) => aliases.some((alias) => rejectsAlias(value, alias)))
    .map(([externalLink]) => externalLink);
  const suppressLinks = shouldOmitAssistantLinks(message)
    || /(?:リンク|url)(?:は|が)?(?:いらない|要らない|不要|なし|抜き|結構|付けない|つけない|貼らない|載せない|付けず|つけず|貼らず|載せず)|リンクなし|リンク不要/
      .test(value);

  return {
    requiresHistory: requiresHistory(message, history, usedFollowUpSearch),
    excludedPageIds,
    excludedExternalLinks,
    suppressLinks,
  };
}
