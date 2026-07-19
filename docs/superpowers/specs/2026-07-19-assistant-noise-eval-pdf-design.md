# Assistant 100-Question Noise Evaluation and PDF Design

## Goal

Evaluate the current public AI Assistant with exactly 100 newly written Japanese questions that vary wording, noise, and number of asks. Measure routing and answer performance with the deployed GPT-5.4 nano configuration, then deliver a visually verified Japanese PDF plus machine-readable evidence.

## Evaluation Approach

Use a local, production-equivalent static pipeline rather than sending 100 requests to API Gateway:

```text
blind case
  -> planAssistantRequest
  -> high confidence: deterministic reviewed facts
  -> low confidence: real OpenAI fact planner
  -> planFromFactSelection
  -> answerFromPlan
  -> score and safety checks
```

The run uses model `gpt-5.4-nano-2026-03-17` with reasoning effort `medium`. It deliberately stubs dynamic content search as empty, does not reserve production quota, and does not write production logs or unanswered-question records.

## Blind Dataset

Create exactly 100 questions before running the assistant. The generator may inspect the reviewed fact catalog and existing public knowledge, but must not execute the engine or model. The evaluator must not rewrite expected labels after seeing outputs.

The dataset includes:

- clean, light, medium, and heavy noise;
- full-width/half-width forms, dotted TTI, spelling variations, punctuation, emoji, filler, repetition, and minor typos;
- one-, two-, and three-part questions;
- negation, reversed topic order, history-dependent follow-ups, supported questions, and unsupported requests;
- university-wide club scope, other-university eligibility, English/Japanese correction wording, and compound-question counterexamples.

Each case contains a unique ID, category, noise level, ask count, message, optional history, expected fact IDs, expected mode, expected links, unsupported flag, and a short rationale. Exact messages must not duplicate existing unit tests or earlier blind-evaluation datasets.

## Runner and Security

Add a standalone TypeScript runner under `lambdas/eval/`, beside the production Assistant imports it exercises. Bundle it to `/tmp` with the repository's existing `esbuild` and documented Node ESM `createRequire` banner; do not add a runtime dependency.

Before any external call, validate the complete dataset and run a no-network fixture. The paid run is bounded to 100 cases, concurrency 1 by default, and zero retries per case. High-confidence and explicit unsupported cases do not call OpenAI.

For low-confidence cases, retrieve secret `tti-ai/openai-api-key` with the existing production key provider. Keep the API key in process memory only; never place it in arguments, environment variables, output files, exceptions, or logs. Record only sanitized error classes and safe response metadata.

## Scoring

Score unordered exact fact-set match, fact precision/recall/F1, mode match, link-set match, unsupported match, and an overall case pass that requires all semantic and safety checks.

Group results by:

- category;
- noise level;
- ask count;
- deterministic versus model-planner path.

Also measure planner-call rate, model-error rate, wall time, case/model latency p50 and p95, input/cached/output/reasoning tokens, and estimated cost using current official OpenAI pricing verified on the run date.

Safety failures include an answer over 200 characters, a URL in answer prose, internal-field leakage, duplicate links, or a link outside the reviewed route/external-link catalog.

## Artifacts

Write reproducible evidence under `output/evals/assistant-noise-eval-2026-07-19/`:

- `dataset.json`: the frozen 100-case blind set;
- `results.json`: safe per-case results;
- `results.csv`: one row per case;
- `summary.json`: aggregate metrics used by the report;
- `manifest.json`: hashes, model/config, versions, and run timestamps.

The dataset may contain question text. Result artifacts must not contain credentials, raw OpenAI envelopes, or hidden internal instructions.

## PDF Report

Create `output/pdf/assistant-noise-evaluation-2026-07-19.pdf` in Japanese. It includes:

1. executive summary and headline accuracy;
2. method, model/configuration, and limitations;
3. category, noise, and ask-count charts/tables;
4. deterministic versus planner-path performance;
5. latency, tokens, cached input, and estimated cost;
6. representative successes and failures with concise diagnoses;
7. university-scope guard findings;
8. prioritized improvement recommendations;
9. appendix listing all 100 case IDs, short question text, expected/actual outcome, and pass/fail.

Generate the PDF with ReportLab, render every page to PNG with Poppler, inspect all pages for clipped Japanese text, overlap, broken glyphs, tables, charts, headers, footers, and page numbering, and iterate until no visual defects remain. Confirm page count and text extraction with `pdfinfo` and `pdftotext`/`pdfplumber` in addition to visual review.

## Error Handling and Limits

- Never retry a model call; retain the case as an error row.
- Abort before reading the secret if dataset validation or dry-run validation fails.
- Abort PDF generation if result counts, hashes, model name, or reasoning effort do not match the manifest.
- Clearly label dynamic content search as not evaluated.
- Do not claim an end-to-end production API result; this evaluates the same static routing/planner/rendering code locally.
- Do not tune the assistant from the 100-case outputs before freezing and reporting the first-run metrics. Any later fix is a separately versioned second run.

## Success Criteria

- Exactly 100 unique, newly written, pre-labeled cases.
- One bounded run with no case retries and at most 100 model calls.
- Model and reasoning configuration verified as GPT-5.4 nano medium.
- Complete semantic, safety, latency, token, and cost metrics with reproducible hashes.
- PDF and supporting JSON/CSV artifacts delivered with zero visual defects and no secret leakage.
