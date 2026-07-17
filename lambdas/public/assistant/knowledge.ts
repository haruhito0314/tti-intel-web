import rawGuideEntries from './knowledge/site-guide.json' with { type: 'json' };
import { PAGE_IDS } from './types.js';
import type {
  AssistantLink,
  Audience,
  ContentKind,
  GuideEntry,
  GuideFaq,
  PageId,
  RankedContentEntry,
  RankedGuideEntry,
} from './types.js';

export const KNOWN_PAGE_ROUTES = {
  home: { title: 'ホーム', href: '/' },
  about: { title: 'サークルについて', href: '/about' },
  news: { title: 'お知らせ', href: '/news' },
  apps: { title: 'アプリ', href: '/app' },
  development: { title: '開発について', href: '/development' },
  board: { title: '掲示板', href: '/board' },
  contact: { title: 'お問い合わせ', href: '/contact' },
  'game-community': { title: 'ゲームコミュニティ', href: '/game-community' },
  'weekly-math': { title: '今週の数学', href: '/weekly-math' },
  'table-tennis': { title: 'Table Tennis Match Maker', href: '/app/table-tennis' },
  'color-sort': { title: 'Color Sort Puzzle', href: '/app/color-sort' },
  'cli-practice': { title: 'CLI Practice', href: '/app/cli-practice' },
} as const satisfies Record<PageId, { title: string; href: string }>;

/** Official invite; keep in sync with frontend/src/config/site.ts socialLinks.discord.url */
export const DISCORD_INVITE_URL = 'https://discord.gg/DFWs8GrHxF';

const PAGE_ID_SET: ReadonlySet<string> = new Set(PAGE_IDS);

