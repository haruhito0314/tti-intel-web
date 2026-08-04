#!/usr/bin/env node
/** Build private-free evaluation telemetry from exported Assistant JSONL logs. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadFixture } from './assistant-prod-eval-core.mjs';
import {
  validateCorrelationManifest,
  validateTelemetry,
} from './assistant-prod-eval-100-natural.mjs';

const LOG_FIELDS = new Set([
  'requestId', 'evaluationRunId', 'evaluationCaseId', 'evaluationObservedAt',
  'outcome', 'statusCode', 'durationMs', 'inputTokens', 'cachedInputTokens',
  'cacheWriteTokens', 'outputTokens', 'totalTokens', 'knowledgeCount',
  'knowledgeDomains', 'lunaCallCount', 'webCallCount',
]);

function exactLogFields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Evaluation log line must be an object');
  }
  for (const key of Object.keys(value)) {
    if (!LOG_FIELDS.has(key)) throw new TypeError(`Evaluation log contains forbidden field ${key}`);
  }
}

export function produceTelemetryFromJsonl(correlationValue, fixture, jsonl) {
  const correlation = validateCorrelationManifest(correlationValue, fixture);
  const expected = new Map(correlation.cases.map((entry) => [entry.caseId, entry.serverRequestId]));
  const entries = [];
  for (const [index, line] of String(jsonl).split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      throw new TypeError(`Invalid JSONL at line ${index + 1}`);
    }
    if (record?.evaluationRunId !== correlation.runId) continue;
    exactLogFields(record);
    if (!expected.has(record.evaluationCaseId)) {
      throw new TypeError(`Evaluation log contains an extra case ${record.evaluationCaseId ?? 'missing'}`);
    }
    if (record.requestId !== expected.get(record.evaluationCaseId)) {
      throw new TypeError(`Evaluation log request ID mismatch for ${record.evaluationCaseId}`);
    }
    entries.push({
      caseId: record.evaluationCaseId,
      serverRequestId: record.requestId,
      observedAt: record.evaluationObservedAt,
      lunaCallCount: record.lunaCallCount,
      webCallCount: record.webCallCount,
      usage: {
        inputTokens: record.inputTokens,
        cachedInputTokens: record.cachedInputTokens,
        cacheWriteTokens: record.cacheWriteTokens,
        outputTokens: record.outputTokens,
        totalTokens: record.totalTokens,
      },
    });
  }
  const telemetry = {
    schemaVersion: 1,
    runId: correlation.runId,
    startedAt: correlation.startedAt,
    completedAt: correlation.completedAt,
    cases: entries,
  };
  validateTelemetry(telemetry, fixture, correlation);
  return telemetry;
}

function option(argv, name) {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
}

function main() {
  const argv = process.argv.slice(2);
  const correlationPath = option(argv, '--correlation');
  const fixturePath = option(argv, '--fixture');
  const logsPath = option(argv, '--logs');
  const outputPath = option(argv, '--output');
  if (!correlationPath || !fixturePath || !logsPath || !outputPath) {
    throw new TypeError('Required: --correlation --fixture --logs --output');
  }
  const fixture = loadFixture(resolve(fixturePath));
  const correlation = JSON.parse(readFileSync(resolve(correlationPath), 'utf8'));
  const telemetry = produceTelemetryFromJsonl(
    correlation,
    fixture,
    readFileSync(resolve(logsPath), 'utf8'),
  );
  writeFileSync(resolve(outputPath), JSON.stringify(telemetry, null, 2) + '\n');
  console.log(`Wrote ${telemetry.cases.length} sanitized telemetry cases.`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
