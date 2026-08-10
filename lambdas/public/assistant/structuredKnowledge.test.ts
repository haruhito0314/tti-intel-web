import { describe, expect, it } from 'vitest';

import {
  createVerifiedOfficialLinks,
  OFFICIAL_SOURCE_LINKS,
} from './runtimeCatalog.js';
import {
  SITE_KNOWLEDGE,
  STRUCTURED_KNOWLEDGE,
  selectAssistantRequestContext,
  selectStructuredKnowledge,
} from './structuredKnowledge.js';

describe('createVerifiedOfficialLinks', () => {
  it('returns only deduplicated catalog entries for requested official source IDs', () => {
    expect(createVerifiedOfficialLinks([
      'unknown-source',
      'discord',
      'youtube',
    ])).toEqual([
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
    };

    expect(OFFICIAL_SOURCE_LINKS).toEqual(expectedCatalog);
    expect(createVerifiedOfficialLinks([
      'discord',
      'youtube',
    ]).map(({ href }) => href)).toEqual(Object.values(expectedCatalog).map(({ href }) => href));
  });
});

describe('selectStructuredKnowledge', () => {
  const selectedIds = (
    message: string,
    currentPath = '/',
    history: readonly { role: 'user'; content: string }[] = [],
  ) => selectStructuredKnowledge(message, currentPath, history).map(({ item }) => item.id);

  it.each([
    'このサークルは？',
    'このサークルについて教えて',
    'AIサークルについて教えて',
  ])('prioritizes TTI Intelligence knowledge for %s', (query) => {
    const selected = selectStructuredKnowledge(query, '/', []);

    expect(selected[0]?.item.id).toBe('circle-identity');
    expect(selected.slice(0, 3).every(({ item }) => item.domain === 'circle')).toBe(true);
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

  it('uses recent user history only when local follow-up search resolves it', () => {
    const context = selectAssistantRequestContext('どこから見るの？', '/', [
      { role: 'user', content: 'Codexについて教えて' },
    ], 'site');

    expect(context.routingIntent.requiresHistory).toBe(true);
    expect(context.knowledge.map(({ item }) => item.id)).toContain('development-codex');
  });

  it('keeps an unrelated new topic free of stale history knowledge', () => {
    const context = selectAssistantRequestContext('これから京都へ旅行します', '/', [
      { role: 'user', content: 'Codexについて教えて' },
    ], 'site');

    expect(context.routingIntent.requiresHistory).toBe(false);
    expect(context.knowledge).toEqual([]);
  });

  it('does not add university facts when a university query follows a site topic', () => {
    const context = selectAssistantRequestContext(
      'どこに豊田工業大学がありますか？',
      '/',
      [{ role: 'user', content: 'Codexについて教えて' }],
      'site',
    );

    expect(context.routingIntent.requiresHistory).toBe(false);
    expect(context.knowledge).toEqual([]);
    expect(context.knowledge.map(({ item }) => item.id))
      .not.toContain('development-codex');
  });

  it('treats an explicit uncataloged location topic as current instead of prior Codex', () => {
    const context = selectAssistantRequestContext('どこに京都がありますか？', '/', [
      { role: 'user', content: 'Codexについて教えて' },
    ], 'site');

    expect(context.routingIntent.requiresHistory).toBe(false);
    expect(context.knowledge).toEqual([]);
  });

  it('resolves a math-answer probe only against compatible prior circle history', () => {
    const answer = selectAssistantRequestContext('解答を教えて', '/', [
      { role: 'user', content: '今週の数学の問題を見たい' },
    ], 'circle');

    expect(answer.routingIntent.requiresHistory).toBe(true);
    expect(answer.knowledge.map(({ item }) => item.id)).toContain('circle-weekly-math');
  });

  it('does not apply address or answer probes to incompatible prior topics', () => {
    const addressAfterCodex = selectAssistantRequestContext('住所を教えて', '/', [
      { role: 'user', content: 'Codexについて教えて' },
    ], 'site');

    expect(addressAfterCodex.routingIntent.requiresHistory).toBe(false);
    expect(addressAfterCodex.knowledge.map(({ item }) => item.id))
      .not.toContain('development-codex');
  });

  it('does not resolve a different unrelated topic against prior Codex history', () => {
    const context = selectAssistantRequestContext('カレーの作り方を教えて', '/', [
      { role: 'user', content: 'Codexについて教えて' },
    ], 'site');

    expect(context.routingIntent.requiresHistory).toBe(false);
    expect(context.knowledge).toEqual([]);
  });

  it('lets a deictic location follow-up keep the prior circle domain', () => {
    const context = selectAssistantRequestContext('その場所は？', '/', [
      { role: 'user', content: 'TTI Intelligenceについて教えて' },
    ], 'circle');

    expect(context.routingIntent.requiresHistory).toBe(true);
    expect(context.knowledge.map(({ item }) => item.id)).toContain('circle-identity');
    expect(context.knowledge.map(({ item }) => item.id))
      .not.toContain('university-campus-access');
  });

  it('keeps a referential beginner question on the prior game topic', () => {
    const context = selectAssistantRequestContext('それって初心者でも大丈夫？', '/', [
      { role: 'user', content: 'ゲームコミュニティについて教えて' },
    ], 'circle');

    expect(context.routingIntent.requiresHistory).toBe(true);
    expect(context.knowledge.map(({ item }) => item.id)).toContain('circle-game-activity');
  });

  it('resolves a bare location probe against the latest circle domain', () => {
    const circle = selectAssistantRequestContext('場所は？', '/', [
      { role: 'user', content: 'TTI Intelligenceについて教えて' },
    ], 'circle');

    expect(circle.routingIntent.requiresHistory).toBe(true);
    expect(circle.knowledge.map(({ item }) => item.id)).toContain('circle-identity');
    expect(circle.knowledge.map(({ item }) => item.id))
      .not.toContain('university-campus-access');
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
    ])).toEqual([]);
  });

  it('never returns duplicate IDs and never exceeds the hard five-item cap', () => {
    const selected = selectStructuredKnowledge('Codex Vercel AWS Plugin CLI MCP', '/', [], 99);
    const ids = selected.map(({ item }) => item.id);

    expect(selected.length).toBe(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('honors a smaller requested limit', () => {
    expect(selectStructuredKnowledge('Codex Vercel AWS Plugin CLI MCP', '/', [], 3)).toHaveLength(3);
  });
});

describe('reviewed structured knowledge catalogs', () => {
  it('loads a non-empty site catalog with unique IDs', () => {
    expect(SITE_KNOWLEDGE.length).toBeGreaterThan(0);

    const ids = STRUCTURED_KNOWLEDGE.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains no CLI Practice or TOEIC knowledge', () => {
    const serialized = JSON.stringify(STRUCTURED_KNOWLEDGE);

    expect(serialized).not.toMatch(/CLI Practice/i);
    expect(serialized).not.toMatch(/TOEIC/i);
  });

  it('contains no university domain or detailed university source IDs', () => {
    expect(JSON.stringify(STRUCTURED_KNOWLEDGE)).not.toContain('"domain":"university"');
    expect(JSON.stringify(STRUCTURED_KNOWLEDGE)).not.toMatch(/tti-(?:overview|features|academics|program|student-activity|clubs|access)/);
  });
});

describe('scope-aware assistant context', () => {
  it('selects only circle facts for the circle scope', () => {
    const result = selectAssistantRequestContext('このサークルについて教えて', '/', [], 'circle');

    expect(result.knowledge[0]?.item.id).toBe('circle-identity');
    expect(result.knowledge.every(({ item }) => ['circle', 'game', 'math'].includes(item.domain))).toBe(true);
  });

  it.each(['Codex', 'Vercel', 'AWS', 'Plugin', 'CLI', 'MCP'])('keeps %s available in site scope', (tool) => {
    expect(selectAssistantRequestContext(tool, '/', [], 'site').knowledge.length).toBeGreaterThan(0);
  });

  it('includes app facts in circle scope only for an explicit circle app question', () => {
    const broad = selectAssistantRequestContext('このサークルについて教えて', '/', [], 'circle');
    const apps = selectAssistantRequestContext('このサークルのアプリについて教えて', '/', [], 'circle');

    expect(broad.knowledge.every(({ item }) => item.domain !== 'app')).toBe(true);
    expect(apps.knowledge.some(({ item }) => item.domain === 'app')).toBe(true);
  });

  it('does not restore app facts from history for a vague circle follow-up', () => {
    const result = selectAssistantRequestContext('どれがおすすめ？', '/', [
      { role: 'user', content: 'このサークルのアプリについて教えて' },
    ], 'circle');

    expect(result.knowledge.every(({ item }) => item.domain !== 'app')).toBe(true);
  });
});
