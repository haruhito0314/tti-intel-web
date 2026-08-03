# Assistant Domain Scope Without Web Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Luna answers for TTI Intelligence and adjacent AI, programming, development, mathematics, games, and learning questions while eliminating web search and avoiding paid API calls for clearly unrelated questions.

**Architecture:** Reuse `planAssistantRequest` as the pre-API scope boundary: `confidence === 'none'` returns a fixed link-free response before quota or repositories, while low/high confidence continues to one Luna call. Remove the Responses API web tool and its source-link data path end to end; keep answer generation and all official URLs under the existing deterministic catalog and URL sanitizers.

**Tech Stack:** TypeScript, AWS Lambda, OpenAI Responses API, Vitest, React, Zod, AWS CDK, Amplify.

## Global Constraints

- The production model remains exactly `gpt-5.6-luna`.
- No request exposes `web_search`, `web_search_preview`, or a search-source include.
- Clearly unrelated requests do not reserve quota, read repositories, fetch the API secret, or call OpenAI.
- AI, programming, web/app development, mathematics, games, project making, and learning-method questions remain eligible for Luna.
- Ambiguous requests remain eligible for Luna so local keyword matching does not become overly restrictive.
- Luna never owns URLs; internal and official external links come only from reviewed catalogs and constants.
- Preserve unrelated working-tree changes, especially `frontend/src/components/development/*`.
- Preserve and test the existing uncommitted inline-URL sanitization work; do not replace it with model prompt instructions alone.

---

### Task 1: Enforce the paid-request scope boundary

**Files:**
- Modify: `lambdas/public/assistant/engine.ts:592-601`
- Test: `lambdas/public/assistant/engine.test.ts:916-946`
- Modify: `lambdas/public/assistant/index.ts:80-120,350-365`
- Test: `lambdas/public/assistant/index.test.ts:174-235,678-705`

**Interfaces:**
- Consumes: `planAssistantRequest(message, history): AssistantQueryPlan` and its existing `confidence` field.
- Produces: a fixed `AssistantResponse` for `confidence === 'none'` with no links and no operational dependency calls.

- [ ] **Step 1: Write failing handler tests for all-API scope routing**

Add an all-API test with literal expected output and a table of clearly unrelated messages:

```ts
const OUT_OF_SCOPE_RESPONSE = {
  answer: 'このAI Assistantでは、TTI Intelligenceやサイトの内容、AI・開発・数学・ゲームについて案内できます。',
  links: [],
};

it.each([
  '今日の天気を教えて',
  '京都旅行のおすすめを教えて',
  'カレーの作り方を教えて',
  '芸能ニュースを教えて',
])('does not spend quota on a clearly unrelated all-API request: %s', async (message) => {
  const dependencies = createDependencies({ useAllApi: true });
  const response = await invoke(dependencies, eventForRequest({ message, history: [] }));

  expect(response.statusCode).toBe(200);
  expect(parsedBody(response)).toEqual(OUT_OF_SCOPE_RESPONSE);
  expectNoOperationalCalls(dependencies);
  expect(dependencies.requestOpenAI).not.toHaveBeenCalled();
});
```

Also add a single table-driven regression test demonstrating that adjacent topics still cross the paid boundary:

```ts
it.each([
  'AIって何？',
  'プログラミングを始めるには？',
  'Webアプリ開発の進め方は？',
  '数学を勉強するコツは？',
  'ゲーム制作は何から始めればいい？',
])('still sends an adjacent learning question to Luna: %s', async (message) => {
  const dependencies = createDependencies({ useAllApi: true });
  const response = await invoke(dependencies, eventForRequest({ message, history: [] }));

  expect(response.statusCode).toBe(200);
  expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
  expect(parsedBody(response)).toEqual({ answer: '回答です。', links: [] });
});
```

- [ ] **Step 2: Run the focused handler test and verify RED**

Run:

```bash
cd lambdas && npm test -- --run public/assistant/index.test.ts
```

Expected: the unrelated all-API cases fail because the current `useAllApi` branch reaches quota/OpenAI, and travel/cooking/entertainment cases are not yet classified as `none`.

