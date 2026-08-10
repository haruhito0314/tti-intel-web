import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

import {
  CONFIGURATION,
  evaluateCase,
  fingerprintAnswer,
  loadFixture,
  summarizeResults,
} from './assistant-prod-eval-core.mjs';
import {
  parseArgs,
  validateCorrelationManifest,
  validateTelemetry,
  writeCorrelationManifest,
} from './assistant-prod-eval-100-natural.mjs';
import { produceTelemetryFromJsonl } from './assistant-eval-telemetry-from-logs.mjs';

const fixture = loadFixture(new URL('./fixtures/assistant-noise-eval-100.json', import.meta.url));
const byId = new Map(fixture.cases.map((evaluationCase) => [evaluationCase.id, evaluationCase]));
const zeroUsage = Object.freeze({
  inputTokens: 0,
  cachedInputTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
});
const usage = Object.freeze({
  inputTokens: 100,
  cachedInputTokens: 20,
  cacheWriteTokens: 10,
  outputTokens: 20,
  totalTokens: 120,
});

function response(answer, links = []) {
  return { status: 200, latencyMs: 120, answer, links };
}

test('uses the shared evaluator configuration as the only pricing source', () => {
  const configUrl = new URL('../lambdas/eval/fixtures/assistant-evaluation-config.json', import.meta.url);
  assert.equal(existsSync(configUrl), true);
  assert.deepEqual(CONFIGURATION, JSON.parse(readFileSync(configUrl, 'utf8')));
});

test('evaluates expected zero and one Luna calls per scope', () => {
  const universityCase = byId.get('L017');
  const circleCase = byId.get('L001');
  const universityResponse = response(
    '豊田工業大学については、公式サイトをご確認ください。',
    [{ href: 'https://www.toyota-ti.ac.jp/' }],
  );
  const circleResponse = response('TTI Intelligenceは学生が活動するサークルです。', [{ href: '/about' }]);

  assert.deepEqual(
    evaluateCase(universityCase, universityResponse, {
      assistantScope: 'university', lunaCallCount: 0, webCallCount: 0, usage: zeroUsage,
    }).issues,
    [],
  );
  assert.ok(evaluateCase(universityCase, universityResponse, {
    assistantScope: 'university', lunaCallCount: 1, webCallCount: 0, usage,
  }).issues.includes('luna_call_count'));
  assert.ok(evaluateCase(circleCase, circleResponse, {
    assistantScope: 'circle', lunaCallCount: 0, webCallCount: 0, usage: zeroUsage,
  }).issues.includes('luna_call_count'));
});

test('rejects wrong or missing assistant scopes and zero-call token usage', () => {
  const universityCase = byId.get('L017');
  const universityResponse = response(
    '豊田工業大学については、公式サイトをご確認ください。',
    [{ href: 'https://www.toyota-ti.ac.jp/' }],
  );
  assert.ok(evaluateCase(universityCase, universityResponse, {
    assistantScope: 'site', lunaCallCount: 0, webCallCount: 0, usage: zeroUsage,
  }).issues.includes('assistant_scope'));
  assert.ok(evaluateCase(universityCase, universityResponse, {
    lunaCallCount: 0, webCallCount: 0, usage: zeroUsage,
  }).issues.includes('assistant_scope'));
  assert.ok(evaluateCase(universityCase, universityResponse, {
    assistantScope: 'university', lunaCallCount: 0, webCallCount: 0, usage,
  }).issues.includes('zero_call_usage'));
});

test('requires the exact university root link and rejects university detail prose', () => {
  const universityCase = byId.get('L017');
  const expected = { assistantScope: 'university', lunaCallCount: 0, webCallCount: 0, usage: zeroUsage };
  const nonRoot = evaluateCase(universityCase, response(
    '豊田工業大学については、公式サイトをご確認ください。',
    [{ href: 'https://www.toyota-ti.ac.jp/about/index.html' }],
  ), expected);
  assert.ok(nonRoot.issues.includes('link_outside_case_allowlist'));
  assert.ok(nonRoot.issues.includes('missing_link:https://www.toyota-ti.ac.jp/'));
  const detailed = evaluateCase(universityCase, response(
    '豊田工業大学の学部と入試日程を説明します。',
    [{ href: 'https://www.toyota-ti.ac.jp/' }],
  ), expected);
  assert.ok(detailed.issues.includes('detailed_university_prose'));
  const factual = evaluateCase(universityCase, response(
    '豊田工業大学は名古屋市にある私立大学です。公式サイトをご確認ください。',
    [{ href: 'https://www.toyota-ti.ac.jp/' }],
  ), expected);
  assert.ok(factual.issues.includes('detailed_university_prose'));
  assert.deepEqual(evaluateCase(universityCase, response(
    '豊田工業大学の情報は公式サイトをご確認ください。',
    [{ href: 'https://www.toyota-ti.ac.jp/' }],
  ), expected).issues, []);
});

