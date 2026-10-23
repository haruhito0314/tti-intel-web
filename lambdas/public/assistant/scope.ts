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

const TTI_INTELLIGENCE_ALIAS = /tti intelligence|ttiインテリジェンス/;
const DEICTIC_CIRCLE_ALIAS = /^このサークル/;
const AI_CIRCLE_ALIAS = /aiサークル/;
const UNIVERSITY_ALIAS = /豊田工業大学|豊工大|豊田工大|toyota technological institute/;
const UNIVERSITY_OFFICIALITY = /大学(?:の)?公式|大学(?:に)?公認|大学.*認定|大学(?:が|の)?運営/;
const OTHER_ORGANIZATION = /大学(?!院?生)|university|株式会社|会社|企業|協会|財団|法人|学校|高校|研究所|クラブ|チーム/;
const OTHER_NAMED_CIRCLE = /^(?!aiサークル).+(?:サークル|部活|同好会)/;
const CLEAR_OUT_OF_SCOPE_TOPIC = /天気|天候|気温|降水|株式?|投資|病気|治療|新薬|料理|レシピ/;
const CIRCLE_NOUN_OR_ANCHOR = /サークル|同好会|部活/;
const DISCORD_CIRCLE_INTENT = /^discord(?:(?:は|って)?(?:ある|ありますか)|について|の(?:招待|リンク|url|サーバー)|に(?:参加|入りたい)|招待|リンク|url|サーバー)/;
const CIRCLE_ACTIONS = [
  /^活動(?:内容)?(?:は|って|について|を(?:教えて(?:ください)?|知りたい))?$/,
  /^(?:何|なに)してる(?:の)?$/,
  /^参加(?:したい|できますか|するには|について|方法(?:は|を教えて(?:ください)?)?)?$/,
  /^入りたい$/,
  /^(?:入会|加入)(?:したい|方法(?:は|を教えて(?:ください)?)?|について)?$/,
  /^見学(?:は)?(?:したい|できますか|方法(?:は|を教えて(?:ください)?)?|について)?$/,
  /^(?:メンバー|部員|人数)(?:は|何人|について|を教えて(?:ください)?)?$/,
  /^(?:会費|参加費)(?:は(?:いくら(?:ですか)?)?|について)?$/,
  /^(?:連絡先|問い合わせ)(?:は|について|を教えて(?:ください)?)?$/,
  /^(?:コミュニティ|作品|制作物)(?:は|について|を(?:見たい|教えて(?:ください)?)|に参加したい)?$/,
] as const;
const DEICTIC_SITE_ALIAS = /^(?:このサイト|このページ|ここ(?:は|で|に|を|へ|が|の|も|と|から|まで|$))/;
const SITE_ALIAS = /サイトマップ|ページ一覧|アプリ一覧|^開発について|^開発ページ|(?:サイト|ページ).*(?:ナビゲーション|ナビ|メニュー)|(?:ナビゲーション|ナビ|メニュー).*(?:サイト|ページ)|掲示板|お知らせ|ニュース|今週の数学|カラーソート|color sort|卓球組み合わせ|ai assistant|codex|vercel|aws|plugin|cli|mcp/;
const DYNAMIC_CONTENT_TEXT_ALIAS = /お知らせ|ニュース|掲示板|今週の数学|記事|投稿|スレッド|レポート|イベント|数学の?問題|(?:この|その|あの)問題|^問題(?:は|の|を|について|$)/;
const DYNAMIC_CONTENT_PATH = /(?:^|[\s(（])\/(?:news|board|weekly-math)(?:\/|[?#\s)）]|$)/;
const DYNAMIC_CURRENT_PATH = /^\/(?:news|board|weekly-math)(?:\/|[?#]|$)/;
const SCOPE_FOLLOW_UP = /^(?:学費|入試|学部)(?:は|も|を|について)?$/;
const FAREWELL = /^(?:さようなら|さよなら|またね|また会おう|じゃあね|bye|goodbye)$/;
const GREETING_OR_ACKNOWLEDGEMENT_PREFIX = /^(?:こんにちは|こんばんは|おはよう(?:ございます)?|はじめまして|よろしく(?:お願いします)?|ありがとう(?:ございます)?|なるほど|了解(?:しました|です)?|わかりました|わかった|はい|うん)(?:[!！?？。．、,，〜~…・:\s]+)+/;

function stripConversationPrefix(message: string): string {
  const normalized = normalizeSearchText(message);
  const stripped = normalized.replace(GREETING_OR_ACKNOWLEDGEMENT_PREFIX, '').trim();
  return stripped.length > 0 ? stripped : normalized;
}

function normalizeScopePhrase(message: string): string {
  return stripConversationPrefix(message)
    .replace(/[!！?？。．、,，〜~…・]/g, '')
    .trim();
}

function isCircleAction(message: string): boolean {
  const phrase = normalizeScopePhrase(message);
  return CIRCLE_ACTIONS.some((pattern) => pattern.test(phrase));
}

function classifyContextFreeScope(message: string): AssistantScope | null {
  const normalized = stripConversationPrefix(message);
  const phrase = normalizeScopePhrase(message);

  if (CLEAR_OUT_OF_SCOPE_TOPIC.test(normalized)) return 'out_of_scope';
  if (
    UNIVERSITY_OFFICIALITY.test(normalized)
    && (
      TTI_INTELLIGENCE_ALIAS.test(normalized)
      || DEICTIC_CIRCLE_ALIAS.test(normalized)
      || AI_CIRCLE_ALIAS.test(normalized)
    )
  ) return 'university';
  if (TTI_INTELLIGENCE_ALIAS.test(normalized)) return 'circle';
  if (UNIVERSITY_ALIAS.test(normalized)) return 'university';
  if (DEICTIC_CIRCLE_ALIAS.test(normalized)) return 'circle';
  if (DEICTIC_SITE_ALIAS.test(normalized)) return 'site';
  if (OTHER_ORGANIZATION.test(normalized)) return 'out_of_scope';
  if (OTHER_NAMED_CIRCLE.test(normalized)) return 'out_of_scope';
  if (AI_CIRCLE_ALIAS.test(normalized)) return 'circle';
  if (CIRCLE_NOUN_OR_ANCHOR.test(normalized)) return 'circle';
  if (DISCORD_CIRCLE_INTENT.test(phrase)) return 'circle';
  if (SITE_ALIAS.test(normalized)) return 'site';
  if (isCircleAction(message)) return 'circle';
  if (isCasualConversation(message) && !isBareEmpathyRemark(message)) return 'conversation';
  if (FAREWELL.test(normalized.replace(/[!！?？。．、,，〜~…・]/g, ''))) return 'conversation';
  return null;
}

function scopeFromHistory(history: readonly HistoryMessage[]): AssistantScope | null {
  const previousUserTurn = [...history].reverse().find((turn) => turn.role === 'user');
  if (previousUserTurn === undefined) return null;
  const scope = classifyContextFreeScope(previousUserTurn.content);
  return scope === 'circle' || scope === 'site' || scope === 'university'
    ? scope
    : null;
}

function isScopeFollowUp(message: string): boolean {
  const withoutPunctuation = message.replace(/[!！?？。．、,，〜~…・]/g, '');
  return shouldUseFollowUpHistory(withoutPunctuation)
    || SCOPE_FOLLOW_UP.test(normalizeSearchText(withoutPunctuation));
}

/** @deprecated Evaluator compatibility only; production routing is model-owned. */
export function classifyAssistantScope(
  message: string,
  _currentPath: string,
  history: readonly HistoryMessage[],
): AssistantScopeDecision {
  const explicitScope = classifyContextFreeScope(message);
  if (explicitScope !== null) return { scope: explicitScope, contextualFollowUp: false };
  if (isScopeFollowUp(message)) {
    const historyScope = scopeFromHistory(history);
    if (historyScope !== null) return { scope: historyScope, contextualFollowUp: true };
  }
  return { scope: 'out_of_scope', contextualFollowUp: false };
}

/** @deprecated Evaluator compatibility only; production routing is model-owned. */
export function isGenerativeScope(scope: AssistantScope): scope is 'circle' | 'site' {
  return scope === 'circle' || scope === 'site';
}

function referencesDynamicContent(message: string): boolean {
  const normalized = normalizeSearchText(message);
  return DYNAMIC_CONTENT_TEXT_ALIAS.test(normalized)
    || DYNAMIC_CONTENT_PATH.test(normalized);
}

function isContextualContentFollowUp(message: string): boolean {
  const normalized = normalizeScopePhrase(message);
  if (isBareEmpathyRemark(message)) return true;
  if (/^(?:[1-9]\d*|[一二三四五六七八九十]+)(?:つ目|番目|個目|本目)(?:$|の|を|は|って|が|について)/.test(normalized)) {
    return true;
  }
  if (/^(?:最初|最後)(?:の|を|は|って|について)/.test(normalized)) return true;
  if (/^(?:はい|うん|お願いします|お願い|続けて|理解できない|よく[分わ]からない|[分わ]からない)$/.test(normalized)) {
    return true;
  }

  // A complete new subject must not inherit an older article merely because it
  // starts with a word such as 「それ」 or 「どう」.
  const explicitScope = classifyContextFreeScope(message);
  if (
    explicitScope !== null
    && explicitScope !== 'conversation'
    && !referencesDynamicContent(message)
  ) return false;
  return shouldUseFollowUpHistory(message);
}

/** Resolve only the active topic, ending at the nearest substantive user turn. */
function dynamicFollowUpContext(
  message: string,
  history: readonly HistoryMessage[],
): readonly HistoryMessage[] {
  if (!isContextualContentFollowUp(message)) return [];

  const context: HistoryMessage[] = [];
  for (const turn of history.slice(-12).reverse()) {
    if (turn.role === 'user' && !isContextualContentFollowUp(turn.content)) {
      context.unshift(turn);
      break;
    }
    context.unshift(turn);
  }

  return context.some((turn) => turn.references?.length || referencesDynamicContent(turn.content)) ? context : [];
}

/** Include the article titles / selected item in the last answer for follow-ups. */
export function buildDynamicContentQuery(
  message: string,
  history: readonly HistoryMessage[] = [],
): string {
  const context = dynamicFollowUpContext(message, history);
  if (context.length === 0) return message;
  return [...context.map((turn) => [turn.content.slice(0, 1_600), ...(turn.references ?? [])].join('\n')), message]
    .join('\n')
    .slice(-6_000);
}

/** Dynamic lookup is optional context and must never pre-classify the answer scope. */
export function shouldSearchDynamicContent(
  message: string,
  currentPath: string,
  history: readonly HistoryMessage[] = [],
): boolean {
  return referencesDynamicContent(message)
    || DYNAMIC_CURRENT_PATH.test(currentPath)
    || dynamicFollowUpContext(message, history).length > 0;
}
