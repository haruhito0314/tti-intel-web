import rawSiteKnowledge from './knowledge/site-knowledge.json' with { type: 'json' };
import {
  OFFICIAL_SOURCE_LINKS,
  normalizeSearchText,
  resolveCurrentPageId,
} from './runtimeCatalog.js';
import { routingIntentFor, type AssistantRoutingIntent } from './intent.js';
import { shouldUseFollowUpHistory } from './smallTalk.js';
import type {
  HistoryMessage,
  KnowledgeDomain,
  KnowledgeItem,
  OfficialSourceId,
  PageId,
  PublicRouteId,
  RankedKnowledgeItem,
} from './types.js';

export type {
  KnowledgeDomain,
  KnowledgeItem,
  RankedKnowledgeItem,
} from './types.js';

const KNOWLEDGE_DOMAINS: ReadonlySet<KnowledgeDomain> = new Set([
  'site',
  'circle',
  'development',
  'app',
  'game',
  'math',
]);
const VOLATILITY_VALUES = new Set(['stable', 'periodic', 'volatile']);
const OFFICIAL_SOURCE_IDS: ReadonlySet<string> = new Set(
  Object.keys(OFFICIAL_SOURCE_LINKS),
);
const CATALOG_FIELDS = new Set([
  'id',
  'domain',
  'title',
  'summary',
  'details',
  'keywords',
  'sourceIds',
  'asOf',
  'volatility',
]);

function invalidCatalog(catalog: string, reason: string): never {
  throw new TypeError(`Invalid ${catalog} knowledge catalog: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNonEmptyString(value: unknown, field: string, catalog: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalidCatalog(catalog, `${field} must be a non-empty string`);
  }
  return value;
}

function parseNonEmptyStringArray(
  value: unknown,
  field: string,
  catalog: string,
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    return invalidCatalog(catalog, `${field} must be a non-empty array`);
  }
  return value.map((entry, index) => (
    parseNonEmptyString(entry, `${field}[${index}]`, catalog)
  ));
}

function parseSourceIds(
  value: unknown,
  field: string,
  catalog: string,
): OfficialSourceId[] {
  if (!Array.isArray(value)) {
    return invalidCatalog(catalog, `${field} must be an array`);
  }

  const sourceIds: OfficialSourceId[] = [];
  for (const sourceId of value) {
    if (typeof sourceId !== 'string' || !OFFICIAL_SOURCE_IDS.has(sourceId)) {
      return invalidCatalog(catalog, `${field} contains an unknown source ID`);
    }
    if (sourceIds.includes(sourceId as OfficialSourceId)) {
      return invalidCatalog(catalog, `${field} contains a duplicate source ID`);
    }
    sourceIds.push(sourceId as OfficialSourceId);
  }
  return sourceIds;
}

function parseKnowledgeItem(
  value: unknown,
  index: number,
  catalog: string,
): KnowledgeItem {
  const field = `entries[${index}]`;
  if (!isRecord(value)) {
    return invalidCatalog(catalog, `${field} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!CATALOG_FIELDS.has(key)) {
      return invalidCatalog(catalog, `${field} contains unknown field ${key}`);
    }
  }

  if (typeof value.domain !== 'string' || !KNOWLEDGE_DOMAINS.has(value.domain as KnowledgeDomain)) {
    return invalidCatalog(catalog, `${field}.domain is unknown`);
  }
  if (typeof value.volatility !== 'string' || !VOLATILITY_VALUES.has(value.volatility)) {
    return invalidCatalog(catalog, `${field}.volatility is unknown`);
  }
  if (
    value.asOf !== undefined
    && (typeof value.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.asOf))
  ) {
    return invalidCatalog(catalog, `${field}.asOf must use YYYY-MM-DD`);
  }

  return {
    id: parseNonEmptyString(value.id, `${field}.id`, catalog),
    domain: value.domain as KnowledgeDomain,
    title: parseNonEmptyString(value.title, `${field}.title`, catalog),
    summary: parseNonEmptyString(value.summary, `${field}.summary`, catalog),
    details: parseNonEmptyStringArray(value.details, `${field}.details`, catalog),
    keywords: parseNonEmptyStringArray(value.keywords, `${field}.keywords`, catalog),
    sourceIds: parseSourceIds(value.sourceIds, `${field}.sourceIds`, catalog),
    ...(value.asOf === undefined ? {} : { asOf: value.asOf }),
    volatility: value.volatility as KnowledgeItem['volatility'],
  };
}

