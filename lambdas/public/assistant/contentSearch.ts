import { normalizeSearchText } from './runtimeCatalog.js';
import type {
  ContentEntry,
  ContentKind,
  RankedContentEntry,
} from './types.js';

export const MAX_CONTENT_EXCERPT_LENGTH = 1_200;
export const MAX_CONTENT_RESULTS = 3;
export const MIN_CONTENT_SCORE = 3;

export interface NewsListItem {
  postId: string;
  slug: string;
  title: string;
  excerpt?: string;
  tags?: string[];
  status?: string;
}

export interface NewsDetailItem extends NewsListItem {
  content?: string;
}

export interface BoardListItem {
  threadId: string;
  title: string;
  body: string;
}

export interface MathListItem {
  weekKey: string;
  title: string;
  problem: string;
  hint?: string;
  problemPublished?: boolean;
}

export interface ContentRepositories {
  listPublishedNews(): Promise<NewsListItem[]>;
  getNewsBySlug(slug: string): Promise<NewsDetailItem | null>;
  listBoardThreads(): Promise<BoardListItem[]>;
  listPublishedMathProblems(): Promise<MathListItem[]>;
}

export interface DynamicContentResult {
  content: RankedContentEntry[];
  dynamicContentAvailable: boolean;
}

/**
 * Dynamic repositories are optional answer context. Contain failures at this
 * one boundary so quota, secret, and Luna failures keep their own mappings.
 */
export async function retrieveDynamicContentSafely(
  search: () => Promise<RankedContentEntry[] | DynamicContentResult>,
): Promise<DynamicContentResult> {
  try {
    const result = await search();
    return Array.isArray(result)
      ? { content: result, dynamicContentAvailable: true }
      : result;
  } catch {
    return {
      content: [],
      dynamicContentAvailable: false,
    };
  }
}

export function truncateExcerpt(value: string, maxLength = MAX_CONTENT_EXCERPT_LENGTH): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function contentIdFor(kind: ContentKind, key: string): string {
  return `${kind}:${key}`;
}

function scoreTextMatch(query: string, value: string): number {
  const haystack = normalizeSearchText(value);
  if (!haystack) return 0;
  if (query === haystack) return 8;
  if (query.includes(haystack)) return 5;
  // Short reverse matches flood many titles; require a substantial query phrase.
  if (query.length >= 6 && haystack.includes(query)) return 5;

  let score = 0;
  const tokens = haystack.split(/[\s/|,_-]+/).filter((token) => token.length >= 2);
  for (const token of new Set(tokens)) {
    if (query.includes(token)) score += 2;
  }
  return score;
}

/**
 * Section-level asks should link to /weekly-math, not a handful of arbitrary problems.
 * Specific title / weekKey queries still return individual problem links.
 */
