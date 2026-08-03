import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  createAssistantHandler,
  createRuntimeDependencies,
  type AssistantHandlerDependencies,
} from './index.js';
import {
  OpenAiTimeoutError,
  OpenAiUpstreamError,
  SecretUnavailableError,
} from './openaiTransport.js';
import {
  QuotaExceededError,
  QuotaInfrastructureError,
} from './quota.js';
import type {
  AssistantRequest,
  OpenAIResult,
  RankedContentEntry,
} from './types.js';
import { UnsafeModelOutputError } from './validation.js';

const allowedOrigins = new Set([
  'https://tti-intel.com',
  'http://localhost:5173',
]);
const quotaNow = new Date('2026-08-03T00:00:00.000Z');

const validRequest: AssistantRequest = {
  message: '今週の数学はどこ？',
  currentPath: '/news',
  sessionId: '11111111-1111-4111-8111-111111111111',
  history: [{ role: 'user', content: '直前の質問です' }],
};

const successfulAnswerResult: OpenAIResult = {
  output: {
    answer: 'Lunaが生成した回答です。',
    pageIds: [],
    contentIds: [],
    sourceIds: [],
  },
  usage: {
    inputTokens: 200,
    cachedInputTokens: 40,
    cacheWriteTokens: 12,
    outputTokens: 20,
    totalTokens: 220,
  },
};

