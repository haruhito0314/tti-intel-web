/**
 * Compatibility exports for callers that only need reviewed runtime catalogs.
 * Answer knowledge lives in structuredKnowledge.ts; this module owns no prose.
 */
export {
  DISCORD_INVITE_URL,
  KNOWN_PAGE_ROUTES,
  normalizeSearchText,
  OFFICIAL_SOURCE_LINKS,
  PUBLIC_PAGE_ROUTES,
  resolveCurrentPageId,
  TOYOTA_TI_URL,
  YOUTUBE_CHANNEL_URL,
} from './runtimeCatalog.js';
