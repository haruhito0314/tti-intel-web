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
  planAssistantRequest,
  type AssistantQueryPlan,
} from './engine.js';
import {
  requestOpenAI as callOpenAI,
  type RequestOpenAIInput,
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
import { selectStructuredKnowledge } from './structuredKnowledge.js';
import type {
  AssistantLink,
  OpenAIResult,
  OpenAIUsage,
  PageId,
  RankedContentEntry,
  RankedKnowledgeItem,
} from './types.js';
import {
  parseAssistantRequest,
  RequestValidationError,
  UnsafeModelOutputError,
} from './validation.js';

const OPENAI_TIMEOUT_MS = 20_000;
const OPENAI_MODEL = 'gpt-5.6-luna' as const;
const MAX_ASSISTANT_LINKS = 4;

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
  requestOpenAI(input: RequestOpenAIInput): Promise<OpenAIResult>;
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

function responseHeaders(origin: string | undefined): Record<string, string> {
  if (origin === undefined) {
    return { 'Content-Type': 'application/json; charset=utf-8' };
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Cache-Control',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  origin: string | undefined,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: responseHeaders(origin),
    body: JSON.stringify(body),
  };
}

function errorResponse(
  statusCode: ErrorStatusCode,
  origin: string | undefined,
): APIGatewayProxyResult {
  return jsonResponse(statusCode, ERROR_RESPONSES[statusCode], origin);
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

function sanitizeModelAnswer(answer: string): string {
  return answer
    .trim()
    .replace(/\[([^\]]+)]\(https?:\/\/[^)\s]+\)/gi, '$1')
    .replace(/<https?:\/\/[^>\s]+>/gi, '')
    .replace(/https?:\/\/[^\s<>"'。．、，！？）)\]}]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createVerifiedPageLinks(
  pageIds: readonly string[],
  allowedPageIds: ReadonlySet<PageId>,
  excludedPageIds: readonly PageId[],
): AssistantLink[] {
  const excluded = new Set<PageId>(excludedPageIds);
  const seen = new Set<PageId>();
  const links: AssistantLink[] = [];

  for (const pageId of pageIds) {
    if (!Object.hasOwn(KNOWN_PAGE_ROUTES, pageId)) continue;
    const verifiedPageId = pageId as PageId;
    if (
      seen.has(verifiedPageId)
      || !allowedPageIds.has(verifiedPageId)
      || excluded.has(verifiedPageId)
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

function sourceIsExcluded(
  sourceId: string,
  plan: AssistantQueryPlan,
): boolean {
  if (sourceId === 'discord' || sourceId === 'youtube') {
    return plan.excludedExternalLinks.includes(sourceId);
  }
  return sourceId.startsWith('tti-')
    && plan.excludedExternalLinks.includes('toyota-ti');
}

function createFinalLinks(
  output: OpenAIResult['output'],
  knowledge: readonly RankedKnowledgeItem[],
  content: readonly RankedContentEntry[],
  plan: AssistantQueryPlan,
): AssistantLink[] {
  if (plan.suppressLinks) return [];

  const allowedPageIds = new Set<PageId>([
    ...plan.pageIds,
    ...content.map(({ entry }) => entry.parentPageId),
  ]);
  const pageLinks = createVerifiedPageLinks(
    output.pageIds,
    allowedPageIds,
    plan.excludedPageIds,
  );

  const contentById = new Map<string, RankedContentEntry>();
  for (const rankedEntry of content) {
    if (!contentById.has(rankedEntry.entry.id)) {
      contentById.set(rankedEntry.entry.id, rankedEntry);
    }
  }
  const returnedContent = output.contentIds
    .map((contentId) => contentById.get(contentId))
    .filter((entry): entry is RankedContentEntry => (
      entry !== undefined
      && !plan.excludedPageIds.includes(entry.entry.parentPageId)
    ));
  const contentLinks = createVerifiedContentLinks(
    returnedContent,
    MAX_ASSISTANT_LINKS,
  );

  const allowedSourceIds: ReadonlySet<string> = new Set<string>(
    knowledge.flatMap(({ item }) => item.sourceIds),
  );
  const sourceLinks = createVerifiedOfficialLinks(
    output.sourceIds.filter((sourceId) => (
      allowedSourceIds.has(sourceId)
      && !sourceIsExcluded(sourceId, plan)
    )),
  );

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

    try {
      const requestedOrigin = readOrigin(event);
      if (
        requestedOrigin !== undefined
        && !dependencies.allowedOrigins.has(requestedOrigin)
      ) {
        outcome = 'origin_not_allowed';
        statusCode = 403;
        return errorResponse(403, undefined);
      }
      origin = requestedOrigin;

      const method = event.httpMethod.toUpperCase();
      if (method !== 'POST' && method !== 'OPTIONS') {
        outcome = 'invalid_request';
        statusCode = 400;
        return errorResponse(400, origin);
      }

      if (method === 'OPTIONS') {
        outcome = 'preflight';
        statusCode = 204;
        return {
          statusCode,
          headers: responseHeaders(origin),
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
        return errorResponse(500, origin);
      }

      const reservationInput: QuotaReservationInput = {
        sessionId: request.sessionId,
        requestId,
        now: dependencies.now(),
      };
      dependencyStage = 'quota';
      await dependencies.reserveQuota(reservationInput);
      dependencyStage = 'internal';

      const dynamicContent = await retrieveDynamicContentSafely(
        () => dependencies.searchContent(request.message),
      );
      const plan = planAssistantRequest(request.message, request.history);
      const knowledge = selectStructuredKnowledge(
        request.message,
        request.currentPath,
        request.history,
      );
      knowledgeCount = knowledge.length;
      knowledgeDomains = [...new Set(
        knowledge.map(({ item }) => item.domain),
      )].join(',');

      dependencyStage = 'secret';
      const apiKey = await dependencies.getApiKey();
      dependencyStage = 'internal';

      dependencyStage = 'openai';
      lunaCallCount += 1;
      const result = await dependencies.requestOpenAI({
        apiKey,
        request,
        knowledge,
        content: dynamicContent.content,
        dynamicContentAvailable: dynamicContent.dynamicContentAvailable,
        model: OPENAI_MODEL,
        contextualFollowUp: plan.requiresHistory,
      });
      dependencyStage = 'internal';

      const answer = sanitizeModelAnswer(result.output.answer);
      if (answer.length === 0) {
        throw new UnsafeModelOutputError('Unsafe model output', result.usage);
      }
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
        links: createFinalLinks(
          result.output,
          knowledge,
          dynamicContent.content,
          plan,
        ),
      }, origin);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        outcome = 'invalid_request';
        statusCode = 400;
        return errorResponse(400, origin);
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
        return errorResponse(502, origin);
      }

      if (error instanceof QuotaExceededError) {
        outcome = 'rate_limited';
        statusCode = 429;
        return errorResponse(429, origin);
      }

      if (error instanceof OpenAiTimeoutError) {
        outcome = 'upstream_timeout';
        statusCode = 504;
        return errorResponse(504, origin);
      }

      if (
        error instanceof SecretUnavailableError
        || error instanceof QuotaInfrastructureError
        || error instanceof OpenAiUpstreamError
        || dependencyStage !== 'internal'
      ) {
        outcome = 'upstream_unavailable';
        statusCode = 502;
        return errorResponse(502, origin);
      }

      outcome = 'internal_error';
      statusCode = 500;
      return errorResponse(500, origin);
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
