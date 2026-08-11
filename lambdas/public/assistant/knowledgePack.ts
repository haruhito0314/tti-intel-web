import { SITE_KNOWLEDGE } from './structuredKnowledge.js';
import type { AssistantPageId, OfficialSourceId } from './types.js';

export const ASSISTANT_KNOWLEDGE_PACK_SCHEMA_VERSION = 1 as const;
export const MAX_ASSISTANT_KNOWLEDGE_PACK_BYTES = 32_000;

export interface AssistantKnowledgeEntry {
  topicId: string;
  title: string;
  facts: readonly string[];
  pageIds: readonly AssistantPageId[];
  sourceIds: readonly OfficialSourceId[];
}

export interface AssistantKnowledgePack {
  schemaVersion: typeof ASSISTANT_KNOWLEDGE_PACK_SCHEMA_VERSION;
  entries: readonly AssistantKnowledgeEntry[];
}

interface KnowledgePackTopic {
  topicId: string;
  catalogId: string;
  pageIds: readonly AssistantPageId[];
}

/**
 * This is a complete static catalog, deliberately separate from legacy phrase
 * ranking. Every substantive Assistant request receives this bounded pack.
 */
const KNOWLEDGE_PACK_TOPICS: readonly KnowledgePackTopic[] = [
  { topicId: 'circle.identity', catalogId: 'circle-identity', pageIds: ['about'] },
  { topicId: 'circle.activities', catalogId: 'circle-activities', pageIds: ['about', 'development', 'game-community', 'weekly-math'] },
  { topicId: 'circle.participation', catalogId: 'circle-participation', pageIds: ['about', 'contact'] },
  { topicId: 'circle.eligibility', catalogId: 'circle-eligibility', pageIds: ['about'] },
  { topicId: 'circle.schedule', catalogId: 'circle-schedule', pageIds: ['about'] },
  { topicId: 'circle.fees', catalogId: 'circle-fees', pageIds: ['about'] },
  { topicId: 'circle.contact', catalogId: 'circle-contact', pageIds: ['contact'] },
  { topicId: 'circle.discord', catalogId: 'circle-discord', pageIds: ['game-community', 'contact'] },
  { topicId: 'circle.youtube', catalogId: 'circle-youtube', pageIds: ['about'] },
  { topicId: 'site.overview', catalogId: 'site-overview', pageIds: ['home'] },
  { topicId: 'site.about', catalogId: 'site-about', pageIds: ['about'] },
  { topicId: 'site.news', catalogId: 'site-news', pageIds: ['news'] },
  { topicId: 'site.apps', catalogId: 'site-apps', pageIds: ['apps'] },
  { topicId: 'site.development', catalogId: 'site-development', pageIds: ['development'] },
  { topicId: 'site.board', catalogId: 'site-board', pageIds: ['board'] },
  { topicId: 'site.contact', catalogId: 'site-contact', pageIds: ['contact'] },
  { topicId: 'site.game-community', catalogId: 'site-game-community', pageIds: ['game-community'] },
  { topicId: 'site.weekly-math', catalogId: 'site-weekly-math', pageIds: ['weekly-math'] },
  { topicId: 'site.table-tennis', catalogId: 'app-table-tennis', pageIds: ['apps', 'table-tennis'] },
  { topicId: 'site.color-sort', catalogId: 'app-color-sort', pageIds: ['apps', 'color-sort'] },
  { topicId: 'board.posting', catalogId: 'board-posting', pageIds: ['board'] },
  { topicId: 'board.anonymous-name', catalogId: 'board-anonymous-name', pageIds: ['board'] },
  { topicId: 'board.threads', catalogId: 'board-threads', pageIds: ['board'] },
  { topicId: 'board.comments', catalogId: 'board-comments', pageIds: ['board'] },
  { topicId: 'development.codex', catalogId: 'development-codex', pageIds: ['development'] },
  { topicId: 'development.vercel', catalogId: 'development-vercel', pageIds: ['development'] },
  { topicId: 'development.aws', catalogId: 'development-aws', pageIds: ['development'] },
  { topicId: 'development.plugin', catalogId: 'development-plugin', pageIds: ['development'] },
  { topicId: 'development.cli', catalogId: 'development-cli', pageIds: ['development'] },
  { topicId: 'development.mcp', catalogId: 'development-mcp', pageIds: ['development'] },
];

export function assistantKnowledgePackBytes(pack: AssistantKnowledgePack): number {
  return Buffer.byteLength(JSON.stringify(pack), 'utf8');
}

export function buildAssistantKnowledgePack(): AssistantKnowledgePack {
  const catalogById = new Map(SITE_KNOWLEDGE.map((item) => [item.id, item]));
  const entries = KNOWLEDGE_PACK_TOPICS.map(({ topicId, catalogId, pageIds }) => {
    const item = catalogById.get(catalogId);
    if (item === undefined) {
      throw new TypeError(`Missing reviewed knowledge item for ${topicId}`);
    }
    return {
      topicId,
      title: item.title,
      facts: [item.summary, ...item.details],
      pageIds,
      sourceIds: item.sourceIds,
    } satisfies AssistantKnowledgeEntry;
  });
  const pack: AssistantKnowledgePack = {
    schemaVersion: ASSISTANT_KNOWLEDGE_PACK_SCHEMA_VERSION,
    entries,
  };
  if (assistantKnowledgePackBytes(pack) > MAX_ASSISTANT_KNOWLEDGE_PACK_BYTES) {
    throw new RangeError(`Assistant knowledge pack exceeds ${MAX_ASSISTANT_KNOWLEDGE_PACK_BYTES} bytes`);
  }
  return pack;
}