type TestDependencies = AssistantHandlerDependencies & {
  requestOpenAIPlan: ReturnType<typeof vi.fn>;
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
      requestTimeEpoch: 1_785_715_200_000,
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

function eventForRequest(
  overrides: Partial<AssistantRequest>,
  eventOverrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent {
  return validPostEvent({
    ...eventOverrides,
    body: JSON.stringify({ ...validRequest, ...overrides }),
  });
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
    logStreamName: '2026/08/03/test',
    getRemainingTimeInMillis: () => 25_000,
    done: () => undefined,
    fail: () => undefined,
    succeed: () => undefined,
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<TestDependencies> = {},
): TestDependencies {
  return {
    allowedOrigins,
    now: vi.fn(() => quotaNow),
    getApiKey: vi.fn(async () => 'sk-test'),
    reserveQuota: vi.fn(async () => undefined),
    searchContent: vi.fn(async () => []),
    requestOpenAIPlan: vi.fn(async () => {
      throw new Error('legacy planner must not be called');
    }),
    requestOpenAI: vi.fn(async () => successfulAnswerResult),
    log: vi.fn(),
    ...overrides,
  } as TestDependencies;
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

function contentResult(
  overrides: Partial<RankedContentEntry['entry']> = {},
): RankedContentEntry {
  return {
    score: 8,
    entry: {
      id: 'news:nebula-festival-2026',
      kind: 'news',
      title: '星雲祭2026 開催レポート',
      href: '/news/nebula-festival-2026',
      excerpt: '公開記事の本文です。',
      parentPageId: 'news',
      ...overrides,
    },
  };
}

function expectNoLunaCall(dependencies: TestDependencies): void {
  expect(dependencies.requestOpenAI).not.toHaveBeenCalled();
  expect(dependencies.requestOpenAIPlan).not.toHaveBeenCalled();
}

describe('createAssistantHandler single-Luna path', () => {
  it.each([
    '今日の天気を教えて',
    '京都旅行のおすすめを教えて',
    'カレーの作り方を教えて',
    '芸能ニュースを教えて',
    '豊田工業大学',
    '銀河ひつじ現象について教えて',
  ])('reserves quota and calls Luna exactly once for a normal question: %s', async (message) => {
    const dependencies = createDependencies();

    const response = await invoke(dependencies, eventForRequest({ message, history: [] }));

    expect(response.statusCode).toBe(200);
    expect(dependencies.reserveQuota).toHaveBeenCalledTimes(1);
    expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
    expect(dependencies.requestOpenAIPlan).not.toHaveBeenCalled();
    expect(parsedBody(response)).toEqual({
      answer: 'Lunaが生成した回答です。',
      links: [],
    });
  });

  it('preserves the exact Luna prose for a university question', async () => {
    const exactAnswer = '豊田工業大学について、選択資料を踏まえてLunaが自然にまとめた固有の回答です。';
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          answer: exactAnswer,
          pageIds: [],
          contentIds: [],
          sourceIds: [],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '豊田工業大学',
      history: [],
    }));

    expect(parsedBody(response)).toEqual({ answer: exactAnswer, links: [] });
    expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
    expect(dependencies.requestOpenAIPlan).not.toHaveBeenCalled();
  });

  it.each([
    [
      'raw URL',
      '一般的な説明です。https://evil.example/path を参照してください。',
      '一般的な説明です。 を参照してください。',
    ],
    [
      'Markdown URL',
      '一般的な説明です。[外部](https://evil.example/path)',
      '一般的な説明です。外部',
    ],
  ])('strips a model-written %s while preserving generated prose', async (
    _name,
    answer,
    expectedAnswer,
  ) => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          answer,
          pageIds: [],
          contentIds: [],
          sourceIds: [],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '一般的な説明をしてください',
      history: [],
    }));

    expect(parsedBody(response)).toEqual({
      answer: expectedAnswer,
      links: [],
    });
    expect(response.body).not.toContain('evil.example');
  });

  it('runs quota, dynamic retrieval, secret, then one Luna call', async () => {
    const order: string[] = [];
    const dependencies = createDependencies({
      reserveQuota: vi.fn(async () => { order.push('quota'); }),
      searchContent: vi.fn(async () => { order.push('content'); return []; }),
      getApiKey: vi.fn(async () => { order.push('secret'); return 'sk-test'; }),
      requestOpenAI: vi.fn(async () => { order.push('luna'); return successfulAnswerResult; }),
    });

    await invoke(dependencies, eventForRequest({ message: 'こんにちは', history: [] }));

    expect(order).toEqual(['quota', 'content', 'secret', 'luna']);
    expect(dependencies.requestOpenAIPlan).not.toHaveBeenCalled();
  });

  it('degrades a dynamic-content failure and still calls Luna once', async () => {
    const requestOpenAI = vi.fn(async () => successfulAnswerResult);
    const dependencies = createDependencies({
      searchContent: vi.fn(async () => {
        throw new Error('PRIVATE_DYNAMIC_BODY');
      }),
      requestOpenAI,
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '星雲祭2026について教えて',
      history: [],
    }));

    expect(response.statusCode).toBe(200);
    expect(requestOpenAI).toHaveBeenCalledTimes(1);
    expect(requestOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      content: [],
      dynamicContentAvailable: false,
    }));
    expect(JSON.stringify(response)).not.toContain('PRIVATE_DYNAMIC_BODY');
  });

  it('passes bounded structured knowledge and the Luna literal to the request boundary', async () => {
    const dependencies = createDependencies();

    await invoke(dependencies, eventForRequest({
      message: '豊田工業大学のアクセスを教えて',
      history: [],
    }));

    const input = vi.mocked(dependencies.requestOpenAI).mock.calls[0]?.[0];
    expect(input).toMatchObject({
      apiKey: 'sk-test',
      model: 'gpt-5.6-luna',
      dynamicContentAvailable: true,
      contextualFollowUp: false,
    });
    expect(input?.knowledge.length).toBeGreaterThan(0);
    expect(input?.knowledge.length).toBeLessThanOrEqual(5);
  });
});

