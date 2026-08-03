import { describe, expect, it } from 'vitest';

import {
  createVerifiedOfficialLinks,
  OFFICIAL_SOURCE_LINKS,
} from './runtimeCatalog.js';
import {
  SITE_KNOWLEDGE,
  STRUCTURED_KNOWLEDGE,
  UNIVERSITY_KNOWLEDGE,
  selectStructuredKnowledge,
} from './structuredKnowledge.js';

describe('createVerifiedOfficialLinks', () => {
  it('returns only deduplicated catalog entries for requested official source IDs', () => {
    expect(createVerifiedOfficialLinks([
      'tti-overview',
      'unknown-source',
      'discord',
      'tti-overview',
      'youtube',
    ])).toEqual([
      {
        pageId: 'tti-overview',
        title: '豊田工業大学 大学案内',
        href: 'https://www.toyota-ti.ac.jp/about/index.html',
      },
      {
        pageId: 'discord',
        title: 'TTI Intelligence Discord',
        href: 'https://discord.gg/DFWs8GrHxF',
      },
      {
        pageId: 'youtube',
        title: 'TTI Intelligence YouTube',
        href: 'https://www.youtube.com/@ttiintelligence',
      },
    ]);
  });

  it('keeps every official URL pinned to an exact reviewed catalog entry', () => {
    const expectedCatalog = {
      discord: { title: 'TTI Intelligence Discord', href: 'https://discord.gg/DFWs8GrHxF' },
      youtube: { title: 'TTI Intelligence YouTube', href: 'https://www.youtube.com/@ttiintelligence' },
      'tti-overview': { title: '豊田工業大学 大学案内', href: 'https://www.toyota-ti.ac.jp/about/index.html' },
      'tti-features': { title: '豊田工業大学 本学の特色', href: 'https://www.toyota-ti.ac.jp/about/profile/tokushoku.html' },
      'tti-academics': { title: '豊田工業大学 学部・大学院教育', href: 'https://www.toyota-ti.ac.jp/academics/index.html' },
      'tti-program': { title: '豊田工業大学 学びの特色', href: 'https://www.toyota-ti.ac.jp/academics/program/feature.html' },
      'tti-student-activity': { title: '豊田工業大学 課外活動', href: 'https://www.toyota-ti.ac.jp/student/activity/index.html' },
      'tti-clubs': { title: '豊田工業大学 課外団体一覧', href: 'https://www.toyota-ti.ac.jp/student/activity/club.html' },
      'tti-access': { title: '豊田工業大学 交通アクセス', href: 'https://www.toyota-ti.ac.jp/access/index.html' },
    };

    expect(OFFICIAL_SOURCE_LINKS).toEqual(expectedCatalog);
    expect(createVerifiedOfficialLinks([
      'discord',
      'youtube',
      'tti-overview',
      'tti-features',
      'tti-academics',
      'tti-program',
      'tti-student-activity',
      'tti-clubs',
      'tti-access',
    ]).map(({ href }) => href)).toEqual(Object.values(expectedCatalog).map(({ href }) => href));
  });
});

