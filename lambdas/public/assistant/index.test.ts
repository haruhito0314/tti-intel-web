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
import { buildAssistantKnowledgePack } from './knowledgePack.js';
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

const successfulAnswerResult = {
  output: {
    scope: 'site',
    topicLabel: '',
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
} satisfies OpenAIResult;

type TestDependencies = AssistantHandlerDependencies;

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
}

function expectNoPaidOrDataCalls(dependencies: TestDependencies): void {
  expect(dependencies.reserveQuota).not.toHaveBeenCalled();
  expect(dependencies.searchContent).not.toHaveBeenCalled();
  expect(dependencies.getApiKey).not.toHaveBeenCalled();
  expectNoLunaCall(dependencies);
}

describe('createAssistantHandler grounded scope state machine', () => {
  it.each([
    {
      message: 'このサイトでは何があるの？',
      scope: 'site' as const,
      answer: 'このサイトでは、サークル紹介やアプリ、お知らせなどを案内しています。',
      pageIds: ['home'],
      contentIds: [],
      sourceIds: [],
      links: [{ pageId: 'home', title: 'ホーム', href: '/' }],
    },
    {
      message: 'お問い合わせってしていいの？',
      scope: 'site' as const,
      answer: 'お問い合わせフォームからご連絡いただけます。',
      pageIds: ['contact'],
      contentIds: [],
      sourceIds: [],
      links: [{ pageId: 'contact', title: 'お問い合わせ', href: '/contact' }],
    },
    {
      message: 'このサークルって普段何をしてる？',
      scope: 'circle' as const,
      answer: 'AIやアプリ開発など、興味のある活動に取り組んでいます。',
      pageIds: ['about'],
      contentIds: [],
      sourceIds: [],
      links: [{ pageId: 'about', title: 'サークルについて', href: '/about' }],
    },
    {
      message: '掲示板は投稿していいの？',
      scope: 'site' as const,
      answer: 'はい。掲示板は誰でも匿名で自由に書き込めます。質問や相談などを投稿できます。',
      pageIds: ['board'],
      contentIds: [],
      sourceIds: [],
      links: [{ pageId: 'board', title: '掲示板', href: '/board' }],
    },
    {
      message: '豊田工業大学について教えて',
      scope: 'university' as const,
      answer: '詳しくは豊田工業大学の公式ウェブサイトをご覧ください。',
      publicAnswer: '豊田工業大学については、公式サイトをご確認ください。',
      pageIds: [],
      contentIds: [],
      sourceIds: [],
      links: [{
        pageId: 'toyota-ti',
        title: '豊田工業大学 公式サイト',
        href: 'https://www.toyota-ti.ac.jp/',
      }],
    },
    {
      message: '東京の天気は？',
      scope: 'out_of_scope' as const,
      topicLabel: '東京の天気',
      answer: '東京の天気には対応できません。お問い合わせフォームをご利用ください。',
      publicAnswer: '申し訳ありませんが、東京の天気については案内できません。必要であればお問い合わせください。',
      pageIds: ['contact'],
      contentIds: [],
      sourceIds: [],
      links: [{ pageId: 'contact', title: 'お問い合わせ', href: '/contact' }],
    },
  ])('uses one grounded Luna result for $message', async ({
    message,
    scope,
    topicLabel = '',
    answer,
    publicAnswer = answer,
    pageIds,
    contentIds,
    sourceIds,
    links,
  }) => {
    const requestOpenAI = vi.fn(async (): Promise<OpenAIResult> => ({
      ...successfulAnswerResult,
      output: { scope, topicLabel, answer, pageIds, contentIds, sourceIds },
    }));
    const dependencies = createDependencies({ requestOpenAI });

    const response = await invoke(dependencies, eventForRequest({ message, history: [] }));

    expect(response.statusCode).toBe(200);
    expect(parsedBody(response)).toEqual({ answer: publicAnswer, links });
    expect(response.body).not.toContain('TTI Intelligenceと、このサイトの内容について案内できます。');
    expect(dependencies.reserveQuota).toHaveBeenCalledTimes(1);
    expect(dependencies.getApiKey).toHaveBeenCalledTimes(1);
    expect(requestOpenAI).toHaveBeenCalledTimes(1);
    expect(requestOpenAI).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      request: expect.objectContaining({ message }),
      knowledgePack: buildAssistantKnowledgePack(),
      content: [],
    });
    expect(dependencies.log).toHaveBeenCalledWith(expect.objectContaining({
      assistantScope: scope,
      lunaCallCount: 1,
      webCallCount: 0,
    }));
  });

  it.each([
    ['こんにちは', 'こんにちは！TTI Intelligenceや、このサイトについて案内できます。'],
    ['ありがとう', 'どういたしまして！'],
    ['了解', '了解です！'],
    ['またね', 'またいつでも聞いてください。'],
  ])('handles simple conversation locally without paid work: %s', async (message, answer) => {
    const dependencies = createDependencies();

    const response = await invoke(dependencies, eventForRequest({ message, history: [] }));

    expect(response.statusCode).toBe(200);
    expect(parsedBody(response)).toEqual({ answer, links: [] });
    expectNoPaidOrDataCalls(dependencies);
    expect(dependencies.log).toHaveBeenCalledWith(expect.objectContaining({
      assistantScope: 'conversation',
      lunaCallCount: 0,
      webCallCount: 0,
    }));
  });
});

