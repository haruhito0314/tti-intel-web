#!/usr/bin/env node
/**
 * Luna structured-knowledge 100-question evaluator.
 *
 * Safe local validation (never calls production):
 *   node scripts/assistant-prod-eval-100-natural.mjs --dry-run
 *
 * Authorized production run only:
 *   node scripts/assistant-prod-eval-100-natural.mjs --run-production --telemetry path/to/sanitized-telemetry.json
 *
 * The telemetry file is an object keyed by case ID. Each value contains only
 * lunaCallCount, webCallCount, and usage counters. Do not include session IDs,
 * prompts, answers, or conversation history.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONFIGURATION,
  evaluateObservation,
  loadFixture,
  summarizeResults,
} from './assistant-prod-eval-core.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = resolve(ROOT, 'scripts/fixtures/assistant-noise-eval-100.json');
const EVIDENCE = resolve(ROOT, 'output/evals/assistant-luna-structured-knowledge-2026-08-03');
const API = 'https://dfqmc56d94.execute-api.ap-northeast-1.amazonaws.com/prod/assistant';
const ORIGIN = 'https://tti-intel.com';
const DELAY_MS = 700;

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const runProduction = argv.includes('--run-production');
  const telemetryIndex = argv.indexOf('--telemetry');
  const telemetryPath = telemetryIndex >= 0 ? argv[telemetryIndex + 1] : null;
  if (dryRun === runProduction) {
    throw new TypeError('Choose exactly one mode: --dry-run or --run-production');
  }
  if (runProduction && !telemetryPath) {
    throw new TypeError('--run-production requires --telemetry with sanitized usage/call counters');
  }
  return { dryRun, runProduction, telemetryPath };
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function loadTelemetry(path) {
  if (!path) return {};
  const value = JSON.parse(readFileSync(resolve(path), 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Telemetry must be an object keyed by case ID');
  }
  return value;
}

async function ask(evaluationCase, sessionId) {
  const startedAt = Date.now();
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({
      message: evaluationCase.message,
      currentPath: evaluationCase.currentPath,
      history: evaluationCase.history,
      sessionId,
    }),
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
  };
}

function resultCsv(results) {
  const rows = [[
    'caseId', 'category', 'variant', 'expectation', 'passed', 'status',
    'latencyMs', 'lunaCallCount', 'webCallCount', 'inputTokens',
    'cachedInputTokens', 'cacheWriteTokens', 'outputTokens', 'totalTokens',
    'estimatedCostUsd', 'responseFingerprint', 'issues',
  ]];
  for (const result of results) {
    rows.push([
      result.caseId,
      result.category,
      result.variant,
      result.expectation,
      String(result.passed),
      String(result.status ?? ''),
      String(result.latencyMs ?? ''),
      String(result.lunaCallCount ?? ''),
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
  copyFileSync(FIXTURE, paths.dataset);
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
    writeEvidence(fixture, [], summary);
    console.log(`Dry run complete: 100 loaded, 0 production calls, 0 OpenAI calls.`);
    console.log(`Evidence scaffold: ${EVIDENCE}`);
    return;
  }

  const telemetry = loadTelemetry(options.telemetryPath);
  const results = [];
  let sessionId = randomUUID();
  let inSession = 0;
  for (const [index, evaluationCase] of fixture.cases.entries()) {
    if (inSession >= 18) {
      sessionId = randomUUID();
      inSession = 0;
      await sleep(1_200);
    }
    let response;
    try {
      response = await ask(evaluationCase, sessionId);
    } catch (error) {
      response = { status: 0, latencyMs: 0, answer: '', links: [], error: String(error) };
    }
    inSession += 1;
    const metrics = telemetry[evaluationCase.id] ?? {};
    results.push(evaluateObservation(evaluationCase, {
      ...response,
      lunaCallCount: metrics.lunaCallCount,
      webCallCount: metrics.webCallCount,
      usage: metrics.usage,
    }));
    console.log(`[${index + 1}/100] ${evaluationCase.id} ${results.at(-1).passed ? 'OK' : 'BAD'}`);
    await sleep(DELAY_MS);
  }
  const summary = summarizeResults(results, {
    ...fixture.metadata,
    execution: 'authorized production evaluation',
  });
  writeEvidence(fixture, results, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0 || !summary.templateConcentrationPassed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
