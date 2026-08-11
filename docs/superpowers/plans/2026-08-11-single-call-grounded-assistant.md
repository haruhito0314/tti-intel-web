# Single-Call Grounded Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every substantive Assistant question use exactly one `gpt-5.6-luna` call that classifies the request and answers from a complete reviewed TTI Intelligence/site knowledge pack, while keeping replies short and useful.

**Architecture:** Validation and simple conversation remain deterministic and local. Every other request loads one bounded static knowledge pack, optionally adds bounded current-content excerpts, calls Luna once with a strict combined scope-and-answer schema, validates the result, and creates links only from local allowlists. Web search, OpenAI tools, a separate classifier call, and fixed generic substantive replies are forbidden.

**Tech Stack:** TypeScript, AWS Lambda/API Gateway, OpenAI Responses API, AWS CDK, React/Vite, Vitest, Node test runner.

## Global Constraints

- Implement the approved design in `docs/superpowers/specs/2026-08-11-single-call-grounded-assistant-design.md` exactly.
- Preserve and do not stage the pre-existing user-owned changes:
  - `docs/superpowers/specs/2026-08-10-natural-language-assistant-routing-design.md`
  - `docs/superpowers/plans/2026-08-10-natural-language-assistant-routing.md`
- Use `gpt-5.6-luna` only; `store: false`; `tools: []`; no Web search.
- Local zero-call responses are allowed only for greetings, thanks, acknowledgements, and farewells.
- Every other valid request performs exactly one Luna call and consumes one paid-call quota unit.
- Answers must contain no raw URL or Markdown link, must be at most 200 Unicode code points, and should normally be one or two short Japanese sentences.
- Internal and external links are constructed after model validation from reviewed IDs only.
- Do not run the live 100-question evaluation or deploy production without a fresh explicit user authorization. Local dry-runs and read-only AWS checks are allowed.
- At each commit, stage only the files listed for that task and run `git diff --cached --check` before committing.
- Treat every shell block below as starting from `/Users/haruhito/Documents/Github/web`; do not rely on a previous block's working directory or environment variables.

---

### Task 1: Build and freeze the complete reviewed knowledge pack

**Files:**
- Create: `lambdas/public/assistant/knowledgePack.ts`
- Create: `lambdas/public/assistant/knowledgePack.test.ts`
- Modify: `lambdas/public/assistant/knowledge/site-knowledge.json`
- Modify: `lambdas/public/assistant/structuredKnowledge.ts`
- Modify: `lambdas/public/assistant/structuredKnowledge.test.ts`

- [ ] **Step 1: Write the failing catalog and byte-bound tests**

Add tests requiring one non-empty entry and one permitted destination for every supported area:

```ts
const REQUIRED_TOPIC_IDS = [
  'circle.identity', 'circle.activities', 'circle.participation',
  'circle.eligibility', 'circle.schedule', 'circle.fees',
  'circle.contact', 'circle.discord', 'circle.youtube',
  'site.overview', 'site.about', 'site.news', 'site.apps',
  'site.development', 'site.board', 'site.contact',
  'site.game-community', 'site.weekly-math',
  'site.table-tennis', 'site.color-sort',
  'board.posting', 'board.anonymous-name', 'board.threads', 'board.comments',
  'development.codex', 'development.vercel', 'development.aws',
  'development.plugin', 'development.cli', 'development.mcp',
] as const;

expect(pack.schemaVersion).toBe(1);
expect(new Set(pack.entries.map((entry) => entry.topicId))).toEqual(
  new Set(REQUIRED_TOPIC_IDS),
);
expect(assistantKnowledgePackBytes(pack)).toBeLessThanOrEqual(32_000);
expect(pack.entries.every((entry) => entry.pageIds.length > 0)).toBe(true);
```

Also assert that each entry has non-empty `facts`, every `pageId` belongs to `ASSISTANT_PAGE_IDS`, source IDs are reviewed, and the serialized pack contains no raw user-generated news/board text.

- [ ] **Step 2: Run RED**