describe('createAssistantHandler single-Luna path', () => {
  it.each([
    'サークルについて教えて',
    'Codexについて教えて',
    '今週の数学について教えて',
    'Color Sort Puzzleとは？',
  ])('reserves quota and calls Luna exactly once for a normal question: %s', async (message) => {
    const dependencies = createDependencies();

    const response = await invoke(dependencies, eventForRequest({ message, history: [] }));

    expect(response.statusCode).toBe(200);
    expect(dependencies.reserveQuota).toHaveBeenCalledTimes(1);
    expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
    expect(parsedBody(response)).toEqual({
      answer: 'Lunaが生成した回答です。',
      links: [],
    });
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
          ...successfulAnswerResult.output,
          answer,
          pageIds: [],
          contentIds: [],
          sourceIds: [],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: 'Codexの説明をしてください',
      history: [],
    }));

    expect(parsedBody(response)).toEqual({
      answer: expectedAnswer,
      links: [],
    });
    expect(response.body).not.toContain('evil.example');
  });

  it.each([
    ['www host', '回答です。www.evil.example/path は参照しません。', '回答です。 は参照しません。'],
    ['FTP URL', '回答です。ftp://evil.example/path は参照しません。', '回答です。 は参照しません。'],
    ['protocol-relative URL', '回答です。//evil.example/path は参照しません。', '回答です。 は参照しません。'],
    ['www host with port', '回答です。www.evil.example:8443/path は参照しません。', '回答です。 は参照しません。'],
    ['protocol-relative URL with port', '回答です。//evil.example:8443/path は参照しません。', '回答です。 は参照しません。'],
    ['URL with userinfo', '回答です。ftp://user:pass@evil.example:21/path は参照しません。', '回答です。 は参照しません。'],
    ['IPv6 URL', '回答です。http://[2001:db8::1]:8080/path は参照しません。', '回答です。 は参照しません。'],
    ['Unicode-host URL', '回答です。https://悪意.example/道 は参照しません。', '回答です。 は参照しません。'],
  ])('strips a model-written %s', async (_name, answer, expectedAnswer) => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          ...successfulAnswerResult.output,
          answer,
          pageIds: [],
          contentIds: [],
          sourceIds: [],
        },
      })),
    });

    const response = await invoke(dependencies);

    expect(parsedBody(response)).toEqual({ answer: expectedAnswer, links: [] });
    expect(response.body).not.toContain('evil.example');
  });

  it('does not mangle ordinary Japanese prose containing slashes, comments, or www text', async () => {
    const answer = 'CLIでは cd /tmp のようなパスを使います。\n\twwwという文字や、A//B、JavaScriptの //コメント も  説明できます。';
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: { ...successfulAnswerResult.output, answer },
      })),
    });

    const response = await invoke(dependencies);

    expect(parsedBody(response)).toEqual({ answer, links: [] });
  });

  it('runs quota, secret, dynamic retrieval, then one Luna call', async () => {
    const order: string[] = [];
    const dependencies = createDependencies({
      reserveQuota: vi.fn(async () => { order.push('quota'); }),
      searchContent: vi.fn(async () => { order.push('content'); return []; }),
      getApiKey: vi.fn(async () => { order.push('secret'); return 'sk-test'; }),
      requestOpenAI: vi.fn(async () => { order.push('luna'); return successfulAnswerResult; }),
    });

    await invoke(dependencies, eventForRequest({ message: '最新のお知らせは？', history: [] }));

    expect(order).toEqual(['quota', 'secret', 'content', 'luna']);
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
      message: 'お知らせの星雲祭2026について教えて',
      history: [],
    }));

    expect(response.statusCode).toBe(200);
    expect(requestOpenAI).toHaveBeenCalledTimes(1);
    expect(requestOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      content: [],
      knowledgePack: buildAssistantKnowledgePack(),
    }));
    expect(JSON.stringify(response)).not.toContain('PRIVATE_DYNAMIC_BODY');
  });

  it('passes the request history unchanged with the complete pack', async () => {
    const dependencies = createDependencies();
    const history = [{ role: 'user' as const, content: '今週の数学について教えて' }];

    await invoke(dependencies, eventForRequest({
      message: 'どこから見るの？',
      history,
    }));

    const input = vi.mocked(dependencies.requestOpenAI).mock.calls[0]?.[0];
    expect(input?.request.history).toEqual(history);
    expect(input?.knowledgePack).toEqual(buildAssistantKnowledgePack());
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

  it('returns fixed 400 for a base64 body before quota or Luna', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({
      isBase64Encoded: true,
    }));

    expect(response.statusCode).toBe(400);
    expect(dependencies.reserveQuota).not.toHaveBeenCalled();
    expectNoLunaCall(dependencies);
  });

  it('returns fixed 400 for an unsupported method before dependencies', async () => {
    const dependencies = createDependencies();
    const response = await invoke(dependencies, validPostEvent({ httpMethod: 'GET' }));

    expect(response.statusCode).toBe(400);
    expect(dependencies.now).not.toHaveBeenCalled();
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
    expect(response.headers?.['Access-Control-Allow-Headers'])
      .toBe('Content-Type,Cache-Control');
    expect(response.headers?.['Access-Control-Allow-Headers'])
      .not.toMatch(/Evaluation/i);
    expect(dependencies.reserveQuota).not.toHaveBeenCalled();
    expectNoLunaCall(dependencies);
  });

  it('reflects an allowed mixed-case Origin and allows an originless POST', async () => {
    const allowedDependencies = createDependencies();
    const originlessDependencies = createDependencies();

    const allowedResponse = await invoke(allowedDependencies, validPostEvent({
      headers: { oRiGiN: 'http://localhost:5173' },
    }));
    const originlessResponse = await invoke(originlessDependencies, validPostEvent({
      headers: {},
    }));

    expect(allowedResponse.statusCode).toBe(200);
    expect(allowedResponse.headers?.['Access-Control-Allow-Origin'])
      .toBe('http://localhost:5173');
    expect(originlessResponse.statusCode).toBe(200);
    expect(originlessResponse.headers).not.toHaveProperty('Access-Control-Allow-Origin');
    expect(allowedDependencies.requestOpenAI).toHaveBeenCalledTimes(1);
    expect(originlessDependencies.requestOpenAI).toHaveBeenCalledTimes(1);
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
    expect(dependencies.searchContent).not.toHaveBeenCalled();
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

  it('uses the Lambda request ID when the gateway request ID is empty', async () => {
    const dependencies = createDependencies();

    await invoke(
      dependencies,
      validPostEvent({
        requestContext: { ...validPostEvent().requestContext, requestId: '' },
      }),
      fakeContext({ awsRequestId: 'lambda-fallback-request' }),
    );

    expect(dependencies.reserveQuota).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'lambda-fallback-request',
    }));
  });
});

