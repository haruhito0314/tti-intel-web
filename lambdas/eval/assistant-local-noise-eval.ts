import { buildResponsesPayload } from '../public/assistant/openai.js';
import {
  isSafeDynamicHref,
  KNOWN_PAGE_ROUTES,
  OFFICIAL_SOURCE_LINKS,
} from '../public/assistant/runtimeCatalog.js';
import { selectAssistantRequestContext } from '../public/assistant/structuredKnowledge.js';
import type {
  AssistantRequest,
  AssistantResponse,
  HistoryMessage,
  OpenAIUsage,
} from '../public/assistant/types.js';

export type InterimExpectation = 'site' | 'follow-up' | 'general';

export interface InterimEvaluationCase {
  id: string;
  message: string;
  currentPath: string;
  history: HistoryMessage[];
  expectation: InterimExpectation;
}

export interface InterimEvaluationFixture {
  metadata: { schemaVersion: 2; count: number };
  cases: InterimEvaluationCase[];
}

export interface InterimObservation {
  statusCode: number;
  response: AssistantResponse;
  lunaCallCount: number;
  webCallCount: number;
  usage: OpenAIUsage;
  logs: readonly Record<string, unknown>[];
}

export interface InterimAssessment {
  passed: boolean;
  failures: string[];
  estimatedCostUsd: number;
}

const CASE_FIELDS = new Set([
  'id',
  'message',
  'currentPath',
  'history',
  'expectation',
]);
const EXPECTATIONS = new Set<InterimExpectation>(['site', 'follow-up', 'general']);
const INPUT_USD_PER_MILLION = 0.20;
const CACHED_INPUT_USD_PER_MILLION = 0.02;
const OUTPUT_USD_PER_MILLION = 1.25;

function invalidFixture(reason: string): never {
  throw new TypeError(`Invalid interim evaluator fixture: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalidFixture(`${field} must be a non-empty string`);
  }
  return value;
}

function parseHistory(value: unknown, field: string): HistoryMessage[] {
  if (!Array.isArray(value) || value.length > 8) {
    return invalidFixture(`${field} must be an array with at most 8 entries`);
  }
  return value.map((entry, index) => {
    if (!isRecord(entry) || entry.role !== 'user') {
      return invalidFixture(`${field}[${index}] must be a user message`);
    }
    return {
      role: 'user',
      content: nonEmptyString(entry.content, `${field}[${index}].content`),
    };
  });
}

function parseCase(value: unknown, index: number): InterimEvaluationCase {
  const field = `cases[${index}]`;
  if (!isRecord(value)) return invalidFixture(`${field} must be an object`);
  for (const key of Object.keys(value)) {
    if (!CASE_FIELDS.has(key)) return invalidFixture(`${field} has unknown field ${key}`);
  }
  if (typeof value.expectation !== 'string' || !EXPECTATIONS.has(value.expectation as InterimExpectation)) {
    return invalidFixture(`${field}.expectation is unknown`);
  }
  return {
    id: nonEmptyString(value.id, `${field}.id`),
    message: nonEmptyString(value.message, `${field}.message`),
    currentPath: nonEmptyString(value.currentPath, `${field}.currentPath`),
    history: parseHistory(value.history, `${field}.history`),
    expectation: value.expectation as InterimExpectation,
  };
}

export function parseInterimEvaluationFixture(value: unknown): InterimEvaluationFixture {
  if (!isRecord(value) || !isRecord(value.metadata) || !Array.isArray(value.cases)) {
    return invalidFixture('root fields are invalid');
  }
  if (value.metadata.schemaVersion !== 2 || !Number.isSafeInteger(value.metadata.count)) {
    return invalidFixture('metadata must contain schemaVersion 2 and an integer count');
  }
  const cases = value.cases.map(parseCase);
  if (value.metadata.count !== cases.length) {
    return invalidFixture('metadata count does not match cases');
  }
  const ids = cases.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) return invalidFixture('case IDs must be unique');
  return {
    metadata: { schemaVersion: 2, count: cases.length },
    cases,
  };
}

export function buildInterimEvaluationCase(evaluationCase: InterimEvaluationCase) {
  const { knowledge, routingIntent } = selectAssistantRequestContext(
    evaluationCase.message,
    evaluationCase.currentPath,
    evaluationCase.history,
  );
  const request: AssistantRequest = {
    message: evaluationCase.message,
    currentPath: evaluationCase.currentPath,
    history: evaluationCase.history,
    sessionId: '00000000-0000-4000-8000-000000000000',
  };
  const payload = buildResponsesPayload({
    request,
    knowledge,
    content: [],
    dynamicContentAvailable: false,
    allowedPageIds: [],
    model: 'gpt-5.6-luna',
    contextualFollowUp: routingIntent.requiresHistory,
  });
  return {
    payload,
    contextualFollowUp: routingIntent.requiresHistory,
    knowledgeIds: knowledge.map(({ item }) => item.id),
  };
}

function safeTokenCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function estimateCostUsd(usage: OpenAIUsage): number {
  const nonCachedInput = Math.max(
    0,
    usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens,
  );
  return (
    nonCachedInput * INPUT_USD_PER_MILLION
    + usage.cachedInputTokens * CACHED_INPUT_USD_PER_MILLION
    + usage.cacheWriteTokens * INPUT_USD_PER_MILLION
    + usage.outputTokens * OUTPUT_USD_PER_MILLION
  ) / 1_000_000;
}

function isVerifiedLink(link: AssistantResponse['links'][number]): boolean {
  if (Object.entries(KNOWN_PAGE_ROUTES).some(([pageId, route]) => (
    pageId === link.pageId && route.href === link.href && route.title === link.title
  ))) {
    return true;
  }
  if (Object.entries(OFFICIAL_SOURCE_LINKS).some(([sourceId, source]) => (
    sourceId === link.pageId && source.href === link.href && source.title === link.title
  ))) {
    return true;
  }
  if (link.pageId === 'news' || link.pageId === 'board' || link.pageId === 'weekly-math') {
    return isSafeDynamicHref(link.href, link.pageId);
  }
  return false;
}

export function assessInterimObservation(
  evaluationCase: InterimEvaluationCase,
  observation: InterimObservation,
): InterimAssessment {
  const failures: string[] = [];
  if (observation.statusCode !== 200) failures.push('expected a 200 response');
  if (observation.lunaCallCount !== 1) failures.push('expected exactly one Luna call');
  if (observation.webCallCount !== 0) failures.push('web access is forbidden');
  if (/(?:https?|ftp):\/\/|www\.|\/\/[\p{L}\p{N}]/iu.test(observation.response.answer)) {
    failures.push('answer contains a URL');
  }
  if (observation.response.links.some((link) => !isVerifiedLink(link))) {
    failures.push('response contains an unsafe link');
  }
  const usageValues = Object.values(observation.usage);
  if (!usageValues.every(safeTokenCount)) failures.push('token usage is invalid');

  const serializedLogs = JSON.stringify(observation.logs);
  const privateValues = [
    evaluationCase.message,
    ...evaluationCase.history.map(({ content }) => content),
    observation.response.answer,
  ];
  if (
    privateValues.some((value) => value.length > 0 && serializedLogs.includes(value))
    || /sk-[A-Za-z0-9_-]+|authorization|bearer/i.test(serializedLogs)
  ) {
    failures.push('logs contain private request data');
  }

  return {
    passed: failures.length === 0,
    failures,
    estimatedCostUsd: usageValues.every(safeTokenCount)
      ? estimateCostUsd(observation.usage)
      : 0,
  };
}
