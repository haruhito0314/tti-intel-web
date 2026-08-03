import { describe, expect, it } from 'vitest';

import {
  createVerifiedContentLinks,
  createVerifiedOfficialLinks,
  isSafeDynamicHref,
  KNOWN_PAGE_ROUTES,
  PUBLIC_PAGE_ROUTES,
  resolveCurrentPageId,
} from './runtimeCatalog.js';
import {
  ASSISTANT_PAGE_IDS,
  PUBLIC_ROUTE_IDS,
  type RankedContentEntry,
} from './types.js';

describe('Assistant route inventory', () => {
  it('excludes retired app guidance from Assistant page candidates', () => {
    expect(ASSISTANT_PAGE_IDS).not.toContain('cli-practice');
    expect(ASSISTANT_PAGE_IDS).not.toContain('toeic-practice');
    expect(KNOWN_PAGE_ROUTES).not.toHaveProperty('cli-practice');
    expect(KNOWN_PAGE_ROUTES).not.toHaveProperty('toeic-practice');
  });

  it('retains CLI Practice as a valid public route', () => {
    expect(PUBLIC_ROUTE_IDS).toContain('cli-practice');
    expect(PUBLIC_PAGE_ROUTES['cli-practice']).toEqual({
      title: 'CLI Practice',
      href: '/app/cli-practice',
    });
    expect(resolveCurrentPageId('/app/cli-practice')).toBe('cli-practice');
  });

  it('resolves canonical and dynamic public routes but rejects private or malformed paths', () => {
    expect(resolveCurrentPageId('/')).toBe('home');
    expect(resolveCurrentPageId('/news/launch')).toBe('news');
    expect(resolveCurrentPageId('/weekly-math/2026-07-16/solution')).toBe('weekly-math');
    expect(resolveCurrentPageId('/board/thread-1')).toBe('board');
    expect(resolveCurrentPageId('/admin')).toBeNull();
    expect(resolveCurrentPageId('/news/launch/comments')).toBeNull();
  });
});

describe('verified link safety', () => {
  it('accepts only the exact reviewed dynamic route shapes', () => {
    expect(isSafeDynamicHref('/news/launch', 'news')).toBe(true);
    expect(isSafeDynamicHref('/board/thread-1', 'board')).toBe(true);
    expect(isSafeDynamicHref('/weekly-math/2026-W31', 'weekly-math')).toBe(true);
    expect(isSafeDynamicHref('//evil.example/news', 'news')).toBe(false);
    expect(isSafeDynamicHref('/news/launch?next=evil', 'news')).toBe(false);
    expect(isSafeDynamicHref('/news/launch/comments', 'news')).toBe(false);
    expect(isSafeDynamicHref('/news/.', 'news')).toBe(false);
    expect(isSafeDynamicHref('/news/..', 'news')).toBe(false);
    expect(isSafeDynamicHref('/news/%2e%2e', 'news')).toBe(false);
    expect(isSafeDynamicHref('/board/%2E', 'board')).toBe(false);
  });

  it('maps selected content only through safe local hrefs', () => {
    const selected: RankedContentEntry[] = [{
      entry: {
        id: 'news:launch',
        kind: 'news',
        title: 'Launch',
        href: '/news/launch',
        excerpt: 'Public excerpt',
        parentPageId: 'news',
      },
      score: 10,
    }, {
      entry: {
        id: 'news:unsafe',
        kind: 'news',
        title: 'Unsafe',
        href: 'https://evil.example/news',
        excerpt: 'Unsafe excerpt',
        parentPageId: 'news',
      },
      score: 9,
    }];

    expect(createVerifiedContentLinks(selected)).toEqual([{
      pageId: 'news',
      title: 'Launch',
      href: '/news/launch',
    }]);
  });

  it('maps only reviewed official source IDs', () => {
    expect(createVerifiedOfficialLinks(['discord', 'not-reviewed', 'discord']))
      .toEqual([{
        pageId: 'discord',
        title: 'TTI Intelligence Discord',
        href: 'https://discord.gg/DFWs8GrHxF',
      }]);
  });
});