- [ ] **Step 3: Add engine classification coverage for the new explicit exclusions**

Extend the existing confidence test with literal cases:

```ts
it.each([
  '京都旅行のおすすめを教えて',
  'カレーの作り方を教えて',
  '芸能ニュースを教えて',
])('marks a clearly unrelated topic as explicit out of scope: %s', (message) => {
  const plan = planAssistantRequest(message, []);
  expect(plan.mode).toBe('unsupported');
  expect(plan.confidence).toBe('none');
});
```

Do not mark `AIって何？`, `プログラミングを始めるには？`, or ambiguous pronoun follow-ups as explicit out of scope.

- [ ] **Step 4: Implement the minimal scope boundary**

Expand `isExplicitOutOfScope` only for clearly unrelated travel, cooking/recipes, entertainment/celebrity news, weather, finance, and unrelated current events. Keep the existing deliberate exclusion for requests that ask the Assistant to generate a programming artifact; explanatory and learning questions remain eligible.

In `createAssistantHandler`, replace the legacy-only early exit with an unconditional paid boundary:

```ts
if (initialPlan.confidence === 'none') {
  outcome = 'no_relevant_knowledge';
  statusCode = 200;
  return jsonResponse(statusCode, OUT_OF_SCOPE_RESPONSE, origin);
}
```

Define `OUT_OF_SCOPE_RESPONSE` as a frozen or readonly `AssistantResponse` near the other response constants. It must contain no Contact link.

- [ ] **Step 5: Run engine and handler tests and verify GREEN**

Run:

```bash
cd lambdas && npm test -- --run public/assistant/engine.test.ts public/assistant/index.test.ts
```

Expected: both files pass, unrelated requests make zero operational calls, and adjacent questions call Luna exactly once.

- [ ] **Step 6: Commit the scope boundary**

```bash
git add lambdas/public/assistant/engine.ts lambdas/public/assistant/engine.test.ts lambdas/public/assistant/index.ts lambdas/public/assistant/index.test.ts
git commit -m "Limit assistant API calls to related topics"
```

---

### Task 2: Remove web search from the Responses API and Lambda contract

**Files:**
- Modify: `lambdas/public/assistant/openai.ts:47-75,272-332,335-400`
- Test: `lambdas/public/assistant/openai.test.ts:500-535,590-615,830-870`
- Modify: `lambdas/public/assistant/index.ts:120-180,450-465`
- Test: `lambdas/public/assistant/index.test.ts:174-205`
- Modify: `lambdas/public/assistant/types.ts:29-39,89-103`

**Interfaces:**
- Consumes: `requestOpenAI(input): Promise<OpenAIResult>` with structured `answer`, `pageIds`, `contentIds`, and usage.
- Produces: a Responses API payload with `tools: []` and no `max_tool_calls`, `tool_choice`, or `include`; `OpenAIResult` has no `sources` field.

- [ ] **Step 1: Change the payload test first and verify RED**

In the exact payload assertion, replace the search configuration with:

```ts
expect(payload.tools).toEqual([]);
expect(payload).not.toHaveProperty('max_tool_calls');
expect(payload).not.toHaveProperty('tool_choice');
expect(payload).not.toHaveProperty('include');
expect(JSON.stringify(payload)).not.toContain('web_search');
```

Rename the reviewed-facts test to `includes reviewed site facts without exposing web search` and make the same assertions. Remove the test whose desired behavior is extracting web sources.

Run:

```bash
cd lambdas && npm test -- --run public/assistant/openai.test.ts
```

Expected: FAIL because the current payload contains `web_search`, `max_tool_calls`, `tool_choice`, and `include`.

- [ ] **Step 2: Add a failing handler assertion that model sources cannot become links**

Replace the current general-question/web-source test with an adjacent AI question. Temporarily return a complete runtime-shaped object containing a legacy `sources` property through a cast, and assert that only deterministic links are returned:

```ts
const resultWithLegacySources = {
  ...successfulAnswerResult,
  output: {
    answer: 'AIは、人間の知的な作業をコンピュータで扱う技術の総称です。',
    pageIds: [],
    contentIds: [],
  },
  sources: [{ title: '偽の公式サイト', url: 'https://wrong.example/' }],
} as OpenAIResult;

expect(parsedBody(response)).toEqual({
  answer: 'AIは、人間の知的な作業をコンピュータで扱う技術の総称です。',
  links: [],
});
```

Run:

```bash
cd lambdas && npm test -- --run public/assistant/index.test.ts
```

Expected: FAIL because `withWebSources` currently appends the arbitrary URL.

- [ ] **Step 3: Implement the minimal no-web payload**

In `buildResponsesPayload`:

```ts
tools: [],
```

Remove `max_tool_calls`, `tool_choice`, `include`, and the web-search location block. Replace the current-information instruction with a no-live-data instruction:

```ts
'現在情報を確認する機能はありません。最新性が重要な質問では確認できないことを明示し、安定した一般知識だけを答えてください。',
```

Keep `answerにはURLやMarkdownリンクを書かないでください` and the server-side answer sanitizer.

- [ ] **Step 4: Delete the web-source data path**

Delete `safeWebSource`, `extractWebSources`, `withWebSources`, and `sourcesForQuestion`. Remove the `sources` property from `OpenAIResult`, the `OpenAIWebSource` interface, and `'source'` from `AssistantLinkPageId`. `parseResponsesEnvelope` returns only validated structured output and usage. The all-API handler returns:

```ts
outcome = 'ai_success';
return jsonResponse(200, { answer, links: siteLinks }, origin);
```

Remove now-unused imports such as `isPlainObject` and `AssistantLink` where applicable.

- [ ] **Step 5: Run focused Lambda tests and typecheck and verify GREEN**

Run:

```bash
cd lambdas && npm test -- --run public/assistant/openai.test.ts public/assistant/index.test.ts public/assistant/validation.test.ts
cd lambdas && npm run typecheck
```

Expected: focused tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit the no-web Lambda contract**

```bash
git add lambdas/public/assistant/openai.ts lambdas/public/assistant/openai.test.ts lambdas/public/assistant/index.ts lambdas/public/assistant/index.test.ts lambdas/public/assistant/types.ts
git commit -m "Remove assistant web search"
```

---

### Task 3: Close the frontend arbitrary-source URL path

**Files:**
- Modify: `frontend/src/features/assistant/assistantApi.ts:15-85,160-180`
- Test: `frontend/src/features/assistant/assistantApi.test.ts:238-350`
- Modify: `frontend/src/features/assistant/types.ts` only if a source-specific union exists there

**Interfaces:**
- Consumes: `AssistantResponse` links from the Lambda.
- Produces: frontend validation that accepts reviewed internal, Discord, Toyota Technological Institute, and YouTube links only; inline answer URLs remain stripped defensively.

- [ ] **Step 1: Replace the source-acceptance test and verify RED**

Delete the test that accepts a verified arbitrary HTTPS source. Add this behavior test:

```ts
it('rejects arbitrary HTTPS source links even when pageId is source', async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
    answer: '一般的な回答です。',
    links: [{ pageId: 'source', title: '参考資料', href: 'https://example.org/source' }],
  }));
  const client = createAssistantApi({
    baseUrl: 'https://api.example.com',
    fetchImpl: injectedFetch(fetchMock),
  });

  await expect(client.send(request)).rejects.toMatchObject({ kind: 'invalid-response' });
});
```

Keep or strengthen the existing inline URL test so this response:

```ts
{ answer: '案内します。 https://wrong.example/fake', links: [] }
```

is normalized to `{ answer: '案内します。', links: [] }`.

Run:

```bash
cd frontend && npm test -- --run src/features/assistant/assistantApi.test.ts --maxWorkers=1
```

Expected: the arbitrary-source test fails because the current client accepts any safe HTTPS URL with `pageId: 'source'`.

- [ ] **Step 2: Implement the strict frontend allowlist**

Delete `isSafeWebSourceHref`. Remove its use from `isExternalAssistantHref` and `assistantLinkSchema`. Restore the schema predicate to the reviewed link classes only:

```ts
const valid = INTERNAL_HREF_PATTERN.test(link.href)
  || DISCORD_HREF_PATTERN.test(link.href)
  || TOYOTA_TI_HREF_PATTERN.test(link.href)
  || YOUTUBE_CHANNEL_HREF_PATTERN.test(link.href);
```

Keep `removeInlineAssistantUrls` and its call after schema validation as defense in depth.

- [ ] **Step 3: Run Assistant frontend tests and build and verify GREEN**

Run:

```bash
cd frontend && npm test -- --run src/features/assistant/assistantApi.test.ts src/features/assistant/AssistantProvider.test.tsx src/features/assistant/AssistantWidget.test.tsx src/features/assistant/AssistantConversation.test.tsx --maxWorkers=1
cd frontend && npm run build
```

Expected: all Assistant tests pass, the arbitrary source is rejected, inline URLs are removed, and the production build exits 0.

- [ ] **Step 4: Commit the frontend URL boundary**

```bash
git add frontend/src/features/assistant/assistantApi.ts frontend/src/features/assistant/assistantApi.test.ts frontend/src/features/assistant/types.ts
git commit -m "Restrict assistant links to reviewed URLs"
```

---

### Task 4: Full verification and production rollout

**Files:**
- Verify: `lambdas/public/assistant/**`
- Verify: `frontend/src/features/assistant/**`
- Verify: `infra/lib/tti-ai-stack.ts`
- Preserve: `frontend/src/components/development/DevelopmentExperience.tsx`
- Preserve: `frontend/src/components/development/DevelopmentExperience.css`

**Interfaces:**
- Consumes: the completed no-web Lambda and strict frontend contracts.
- Produces: verified Lambda/CDK deployment and Amplify production build with a bounded smoke-test report.

- [ ] **Step 1: Run complete local verification**

Run each command and record its exit code and test count:

```bash
cd lambdas && npm test -- --run
cd lambdas && npm run typecheck
cd frontend && npm test -- --run src/features/assistant/assistantApi.test.ts src/features/assistant/AssistantProvider.test.tsx src/features/assistant/AssistantWidget.test.tsx src/features/assistant/AssistantConversation.test.tsx --maxWorkers=1
cd frontend && npm run build
cd infra && npm test -- --run
cd infra && npm run build
git diff --check
```

Expected: every command exits 0. Do not claim the entire frontend suite passes unless the entire suite was run successfully; report the focused Assistant suite separately.

- [ ] **Step 2: Review the exact deployment scope**

Run:

```bash
git status --short
git diff --stat HEAD~3..HEAD
cd infra && npm run diff -- --no-change-set
```

Expected CDK difference: Assistant Lambda code asset only. Stop if database replacement, resource deletion, model change, or unrelated frontend files appear.

- [ ] **Step 3: Push only reviewed Assistant commits**

Fetch and confirm no divergence, then push the current main branch. Do not stage or commit `frontend/src/components/development/*`.

```bash
git fetch origin main
git rev-list --left-right --count origin/main...HEAD
git push origin main
```

- [ ] **Step 4: Deploy the Lambda and monitor Amplify**

```bash
cd infra && npm run deploy -- --require-approval never
aws amplify list-jobs --app-id d3erwbgwpvm41u --branch-name main --max-results 3
```

Wait until the job for the pushed commit reaches `SUCCEED`. If it fails, inspect that exact job before retrying.

- [ ] **Step 5: Smoke-test production behavior**

Use fresh UUIDv4 session IDs and the production Origin. Send exactly these three questions:

1. `AIって何？` — expect `200`, a Luna-generated answer, and no arbitrary external source.
2. `今日の天気を教えて` — expect `200`, the fixed scope response, no links, and no paid dependency usage.
3. `豊田工業大学のサークルは？` — expect reviewed scope copy and only the configured university URL.

Inspect the corresponding Lambda logs. Expected outcomes are `ai_success`, `no_relevant_knowledge`, and `ai_success`; none may be `web_search_success`.

- [ ] **Step 6: Final deployment report**

Report the deployed commit, CloudFormation result, Amplify job ID, local verification counts, the three smoke-test results, and any unrelated working-tree changes left untouched.