Run:

```bash
cd lambdas
npx vitest run public/assistant/knowledgePack.test.ts public/assistant/structuredKnowledge.test.ts
```

Expected: FAIL because `knowledgePack.ts`, the complete topic IDs, and coverage invariants do not yet exist.

- [ ] **Step 3: Add the bounded pack contract**

Implement this public interface without phrase ranking:

```ts
export const ASSISTANT_KNOWLEDGE_PACK_SCHEMA_VERSION = 1 as const;
export const MAX_ASSISTANT_KNOWLEDGE_PACK_BYTES = 32_000;

export interface AssistantKnowledgeEntry {
  topicId: string;
  title: string;
  facts: readonly string[];
  pageIds: readonly AssistantPageId[];
  sourceIds: readonly OfficialSourceId[];
}

export interface AssistantKnowledgePack {
  schemaVersion: typeof ASSISTANT_KNOWLEDGE_PACK_SCHEMA_VERSION;
  entries: readonly AssistantKnowledgeEntry[];
}

export function buildAssistantKnowledgePack(): AssistantKnowledgePack;
export function assistantKnowledgePackBytes(pack: AssistantKnowledgePack): number;
```

Calculate bytes with `Buffer.byteLength(JSON.stringify(pack), 'utf8')`. Throw before returning if the pack exceeds `MAX_ASSISTANT_KNOWLEDGE_PACK_BYTES`.

- [ ] **Step 4: Complete the reviewed facts**

Update `site-knowledge.json` so it covers all listed circle/site/board/app/development topics, especially:

- what the site contains and where each feature is found;
- whether users may contact the circle and where;
- board posting, display-name, thread, and comment behavior;
- the published apps and what they do;
- Codex, Vercel, AWS, Plugin, CLI, and MCP as presented on the site.

Facts must describe only behavior visible in reviewed repository code/content. Do not add university detail beyond identity/relationship and the official-site direction.

- [ ] **Step 5: Keep legacy retrieval compatible but separate**

Export any reusable validated catalog loader from `structuredKnowledge.ts`, but do not make `buildAssistantKnowledgePack()` depend on the current phrase score or top-five selection. The legacy selector may remain only for evaluator compatibility until Task 6.

- [ ] **Step 6: Run GREEN and commit**

Run:

```bash
cd lambdas
npx vitest run public/assistant/knowledgePack.test.ts public/assistant/structuredKnowledge.test.ts
npm run typecheck
cd ..
git diff --check
git add lambdas/public/assistant/knowledgePack.ts \
  lambdas/public/assistant/knowledgePack.test.ts \
  lambdas/public/assistant/knowledge/site-knowledge.json \
  lambdas/public/assistant/structuredKnowledge.ts \
  lambdas/public/assistant/structuredKnowledge.test.ts
git diff --cached --check
git commit -m "Add complete assistant knowledge pack"
```

Expected: focused tests and typecheck PASS; only the five task files are committed.

---

### Task 2: Define the combined scope-and-answer contract

**Files:**
- Modify: `lambdas/public/assistant/types.ts`
- Modify: `lambdas/public/assistant/runtimeCatalog.ts`
- Modify: `lambdas/public/assistant/validation.ts`
- Modify: `lambdas/public/assistant/validation.test.ts`

- [ ] **Step 1: Write failing strict-validation tests**

Add valid fixtures for all four scopes and rejection tests for unknown scope, extra keys, raw URLs, Markdown links, over-200-code-point answers, more than two sentence clauses, invalid topic labels, unknown IDs, and scope-incompatible links.

```ts
const validOutOfScope = {
  scope: 'out_of_scope',
  topicLabel: '東京の天気',
  answer: '申し訳ありませんが、東京の天気については案内できません。必要であればお問い合わせください。',
  pageIds: ['contact'],
  contentIds: [],
  sourceIds: [],
};
```

Pin these scope policies:

- `circle`: reviewed internal/source/content IDs; never `toyota-ti`.
- `site`: reviewed internal/source/content IDs; never `toyota-ti`.
- `university`: `pageIds=[]`, `contentIds=[]`, `sourceIds=['toyota-ti']`, no university-detail claims.
- `out_of_scope`: `pageIds=['contact']`, `contentIds=[]`, `sourceIds=[]`, non-empty safe `topicLabel`.

- [ ] **Step 2: Run RED**

Run:

```bash
cd lambdas
npx vitest run public/assistant/validation.test.ts
```

Expected: FAIL because the response has no `scope` or `topicLabel`, and `toyota-ti` is not an official source ID.

- [ ] **Step 3: Implement the exact types and source catalog**

```ts
export const ASSISTANT_MODEL_SCOPES = [
  'circle', 'site', 'university', 'out_of_scope',
] as const;
export type AssistantModelScope = (typeof ASSISTANT_MODEL_SCOPES)[number];
export type OfficialSourceId = 'discord' | 'youtube' | 'toyota-ti';

export interface ModelGuideResponse {
  scope: AssistantModelScope;
  topicLabel: string;
  answer: string;
  pageIds: string[];
  contentIds: string[];
  sourceIds: string[];
}

export interface ModelGuideValidationContext {
  allowedPageIds: readonly AssistantPageId[];
  allowedContentIds: readonly string[];
  allowedSourceIds: readonly OfficialSourceId[];
}
```

Add `toyota-ti` to `OFFICIAL_SOURCE_LINKS` using the existing exact `TOYOTA_TI_URL`.

- [ ] **Step 4: Implement semantic validation after shape validation**

`validateModelGuideResponse(value, context)` must:

- require exactly the seven contract keys;
- count Unicode code points with `[...answer].length`;
- permit at most two non-empty sentence clauses;
- reject control characters and URL/Markdown patterns in `answer` and `topicLabel`;
- permit at most three values per ID array with no duplicates;
- reject every ID that is absent from the corresponding context allowlist;
- require `topicLabel === ''` outside `out_of_scope`;
- require an out-of-scope topic label of 1–24 code points;
- enforce the four scope policies above;
- require an out-of-scope answer to contain an apology, inability to answer that topic, and a Contact recommendation;
- require a university answer to mention the official site and reject dates, numbers, departments, admissions, fees, and other detailed claims;
- retain existing unsafe-instruction checks.

Do not silently rewrite an invalid model response.

- [ ] **Step 5: Run GREEN and commit**

Run:

```bash
cd lambdas
npx vitest run public/assistant/validation.test.ts
npm run typecheck
cd ..
git diff --check
git add lambdas/public/assistant/types.ts \
  lambdas/public/assistant/runtimeCatalog.ts \
  lambdas/public/assistant/validation.ts \
  lambdas/public/assistant/validation.test.ts
git diff --cached --check
git commit -m "Define combined assistant response contract"
```

---

### Task 3: Send one bounded Luna request with the full pack

**Files:**
- Modify: `lambdas/public/assistant/openai.ts`
- Modify: `lambdas/public/assistant/openai.test.ts`
- Modify: `lambdas/public/assistant/openaiTransport.ts`

- [ ] **Step 1: Write failing payload tests**

Require all of the following in one test suite:

```ts
expect(payload.model).toBe('gpt-5.6-luna');
expect(payload.store).toBe(false);
expect(payload.tools).toEqual([]);
expect(payload.text.format.schema.required).toEqual([
  'scope', 'topicLabel', 'answer', 'pageIds', 'contentIds', 'sourceIds',
]);
const inputData = JSON.parse(payload.input[0].content[0].text);
expect(inputData.knowledgePack.entries).toHaveLength(expectedPackSize);
expect(inputData.history.length).toBeLessThanOrEqual(1);
```

Also test that the schema uses `additionalProperties: false`, scope is an enum, current content is limited to three excerpts, and oversized UTF-8 input fails before `fetch`/transport is called.

- [ ] **Step 2: Run RED**

Run:

```bash
cd lambdas
npx vitest run public/assistant/openai.test.ts
```