function parseKnowledgeCatalog(value: unknown, catalog: string): readonly KnowledgeItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    return invalidCatalog(catalog, 'catalog must be a non-empty array');
  }
  const items = value.map((entry, index) => parseKnowledgeItem(entry, index, catalog));
  const seenIds = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.id)) {
      return invalidCatalog(catalog, `catalog contains duplicate ID ${item.id}`);
    }
    seenIds.add(item.id);
  }
  return items;
}

export const SITE_KNOWLEDGE = parseKnowledgeCatalog(rawSiteKnowledge, 'site');
export const STRUCTURED_KNOWLEDGE: readonly KnowledgeItem[] = SITE_KNOWLEDGE;

const allKnowledgeIds = new Set<string>();
for (const item of STRUCTURED_KNOWLEDGE) {
  if (allKnowledgeIds.has(item.id)) {
    invalidCatalog('structured', `catalog contains duplicate ID ${item.id}`);
  }
  allKnowledgeIds.add(item.id);
}

function normalizeKnowledgeText(value: string): string {
  return normalizeSearchText(value)
    .replace(/[!！?？。．、,，:：;；()（）\[\]「」『』〜~…・/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchTokens(value: string): string[] {
  return value.match(/[\p{L}\p{N}@._+-]+/gu) ?? [];
}

function scoreQuery(item: KnowledgeItem, normalizedQuery: string): number {
  if (normalizedQuery.length < 2) return 0;

  const title = normalizeKnowledgeText(item.title);
  const searchable = normalizeKnowledgeText([
    item.title,
    item.summary,
    ...item.details,
  ].join(' '));
  let score = normalizedQuery === title
    ? 18
    : searchable.includes(normalizedQuery)
      ? 6
      : 0;

  const normalizedKeywords = [...new Set(item.keywords.map(normalizeKnowledgeText))];
  for (const keyword of normalizedKeywords) {
    if (!keyword) continue;
    if (normalizedQuery === keyword) {
      score += 24;
    } else if (normalizedQuery.includes(keyword)) {
      score += 12;
    } else if (normalizedQuery.length >= 3 && keyword.includes(normalizedQuery)) {
      score += 8;
    }
  }

  const keywordTokens = new Set(normalizedKeywords.flatMap(searchTokens));
  for (const token of new Set(searchTokens(normalizedQuery))) {
    if (token.length >= 2 && keywordTokens.has(token)) score += 2;
  }

  return score;
}

const DOMAIN_PAGE_IDS: Readonly<Record<KnowledgeDomain, readonly PageId[]>> = {
  site: ['home', 'about', 'apps', 'development', 'contact'],
  circle: ['about'],
  development: ['development'],
  app: ['apps'],
  game: ['game-community'],
  math: ['weekly-math'],
};

function hasCurrentPageBoost(
  item: KnowledgeItem,
  currentPageId: PublicRouteId | null,
): boolean {
  return currentPageId !== null
    && (DOMAIN_PAGE_IDS[item.domain] as readonly PublicRouteId[])
      .includes(currentPageId);
}

function isCircleTopic(normalizedMessage: string): boolean {
  const compactMessage = normalizedMessage.replace(/\s+/g, '');
  return /(?:このサークル|AIサークル|TTIIntelligence|TTIインテリジェンス)/iu.test(compactMessage);
}

export type GenerativeAssistantScope = 'circle' | 'site';

function explicitlyAsksAboutCircleApps(message: string): boolean {
  const normalizedMessage = normalizeKnowledgeText(message).replace(/\s+/g, '');
  const refersToCircle = /(?:このサークル|AIサークル|TTIIntelligence|TTIインテリジェンス)/iu.test(normalizedMessage);
  const refersToAppsOrWorks = /(?:アプリ|作品|制作物|制作|開発|作ったもの|公開中|カラーソート|colorsort|卓球)/iu.test(normalizedMessage);
  return refersToCircle && refersToAppsOrWorks;
}

function allowedInScope(
  item: KnowledgeItem,
  scope: GenerativeAssistantScope,
  message: string,
): boolean {
  if (scope === 'site') return true;
  if (item.domain === 'app') return explicitlyAsksAboutCircleApps(message);
  return ['circle', 'game', 'math'].includes(item.domain);
}

/**
 * Deterministically selects reviewed facts. Catalog order is the final
 * tie-breaker so equal scores remain stable across runs.
 */
export function selectStructuredKnowledge(
  message: string,
  currentPath: string,
  history: readonly HistoryMessage[],
  limit = 5,
  contextualFollowUp = false,
  scope: GenerativeAssistantScope = 'site',
): RankedKnowledgeItem[] {
  const normalizedMessage = normalizeKnowledgeText(message);
  const normalizedHistory = history
    .slice(-2)
    .map(({ content }) => normalizeKnowledgeText(content))
    .filter(Boolean);
  const currentPageId = resolveCurrentPageId(currentPath);
  const circleTopic = isCircleTopic(normalizedMessage);
  const circleAppQuestion = explicitlyAsksAboutCircleApps(message);

  const ranked = STRUCTURED_KNOWLEDGE
    .map((item, catalogIndex) => {
      const messageScore = scoreQuery(item, normalizedMessage);
      const historyScore = Math.max(0, ...normalizedHistory.map((query) => scoreQuery(item, query)));
      const score = messageScore
        + (contextualFollowUp ? historyScore : 0)
        + (messageScore > 0 && hasCurrentPageBoost(item, currentPageId) ? 3 : 0)
        + (circleTopic && item.domain === 'circle' ? 100 : 0)
        + (circleAppQuestion && item.domain === 'app' ? 100 : 0);
      return { item, score, catalogIndex };
    })
    .filter(({ score }) => score >= 10)
    .sort((left, right) => (
      right.score - left.score || left.catalogIndex - right.catalogIndex
    ))
    .filter(({ item }) => allowedInScope(item, scope, message))
    .slice(0, 5);

  const requestedLimit = Number.isFinite(limit)
    ? Math.min(5, Math.max(0, Math.floor(limit)))
    : 5;
  return ranked.slice(0, requestedLimit).map(({ item, score }) => ({ item, score }));
}

export interface AssistantRequestContext {
  knowledge: RankedKnowledgeItem[];
  routingIntent: AssistantRoutingIntent;
}

const CONTEXT_DEPENDENT_KEYWORDS = new Set([
  '場所',
  '住所',
  '所在地',
  'アクセス',
  '交通',
  '行き方',
  '正式名称',
  '英語名',
  '略称',
  '初心者',
  '未経験',
  '参加',
  '活動日',
  '費用',
  '無料',
  '問い合わせ',
]);

function hasDirectCurrentTopic(
  message: string,
  knowledge: readonly RankedKnowledgeItem[],
): boolean {
  const normalizedMessage = normalizeKnowledgeText(message);
  return knowledge.some(({ item }) => item.keywords.some((keyword) => {
    const normalizedKeyword = normalizeKnowledgeText(keyword);
    return normalizedKeyword.length >= 2
      && !CONTEXT_DEPENDENT_KEYWORDS.has(normalizedKeyword)
      && normalizedMessage.includes(normalizedKeyword);
  }));
}

function isProbeCompatibleWithDomain(
  message: string,
  domain: KnowledgeDomain,
): boolean {
  const normalizedMessage = normalizeKnowledgeText(message).replace(/\s+/g, '');
  if (/^(?:住所|所在地|アクセス)/.test(normalizedMessage)) {
    return domain === 'circle';
  }
  if (/^(?:答え|解答|ヒント|解説)/.test(normalizedMessage)) {
    return domain === 'math';
  }
  return true;
}

/** Select knowledge and history once, then share that decision with Luna. */
export function selectAssistantRequestContext(
  message: string,
  currentPath: string,
  history: readonly HistoryMessage[],
  scope: GenerativeAssistantScope,
  limit = 5,
): AssistantRequestContext {
  const currentKnowledge = selectStructuredKnowledge(
    message,
    currentPath,
    [],
    limit,
    false,
    scope,
  );
  let followUpKnowledge: RankedKnowledgeItem[] = [];
  let resolvedFollowUp = false;

  if (
    history.length > 0
    && shouldUseFollowUpHistory(message)
    && !hasDirectCurrentTopic(message, currentKnowledge)
  ) {
    const latestHistoryKnowledge = selectStructuredKnowledge(
      history.at(-1)?.content ?? '',
      '',
      [],
      limit,
      false,
      scope,
    ).filter(({ item }) => allowedInScope(item, scope, message));
    const latestDomain = latestHistoryKnowledge[0]?.item.domain;
    if (
      latestDomain !== undefined
      && isProbeCompatibleWithDomain(message, latestDomain)
    ) {
      const combinedKnowledge = selectStructuredKnowledge(
        message,
        currentPath,
        history,
        limit,
        true,
        scope,
      );
      followUpKnowledge = combinedKnowledge.filter(
        ({ item }) => item.domain === latestDomain,
      );
      if (followUpKnowledge.length === 0) {
        followUpKnowledge = latestHistoryKnowledge;
      }
    }
    resolvedFollowUp = followUpKnowledge.length > 0;
  }

  const routingIntent = routingIntentFor(
    message,
    history,
    resolvedFollowUp,
  );
  const knowledge = resolvedFollowUp ? followUpKnowledge : currentKnowledge;

  return { knowledge, routingIntent };
}
