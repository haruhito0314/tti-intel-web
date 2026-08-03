export const PAGE_IDS = [
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
  'cli-practice',
] as const;

export type PageId = (typeof PAGE_IDS)[number];
export type Audience = 'visitor' | 'member';
export type ContentKind = 'news' | 'board' | 'weekly-math';

export type KnowledgeDomain =
  | 'site' | 'circle' | 'university' | 'development'
  | 'app' | 'game' | 'math';

export type OfficialSourceId =
  | 'discord' | 'youtube'
  | 'tti-overview' | 'tti-features' | 'tti-academics'
  | 'tti-program' | 'tti-student-activity' | 'tti-clubs'
  | 'tti-access';

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

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideEntry {
  id: PageId;
  route: string;
  title: string;
  summary: string;
  audiences: Audience[];
  keywords: string[];
  faqs: GuideFaq[];
  relatedPageIds: PageId[];
}

export interface RankedGuideEntry {
  entry: GuideEntry;
  score: number;
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
  answer: string;
  pageIds: string[];
  contentIds: string[];
  sourceIds: string[];
}

export interface OpenAIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface OpenAIResult {
  output: ModelGuideResponse;
  usage: OpenAIUsage;
}