Expected: FAIL because the payload still uses the old four-field schema and top-five selected knowledge.

- [ ] **Step 3: Replace the instructions and payload input**

Change `buildResponsesPayload()` to accept:

```ts
interface BuildResponsesPayloadInput {
  request: AssistantRequest;
  knowledgePack: AssistantKnowledgePack;
  content: readonly RankedContentEntry[];
}
```

The instructions must state, in Japanese behavior terms:

- classify by meaning, not exact words;
- answer only from supplied reviewed facts/excerpts;
- `circle` and `site`: lead with the answer in one or two short sentences;
- `university`: no detailed claims; short official-site direction only;
- `out_of_scope`: question-specific apology using a short topic label and recommend contact;
- no raw URL, no Markdown link, no invented facts;
- latest user message has priority over the optional previous turn.

- [ ] **Step 4: Enforce one deterministic request-byte limit**

Add:

```ts
export const MAX_ASSISTANT_OPENAI_INPUT_BYTES = 48_000;
```

Serialize the exact request input once, compute UTF-8 bytes, and throw `AssistantPromptTooLargeError` before calling the transport when the limit is exceeded. The handler will map this to the existing safe upstream-error response; it must not spend quota twice or retry.

- [ ] **Step 5: Parse the strict combined result once**

Keep one Responses API invocation. `parseResponsesEnvelope(envelope, validationContext)` must pass the parsed JSON through `validateModelGuideResponse(value, validationContext)` and return its usage unchanged. Build that context from the complete pack, the three supplied content excerpts, and the reviewed source catalog. Do not add a classifier transport, retry, Web search tool, or fallback generation call.

- [ ] **Step 6: Run GREEN and commit**

Run:

```bash
cd lambdas
npx vitest run public/assistant/openai.test.ts public/assistant/validation.test.ts
npm run typecheck
cd ..
git diff --check
git add lambdas/public/assistant/openai.ts \
  lambdas/public/assistant/openai.test.ts \
  lambdas/public/assistant/openaiTransport.ts
git diff --cached --check
git commit -m "Use one grounded Luna request"
```

---

### Task 4: Replace regex routing with the one-call handler state machine

**Files:**
- Modify: `lambdas/public/assistant/index.ts`
- Modify: `lambdas/public/assistant/index.test.ts`
- Modify: `lambdas/public/assistant/localResponses.ts`
- Modify: `lambdas/public/assistant/localResponses.test.ts`
- Modify: `lambdas/public/assistant/scope.ts`
- Modify: `lambdas/public/assistant/scope.test.ts`

- [ ] **Step 1: Add the six failing handler regressions**

At the handler boundary, stub one Luna result per request and assert the exact call/link contract:

| Message | Model scope | Required result | Luna calls |
|---|---|---|---:|
| `このサイトでは何があるの？` | `site` | site overview + relevant internal link | 1 |
| `お問い合わせってしていいの？` | `site` | contact behavior + `/contact` | 1 |
| `このサークルって普段何をしてる？` | `circle` | activity answer + `/about` | 1 |
| `掲示板は投稿していいの？` | `site` | posting behavior + `/board` | 1 |
| `豊田工業大学について教えて` | `university` | short direction + exact official URL | 1 |
| `東京の天気は？` | `out_of_scope` | topic-specific apology + `/contact` | 1 |

For each case also assert: quota reserve count `1`, Web/tool count `0`, a non-empty complete pack reaches the OpenAI dependency, and the old fixed generic sentence is absent.

Add local cases for `こんにちは`, `ありがとう`, `了解`, and `またね`; assert zero quota and zero Luna calls.

- [ ] **Step 2: Run RED**

Run:

```bash
cd lambdas
npx vitest run public/assistant/index.test.ts public/assistant/localResponses.test.ts public/assistant/scope.test.ts
```

Expected: university and out-of-scope cases return locally, and natural substantive cases can still be misrouted or under-grounded.

- [ ] **Step 3: Restrict local response handling to conversation**

