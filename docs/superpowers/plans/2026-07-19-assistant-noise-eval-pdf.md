# Assistant 100-Question Noise Evaluation and PDF Implementation Plan

> **For Codex:** Execute this plan task by task. Preserve the first-run dataset and results; do not tune labels or assistant behavior after observing the run.

**Goal:** Evaluate the current public Assistant on exactly 100 blind, varied Japanese questions using the production static routing/rendering code and GPT-5.4 nano at medium reasoning only where the deterministic router has low confidence, then deliver reproducible JSON/CSV evidence and a visually verified Japanese PDF.

**Architecture:** A standalone TypeScript runner imports the production Assistant engine and OpenAI fact-planner helpers. It validates and hashes a frozen dataset before reading any secret, uses deterministic answers for high-confidence plans, and calls the real planner serially with zero retries for low-confidence plans. Report generation consumes only the frozen result artifacts and fails closed when counts, hashes, model configuration, or manifest data disagree.

**Tech Stack:** TypeScript, Node.js 22, esbuild, Vitest, AWS Secrets Manager SDK, OpenAI Responses API, ReportLab, Poppler, pdfplumber/pypdf.

---

## Task 1: Finish and freeze the university-club scope guard

**Files:**
- Modify: `lambdas/public/assistant/engine.ts`
- Modify: `lambdas/public/assistant/engine.test.ts`
- Verify: `lambdas/public/assistant/index.test.ts`
- Modify: `docs/superpowers/plans/2026-07-19-university-club-scope-guard.md`

1. Add failing cases for rejected Toyota Tech targets, generic university modifiers, and participation-price wording.
2. Confirm the new tests fail for the expected reasons.
3. Bind each club term to the closest preceding university target and distinguish Toyota Tech, generic contextual university, and another/named university.
4. Exclude price nouns from eligibility cues.
5. Run focused engine and handler tests, typecheck, and `git diff --check`.
6. Obtain an independent code review and address all material findings before freezing evaluation behavior.

## Task 2: Validate and freeze the blind 100-case dataset

**Files:**
- Create: `scripts/fixtures/assistant-noise-eval-100.json`
- Create: `scripts/fixtures/assistant-noise-eval-dry-run.json`
- Create: `output/evals/assistant-noise-eval-2026-07-19/dataset.json`

1. Audit all proposed cases before any engine or model execution: exactly 100 unique IDs, unique messages, expected distributions, valid history, and valid fact/mode/link labels.
2. Review every label against `facts.ts`, `runtimeCatalog.ts`, and renderer behavior without running the Assistant.
3. Correct only pre-run authoring mistakes and record the final distributions in dataset metadata.
4. Copy the reviewed dataset into the fixture and evidence directory, then compute and record its SHA-256 hash.
5. Treat that hash as immutable for the first run.

## Task 3: Build the bounded evaluation runner with tests first

**Files:**
- Create: `scripts/assistant-local-noise-eval.ts`
- Create: `scripts/assistant-local-noise-eval.test.ts`
- Modify only if export access is required: `lambdas/public/assistant/openai.ts`

1. Write tests for dataset validation, unordered fact/link scoring, precision/recall/F1, grouped summaries, percentile calculation, safety guards, sanitized errors, price calculation, and manifest hash checks.
2. Run the new tests and confirm they fail because the runner functions do not yet exist.
3. Implement pure validation/scoring/aggregation functions and a guarded CLI entry point.
4. Implement the local production-equivalent path: `planAssistantRequest`; deterministic rendering for high confidence; production fact-planner request, parsing, selection, and rendering for low confidence.
5. Enforce model `gpt-5.4-nano-2026-03-17`, reasoning `medium`, concurrency 1 by default, maximum 100 cases/calls, zero retries, 20-second timeout, and `contentSearch: stub-empty`.
6. Fetch `tti-ai/openai-api-key` only after all local validation passes and only when a real low-confidence call is required. Never serialize or log the key, authorization header, raw response body, or raw provider error.
7. Write `results.json`, `results.csv`, `summary.json`, and `manifest.json` atomically without overwriting a non-empty run directory.
8. Bundle with the repository esbuild and run unit tests, Lambda typecheck, and `git diff --check`.

## Task 4: Prove the no-network dry-run path

