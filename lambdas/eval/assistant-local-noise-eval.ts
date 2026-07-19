import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

import {
  answerFromPlan,
  planAssistantRequest,
  planFromFactSelection,
  type AssistantPlanMode,
} from '../public/assistant/engine.js';
import {
  ASSISTANT_FACT_IDS,
  ASSISTANT_FACTS,
  type AssistantFactId,
  type ExternalLinkId,
} from '../public/assistant/facts.js';
import {
  buildFactPlannerPayload,
  parseFactPlannerEnvelope,
} from '../public/assistant/factPlanner.js';
import {
  createApiKeyProvider,
  DEFAULT_OPENAI_TIMEOUT_MS,
  isPlainObject,
  OpenAiTimeoutError,
  OpenAiUpstreamError,
  requestResponsesEnvelope,
  SecretUnavailableError,
  type SecretReader,
} from '../public/assistant/openaiTransport.js';
import {
  DISCORD_INVITE_URL,
  KNOWN_PAGE_ROUTES,
  TOYOTA_TI_URL,
  YOUTUBE_CHANNEL_URL,
} from '../public/assistant/runtimeCatalog.js';
import type {
  AssistantResponse,
  HistoryMessage,
} from '../public/assistant/types.js';
import {
  parseAssistantRequest,
  UnsafeModelOutputError,
} from '../public/assistant/validation.js';

/**
 * Node ESM bundling needs a createRequire banner for the AWS SDK's CJS internals:
 * --banner:js='import { createRequire } from "node:module"; const require = createRequire(import.meta.url);'
 */

export const MODEL = 'gpt-5.4-nano-2026-03-17';
export const REASONING_EFFORT = 'medium';
export const MAX_CASES = 100;
export const MAX_MODEL_CALLS = 100;
export const CONCURRENCY = 1;
export const RETRIES = 0;
export const CONTENT_SEARCH = 'stub-empty';
export const SECRET_ID = 'tti-ai/openai-api-key';
export const AWS_REGION = 'ap-northeast-1';

export const PRICING = Object.freeze({
  inputPerMillionUsd: 0.20,
  cachedInputPerMillionUsd: 0.02,
  outputPerMillionUsd: 1.25,
  source: 'https://developers.openai.com/api/docs/pricing',
  verifiedDate: '2026-07-19',
});

const PLAN_MODES: ReadonlySet<string> = new Set<AssistantPlanMode>([
  'answer',
  'navigate',
  'list',
  'compare',
  'content-search',
  'small-talk',
  'protected',
  'unsupported',
]);

const EXTERNAL_HREFS: Readonly<Record<ExternalLinkId, string>> = {
  discord: DISCORD_INVITE_URL,
  'toyota-ti': TOYOTA_TI_URL,
  youtube: YOUTUBE_CHANNEL_URL,
};

const HREF_PAGE_IDS = new Map<string, string>([
  ...Object.entries(KNOWN_PAGE_ROUTES).map(([pageId, route]) => (
    [route.href, pageId] as const
  )),
  [DISCORD_INVITE_URL, 'discord'],
  [TOYOTA_TI_URL, 'toyota-ti'],
  [YOUTUBE_CHANNEL_URL, 'youtube'],
]);

const KNOWN_HREFS: ReadonlySet<string> = new Set(HREF_PAGE_IDS.keys());
const INTERNAL_FIELD_PATTERN = /guideEntries|contentEntries|pageIds|allowedPageIds|isFollowUp|availableFacts|answerにURL/i;
const URL_PATTERN = /https?:\/\//i;
const SAFE_LABEL_PATTERN = /^[A-Za-z0-9._/-]{1,100}$/;
const SAFE_MODEL_PATTERN = /^(?:gpt|chatgpt|o[1-9])[-A-Za-z0-9._:]{1,190}$/;
const SAFE_ERROR_CODE_PATTERN = /^(?:secret_unavailable|openai_timeout|openai_upstream_(?:unknown|[1-5][0-9]{2})|unsafe_model_output|unexpected_error)$/;
const SECRET_LIKE_PATTERN = /sk-|bearer|authorization/i;
const FORMULA_PREFIX_PATTERN = /^[=+\-@]/;

export type EvaluationPath = 'high' | 'none' | 'planner';
export type SanitizedErrorCode =
  | 'secret_unavailable'
  | 'openai_timeout'
  | `openai_upstream_${number | 'unknown'}`
  | 'unsafe_model_output'
  | 'unexpected_error';

type EvaluationFailureCode =
  | 'invalid_dataset'
  | 'invalid_cli_arguments'
  | 'invalid_dry_run_fixture'
  | 'invalid_model_configuration'
  | 'output_directory_not_fresh';

export class EvaluationValidationError extends Error {
  readonly name = 'EvaluationValidationError';

  constructor(code: EvaluationFailureCode = 'invalid_dataset') {
    super(code);
  }
}

export interface EvaluationCase {
  id: string;
  category: string;
  noiseLevel: string;
  askCount: number;
  message: string;
  currentPath: string;
  history: HistoryMessage[];
  expectedFactIds: AssistantFactId[];
  expectedMode: AssistantPlanMode;
  expectedLinks: string[];
  expectedUnsupported: boolean;
  expectedErrorCode?: SanitizedErrorCode;
  [key: string]: unknown;
}

