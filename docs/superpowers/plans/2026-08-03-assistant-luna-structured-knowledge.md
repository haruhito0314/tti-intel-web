# Luna Structured-Knowledge Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every valid normal question to GPT-5.6 Luna exactly once, generate answers from a small relevant subset of locally reviewed knowledge, remove template-like university/site answers and runtime web search, and keep all rendered links server-verified.

**Architecture:** Replace the current fact/FAQ answer-planning path with a deterministic local knowledge selector. The Lambda sends the latest question, minimal follow-up history, up to five static knowledge items, and up to three dynamic public-content matches in one Luna Responses API request. Luna returns prose plus allowlisted IDs; the server validates those IDs, maps them to exact URLs, strips inline URLs, and never falls back to stored factual prose.

**Tech Stack:** TypeScript 5.9, AWS Lambda/API Gateway, DynamoDB, OpenAI Responses API, Vitest, React 19, Vite, Zod, Python/reportlab PDF evaluation tooling.

## Global Constraints

- Keep `gpt-5.6-luna` as the only answer model and keep `reasoning.effort` derived by the existing transport helper.
- A valid, under-quota `POST` request makes exactly one Luna call. Validation failures, disallowed origins, preflight, quota failures, secret failures, and infrastructure failures make zero calls.
- Never add `web_search`, File Search, a vector database, a crawler, or a second model/planner call.
- Site, circle, and university claims may use only selected local knowledge and successfully retrieved public dynamic content. General stable knowledge may come from Luna.
- `summary` and `details` in data files are source facts, not polished answers or fallback prose.
- Never render a model-written URL. The model returns IDs; server and frontend accept only reviewed exact URLs or safe same-site dynamic paths.
- Keep the CLI Practice route/application intact, but remove CLI Practice and TOEIC Practice from Assistant knowledge, inventory, app guidance, and evaluation expectations.
- Preserve input validation, origin checks, session/day quota, prompt-injection protections, and existing safe error status behavior.
- Do not log question text, history, API keys, or other personal data.

---

### Task 1: Introduce the structured knowledge and source-link contracts

**Files:**
- Create: `lambdas/public/assistant/structuredKnowledge.ts`
- Create: `lambdas/public/assistant/structuredKnowledge.test.ts`
- Modify: `lambdas/public/assistant/types.ts`
- Modify: `lambdas/public/assistant/runtimeCatalog.ts`
- Modify: `lambdas/public/assistant/validation.ts`
- Modify: `lambdas/public/assistant/validation.test.ts`

**Interfaces:**

```ts
export type KnowledgeDomain =
  | 'site' | 'circle' | 'university' | 'development'
  | 'app' | 'game' | 'math';

export interface KnowledgeItem {
  id: string;
  domain: KnowledgeDomain;
  title: string;
  summary: string;
  details: string[];
  keywords: string[];
  sourceIds: OfficialSourceId[];
  asOf?: string;
  volatility: 'stable' | 'periodic' | 'volatile';
}

export interface RankedKnowledgeItem {
  item: KnowledgeItem;
  score: number;
}

export type OfficialSourceId =
  | 'discord' | 'youtube'
  | 'tti-overview' | 'tti-features' | 'tti-academics'
  | 'tti-program' | 'tti-student-activity' | 'tti-clubs'
  | 'tti-access';

export interface ModelGuideResponse {
  answer: string;
  pageIds: string[];
  contentIds: string[];
  sourceIds: string[];
}
```

