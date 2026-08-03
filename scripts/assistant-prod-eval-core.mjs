#!/usr/bin/env node
/**
 * Shared evaluator for the Luna structured-knowledge acceptance matrix.
 * This module never calls a network service. The production runner imports it.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const MODEL = 'gpt-5.6-luna';
export const CONFIGURATION = Object.freeze({
  model: MODEL,
  webSearch: false,
  tools: [],
  expectedLunaCallsPerValidCase: 1,
  expectedWebCallsPerCase: 0,
  pricingUsdPerMillion: {
    input: 1,
    cachedInput: 0.1,
    cacheWrite: 1,
    output: 6,
  },
});

const CATEGORIES = new Set([
  'site/join/contact',
  'university overview/education/life/clubs',
  'university-vs-TTI-Intelligence distinction',
  'Codex/Vercel/AWS/Plugin/CLI/MCP',
  'apps/game/math',
  'stable general knowledge',
  'real-time/high-risk constraints',
]);
const EXPECTATIONS = new Set([
  'site', 'university', 'distinction', 'development', 'app',
  'general', 'current', 'high-risk',
]);
const LINK_MODES = new Set(['none', 'optional', 'required']);
const SAFE_HREFS = new Set([
  '/', '/about', '/news', '/app', '/development', '/board', '/contact',
  '/game-community', '/weekly-math', '/app/table-tennis', '/app/color-sort',
  'https://discord.gg/DFWs8GrHxF',
  'https://www.youtube.com/@ttiintelligence',
  'https://www.toyota-ti.ac.jp/',
  'https://www.toyota-ti.ac.jp/about/index.html',
  'https://www.toyota-ti.ac.jp/about/profile/tokushoku.html',
  'https://www.toyota-ti.ac.jp/academics/index.html',
  'https://www.toyota-ti.ac.jp/academics/program/feature.html',
  'https://www.toyota-ti.ac.jp/student/activity/index.html',
  'https://www.toyota-ti.ac.jp/student/activity/club.html',
  'https://www.toyota-ti.ac.jp/access.html',
]);

function assert(condition, message) {
  if (!condition) throw new TypeError(`Invalid Luna evaluation fixture: ${message}`);
}

function nonEmptyStrings(value, field) {
  assert(Array.isArray(value), `${field} must be an array`);
  assert(value.every((entry) => typeof entry === 'string' && entry.trim()), `${field} must contain non-empty strings`);
  return value;
}

export function validateFixture(value) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'root must be an object');
  assert(value.metadata?.schemaVersion === 3, 'schemaVersion must be 3');
  assert(value.metadata?.count === 100 && value.cases?.length === 100, 'exactly 100 cases are required');
  assert(value.metadata?.model === MODEL, 'model must be gpt-5.6-luna');
  assert(value.metadata?.webSearch === false, 'web search must be disabled');
  const ids = new Set();
  for (const [index, evaluationCase] of value.cases.entries()) {
    const field = `cases[${index}]`;
    assert(typeof evaluationCase.id === 'string' && evaluationCase.id, `${field}.id is required`);
    assert(!ids.has(evaluationCase.id), `${field}.id must be unique`);
    ids.add(evaluationCase.id);
    assert(CATEGORIES.has(evaluationCase.category), `${field}.category is unknown`);
    assert(typeof evaluationCase.variant === 'string' && evaluationCase.variant, `${field}.variant is required`);
    assert(EXPECTATIONS.has(evaluationCase.expectation), `${field}.expectation is unknown`);
    assert(typeof evaluationCase.message === 'string' && evaluationCase.message.trim(), `${field}.message is required`);
    assert(typeof evaluationCase.currentPath === 'string' && evaluationCase.currentPath.startsWith('/'), `${field}.currentPath is invalid`);
    assert(Array.isArray(evaluationCase.history) && evaluationCase.history.length <= 8, `${field}.history is invalid`);
    nonEmptyStrings(evaluationCase.requiredConcepts, `${field}.requiredConcepts`);
    nonEmptyStrings(evaluationCase.forbiddenConcepts, `${field}.forbiddenConcepts`);
    const linkExpectation = evaluationCase.linkExpectation;
    assert(linkExpectation && LINK_MODES.has(linkExpectation.mode), `${field}.linkExpectation.mode is unknown`);
    nonEmptyStrings(linkExpectation.allowedHrefs, `${field}.linkExpectation.allowedHrefs`);
    nonEmptyStrings(linkExpectation.requiredHrefs, `${field}.linkExpectation.requiredHrefs`);
    assert(linkExpectation.requiredHrefs.every((href) => linkExpectation.allowedHrefs.includes(href)), `${field} required links must be allowed`);
    assert(linkExpectation.allowedHrefs.every((href) => SAFE_HREFS.has(href)), `${field} contains an unsafe fixture link`);
  }
  assert(value.cases.filter(({ category }) => category === 'Codex/Vercel/AWS/Plugin/CLI/MCP').length >= 6, 'at least six development-tool cases are required');
  assert(value.cases.filter(({ expectation }) => ['general', 'current', 'high-risk'].includes(expectation)).length >= 10, 'at least ten general/current/high-risk cases are required');
  return value;
}

export function loadFixture(path) {
  return validateFixture(JSON.parse(readFileSync(path, 'utf8')));
}

function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/[\s\p{P}\p{S}]/gu, '');
}

export function fingerprintAnswer(answer) {
  return createHash('sha256').update(normalize(answer).replace(/\p{N}+/gu, '#')).digest('hex').slice(0, 16);
}

function safeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function estimateCostUsd(usage) {
  if (!usage || !Object.values(usage).every(safeInteger)) return null;
  if (usage.cachedInputTokens + usage.cacheWriteTokens > usage.inputTokens) return null;
  if (usage.totalTokens !== usage.inputTokens + usage.outputTokens) return null;
  const prices = CONFIGURATION.pricingUsdPerMillion;
  const uncached = usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens;
  return (
    uncached * prices.input
    + usage.cachedInputTokens * prices.cachedInput
    + usage.cacheWriteTokens * prices.cacheWrite
    + usage.outputTokens * prices.output
  ) / 1_000_000;
}

export function evaluateObservation(evaluationCase, observation) {
  const issues = [];
  const answer = typeof observation?.answer === 'string' ? observation.answer : '';
  const links = Array.isArray(observation?.links) ? observation.links : [];
  const hrefs = links.map(({ href }) => href);
  if (observation?.status !== 200) issues.push(`http_${observation?.status ?? 'missing'}`);
  if (!answer.trim()) issues.push('empty_answer');
  if (!safeInteger(observation?.latencyMs)) issues.push('invalid_latency');
  if (observation?.lunaCallCount !== 1) issues.push('luna_call_count');
  if (observation?.webCallCount !== 0) issues.push('web_call_count');
  if (/(?:https?|ftp):\/\/|www\./iu.test(answer)) issues.push('inline_url');
  if (hrefs.some((href) => !SAFE_HREFS.has(href))) issues.push('unsafe_link');
  for (const concept of evaluationCase.requiredConcepts) {
    if (!normalize(answer).includes(normalize(concept))) issues.push(`missing_concept:${concept}`);
  }
  for (const concept of evaluationCase.forbiddenConcepts) {
    if (normalize(answer).includes(normalize(concept))) issues.push(`forbidden_concept:${concept}`);
  }
  if (evaluationCase.expectation === 'distinction' && !/(?:別|異な|区別|ではなく|一方|対して)/u.test(answer)) {
    issues.push('missing_distinction');
  }
  const expected = evaluationCase.linkExpectation;
  if (expected.mode === 'none' && hrefs.length) issues.push('unexpected_link');
  if (hrefs.some((href) => !expected.allowedHrefs.includes(href))) issues.push('link_outside_case_allowlist');
  for (const href of expected.requiredHrefs) {
    if (!hrefs.includes(href)) issues.push(`missing_link:${href}`);
  }
  if (expected.mode === 'required' && hrefs.length === 0) issues.push('missing_any_link');
  const estimatedCostUsd = estimateCostUsd(observation?.usage);
  if (estimatedCostUsd === null) issues.push('invalid_or_missing_usage');
  return {
    caseId: evaluationCase.id,
    category: evaluationCase.category,
    variant: evaluationCase.variant,
    expectation: evaluationCase.expectation,
    status: observation?.status ?? null,
    latencyMs: observation?.latencyMs ?? null,
    answer,
    links,
    issues,
    passed: issues.length === 0,
    responseFingerprint: fingerprintAnswer(answer),
    lunaCallCount: observation?.lunaCallCount ?? null,
    webCallCount: observation?.webCallCount ?? null,
    usage: observation?.usage ?? null,
    estimatedCostUsd,
  };
}
export function summarizeResults(results, fixtureMetadata) {
  const byCategory = {};
  const totals = {
    inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0,
    outputTokens: 0, totalTokens: 0,
  };
  let estimatedCostUsd = 0;
  for (const result of results) {
    const category = byCategory[result.category] ?? { total: 0, passed: 0, failed: 0 };
    category.total += 1;
    if (result.passed) category.passed += 1;
    else category.failed += 1;
    byCategory[result.category] = category;
    if (result.usage) {
      for (const key of Object.keys(totals)) totals[key] += result.usage[key] ?? 0;
    }
    estimatedCostUsd += result.estimatedCostUsd ?? 0;
  }
  const groups = new Map();
  for (const result of results) {
    const group = groups.get(result.responseFingerprint) ?? { count: 0, categories: new Set() };
    group.count += 1;
    group.categories.add(result.category);
    groups.set(result.responseFingerprint, group);
  }
  const suspiciousFingerprints = [...groups.entries()]
    .filter(([, group]) => group.count >= 4 && group.categories.size >= 3)
    .map(([fingerprint]) => fingerprint)
    .sort();
  const measured = results.filter(({ status }) => status !== null);
  return {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    execution: fixtureMetadata.execution,
    model: CONFIGURATION.model,
    configuration: CONFIGURATION,
    total: results.length,
    measured: measured.length,
    passed: results.filter(({ passed }) => passed).length,
    failed: results.filter(({ passed }) => !passed).length,
    accuracy: measured.length ? results.filter(({ passed }) => passed).length / measured.length : null,
    byCategory,
    lunaCallCompliance: measured.length ? measured.filter(({ lunaCallCount }) => lunaCallCount === 1).length / measured.length : null,
    webCallCompliance: measured.length ? measured.filter(({ webCallCount }) => webCallCount === 0).length / measured.length : null,
    templateConcentrationPassed: suspiciousFingerprints.length === 0,
    suspiciousFingerprints,
    usage: measured.length ? totals : null,
    estimatedCostUsd: measured.length ? estimatedCostUsd : null,
  };
}
