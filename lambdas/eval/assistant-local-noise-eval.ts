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

export type EvaluationCategory =
  | 'site/join/contact'
  | 'university overview/education/life/clubs'
  | 'university-vs-TTI-Intelligence distinction'
  | 'Codex/Vercel/AWS/Plugin/CLI/MCP'
  | 'apps/game/math'
  | 'stable general knowledge'
  | 'real-time/high-risk constraints';

export type InterimExpectation =
  | 'site'
  | 'follow-up'
  | 'university'
  | 'distinction'
  | 'development'
  | 'app'
  | 'general'
  | 'current'
  | 'high-risk';

export interface LinkExpectation {
  mode: 'none' | 'optional' | 'required';
  allowedHrefs: string[];
  requiredHrefs: string[];
}

export interface InterimEvaluationCase {
  id: string;
  message: string;
  currentPath: string;
  history: HistoryMessage[];
  expectation: InterimExpectation;
  category?: EvaluationCategory;
  variant?: string;
  requiredConcepts?: string[];
  forbiddenConcepts?: string[];
  linkExpectation?: LinkExpectation;
}

export interface MatrixEvaluationCase extends InterimEvaluationCase {
  category: EvaluationCategory;
  variant: string;
  requiredConcepts: string[];
  forbiddenConcepts: string[];
  linkExpectation: LinkExpectation;
}

export interface InterimEvaluationFixture {
  metadata: {
    schemaVersion: 3;
    count: number;
    createdAt: string;
    model: 'gpt-5.6-luna';
    webSearch: false;
    execution: string;
    design: string;
  };
  cases: MatrixEvaluationCase[];
}

export interface InterimObservation {
  statusCode: number;
  latencyMs?: number;
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
  responseFingerprint: string;
}

export interface EvaluationBatchEntry {
  caseId: string;
  category: EvaluationCategory;
  passed: boolean;
  responseFingerprint: string;
}

export interface EvaluationBatchSummary {
  templateConcentrationPassed: boolean;
  suspiciousFingerprints: string[];
}

const CASE_FIELDS = new Set([
  'id',
  'message',
  'currentPath',
  'history',
  'expectation',
  'category',
  'variant',
  'requiredConcepts',
  'forbiddenConcepts',
  'linkExpectation',
]);
const EXPECTATIONS = new Set<InterimExpectation>([
  'site',
  'follow-up',
  'university',
  'distinction',
  'development',
  'app',
  'general',
  'current',
  'high-risk',
]);
const CATEGORIES = new Set<EvaluationCategory>([
  'site/join/contact',
  'university overview/education/life/clubs',
  'university-vs-TTI-Intelligence distinction',
  'Codex/Vercel/AWS/Plugin/CLI/MCP',
  'apps/game/math',
  'stable general knowledge',
  'real-time/high-risk constraints',
]);
const INPUT_USD_PER_MILLION = 0.20;
const CACHED_INPUT_USD_PER_MILLION = 0.02;
const OUTPUT_USD_PER_MILLION = 1.25;
const SIGNIFICANT_PRIVATE_FRAGMENT_LENGTH = 4;
const MAX_LOG_STRING_VALUES = 200;
const MAX_LOG_STRING_LENGTH = 4_096;
const MAX_LOG_TOTAL_CHARACTERS = 32_768;
const MAX_LOG_NODES = 1_000;
const MAX_LOG_VALUE_DEPTH = 6;
const PRIVATE_PREVIEW_LABEL = /(?:query|message|history|answer|knowledge|prompt|request|response|input|output)(?:[_\s-]*(?:preview|excerpt|snippet|text|value|content))?\s*[:=：]/i;
const ALLOWED_OUTCOMES = new Set([
  'ai_success',
  'internal_error',
  'invalid_request',
  'origin_not_allowed',
  'preflight',
  'rate_limited',
  'unsafe_model_output',
  'upstream_timeout',
  'upstream_unavailable',
]);

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

function parseStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) return invalidFixture(`${field} must be an array`);
  return value.map((entry, index) => nonEmptyString(entry, `${field}[${index}]`));
}

function parseLinkExpectation(value: unknown, field: string): LinkExpectation {
  if (!isRecord(value)) return invalidFixture(`${field} must be an object`);
  const keys = new Set(['mode', 'allowedHrefs', 'requiredHrefs']);
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) return invalidFixture(`${field} has unknown field ${key}`);
  }
  if (value.mode !== 'none' && value.mode !== 'optional' && value.mode !== 'required') {
    return invalidFixture(`${field}.mode is unknown`);
  }
  const allowedHrefs = parseStringList(value.allowedHrefs, `${field}.allowedHrefs`);
  const requiredHrefs = parseStringList(value.requiredHrefs, `${field}.requiredHrefs`);
  if (requiredHrefs.some((href) => !allowedHrefs.includes(href))) {
    return invalidFixture(`${field}.requiredHrefs must be allowed`);
  }
  if (value.mode === 'none' && (allowedHrefs.length > 0 || requiredHrefs.length > 0)) {
    return invalidFixture(`${field} cannot allow links in none mode`);
  }
  return { mode: value.mode, allowedHrefs, requiredHrefs };
}

function parseCase(value: unknown, index: number): MatrixEvaluationCase {
  const field = `cases[${index}]`;
  if (!isRecord(value)) return invalidFixture(`${field} must be an object`);
  for (const key of Object.keys(value)) {
    if (!CASE_FIELDS.has(key)) return invalidFixture(`${field} has unknown field ${key}`);
  }
  if (typeof value.expectation !== 'string' || !EXPECTATIONS.has(value.expectation as InterimExpectation)) {
    return invalidFixture(`${field}.expectation is unknown`);
  }
  if (typeof value.category !== 'string' || !CATEGORIES.has(value.category as EvaluationCategory)) {
    return invalidFixture(`${field}.category is unknown`);
  }
  return {
    id: nonEmptyString(value.id, `${field}.id`),
    message: nonEmptyString(value.message, `${field}.message`),
    currentPath: nonEmptyString(value.currentPath, `${field}.currentPath`),
    history: parseHistory(value.history, `${field}.history`),
    expectation: value.expectation as InterimExpectation,
    category: value.category as EvaluationCategory,
    variant: nonEmptyString(value.variant, `${field}.variant`),
    requiredConcepts: parseStringList(value.requiredConcepts, `${field}.requiredConcepts`),
    forbiddenConcepts: parseStringList(value.forbiddenConcepts, `${field}.forbiddenConcepts`),
    linkExpectation: parseLinkExpectation(value.linkExpectation, `${field}.linkExpectation`),
  };
}