- [ ] Write failing tests that reject duplicate/unknown `sourceIds`, accept the four-field model response, and prove every official URL comes from an exact `OFFICIAL_SOURCE_LINKS` catalog entry.
- [ ] Run `npm test -- structuredKnowledge.test.ts validation.test.ts` in `lambdas`; expect failures because the contracts and catalog do not exist.
- [ ] Add the types above, extend `AssistantLinkPageId` for the source IDs, and define immutable title/href entries for the seven reviewed Toyota Technological Institute pages plus Discord and YouTube.
- [ ] Add `createVerifiedOfficialLinks(sourceIds)` that deduplicates IDs, ignores IDs not in the allowed set, and returns catalog values without accepting arbitrary URLs.
- [ ] Extend `validateModelGuideResponse` to require exactly `answer`, `pageIds`, `contentIds`, and `sourceIds`, with at most three source IDs and no duplicates.
- [ ] Keep `PAGE_IDS`/routes as public site routes for now; do not delete the CLI Practice route in this task.
- [ ] Run `npm test -- structuredKnowledge.test.ts validation.test.ts` in `lambdas`; expect all selected tests to pass.
- [ ] Stage: `git add lambdas/public/assistant/types.ts lambdas/public/assistant/runtimeCatalog.ts lambdas/public/assistant/validation.ts lambdas/public/assistant/validation.test.ts lambdas/public/assistant/structuredKnowledge.ts lambdas/public/assistant/structuredKnowledge.test.ts`.
- [ ] Commit: `git commit -m "Add assistant structured knowledge contracts"`.

### Task 2: Build reviewed site and university knowledge catalogs and deterministic selection

**Files:**
- Create: `lambdas/public/assistant/knowledge/site-knowledge.json`
- Create: `lambdas/public/assistant/knowledge/university-knowledge.json`
- Modify: `lambdas/public/assistant/structuredKnowledge.ts`
- Modify: `lambdas/public/assistant/structuredKnowledge.test.ts`
- Reference while transcribing facts: `frontend/src/pages/AppShowcase.tsx`
- Reference while transcribing facts: `frontend/src/pages/Development.tsx`
- Reference while transcribing facts: `frontend/src/pages/GameCommunity.tsx`
- Reference while transcribing facts: `frontend/src/pages/About.tsx`

**Required catalog coverage:**

- Site/circle: identity and activity, participation/contact, AI Assistant, Table Tennis Match Maker, Color Sort Puzzle, game activity, math behavior, Discord/YouTube, public contact email, and current AP-exam schedule with an `asOf` date.
- Development: Codex, Vercel, AWS, Plugin, CLI, and MCP as separate searchable concepts plus their combined workflow.
- University: formal/English name and abbreviation, organization/history/features, undergraduate/graduate education, small-group learning, research/industry collaboration, campus/access, student residence/life, student association/festival/extracurricular activities, recognized sports/cultural groups, AI Circle official listing, admissions overview, and Chicago/international activity.
- AI Circle wording must encode only that the university official club page listed it as a recognized group as of 2026-04-01; it must not imply university operation.

- [ ] Write failing selection tests for `豊田工業大学`, `豊田工業大学のサークルは？`, `AIサークルは大学公式？`, each of Codex/Vercel/AWS/Plugin/CLI/MCP, current apps, and an unrelated general question such as `カレーの作り方`.
- [ ] Assert the selector returns 3–5 entries when relevant, zero entries for the unrelated general question, stable ordering on equal scores, no duplicate IDs, and no CLI Practice/TOEIC knowledge.
- [ ] Run `npm test -- structuredKnowledge.test.ts` in `lambdas`; expect missing catalog/selection failures.
- [ ] Populate both JSON catalogs with source facts rather than answer templates; add `asOf` and `volatility` to time-sensitive entries.
- [ ] Implement `selectStructuredKnowledge(message, currentPath, history, limit = 5)` using NFKC/lowercase normalization, exact phrase and token/keyword scoring, current-page boost, a minimum relevance threshold, deterministic tie-breaking by catalog order, and a hard `slice(0, 5)`.
- [ ] Validate catalog shape and uniqueness at module load, including source ID validity and non-empty titles/summaries/details/keywords.
- [ ] Run `npm test -- structuredKnowledge.test.ts` in `lambdas`; expect all tests to pass.
- [ ] Stage: `git add lambdas/public/assistant/knowledge/site-knowledge.json lambdas/public/assistant/knowledge/university-knowledge.json lambdas/public/assistant/structuredKnowledge.ts lambdas/public/assistant/structuredKnowledge.test.ts`.
- [ ] Commit: `git commit -m "Add reviewed assistant knowledge catalogs"`.

### Task 3: Replace the OpenAI payload with one generation request over selected material

**Files:**
- Modify: `lambdas/public/assistant/openai.ts`
- Modify: `lambdas/public/assistant/openai.test.ts`
- Modify: `lambdas/public/assistant/openaiTransport.ts`
- Modify: `lambdas/public/assistant/types.ts`

