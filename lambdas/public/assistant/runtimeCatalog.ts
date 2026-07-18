import { PAGE_IDS } from './types.js';
import type {
  AssistantLink,
  ContentKind,
  PageId,
  RankedContentEntry,
} from './types.js';

/** Small, reviewed runtime catalog shared by the new assistant core. */
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

/** Official invite; keep in sync with frontend/src/config/site.ts. */
export const DISCORD_INVITE_URL = 'https://discord.gg/DFWs8GrHxF';

/** Toyota Technological Institute (豊田工業大学) official site. */
export const TOYOTA_TI_URL = 'https://www.toyota-ti.ac.jp/';

/** Circle YouTube channel; keep in sync with the frontend About page. */
export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@ttiintelligence';

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
    if (KNOWN_PAGE_ROUTES[pageId].href === currentPath) return pageId;
  }
  for (const [pattern, pageId] of DYNAMIC_PAGE_PATTERNS) {
    if (pattern.test(currentPath)) return pageId;
  }
  return null;
}

export function isSafeDynamicHref(href: string, kind: ContentKind): boolean {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('?') || href.includes('#')) {
    return false;
  }
  if (kind === 'news') return /^\/news\/[^/]+$/.test(href);
  if (kind === 'board') return /^\/board\/[^/]+$/.test(href);
  if (kind === 'weekly-math') return /^\/weekly-math\/[^/]+$/.test(href);
  return false;
}

/** Create links only from locally selected, same-site public content. */
export function createVerifiedContentLinks(
  selectedContent: readonly RankedContentEntry[],
  maxLinks = 4,
): AssistantLink[] {
  const links: AssistantLink[] = [];
  const seenHrefs = new Set<string>();
  for (const { entry } of selectedContent) {
    if (
      links.length >= maxLinks
      || seenHrefs.has(entry.href)
      || !isSafeDynamicHref(entry.href, entry.kind)
    ) {
      continue;
    }
    seenHrefs.add(entry.href);
    links.push({
      pageId: entry.parentPageId,
      title: entry.title,
      href: entry.href,
    });
  }
  return links;
}