export function isWeeklyMathListingQuery(query: string): boolean {
  const normalized = normalizeSearchText(query)
    .replace(/[!！?？。．、,，〜~…・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length === 0) return false;

  return (
    normalized.includes('今週の数学')
    || normalized.includes('数学の問題')
    || normalized.includes('数学どこ')
    || normalized.includes('数学について')
    || normalized.includes('数学を教えて')
    || normalized.includes('答え教えて')
    || normalized.includes('ヒントくれ')
    || normalized.includes('ヒントください')
    || normalized.includes('解答')
    || normalized.includes('解説お願い')
    || normalized === '数学'
    || normalized === '問題'
    || normalized === '今週'
  );
}

export function scoreContentCandidate(
  query: string,
  candidate: {
    title: string;
    excerpt?: string;
    tags?: readonly string[];
    /** Item-specific terms (title-adjacent); alone can clear the threshold. */
    keywords?: readonly string[];
    /**
     * Shared kind labels like 「ニュース」「数学」.
     * Only boost when the item already matched on title/excerpt/tags/keywords,
     * so a bare category word does not flood every item of that kind.
     */
    categoryKeywords?: readonly string[];
  },
): number {
  const normalizedQuery = normalizeSearchText(query);
  let score = scoreTextMatch(normalizedQuery, candidate.title);

  if (candidate.excerpt) {
    const excerpt = normalizeSearchText(candidate.excerpt);
    if (
      excerpt
      && normalizedQuery.length >= 6
      && excerpt.includes(normalizedQuery)
    ) {
      score += 3;
    }
  }

  for (const tag of candidate.tags ?? []) {
    const normalizedTag = normalizeSearchText(tag);
    if (normalizedTag && normalizedQuery.includes(normalizedTag)) score += 3;
  }
  for (const keyword of candidate.keywords ?? []) {
    const normalizedKeyword = normalizeSearchText(keyword);
    if (normalizedKeyword && containsContentKeyword(normalizedQuery, normalizedKeyword)) score += 3;
  }

  if (score > 0) {
    for (const keyword of candidate.categoryKeywords ?? []) {
      const normalizedKeyword = normalizeSearchText(keyword);
      if (normalizedKeyword && normalizedQuery.includes(normalizedKeyword)) {
        score += 1;
      }
    }
  }

  return score;
}

function containsContentKeyword(query: string, keyword: string): boolean {
  if (!keyword.startsWith('/')) return query.includes(keyword);
  // Routes identify a whole item: /board/1 must not also match /board/10.
  let index = query.indexOf(keyword);
  while (index !== -1) {
    const following = query[index + keyword.length];
    if (following === undefined || /[\s?#)\]}>"'。、，,!?！？」』）]/u.test(following)) {
      return true;
    }
    index = query.indexOf(keyword, index + keyword.length);
  }
  return false;
}

function contentRouteKeywords(kind: 'news' | 'board', key: string): string[] {
  return [...new Set([`/${kind}/${encodeURIComponent(key)}`, `/${kind}/${key}`])];
}

function toNewsEntry(item: NewsDetailItem): ContentEntry {
  const body = item.content || item.excerpt || '';
  return {
    id: contentIdFor('news', item.slug),
    kind: 'news',
    title: item.title,
    href: `/news/${encodeURIComponent(item.slug)}`,
    excerpt: truncateExcerpt(body),
    parentPageId: 'news',
  };
}

function toBoardEntry(item: BoardListItem): ContentEntry {
  return {
    id: contentIdFor('board', item.threadId),
    kind: 'board',
    title: item.title,
    href: `/board/${encodeURIComponent(item.threadId)}`,
    excerpt: truncateExcerpt(item.body),
    parentPageId: 'board',
  };
}

function toMathEntry(item: MathListItem): ContentEntry {
  const excerpt = truncateExcerpt(
    [item.problem, item.hint ? `ヒント: ${item.hint}` : '']
      .filter((part) => part.length > 0)
      .join('\n\n'),
  );
  return {
    id: contentIdFor('weekly-math', item.weekKey),
    kind: 'weekly-math',
    title: item.title,
    href: `/weekly-math/${encodeURIComponent(item.weekKey)}`,
    excerpt,
    parentPageId: 'weekly-math',
  };
}

export async function searchRelevantContent(
  query: string,
  repositories: ContentRepositories,
): Promise<DynamicContentResult> {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) {
    return { content: [], dynamicContentAvailable: true };
  }

  const ranked: RankedContentEntry[] = [];
  // Each store is independent. A failed source must not discard content that
  // was successfully read from another source, or look like an empty result.
  const [newsResult, boardResult, mathResult] = await Promise.allSettled([
    Promise.resolve().then(() => repositories.listPublishedNews()),
    Promise.resolve().then(() => repositories.listBoardThreads()),
    Promise.resolve().then(() => repositories.listPublishedMathProblems()),
  ]);
  let dynamicContentAvailable = [newsResult, boardResult, mathResult]
    .every((result) => result.status === 'fulfilled');

  const newsList = newsResult.status === 'fulfilled' ? newsResult.value : [];
  const newsCandidates = newsList
    .map((item) => ({
      item,
      score: scoreContentCandidate(normalizedQuery, {
        title: item.title,
        excerpt: item.excerpt,
        tags: item.tags,
        keywords: contentRouteKeywords('news', item.slug),
        categoryKeywords: ['お知らせ', 'ニュース', '記事'],
      }),
    }))
    .filter(({ score }) => score >= MIN_CONTENT_SCORE)
    .sort((a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug))
    .slice(0, MAX_CONTENT_RESULTS);

  const newsDetails = await Promise.allSettled(newsCandidates.map(
    (candidate) => Promise.resolve().then(() => repositories.getNewsBySlug(candidate.item.slug)),
  ));
  for (const [index, result] of newsDetails.entries()) {
    if (result.status === 'rejected') {
      dynamicContentAvailable = false;
      continue;
    }
    const detail = result.value;
    if (!detail || detail.status === 'draft') continue;
    ranked.push({
      entry: toNewsEntry(detail),
      score: newsCandidates[index].score,
    });
  }

  const threads = boardResult.status === 'fulfilled' ? boardResult.value : [];
  for (const item of threads) {
    const score = scoreContentCandidate(normalizedQuery, {
      title: item.title,
      excerpt: item.body,
      keywords: contentRouteKeywords('board', item.threadId),
      categoryKeywords: ['掲示板', '相談', '投稿'],
    });
    if (score < MIN_CONTENT_SCORE) continue;
    ranked.push({ entry: toBoardEntry(item), score });
  }

  const mathProblems = mathResult.status === 'fulfilled' ? mathResult.value : [];
  // Listing asks → guide page only. Individual links only for specific titles/weekKeys.
  const listingQuery = isWeeklyMathListingQuery(normalizedQuery);
  for (const item of mathProblems) {
    if (item.problemPublished === false) continue;
    const title = normalizeSearchText(item.title);
    const weekKey = normalizeSearchText(item.weekKey);
    const explicitlyNamedProblem = (title.length > 0 && normalizedQuery.includes(title))
      || (weekKey.length > 0 && normalizedQuery.includes(weekKey));
    // A follow-up can include the earlier section question as well as the
    // exact problem title from the answer. Keep that specific problem usable.
    if (listingQuery && !explicitlyNamedProblem) continue;
    // Title / weekKey only — do not score problem body (avoids weak floods and answer leakage).
    const score = scoreContentCandidate(normalizedQuery, {
      title: item.title,
      keywords: [item.weekKey],
    });
    if (score < MIN_CONTENT_SCORE) continue;
    ranked.push({ entry: toMathEntry(item), score });
  }

  const content = ranked
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
    })
    .slice(0, MAX_CONTENT_RESULTS);
  return { content, dynamicContentAvailable };
}

/** Compatibility for offline evaluators that only consume the ranked items. */
export async function selectRelevantContent(
  query: string,
  repositories: ContentRepositories,
): Promise<RankedContentEntry[]> {
  return (await searchRelevantContent(query, repositories)).content;
}