describe('createAssistantHandler zero-call exits', () => {
  it('returns fixed 400 for malformed JSON before quota or Luna', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({ body: '{' }));

    expect(response.statusCode).toBe(400);
    expect(parsedBody(response)).toEqual({
      code: 'INVALID_REQUEST',
      message: '質問内容を確認して、もう一度送信してください。',
    });
    expect(dependencies.reserveQuota).not.toHaveBeenCalled();
    expectNoLunaCall(dependencies);
  });

  it('returns fixed 403 for a denied origin before quota or Luna', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({
      headers: { oRiGiN: 'https://evil.example' },
    }));

    expect(response.statusCode).toBe(403);
    expect(response.headers).not.toHaveProperty('Access-Control-Allow-Origin');
    expect(dependencies.reserveQuota).not.toHaveBeenCalled();
    expectNoLunaCall(dependencies);
  });

  it('answers preflight without quota or Luna', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({ httpMethod: 'OPTIONS' }));

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(dependencies.reserveQuota).not.toHaveBeenCalled();
    expectNoLunaCall(dependencies);
  });

  it('returns fixed 429 for quota rejection without content, secret, or Luna', async () => {
    const dependencies = createDependencies({
      reserveQuota: vi.fn(async () => { throw new QuotaExceededError('daily'); }),
    });

    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(429);
    expect(dependencies.searchContent).not.toHaveBeenCalled();
    expect(dependencies.getApiKey).not.toHaveBeenCalled();
    expectNoLunaCall(dependencies);
  });

  it('returns fixed 502 for secret failure without Luna', async () => {
    const dependencies = createDependencies({
      getApiKey: vi.fn(async () => { throw new SecretUnavailableError(); }),
    });

    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(502);
    expect(dependencies.reserveQuota).toHaveBeenCalledTimes(1);
    expect(dependencies.searchContent).toHaveBeenCalledTimes(1);
    expectNoLunaCall(dependencies);
  });

  it('does not reserve quota without a request ID', async () => {
    const dependencies = createDependencies();
    const response = await invoke(
      dependencies,
      validPostEvent({
        requestContext: { ...validPostEvent().requestContext, requestId: '' },
      }),
      fakeContext({ awsRequestId: '' }),
    );

    expect(response.statusCode).toBe(500);
    expect(dependencies.reserveQuota).not.toHaveBeenCalled();
    expectNoLunaCall(dependencies);
  });
});

describe('createAssistantHandler verified links', () => {
  it('intersects model IDs with server page, selected content, and selected source IDs', async () => {
    const selectedContent = contentResult();
    const dependencies = createDependencies({
      searchContent: vi.fn(async () => [selectedContent]),
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          answer: '確認済みリンクだけを返します。',
          pageIds: ['news', 'cli-practice', 'not-a-page'],
          contentIds: [selectedContent.entry.id, 'news:not-selected'],
          sourceIds: ['tti-access', 'tti-clubs'],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '豊田工業大学のアクセスと星雲祭2026について教えて',
      history: [],
    }));

    expect(parsedBody(response)).toEqual({
      answer: '確認済みリンクだけを返します。',
      links: [
        { pageId: 'news', title: 'お知らせ', href: '/news' },
        {
          pageId: 'news',
          title: '星雲祭2026 開催レポート',
          href: '/news/nebula-festival-2026',
        },
        {
          pageId: 'tti-access',
          title: '豊田工業大学 交通アクセス',
          href: 'https://www.toyota-ti.ac.jp/access.html',
        },
      ],
    });
  });

  it('drops a catalog-valid page ID that local routing did not allow', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          answer: '数学ページを案内します。',
          pageIds: ['weekly-math', 'cli-practice'],
          contentIds: [],
          sourceIds: [],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '今週の数学はどこ？',
      history: [],
    }));

    expect(parsedBody(response)).toEqual({
      answer: '数学ページを案内します。',
      links: [{
        pageId: 'weekly-math',
        title: '今週の数学',
        href: '/weekly-math',
      }],
    });
    expect(response.body).not.toContain('cli-practice');
  });

  it('honors page and official-source exclusions before mapping IDs', async () => {
    const boardContent = contentResult({
      id: 'board:nebula-festival',
      kind: 'board',
      title: '星雲祭について',
      href: '/board/nebula-festival',
      parentPageId: 'board',
    });
    const dependencies = createDependencies({
      searchContent: vi.fn(async () => [boardContent]),
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          answer: '除外指定を反映しました。',
          pageIds: ['board', 'contact'],
          contentIds: [boardContent.entry.id],
          sourceIds: ['youtube', 'discord'],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '掲示板とYouTubeはいらない。Discordと問い合わせを教えて',
      history: [],
    }));

    expect(parsedBody(response)).toEqual({
      answer: '除外指定を反映しました。',
      links: [
        { pageId: 'contact', title: 'お問い合わせ', href: '/contact' },
        {
          pageId: 'discord',
          title: 'TTI Intelligence Discord',
          href: 'https://discord.gg/DFWs8GrHxF',
        },
      ],
    });
  });

  it('suppresses every link when the latest request rejects links', async () => {
    const dependencies = createDependencies({
      searchContent: vi.fn(async () => [contentResult()]),
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          answer: '本文だけで回答します。',
          pageIds: ['about'],
          contentIds: ['news:nebula-festival-2026'],
          sourceIds: ['discord'],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: 'Discordについて教えて。リンクはいらない',
      history: [],
    }));

    expect(parsedBody(response)).toEqual({
      answer: '本文だけで回答します。',
      links: [],
    });
  });

  it('deduplicates selected dynamic links by their verified href', async () => {
    const selectedContent = contentResult();
    const duplicateHref = contentResult({
      id: 'news:duplicate-href',
      title: '同じ公開記事への重複候補',
    });
    const dependencies = createDependencies({
      searchContent: vi.fn(async () => [selectedContent, duplicateHref]),
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          answer: '最大件数を守ります。',
          pageIds: [],
          contentIds: [selectedContent.entry.id, duplicateHref.entry.id],
          sourceIds: [],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '豊田工業大学のアクセスと星雲祭2026を教えて',
      history: [],
    }));
    const body = parsedBody(response) as { links: Array<{ href: string }> };

    expect(body.links).toHaveLength(1);
    expect(body.links.map(({ href }) => href))
      .toEqual(['/news/nebula-festival-2026']);
  });

  it('enforces the global four-link cap across allowed link categories', async () => {
    const news = contentResult();
    const board = contentResult({
      id: 'board:nebula-festival',
      kind: 'board',
      title: '星雲祭の掲示板',
      href: '/board/nebula-festival',
      parentPageId: 'board',
    });
    const math = contentResult({
      id: 'weekly-math:2026-W31',
      kind: 'weekly-math',
      title: '2026-W31の数学',
      href: '/weekly-math/2026-W31',
      parentPageId: 'weekly-math',
    });
    const dependencies = createDependencies({
      searchContent: vi.fn(async () => [news, board, math]),
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          answer: '最大件数を守ります。',
          pageIds: ['news'],
          contentIds: [news.entry.id, board.entry.id, math.entry.id],
          sourceIds: ['tti-access'],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '豊田工業大学のアクセスと星雲祭2026を教えて',
      history: [],
    }));
    const body = parsedBody(response) as { links: Array<{ href: string }> };

    expect(body.links.map(({ href }) => href)).toEqual([
      '/news',
      '/news/nebula-festival-2026',
      '/board/nebula-festival',
      '/weekly-math/2026-W31',
    ]);
    expect(body.links).toHaveLength(4);
  });
});

