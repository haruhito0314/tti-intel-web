import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

import { createVerifiedContentLinks } from './runtimeCatalog.js';
import {
  selectRelevantContent,
  type ContentRepositories,
} from './contentSearch.js';
import { createContentRepositories } from './contentRepos.js';
import {
  answerFromPlan,
  planAssistantRequest,
  planFromFactSelection,
  type AssistantQueryPlan,
} from './engine.js';
import {
  requestOpenAIPlan as callOpenAIPlan,
  type OpenAIPlanResult,
} from './factPlanner.js';
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
import type {
  AssistantRequest,
  AssistantResponse,
  OpenAIUsage,
  RankedContentEntry,
} from './types.js';
import {
  parseAssistantRequest,
  RequestValidationError,
  UnsafeModelOutputError,
} from './validation.js';

const OPENAI_TIMEOUT_MS = 20_000;

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
type DependencyStage = 'internal' | 'content' | 'secret' | 'quota' | 'openai';
type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export const CONTACT_FALLBACK: AssistantResponse = {
  answer: '申し訳ないですが、その内容にはお答えできません。このサイトの活動やページについてご質問があれば、お手伝いします。',
  links: [{ pageId: 'contact', title: 'お問い合わせ', href: '/contact' }],
};

function fallbackResponseFor(plan: AssistantQueryPlan): AssistantResponse {
  if (
    plan.suppressLinks
    || plan.excludedPageIds.includes('contact')
    || plan.excludedFactIds.includes('contact.form')
  ) {
    return { answer: CONTACT_FALLBACK.answer, links: [] };
  }
  return CONTACT_FALLBACK;
}

const CONTENT_MATCH_ANSWER = '関連する公開コンテンツが見つかりました。下のリンクから確認できます。';

export interface AssistantHandlerDependencies {
  allowedOrigins: ReadonlySet<string>;
  now(): Date;
  getApiKey(): Promise<string>;
  reserveQuota(input: QuotaReservationInput): Promise<void>;
  searchContent(message: string): Promise<RankedContentEntry[]>;
  requestOpenAIPlan(input: {
    apiKey: string;
    request: AssistantRequest;
  }): Promise<OpenAIPlanResult>;
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
    outputTokens: token(usage.outputTokens),
    totalTokens: token(usage.totalTokens),
  };
}

function contentResponseFor(
  content: readonly RankedContentEntry[],
  plan: AssistantQueryPlan,
): AssistantResponse {
  const allowedContent = content.filter(({ entry }) => (
    !plan.excludedPageIds.includes(entry.parentPageId)
  ));
  const links = plan.suppressLinks
    ? []
    : createVerifiedContentLinks(allowedContent);

  return {
    answer: links.length > 0
      ? CONTENT_MATCH_ANSWER
      : '関連する公開コンテンツが見つかりました。',
    links,
  };
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
    let outputTokens = 0;
    let totalTokens = 0;
    let fallbackPlan: AssistantQueryPlan | undefined;

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
      const initialPlan = planAssistantRequest(request.message, request.history);
      fallbackPlan = initialPlan;

      // Clearly out-of-scope requests do not consume quota or reach external systems.
      if (initialPlan.confidence === 'none') {
        outcome = 'no_relevant_knowledge';
        statusCode = 200;
        return jsonResponse(statusCode, fallbackResponseFor(initialPlan), origin);
      }

      if (requestId.length === 0) {
        outcome = 'internal_error';
        statusCode = 500;
        return errorResponse(500, origin);
      }

      const capturedNow = dependencies.now();
      const reservationInput: QuotaReservationInput = {
        sessionId: request.sessionId,
        requestId,
        now: capturedNow,
      };
      // Reserve quota before Secrets Manager so rate-limited sessions skip the secret fetch.
      dependencyStage = 'quota';
      await dependencies.reserveQuota(reservationInput);
      dependencyStage = 'internal';

      let content: RankedContentEntry[] = [];
      if (initialPlan.confidence === 'low') {
        // Quota protects every repository read. Dynamic content stays local.
        dependencyStage = 'content';
        content = await dependencies.searchContent(request.message);
        dependencyStage = 'internal';
      }

      const allowedContent = content.filter(({ entry }) => (
        !initialPlan.excludedPageIds.includes(entry.parentPageId)
      ));
      if (allowedContent.length > 0) {
        outcome = 'content_success';
        statusCode = 200;
        return jsonResponse(
          statusCode,
          contentResponseFor(allowedContent, initialPlan),
          origin,
        );
      }

      let finalPlan = initialPlan;
      if (initialPlan.confidence === 'low') {
        dependencyStage = 'secret';
        const apiKey = await dependencies.getApiKey();
        dependencyStage = 'internal';

        dependencyStage = 'openai';
        const plannerRequest = initialPlan.requiresHistory
          ? request
          : { ...request, history: [] };
        const result = await dependencies.requestOpenAIPlan({
          apiKey,
          request: plannerRequest,
        });
        dependencyStage = 'internal';

        const usage = safeUsage(result.usage);
        inputTokens = usage.inputTokens;
        outputTokens = usage.outputTokens;
        totalTokens = usage.totalTokens;

        if (result.output.unsupported) {
          outcome = 'no_relevant_knowledge';
          statusCode = 200;
          return jsonResponse(statusCode, fallbackResponseFor(initialPlan), origin);
        }

        finalPlan = planFromFactSelection(result.output.factIds, initialPlan);
        outcome = 'planner_success';
      } else {
        outcome = finalPlan.mode === 'small-talk'
          ? 'small_talk_success'
          : 'direct_success';
      }

      statusCode = 200;
      return jsonResponse(statusCode, answerFromPlan(finalPlan), origin);
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
          outputTokens = usage.outputTokens;
          totalTokens = usage.totalTokens;
        }
        outcome = 'unsafe_model_output';
        statusCode = 200;
        return jsonResponse(
          statusCode,
          fallbackPlan === undefined
            ? CONTACT_FALLBACK
            : fallbackResponseFor(fallbackPlan),
          origin,
        );
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
          outputTokens,
          totalTokens,
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
  const model = requireEnvironmentValue(environment, 'ASSISTANT_MODEL');
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
    requestOpenAIPlan: ({ apiKey, request }) => (
      callOpenAIPlan({
        apiKey,
        request,
        model,
        timeoutMs: OPENAI_TIMEOUT_MS,
      })
    ),
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
