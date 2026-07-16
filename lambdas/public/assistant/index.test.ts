import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  CONTACT_FALLBACK,
  createAssistantHandler,
  createRuntimeDependencies,
  type AssistantHandlerDependencies,
} from './index.js';
import {
  OpenAiTimeoutError,
  OpenAiUpstreamError,
  SecretUnavailableError,
} from './openai.js';
import {
  QuotaExceededError,
  QuotaInfrastructureError,
} from './quota.js';
import type { AssistantRequest, OpenAIResult } from './types.js';
import { UnsafeModelOutputError } from './validation.js';

const allowedOrigins = new Set([
  'https://tti-intel.com',
  'http://localhost:5173',
]);

const quotaNow = new Date('2026-07-16T15:00:00.000Z');

const validRequest: AssistantRequest = {
  message: '今週の数学はどこ？ UNIQUE_MESSAGE_778899',
  currentPath: '/news',
  sessionId: '11111111-1111-4111-8111-111111111111',
  history: [{ role: 'user', content: 'UNIQUE_HISTORY_445566' }],
};

const successfulOpenAIResult: OpenAIResult = {
  output: {
    answer: '今週の数学から確認できます。',
    pageIds: ['weekly-math'],
  contentIds: [],
  },
  usage: {
    inputTokens: 120,
    outputTokens: 30,
    totalTokens: 150,
  },
};

function validPostEvent(
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent {
  const base = {
    resource: '/assistant',
    path: '/assistant',
    httpMethod: 'POST',
    headers: { Origin: 'https://tti-intel.com' },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '111111111111',
      apiId: 'api-id',
      authorizer: null,
      httpMethod: 'POST',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '192.0.2.1',
        user: null,
        userAgent: 'vitest',
        userArn: null,
      },
      path: '/prod/assistant',
      protocol: 'HTTP/1.1',
      requestId: 'api-gateway-request-1',
      requestTimeEpoch: 1_784_150_400_000,
      resourceId: 'assistant-resource',
      resourcePath: '/assistant',
      stage: 'prod',
    },
    body: JSON.stringify(validRequest),
    isBase64Encoded: false,
  } as APIGatewayProxyEvent;

  return {
    ...base,
    ...overrides,
    requestContext: {
      ...base.requestContext,
      ...overrides.requestContext,
    },
  };
}

function fakeContext(overrides: Partial<Context> = {}): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'assistant-test',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:111111111111:function:assistant-test',
    memoryLimitInMB: '256',
    awsRequestId: 'lambda-request-1',
    logGroupName: '/aws/lambda/assistant-test',
    logStreamName: '2026/07/16/test',
    getRemainingTimeInMillis: () => 25_000,
    done: () => undefined,
    fail: () => undefined,
    succeed: () => undefined,
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<AssistantHandlerDependencies> = {},
): AssistantHandlerDependencies {
  return {
    allowedOrigins,
    now: vi.fn(() => quotaNow),
    getApiKey: vi.fn(async () => 'sk-test'),
    reserveQuota: vi.fn(async () => undefined),
    searchContent: vi.fn(async () => []),
    requestOpenAI: vi.fn(async () => successfulOpenAIResult),
    log: vi.fn(),
    ...overrides,
  };
}

function expectNoOperationalCalls(
  dependencies: AssistantHandlerDependencies,
): void {
  expect(dependencies.now).not.toHaveBeenCalled();
  expect(dependencies.getApiKey).not.toHaveBeenCalled();
  expect(dependencies.reserveQuota).not.toHaveBeenCalled();
  expect(dependencies.requestOpenAI).not.toHaveBeenCalled();
}

function expectNoPaidModelCalls(
  dependencies: AssistantHandlerDependencies,
): void {
  expect(dependencies.getApiKey).not.toHaveBeenCalled();
  expect(dependencies.reserveQuota).not.toHaveBeenCalled();
  expect(dependencies.requestOpenAI).not.toHaveBeenCalled();
}

async function invoke(
  dependencies: AssistantHandlerDependencies,
  event: APIGatewayProxyEvent = validPostEvent(),
  context: Context = fakeContext(),
): Promise<APIGatewayProxyResult> {
  return createAssistantHandler(dependencies)(event, context);
}

function parsedBody(response: APIGatewayProxyResult): unknown {
  return JSON.parse(response.body) as unknown;
}