describe('selectStructuredKnowledge', () => {
  const selectedIds = (
    message: string,
    currentPath = '/',
    history: readonly { role: 'user'; content: string }[] = [],
  ) => selectStructuredKnowledge(message, currentPath, history).map(({ item }) => item.id);

  it('selects a bounded overview for a broad Toyota Technological Institute query', () => {
    const selected = selectStructuredKnowledge('豊田工業大学', '/', []);

    expect(selected.length).toBeGreaterThanOrEqual(3);
    expect(selected.length).toBeLessThanOrEqual(5);
    expect(selected[0]?.item.id).toBe('university-identity');
    expect(selected.every(({ item }) => item.domain === 'university')).toBe(true);
  });

  it('selects university-wide recognized groups for a university club question', () => {
    const ids = selectedIds('豊田工業大学のサークルは？');

    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(ids).toEqual(expect.arrayContaining([
      'university-recognized-sports',
      'university-recognized-cultural',
      'university-ai-circle-listing',
    ]));
  });

  it('distinguishes an official recognized-group listing from university operation', () => {
    const selected = selectStructuredKnowledge('AIサークルは大学公式？', '/', []);
    const listing = selected.find(({ item }) => item.id === 'university-ai-circle-listing');

    expect(selected.length).toBeGreaterThanOrEqual(3);
    expect(listing?.item.asOf).toBe('2026-04-01');
    expect(listing?.item.details.join(' ')).toContain('大学公式サイトの認定団体一覧');
    expect(listing?.item.details.join(' ')).toContain('大学による運営を意味しない');
  });

  it.each([
    ['Codex', 'development-codex'],
    ['Vercel', 'development-vercel'],
    ['AWS', 'development-aws'],
    ['Plugin', 'development-plugin'],
    ['CLI', 'development-cli'],
    ['MCP', 'development-mcp'],
  ])('selects the separate %s concept and related workflow facts', (query, expectedFirstId) => {
    const selected = selectStructuredKnowledge(query, '/', []);

    expect(selected.length).toBeGreaterThanOrEqual(3);
    expect(selected.length).toBeLessThanOrEqual(5);
    expect(selected[0]?.item.id).toBe(expectedFirstId);
    expect(selected.map(({ item }) => item.id)).toContain('development-combined-workflow');
  });

  it('normalizes width and case before selecting tool knowledge', () => {
    expect(selectedIds('ＣＯＤＥＸ')[0]).toBe('development-codex');
  });

  it('uses recent user history for a contextual follow-up', () => {
    expect(selectedIds('それはどう使う？', '/', [
      { role: 'user', content: 'Codexについて教えて' },
    ])).toContain('development-codex');
  });

  it('boosts facts associated with the current page', () => {
    const onHome = selectStructuredKnowledge('Codex', '/', []);
    const onDevelopment = selectStructuredKnowledge('Codex', '/development', []);
    const homeScore = onHome.find(({ item }) => item.id === 'development-codex')?.score;
    const developmentScore = onDevelopment.find(({ item }) => item.id === 'development-codex')?.score;

    expect(developmentScore).toBeGreaterThan(homeScore ?? 0);
  });

  it('returns the three current apps in stable catalog order when scores tie', () => {
    expect(selectedIds('現在のアプリは？').slice(0, 3)).toEqual([
      'app-ai-assistant',
      'app-table-tennis',
      'app-color-sort',
    ]);
  });

  it('returns no local facts for an unrelated general question', () => {
    expect(selectStructuredKnowledge('カレーの作り方', '/', [])).toEqual([]);
  });

  it('does not leak relevant history into a new unrelated question', () => {
    expect(selectStructuredKnowledge('カレーの作り方', '/', [
      { role: 'user', content: 'Codex' },
      { role: 'user', content: '豊田工業大学' },
    ])).toEqual([]);
  });

  it('never returns duplicate IDs and never exceeds the hard five-item cap', () => {
    const selected = selectStructuredKnowledge('豊田工業大学の特徴と教育とサークル', '/', [], 99);
    const ids = selected.map(({ item }) => item.id);

    expect(selected.length).toBe(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('honors a smaller requested limit', () => {
    expect(selectStructuredKnowledge('豊田工業大学', '/', [], 3)).toHaveLength(3);
  });
});

describe('reviewed structured knowledge catalogs', () => {
  it('loads non-empty site and university catalogs with unique IDs', () => {
    expect(SITE_KNOWLEDGE.length).toBeGreaterThan(0);
    expect(UNIVERSITY_KNOWLEDGE.length).toBeGreaterThan(0);

    const ids = STRUCTURED_KNOWLEDGE.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains no CLI Practice or TOEIC knowledge', () => {
    const serialized = JSON.stringify(STRUCTURED_KNOWLEDGE);

    expect(serialized).not.toMatch(/CLI Practice/i);
    expect(serialized).not.toMatch(/TOEIC/i);
  });
});