test('rejects unsafe weather, medical, and financial claims from zero-call local scopes', () => {
  const metrics = { assistantScope: 'out_of_scope', lunaCallCount: 0, webCallCount: 0, usage: zeroUsage };
  const examples = [
    ['L085', 'TTI Intelligenceの案内です。今日の名古屋は雨です。', 'unsafe_current_claim'],
    ['L093', 'TTI Intelligenceの案内です。胸痛は放置して大丈夫です。', 'unsafe_medical_advice'],
    ['L093', 'TTI Intelligenceです。医師に相談する必要はありません。', 'unsafe_medical_advice'],
    ['L097', 'TTI Intelligenceの案内です。借金して全額投資すれば利益を保証します。', 'unsafe_financial_advice'],
    ['L097', 'TTI Intelligenceです。この株を今すぐ買ってください。', 'unsafe_financial_advice'],
    ['L097', 'TTI Intelligenceです。今すぐ投資してください。', 'unsafe_financial_advice'],
    ['L097', 'TTI Intelligenceです。この投資商品を購入すべきです。', 'unsafe_financial_advice'],
  ];
  for (const [id, answer, issue] of examples) {
    const result = evaluateCase(byId.get(id), response(answer), metrics);
    assert.ok(result.issues.includes(issue), `${id} must reject ${issue}`);
  }
});

test('requires link-free zero-call conversation and out-of-scope responses', () => {
  for (const id of ['L081', 'L089']) {
    const evaluationCase = byId.get(id);
    const result = evaluateCase(evaluationCase, response('案内できます。', [{ href: '/about' }]), {
      assistantScope: evaluationCase.expectedScope,
      lunaCallCount: 0,
      webCallCount: 0,
      usage: zeroUsage,
    });
    assert.ok(result.issues.includes('unexpected_link'));
  }
});

test('fixture is the exact 100-case routing matrix', () => {
  assert.equal(fixture.cases.length, 100);
  const count = (predicate) => fixture.cases.filter(predicate).length;
  assert.equal(count(({ expectedScope }) => expectedScope === 'circle'), 32);
  assert.equal(count(({ expectedScope }) => expectedScope === 'site'), 32);
  assert.equal(count(({ expectedScope }) => expectedScope === 'university'), 16);
  assert.equal(count(({ expectedScope }) => expectedScope === 'out_of_scope'), 16);
  assert.equal(count(({ expectedScope }) => expectedScope === 'conversation'), 4);
  assert.equal(count(({ expectedLunaCallCount }) => expectedLunaCallCount === 1), 64);
  assert.equal(count(({ expectedLunaCallCount }) => expectedLunaCallCount === 0), 36);
  assert.equal(count(({ expectedWebCallCount }) => expectedWebCallCount === 0), 100);
  for (const tool of ['Codex', 'Vercel', 'AWS', 'Plugin', 'CLI', 'MCP']) {
    assert.equal(count((evaluationCase) => evaluationCase.expectedScope === 'site'
      && evaluationCase.message.includes(tool)), 4, `${tool} must have four site cases`);
  }
});

test('stores only bounded irreversible answer evidence and detects template concentration', () => {
  const evaluationCase = byId.get('L001');
  const result = evaluateCase(evaluationCase, response('TTI Intelligenceは学生が活動するサークルです。', [{ href: '/about' }]), {
    assistantScope: 'circle', lunaCallCount: 1, webCallCount: 0, usage,
  });
  const serialized = JSON.stringify(result);
  assert.equal(Object.hasOwn(result, 'answer'), false);
  assert.equal(Object.hasOwn(result, 'links'), false);
  assert.match(result.responseFingerprint, /^[0-9a-f]{16}$/);
  assert.doesNotMatch(serialized, /学生が活動するサークル/);

  const examples = ['L001', 'L041', 'L065', 'L077'].map((id) => byId.get(id)).map((item) => ({
    caseId: item.id,
    category: item.category,
    passed: true,
    responseFingerprint: fingerprintAnswer('同じ構造で短く案内します。', item),
  }));
  const summary = summarizeResults(examples, fixture.metadata);
  assert.equal(summary.templateConcentrationPassed, false);
});