describe('createAssistantHandler CORS and early exits', () => {
  it.each([
    'https://tti-intel.com',
    'http://localhost:5173',
  ])('answers OPTIONS for allowed origin %s without operational dependencies', async (origin) => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({
      httpMethod: 'OPTIONS',
      headers: { Origin: origin },
    }));

    expect(response).toEqual({
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: '',
    });
    expectNoOperationalCalls(dependencies);
    expect(dependencies.log).toHaveBeenCalledTimes(1);
  });

  it('rejects a disallowed mixed-case Origin header without reflecting it', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({
      headers: { oRiGiN: 'https://evil.example' },
    }));

    expect(response.statusCode).toBe(403);
    expect(response.headers).not.toHaveProperty('Access-Control-Allow-Origin');
    expect(parsedBody(response)).toEqual({
      code: 'ORIGIN_NOT_ALLOWED',
      message: 'この場所からはAI Assistantを利用できません。',
    });
    expectNoOperationalCalls(dependencies);
  });

  it('matches an allowed Origin header case-insensitively and reflects the exact value', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({
      headers: { oRiGiN: 'http://localhost:5173' },
    }));

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('allows an originless server-to-server POST without a CORS allow-origin header', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({ headers: {} }));

    expect(response.statusCode).toBe(200);
    expect(response.headers).not.toHaveProperty('Access-Control-Allow-Origin');
    expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
  });

  it('rejects an unsupported method before operational dependencies', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({ httpMethod: 'GET' }));

    expect(response.statusCode).toBe(400);
    expect(parsedBody(response)).toEqual({
      code: 'INVALID_REQUEST',
      message: '質問内容を確認して、もう一度送信してください。',
    });
    expectNoOperationalCalls(dependencies);
  });

  it('returns fixed 400 for malformed input without operational dependencies', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({ body: '{' }));

    expect(response.statusCode).toBe(400);
    expect(parsedBody(response)).toEqual({
      code: 'INVALID_REQUEST',
      message: '質問内容を確認して、もう一度送信してください。',
    });
    expectNoOperationalCalls(dependencies);
  });

  it('returns deterministic Contact fallback for an irrelevant question without operational dependencies', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({
      body: JSON.stringify({
        ...validRequest,
        message: '銀河の年齢を教えてください',
        currentPath: '/not-a-known-page',
      }),
    }));

    expect(response.statusCode).toBe(200);
    expect(parsedBody(response)).toEqual(CONTACT_FALLBACK);
    expect(dependencies.searchContent).toHaveBeenCalledTimes(1);
    expectNoPaidModelCalls(dependencies);
  });

  it('routes short greetings through OpenAI small-talk instead of Contact fallback', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async () => ({
        output: {
          answer: 'こんにちは！活動内容や参加方法など、気軽に聞いてください。',
          pageIds: ['home', 'contact'],
        contentIds: [],
        },
        usage: { inputTokens: 40, outputTokens: 30, totalTokens: 70 },
      })),
    });
    const response = await invoke(dependencies, validPostEvent({
      body: JSON.stringify({
        ...validRequest,
        message: 'こんにちは！',
      }),
    }));

    expect(response.statusCode).toBe(200);
    expect(parsedBody(response)).toEqual({
      answer: 'こんにちは！活動内容や参加方法など、気軽に聞いてください。',
      links: [
        { pageId: 'home', title: 'Home', href: '/' },
        { pageId: 'contact', title: 'Contact', href: '/contact' },
      ],
    });
    expect(dependencies.requestOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'small_talk',
    }));
  });
});

