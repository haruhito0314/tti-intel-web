import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

import {
  retrieveDynamicContentSafely,
  selectRelevantContent,
  type ContentRepositories,
} from './contentSearch.js';
import { createContentRepositories } from './contentRepos.js';
import {
  buildAssistantKnowledgePack,
  type AssistantKnowledgePack,
} from './knowledgePack.js';
import { localConversationResponseFor } from './localResponses.js';
import {
  requestOpenAI as callOpenAI,
  type GroundedRequestOpenAIInput,
} from './openai.js';
import {
  createApiKeyProvider,
  OpenAiTimeoutError,
  OpenAiUpstreamError,
  SecretUnavailableError,
} from './openaiTransport.js';
import {
  QuotaExceededError,
  QuotaInfrastructureError,
  readQuotaConfig,
  reserveQuota,
  type QuotaReservationInput,
} from './quota.js';
import {
  createVerifiedContentLinks,
  createVerifiedOfficialLinks,
  KNOWN_PAGE_ROUTES,
} from './runtimeCatalog.js';
import { shouldSearchDynamicContent } from './scope.js';
import type {
  AssistantLink,
  ModelGuideResponse,
  OpenAIResult,
  OpenAIUsage,
  PageId,
  RankedContentEntry,
} from './types.js';
import {
  parseAssistantRequest,
  RequestValidationError,
  UnsafeModelOutputError,
} from './validation.js';

const OPENAI_TIMEOUT_MS = 20_000;
const MAX_ASSISTANT_LINKS = 4;
const UNIVERSITY_DIRECTION = '豊田工業大学については、公式サイトをご確認ください。';

const ERROR_RESPONSES = {
  400: {
    code: 'INVALID_REQUEST',
    message: '質問内容を確認して、もう一度送信してください。',
  },
  403: {
    code: 'ORIGIN_NOT_ALLOWED',
    message: 'この場所からはAI Assistantを利用できません。',
  },
  429: {
    code: 'RATE_LIMITED',
    message: '本日のAI Assistant利用上限に達しました。通常のメニューをご利用ください。',
  },
  500: {
    code: 'INTERNAL_ERROR',
    message: 'AI Assistantで問題が発生しました。通常のメニューをご利用ください。',
  },
  502: {
    code: 'UPSTREAM_UNAVAILABLE',
    message: '現在AI Assistantを利用できません。通常のメニューをご利用ください。',
  },
  504: {
    code: 'UPSTREAM_TIMEOUT',
    message: 'AI Assistantの応答に時間がかかっています。しばらくしてからお試しください。',
  },
} as const;

type ErrorStatusCode = keyof typeof ERROR_RESPONSES;
type DependencyStage = 'internal' | 'secret' | 'quota' | 'openai';
type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export interface AssistantHandlerDependencies {
  allowedOrigins: ReadonlySet<string>;
  now(): Date;
  getApiKey(): Promise<string>;
  reserveQuota(input: QuotaReservationInput): Promise<void>;
  searchContent(message: string): Promise<RankedContentEntry[]>;
  requestOpenAI(input: GroundedRequestOpenAIInput): Promise<OpenAIResult>;
  log(record: Record<string, string | number>): void;
}

export type AssistantHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
) => Promise<APIGatewayProxyResult>;