export interface EvaluationDataset {
  metadata: Record<string, unknown>;
  cases: EvaluationCase[];
}

export interface DetailedUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface UsageReported {
  inputTokens: boolean;
  cachedInputTokens: boolean;
  outputTokens: boolean;
  reasoningTokens: boolean;
  totalTokens: boolean;
}

export interface FactSetScore {
  exact: boolean;
  precision: number;
  recall: number;
  f1: number;
}

export interface SafetyResult {
  passed: boolean;
  failures: string[];
}

export interface EvaluationCaseResult {
  caseId: string;
  category: string;
  noiseLevel: string;
  askCount: number;
  path: EvaluationPath;
  expectedFactIds: AssistantFactId[];
  selectedFactIds: AssistantFactId[];
  actualFactIds: AssistantFactId[];
  expectedMode: AssistantPlanMode;
  actualMode: AssistantPlanMode;
  expectedLinks: string[];
  actualLinks: string[];
  expectedUnsupported: boolean;
  actualUnsupported: boolean;
  initialMode: AssistantPlanMode;
  initialConfidence: 'high' | 'low' | 'none';
  initialFactIds: AssistantFactId[];
  requiresHistory: boolean;
  answerLength: number;
  plannerCalled: boolean;
  modelAttempted: boolean;
  caseLatencyMs: number;
  modelLatencyMs: number;
  usage: DetailedUsage;
  usageReported: UsageReported;
  requestedModel?: string;
  reasoningEffort?: string;
  returnedModel?: string;
  modelVerified: boolean;
  factScore: FactSetScore;
  modeExact: boolean;
  linkExact: boolean;
  unsupportedExact: boolean;
  safety: SafetyResult;
  errorCode?: SanitizedErrorCode;
  caseAccuracy: boolean;
}

export type ExecutionMode = 'real' | 'dry-run-fixture' | 'in-process-test';

export interface EvaluationRun {
  results: EvaluationCaseResult[];
  modelCalls: number;
  retries: 0;
  concurrency: 1;
  contentSearch: 'stub-empty';
  executionMode: ExecutionMode;
}

export interface RequestEnvelopeInput {
  caseId: string;
  apiKey: string;
  payload: ReturnType<typeof buildFactPlannerPayload>;
  timeoutMs: number;
}

export interface EvaluationDependencies {
  getApiKey?: () => Promise<string>;
  requestEnvelope?: (input: RequestEnvelopeInput) => Promise<unknown>;
  nowMs?: () => number;
  executionMode?: ExecutionMode;
}

export interface CliRuntimeOverrides {
  createSecretsClient?: () => SecretReader;
  onModelRequest?: (caseId: string) => void;
  onTransportFetch?: (caseId: string) => void;
  log?: (line: string) => void;
}

function invalidDataset(): never {
  throw new EvaluationValidationError('invalid_dataset');
}