**Payload contract:**

```ts
interface RequestOpenAIInput {
  apiKey: string;
  request: AssistantRequest;
  knowledge: readonly RankedKnowledgeItem[];
  content: readonly RankedContentEntry[];
  dynamicContentAvailable: boolean;
  model: 'gpt-5.6-luna';
  contextualFollowUp: boolean;
}
```

```ts
interface OpenAIUsage {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  totalTokens: number;
}
```

- [ ] Write failing payload tests proving: model is `gpt-5.6-luna`; `tools` is `[]`; there is no `web_search`; at most five knowledge and three content entries are serialized; selected source IDs alone form the `sourceIds` enum; a general question permits empty knowledge; and `dynamicContentAvailable: false` is included after a retrieval failure.
- [ ] Write failing parsing tests for `sourceIds` and for cached-input/cache-write usage fields, defaulting absent usage details safely to zero.
- [ ] Run `npm test -- openai.test.ts` in `lambdas`; expect schema/payload failures.
- [ ] Remove `ASSISTANT_FACTS`, finished FAQ answers, `trustedFactIds`, and per-intent answer-shaping hints from the guide payload.
- [ ] Use one instruction set for normal questions and small talk. Require direct natural Japanese, source-only site/university claims, stable general knowledge for general questions, an explicit inability to verify real-time facts, high-risk caution, no URLs, and no repetition of stored prose.
- [ ] Preserve minimal user-only history only when existing follow-up detection says it is a continuation; otherwise send no history.
- [ ] Extend the strict JSON schema with `sourceIds`, and place stable instructions/schema before dynamic message/knowledge content to retain prompt-cache value.
- [ ] Parse `input_tokens_details.cached_tokens` and any supported cache-write detail exposed by the Responses envelope without assuming the fields always exist.
- [ ] Run `npm test -- openai.test.ts` in `lambdas`; expect all selected tests to pass.
- [ ] Stage: `git add lambdas/public/assistant/openai.ts lambdas/public/assistant/openai.test.ts lambdas/public/assistant/openaiTransport.ts lambdas/public/assistant/types.ts`.
- [ ] Commit: `git commit -m "Generate assistant answers from selected knowledge"`.

### Task 4: Make the Lambda call Luna exactly once for every valid normal question

**Files:**
- Modify: `lambdas/public/assistant/index.ts`
- Modify: `lambdas/public/assistant/index.test.ts`
- Modify: `lambdas/public/assistant/contentSearch.ts`
- Modify: `lambdas/public/assistant/contentSearch.test.ts`

**New request path:**

```text
validate/origin/method -> reserve quota -> retrieve dynamic content safely
-> select static knowledge locally -> fetch secret -> call Luna once
-> validate output -> map page/content/source IDs -> return
```

- [ ] Add failing handler tests showing `天気`, `旅行`, `料理`, `芸能`, `豊田工業大学`, and an unknown normal query each reserve quota and call `requestOpenAI` exactly once.
- [ ] Add zero-call tests for invalid input, denied origin, preflight, quota rejection, and secret failure.
- [ ] Add tests proving no `requestOpenAIPlan` call occurs, the exact Luna output for `豊田工業大学` is preserved rather than rewritten, and unsafe model output returns the generic existing upstream/unavailable error rather than a factual fallback.
- [ ] Add a test where `searchContent` throws: the handler still calls Luna once with `content: []` and `dynamicContentAvailable: false`.
- [ ] Add link tests proving output IDs are intersected with the selected allowed page/content/source IDs and exclusions are respected before exact server catalog mapping.
- [ ] Run `npm test -- index.test.ts contentSearch.test.ts` in `lambdas`; expect failures on the old short-circuit/planner/fallback flow.
- [ ] Remove the `initialPlan.confidence === 'none'` early response, `useAllApi` split, paid fact-planner call, `resolveAnswerForIntent`, `answerFromPlan`, `contentResponseFor`, and stored factual `fallbackResponseFor` from the production path.
- [ ] Catch only dynamic-content retrieval errors locally and continue with the unavailable flag; keep quota, secret, Luna timeout, and Luna upstream failures mapped to their existing status classes.
- [ ] Build final links by deduplicating verified page links, verified dynamic-content links, and verified official-source links, while honoring suppress/exclusion behavior and the global max link count.
- [ ] Extend `safeUsage` and the request-scoped counters with cached-input/cache-write tokens. Log `inputTokens`, `cachedInputTokens`, `cacheWriteTokens`, `outputTokens`, `totalTokens`, `knowledgeCount`, a comma-separated deduplicated `knowledgeDomains`, `lunaCallCount`, `outcome`, and `durationMs`; never include the message, history, or selected knowledge text.
- [ ] Record one `lunaCallCount` increment immediately before the single request invocation so success and failure logs are unambiguous.
- [ ] Run `npm test -- index.test.ts contentSearch.test.ts` in `lambdas`; expect all selected tests to pass.
- [ ] Stage: `git add lambdas/public/assistant/index.ts lambdas/public/assistant/index.test.ts lambdas/public/assistant/contentSearch.ts lambdas/public/assistant/contentSearch.test.ts`.
- [ ] Commit: `git commit -m "Route valid assistant questions through Luna once"`.