function readOrigin(event: APIGatewayProxyEvent): string | undefined {
  const direct = event.headers.origin ?? event.headers.Origin;
  if (direct !== undefined) return direct;

  for (const [name, value] of Object.entries(event.headers)) {
    if (name.toLowerCase() === 'origin' && value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function readHeader(event: APIGatewayProxyEvent, expectedName: string): string | undefined {
  for (const [name, value] of Object.entries(event.headers)) {
    if (name.toLowerCase() === expectedName && value !== undefined) return value.trim();
  }
  return undefined;
}

interface EvaluationCorrelation {
  runId: string;
  caseId: string;
}

function readEvaluationCorrelation(
  event: APIGatewayProxyEvent,
): EvaluationCorrelation | undefined {
  const runId = readHeader(event, 'x-tti-evaluation-run-id');
  const caseId = readHeader(event, 'x-tti-evaluation-case-id');
  if (
    runId === undefined
    || caseId === undefined
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)
    || !/^L(?:0(?:0[1-9]|[1-9][0-9])|100)$/u.test(caseId)
  ) {
    return undefined;
  }
  return { runId: runId.toLowerCase(), caseId };
}

function responseHeaders(
  origin: string | undefined,
  evaluationRequestId?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (evaluationRequestId !== undefined) {
    headers['X-TTI-Server-Request-Id'] = evaluationRequestId;
  }
  if (origin === undefined) {
    return headers;
  }

  return Object.assign(headers, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    // Evaluation headers are CLI-only and intentionally excluded from browser preflight.
    'Access-Control-Allow-Headers': 'Content-Type,Cache-Control',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  });
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  origin: string | undefined,
  evaluationRequestId?: string,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: responseHeaders(origin, evaluationRequestId),
    body: JSON.stringify(body),
  };
}

function errorResponse(
  statusCode: ErrorStatusCode,
  origin: string | undefined,
  evaluationRequestId?: string,
): APIGatewayProxyResult {
  return jsonResponse(statusCode, ERROR_RESPONSES[statusCode], origin, evaluationRequestId);
}

function requestIdFor(
  event: APIGatewayProxyEvent,
  context: Context,
): string {
  const gatewayRequestId = event.requestContext.requestId?.trim();
  const lambdaRequestId = context.awsRequestId?.trim();
  return gatewayRequestId || lambdaRequestId || '';
}

function requireEnvironmentValue(
  environment: RuntimeEnvironment,
  variableName: string,
): string {
  const value = environment[variableName]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(
      `Invalid assistant configuration: ${variableName} is required`,
    );
  }
  return value;
}

function readAllowedOrigins(environment: RuntimeEnvironment): ReadonlySet<string> {
  const rawOrigins = requireEnvironmentValue(environment, 'ALLOWED_ORIGINS');
  const origins = new Set(
    rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  );

  if (origins.size === 0) {
    throw new Error(
      'Invalid assistant configuration: ALLOWED_ORIGINS must contain an origin',
    );
  }

  return origins;
}

function safeUsage(usage: Readonly<OpenAIUsage>): OpenAIUsage {
  const token = (value: number): number => (
    Number.isSafeInteger(value) && value >= 0 ? value : 0
  );

  return {
    inputTokens: token(usage.inputTokens),
    cachedInputTokens: token(usage.cachedInputTokens),
    cacheWriteTokens: token(usage.cacheWriteTokens),
    outputTokens: token(usage.outputTokens),
    totalTokens: token(usage.totalTokens),
  };
}