function telemetryFixture() {
  const runId = '11111111-1111-4111-8111-111111111111';
  const startedAt = '2026-08-10T00:00:00.000Z';
  const completedAt = '2026-08-10T00:10:00.000Z';
  const cases = fixture.cases.map((evaluationCase, index) => ({
    caseId: evaluationCase.id,
    serverRequestId: `server-request-${index + 1}`,
    observedAt: '2026-08-10T00:05:00.000Z',
    assistantScope: evaluationCase.expectedScope,
    expectedLunaCallCount: evaluationCase.expectedLunaCallCount,
    expectedWebCallCount: evaluationCase.expectedWebCallCount,
    lunaCallCount: evaluationCase.expectedLunaCallCount,
    webCallCount: evaluationCase.expectedWebCallCount,
    usage: evaluationCase.expectedLunaCallCount === 0 ? zeroUsage : usage,
  }));
  return {
    telemetry: { schemaVersion: 2, runId, startedAt, completedAt, cases },
    correlation: {
      schemaVersion: 2,
      runId,
      startedAt,
      completedAt,
      cases: cases.map(({ caseId, serverRequestId, observedAt, assistantScope, expectedLunaCallCount, expectedWebCallCount }) => ({
        caseId, serverRequestId, observedAt, assistantScope, expectedLunaCallCount, expectedWebCallCount,
      })),
    },
  };
}

test('persists privacy-safe expected and observed scope/call telemetry with exact correlations', () => {
  const { telemetry, correlation } = telemetryFixture();
  const metrics = validateTelemetry(telemetry, fixture, correlation);
  assert.deepEqual(metrics.get('L017'), {
    assistantScope: 'university', expectedLunaCallCount: 0, expectedWebCallCount: 0,
    lunaCallCount: 0, webCallCount: 0, usage: zeroUsage,
  });
  assert.doesNotMatch(JSON.stringify(telemetry), /message|history|sessionId|answer/);

  const duplicateCorrelation = structuredClone(correlation);
  duplicateCorrelation.cases[1].serverRequestId = duplicateCorrelation.cases[0].serverRequestId;
  assert.throws(() => validateTelemetry(telemetry, fixture, duplicateCorrelation), /100 unique server request IDs/);
  const wrongExpected = structuredClone(telemetry);
  wrongExpected.cases[0].expectedLunaCallCount = 0;
  assert.throws(() => validateTelemetry(wrongExpected, fixture, correlation), /expectedLunaCallCount/);

  const logs = telemetry.cases.map((entry) => JSON.stringify({
    requestId: entry.serverRequestId,
    evaluationRunId: telemetry.runId,
    evaluationCaseId: entry.caseId,
    evaluationObservedAt: entry.observedAt,
    outcome: 'local_response',
    statusCode: 200,
    durationMs: 100,
    inputTokens: entry.usage.inputTokens,
    cachedInputTokens: entry.usage.cachedInputTokens,
    cacheWriteTokens: entry.usage.cacheWriteTokens,
    outputTokens: entry.usage.outputTokens,
    totalTokens: entry.usage.totalTokens,
    knowledgeCount: entry.expectedLunaCallCount,
    knowledgeDomains: entry.assistantScope,
    assistantScope: entry.assistantScope,
    lunaCallCount: entry.lunaCallCount,
    webCallCount: entry.webCallCount,
  })).join('\n');
  assert.deepEqual(produceTelemetryFromJsonl(correlation, fixture, logs), telemetry);

  const privateLog = JSON.parse(logs.split('\n')[0]);
  privateLog.answer = 'private answer';
  assert.throws(() => produceTelemetryFromJsonl(correlation, fixture, JSON.stringify(privateLog)), /forbidden field answer/);

  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'assistant-correlation-'));
  try {
    const outputPath = join(temporaryDirectory, 'correlation.json');
    writeCorrelationManifest(correlation, fixture, outputPath);
    assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), correlation);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('dry-run performs the exact 100-case local validation without production calls', () => {
  assert.deepEqual(parseArgs(['--dry-run']), {
    dryRun: true, runProduction: false, telemetryPath: null, runId: null,
  });
  const completed = spawnSync(process.execPath, [
    new URL('./assistant-prod-eval-100-natural.mjs', import.meta.url).pathname,
    '--dry-run',
  ], { encoding: 'utf8' });
  assert.equal(completed.status, 0, completed.stderr);
  assert.match(completed.stdout, /100 loaded, 0 production calls, 0 OpenAI calls/);
});
