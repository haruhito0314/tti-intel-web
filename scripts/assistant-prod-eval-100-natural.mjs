#!/usr/bin/env node
/**
 * Luna structured-knowledge 100-question evaluator.
 *
 * Safe local validation (never calls production):
 *   node scripts/assistant-prod-eval-100-natural.mjs --dry-run
 *
 * Authorized production run only (the runner persists correlation.json, then
 * waits for the JSONL producer to create the sanitized telemetry file):
 *   node scripts/assistant-prod-eval-100-natural.mjs --run-production --run-id UUID --telemetry path/to/telemetry.json
 *
 * Export the matching structured Lambda logs and run:
 *   node scripts/assistant-eval-telemetry-from-logs.mjs --correlation path/to/correlation.json --fixture scripts/fixtures/assistant-noise-eval-100.json --logs path/to/logs.jsonl --output path/to/telemetry.json
 *
 * Trust boundary: a generated UUID plus exact server request IDs and a bounded
 * timestamp window correlate the run. No secret is accepted or persisted.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONFIGURATION,
  evaluateCase,
  loadFixture,
  summarizeResults,
} from './assistant-prod-eval-core.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = resolve(ROOT, 'scripts/fixtures/assistant-noise-eval-100.json');
const EVIDENCE = resolve(ROOT, 'output/evals/assistant-circle-site-routing-2026-08-10');
const CORRELATION = resolve(EVIDENCE, 'correlation.json');
const API = 'https://dfqmc56d94.execute-api.ap-northeast-1.amazonaws.com/prod/assistant';
const ORIGIN = 'https://tti-intel.com';
const DELAY_MS = 700;
const MAX_RUN_DURATION_MS = 30 * 60 * 1_000;
const TELEMETRY_ROOT_FIELDS = new Set([
  'schemaVersion', 'runId', 'startedAt', 'completedAt', 'cases',
]);
const TELEMETRY_CASE_FIELDS = new Set([
  'caseId', 'serverRequestId', 'observedAt', 'assistantScope',
  'expectedLunaCallCount', 'expectedWebCallCount', 'lunaCallCount', 'webCallCount', 'usage',
]);
const USAGE_FIELDS = new Set([
  'inputTokens', 'cachedInputTokens', 'cacheWriteTokens', 'outputTokens', 'totalTokens',
]);
const CORRELATION_ROOT_FIELDS = new Set([
  'schemaVersion', 'runId', 'startedAt', 'completedAt', 'cases',
]);
const CORRELATION_CASE_FIELDS = new Set([
  'caseId', 'serverRequestId', 'observedAt', 'assistantScope',
  'expectedLunaCallCount', 'expectedWebCallCount',
]);

export function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const runProduction = argv.includes('--run-production');
  const telemetryIndex = argv.indexOf('--telemetry');
  const telemetryPath = telemetryIndex >= 0 ? argv[telemetryIndex + 1] : null;
  const runIdIndex = argv.indexOf('--run-id');
  const runId = runIdIndex >= 0 ? argv[runIdIndex + 1] : null;
  if (dryRun === runProduction) {
    throw new TypeError('Choose exactly one mode: --dry-run or --run-production');
  }
  if (runProduction && !telemetryPath) {
    throw new TypeError('--run-production requires --telemetry with sanitized usage/call counters');
  }
  if (runId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)) {
    throw new TypeError('--run-id must be a UUIDv4');
  }
  return { dryRun, runProduction, telemetryPath, runId };
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function exactFields(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${label} contains forbidden field ${key}`);
  }
}

function safeCounter(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} is invalid`);
  return value;
}

function parseTime(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/u.test(value)) {
    throw new TypeError(`${label} is invalid`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new TypeError(`${label} is invalid`);
  return timestamp;
}

export function validateTelemetry(value, fixture, correlation) {
  correlation = validateCorrelationManifest(correlation, fixture);
  exactFields(value, TELEMETRY_ROOT_FIELDS, 'Telemetry');
  if (value.schemaVersion !== 2) throw new TypeError('Telemetry schemaVersion must be 2');
  if (value.runId !== correlation.runId) throw new TypeError('Telemetry runId does not match this run');
  const startedAt = parseTime(value.startedAt, 'Telemetry startedAt');
  const completedAt = parseTime(value.completedAt, 'Telemetry completedAt');
  if (startedAt > completedAt || completedAt - startedAt > MAX_RUN_DURATION_MS) {
    throw new TypeError('Telemetry run time bounds are invalid');
  }
  const actualStartedAt = parseTime(correlation.startedAt, 'Run startedAt');
  const actualCompletedAt = parseTime(correlation.completedAt, 'Run completedAt');
  if (startedAt !== actualStartedAt || completedAt !== actualCompletedAt) {
    throw new TypeError('Telemetry does not match the executed run time bounds');
  }
  if (!Array.isArray(value.cases) || value.cases.length !== 100) {
    throw new TypeError('Telemetry must contain exactly 100 cases');
  }
  const expected = new Map(correlation.cases.map((entry) => [entry.caseId, entry]));
  const seen = new Set();
  const metrics = new Map();
  for (const entry of value.cases) {
    exactFields(entry, TELEMETRY_CASE_FIELDS, 'Telemetry case');
    if (typeof entry.caseId !== 'string' || !expected.has(entry.caseId) || seen.has(entry.caseId)) {
      throw new TypeError('Telemetry case IDs must exactly match the run');
    }
    seen.add(entry.caseId);
    if (typeof entry.serverRequestId !== 'string'
      || entry.serverRequestId.length > 200
      || entry.serverRequestId !== expected.get(entry.caseId).serverRequestId) {
      throw new TypeError(`Telemetry serverRequestId mismatch for ${entry.caseId}`);
    }
    const observedAt = parseTime(entry.observedAt, `Telemetry ${entry.caseId} observedAt`);
    if (observedAt < startedAt || observedAt > completedAt) {
      throw new TypeError(`Telemetry ${entry.caseId} is outside the run time bounds`);
    }
    exactFields(entry.usage, USAGE_FIELDS, `Telemetry ${entry.caseId} usage`);
    const usage = Object.fromEntries([...USAGE_FIELDS].map((key) => [
      key,
      safeCounter(entry.usage[key], `Telemetry ${entry.caseId} ${key}`),
    ]));
    const expectedCase = expected.get(entry.caseId);
    if (entry.assistantScope !== expectedCase.assistantScope) {
      throw new TypeError(`Telemetry ${entry.caseId} assistantScope mismatch`);
    }
    if (entry.expectedLunaCallCount !== expectedCase.expectedLunaCallCount) {
      throw new TypeError(`Telemetry ${entry.caseId} expectedLunaCallCount mismatch`);
    }
    if (entry.expectedWebCallCount !== expectedCase.expectedWebCallCount) {
      throw new TypeError(`Telemetry ${entry.caseId} expectedWebCallCount mismatch`);
    }
    if (entry.expectedLunaCallCount === 0 && Object.values(usage).some((value) => value !== 0)) {
      throw new TypeError(`Telemetry ${entry.caseId} zero-call usage must be zero`);
    }
    metrics.set(entry.caseId, {
      assistantScope: entry.assistantScope,
      expectedLunaCallCount: entry.expectedLunaCallCount,
      expectedWebCallCount: entry.expectedWebCallCount,
      lunaCallCount: safeCounter(entry.lunaCallCount, `Telemetry ${entry.caseId} lunaCallCount`),
      webCallCount: safeCounter(entry.webCallCount, `Telemetry ${entry.caseId} webCallCount`),
      usage,
    });
  }
  if (seen.size !== fixture.cases.length) throw new TypeError('Telemetry is incomplete');
  return metrics;
}

export function validateCorrelationManifest(value, fixture) {
  exactFields(value, CORRELATION_ROOT_FIELDS, 'Correlation manifest');
  if (value.schemaVersion !== 2) throw new TypeError('Correlation manifest schemaVersion must be 2');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value.runId ?? '')) {
    throw new TypeError('Correlation manifest runId is invalid');
  }
  const startedAt = parseTime(value.startedAt, 'Correlation manifest startedAt');
  const completedAt = parseTime(value.completedAt, 'Correlation manifest completedAt');
  if (startedAt > completedAt || completedAt - startedAt > MAX_RUN_DURATION_MS) {
    throw new TypeError('Correlation manifest time bounds are invalid');
  }
  if (!Array.isArray(value.cases) || value.cases.length !== 100) {
    throw new TypeError('Correlation manifest must contain exactly 100 cases');
  }
  const fixtureById = new Map(fixture.cases.map((evaluationCase) => [evaluationCase.id, evaluationCase]));
  const fixtureIds = new Set(fixtureById.keys());
  const caseIds = new Set();
  const requestIds = new Set();
  for (const entry of value.cases) {
    exactFields(entry, CORRELATION_CASE_FIELDS, 'Correlation manifest case');
    if (typeof entry.caseId !== 'string' || !fixtureIds.has(entry.caseId) || caseIds.has(entry.caseId)) {
      throw new TypeError('Correlation manifest case IDs must exactly match the fixture');
    }
    caseIds.add(entry.caseId);
    if (typeof entry.serverRequestId !== 'string' || !entry.serverRequestId.trim()
      || entry.serverRequestId.length > 200 || requestIds.has(entry.serverRequestId)) {
      throw new TypeError('Correlation manifest requires 100 unique server request IDs');
    }
    requestIds.add(entry.serverRequestId);
    const evaluationCase = fixtureById.get(entry.caseId);
    if (entry.assistantScope !== evaluationCase.expectedScope) {
      throw new TypeError(`Correlation ${entry.caseId} assistantScope mismatch`);
    }
    if (entry.expectedLunaCallCount !== evaluationCase.expectedLunaCallCount) {
      throw new TypeError(`Correlation ${entry.caseId} expectedLunaCallCount mismatch`);
    }
    if (entry.expectedWebCallCount !== evaluationCase.expectedWebCallCount) {
      throw new TypeError(`Correlation ${entry.caseId} expectedWebCallCount mismatch`);
    }
    const observedAt = parseTime(entry.observedAt, `Correlation ${entry.caseId} observedAt`);
    if (observedAt < startedAt || observedAt > completedAt) {
      throw new TypeError(`Correlation ${entry.caseId} is outside the run time bounds`);
    }
  }
  if (caseIds.size !== fixtureIds.size) throw new TypeError('Correlation manifest is incomplete');
  return value;
}

export function writeCorrelationManifest(value, fixture, outputPath = CORRELATION) {
  const validated = validateCorrelationManifest(value, fixture);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(validated, null, 2) + '\n');
  return validated;
}

export function loadTelemetry(path, fixture, correlation) {
  return validateTelemetry(JSON.parse(readFileSync(resolve(path), 'utf8')), fixture, correlation);
}

async function loadPostRunTelemetry(path, fixture, correlation) {
  const resolvedPath = resolve(path);
  const deadline = Date.now() + 2 * 60 * 1_000;
  while (!existsSync(resolvedPath) && Date.now() < deadline) await sleep(1_000);
  if (!existsSync(resolvedPath)) {
    throw new TypeError('Post-run telemetry file was not produced within two minutes');
  }
  return loadTelemetry(resolvedPath, fixture, correlation);
}

async function ask(evaluationCase, sessionId, runId) {
  const startedAt = Date.now();
  const request = {
    message: evaluationCase.message,
    currentPath: evaluationCase.currentPath,
    history: evaluationCase.history,
  };
  if (evaluationCase.expectedLunaCallCount === 1) request.sessionId = sessionId;
  const response = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'x-tti-evaluation-run-id': runId,
      'x-tti-evaluation-case-id': evaluationCase.id,
    },
    body: JSON.stringify(request),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = {};
  }
  return {
    status: response.status,
    latencyMs: Date.now() - startedAt,
    answer: typeof body.answer === 'string' ? body.answer : '',
    links: Array.isArray(body.links) ? body.links : [],
    serverRequestId: response.headers.get('x-tti-server-request-id')
      ?? response.headers.get('x-amzn-requestid')
      ?? response.headers.get('apigw-requestid')
      ?? response.headers.get('x-amz-apigw-id')
      ?? '',
    observedAt: new Date().toISOString(),
  };
}

function resultCsv(results) {
  const rows = [[
    'caseId', 'category', 'variant', 'expectedScope', 'assistantScope', 'passed', 'status',
    'latencyMs', 'expectedLunaCallCount', 'lunaCallCount', 'expectedWebCallCount', 'webCallCount', 'inputTokens',
    'cachedInputTokens', 'cacheWriteTokens', 'outputTokens', 'totalTokens',
    'estimatedCostUsd', 'responseFingerprint', 'issues',
  ]];
  for (const result of results) {
    rows.push([
      result.caseId,
      result.category,
      result.variant,
      result.expectedScope,
      String(result.assistantScope ?? ''),
      String(result.passed),
      String(result.status ?? ''),
      String(result.latencyMs ?? ''),
      String(result.expectedLunaCallCount),
      String(result.lunaCallCount ?? ''),
      String(result.expectedWebCallCount),
      String(result.webCallCount ?? ''),
      String(result.usage?.inputTokens ?? ''),
      String(result.usage?.cachedInputTokens ?? ''),
      String(result.usage?.cacheWriteTokens ?? ''),
      String(result.usage?.outputTokens ?? ''),
      String(result.usage?.totalTokens ?? ''),
      String(result.estimatedCostUsd ?? ''),
      result.responseFingerprint,
      result.issues.join(';'),
    ]);
  }
  return rows.map((row) => row.map((cell) => {
    const escaped = String(cell).replaceAll('"', '""');
    return `"${escaped}"`;
  }).join(',')).join('\n') + '\n';
}

function digest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function writeEvidence(fixture, results, summary) {
  mkdirSync(EVIDENCE, { recursive: true });
  const paths = {
    dataset: resolve(EVIDENCE, 'dataset.json'),
    results: resolve(EVIDENCE, 'results.json'),
    csv: resolve(EVIDENCE, 'results.csv'),
    summary: resolve(EVIDENCE, 'summary.json'),
  };
  const safeDataset = {
    metadata: fixture.metadata,
    cases: fixture.cases.map(({ id, category, variant, expectedScope, expectedLunaCallCount, expectedWebCallCount, linkExpectation }) => ({
      id,
      category,
      variant,
      expectedScope,
      expectedLunaCallCount,
      expectedWebCallCount,
      linkMode: linkExpectation.mode,
    })),
  };
  writeFileSync(paths.dataset, JSON.stringify(safeDataset, null, 2) + '\n');
  writeFileSync(paths.results, JSON.stringify({ cases: results }, null, 2) + '\n');
  writeFileSync(paths.csv, resultCsv(results));
  writeFileSync(paths.summary, JSON.stringify(summary, null, 2) + '\n');
  const manifest = {
    schemaVersion: 1,
    generatedAt: summary.generatedAt,
    files: Object.fromEntries(Object.entries(paths).map(([key, path]) => [
      key,
      { filename: path.split('/').at(-1), sha256: digest(path) },
    ])),
  };
  writeFileSync(resolve(EVIDENCE, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixture = loadFixture(FIXTURE);
  console.log(`Loaded exactly ${fixture.cases.length} Luna acceptance cases; schema is valid.`);
  if (options.dryRun) {
    const summary = summarizeResults([], {
      ...fixture.metadata,
      execution: 'pre-deployment local dry-run; no production or OpenAI calls',
    });
    summary.total = fixture.cases.length;
    summary.expectedLunaCalls = fixture.cases.filter(({ expectedLunaCallCount }) => expectedLunaCallCount === 1).length;
    summary.expectedZeroCallResponses = fixture.cases.filter(({ expectedLunaCallCount }) => expectedLunaCallCount === 0).length;
    writeEvidence(fixture, [], summary);
    console.log(`Dry run complete: 100 loaded, 0 production calls, 0 OpenAI calls.`);
    console.log(`Evidence scaffold: ${EVIDENCE}`);
    return;
  }

  const results = [];
  const observations = [];
  const runId = options.runId ?? randomUUID();
  const runStartedAt = new Date().toISOString();
  console.log(`Evaluation run ID: ${runId}`);
  let sessionId = null;
  let inSession = 0;
  for (const [index, evaluationCase] of fixture.cases.entries()) {
    if (evaluationCase.expectedLunaCallCount === 1 && (sessionId === null || inSession >= 18)) {
      sessionId = randomUUID();
      inSession = 0;
      if (index > 0) await sleep(1_200);
    }
    let response;
    try {
      response = await ask(evaluationCase, sessionId, runId);
    } catch (error) {
      response = {
        status: 0,
        latencyMs: 0,
        answer: '',
        links: [],
        serverRequestId: '',
        observedAt: new Date().toISOString(),
      };
    }
    if (evaluationCase.expectedLunaCallCount === 1) inSession += 1;
    observations.push({ evaluationCase, response });
    console.log(`[${index + 1}/100] ${evaluationCase.id} response received`);
    await sleep(DELAY_MS);
  }
  const correlation = writeCorrelationManifest({
    schemaVersion: 2,
    runId,
    startedAt: runStartedAt,
    completedAt: new Date().toISOString(),
    cases: observations.map(({ evaluationCase, response }) => ({
      caseId: evaluationCase.id,
      serverRequestId: response.serverRequestId,
      observedAt: response.observedAt,
      assistantScope: evaluationCase.expectedScope,
      expectedLunaCallCount: evaluationCase.expectedLunaCallCount,
      expectedWebCallCount: evaluationCase.expectedWebCallCount,
    })),
  }, fixture);
  console.log(`Sanitized correlation manifest: ${CORRELATION}`);
  const telemetry = await loadPostRunTelemetry(options.telemetryPath, fixture, correlation);
  for (const { evaluationCase, response } of observations) {
    const metrics = telemetry.get(evaluationCase.id);
    results.push(evaluateCase(evaluationCase, response, metrics));
  }
  const summary = summarizeResults(results, {
    ...fixture.metadata,
    execution: 'authorized production evaluation',
  });
  writeEvidence(fixture, results, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0 || !summary.templateConcentrationPassed) process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