describe('createAssistantHandler verified links', () => {
  it('authorizes pack page IDs and never exposes a non-Assistant route', async () => {
    const requestOpenAI = vi.fn(async (
      _input: Parameters<AssistantHandlerDependencies['requestOpenAI']>[0],
    ): Promise<OpenAIResult> => ({
      ...successfulAnswerResult,
      output: {
        ...successfulAnswerResult.output,
        answer: 'CLIを使った開発について説明します。',
        pageIds: ['development', 'cli-practice'],
        contentIds: [],
        sourceIds: [],
      },
    }));
    const dependencies = createDependencies({ requestOpenAI });

    const response = await invoke(dependencies, eventForRequest({
      message: 'CLIでGitコマンドについて教えて',
      history: [],
    }));
    const input = requestOpenAI.mock.calls[0]![0];

    expect(input.knowledgePack.entries.map(({ topicId }) => topicId))
      .toContain('development.cli');
    expect(parsedBody(response)).toEqual({
      answer: 'CLIを使った開発について説明します。',
      links: [{
        pageId: 'development',
        title: '開発について',
        href: '/development',
      }],
    });
    expect(response.body).not.toContain('cli-practice');
  });

  it('intersects model IDs with pack pages, selected content, and reviewed sources', async () => {
    const selectedContent = contentResult();
    const dependencies = createDependencies({
      searchContent: vi.fn(async () => [selectedContent]),
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          ...successfulAnswerResult.output,
          answer: '確認済みリンクだけを返します。',
          pageIds: ['news', 'cli-practice', 'not-a-page'],
          contentIds: [selectedContent.entry.id, 'news:not-selected'],
          sourceIds: ['discord'],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '最新のお知らせと星雲祭2026について教えて',
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
          pageId: 'discord',
          title: 'TTI Intelligence Discord',
          href: 'https://discord.gg/DFWs8GrHxF',
        },
      ],
    });
  });

  it('uses complete-pack authorization without local substantive routing', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          ...successfulAnswerResult.output,
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

  it('ignores all model IDs for university scope and emits only the official university link', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          ...successfulAnswerResult.output,
          scope: 'university',
          answer: '豊田工業大学については公式サイトをご確認ください。',
          pageIds: ['about'],
          contentIds: ['news:not-selected'],
          sourceIds: ['discord'],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '豊田工業大学について教えて',
      history: [],
    }));

    expect(parsedBody(response)).toEqual({
      answer: '豊田工業大学については、公式サイトをご確認ください。',
      links: [{
        pageId: 'toyota-ti',
        title: '豊田工業大学 公式サイト',
        href: 'https://www.toyota-ti.ac.jp/',
      }],
    });
  });

  it('ignores all model IDs for out-of-scope answers and emits only contact', async () => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: {
          ...successfulAnswerResult.output,
          scope: 'out_of_scope',
          topicLabel: '東京の天気',
          answer: '申し訳ありませんが、東京の天気は案内できません。お問い合わせください。',
          pageIds: ['about'],
          contentIds: ['news:nebula-festival-2026'],
          sourceIds: ['discord'],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '東京の天気は？',
      history: [],
    }));

    expect(parsedBody(response)).toEqual({
      answer: '申し訳ありませんが、東京の天気については案内できません。必要であればお問い合わせください。',
      links: [{ pageId: 'contact', title: 'お問い合わせ', href: '/contact' }],
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
          ...successfulAnswerResult.output,
          answer: '最大件数を守ります。',
          pageIds: [],
          contentIds: [selectedContent.entry.id, duplicateHref.entry.id],
          sourceIds: [],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '最新のお知らせと星雲祭2026を教えて',
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
          ...successfulAnswerResult.output,
          answer: '最大件数を守ります。',
          pageIds: ['news'],
          contentIds: [news.entry.id, board.entry.id, math.entry.id],
          sourceIds: ['tti-access'],
        },
      })),
    });

    const response = await invoke(dependencies, eventForRequest({
      message: '最新のお知らせと星雲祭2026を教えて',
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
      message: 'Codexとは？',
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
          ...successfulAnswerResult.output,
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

  it.each([
    'www.evil.example/private',
    'ftp://evil.example/private',
    '//evil.example/private',
  ])('returns fixed 502 when stripping URL-like output leaves no answer: %s', async (answer) => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: { ...successfulAnswerResult.output, answer },
      })),
    });

    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(502);
    expect(parsedBody(response)).toEqual({
      code: 'UPSTREAM_UNAVAILABLE',
      message: '現在AI Assistantを利用できません。通常のメニューをご利用ください。',
    });
  });

  it.each([
    ['raw URL with Japanese punctuation', 'https://evil.example/private。'],
    ['raw URL with ASCII punctuation', 'https://evil.example/private)'],
    ['www URL with Japanese punctuation', 'www.evil.example/private！'],
    ['protocol-relative URL with ASCII punctuation', '//evil.example/private)'],
  ])('returns fixed 502 when %s leaves only punctuation', async (_name, answer) => {
    const dependencies = createDependencies({
      requestOpenAI: vi.fn(async (): Promise<OpenAIResult> => ({
        ...successfulAnswerResult,
        output: { ...successfulAnswerResult.output, answer },
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

  it.each([
    ['secret', 'PRIVATE_SECRET_ERROR sk-private-key'],
    ['openai', 'PRIVATE_OPENAI_ERROR sk-private-key'],
  ] as const)('maps an unexpected %s error to fixed 502 without leaking details', async (
    stage,
    privateMessage,
  ) => {
    const log = vi.fn();
    const dependencies = createDependencies({
      log,
      getApiKey: vi.fn(async () => {
        if (stage === 'secret') throw new Error(privateMessage);
        return 'sk-test';
      }),
      requestOpenAI: vi.fn(async () => {
        if (stage === 'openai') throw new Error(privateMessage);
        return successfulAnswerResult;
      }),
    });

    const response = await invoke(dependencies);

    expect(response.statusCode).toBe(502);
    expect(response.body).not.toContain(privateMessage);
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateMessage);
    expect(JSON.stringify(log.mock.calls)).not.toContain('sk-private-key');
    expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(stage === 'openai' ? 1 : 0);
  });
});

describe('createAssistantHandler privacy-safe logging', () => {
  it('logs only strictly validated evaluation correlation and keeps it out of Luna input', async () => {
    const log = vi.fn();
    const dependencies = createDependencies({ log });
    const response = await invoke(dependencies, validPostEvent({
      headers: {
        Origin: 'https://tti-intel.com',
        'X-TTI-Evaluation-Run-Id': '22222222-2222-4222-8222-222222222222',
        'X-TTI-Evaluation-Case-Id': 'L089',
      },
    }));

    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'api-gateway-request-1',
      evaluationRunId: '22222222-2222-4222-8222-222222222222',
      evaluationCaseId: 'L089',
      evaluationObservedAt: expect.stringMatching(/^2026-08-03T/),
      webCallCount: 0,
    }));
    expect(response.headers?.['X-TTI-Server-Request-Id']).toBe('api-gateway-request-1');
    expect(JSON.stringify(vi.mocked(dependencies.requestOpenAI).mock.calls))
      .not.toMatch(/evaluationRunId|evaluationCaseId|22222222-2222-4222-8222-222222222222|L089/);
  });

  it.each([
    [{
      'X-TTI-Evaluation-Run-Id': 'PRIVATE malformed run id',
      'X-TTI-Evaluation-Case-Id': 'L089',
    }],
    [{ 'X-TTI-Evaluation-Run-Id': '22222222-2222-4222-8222-222222222222' }],
    [{
      'X-TTI-Evaluation-Run-Id': '22222222-2222-4222-8222-222222222222',
      'X-TTI-Evaluation-Case-Id': 'PRIVATE-L999',
    }],
  ])('ignores malformed or incomplete evaluation headers without echoing or logging them', async (evaluationHeaders) => {
    const log = vi.fn();
    const dependencies = createDependencies({ log });
    const response = await invoke(dependencies, validPostEvent({
      headers: {
        Origin: 'https://tti-intel.com',
        ...evaluationHeaders,
      },
    }));

    expect(response.statusCode).toBe(200);
    expect(response.headers).not.toHaveProperty('X-TTI-Server-Request-Id');
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/PRIVATE|22222222-2222-4222-8222-222222222222/);
    expect(log).toHaveBeenCalledWith(expect.not.objectContaining({
      evaluationRunId: expect.anything(),
      evaluationCaseId: expect.anything(),
    }));
  });

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
      knowledgeCount: 30,
      knowledgeDomains: 'circle,site,board,development',
      lunaCallCount: 1,
      webCallCount: 0,
      assistantScope: 'site',
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

    await invoke(dependencies, eventForRequest({ message: 'Codexについて教えて', history: [] }));

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