Replace the broad API with:

```ts
export function localConversationResponseFor(message: string): AssistantResponse | null;
```

Return non-null only for the four simple conversational categories. Delete the university fixed response and the generic out-of-scope sentence. `scope.ts` may retain only helpers needed to recognize local conversation and dynamic-content intent; `classifyAssistantScope()` must no longer gate production substantive requests.

- [ ] **Step 4: Implement the paid path once**

After request validation and local conversation handling:

1. reserve exactly one daily quota unit;
2. get the secret once;
3. load `buildAssistantKnowledgePack()`;
4. use a scope-independent `shouldSearchDynamicContent(message, currentPath)` helper to optionally retrieve up to three current-content excerpts through the existing safe repository wrapper;
5. call Luna once;
6. build the public response from the validated model scope.

Do not branch to a second OpenAI request. Keep repository failure contained so static knowledge still reaches Luna.

- [ ] **Step 5: Enforce scope-aware postprocessing**

Create links by these rules:

- `circle`/`site`: only validated pack page IDs, selected current-content IDs, and reviewed official-source IDs;
- `university`: ignore all other IDs and attach only `toyota-ti`;
- `out_of_scope`: ignore all other IDs and attach only `/contact`.

Log `assistantScope` from the validated model result, `lunaCallCount: 1`, and `webCallCount: 0`. Conversation logs remain `lunaCallCount: 0`.

- [ ] **Step 6: Run GREEN and commit**

Run:

```bash
cd lambdas
npx vitest run public/assistant/index.test.ts \
  public/assistant/localResponses.test.ts \
  public/assistant/scope.test.ts \
  public/assistant/openai.test.ts
npm run typecheck
cd ..
git diff --check
git add lambdas/public/assistant/index.ts \
  lambdas/public/assistant/index.test.ts \
  lambdas/public/assistant/localResponses.ts \
  lambdas/public/assistant/localResponses.test.ts \
  lambdas/public/assistant/scope.ts \
  lambdas/public/assistant/scope.test.ts
git diff --cached --check
git commit -m "Route substantive questions through one Luna call"
```

---

### Task 5: Make the Assistant page describe and exercise the new behavior

**Files:**
- Modify: `frontend/src/pages/AiAssistantProduct.tsx`
- Modify: `frontend/src/pages/AiAssistantProduct.test.tsx`

- [ ] **Step 1: Write failing user-copy tests**

Replace the old expectation that general questions do not use Luna. Require copy that says the Assistant gives short answers from published TTI Intelligence/site information, directs university questions to the official site, and directs unsupported topics to Contact.

Pin these four suggested prompts:

```ts
[
  'このサークルって普段何をしてる？',
  'このサイトでは何があるの？',
  '掲示板は投稿していいの？',
  'お問い合わせってしていいの？',
]
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd frontend
npx vitest run src/pages/AiAssistantProduct.test.tsx
```

Expected: FAIL on the old zero-Luna copy and old suggestion labels.

- [ ] **Step 3: Update visible and metadata copy**

Keep the copy concise and user-facing. Do not mention regex, routing internals, token accounting, or unsupported blanket claims such as “何でも答えます”. Remove `対象外の一般的な質問にはLunaを利用しません` everywhere, including metadata.

- [ ] **Step 4: Run GREEN, build, and commit**

Run:

```bash
cd frontend
npx vitest run src/pages/AiAssistantProduct.test.tsx
npm run build
cd ..
git diff --check
git add frontend/src/pages/AiAssistantProduct.tsx \
  frontend/src/pages/AiAssistantProduct.test.tsx
git diff --cached --check
git commit -m "Update Assistant guidance for grounded answers"
```

---

### Task 6: Migrate the deterministic 100-question evaluator