export function parseInterimEvaluationFixture(value: unknown): InterimEvaluationFixture {
  if (!isRecord(value) || !isRecord(value.metadata) || !Array.isArray(value.cases)) {
    return invalidFixture('root fields are invalid');
  }
  if (
    value.metadata.schemaVersion !== 3
    || !Number.isSafeInteger(value.metadata.count)
    || value.metadata.count !== 100
    || value.metadata.model !== 'gpt-5.6-luna'
    || value.metadata.webSearch !== false
  ) {
    return invalidFixture('metadata must describe the 100-case Luna no-web matrix');
  }
  const createdAt = nonEmptyString(value.metadata.createdAt, 'metadata.createdAt');
  const execution = nonEmptyString(value.metadata.execution, 'metadata.execution');
  const design = nonEmptyString(value.metadata.design, 'metadata.design');
  const cases = value.cases.map(parseCase);
  if (value.metadata.count !== cases.length) {
    return invalidFixture('metadata count does not match cases');
  }
  const ids = cases.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) return invalidFixture('case IDs must be unique');
  return {
    metadata: {
      schemaVersion: 3,
      count: cases.length,
      createdAt,
      model: 'gpt-5.6-luna',
      webSearch: false,
      execution,
      design,
    },
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

function hasConsistentUsage(usage: OpenAIUsage): boolean {
  return usage.cachedInputTokens <= usage.inputTokens
    && usage.cacheWriteTokens <= usage.inputTokens
    && usage.cachedInputTokens + usage.cacheWriteTokens <= usage.inputTokens
    && usage.totalTokens === usage.inputTokens + usage.outputTokens;
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

interface LogStringValue {
  key: string | null;
  value: string;
}

interface LogScanState {
  nodes: number;
  totalCharacters: number;
  values: LogStringValue[];
}

function collectLogStringValues(
  value: unknown,
  state: LogScanState,
  depth = 0,
  key: string | null = null,
): boolean {
  state.nodes += 1;
  if (state.nodes > MAX_LOG_NODES || depth > MAX_LOG_VALUE_DEPTH) return false;
  if (typeof value === 'string') {
    state.totalCharacters += value.length;
    if (
      state.values.length >= MAX_LOG_STRING_VALUES
      || value.length > MAX_LOG_STRING_LENGTH
      || state.totalCharacters > MAX_LOG_TOTAL_CHARACTERS
    ) {
      return false;
    }
    state.values.push({ key, value });
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry) => (
      collectLogStringValues(entry, state, depth + 1, key)
    ));
  }
  if (isRecord(value)) {
    for (const entryKey in value) {
      if (
        Object.hasOwn(value, entryKey)
        && !collectLogStringValues(value[entryKey], state, depth + 1, entryKey)
      ) {
        return false;
      }
    }
  }
  return true;
}

function normalizePrivateText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/[\s\p{P}\p{S}]/gu, '');
}

