import { PUBLIC_ROUTE_IDS } from './types.js';
import type {
  AssistantLink,
  AssistantPageId,
  ContentKind,
  OfficialSourceId,
  PublicRouteId,
  RankedContentEntry,
} from './types.js';

/** Every public React route, including routes not offered by Assistant. */
export const PUBLIC_PAGE_ROUTES = {
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
} as const satisfies Record<PublicRouteId, { title: string; href: string }>;

/** Reviewed public pages that Luna may return as Assistant link candidates. */
export const KNOWN_PAGE_ROUTES = {
  home: PUBLIC_PAGE_ROUTES.home,
  about: PUBLIC_PAGE_ROUTES.about,
  news: PUBLIC_PAGE_ROUTES.news,
  apps: PUBLIC_PAGE_ROUTES.apps,
  development: PUBLIC_PAGE_ROUTES.development,
  board: PUBLIC_PAGE_ROUTES.board,
  contact: PUBLIC_PAGE_ROUTES.contact,
  'game-community': PUBLIC_PAGE_ROUTES['game-community'],
  'weekly-math': PUBLIC_PAGE_ROUTES['weekly-math'],
  'table-tennis': PUBLIC_PAGE_ROUTES['table-tennis'],
  'color-sort': PUBLIC_PAGE_ROUTES['color-sort'],
} as const satisfies Record<AssistantPageId, { title: string; href: string }>;

/** Official invite; keep in sync with frontend/src/config/site.ts. */
export const DISCORD_INVITE_URL = 'https://discord.gg/DFWs8GrHxF';

/** Toyota Technological Institute (豊田工業大学) official site. */
export const TOYOTA_TI_URL = 'https://www.toyota-ti.ac.jp/';

/** Circle YouTube channel; keep in sync with the frontend About page. */
export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@ttiintelligence';

/** Reviewed official sources. URLs must only be emitted from this exact catalog. */
export const OFFICIAL_SOURCE_LINKS = {
  discord: { title: 'TTI Intelligence Discord', href: DISCORD_INVITE_URL },
  youtube: { title: 'TTI Intelligence YouTube', href: YOUTUBE_CHANNEL_URL },
} as const satisfies Record<OfficialSourceId, { title: string; href: string }>;

const DYNAMIC_PAGE_PATTERNS: readonly [RegExp, PublicRouteId][] = [
  [/^\/news\/[^/]+$/, 'news'],
  [/^\/weekly-math\/[^/]+$/, 'weekly-math'],
  [/^\/weekly-math\/[^/]+\/solution$/, 'weekly-math'],
  [/^\/board\/[^/]+$/, 'board'],
];

export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ja-JP').trim().replace(/\s+/g, ' ');
}

export function resolveCurrentPageId(currentPath: string): PublicRouteId | null {
  for (const pageId of PUBLIC_ROUTE_IDS) {
    if (PUBLIC_PAGE_ROUTES[pageId].href === currentPath) return pageId;
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
  const prefix = kind === 'news'
    ? '/news/'
    : kind === 'board'
      ? '/board/'
      : kind === 'weekly-math'
        ? '/weekly-math/'
        : null;
  if (prefix === null || !href.startsWith(prefix)) return false;

  const encodedSegment = href.slice(prefix.length);
  if (encodedSegment.length === 0 || encodedSegment.includes('/')) return false;
  try {
    const segment = decodeURIComponent(encodedSegment);
    return segment !== '.'
      && segment !== '..'
      && !segment.includes('/')
      && !segment.includes('\\');
  } catch {
    return false;
  }
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

/** Create links only from reviewed official-source identifiers. */
export function createVerifiedOfficialLinks(sourceIds: readonly string[]): AssistantLink[] {
  const links: AssistantLink[] = [];
  const seenSourceIds = new Set<OfficialSourceId>();

  for (const sourceId of sourceIds) {
    if (!Object.hasOwn(OFFICIAL_SOURCE_LINKS, sourceId) || seenSourceIds.has(sourceId as OfficialSourceId)) {
      continue;
    }

    const verifiedSourceId = sourceId as OfficialSourceId;
    seenSourceIds.add(verifiedSourceId);
    const source = OFFICIAL_SOURCE_LINKS[verifiedSourceId];
    links.push({ pageId: verifiedSourceId, title: source.title, href: source.href });
  }

  return links;
}
