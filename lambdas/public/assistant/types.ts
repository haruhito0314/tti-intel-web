export const ASSISTANT_PAGE_IDS = [
  'home',
  'about',
  'news',
  'apps',
  'development',
  'board',
  'contact',
  'game-community',
  'weekly-math',
  'table-tennis',
  'color-sort',
] as const;

export type AssistantPageId = (typeof ASSISTANT_PAGE_IDS)[number];

export const PUBLIC_ROUTE_IDS = [
  ...ASSISTANT_PAGE_IDS,
  'cli-practice',
] as const;

export type PublicRouteId = (typeof PUBLIC_ROUTE_IDS)[number];

/** Compatibility alias for Assistant-facing page IDs. */
export const PAGE_IDS = ASSISTANT_PAGE_IDS;
export type PageId = AssistantPageId;
export type ContentKind = 'news' | 'board' | 'weekly-math';

export type KnowledgeDomain =
  | 'site' | 'circle' | 'development'
  | 'app' | 'game' | 'math';

export const ASSISTANT_MODEL_SCOPES = [
  'circle', 'site', 'university', 'out_of_scope',
] as const;

export type AssistantModelScope = (typeof ASSISTANT_MODEL_SCOPES)[number];

export type OfficialSourceId = 'discord' | 'youtube' | 'toyota-ti';

export interface KnowledgeItem {
  id: string;
  domain: KnowledgeDomain;
  title: string;
  summary: string;
  details: string[];
  keywords: string[];
  sourceIds: OfficialSourceId[];
  asOf?: string;
  volatility: 'stable' | 'periodic' | 'volatile';
}

export interface RankedKnowledgeItem {
  item: KnowledgeItem;
  score: number;
}

export interface HistoryMessage {
  role: 'user';
  content: string;
}

export interface AssistantRequest {
  message: string;
  currentPath: string;
  sessionId: string;
  history: HistoryMessage[];
}

export type AssistantLinkPageId = PageId | 'toyota-ti' | OfficialSourceId;

export interface AssistantLink {
  pageId: AssistantLinkPageId;
  title: string;
  href: string;
}

export interface AssistantResponse {
  answer: string;
  links: AssistantLink[];
}

export interface ContentEntry {
  id: string;
  kind: ContentKind;
  title: string;
  href: string;
  excerpt: string;
  parentPageId: PageId;
}

export interface RankedContentEntry {
  entry: ContentEntry;
  score: number;
}

export interface ModelGuideResponse {
  scope: AssistantModelScope;
  topicLabel: string;
  answer: string;
  pageIds: string[];
  contentIds: string[];
  sourceIds: string[];
}

export interface ModelGuideValidationContext {
  allowedPageIds: readonly AssistantPageId[];
  allowedContentIds: readonly string[];
  allowedSourceIds: readonly OfficialSourceId[];
}

export interface OpenAIUsage {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/** Temporary compatibility shape for callers migrated in the later handler task. */
interface LegacyModelGuideResponse {
  answer: string;
  pageIds: string[];
  contentIds: string[];
  sourceIds: string[];
}

export interface OpenAIResult {
  output: ModelGuideResponse | LegacyModelGuideResponse;
  usage: OpenAIUsage;
}