**Files:**
- Verify: `scripts/fixtures/assistant-noise-eval-dry-run.json`
- Output only to: `/tmp/assistant-noise-eval-dry-run-*`

1. Inject completed OpenAI response fixtures for one deterministic, one planner, malformed-output, and unsafe-output scenario.
2. Assert request shape, exact model, medium reasoning, parsing, final rendering, usage extraction, and scoring.
3. Assert no Secrets Manager client or external network call is made.
4. Scan every dry-run output for credential-like strings, authorization headers, raw envelopes, and internal prompt fields.
5. Abort the paid run if any validation, guard, or model/config assertion fails.

## Task 5: Verify pricing and execute the single bounded paid run

**Files:**
- Create: `output/evals/assistant-noise-eval-2026-07-19/results.json`
- Create: `output/evals/assistant-noise-eval-2026-07-19/results.csv`
- Create: `output/evals/assistant-noise-eval-2026-07-19/summary.json`
- Create: `output/evals/assistant-noise-eval-2026-07-19/manifest.json`

1. Verify current GPT-5.4 nano input, cached-input, and output pricing from official OpenAI documentation on the run date and record the direct source URL/date.
2. Bundle the runner to `/tmp` and execute exactly once against the frozen dataset with concurrency 1 and retries 0. Use the approved local static pipeline, not API Gateway.
3. Keep the secret only in runner memory and retain only sanitized error codes and safe model/usage metadata.
4. Verify: 100 result rows, unchanged dataset hash, at most 100 planner calls, requested and returned model metadata, medium reasoning, zero retries, and no credential/prompt leakage.
5. If infrastructure or provider failure occurs, preserve it as an error row; do not silently retry or alter labels.

## Task 6: Analyze the frozen first-run results

**Files:**
- Verify: `output/evals/assistant-noise-eval-2026-07-19/summary.json`
- Create: `output/evals/assistant-noise-eval-2026-07-19/report-data.json`

1. Calculate whole-suite and grouped fact exact match, precision, recall, F1, mode/link/unsupported matches, overall case accuracy, and safety failures.
2. Group by category, noise, ask count, and deterministic/planner path.
3. Calculate planner/error rates, latency p50/p95/max, token totals including cached/reasoning tokens, and estimated cost from the verified prices.
4. Select representative successes/failures without changing labels or Assistant code, and write concise cause classifications.
5. Explicitly state that dynamic content search and API Gateway/Lambda end-to-end behavior were not evaluated.

## Task 7: Generate and visually verify the Japanese PDF

**Files:**
- Create: `scripts/generate-assistant-noise-eval-pdf.py`
- Create: `output/pdf/assistant-noise-evaluation-2026-07-19.pdf`
- Render intermediates under: `tmp/pdfs/assistant-noise-evaluation-2026-07-19/`

1. Check ReportLab, Japanese fonts, Poppler, pdfplumber, and pypdf availability.
2. Generate the report from frozen manifest/summary/results only, with executive summary, method/limits, grouped charts/tables, path/latency/token/cost sections, university-scope findings, recommendations, and a 100-case appendix.
3. Fail generation when the manifest hash, counts, model, or reasoning effort disagree.
4. Run `pdfinfo`, `pdftotext`, pdfplumber/pypdf structural checks, and render every page with `pdftoppm`.
5. Inspect every rendered page for Japanese glyphs, clipping, overlap, chart/table readability, headers, footers, and page numbering; iterate until clean.

## Task 8: Final verification and handoff

**Files:**
- Verify all files under `output/evals/assistant-noise-eval-2026-07-19/`
- Verify: `output/pdf/assistant-noise-evaluation-2026-07-19.pdf`

1. Run the complete Lambda test suite, infra tests/build/CDK diff as relevant, runner tests, dataset/artifact consistency checks, and `git diff --check`.
2. Obtain independent code and report reviews and address all material issues without rewriting the frozen first-run ground truth.
3. Commit implementation and report artifacts in reviewable units.
4. Deliver clickable paths, headline metrics, actual planner-call count/cost, limitations, and any failures. Do not claim production end-to-end coverage.
5. Deploy the reviewed code asset only after the frozen first-run report exists; a valid production smoke test remains a separately authorized release action.
