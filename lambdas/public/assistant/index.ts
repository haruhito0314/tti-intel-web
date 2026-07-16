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
  buildFollowUpSearchQuery,
  createVerifiedLinks,
  GUIDE_ENTRIES,
  selectRelevantKnowledge,
} from './knowledge.js';
import {
  selectRelevantContent,
  type ContentRepositories,
} from './contentSearch.js';
import { createContentRepositories } from './contentRepos.js';
import {
  createApiKeyProvider,
  OpenAiTimeoutError,
  OpenAiUpstreamError,
  requestOpenAI,
  SecretUnavailableError,
  type AssistantOpenAIMode,
} from './openai.js';
import {
  QuotaExceededError,
  QuotaInfrastructureError,
  readQuotaConfig,
  reserveQuota,
  type QuotaReservationInput,
} from './quota.js';
import { isCasualConversation } from './smallTalk.js';
import type {
  AssistantRequest,
  AssistantResponse,
  OpenAIResult,
  OpenAIUsage,
  RankedContentEntry,
  RankedGuideEntry,
} from './types.js';
import {
  recordUnansweredQuestion,
  type UnansweredReason,
} from './unansweredQuestions.js';
import {
  parseAssistantRequest,
  RequestValidationError,
  UnsafeModelOutputError,
  validateModelGuideResponse,
} from './validation.js';

const OPENAI_TIMEOUT_MS = 20_000;

const SMALL_TALK_SELECTED: RankedGuideEntry[] = GUIDE_ENTRIES
  .filter(({ id }) => id === 'home')
  .map((entry) => ({ entry, score: 3 }));

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

export const CONTACT_FALLBACK: AssistantResponse = {
  answer: '申し訳ないですが、その内容にはお答えできません。このサイトの活動やページについてご質問があれば、お手伝いします。',
  links: [{ pageId: 'contact', title: 'Contact', href: '/contact' }],
};

export interface AssistantHandlerDependencies {
  allowedOrigins: ReadonlySet<string>;
  now(): Date;
  getApiKey(): Promise<string>;
  reserveQuota(input: QuotaReservationInput): Promise<void>;
  searchContent(message: string): Promise<RankedContentEntry[]>;
  requestOpenAI(input: {
    apiKey: string;
    request: AssistantRequest;
    selected: readonly RankedGuideEntry[];
    content?: readonly RankedContentEntry[];
    mode?: AssistantOpenAIMode;
  }): Promise<OpenAIResult>;
  recordUnanswered(input: {
    requestId: string;
    message: string;
    currentPath: string;
    reason: UnansweredReason;
    now: Date;
  }): Promise<void>;
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

async function captureUnanswered(
  dependencies: AssistantHandlerDependencies,
  input: {
    requestId: string;
    message: string;
    currentPath: string;
    reason: UnansweredReason;
    now: Date;
  },
): Promise<void> {
  try {
    await dependencies.recordUnanswered(input);
  } catch {
    // Persistence must never change the client response.
  }
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
    let unansweredRequest: AssistantRequest | undefined;

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
      unansweredRequest = request;
      let selected = selectRelevantKnowledge(
        request.message,
        request.currentPath,
      );
      let content = await dependencies.searchContent(request.message);
      const followUpQuery = selected.length === 0
        && content.length === 0
        && !isCasualConversation(request.message)
        ? buildFollowUpSearchQuery(request.message, request.history)
        : null;
      if (followUpQuery !== null) {
        selected = selectRelevantKnowledge(
          followUpQuery,
          request.currentPath,
        );
        content = await dependencies.searchContent(followUpQuery);
      }
      const smallTalk = selected.length === 0
        && content.length === 0
        && isCasualConversation(request.message);

      if (selected.length === 0 && content.length === 0 && !smallTalk) {
        outcome = 'no_relevant_knowledge';
        statusCode = 200;
        await captureUnanswered(dependencies, {
          requestId,
          message: request.message,
          currentPath: request.currentPath,
          reason: 'no_relevant_knowledge',
          now: dependencies.now(),
        });
        return jsonResponse(statusCode, CONTACT_FALLBACK, origin);
      }

      if (requestId.length === 0) {
        outcome = 'internal_error';
        statusCode = 500;
        return errorResponse(500, origin);
      }

      dependencyStage = 'secret';
      const apiKey = await dependencies.getApiKey();
      dependencyStage = 'internal';

      const capturedNow = dependencies.now();
      const reservationInput: QuotaReservationInput = {
        sessionId: request.sessionId,
        requestId,
        now: capturedNow,
      };
      dependencyStage = 'quota';
      await dependencies.reserveQuota(reservationInput);
      dependencyStage = 'internal';

      const openAiSelected = smallTalk ? SMALL_TALK_SELECTED : selected;
      const openAiContent = smallTalk ? [] : content;
      const openAiMode: AssistantOpenAIMode = smallTalk
        ? 'small_talk'
        : 'guide';

      dependencyStage = 'openai';
      const result = await dependencies.requestOpenAI({
        apiKey,
        request,
        selected: openAiSelected,
        content: openAiContent,
        mode: openAiMode,
      });
      dependencyStage = 'internal';

      const usage = safeUsage(result.usage);
      inputTokens = usage.inputTokens;
      outputTokens = usage.outputTokens;
      totalTokens = usage.totalTokens;
      const output = validateModelGuideResponse(result.output);

      outcome = smallTalk ? 'small_talk_success' : 'success';
      statusCode = 200;
      return jsonResponse(statusCode, {
        answer: output.answer,
        links: createVerifiedLinks(
          output.pageIds,
          openAiSelected,
          output.contentIds,
          openAiContent,
        ),
      } satisfies AssistantResponse, origin);
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
        if (unansweredRequest !== undefined) {
          await captureUnanswered(dependencies, {
            requestId,
            message: unansweredRequest.message,
            currentPath: unansweredRequest.currentPath,
            reason: 'unsafe_model_output',
            now: dependencies.now(),
          });
        }
        return jsonResponse(statusCode, CONTACT_FALLBACK, origin);
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
  const smallTalkModel = requireEnvironmentValue(
    environment,
    'ASSISTANT_SMALL_TALK_MODEL',
  );
  const postsTable = requireEnvironmentValue(environment, 'POSTS_TABLE');
  const boardTable = requireEnvironmentValue(environment, 'BOARD_TABLE');
  const unansweredTable = requireEnvironmentValue(
    environment,
    'ASSISTANT_UNANSWERED_TABLE',
  );
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
    requestOpenAI: ({
      apiKey,
      request,
      selected,
      content = [],
      mode = 'guide',
    }) => (
      requestOpenAI({
        apiKey,
        request,
        selected,
        content,
        mode,
        model: mode === 'small_talk' ? smallTalkModel : model,
        timeoutMs: OPENAI_TIMEOUT_MS,
      })
    ),
    recordUnanswered: (input) => recordUnansweredQuestion(
      documentClient,
      unansweredTable,
      input,
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