describe('createAssistantHandler orchestration', () => {
  it('answers a relevant question in secret -> quota -> OpenAI order', async () => {
    const order: string[] = [];
    const dependencies = createDependencies({
      getApiKey: vi.fn(async () => {
        order.push('secret');
        return 'sk-test';
      }),
      reserveQuota: vi.fn(async () => {
        order.push('quota');
      }),
      requestOpenAI: vi.fn(async () => {
        order.push('openai');
        return successfulOpenAIResult;
      }),
    });

    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(200);
    expect(order).toEqual(['secret', 'quota', 'openai']);
    expect(parsedBody(response)).toEqual({
      answer: '今週の数学から確認できます。',
      links: [{
        pageId: 'weekly-math',
        title: '今週の数学',
        href: '/weekly-math',
      }],
    });
    expect(dependencies.now).toHaveBeenCalledTimes(1);
    expect(dependencies.reserveQuota).toHaveBeenCalledWith({
      sessionId: validRequest.sessionId,
      requestId: 'api-gateway-request-1',
      now: quotaNow,
    });
    expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
    expect(dependencies.requestOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'sk-test',
      request: validRequest,
    }));
  });

  it('uses the Lambda request ID when the API Gateway request ID is empty', async () => {
    const dependencies = createDependencies();
    await invoke(
      dependencies,
      validPostEvent({
        requestContext: {
          ...validPostEvent().requestContext,
          requestId: '',
        },
      }),
      fakeContext({ awsRequestId: 'lambda-fallback-request' }),
    );

    expect(dependencies.reserveQuota).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'lambda-fallback-request',
    }));
  });

  it('does not reserve quota with an empty request ID', async () => {
    const dependencies = createDependencies();
    const response = await invoke(
      dependencies,
      validPostEvent({
        requestContext: {
          ...validPostEvent().requestContext,
          requestId: '',
        },
      }),
      fakeContext({ awsRequestId: '' }),
    );

    expect(response.statusCode).toBe(500);
    expect(parsedBody(response)).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'AI Assistantで問題が発生しました。通常のメニューをご利用ください。',
    });
    expect(dependencies.getApiKey).not.toHaveBeenCalled();
    expect(dependencies.reserveQuota).not.toHaveBeenCalled();
    expect(dependencies.requestOpenAI).not.toHaveBeenCalled();
  });

  it.each(['daily', 'session'] as const)(
    'returns fixed 429 for %s quota exhaustion without OpenAI',
    async (scope) => {
      const dependencies = createDependencies({
        reserveQuota: vi.fn(async () => {
          throw new QuotaExceededError(scope);
        }),
      });
      const response = await invoke(dependencies);

      expect(response.statusCode).toBe(429);
      expect(parsedBody(response)).toEqual({
        code: 'RATE_LIMITED',
        message: '本日のAI Assistant利用上限に達しました。通常のメニューをご利用ください。',
      });
      expect(dependencies.requestOpenAI).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['secret domain error', 'secret', new SecretUnavailableError()],
    ['secret unexpected error', 'secret', new Error('secret sk-never-log')],
    ['Dynamo domain error', 'quota', new QuotaInfrastructureError(new Error('ddb private'))],
    ['Dynamo unexpected error', 'quota', new Error('ddb server body')],
    ['OpenAI domain error', 'openai', new OpenAiUpstreamError(500)],
    ['OpenAI network error', 'openai', new Error('network body sk-never-log')],
  ] as const)(
    'returns one secret-free fixed 502 for %s',
    async (_name, failingStage, error) => {
      const dependencies = createDependencies({
        getApiKey: vi.fn(async () => {
          if (failingStage === 'secret') throw error;
          return 'sk-test';
        }),
        reserveQuota: vi.fn(async () => {
          if (failingStage === 'quota') throw error;
        }),
        requestOpenAI: vi.fn(async () => {
          if (failingStage === 'openai') throw error;
          return successfulOpenAIResult;
        }),
      });

      const response = await invoke(dependencies);
      const serialized = JSON.stringify(response);

      expect(response.statusCode).toBe(502);
      expect(parsedBody(response)).toEqual({
        code: 'UPSTREAM_UNAVAILABLE',
        message: '現在AI Assistantを利用できません。通常のメニューをご利用ください。',
      });
      expect(serialized).not.toContain(error.message);
      expect(serialized).not.toContain('sk-test');
      expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(
        failingStage === 'openai' ? 1 : 0,
      );
    },
  );

  it('returns fixed 504 for an OpenAI timeout', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async () => {
        throw new OpenAiTimeoutError();
      }),
    });
    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(504);
    expect(parsedBody(response)).toEqual({
      code: 'UPSTREAM_TIMEOUT',
      message: 'AI Assistantの応答に時間がかかっています。しばらくしてからお試しください。',
    });
  });

  it.each(['refusal', 'incomplete', 'invalid structured output'])(
    'returns fixed Contact fallback for %s without a retry',
    async (reason) => {
      const dependencies = createDependencies({
        requestOpenAI: vi.fn(async () => {
          throw new UnsafeModelOutputError(reason);
        }),
      });
      const response = await invoke(dependencies);

      expect(response.statusCode).toBe(200);
      expect(parsedBody(response)).toEqual(CONTACT_FALLBACK);
      expect(dependencies.reserveQuota).toHaveBeenCalledTimes(1);
      expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
    },
  );

  it('revalidates an invalid injected model result and uses Contact fallback', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async () => ({
        ...successfulOpenAIResult,
        output: { answer: '', pageIds: [] },
      })),
    });
    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(200);
    expect(parsedBody(response)).toEqual(CONTACT_FALLBACK);
  });

  it('never retries OpenAI or invokes an injected quota refund after failure', async () => {
    const refundQuota = vi.fn();
    const dependencies = {
      ...createDependencies({
        requestOpenAI: vi.fn(async () => {
          throw new OpenAiUpstreamError(503);
        }),
      }),
      refundQuota,
    };

    const response = await createAssistantHandler(dependencies)(
      validPostEvent(),
      fakeContext(),
    );

    expect(response.statusCode).toBe(502);
    expect(dependencies.reserveQuota).toHaveBeenCalledTimes(1);
    expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
    expect(refundQuota).not.toHaveBeenCalled();
  });

  it('emits links only for selected pages or Contact', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async () => ({
        output: {
          answer: '候補をご案内します。',
          pageIds: ['weekly-math', 'about', 'private-page'],
        contentIds: [],
        },
        usage: successfulOpenAIResult.usage,
      })),
    });
    const response = await invoke(dependencies);

    expect(parsedBody(response)).toEqual({
      answer: '候補をご案内します。',
      links: [{
        pageId: 'weekly-math',
        title: '今週の数学',
        href: '/weekly-math',
      }],
    });
  });

  it('allows the canonical Contact link even when Contact was not selected', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async () => ({
        output: {
          answer: 'お問い合わせください。',
          pageIds: ['contact'],
          contentIds: [],
        },
        usage: successfulOpenAIResult.usage,
      })),
    });
    const response = await invoke(dependencies);

    expect(parsedBody(response)).toEqual({
      answer: 'お問い合わせください。',
      links: [{ pageId: 'contact', title: 'Contact', href: '/contact' }],
    });
  });

  it('emits verified dynamic content links ahead of page links', async () => {
    const dependencies = createDependencies({
      searchContent: vi.fn(async () => [{
        score: 8,
        entry: {
          id: 'news:welcome-to-tti-intelligence',
          kind: 'news' as const,
          title: 'TTI Intelligenceへようこそ',
          href: '/news/welcome-to-tti-intelligence',
          excerpt: 'サークル紹介です。',
          parentPageId: 'news' as const,
        },
      }]),
      requestOpenAI: vi.fn(async () => ({
        output: {
          answer: 'このお知らせをご覧ください。',
          pageIds: ['news'],
          contentIds: ['news:welcome-to-tti-intelligence'],
        },
        usage: successfulOpenAIResult.usage,
      })),
    });
    const response = await invoke(dependencies, validPostEvent({
      body: JSON.stringify({
        ...validRequest,
        message: 'TTI Intelligenceへようこそ',
      }),
    }));

    expect(parsedBody(response)).toEqual({
      answer: 'このお知らせをご覧ください。',
      links: [
        {
          pageId: 'news',
          title: 'TTI Intelligenceへようこそ',
          href: '/news/welcome-to-tti-intelligence',
        },
        { pageId: 'news', title: 'News', href: '/news' },
      ],
    });
  });
});