**Files:**
- Modify: `scripts/fixtures/assistant-noise-eval-100.json`
- Modify: `scripts/assistant-prod-eval-core.mjs`
- Modify: `scripts/assistant-prod-eval-core.test.mjs`
- Modify: `scripts/assistant-prod-eval-100-natural.mjs`
- Modify: `lambdas/eval/assistant-local-noise-eval.ts`
- Modify: `lambdas/eval/assistant-local-noise-eval.test.ts`
- Modify: `lambdas/eval/fixtures/assistant-noise-eval-dry-run.json`

- [ ] **Step 1: Write failing schema and evaluator tests**

Freeze schema version `5` with exactly 100 IDs `L001`–`L100` and this count contract:

```ts
expect(scopeCounts).toEqual({
  circle: 32,
  site: 32,
  university: 16,
  out_of_scope: 16,
  conversation: 4,
});
expect(oneLunaCallCases).toBe(96);
expect(zeroLunaCallCases).toBe(4);
expect(expectedWebCalls).toBe(0);
```

Require the six production regressions verbatim in the fixture. Keep four wording/noise variants per topic, but include bare/deictic phrases instead of requiring `TTI Intelligence`, `AIサークル`, or `このサークル` in every circle case.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test scripts/assistant-prod-eval-core.test.mjs
cd lambdas
npx vitest run eval/assistant-local-noise-eval.test.ts
```

Expected: FAIL because schema version 4 expects 64 Luna calls and 36 local responses.

- [ ] **Step 3: Update fixture expectations and safety gates**

For university and out-of-scope cases set `expectedLunaCallCount: 1`. For conversation set `0`; every other case is `1`. Keep `expectedWebCallCount: 0` for all 100.

Update evaluator checks so generated results still enforce:

- exact scope;
- required concept and allowed links;
- 200-code-point maximum;
- no raw URLs, unsafe medical/financial claims, invented current weather, or detailed university facts;
- question-specific out-of-scope apologies rather than one repeated generic template;
- exact per-case Luna and Web call counts.

- [ ] **Step 4: Make runner request construction match production**

Ensure every case has a valid `sessionId`, including conversation cases, because request validation occurs before local routing. Persist no user answer/history text in telemetry; keep case-keyed sanitized call counts and usage only.

- [ ] **Step 5: Run GREEN and the zero-cost dry-run**

Run:

```bash
node --test scripts/assistant-prod-eval-core.test.mjs
node scripts/assistant-prod-eval-100-natural.mjs --dry-run
cd lambdas
npx vitest run eval/assistant-local-noise-eval.test.ts
npm run typecheck
```

Expected dry-run output: exactly 100 cases loaded, 0 production calls, and 0 OpenAI calls. Do not use the dry-run as a claim of measured production accuracy.

- [ ] **Step 6: Commit the evaluator migration**

Run:

```bash
git diff --check
git add scripts/fixtures/assistant-noise-eval-100.json \
  scripts/assistant-prod-eval-core.mjs \
  scripts/assistant-prod-eval-core.test.mjs \
  scripts/assistant-prod-eval-100-natural.mjs \
  lambdas/eval/assistant-local-noise-eval.ts \
  lambdas/eval/assistant-local-noise-eval.test.ts \
  lambdas/eval/fixtures/assistant-noise-eval-dry-run.json
