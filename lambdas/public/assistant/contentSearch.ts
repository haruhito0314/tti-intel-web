import { normalizeSearchText } from './knowledge.js';
import type {
  ContentEntry,
  ContentKind,
  PageId,
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
  if (query.includes(haystack) || haystack.includes(query)) return 5;

  let score = 0;
  const tokens = haystack.split(/[\s/|,_-]+/).filter((token) => token.length >= 2);
  for (const token of new Set(tokens)) {
    if (query.includes(token)) score += 2;
  }
  return score;
}

export function scoreContentCandidate(
  query: string,
  candidate: {
    title: string;
    excerpt?: string;
    tags?: readonly string[];
    keywords?: readonly string[];
  },
): number {
  const normalizedQuery = normalizeSearchText(query);
  let score = scoreTextMatch(normalizedQuery, candidate.title);

  if (candidate.excerpt) {
    const excerpt = normalizeSearchText(candidate.excerpt);
    if (excerpt && normalizedQuery.length >= 2 && excerpt.includes(normalizedQuery)) {
      score += 3;
    }
  }

  for (const tag of candidate.tags ?? []) {
    const normalizedTag = normalizeSearchText(tag);
    if (normalizedTag && normalizedQuery.includes(normalizedTag)) score += 3;
  }
  for (const keyword of candidate.keywords ?? []) {
    const normalizedKeyword = normalizeSearchText(keyword);
    if (normalizedKeyword && normalizedQuery.includes(normalizedKeyword)) score += 3;
  }

  return score;
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

export async function selectRelevantContent(
  query: string,
  repositories: ContentRepositories,
): Promise<RankedContentEntry[]> {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return [];

  const ranked: RankedContentEntry[] = [];

  const newsList = await repositories.listPublishedNews();
  const newsCandidates = newsList
    .map((item) => ({
      item,
      score: scoreContentCandidate(normalizedQuery, {
        title: item.title,
        excerpt: item.excerpt,
        tags: item.tags,
        keywords: ['お知らせ', 'ニュース', '記事'],
      }),
    }))
    .filter(({ score }) => score >= MIN_CONTENT_SCORE)
    .sort((a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug))
    .slice(0, MAX_CONTENT_RESULTS);

  for (const candidate of newsCandidates) {
    const detail = await repositories.getNewsBySlug(candidate.item.slug);
    if (!detail || detail.status === 'draft') continue;
    ranked.push({
      entry: toNewsEntry(detail),
      score: candidate.score,
    });
  }

  const threads = await repositories.listBoardThreads();
  for (const item of threads) {
    const score = scoreContentCandidate(normalizedQuery, {
      title: item.title,
      excerpt: item.body,
      keywords: ['掲示板', '相談', '投稿'],
    });
    if (score < MIN_CONTENT_SCORE) continue;
    ranked.push({ entry: toBoardEntry(item), score });
  }

  const mathProblems = await repositories.listPublishedMathProblems();
  for (const item of mathProblems) {
    if (item.problemPublished === false) continue;
    const score = scoreContentCandidate(normalizedQuery, {
      title: item.title,
      excerpt: item.problem,
      keywords: ['数学', '問題', '今週', item.weekKey],
    });
    if (score < MIN_CONTENT_SCORE) continue;
    ranked.push({ entry: toMathEntry(item), score });
  }

  return ranked
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
    })
    .slice(0, MAX_CONTENT_RESULTS);
}

export function parentPageIdsFromContent(
  content: readonly RankedContentEntry[],
): PageId[] {
  const pageIds: PageId[] = [];
  for (const { entry } of content) {
    if (!pageIds.includes(entry.parentPageId)) {
      pageIds.push(entry.parentPageId);
    }
  }
  return pageIds;
}