function invalidGuide(reason: string): never {
  throw new TypeError(`Invalid site guide: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageId(value: unknown): value is PageId {
  return typeof value === 'string' && PAGE_ID_SET.has(value);
}

function parseNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalidGuide(`${field} must be a non-empty string`);
  }
  return value;
}

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    return invalidGuide(`${field} must be an array`);
  }

  return value.map((item, index) => parseNonEmptyString(item, `${field}[${index}]`));
}

function parseAudiences(value: unknown, field: string): Audience[] {
  if (!Array.isArray(value)) {
    return invalidGuide(`${field} must be an array`);
  }

  const audiences: Audience[] = [];
  for (const audience of value) {
    if (audience !== 'visitor' && audience !== 'member') {
      return invalidGuide(`${field} contains an unknown audience`);
    }
    audiences.push(audience);
  }

  if (
    audiences.length !== 2
    || new Set(audiences).size !== 2
    || !audiences.includes('visitor')
    || !audiences.includes('member')
  ) {
    return invalidGuide(`${field} must contain visitor and member exactly once`);
  }

  return audiences;
}

function parseFaqs(value: unknown, field: string): GuideFaq[] {
  if (!Array.isArray(value)) {
    return invalidGuide(`${field} must be an array`);
  }

  return value.map((faq, index) => {
    if (!isRecord(faq)) {
      return invalidGuide(`${field}[${index}] must be an object`);
    }

    return {
      question: parseNonEmptyString(faq.question, `${field}[${index}].question`),
      answer: parseNonEmptyString(faq.answer, `${field}[${index}].answer`),
    };
  });
}

function parseRelatedPageIds(value: unknown, field: string): PageId[] {
  if (!Array.isArray(value)) {
    return invalidGuide(`${field} must be an array`);
  }

  const relatedPageIds: PageId[] = [];
  for (const relatedPageId of value) {
    if (!isPageId(relatedPageId)) {
      return invalidGuide(`${field} contains an unknown page id`);
    }
    if (relatedPageIds.includes(relatedPageId)) {
      return invalidGuide(`${field} contains a duplicate page id`);
    }
    relatedPageIds.push(relatedPageId);
  }
  return relatedPageIds;
}

function parseGuideEntry(value: unknown, index: number): GuideEntry {
  const field = `entries[${index}]`;
  if (!isRecord(value)) {
    return invalidGuide(`${field} must be an object`);
  }
  if (!isPageId(value.id)) {
    return invalidGuide(`${field}.id is unknown`);
  }

  const route = parseNonEmptyString(value.route, `${field}.route`);
  if (route !== KNOWN_PAGE_ROUTES[value.id].href) {
    return invalidGuide(`${field}.route is not canonical for ${value.id}`);
  }

  return {
    id: value.id,
    route,
    title: parseNonEmptyString(value.title, `${field}.title`),
    summary: parseNonEmptyString(value.summary, `${field}.summary`),
    audiences: parseAudiences(value.audiences, `${field}.audiences`),
    keywords: parseStringArray(value.keywords, `${field}.keywords`),
    faqs: parseFaqs(value.faqs, `${field}.faqs`),
    relatedPageIds: parseRelatedPageIds(
      value.relatedPageIds,
      `${field}.relatedPageIds`,
    ),
  };
}

function parseGuideEntries(value: unknown): readonly GuideEntry[] {
  if (!Array.isArray(value) || value.length !== PAGE_IDS.length) {
    return invalidGuide(`catalog must contain exactly ${PAGE_IDS.length} entries`);
  }

  const entries = value.map(parseGuideEntry);
  const seenPageIds = new Set<PageId>();
  for (const entry of entries) {
    if (seenPageIds.has(entry.id)) {
      return invalidGuide(`catalog contains duplicate page id ${entry.id}`);
    }
    seenPageIds.add(entry.id);
  }
  for (const pageId of PAGE_IDS) {
    if (!seenPageIds.has(pageId)) {
      return invalidGuide(`catalog is missing page id ${pageId}`);
    }
  }

  return entries;
}

export const GUIDE_ENTRIES = parseGuideEntries(rawGuideEntries);

const DYNAMIC_PAGE_PATTERNS: readonly [RegExp, PageId][] = [
  [/^\/news\/[^/]+$/, 'news'],
  [/^\/weekly-math\/[^/]+$/, 'weekly-math'],
  [/^\/weekly-math\/[^/]+\/solution$/, 'weekly-math'],
  [/^\/board\/[^/]+$/, 'board'],
];

export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ja-JP').trim().replace(/\s+/g, ' ');
}

export function resolveCurrentPageId(currentPath: string): PageId | null {
  for (const pageId of PAGE_IDS) {
    if (KNOWN_PAGE_ROUTES[pageId].href === currentPath) {
      return pageId;
    }
  }

  for (const [pattern, pageId] of DYNAMIC_PAGE_PATTERNS) {
    if (pattern.test(currentPath)) {
      return pageId;
    }
  }

  return null;
}

export function scoreGuideEntry(
  normalizedQuery: string,
  currentPageId: PageId | null,
  entry: GuideEntry,
): number {
  const query = normalizeSearchText(normalizedQuery);
  const title = normalizeSearchText(entry.title);
  let score = query === title ? 8 : query.includes(title) ? 5 : 0;

  for (const keyword of new Set(entry.keywords.map(normalizeSearchText))) {
    if (keyword && query.includes(keyword)) score += 3;
  }
  for (const faq of entry.faqs) {
    const question = normalizeSearchText(faq.question);
    if (!question || query.length < 2) continue;
    // Full FAQ paste, or a substantial user phrase contained in the FAQ.
    // Short probes like 「何が」「アプリ」 must not match every FAQ that mentions them.
    if (
      query.includes(question)
      || (query.length >= 6 && question.includes(query))
    ) {
      score += 3;
    }
  }
  if (currentPageId === entry.id) score += 1;
  return score;
}

export function selectRelevantKnowledge(
  query: string,
  currentPath: string,
): RankedGuideEntry[] {
  const currentPageId = resolveCurrentPageId(currentPath);

  return GUIDE_ENTRIES
    .map((entry) => ({
      entry,
      score: scoreGuideEntry(query, currentPageId, entry),
    }))
    .filter(({ score }) => score >= 3)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
    })
    .slice(0, 5);
}

/**
 * When the latest message alone misses keyword search, combine it with the
 * most recent user turns so short follow-ups like 「どこ？」 can still match.
 */
export function buildFollowUpSearchQuery(
  message: string,
  history: readonly { role: string; content: string }[],
  maxPriorUserMessages = 2,
): string | null {
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0 || maxPriorUserMessages <= 0) {
    return null;
  }

  const priorUserMessages = history
    .filter((entry) => entry.role === 'user')
    .map((entry) => entry.content.trim())
    .filter((content) => content.length > 0)
    .slice(-maxPriorUserMessages);

  if (priorUserMessages.length === 0) {
    return null;
  }

  const augmented = [...priorUserMessages, trimmedMessage].join(' ');
  return augmented === trimmedMessage ? null : augmented;
}

export function isDiscordQuestion(message: string): boolean {
  const normalized = normalizeSearchText(message);
  return (
    normalized.includes('discord')
    || normalized.includes('ディスコード')
    || normalized.includes('でぃすこーど')
    || normalized.includes('ディスコ')
  );
}

export function createVerifiedLinks(
  modelPageIds: readonly string[],
  selected: readonly RankedGuideEntry[],
  modelContentIds: readonly string[] = [],
  selectedContent: readonly RankedContentEntry[] = [],
  options: { includeDiscord?: boolean } = {},
): AssistantLink[] {
  const allowedPageIds = new Set<PageId>([
    ...selected.flatMap(({ entry }) => [entry.id, ...entry.relatedPageIds]),
    ...selectedContent.map(({ entry }) => entry.parentPageId),
    'contact',
  ]);
  const contentById = new Map(
    selectedContent.map(({ entry }) => [entry.id, entry] as const),
  );
  const seenHrefs = new Set<string>();
  const links: AssistantLink[] = [];

  const pushLink = (link: AssistantLink) => {
    if (links.length >= 3 || seenHrefs.has(link.href)) return;
    seenHrefs.add(link.href);
    links.push(link);
  };

  if (options.includeDiscord) {
    pushLink({
      pageId: 'discord',
      title: 'Discord',
      href: DISCORD_INVITE_URL,
    });
  }

  for (const contentId of modelContentIds) {
    const entry = contentById.get(contentId);
    if (!entry) continue;
    if (!isSafeDynamicHref(entry.href, entry.kind)) continue;
    pushLink({
      pageId: entry.parentPageId,
      title: entry.title,
      href: entry.href,
    });
  }

  for (const pageId of modelPageIds) {
    if (
      !isPageId(pageId)
      || !allowedPageIds.has(pageId)
    ) {
      continue;
    }

    pushLink({
      pageId,
      title: KNOWN_PAGE_ROUTES[pageId].title,
      href: KNOWN_PAGE_ROUTES[pageId].href,
    });
  }

  return links;
}

function isSafeDynamicHref(href: string, kind: ContentKind): boolean {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('?') || href.includes('#')) {
    return false;
  }

  if (kind === 'news') {
    return /^\/news\/[^/]+$/.test(href);
  }
  if (kind === 'board') {
    return /^\/board\/[^/]+$/.test(href);
  }
  if (kind === 'weekly-math') {
    return /^\/weekly-math\/[^/]+$/.test(href);
  }
  return false;
}