describe('createAssistantHandler error mapping', () => {
  it('returns the fixed upstream error for unsafe model output without factual prose', async () => {
    const unsafeOutput = 'UNSAFE_PRIVATE_MODEL_OUTPUT';
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async () => {
        throw new UnsafeModelOutputError(unsafeOutput, {
          inputTokens: 121,
          cachedInputTokens: 21,
          cacheWriteTokens: 7,
          outputTokens: 5,
          totalTokens: 126,
        });
      }),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '豊田工業大学とは？',
      history: [],
    }));

    expect(response.statusCode).toBe(502);
    expect(parsedBody(response)).toEqual({
      code: 'UPSTREAM_UNAVAILABLE',
      message: '現在AI Assistantを利用できません。通常のメニューをご利用ください。',
    });
    expect(response.body).not.toContain(unsafeOutput);
    expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
  });

  it('returns the fixed upstream error when URL removal leaves no answer', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          answer: 'https://evil.example/private',
          pageIds: [],
          contentIds: [],
          sourceIds: [],
        },
      })),
    });

    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(502);
    expect(parsedBody(response)).toEqual({
      code: 'UPSTREAM_UNAVAILABLE',
      message: '現在AI Assistantを利用できません。通常のメニューをご利用ください。',
    });
    expect(response.body).not.toContain('evil.example');
  });

  it('keeps timeout and upstream status classes and never retries Luna', async () => {
    const timeoutDependencies = createDependencies({
      requestOpenAI: vi.fn(async () => { throw new OpenAiTimeoutError(); }),
    });
    const upstreamDependencies = createDependencies({
      requestOpenAI: vi.fn(async () => { throw new OpenAiUpstreamError(503); }),
    });

    const timeoutResponse = await invoke(timeoutDependencies);
    const upstreamResponse = await invoke(upstreamDependencies);

    expect(timeoutResponse.statusCode).toBe(504);
    expect(upstreamResponse.statusCode).toBe(502);
    expect(timeoutDependencies.requestOpenAI).toHaveBeenCalledTimes(1);
    expect(upstreamDependencies.requestOpenAI).toHaveBeenCalledTimes(1);
  });

  it('keeps quota infrastructure failures mapped to the fixed 502', async () => {
    const dependencies = createDependencies({
      reserveQuota: vi.fn(async () => {
        throw new QuotaInfrastructureError(new Error('PRIVATE_DDB_BODY'));
      }),
    });

    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(502);
    expect(response.body).not.toContain('PRIVATE_DDB_BODY');
    expectNoLunaCall(dependencies);
  });
});

