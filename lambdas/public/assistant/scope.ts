import { isCasualConversation, shouldUseFollowUpHistory } from './smallTalk.js';
import { normalizeSearchText } from './runtimeCatalog.js';
import type { HistoryMessage } from './types.js';

export type AssistantScope =
  | 'circle' | 'site' | 'university' | 'conversation' | 'out_of_scope';

export interface AssistantScopeDecision {
  scope: AssistantScope;
  contextualFollowUp: boolean;
}

const CIRCLE_ALIAS = /このサークル|aiサークル|tti intelligence|ttiインテリジェンス/;
const UNIVERSITY_ALIAS = /豊田工業大学|豊工大|toyota technological institute/;
const UNIVERSITY_OFFICIALITY = /大学公式|大学公認|認定団体|大学が運営/;
const SITE_ALIAS = /このサイト|このページ|(?:^|\s)ここ(?:\s|$)|掲示板|お知らせ|ニュース|codex|vercel|aws|plugin|cli|mcp/;
const DEICTIC_PAGE_REFERENCE = /このページ|(?:^|\s)ここ(?:\s|$)/;
const DYNAMIC_CONTENT_ALIAS = /お知らせ|ニュース|掲示板|今週の数学|\/news|\/board|\/weekly-math/;
const SCOPE_FOLLOW_UP = /^(?:学費|入試|学部)(?:は|も|を|について)?$/;

function classifyExplicitScope(message: string, currentPath: string): AssistantScope | null {
  const normalized = normalizeSearchText(message);

  if (UNIVERSITY_OFFICIALITY.test(normalized) && CIRCLE_ALIAS.test(normalized)) {
    return 'university';
  }
  if (CIRCLE_ALIAS.test(normalized)) {
    return 'circle';
  }
  if (UNIVERSITY_ALIAS.test(normalized)) {
    return 'university';
  }
  if (DEICTIC_PAGE_REFERENCE.test(normalized) && currentPath.startsWith('/')) {
    return 'site';
  }
  if (SITE_ALIAS.test(normalized)) {
    return 'site';
  }
  if (isCasualConversation(message)) {
    return 'conversation';
  }
  return null;
}

function scopeFromHistory(history: readonly HistoryMessage[]): AssistantScope | null {
  for (const entry of [...history].reverse()) {
    const scope = classifyExplicitScope(entry.content, '');
    if (scope === 'circle' || scope === 'site' || scope === 'university') {
      return scope;
    }
  }
  return null;
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
  return DYNAMIC_CONTENT_ALIAS.test(normalizedMessage)
    || /\/(?:news|board|weekly-math)(?:\/|$)/.test(currentPath);
}
