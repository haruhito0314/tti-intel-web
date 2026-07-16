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
export type AssistantRole = 'user' | 'assistant';
export type ContentKind = 'news' | 'board' | 'weekly-math';

export interface HistoryMessage {
  role: AssistantRole;
  content: string;
}

export interface AssistantRequest {
  message: string;
  currentPath: string;
  sessionId: string;
  history: HistoryMessage[];
}

export interface AssistantLink {
  pageId: PageId;
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