### Task 5: Remove superseded fixed-answer and obsolete app guidance code

**Files:**
- Delete if unreferenced: `lambdas/public/assistant/factPlanner.ts`
- Delete if unreferenced: `lambdas/public/assistant/facts.ts`
- Delete if unreferenced: `lambdas/public/assistant/engine.ts`
- Delete if unreferenced: `lambdas/public/assistant/engine.test.ts`
- Modify: `lambdas/public/assistant/intent.ts`
- Modify: `lambdas/public/assistant/intent.test.ts`
- Modify: `lambdas/public/assistant/knowledge.ts`
- Modify: `lambdas/public/assistant/knowledge.test.ts`
- Delete if unreferenced: `lambdas/public/assistant/knowledge/site-guide.json`
- Modify: `lambdas/public/assistant/runtimeCatalog.ts`
- Modify: `lambdas/public/assistant/types.ts`

- [ ] Run `rg -n "answerFromPlan|resolveAnswerForIntent|ASSISTANT_FACTS|requestOpenAIPlan|FactPlanner|trustedFactIds|OUT_OF_SCOPE_RESPONSE|CLI Practice|TOEIC" lambdas/public/assistant`; record every remaining active reference.
- [ ] Write or update tests so intent logic may supply routing/link suppression only and cannot replace answer prose; inventory/app candidates exclude CLI Practice and TOEIC Practice while `/app/cli-practice` still resolves as a valid public route.
- [ ] Run `npm test -- intent.test.ts knowledge.test.ts engine.test.ts` in `lambdas`; expect old fixed-answer assertions to fail.
- [ ] Delete the fact planner, fixed facts, deterministic answer builder, finished FAQ catalog, and their tests only after `rg` shows no runtime import. If follow-up/link exclusion helpers still live in those files, move the minimal helpers into `structuredKnowledge.ts` or `intent.ts` before deletion.
- [ ] Remove university answer wording from `intentHintFor` and remove `resolveAnswerForIntent`; retain only flags needed to narrow source/link candidates.
- [ ] Remove CLI Practice from Assistant inventory/candidate types without deleting its React route or application files. If `PageId` must still include it for route resolution, separate `PublicRouteId` from `AssistantPageId` rather than weakening type safety.
- [ ] Run `rg -n "answerFromPlan|resolveAnswerForIntent|ASSISTANT_FACTS|requestOpenAIPlan|FactPlanner|trustedFactIds|OUT_OF_SCOPE_RESPONSE|TOEIC" lambdas/public/assistant`; expect no active runtime references.
- [ ] Run `npm test` and `npm run typecheck` in `lambdas`; expect the full Lambda suite and TypeScript check to pass.
- [ ] Stage: `git add -A lambdas/public/assistant`.
- [ ] Commit: `git commit -m "Remove assistant fixed-answer pipeline"`.

### Task 6: Synchronize the public AI Assistant page and frontend link allowlist

**Files:**
- Modify: `frontend/src/pages/AiAssistantProduct.tsx`
- Modify: `frontend/src/pages/AiAssistantProduct.test.tsx`
- Modify: `frontend/src/features/assistant/assistantApi.ts`
- Modify: `frontend/src/features/assistant/assistantApi.test.ts`

