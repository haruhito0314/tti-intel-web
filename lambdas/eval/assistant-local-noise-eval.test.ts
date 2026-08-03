import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  assessInterimObservation,
  buildInterimEvaluationCase,
  parseInterimEvaluationFixture,
} from './assistant-local-noise-eval.js';

const fixtureUrl = new URL('./fixtures/assistant-noise-eval-dry-run.json', import.meta.url);

describe('interim evaluator fixture', () => {
  it('loads the new structured-knowledge acceptance schema', () => {
    const fixture = parseInterimEvaluationFixture(JSON.parse(
      readFileSync(fixtureUrl, 'utf8'),
    ));

    expect(fixture.metadata).toEqual({ schemaVersion: 2, count: 3 });
    expect(fixture.cases.map(({ expectation }) => expectation)).toEqual([
      'site',
      'follow-up',
      'general',
    ]);
  });

  it('rejects legacy fact-selection fields', () => {
    expect(() => parseInterimEvaluationFixture({
      metadata: { schemaVersion: 2, count: 1 },
      cases: [{
        id: 'BAD',
        message: 'test',
        currentPath: '/',
        history: [],
        expectation: 'site',
        expectedFactIds: ['membership.cost'],
      }],
    })).toThrow(/unknown field/i);
  });
});

describe('buildInterimEvaluationCase', () => {
  it('builds the Luna structured schema with no tools or web search', () => {
    const built = buildInterimEvaluationCase({
      id: 'S001',
      message: 'Codexについて教えて',
      currentPath: '/',
      history: [],
      expectation: 'site',
    });
    const serialized = JSON.stringify(built.payload);

    expect(built.knowledgeIds).toContain('development-codex');
    expect(built.payload.model).toBe('gpt-5.6-luna');
    expect(built.payload.tools).toEqual([]);
    expect(built.payload.text.format.schema.required).toEqual([
      'answer',
      'pageIds',
      'contentIds',
      'sourceIds',
    ]);
    expect(serialized).not.toMatch(/web_search|trustedFactIds|expectedFactIds/);
  });

  it('uses the same resolved follow-up decision for knowledge and payload history', () => {
    const built = buildInterimEvaluationCase({
      id: 'F001',
      message: 'どこから見るの？',
      currentPath: '/',
      history: [{ role: 'user', content: '今週の数学について教えて' }],
      expectation: 'follow-up',
    });
    const input = JSON.parse(built.payload.input[0]!.content[0]!.text) as {
      isFollowUp: boolean;
      history: unknown[];
    };

    expect(built.contextualFollowUp).toBe(true);
    expect(built.knowledgeIds).toContain('circle-weekly-math');
    expect(input.isFollowUp).toBe(true);
    expect(input.history).toHaveLength(1);
  });
});

describe('assessInterimObservation', () => {
  const evaluationCase = {
    id: 'S001',
    message: 'Codexについて教えて',
    currentPath: '/',
    history: [],
    expectation: 'site' as const,
  };

  it('accepts one-call, no-web, private, safe, costed observations', () => {
    const result = assessInterimObservation(evaluationCase, {
      statusCode: 200,
      response: {
        answer: 'Codexを使った開発について説明します。',
        links: [{ pageId: 'development', title: '開発について', href: '/development' }],
      },
      lunaCallCount: 1,
      webCallCount: 0,
      usage: {
        inputTokens: 100,
        cachedInputTokens: 20,
        cacheWriteTokens: 10,
        outputTokens: 20,
        totalTokens: 120,
      },
      logs: [{
        requestId: 'safe-request-id',
        inputTokens: 100,
        cachedInputTokens: 20,
        cacheWriteTokens: 10,
        outputTokens: 20,
        totalTokens: 120,
        lunaCallCount: 1,
      }],
    });

    expect(result).toEqual({
      passed: true,
      failures: [],
      estimatedCostUsd: 0.0000414,
    });
  });

  it('rejects extra calls, web use, unsafe output, and private logs', () => {
    const result = assessInterimObservation(evaluationCase, {
      statusCode: 200,
      response: {
        answer: 'https://evil.example/private',
        links: [{ pageId: 'development', title: 'Unsafe', href: '/development/..' }],
      },
      lunaCallCount: 2,
      webCallCount: 1,
      usage: {
        inputTokens: 1,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 1,
        totalTokens: 2,
      },
      logs: [{ message: evaluationCase.message, apiKey: 'sk-private' }],
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      'expected exactly one Luna call',
      'web access is forbidden',
      'answer contains a URL',
      'response contains an unsafe link',
      'logs contain private request data',
    ]));
  });

  it('rejects a public route that is not an Assistant link candidate', () => {
    const result = assessInterimObservation(evaluationCase, {
      statusCode: 200,
      response: {
        answer: '公開ページです。',
        links: [{
          pageId: 'development',
          title: 'CLI Practice',
          href: '/app/cli-practice',
        }],
      },
      lunaCallCount: 1,
      webCallCount: 0,
      usage: {
        inputTokens: 1,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 1,
        totalTokens: 2,
      },
      logs: [],
    });

    expect(result.failures).toContain('response contains an unsafe link');
  });
});
