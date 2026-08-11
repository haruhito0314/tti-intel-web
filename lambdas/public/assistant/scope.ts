import {
  isBareEmpathyRemark,
  isCasualConversation,
  shouldUseFollowUpHistory,
} from './smallTalk.js';
import { normalizeSearchText } from './runtimeCatalog.js';
import type { HistoryMessage } from './types.js';

export type AssistantScope =
  | 'circle' | 'site' | 'university' | 'conversation' | 'out_of_scope';

export interface AssistantScopeDecision {
  scope: AssistantScope;
  contextualFollowUp: boolean;
}

const CIRCLE_ALIAS = /このサークル|aiサークル|tti intelligence|ttiインテリジェンス/;
const UNIVERSITY_ALIAS = /豊田工業大学|豊工大|豊田工大|toyota technological institute/;
const UNIVERSITY_OFFICIALITY = /大学(?:の)?公式|大学(?:に)?公認|大学.*認定|大学(?:が|の)?運営/;
const OTHER_ORGANIZATION = /大学|university|株式会社|会社|企業|協会|財団|法人|学校|高校|研究所|クラブ|チーム/;
const OTHER_NAMED_CIRCLE = /^.+の(?:サークル|部活|同好会)/;
const CIRCLE_NOUN_OR_ANCHOR = /サークル|同好会|部活|discord/;
const CIRCLE_ACTION = /活動|何してる|なにしてる|参加|入りたい|入会|加入|見学|メンバー|部員|人数|会費|参加費|連絡先|問い合わせ|コミュニティ|作品|制作物/;
const SITE_ALIAS = /このサイト|このページ|サイトマップ|ページ一覧|アプリ一覧|開発について|開発ページ|ナビゲーション|ここ(?:は|で|に|を|へ|が|の|も|と|から|まで|$)|掲示板|お知らせ|ニュース|今週の数学|カラーソート|color sort|卓球組み合わせ|ai assistant|codex|vercel|aws|plugin|cli|mcp/;
const DEICTIC_PAGE_REFERENCE = /このページ|ここ(?:は|で|に|を|へ|が|の|も|と|から|まで|$)/;
const DYNAMIC_CONTENT_TEXT_ALIAS = /お知らせ|ニュース|掲示板|今週の数学/;
const DYNAMIC_PATH_ALIASES = new Set(['/news', '/board', '/weekly-math']);
const SCOPE_FOLLOW_UP = /^(?:学費|入試|学部)(?:は|も|を|について)?$/;
const FAREWELL = /^(?:さようなら|さよなら|またね|また会おう|じゃあね|bye|goodbye)$/;
const GREETING_OR_ACKNOWLEDGEMENT_PREFIX = /^(?:こんにちは|こんばんは|おはよう(?:ございます)?|はじめまして|よろしく(?:お願いします)?|ありがとう(?:ございます)?|なるほど|了解(?:しました|です)?|はい|うん)(?:[!！?？。．、,，〜~…・:\s]+)+/;

function stripConversationPrefix(message: string): string {
  const normalized = normalizeSearchText(message);
  const stripped = normalized.replace(GREETING_OR_ACKNOWLEDGEMENT_PREFIX, '').trim();
  return stripped.length > 0 ? stripped : normalized;
}

function classifyExplicitScope(message: string, currentPath: string): AssistantScope | null {
  const normalized = stripConversationPrefix(message);

  if (UNIVERSITY_OFFICIALITY.test(normalized) && CIRCLE_ALIAS.test(normalized)) {
    return 'university';
  }
  if (CIRCLE_ALIAS.test(normalized)) {
    return 'circle';
  }
  if (UNIVERSITY_ALIAS.test(normalized)) {
    return 'university';
  }
  if (OTHER_ORGANIZATION.test(normalized)) {
    return 'out_of_scope';
  }
  if (OTHER_NAMED_CIRCLE.test(normalized)) {
    return 'out_of_scope';
  }
  if (CIRCLE_NOUN_OR_ANCHOR.test(normalized)) {
    return 'circle';
  }
  if (DEICTIC_PAGE_REFERENCE.test(normalized) && currentPath.startsWith('/')) {
    return 'site';
  }
  if (SITE_ALIAS.test(normalized)) {
    return 'site';
  }
  if (isCasualConversation(message) && !isBareEmpathyRemark(message)) {
    return 'conversation';
  }
  if (FAREWELL.test(normalized.replace(/[!！?？。．、,，〜~…・]/g, ''))) {
    return 'conversation';
  }
  return null;
}

function scopeFromHistory(history: readonly HistoryMessage[]): AssistantScope | null {
  const previousUserTurn = history.at(-1);
  if (previousUserTurn === undefined) {
    return null;
  }
  const scope = classifyExplicitScope(previousUserTurn.content, '');
  return scope === 'circle' || scope === 'site' || scope === 'university'
    ? scope
    : null;
}

function isScopeFollowUp(message: string): boolean {
  const withoutPunctuation = message.replace(/[!！?？。．、,，〜~…・]/g, '');
  return shouldUseFollowUpHistory(withoutPunctuation)
    || SCOPE_FOLLOW_UP.test(normalizeSearchText(withoutPunctuation));
}

export function classifyAssistantScope(
  message: string,
  currentPath: string,
  history: readonly HistoryMessage[],
): AssistantScopeDecision {
  const explicitScope = classifyExplicitScope(message, currentPath);
  if (explicitScope !== null) {
    return { scope: explicitScope, contextualFollowUp: false };
  }

  if (isScopeFollowUp(message)) {
    const historyScope = scopeFromHistory(history);
    if (historyScope !== null) {
      return { scope: historyScope, contextualFollowUp: true };
    }
  }

  if (CIRCLE_ACTION.test(stripConversationPrefix(message))) {
    return { scope: 'circle', contextualFollowUp: false };
  }

  return { scope: 'out_of_scope', contextualFollowUp: false };
}

export function isGenerativeScope(scope: AssistantScope): scope is 'circle' | 'site' {
  return scope === 'circle' || scope === 'site';
}

export function shouldSearchDynamicContent(
  scope: AssistantScope,
  message: string,
  currentPath: string,
): boolean {
  if (!isGenerativeScope(scope)) {
    return false;
  }

  const normalizedMessage = normalizeSearchText(message);
  return DYNAMIC_CONTENT_TEXT_ALIAS.test(normalizedMessage)
    || DYNAMIC_PATH_ALIASES.has(normalizedMessage)
    || DYNAMIC_PATH_ALIASES.has(currentPath);
}