export function fingerprintAnswer(answer: string): string {
  const normalized = normalizePrivateText(answer).replace(/\p{N}+/gu, '#');
  let hash = 0x811c9dc5;
  for (const character of normalized) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function summarizeEvaluationBatch(
  entries: readonly EvaluationBatchEntry[],
): EvaluationBatchSummary {
  const groups = new Map<string, { count: number; categories: Set<EvaluationCategory> }>();
  for (const entry of entries) {
    const group = groups.get(entry.responseFingerprint) ?? {
      count: 0,
      categories: new Set<EvaluationCategory>(),
    };
    group.count += 1;
    group.categories.add(entry.category);
    groups.set(entry.responseFingerprint, group);
  }
  const suspiciousFingerprints = [...groups.entries()]
    .filter(([, group]) => group.count >= 4 && group.categories.size >= 3)
    .map(([fingerprint]) => fingerprint)
    .sort();
  return {
    templateConcentrationPassed: suspiciousFingerprints.length === 0,
    suspiciousFingerprints,
  };
}

function containsSignificantPrivateFragment(
  logValue: string,
  privateValue: string,
): boolean {
  const normalizedLog = normalizePrivateText(logValue);
  const normalizedPrivate = normalizePrivateText(privateValue);
  if (normalizedPrivate.length === 0) return false;
  if (normalizedPrivate.length < SIGNIFICANT_PRIVATE_FRAGMENT_LENGTH) {
    return PRIVATE_PREVIEW_LABEL.test(logValue)
      && normalizedLog.includes(normalizedPrivate);
  }
  for (
    let index = 0;
    index <= normalizedPrivate.length - SIGNIFICANT_PRIVATE_FRAGMENT_LENGTH;
    index += 1
  ) {
    if (normalizedLog.includes(normalizedPrivate.slice(
      index,
      index + SIGNIFICANT_PRIVATE_FRAGMENT_LENGTH,
    ))) {
      return true;
    }
  }
  return false;
}

function isAllowedFixedTelemetryValue({ key, value }: LogStringValue): boolean {
  return key === 'outcome' && ALLOWED_OUTCOMES.has(value);
}

export function assessInterimObservation(
  evaluationCase: InterimEvaluationCase,
  observation: InterimObservation,
): InterimAssessment {
  const failures: string[] = [];
  if (observation.statusCode !== 200) failures.push('expected a 200 response');
  if (
    observation.latencyMs !== undefined
    && (!Number.isSafeInteger(observation.latencyMs) || observation.latencyMs < 0)
  ) {
    failures.push('latency is invalid');
  }
  if (observation.lunaCallCount !== 1) failures.push('expected exactly one Luna call');
  if (observation.webCallCount !== 0) failures.push('web access is forbidden');
  if (/(?:https?|ftp):\/\/|www\.|\/\/[\p{L}\p{N}]/iu.test(observation.response.answer)) {
    failures.push('answer contains a URL');
  }
  if (observation.response.links.some((link) => !isVerifiedLink(link))) {
    failures.push('response contains an unsafe link');
  }
  const normalizedAnswer = normalizePrivateText(observation.response.answer);
  for (const concept of evaluationCase.requiredConcepts ?? []) {
    if (!normalizedAnswer.includes(normalizePrivateText(concept))) {
      failures.push(`answer is missing required concept: ${concept}`);
    }
  }
  for (const concept of evaluationCase.forbiddenConcepts ?? []) {
    if (normalizedAnswer.includes(normalizePrivateText(concept))) {
      failures.push(`answer contains forbidden concept: ${concept}`);
    }
  }
  if (
    evaluationCase.expectation === 'distinction'
    && !/(?:別|異な|区別|ではなく|一方|対して)/u.test(observation.response.answer)
  ) {
    failures.push('answer does not distinguish the university and community');
  }
  const linkExpectation = evaluationCase.linkExpectation;
  if (linkExpectation !== undefined) {
    const hrefs = observation.response.links.map(({ href }) => href);
    if (linkExpectation.mode === 'none' && hrefs.length > 0) {
      failures.push('response contains an unexpected link');
    }
    if (hrefs.some((href) => !linkExpectation.allowedHrefs.includes(href))) {
      failures.push('response contains a link outside the case allowlist');
    }
    for (const requiredHref of linkExpectation.requiredHrefs) {
      if (!hrefs.includes(requiredHref)) {
        failures.push(`response is missing a required link: ${requiredHref}`);
      }
    }
    if (linkExpectation.mode === 'required' && hrefs.length === 0) {
      failures.push('response requires at least one link');
    }
  }
  const usageValues = Object.values(observation.usage);
  const safeUsage = usageValues.every(safeTokenCount);
  const consistentUsage = safeUsage && hasConsistentUsage(observation.usage);
  if (!safeUsage) failures.push('token usage is invalid');
  if (safeUsage && !consistentUsage) failures.push('token usage is inconsistent');

  const privateValues = [
    evaluationCase.message,
    ...evaluationCase.history.map(({ content }) => content),
    observation.response.answer,
  ];
  const { knowledge } = selectAssistantRequestContext(
    evaluationCase.message,
    evaluationCase.currentPath,
    evaluationCase.history,
  );
  for (const { item } of knowledge) {
    privateValues.push(
      item.title,
      item.summary,
      ...item.details,
      ...item.keywords,
    );
  }
  const logScan: LogScanState = { nodes: 0, totalCharacters: 0, values: [] };
  const scannedAllLogValues = collectLogStringValues(observation.logs, logScan);
  if (!scannedAllLogValues) {
    failures.push('logs exceed privacy scan budget');
  }
  if (logScan.values.some((logEntry) => (
    !isAllowedFixedTelemetryValue(logEntry)
    && (/(?:^|[^A-Za-z0-9_-])(?:bearer\s+[A-Za-z0-9._~-]{4,}|sk-[A-Za-z0-9_-]{4,})/i.test(logEntry.value)
    || privateValues.some((privateValue) => (
      containsSignificantPrivateFragment(logEntry.value, privateValue)
    )))
  ))) {
    failures.push('logs contain private request data');
  }

  return {
    passed: failures.length === 0,
    failures,
    estimatedCostUsd: consistentUsage
      ? estimateCostUsd(observation.usage)
      : 0,
    responseFingerprint: fingerprintAnswer(observation.response.answer),
  };
}