describe('createAssistantHandler privacy-safe logging', () => {
  it('logs five safe usage counters, selected knowledge metadata, and one Luna call', async () => {
    const log = vi.fn();
    const dependencies = createDependencies({ log });

    await invoke(dependencies, eventForRequest({
      message: 'Color Sort Puzzleとは？',
      history: [{ role: 'user', content: 'PRIVATE_HISTORY_MARKER' }],
    }));

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({
      requestId: 'api-gateway-request-1',
      outcome: 'ai_success',
      statusCode: 200,
      durationMs: expect.any(Number),
      inputTokens: 200,
      cachedInputTokens: 40,
      cacheWriteTokens: 12,
      outputTokens: 20,
      totalTokens: 220,
      knowledgeCount: 2,
      knowledgeDomains: 'app,development',
      lunaCallCount: 1,
    });
    const serialized = JSON.stringify(log.mock.calls);
    expect(serialized).not.toContain('Color Sort Puzzle');
    expect(serialized).not.toContain('PRIVATE_HISTORY_MARKER');
    expect(serialized).not.toContain('Lunaが生成した回答');
  });

  it('sanitizes all unsafe usage counters and records a failed Luna attempt', async () => {
    const log = vi.fn();
    const dependencies = createDependencies({
      log,
      requestOpenAI: vi.fn(async () => {
        throw new UnsafeModelOutputError('PRIVATE_UNSAFE', {
          inputTokens: -1,
          cachedInputTokens: Number.MAX_SAFE_INTEGER + 1,
          cacheWriteTokens: Number.NaN,
          outputTokens: 1.5,
          totalTokens: -2,
        });
      }),
    });

    await invoke(dependencies, eventForRequest({ message: '一般質問', history: [] }));

    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'unsafe_model_output',
      statusCode: 502,
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      lunaCallCount: 1,
    }));
    expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE_UNSAFE');
  });

  it('logs zero Luna calls for preflight', async () => {
    const log = vi.fn();
    const dependencies = createDependencies({ log });

    await invoke(dependencies, validPostEvent({ httpMethod: 'OPTIONS' }));

    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'preflight',
      statusCode: 204,
      lunaCallCount: 0,
      knowledgeCount: 0,
      knowledgeDomains: '',
    }));
  });
});

describe('createRuntimeDependencies', () => {
  const validEnvironment = {
    OPENAI_SECRET_ID: 'tti-ai/openai-api-key',
    ASSISTANT_MODEL: 'gpt-5-nano',
    ALLOWED_ORIGINS: 'https://tti-intel.com, http://localhost:5173',
    ASSISTANT_USAGE_TABLE: 'assistant-usage',
    ASSISTANT_DAILY_LIMIT: '200',
    ASSISTANT_SESSION_LIMIT: '20',
    ASSISTANT_SESSION_WINDOW_SECONDS: '600',
    POSTS_TABLE: 'tti-ai-posts',
    BOARD_TABLE: 'tti-ai-board',
    FIREBASE_API_KEY: 'test-firebase-api-key',
    FIREBASE_PROJECT_ID: 'tti-intel-d8d73',
  };

  it('constructs the single-Luna dependencies and keeps environment validation', () => {
    const dependencies = createRuntimeDependencies(validEnvironment);

    expect(dependencies.allowedOrigins).toEqual(allowedOrigins);
    expect(dependencies.requestOpenAI).toBeTypeOf('function');
    expect(dependencies).not.toHaveProperty('requestOpenAIPlan');
    expect(dependencies).not.toHaveProperty('useAllApi');
  });

  it.each([
    'OPENAI_SECRET_ID',
    'ASSISTANT_MODEL',
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
});