git diff --cached --check
git commit -m "Migrate Assistant evaluation to one-call routing"
```

---

### Task 7: Complete integration verification and prepare the release

**Files:**
- Modify only if assertions require it: `infra/test/tti-ai-stack.test.ts`
- Create: `docs/superpowers/reports/2026-08-11-single-call-grounded-assistant.md`

- [ ] **Step 1: Add or confirm infrastructure assertions**

The CDK test must prove the deployed Lambda uses `ASSISTANT_MODEL=gpt-5.6-luna` and has no Web-search integration. Do not add a new classifier Lambda, API route, or table.

- [ ] **Step 2: Run the complete local verification matrix**

Run from the repository root:

```bash
cd lambdas
npm test
npm run typecheck
cd ../frontend
npm test
npm run build
cd ../infra
npm test
npm run build
cd ..
node --test scripts/assistant-prod-eval-core.test.mjs
node scripts/assistant-prod-eval-100-natural.mjs --dry-run
git diff --check
git status --short
```

Expected:

- all Lambda, frontend, infrastructure, and evaluator tests PASS;
- both TypeScript builds PASS;
- dry-run loads exactly 100 cases with 0 production/OpenAI calls;
- only the two pre-existing user-owned documentation changes remain unstaged, plus the task report before its commit.

- [ ] **Step 3: Write the verification report**

Record:

- commit SHAs for Tasks 1–6;
- exact test counts and command exit results;
- dry-run counts;
- the six required regressions and their expected scope/link/call behavior;
- a clear statement that no live 100-case run and no deployment occurred in local verification.

- [ ] **Step 4: Request code review and address only verified findings**

Use `superpowers:requesting-code-review`. If review feedback arrives, use `superpowers:receiving-code-review`, reproduce each finding with a failing test, implement the smallest correction, rerun the complete matrix, and update the report.

- [ ] **Step 5: Commit release-readiness evidence**

Run:

```bash
git add infra/test/tti-ai-stack.test.ts \
  docs/superpowers/reports/2026-08-11-single-call-grounded-assistant.md
git diff --cached --check
git commit -m "Verify single-call grounded Assistant"
```

If the infra test required no modification, stage only the report.

---

### Task 8: Deploy and run the six-case smoke test only after explicit authorization

**Files:**
- Append: `docs/superpowers/reports/2026-08-11-single-call-grounded-assistant.md`

- [ ] **Step 1: Stop and obtain explicit production authorization**

Show the user the candidate Git SHA, AWS account `869036202905`, region `ap-northeast-1`, stack `TtiAiStack`, Lambda `tti-ai-site-assistant`, and the six paid smoke requests. Do not proceed from an earlier generic “ok”.

- [ ] **Step 2: Authenticate and inspect the deployment diff**

Run:

```bash
aws sso login --profile tti-deploy
aws sts get-caller-identity --profile tti-deploy
cd infra
AWS_PROFILE=tti-deploy npm run diff
```

Verify the account is exactly `869036202905`, the region is `ap-northeast-1`, and the diff contains no new Web-search or classifier infrastructure.

- [ ] **Step 3: Deploy the Lambda stack**

After the explicit approval and successful diff review:

```bash
cd infra
AWS_PROFILE=tti-deploy npm run deploy -- --require-approval never
aws cloudformation describe-stacks \
  --profile tti-deploy \
  --region ap-northeast-1 \
  --stack-name TtiAiStack \
  --query 'Stacks[0].StackStatus' \
  --output text
aws lambda get-function-configuration \
  --profile tti-deploy \
  --region ap-northeast-1 \
  --function-name tti-ai-site-assistant \
  --query '{State:State,LastUpdateStatus:LastUpdateStatus}'
```

Expected: CloudFormation `UPDATE_COMPLETE`; Lambda `State=Active` and `LastUpdateStatus=Successful`.

- [ ] **Step 4: Run only the six approved production smoke questions**

Send the six exact regressions to:

`https://dfqmc56d94.execute-api.ap-northeast-1.amazonaws.com/prod/assistant`

For each, verify HTTP 200, answer length at most 200 code points, expected scope behavior, allowlisted links, exactly one Luna call, and zero Web/tool calls. Verify a separate greeting uses zero Luna calls.

- [ ] **Step 5: Publish the frontend only if its source changed and smoke passes**

Amplify is frontend-only and does not deploy the Lambda. Push the reviewed main commit only after backend smoke passes, then wait for the matching Amplify job to succeed and verify the published site returns HTTP 200.

- [ ] **Step 6: Append deployment evidence and commit**

Append the deployed commit, CloudFormation/Lambda status, smoke result table, and Amplify job ID/status to the report. Do not include messages, histories, session IDs, secrets, or raw logs.

```bash
git add docs/superpowers/reports/2026-08-11-single-call-grounded-assistant.md
git diff --cached --check
git commit -m "Record grounded Assistant release"
```