const PROTOCOL_RELATIVE_URL_TARGET = /^(?:[^@/]+@)?(?:\[[0-9A-Fa-f:.]+\]|localhost|(?:[\p{L}\p{N}-]+\.)+[\p{L}\p{N}-]+)(?::\d+)?(?:[/?#].*)?$/u;

function stripProtocolRelativeUrl(
  match: string,
  prefix: string,
  target: string,
): string {
  return PROTOCOL_RELATIVE_URL_TARGET.test(target) ? prefix : match;
}

function sanitizeModelAnswer(answer: string): string {
  return answer
    .trim()
    .replace(
      /\[([^\]]+)]\((?:(?:https?|ftp):\/\/|\/\/|www\.)[^)\s]+\)/gi,
      '$1',
    )
    .replace(
      /<(?:(?:https?|ftp):\/\/|\/\/|www\.)[^>\s]+>/gi,
      '',
    )
    .replace(/(?:https?|ftp):\/\/[^\s<>"'。．、，！？）)}]+/gi, '')
    .replace(
      /(^|[^A-Za-z0-9/])\/\/([^\s<>"'。．、，！？）)\]}]+)/gu,
      stripProtocolRelativeUrl,
    )
    .replace(/(^|[^A-Za-z0-9.])www\.[^\s<>"'。．、，！？）)\]}]+/gi, '$1')
    .trim();
}

function hasMeaningfulModelAnswer(answer: string): boolean {
  return /[\p{L}\p{N}\p{S}]/u.test(answer);
}

function createPublicAnswer(
  output: ModelGuideResponse,
  modelAnswer: string,
): string {
  if (output.scope === 'university') return UNIVERSITY_DIRECTION;
  if (output.scope === 'out_of_scope') {
    return `申し訳ありませんが、${output.topicLabel}については案内できません。必要であればお問い合わせください。`;
  }
  return modelAnswer;
}

function createVerifiedPageLinks(
  pageIds: readonly string[],
  allowedPageIds: ReadonlySet<PageId>,
): AssistantLink[] {
  const seen = new Set<PageId>();
  const links: AssistantLink[] = [];

  for (const pageId of pageIds) {
    if (!Object.hasOwn(KNOWN_PAGE_ROUTES, pageId)) continue;
    const verifiedPageId = pageId as PageId;
    if (
      seen.has(verifiedPageId)
      || !allowedPageIds.has(verifiedPageId)
    ) {
      continue;
    }
    seen.add(verifiedPageId);
    const route = KNOWN_PAGE_ROUTES[verifiedPageId];
    links.push({
      pageId: verifiedPageId,
      title: route.title,
      href: route.href,
    });
  }

  return links;
}

function createScopeAwareLinks(
  output: ModelGuideResponse,
  knowledgePack: AssistantKnowledgePack,
  content: readonly RankedContentEntry[],
): AssistantLink[] {
  if (output.scope === 'university') {
    return createVerifiedOfficialLinks(['toyota-ti']);
  }
  if (output.scope === 'out_of_scope') {
    return createVerifiedPageLinks(['contact'], new Set<PageId>(['contact']));
  }

  const allowedPageIdSet = new Set<PageId>(
    knowledgePack.entries.flatMap((entry) => entry.pageIds),
  );
  const pageLinks = createVerifiedPageLinks(
    output.pageIds,
    allowedPageIdSet,
  );

  const contentById = new Map<string, RankedContentEntry>();
  for (const rankedEntry of content) {
    if (!contentById.has(rankedEntry.entry.id)) {
      contentById.set(rankedEntry.entry.id, rankedEntry);
    }
  }
  const returnedContent = output.contentIds
    .map((contentId) => contentById.get(contentId))
    .filter((entry): entry is RankedContentEntry => entry !== undefined);
  const contentLinks = createVerifiedContentLinks(
    returnedContent,
    MAX_ASSISTANT_LINKS,
  );

  const sourceLinks = createVerifiedOfficialLinks(output.sourceIds);

  const links: AssistantLink[] = [];
  const seenHrefs = new Set<string>();
  for (const link of [...pageLinks, ...contentLinks, ...sourceLinks]) {
    if (links.length >= MAX_ASSISTANT_LINKS) break;
    if (seenHrefs.has(link.href)) continue;
    seenHrefs.add(link.href);
    links.push(link);
  }
  return links;
}

export function createAssistantHandler(
  dependencies: AssistantHandlerDependencies,
): AssistantHandler {
  return async (event, context) => {
    const startedAt = Date.now();
    const requestId = requestIdFor(event, context);
    const evaluationCorrelation = readEvaluationCorrelation(event);
    const evaluationRequestId = evaluationCorrelation === undefined ? undefined : requestId;
    const evaluationObservedAt = evaluationCorrelation === undefined
      ? undefined
      : dependencies.now().toISOString();
    let origin: string | undefined;
    let outcome = 'internal_error';
    let statusCode = 500;
    let dependencyStage: DependencyStage = 'internal';
    let inputTokens = 0;
    let cachedInputTokens = 0;
    let cacheWriteTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let knowledgeCount = 0;
    let knowledgeDomains = '';
    let lunaCallCount = 0;
    let assistantScope = 'unclassified';

    try {
      const requestedOrigin = readOrigin(event);
      if (
        requestedOrigin !== undefined
        && !dependencies.allowedOrigins.has(requestedOrigin)
      ) {
        outcome = 'origin_not_allowed';
        statusCode = 403;
        return errorResponse(403, undefined, evaluationRequestId);
      }
      origin = requestedOrigin;

      const method = event.httpMethod.toUpperCase();
      if (method !== 'POST' && method !== 'OPTIONS') {
        outcome = 'invalid_request';
        statusCode = 400;
        return errorResponse(400, origin, evaluationRequestId);
      }

      if (method === 'OPTIONS') {
        outcome = 'preflight';
        statusCode = 204;
        return {
          statusCode,
          headers: responseHeaders(origin, evaluationRequestId),
          body: '',
        };
      }

      if (event.isBase64Encoded) {
        throw new RequestValidationError('Invalid assistant request');
      }
      const request = parseAssistantRequest(event.body);

      if (requestId.length === 0) {
        outcome = 'internal_error';
        statusCode = 500;
        return errorResponse(500, origin, evaluationRequestId);
      }

      const localResponse = localConversationResponseFor(request.message);
      if (localResponse !== null) {
        assistantScope = 'conversation';
        outcome = 'local_conversation';
        statusCode = 200;
        return jsonResponse(statusCode, localResponse, origin, evaluationRequestId);
      }

      const reservationInput: QuotaReservationInput = {
        sessionId: request.sessionId,
        requestId,
        now: dependencies.now(),
      };
      dependencyStage = 'quota';
      await dependencies.reserveQuota(reservationInput);
      dependencyStage = 'internal';

      dependencyStage = 'secret';
      const apiKey = await dependencies.getApiKey();
      dependencyStage = 'internal';

      const knowledgePack = buildAssistantKnowledgePack();
      knowledgeCount = knowledgePack.entries.length;
      knowledgeDomains = [...new Set(
        knowledgePack.entries.map((entry) => entry.topicId.split('.')[0] ?? ''),
      )].join(',');

      const dynamicContent = shouldSearchDynamicContent(
        request.message,
        request.currentPath,
      )
        ? await retrieveDynamicContentSafely(
          () => dependencies.searchContent(request.message),
        )
        : { content: [] };
      const content = dynamicContent.content.slice(0, 3);

      dependencyStage = 'openai';
      lunaCallCount += 1;
      const result = await dependencies.requestOpenAI({
        apiKey,
        request,
        knowledgePack,
        content,
      });
      dependencyStage = 'internal';

      if (!('scope' in result.output) || !('topicLabel' in result.output)) {
        throw new UnsafeModelOutputError('Unsafe model output', result.usage);
      }
      assistantScope = result.output.scope;
      const modelAnswer = sanitizeModelAnswer(result.output.answer);
      if (!hasMeaningfulModelAnswer(modelAnswer)) {
        throw new UnsafeModelOutputError('Unsafe model output', result.usage);
      }
      const answer = createPublicAnswer(result.output, modelAnswer);
      const usage = safeUsage(result.usage);
      inputTokens = usage.inputTokens;
      cachedInputTokens = usage.cachedInputTokens;
      cacheWriteTokens = usage.cacheWriteTokens;
      outputTokens = usage.outputTokens;
      totalTokens = usage.totalTokens;

      outcome = 'ai_success';
      statusCode = 200;
      return jsonResponse(statusCode, {
        answer,
        links: createScopeAwareLinks(
          result.output,
          knowledgePack,
          content,
        ),
      }, origin, evaluationRequestId);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        outcome = 'invalid_request';
        statusCode = 400;
        return errorResponse(400, origin, evaluationRequestId);
      }

      if (error instanceof UnsafeModelOutputError) {
        if (error.usage !== undefined) {
          const usage = safeUsage(error.usage);
          inputTokens = usage.inputTokens;
          cachedInputTokens = usage.cachedInputTokens;
          cacheWriteTokens = usage.cacheWriteTokens;
          outputTokens = usage.outputTokens;
          totalTokens = usage.totalTokens;
        }
        outcome = 'unsafe_model_output';
        statusCode = 502;
        return errorResponse(502, origin, evaluationRequestId);
      }

      if (error instanceof QuotaExceededError) {
        outcome = 'rate_limited';
        statusCode = 429;
        return errorResponse(429, origin, evaluationRequestId);
      }

      if (error instanceof OpenAiTimeoutError) {
        outcome = 'upstream_timeout';
        statusCode = 504;
        return errorResponse(504, origin, evaluationRequestId);
      }

      if (
        error instanceof SecretUnavailableError
        || error instanceof QuotaInfrastructureError
        || error instanceof OpenAiUpstreamError
        || dependencyStage !== 'internal'
      ) {
        outcome = 'upstream_unavailable';
        statusCode = 502;
        return errorResponse(502, origin, evaluationRequestId);
      }

      outcome = 'internal_error';
      statusCode = 500;
      return errorResponse(500, origin, evaluationRequestId);
    } finally {
      try {
        dependencies.log({
          requestId,
          outcome,
          statusCode,
          durationMs: Math.max(0, Date.now() - startedAt),
          inputTokens,
          cachedInputTokens,
          cacheWriteTokens,
          outputTokens,
          totalTokens,
          knowledgeCount,
          knowledgeDomains,
          lunaCallCount,
          webCallCount: 0,
          assistantScope,
          ...(evaluationCorrelation === undefined ? {} : {
            evaluationRunId: evaluationCorrelation.runId,
            evaluationCaseId: evaluationCorrelation.caseId,
            evaluationObservedAt: evaluationObservedAt ?? '',
          }),
        });
      } catch {
        // Logging must never change the client response or expose error details.
      }
    }
  };
}

export function createRuntimeDependencies(
  environment: RuntimeEnvironment = process.env,
): AssistantHandlerDependencies {
  const secretId = requireEnvironmentValue(environment, 'OPENAI_SECRET_ID');
  // Preserve deployment validation while the OpenAI boundary enforces Luna.
  requireEnvironmentValue(environment, 'ASSISTANT_MODEL');
  const postsTable = requireEnvironmentValue(environment, 'POSTS_TABLE');
  const boardTable = requireEnvironmentValue(environment, 'BOARD_TABLE');
  const firebaseApiKey = requireEnvironmentValue(environment, 'FIREBASE_API_KEY');
  const firebaseProjectId = requireEnvironmentValue(
    environment,
    'FIREBASE_PROJECT_ID',
  );
  const allowedOrigins = readAllowedOrigins(environment);
  const quotaConfig = readQuotaConfig(environment);

  const secretsClient = new SecretsManagerClient({});
  const getApiKey = createApiKeyProvider(secretsClient, secretId);
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const contentRepositories: ContentRepositories = createContentRepositories({
    documentClient,
    postsTable,
    boardTable,
    firebaseApiKey,
    firebaseProjectId,
  });

  return {
    allowedOrigins,
    now: () => new Date(),
    getApiKey,
    reserveQuota: (input) => reserveQuota(
      (command) => documentClient.send(command),
      quotaConfig,
      input,
    ),
    searchContent: (message) => selectRelevantContent(message, contentRepositories),
    requestOpenAI: (input) => callOpenAI({
      ...input,
      timeoutMs: OPENAI_TIMEOUT_MS,
    }),
    log: (record) => {
      console.info(JSON.stringify(record));
    },
  };
}

let runtimeHandler: AssistantHandler | undefined;

export const handler: APIGatewayProxyHandler = async (event, context) => {
  runtimeHandler ??= createAssistantHandler(
    createRuntimeDependencies(process.env),
  );
  return runtimeHandler(event, context);
};