- [ ] Add failing page tests for copy that says the assistant uses locally prepared site/university material and Luna's stable general knowledge, does not perform real-time web search, and may require checking current/important information at official sources.
- [ ] Change suggested questions to cover university extracurriculars, Codex/MCP development, a current app, and a stable general question; assert CLI Practice and TOEIC are absent.
- [ ] Add failing API tests accepting every exact official source URL from the server catalog, rejecting another `toyota-ti.ac.jp` path, a lookalike domain, query/fragment variants, and model-written inline URLs.
- [ ] Run `npm test -- src/pages/AiAssistantProduct.test.tsx src/features/assistant/assistantApi.test.ts` in `frontend`; expect copy/allowlist failures.
- [ ] Update the SEO description, sidebar explanation, notice, and suggested questions without claiming runtime search or guaranteed correctness.
- [ ] Replace the root-only Toyota TI regex with an exact reviewed URL set matching the server catalog; keep Discord, YouTube, and safe internal-path validation.
- [ ] Run `npm test -- src/pages/AiAssistantProduct.test.tsx src/features/assistant/assistantApi.test.ts` in `frontend`; expect all selected tests to pass.
- [ ] Run `npm run build` in `frontend`; expect the production build to pass.
- [ ] Stage: `git add frontend/src/pages/AiAssistantProduct.tsx frontend/src/pages/AiAssistantProduct.test.tsx frontend/src/features/assistant/assistantApi.ts frontend/src/features/assistant/assistantApi.test.ts`.
- [ ] Commit: `git commit -m "Sync assistant UI and verified sources"`.

### Task 7: Replace the 100-question evaluation with the new acceptance matrix

**Files:**
- Modify: `scripts/fixtures/assistant-noise-eval-100.json`
- Modify: `scripts/assistant-prod-eval-core.mjs`
- Modify: `scripts/assistant-prod-eval-100-natural.mjs`
- Modify: `scripts/generate-assistant-noise-eval-pdf.py`
- Modify: `lambdas/eval/assistant-local-noise-eval.ts`
- Modify: `lambdas/eval/assistant-local-noise-eval.test.ts`

**Evaluation categories:** site/join/contact; university overview/education/life/clubs; university-vs-TTI-Intelligence distinction; Codex/Vercel/AWS/Plugin/CLI/MCP; apps/game/math; stable general knowledge; real-time/high-risk constraints; typo/noise/short/follow-up/compound variants.

- [ ] Add failing evaluator tests for the new fixture schema and checks: answer relevance, forbidden fixed-template concentration, required distinction language, forbidden CLI/TOEIC guidance, unsafe links, one Luna call, zero web calls, and token usage including cached input/cache writes.
- [ ] Run `npm test -- eval/assistant-local-noise-eval.test.ts` in `lambdas`; expect failures for missing categories/metrics.
- [ ] Rewrite the 100 cases so each has a category, variant/noise label, expectation type, required/forbidden concepts, and link expectations; include at least ten general/current/high-risk questions and at least six development-tool questions.
- [ ] Update the production evaluator to capture status, latency, input/cached/cache-write/output/total tokens, link safety, and a response fingerprint used only to detect suspicious repeated templates. Do not save session identifiers or full conversation history in the report.
- [ ] Update the PDF generator with category-level accuracy, failure examples, Luna-call/web-call compliance, token/cost summary, and explicit model/configuration metadata.
- [ ] Run `npm test -- eval/assistant-local-noise-eval.test.ts` in `lambdas`; expect all evaluator tests to pass.
- [ ] Run the local dry-run evaluator command documented by `assistant-prod-eval-100-natural.mjs`; expect exactly 100 loaded cases and no fixture/schema errors. Do not call production yet.
- [ ] Configure evaluation evidence at `output/evals/assistant-luna-structured-knowledge-2026-08-03/` and the rendered report at `output/pdf/assistant-luna-structured-knowledge-evaluation-2026-08-03.pdf`.
- [ ] Stage: `git add scripts/fixtures/assistant-noise-eval-100.json scripts/assistant-prod-eval-core.mjs scripts/assistant-prod-eval-100-natural.mjs scripts/generate-assistant-noise-eval-pdf.py lambdas/eval/assistant-local-noise-eval.ts lambdas/eval/assistant-local-noise-eval.test.ts`.
- [ ] Commit: `git commit -m "Update assistant 100-question evaluation"`.

