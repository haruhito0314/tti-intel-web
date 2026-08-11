import { describe, expect, it } from 'vitest';

import { OFFICIAL_SOURCE_LINKS } from './runtimeCatalog.js';
import {
  assistantKnowledgePackBytes,
  buildAssistantKnowledgePack,
} from './knowledgePack.js';
import { ASSISTANT_PAGE_IDS } from './types.js';

const REQUIRED_TOPIC_IDS = [
  'circle.identity', 'circle.activities', 'circle.participation',
  'circle.eligibility', 'circle.schedule', 'circle.fees',
  'circle.contact', 'circle.discord', 'circle.youtube',
  'site.overview', 'site.about', 'site.news', 'site.apps',
  'site.development', 'site.board', 'site.contact',
  'site.game-community', 'site.weekly-math',
  'site.table-tennis', 'site.color-sort',
  'board.posting', 'board.anonymous-name', 'board.threads', 'board.comments',
  'development.codex', 'development.vercel', 'development.aws',
  'development.plugin', 'development.cli', 'development.mcp',
] as const;

describe('buildAssistantKnowledgePack', () => {
  it('ships one bounded reviewed entry for every supported topic and destination', () => {
    const pack = buildAssistantKnowledgePack();

    expect(pack.schemaVersion).toBe(1);
    expect(new Set(pack.entries.map((entry) => entry.topicId))).toEqual(
      new Set(REQUIRED_TOPIC_IDS),
    );
    expect(assistantKnowledgePackBytes(pack)).toBeLessThanOrEqual(32_000);
    expect(pack.entries.every((entry) => entry.pageIds.length > 0)).toBe(true);
    expect(pack.entries.every((entry) => entry.facts.length > 0)).toBe(true);
    expect(pack.entries.every((entry) => entry.facts.every((fact) => fact.trim().length > 0))).toBe(true);
    expect(pack.entries.every((entry) => entry.pageIds.every((pageId) => (
      (ASSISTANT_PAGE_IDS as readonly string[]).includes(pageId)
    )))).toBe(true);
    expect(pack.entries.every((entry) => entry.sourceIds.every((sourceId) => (
      Object.hasOwn(OFFICIAL_SOURCE_LINKS, sourceId)
    )))).toBe(true);
  });

  it('excludes unreviewed user-generated news and board text from the static pack', () => {
    const serialized = JSON.stringify(buildAssistantKnowledgePack());

    expect(serialized).not.toMatch(/星雲祭2026|参加相談のスレッド|スレッド本文|コメント本文/u);
  });

  it('routes unpublished member details and organization collaboration to Contact', () => {
    const contact = buildAssistantKnowledgePack().entries.find(
      (entry) => entry.topicId === 'circle.contact',
    );
    const facts = contact?.facts.join(' ') ?? '';

    expect(facts).toMatch(/個人名.*一覧.*人数.*代表者.*お問い合わせ/u);
    expect(facts).toMatch(/企業.*団体.*提携.*共同企画.*技術交流.*協賛.*歓迎.*お問い合わせ/u);
  });
});
