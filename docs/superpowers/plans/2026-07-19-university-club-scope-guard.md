# University Club Scope Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent university-wide club questions from being answered as though TTI Intelligence were the complete set of clubs at Toyota Technological Institute.

**Architecture:** Add one reviewed, deterministic fact for the boundary between this site and university-wide club information. Detect university/TTI aliases combined with club terms before the low-confidence model planner, while preserving explicit TTI Intelligence identity and comparison paths; render the official university link through the existing allowlisted link catalog.

**Tech Stack:** TypeScript, Vitest, AWS Lambda, AWS CDK, OpenAI fact-selector architecture

## Global Constraints

- Match semantic combinations, not the exact production sentence.
- Treat `豊田工業大学`, `豊田工大`, `豊工大`, `豊工`, generic `大学`, and bare `TTI` as university scope only when combined with `サークル`, `部活`, or `クラブ`.
- Explicit `TTI Intelligence` and `TTIインテリジェンス` questions must keep using `circle.identity`.
- Cross-university eligibility wording such as `他大学の学生でもサークルに参加できますか` must remain `membership.eligibility`, not university-wide club scope.
- University and club terms in separate subquestions must not be joined merely because they co-occur in one message, regardless of order.
- University-wide club questions must be high-confidence deterministic responses and must not call OpenAI.
- The response must be exactly `このサイトではTTI Intelligenceの活動を案内しています。豊田工業大学のサークル全般については、大学公式サイトをご確認ください。` and include only the existing official `toyota-ti` external link.
- Do not change the production model setting `gpt-5.4-nano-2026-03-17` or reasoning effort `medium`.
- Perform no more than one production smoke request after deployment.

---

### Task 1: Deterministic university club scope boundary

**Files:**
- Modify: `lambdas/public/assistant/engine.test.ts:80-140`
- Modify: `lambdas/public/assistant/facts.ts:20-45`
- Modify: `lambdas/public/assistant/engine.ts:264-315, 670-685`

**Interfaces:**
- Consumes: `planAssistantRequest(message, history)`, `answerFromPlan(plan)`, existing `toyota-ti` link allowlist
- Produces: canonical fact ID `university.clubs-scope` and a high-confidence deterministic planning branch

- [x] **Step 1: Write the failing semantic and counterexample tests**

Add parameterized tests asserting that these messages select only `university.clubs-scope`, have `high` confidence, and render the exact reviewed response plus the official university link:

```ts
[
  '豊田工業大学のサークルは？',
  '豊工大にはどんな部活がある？',
  '大学のサークル一覧を教えて',
  '豊田工業大学にはどんなサークルがありますか',
  '豊工のクラブについて教えて',
  'TTIの部活は？',
  '大学のサークルに参加できますか',
  '他大学の学生でもサークルに参加できますか', // counterexample: membership.eligibility
]
```

Also assert that `TTI Intelligenceはどんなサークル？`, `TTIインテリジェンスについて教えて`, and both English/Japanese `Intelligenceの方` correction phrasings still select only `circle.identity`; that cross-university eligibility selects only `membership.eligibility`; and that the existing TTI comparison behavior remains unchanged.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- public/assistant/engine.test.ts` from `lambdas/`

Expected: FAIL because `university.clubs-scope` is absent and the university-wide messages currently produce a low-confidence or incorrect plan.

- [x] **Step 3: Add the reviewed fact and minimal semantic detector**

Add this canonical fact to `ASSISTANT_FACTS`:

```ts
'university.clubs-scope': {
  description: '豊田工業大学のサークル・部活全般と、このサイトで案内するTTI Intelligenceの範囲',
  answer: 'このサイトではTTI Intelligenceの活動を案内しています。豊田工業大学のサークル全般については、大学公式サイトをご確認ください。',
  compactAnswer: 'このサイトはTTI Intelligenceを案内しています。大学のサークル全般は公式サイトをご確認ください。',
  pageIds: [],
  externalLinks: ['toyota-ti'],
},
```

Before punctuation-stripping normalization, split explicit compound topics at Japanese/ASCII sentence punctuation and `それから|加えて|および|ならびに`. In `detectIdentityFacts`, compute a university-wide club scope signal when the same normalized topic contains a university alias plus `/サークル|部活|クラブ/`, reusing one entity helper for both the full query and each topic. Exclude explicit TTI Intelligence names, correction phrases, and the explicit identity-comparison path. Select only `university.clubs-scope`. Immediately finalize that plan after identity detection so later TTI Intelligence membership, activity, and page detectors cannot append unrelated facts while both `TTIの正式名称と場所、それからサークルへの参加方法を教えて` and `TTIの正式名称と場所、サークルへの参加方法を教えて` remain compositional.

- [x] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- public/assistant/engine.test.ts` from `lambdas/`

Expected: PASS with all identity scope paraphrases and counterexamples green.

### Task 2: Handler regression, full verification, and production release

**Files:**
- Modify: `lambdas/public/assistant/index.test.ts:330-375`

**Interfaces:**
- Consumes: high-confidence `university.clubs-scope` plan from Task 1
- Produces: regression proof that the Lambda returns reviewed output without search, secret retrieval, or OpenAI planner calls

- [x] **Step 1: Write the handler regression test**

Add a handler test for `豊田工業大学のサークルは？` that expects HTTP 200, the exact reviewed answer, the existing `{ pageId: 'toyota-ti', title: '豊田工業大学', href: 'https://www.toyota-ti.ac.jp/' }` link, and `expectNoPlannerCalls(dependencies)` plus no content search.

- [x] **Step 2: Run the handler test and verify it passes through the deterministic path**

Run: `npm test -- public/assistant/index.test.ts` from `lambdas/`

Expected: PASS, with no OpenAI planner invocation.

- [x] **Step 3: Run complete local verification**

Run from `lambdas/`:

```bash
npm test
npm run typecheck
```

Run from `infra/`:

```bash
npm test
npm run build
npm run diff
```

Expected: all tests and type checks pass; CDK diff contains only the intended assistant Lambda code asset change and no model/reasoning configuration change.

- [x] **Step 4: Review and commit the verified change**

Review `git diff --check`, the complete diff, and `git status --short`, then commit only the plan and assistant scope-guard files with message `Guard university-wide club questions`.

- [x] **Step 5: Deploy and attempt at most one production smoke request**

Run `npm run deploy -- --require-approval never` from `infra/`. Confirm the Lambda is Active with LastUpdateStatus Successful, send exactly one request containing `豊田工業大学のサークルは？`, and assert the exact reviewed answer and official university link.

Execution note: deployment reached `UPDATE_COMPLETE` and the Lambda returned to Active/Successful. The single production request was rejected before quota at request validation because the manually constructed payload omitted required `currentPath`; it was not retried to honor the one-request cap. A successful end-to-end production assertion remains explicitly deferred to the next separately permitted release using a schema-valid payload.

- [x] **Step 6: Verify stable deployed state**

Run `npm run diff` from `infra/` and expect no differences. Re-run `npm test` and `npm run typecheck` from `lambdas/`, confirm `git status --short` is clean, and report the production smoke result and commit hash.