### Task 8: Verify deployment readiness and run the live evaluation only with deployment authority

**Files:**
- Generate after authorized deployment: `output/evals/assistant-luna-structured-knowledge-2026-08-03/dataset.json`
- Generate after authorized deployment: `output/evals/assistant-luna-structured-knowledge-2026-08-03/results.json`
- Generate after authorized deployment: `output/evals/assistant-luna-structured-knowledge-2026-08-03/results.csv`
- Generate after authorized deployment: `output/evals/assistant-luna-structured-knowledge-2026-08-03/summary.json`
- Generate after authorized deployment: `output/evals/assistant-luna-structured-knowledge-2026-08-03/manifest.json`
- Generate after authorized deployment: `output/pdf/assistant-luna-structured-knowledge-evaluation-2026-08-03.pdf`
- Verify: `infra/lib/tti-ai-stack.ts`
- Verify: `infra/test/tti-ai-stack.test.ts`

- [ ] Run `npm test` and `npm run typecheck` in `lambdas`; require zero failures.
- [ ] Run the focused frontend Assistant/page tests, `npm run lint`, and `npm run build` in `frontend`. Also run the full frontend test suite and report the pre-existing `WeeklyMathDetailHint.test.tsx` `ResizeObserver` failure separately if it remains; do not hide or misattribute it.
- [ ] Run `npm test`, `npm run build`, and `npm run synth` in `infra`; require zero assistant-stack regressions and confirm no web-search IAM/service configuration was introduced.
- [ ] Run `rg -n "web_search|webSearch|TOEIC|resolveAnswerForIntent|answerFromPlan|ASSISTANT_FACTS|requestOpenAIPlan" lambdas/public/assistant frontend/src/features/assistant frontend/src/pages/AiAssistantProduct.tsx`; expect no runtime web-search or fixed-answer references and no obsolete Assistant guidance.
- [ ] Inspect `git diff --check`, `git status --short`, and the final diff. Confirm all changes are in scope and no user changes were overwritten.
- [ ] If and only if the user asks to deploy, deploy the Lambda/stack through the repository's existing deployment command, then send smoke questions covering university, university clubs, Codex+MCP, a general question, and current weather.
- [ ] After a successful authorized deployment, run the 100-question production evaluation once, generate the PDF, and verify visually that tables/charts/text are not clipped. Record exact pass rates and token/cost totals; do not reset or bypass the daily quota unless the user explicitly authorizes the specific operational reset and its target is verified.
- [ ] If implementation verification is green but deployment was not requested, stop with a deployment-ready summary and do not mutate production.
- [ ] If generated evidence/report files are tracked by repository policy, stage them with `git add output/evals/assistant-luna-structured-knowledge-2026-08-03 output/pdf/assistant-luna-structured-knowledge-evaluation-2026-08-03.pdf`.
- [ ] Commit staged generated artifacts separately with `git commit -m "Add Luna assistant evaluation report"`.

## Acceptance Checklist

- [ ] All valid normal messages reach Luna exactly once; no content-based short-circuit remains.
- [ ] No web-search tool or fallback exists in the request or infrastructure.
- [ ] `豊田工業大学` preserves the generated answer; no prose replacement remains.
- [ ] University-wide extracurriculars and TTI Intelligence are distinguished using dated official material.
- [ ] Codex, Vercel, AWS, Plugin, CLI, and MCP each select relevant factual material.
- [ ] CLI Practice remains routable but is absent from Assistant app guidance; TOEIC is absent.
- [ ] Dynamic-content failure degrades to one Luna call with an explicit unavailable state.
- [ ] Model URLs are stripped; only exact server/frontend allowlisted links render.
- [ ] Usage logs include input, cached input, cache write, output, total, selected knowledge count/domains, Luna call count, outcome, and duration, but no question/history text.
- [ ] Lambda, focused frontend, frontend build/lint, and infrastructure verification pass; any unrelated pre-existing test failure is disclosed.
- [ ] The 100-question evaluation and PDF are run only after an authorized deployment.