function nonEmptyBoundedString(
  value: unknown,
  maxLength: number,
): value is string {
  return (
    typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function safeSerializedLabel(value: unknown, maxLength: number): value is string {
  return (
    nonEmptyBoundedString(value, maxLength)
    && !SECRET_LIKE_PATTERN.test(value)
    && !FORMULA_PREFIX_PATTERN.test(value.trim())
  );
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function hrefsOwnedByFacts(factIds: readonly AssistantFactId[]): Set<string> {
  const hrefs = new Set<string>();
  for (const factId of factIds) {
    const fact = ASSISTANT_FACTS[factId];
    for (const pageId of fact.pageIds) {
      hrefs.add(KNOWN_PAGE_ROUTES[pageId].href);
    }
    for (const externalLink of fact.externalLinks) {
      hrefs.add(EXTERNAL_HREFS[externalLink]);
    }
  }
  return hrefs;
}

function normalizeExpectedFactIds(value: unknown): AssistantFactId[] {
  if (!Array.isArray(value) || value.length > 4) return invalidDataset();
  const factIds: AssistantFactId[] = [];
  for (const factId of value) {
    if (
      typeof factId !== 'string'
      || !(ASSISTANT_FACT_IDS as readonly string[]).includes(factId)
      || factIds.includes(factId as AssistantFactId)
    ) {
      return invalidDataset();
    }
    factIds.push(factId as AssistantFactId);
  }
  return factIds;
}

function normalizeExpectedLinks(
  value: unknown,
  factIds: readonly AssistantFactId[],
): string[] {
  if (!Array.isArray(value)) return invalidDataset();
  const links: string[] = [];
  const owned = hrefsOwnedByFacts(factIds);
  for (const href of value) {
    if (
      typeof href !== 'string'
      || !KNOWN_HREFS.has(href)
      || !owned.has(href)
      || links.includes(href)
    ) {
      return invalidDataset();
    }
    links.push(href);
  }
  return links;
}

export function validateDataset(
  value: unknown,
  options: { requireExactly100?: boolean } = {},
): EvaluationDataset {
  if (
    !isPlainObject(value)
    || !isPlainObject(value.metadata)
    || !Array.isArray(value.cases)
    || value.cases.length === 0
    || value.cases.length > MAX_CASES
    || (options.requireExactly100 === true && value.cases.length !== MAX_CASES)
    || (
      Object.hasOwn(value.metadata, 'count')
      && (
        !Number.isSafeInteger(value.metadata.count)
        || value.metadata.count !== value.cases.length
      )
    )
  ) {
    return invalidDataset();
  }

  const ids = new Set<string>();
  const messages = new Set<string>();
  const cases: EvaluationCase[] = value.cases.map((rawCase, caseIndex) => {
    if (!isPlainObject(rawCase)) return invalidDataset();
    const {
      id,
      category,
      noiseLevel,
      askCount,
      message,
      currentPath,
      history,
      expectedFactIds: rawExpectedFactIds,
      expectedMode,
      expectedLinks: rawExpectedLinks,
      expectedUnsupported,
      expectedErrorCode,
    } = rawCase;

    if (
      typeof id !== 'string'
      || !SAFE_LABEL_PATTERN.test(id)
      || SECRET_LIKE_PATTERN.test(id)
      || FORMULA_PREFIX_PATTERN.test(id)
      || ids.has(id)
      || !safeSerializedLabel(category, 100)
      || !safeSerializedLabel(noiseLevel, 100)
      || !Number.isSafeInteger(askCount)
      || (askCount as number) <= 0
      || typeof message !== 'string'
      || messages.has(message.trim())
      || typeof expectedMode !== 'string'
      || !PLAN_MODES.has(expectedMode)
      || typeof expectedUnsupported !== 'boolean'
      || (
        expectedErrorCode !== undefined
        && (
          !nonEmptyBoundedString(expectedErrorCode, 64)
          || !SAFE_ERROR_CODE_PATTERN.test(expectedErrorCode)
        )
      )
    ) {
      return invalidDataset();
    }

    const expectedFactIds = normalizeExpectedFactIds(rawExpectedFactIds);
    const expectedLinks = normalizeExpectedLinks(rawExpectedLinks, expectedFactIds);
    if (expectedUnsupported !== (expectedMode === 'unsupported')) {
      return invalidDataset();
    }

    let request;
    try {
      request = parseAssistantRequest(JSON.stringify({
        message,
        currentPath,
        sessionId: `00000000-0000-4000-8000-${String(caseIndex).padStart(12, '0')}`,
        history,
      }));
    } catch {
      return invalidDataset();
    }

    ids.add(id);
    messages.add(request.message);
    return {
      id,
      category: category.trim(),
      noiseLevel: noiseLevel.trim(),
      askCount: askCount as number,
      message: request.message,
      currentPath: request.currentPath,
      history: request.history,
      expectedFactIds,
      expectedMode: expectedMode as AssistantPlanMode,
      expectedLinks,
      expectedUnsupported,
      ...(expectedErrorCode === undefined ? {} : {
        expectedErrorCode: expectedErrorCode as SanitizedErrorCode,
      }),
    };
  });

  return { metadata: { ...value.metadata }, cases };
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function sameUnorderedSet(
  expected: readonly string[],
  actual: readonly string[],
): boolean {
  if (expected.length !== actual.length) return false;
  const actualSet = new Set(actual);
  return expected.every((value) => actualSet.has(value));
}

export function scoreFactSets(
  expected: readonly string[],
  actual: readonly string[],
): FactSetScore {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  let truePositives = 0;
  for (const value of actualSet) {
    if (expectedSet.has(value)) truePositives += 1;
  }
  const precision = actualSet.size === 0
    ? expectedSet.size === 0 ? 1 : 0
    : truePositives / actualSet.size;
  const recall = expectedSet.size === 0
    ? 1
    : truePositives / expectedSet.size;
  const f1 = precision + recall === 0
    ? 0
    : (2 * precision * recall) / (precision + recall);
  return {
    exact: sameUnorderedSet([...expectedSet], [...actualSet]),
    precision,
    recall,
    f1,
  };
}

export function percentile(
  values: readonly number[],
  quantile: number,
): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const boundedQuantile = Math.min(1, Math.max(0, quantile));
  const index = Math.max(0, Math.ceil(sorted.length * boundedQuantile) - 1);
  return sorted[index]!;
}

export function estimateCostUsd(usage: Readonly<DetailedUsage>): number {
  const cached = Math.min(usage.inputTokens, usage.cachedInputTokens);
  const uncached = Math.max(0, usage.inputTokens - cached);
  return (
    uncached * PRICING.inputPerMillionUsd
    + cached * PRICING.cachedInputPerMillionUsd
    + usage.outputTokens * PRICING.outputPerMillionUsd
  ) / 1_000_000;
}

function addFailure(failures: string[], code: string): void {
  if (!failures.includes(code)) failures.push(code);
}

export function inspectResponseSafety(
  response: AssistantResponse,
  actualFactIds: readonly AssistantFactId[],
): SafetyResult {
  const failures: string[] = [];
  if (response.answer.length === 0 || response.answer.length > 200) {
    addFailure(failures, 'answer_too_long');
  }
  if (URL_PATTERN.test(response.answer)) addFailure(failures, 'url_in_answer');
  if (INTERNAL_FIELD_PATTERN.test(response.answer)) {
    addFailure(failures, 'internal_field_leak');
  }

  const seenHrefs = new Set<string>();
  const ownedHrefs = hrefsOwnedByFacts(actualFactIds);
  for (const link of response.links) {
    if (seenHrefs.has(link.href)) addFailure(failures, 'duplicate_link');
    seenHrefs.add(link.href);
    const catalogPageId = HREF_PAGE_IDS.get(link.href);
    if (catalogPageId === undefined || catalogPageId !== link.pageId) {
      addFailure(failures, 'unknown_link');
      continue;
    }
    if (!ownedHrefs.has(link.href)) addFailure(failures, 'unowned_link');
  }
  return { passed: failures.length === 0, failures };
}

function usageToken(value: unknown): number {
  return isUsageToken(value) ? value : 0;
}

function isUsageToken(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

function zeroUsage(): DetailedUsage {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
  };
}

function zeroUsageReported(): UsageReported {
  return {
    inputTokens: false,
    cachedInputTokens: false,
    outputTokens: false,
    reasoningTokens: false,
    totalTokens: false,
  };
}

export function extractSafeEnvelopeMetadata(value: unknown): {
  returnedModel: string | undefined;
  usage: DetailedUsage;
  usageReported: UsageReported;
} {
  const root = isPlainObject(value) ? value : {};
  const usage = isPlainObject(root.usage) ? root.usage : {};
  const inputDetails = isPlainObject(usage.input_tokens_details)
    ? usage.input_tokens_details
    : {};
  const outputDetails = isPlainObject(usage.output_tokens_details)
    ? usage.output_tokens_details
    : {};
  return {
    returnedModel: (
      typeof root.model === 'string'
      && SAFE_MODEL_PATTERN.test(root.model)
      && !SECRET_LIKE_PATTERN.test(root.model)
    ) ? root.model : undefined,
    usage: {
      inputTokens: usageToken(usage.input_tokens),
      cachedInputTokens: usageToken(inputDetails.cached_tokens),
      outputTokens: usageToken(usage.output_tokens),
      reasoningTokens: usageToken(outputDetails.reasoning_tokens),
      totalTokens: usageToken(usage.total_tokens),
    },
    usageReported: {
      inputTokens: isUsageToken(usage.input_tokens),
      cachedInputTokens: isUsageToken(inputDetails.cached_tokens),
      outputTokens: isUsageToken(usage.output_tokens),
      reasoningTokens: isUsageToken(outputDetails.reasoning_tokens),
      totalTokens: isUsageToken(usage.total_tokens),
    },
  };
}

export function sanitizeErrorCode(error: unknown): SanitizedErrorCode {
  if (error instanceof SecretUnavailableError) return 'secret_unavailable';
  if (error instanceof OpenAiTimeoutError) return 'openai_timeout';
  if (error instanceof OpenAiUpstreamError) {
    return `openai_upstream_${error.status ?? 'unknown'}`;
  }
  if (error instanceof UnsafeModelOutputError) return 'unsafe_model_output';
  return 'unexpected_error';
}

function payloadUsesFixedModel(
  payload: ReturnType<typeof buildFactPlannerPayload>,
): boolean {
  return (
    payload.model === MODEL
    && payload.reasoning.effort === REASONING_EFFORT
  );
}

function defaultRequestEnvelope(input: RequestEnvelopeInput): Promise<unknown> {
  return requestResponsesEnvelope({
    apiKey: input.apiKey,
    payload: input.payload,
    timeoutMs: input.timeoutMs,
  });
}

export async function evaluateDataset(
  datasetValue: EvaluationDataset,
  dependencies: EvaluationDependencies = {},
): Promise<EvaluationRun> {
  const nowMs = dependencies.nowMs ?? (() => performance.now());
  const requestEnvelope = dependencies.requestEnvelope ?? defaultRequestEnvelope;
  let apiKeyPromise: Promise<string> | undefined;
  const getApiKey = (): Promise<string> => {
    if (apiKeyPromise !== undefined) return apiKeyPromise;
    apiKeyPromise = Promise.resolve().then(() => {
      if (dependencies.getApiKey === undefined) {
        throw new SecretUnavailableError();
      }
      return dependencies.getApiKey();
    });
    return apiKeyPromise;
  };

  const results: EvaluationCaseResult[] = [];
  let modelCalls = 0;
  for (const testCase of datasetValue.cases) {
    const caseStarted = nowMs();
    const initialPlan = planAssistantRequest(testCase.message, testCase.history);
    const path: EvaluationPath = initialPlan.confidence === 'low'
      ? 'planner'
      : initialPlan.confidence;
    let selectedFactIds: AssistantFactId[] = [];
    let actualFactIds: AssistantFactId[] = [...initialPlan.factIds];
    let actualMode: AssistantPlanMode = initialPlan.mode;
    let response = answerFromPlan(initialPlan);
    let modelLatencyMs = 0;
    let modelAttempted = false;
    let usage = zeroUsage();
    let usageReported = zeroUsageReported();
    let returnedModel: string | undefined;
    let requestedModel: string | undefined;
    let reasoningEffort: string | undefined;
    let modelVerified = true;
    let errorCode: SanitizedErrorCode | undefined;

    if (initialPlan.confidence === 'low') {
      const plannerRequest = {
        message: testCase.message,
        currentPath: testCase.currentPath,
        sessionId: `00000000-0000-4000-8000-${String(results.length).padStart(12, '0')}`,
        history: initialPlan.requiresHistory ? testCase.history : [],
      };
      const payload = buildFactPlannerPayload(plannerRequest, MODEL);
      if (!payloadUsesFixedModel(payload)) {
        throw new EvaluationValidationError('invalid_model_configuration');
      }
      requestedModel = payload.model;
      reasoningEffort = payload.reasoning.effort;

      try {
        const apiKey = await getApiKey();
        if (modelCalls >= MAX_MODEL_CALLS) {
          throw new EvaluationValidationError('invalid_model_configuration');
        }
        modelAttempted = true;
        modelCalls += 1;
        const modelStarted = nowMs();
        let envelope: unknown;
        try {
          envelope = await requestEnvelope({
            caseId: testCase.id,
            apiKey,
            payload,
            timeoutMs: DEFAULT_OPENAI_TIMEOUT_MS,
          });
        } finally {
          modelLatencyMs = Math.max(0, nowMs() - modelStarted);
        }
        const safeMetadata = extractSafeEnvelopeMetadata(envelope);
        returnedModel = safeMetadata.returnedModel;
        usage = safeMetadata.usage;
        usageReported = safeMetadata.usageReported;
        modelVerified = returnedModel === MODEL;
        const parsed = parseFactPlannerEnvelope(envelope);
        selectedFactIds = [...parsed.output.factIds];
        const finalPlan = planFromFactSelection(selectedFactIds, initialPlan);
        actualFactIds = [...finalPlan.factIds];
        actualMode = finalPlan.mode;
        response = answerFromPlan(finalPlan);
      } catch (error) {
        if (error instanceof EvaluationValidationError) throw error;
        errorCode = sanitizeErrorCode(error);
        modelVerified = returnedModel === MODEL;
        actualFactIds = [];
        actualMode = 'unsupported';
        response = { answer: '', links: [] };
      }
    }

    const actualLinks = response.links.map(({ href }) => href);
    const factScore = scoreFactSets(testCase.expectedFactIds, actualFactIds);
    const modeExact = testCase.expectedMode === actualMode;
    const linkExact = sameUnorderedSet(testCase.expectedLinks, actualLinks);
    const actualUnsupported = actualMode === 'unsupported';
    const unsupportedExact = testCase.expectedUnsupported === actualUnsupported;
    const safety = errorCode === undefined
      ? inspectResponseSafety(response, actualFactIds)
      : { passed: false, failures: ['evaluation_error'] };
    const caseAccuracy = (
      errorCode === undefined
      && factScore.exact
      && modeExact
      && linkExact
      && unsupportedExact
      && safety.passed
      && modelVerified
    );

    results.push({
      caseId: testCase.id,
      category: testCase.category,
      noiseLevel: testCase.noiseLevel,
      askCount: testCase.askCount,
      path,
      expectedFactIds: [...testCase.expectedFactIds],
      selectedFactIds,
      actualFactIds,
      expectedMode: testCase.expectedMode,
      actualMode,
      expectedLinks: [...testCase.expectedLinks],
      actualLinks,
      expectedUnsupported: testCase.expectedUnsupported,
      actualUnsupported,
      initialMode: initialPlan.mode,
      initialConfidence: initialPlan.confidence,
      initialFactIds: [...initialPlan.factIds],
      requiresHistory: initialPlan.requiresHistory,
      answerLength: response.answer.length,
      plannerCalled: initialPlan.confidence === 'low',
      modelAttempted,
      caseLatencyMs: Math.max(0, nowMs() - caseStarted),
      modelLatencyMs,
      usage,
      usageReported,
      requestedModel,
      reasoningEffort,
      returnedModel,
      modelVerified,
      factScore,
      modeExact,
      linkExact,
      unsupportedExact,
      safety,
      errorCode,
      caseAccuracy,
    });
  }

  return {
    results,
    modelCalls,
    retries: RETRIES,
    concurrency: CONCURRENCY,
    contentSearch: CONTENT_SEARCH,
    executionMode: dependencies.executionMode ?? 'in-process-test',
  };
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rate(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

function aggregate(results: readonly EvaluationCaseResult[]) {
  const count = results.length;
  return {
    count,
    caseAccuracy: rate(results.filter(({ caseAccuracy }) => caseAccuracy).length, count),
    factExact: rate(results.filter(({ factScore }) => factScore.exact).length, count),
    factPrecision: mean(results.map(({ factScore }) => factScore.precision)),
    factRecall: mean(results.map(({ factScore }) => factScore.recall)),
    factF1: mean(results.map(({ factScore }) => factScore.f1)),
    modeExact: rate(results.filter(({ modeExact }) => modeExact).length, count),
    linkExact: rate(results.filter(({ linkExact }) => linkExact).length, count),
    unsupportedExact: rate(
      results.filter(({ unsupportedExact }) => unsupportedExact).length,
      count,
    ),
    safetyPass: rate(results.filter(({ safety }) => safety.passed).length, count),
    errorRate: rate(results.filter(({ errorCode }) => errorCode !== undefined).length, count),
  };
}

function grouped(
  results: readonly EvaluationCaseResult[],
  keyFor: (result: EvaluationCaseResult) => string,
): Record<string, ReturnType<typeof aggregate>> {
  const groups = new Map<string, EvaluationCaseResult[]>();
  for (const result of results) {
    const key = keyFor(result);
    const values = groups.get(key) ?? [];
    values.push(result);
    groups.set(key, values);
  }
  return Object.fromEntries(
    [...groups.entries()].map(([key, values]) => [key, aggregate(values)]),
  );
}

function sumUsage(results: readonly EvaluationCaseResult[]): DetailedUsage {
  return results.reduce<DetailedUsage>((sum, result) => ({
    inputTokens: sum.inputTokens + result.usage.inputTokens,
    cachedInputTokens: sum.cachedInputTokens + result.usage.cachedInputTokens,
    outputTokens: sum.outputTokens + result.usage.outputTokens,
    reasoningTokens: sum.reasoningTokens + result.usage.reasoningTokens,
    totalTokens: sum.totalTokens + result.usage.totalTokens,
  }), zeroUsage());
}

function latencySummary(values: readonly number[]) {
  return {
    p50Ms: percentile(values, 0.50),
    p95Ms: percentile(values, 0.95),
    maxMs: values.length === 0 ? 0 : Math.max(...values),
  };
}

export function summarizeResults(run: EvaluationRun) {
  const plannerResults = run.results.filter(({ path }) => path === 'planner');
  const modelAttemptedResults = run.results.filter(({ modelAttempted }) => (
    modelAttempted
  ));
  const tokens = sumUsage(run.results);
  const modelVerificationPassed = plannerResults.every(
    ({ modelVerified }) => modelVerified,
  );
  const returnedModels = [...new Set(
    plannerResults
      .map(({ returnedModel }) => returnedModel)
      .filter((value): value is string => value !== undefined),
  )];
  return {
    schemaVersion: 1,
    totalCases: run.results.length,
    plannerCalls: run.modelCalls,
    plannerCallRate: rate(run.modelCalls, run.results.length),
    modelErrorRate: rate(
      modelAttemptedResults.filter(({ errorCode }) => errorCode !== undefined).length,
      modelAttemptedResults.length,
    ),
    retries: run.retries,
    concurrency: run.concurrency,
    contentSearch: run.contentSearch,
    executionMode: run.executionMode,
    modelAttemptedCases: modelAttemptedResults.length,
    model: MODEL,
    reasoningEffort: REASONING_EFFORT,
    overall: aggregate(run.results),
    byCategory: grouped(run.results, ({ category }) => category),
    byNoiseLevel: grouped(run.results, ({ noiseLevel }) => noiseLevel),
    byAskCount: grouped(run.results, ({ askCount }) => String(askCount)),
    byPath: grouped(run.results, ({ path }) => path),
    latency: {
      case: latencySummary(run.results.map(({ caseLatencyMs }) => caseLatencyMs)),
      model: latencySummary(modelAttemptedResults.map(({ modelLatencyMs }) => (
        modelLatencyMs
      ))),
    },
    tokens,
    usageReporting: {
      inputTokens: run.results.filter(({ usageReported }) => (
        usageReported.inputTokens
      )).length,
      cachedInputTokens: run.results.filter(({ usageReported }) => (
        usageReported.cachedInputTokens
      )).length,
      outputTokens: run.results.filter(({ usageReported }) => (
        usageReported.outputTokens
      )).length,
      reasoningTokens: run.results.filter(({ usageReported }) => (
        usageReported.reasoningTokens
      )).length,
      totalTokens: run.results.filter(({ usageReported }) => (
        usageReported.totalTokens
      )).length,
    },
    estimatedCostUsd: modelVerificationPassed ? estimateCostUsd(tokens) : null,
    costStatus: modelVerificationPassed
      ? 'estimated'
      : 'model-verification-failed',
    pricing: PRICING,
    modelVerification: {
      passed: modelVerificationPassed,
      requestedModel: MODEL,
      reasoningEffort: REASONING_EFFORT,
      returnedModels,
      calls: run.modelCalls,
    },
    errors: Object.fromEntries(
      [...new Set(
        run.results
          .map(({ errorCode }) => errorCode)
          .filter((value): value is SanitizedErrorCode => value !== undefined),
      )].map((code) => [
        code,
        run.results.filter(({ errorCode }) => errorCode === code).length,
      ]),
    ),
  };
}

interface ParsedCliArguments {
  datasetPath: string;
  outdir: string;
  dryRunFixture: boolean;
}

function parseCliArguments(argv: readonly string[]): ParsedCliArguments {
  let datasetPath: string | undefined;
  let outdir: string | undefined;
  let dryRunFixture = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run-fixture') {
      dryRunFixture = true;
      continue;
    }
    if (argument === '--dataset' || argument === '--outdir') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new EvaluationValidationError('invalid_cli_arguments');
      }
      if (argument === '--dataset') datasetPath = value;
      else outdir = value;
      index += 1;
      continue;
    }
    throw new EvaluationValidationError('invalid_cli_arguments');
  }
  if (datasetPath === undefined || outdir === undefined) {
    throw new EvaluationValidationError('invalid_cli_arguments');
  }
  return { datasetPath, outdir, dryRunFixture };
}

interface DryRunResponseDefinition {
  caseId: string;
  kind: 'envelope' | 'invalid-json';
  envelope?: unknown;
}

function parseDryRunResponses(value: unknown): Map<string, DryRunResponseDefinition> {
  if (!isPlainObject(value) || !Array.isArray(value.responses)) {
    throw new EvaluationValidationError('invalid_dry_run_fixture');
  }
  const responses = new Map<string, DryRunResponseDefinition>();
  for (const item of value.responses) {
    if (
      !isPlainObject(item)
      || typeof item.caseId !== 'string'
      || (item.kind !== 'envelope' && item.kind !== 'invalid-json')
      || responses.has(item.caseId)
      || (item.kind === 'envelope' && !Object.hasOwn(item, 'envelope'))
    ) {
      throw new EvaluationValidationError('invalid_dry_run_fixture');
    }
    responses.set(item.caseId, {
      caseId: item.caseId,
      kind: item.kind,
      envelope: item.envelope,
    });
  }
  return responses;
}

function assertDryRequest(
  url: RequestInfo | URL,
  init: RequestInit | undefined,
): void {
  const headers = new Headers(init?.headers);
  let body: unknown;
  try {
    body = JSON.parse(String(init?.body)) as unknown;
  } catch {
    throw new EvaluationValidationError('invalid_dry_run_fixture');
  }
  if (
    String(url) !== 'https://api.openai.com/v1/responses'
    || init?.method !== 'POST'
    || headers.get('Authorization') !== 'Bearer dry-run-placeholder'
    || headers.get('Content-Type') !== 'application/json'
    || !isPlainObject(body)
    || body.model !== MODEL
    || !isPlainObject(body.reasoning)
    || body.reasoning.effort !== REASONING_EFFORT
  ) {
    throw new EvaluationValidationError('invalid_dry_run_fixture');
  }
}

function dryRunRequester(
  responses: Map<string, DryRunResponseDefinition>,
  consumed: Set<string>,
  onTransportFetch?: (caseId: string) => void,
): (input: RequestEnvelopeInput) => Promise<unknown> {
  return async (input) => {
    const definition = responses.get(input.caseId);
    if (definition === undefined || consumed.has(input.caseId)) {
      throw new EvaluationValidationError('invalid_dry_run_fixture');
    }
    consumed.add(input.caseId);
    let fetchCalls = 0;
    const fetchImpl: typeof fetch = async (url, init) => {
      fetchCalls += 1;
      onTransportFetch?.(input.caseId);
      assertDryRequest(url, init);
      if (definition.kind === 'invalid-json') {
        return new Response('{', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(definition.envelope), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    try {
      return await requestResponsesEnvelope({
        apiKey: input.apiKey,
        payload: input.payload,
        fetchImpl,
        timeoutMs: input.timeoutMs,
      });
    } finally {
      if (fetchCalls !== 1) {
        throw new EvaluationValidationError('invalid_dry_run_fixture');
      }
    }
  };
}

function defaultSecretsClient(): SecretReader {
  return new SecretsManagerClient({
    region: AWS_REGION,
    maxAttempts: 1,
  });
}

async function writeAtomic(path: string, content: string): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, content, { encoding: 'utf8', flag: 'wx' });
  await rename(temporaryPath, path);
}

function csvCell(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function resultsCsv(results: readonly EvaluationCaseResult[]): string {
  const columns = [
    'caseId',
    'category',
    'noiseLevel',
    'askCount',
    'path',
    'expectedFactIds',
    'actualFactIds',
    'expectedMode',
    'actualMode',
    'expectedLinks',
    'actualLinks',
    'factExact',
    'precision',
    'recall',
    'f1',
    'modeExact',
    'linkExact',
    'unsupportedExact',
    'safetyPassed',
    'caseAccuracy',
    'modelAttempted',
    'errorCode',
    'caseLatencyMs',
    'modelLatencyMs',
    'inputTokens',
    'cachedInputTokens',
    'outputTokens',
    'reasoningTokens',
    'totalTokens',
    'inputTokensReported',
    'cachedInputTokensReported',
    'outputTokensReported',
    'reasoningTokensReported',
    'totalTokensReported',
    'returnedModel',
  ];
  const rows = results.map((result) => [
    result.caseId,
    result.category,
    result.noiseLevel,
    result.askCount,
    result.path,
    result.expectedFactIds,
    result.actualFactIds,
    result.expectedMode,
    result.actualMode,
    result.expectedLinks,
    result.actualLinks,
    result.factScore.exact,
    result.factScore.precision,
    result.factScore.recall,
    result.factScore.f1,
    result.modeExact,
    result.linkExact,
    result.unsupportedExact,
    result.safety.passed,
    result.caseAccuracy,
    result.modelAttempted,
    result.errorCode ?? '',
    result.caseLatencyMs,
    result.modelLatencyMs,
    result.usage.inputTokens,
    result.usage.cachedInputTokens,
    result.usage.outputTokens,
    result.usage.reasoningTokens,
    result.usage.totalTokens,
    result.usageReported.inputTokens,
    result.usageReported.cachedInputTokens,
    result.usageReported.outputTokens,
    result.usageReported.reasoningTokens,
    result.usageReported.totalTokens,
    result.returnedModel ?? '',
  ]);
  return [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

async function createFreshOutdir(outdir: string): Promise<void> {
  await mkdir(dirname(outdir), { recursive: true });
  try {
    await mkdir(outdir);
  } catch {
    throw new EvaluationValidationError('output_directory_not_fresh');
  }
}

async function writeArtifacts(input: {
  outdir: string;
  datasetSha256: string;
  runnerArtifactSha256: string;
  startedAt: string;
  finishedAt: string;
  run: EvaluationRun;
}): Promise<void> {
  const resultsDocument = {
    schemaVersion: 1,
    datasetSha256: input.datasetSha256,
    model: MODEL,
    reasoningEffort: REASONING_EFFORT,
    executionMode: input.run.executionMode,
    cases: input.run.results,
  };
  const summary = summarizeResults(input.run);
  const resultsJson = JSON.stringify(resultsDocument, null, 2) + '\n';
  const csv = resultsCsv(input.run.results);
  const summaryJson = JSON.stringify(summary, null, 2) + '\n';
  await writeAtomic(resolve(input.outdir, 'results.json'), resultsJson);
  await writeAtomic(resolve(input.outdir, 'results.csv'), csv);
  await writeAtomic(resolve(input.outdir, 'summary.json'), summaryJson);
  const manifest = {
    schemaVersion: 1,
    datasetSha256: input.datasetSha256,
    runnerArtifactSha256: input.runnerArtifactSha256,
    model: MODEL,
    reasoningEffort: REASONING_EFFORT,
    executionMode: input.run.executionMode,
    timeoutMs: DEFAULT_OPENAI_TIMEOUT_MS,
    maxCases: MAX_CASES,
    maxModelCalls: MAX_MODEL_CALLS,
    actualModelCalls: input.run.modelCalls,
    concurrency: input.run.concurrency,
    retries: input.run.retries,
    contentSearch: input.run.contentSearch,
    pricing: PRICING,
    nodeVersion: process.version,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    outputs: {
      'results.json': sha256Hex(resultsJson),
      'results.csv': sha256Hex(csv),
      'summary.json': sha256Hex(summaryJson),
    },
  };
  await writeAtomic(
    resolve(input.outdir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
}

export async function runCli(
  argv: readonly string[],
  overrides: CliRuntimeOverrides = {},
): Promise<EvaluationRun> {
  const argumentsValue = parseCliArguments(argv);
  const datasetPath = resolve(argumentsValue.datasetPath);
  const outdir = resolve(argumentsValue.outdir);
  let rawText: string;
  let rawValue: unknown;
  try {
    rawText = await readFile(datasetPath, 'utf8');
    rawValue = JSON.parse(rawText) as unknown;
  } catch {
    throw new EvaluationValidationError('invalid_dataset');
  }
  const validated = validateDataset(rawValue, {
    requireExactly100: !argumentsValue.dryRunFixture,
  });
  const datasetSha256 = sha256Hex(rawText);
  await createFreshOutdir(outdir);
  const startedAt = new Date().toISOString();

  let dependencies: EvaluationDependencies;
  let dryResponses: Map<string, DryRunResponseDefinition> | undefined;
  let consumed: Set<string> | undefined;
  if (argumentsValue.dryRunFixture) {
    dryResponses = parseDryRunResponses(rawValue);
    consumed = new Set<string>();
    const requestEnvelope = dryRunRequester(
      dryResponses,
      consumed,
      overrides.onTransportFetch,
    );
    dependencies = {
      executionMode: 'dry-run-fixture',
      getApiKey: async () => 'dry-run-placeholder',
      requestEnvelope: async (input) => {
        overrides.onModelRequest?.(input.caseId);
        return requestEnvelope(input);
      },
    };
  } else {
    let provider: (() => Promise<string>) | undefined;
    dependencies = {
      executionMode: 'real',
      getApiKey: () => {
        if (provider === undefined) {
          const client = (overrides.createSecretsClient ?? defaultSecretsClient)();
          provider = createApiKeyProvider(client, SECRET_ID);
        }
        return provider();
      },
      requestEnvelope: (input) => {
        overrides.onModelRequest?.(input.caseId);
        return defaultRequestEnvelope(input);
      },
    };
  }

  const run = await evaluateDataset(validated, dependencies);
  if (argumentsValue.dryRunFixture) {
    if (
      dryResponses === undefined
      || consumed === undefined
      || consumed.size !== dryResponses.size
    ) {
      throw new EvaluationValidationError('invalid_dry_run_fixture');
    }
    for (let index = 0; index < validated.cases.length; index += 1) {
      const expectedErrorCode = validated.cases[index]!.expectedErrorCode;
      const actualErrorCode = run.results[index]!.errorCode;
      if (expectedErrorCode !== actualErrorCode) {
        throw new EvaluationValidationError('invalid_dry_run_fixture');
      }
    }
  }

  const runnerPath = fileURLToPath(import.meta.url);
  const runnerArtifactSha256 = sha256Hex(await readFile(runnerPath));
  const finishedAt = new Date().toISOString();
  await writeArtifacts({
    outdir,
    datasetSha256,
    runnerArtifactSha256,
    startedAt,
    finishedAt,
    run,
  });
  overrides.log?.(JSON.stringify({
    outcome: 'evaluation_complete',
    totalCases: run.results.length,
    modelCalls: run.modelCalls,
    outdir,
  }));
  return run;
}

function cliErrorCode(error: unknown): string {
  if (error instanceof EvaluationValidationError) return error.message;
  return sanitizeErrorCode(error);
}

export function isDirectInvocation(
  argvPath: string | undefined,
  moduleUrl: string,
): boolean {
  if (argvPath === undefined) return false;
  const modulePath = fileURLToPath(moduleUrl);
  try {
    return realpathSync(argvPath) === realpathSync(modulePath);
  } catch {
    return resolve(argvPath) === resolve(modulePath);
  }
}

if (isDirectInvocation(process.argv[1], import.meta.url)) {
  void runCli(process.argv.slice(2), {
    log: (line) => console.info(line),
  }).catch((error: unknown) => {
    console.error(cliErrorCode(error));
    process.exitCode = 1;
  });
}