describe('createAssistantHandler privacy-safe logging', () => {
  it('logs exactly the fixed structured fields once without conversation or API key', async () => {
    const log = vi.fn();
    const dependencies = createDependencies({ log });
    await invoke(dependencies);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({
      requestId: 'api-gateway-request-1',
      outcome: 'success',
      statusCode: 200,
      durationMs: expect.any(Number),
      inputTokens: 120,
      outputTokens: 30,
      totalTokens: 150,
    });
    expect(Object.keys(log.mock.calls[0]![0])).toEqual([
      'requestId',
      'outcome',
      'statusCode',
      'durationMs',
      'inputTokens',
      'outputTokens',
      'totalTokens',
    ]);
    const serialized = JSON.stringify(log.mock.calls);
    expect(serialized).not.toContain(validRequest.message);
    expect(serialized).not.toContain(validRequest.history[0]!.content);
    expect(serialized).not.toContain('sk-test');
  });

  it('does not log dependency error messages or stacks', async () => {
    const log = vi.fn();
    const dependencies = createDependencies({
      log,
      requestOpenAI: vi.fn(async () => {
        throw new Error('UNIQUE_NETWORK_ERROR sk-secret-value');
      }),
    });
    await invoke(dependencies);

    const serialized = JSON.stringify(log.mock.calls);
    expect(log).toHaveBeenCalledTimes(1);
    expect(serialized).not.toContain('UNIQUE_NETWORK_ERROR');
    expect(serialized).not.toContain('sk-secret-value');
    expect(serialized).not.toContain('stack');
  });

  it('logs sanitized paid-call usage for unsafe model output without response content', async () => {
    const log = vi.fn();
    const unsafeOutput = 'UNIQUE_UNSAFE_OUTPUT_991122';
    const dependencies = createDependencies({
      log,
      requestOpenAI: vi.fn(async () => {
        throw new UnsafeModelOutputError(unsafeOutput, {
          inputTokens: 121,
          outputTokens: 25,
          totalTokens: 146,
        });
      }),
    });

    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(200);
    expect(parsedBody(response)).toEqual(CONTACT_FALLBACK);
    expect(log).toHaveBeenCalledWith({
      requestId: 'api-gateway-request-1',
      outcome: 'unsafe_model_output',
      statusCode: 200,
      durationMs: expect.any(Number),
      inputTokens: 121,
      outputTokens: 25,
      totalTokens: 146,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(unsafeOutput);
  });
});

describe('createRuntimeDependencies', () => {
  const validEnvironment = {
    OPENAI_SECRET_ID: 'tti-ai/openai-api-key',
    ASSISTANT_MODEL: 'gpt-5-nano',
    ASSISTANT_SMALL_TALK_MODEL: 'gpt-5-nano',
    ALLOWED_ORIGINS: 'https://tti-intel.com, http://localhost:5173',
    ASSISTANT_USAGE_TABLE: 'assistant-usage',
    ASSISTANT_DAILY_LIMIT: '100',
    ASSISTANT_SESSION_LIMIT: '20',
    ASSISTANT_SESSION_WINDOW_SECONDS: '600',
    POSTS_TABLE: 'tti-ai-posts',
    BOARD_TABLE: 'tti-ai-board',
    FIREBASE_API_KEY: 'test-firebase-api-key',
    FIREBASE_PROJECT_ID: 'tti-intel-d8d73',
  };

  it('constructs dependencies lazily from all validated environment values', () => {
    const dependencies = createRuntimeDependencies(validEnvironment);

    expect(dependencies.allowedOrigins).toEqual(allowedOrigins);
    expect(dependencies.now()).toBeInstanceOf(Date);
    expect(dependencies.getApiKey).toBeTypeOf('function');
    expect(dependencies.reserveQuota).toBeTypeOf('function');
    expect(dependencies.requestOpenAI).toBeTypeOf('function');
    expect(dependencies.log).toBeTypeOf('function');
  });

  it.each([
    'OPENAI_SECRET_ID',
    'ASSISTANT_MODEL',
    'ASSISTANT_SMALL_TALK_MODEL',
    'ALLOWED_ORIGINS',
    'ASSISTANT_USAGE_TABLE',
    'ASSISTANT_DAILY_LIMIT',
    'ASSISTANT_SESSION_LIMIT',
    'ASSISTANT_SESSION_WINDOW_SECONDS',
    'POSTS_TABLE',
    'BOARD_TABLE',
    'FIREBASE_API_KEY',
    'FIREBASE_PROJECT_ID',
  ])('rejects a missing %s environment value', (variableName) => {
    expect(() => createRuntimeDependencies({
      ...validEnvironment,
      [variableName]: undefined,
    })).toThrow(variableName);
  });

  it('rejects an origin configuration containing no origins', () => {
    expect(() => createRuntimeDependencies({
      ...validEnvironment,
      ALLOWED_ORIGINS: ' , , ',
    })).toThrow('ALLOWED_ORIGINS');
  });
});
