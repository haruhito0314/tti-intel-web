# GPT-5.4 Nano Medium Production Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the production site assistant fact selector from GPT-5.6 Luna to the evaluated GPT-5.4 nano snapshot at medium reasoning effort.

**Architecture:** Keep the existing deterministic local routing, fact validation, answer rendering, and link generation. Change only the model-specific reasoning mapping, fact-planner output budget, CDK model environment value, tests, and deployment runbook; then deploy the CDK-managed Lambda and run the existing non-model production smoke once.

**Tech Stack:** TypeScript, Vitest, AWS CDK, AWS Lambda Node.js 22, OpenAI Responses API with strict Structured Outputs.

## Global Constraints

- Production model is exactly `gpt-5.4-nano-2026-03-17`.
- `reasoning.effort` is exactly `medium` for GPT-5.4 nano alias and snapshots.
- Fact-planner `max_output_tokens` is exactly `512`; OpenAI timeout remains 20 seconds.
- Legacy GPT-5 nano/mini behavior remains `minimal`; GPT-5.6 remains `low`; other models remain `none`.
- Model output remains limited to validated fact IDs and `unsupported`; it never becomes user-facing prose or URLs.
- No secret, question body, history, or session identifier is added to logs or source.
- The approval service rejected worktree creation because its usage limit was exhausted. Work in the current checkout without retrying or circumventing that restriction.
- Do not commit unless Git write approval becomes available; leave an explicit status report instead.

---

### Task 1: Model-specific reasoning and fact-planner payload

**Files:**
- Modify: `lambdas/public/assistant/openai.test.ts`
- Modify: `lambdas/public/assistant/openaiTransport.ts`
- Modify: `lambdas/public/assistant/factPlanner.ts`

**Interfaces:**
- Consumes: `reasoningEffortForModel(model: string)` and `buildFactPlannerPayload(request, model?)`.
- Produces: GPT-5.4 nano alias/snapshot mapping to `medium` and a default fact-planner payload using the pinned snapshot with a 512-token budget.

- [ ] **Step 1: Write the failing reasoning tests**

Add assertions to the existing `reasoningEffortForModel` test:

```ts
expect(reasoningEffortForModel('gpt-5.4-nano')).toBe('medium');
expect(reasoningEffortForModel('gpt-5.4-nano-2026-03-17')).toBe('medium');
expect(reasoningEffortForModel('gpt-5-nano')).toBe('minimal');
expect(reasoningEffortForModel('gpt-5-mini')).toBe('minimal');
expect(reasoningEffortForModel('gpt-5.6-luna')).toBe('low');
expect(reasoningEffortForModel('gpt-5.5')).toBe('none');
```

- [ ] **Step 2: Write the failing default payload test**

Call `buildFactPlannerPayload(request)` without a model and assert:

```ts
expect(payload).toMatchObject({
  model: 'gpt-5.4-nano-2026-03-17',
  reasoning: { effort: 'medium' },
  max_output_tokens: 512,
  store: false,
  stream: false,
  tools: [],
});
```

Retain the existing strict schema, history filtering, static-fact-only, and secret-exclusion assertions.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
npm --prefix lambdas test -- public/assistant/openai.test.ts
```

Expected: FAIL because GPT-5.4 nano currently maps to `minimal`, the default is Luna, and the planner budget is 180.

- [ ] **Step 4: Implement the minimal model mapping**

Change the helper to test GPT-5.4 nano before the generic nano/mini branch:

```ts
export function reasoningEffortForModel(
  model: string,
): 'none' | 'minimal' | 'low' | 'medium' {
  if (/^gpt-5\.4-nano(?:-|$)/i.test(model)) return 'medium';
  if (/gpt-5\.6/i.test(model)) return 'low';
  return /nano|mini/i.test(model) ? 'minimal' : 'none';
}
```

- [ ] **Step 5: Implement the minimal fact-planner defaults**

Use:

```ts
const DEFAULT_MODEL = 'gpt-5.4-nano-2026-03-17';
```

and:

```ts
max_output_tokens: 512,
```

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```bash
npm --prefix lambdas test -- public/assistant/openai.test.ts
```

Expected: all tests in `openai.test.ts` pass with zero failures.

### Task 2: CDK configuration and deployment runbook

**Files:**
- Modify: `infra/test/tti-ai-stack.test.ts`
- Modify: `infra/lib/tti-ai-stack.ts`
- Modify: `docs/deployment/site-ai-guide.md`

**Interfaces:**
- Consumes: CDK `AssistantLambda` environment configuration.
- Produces: a synthesized Lambda environment whose `ASSISTANT_MODEL` is the pinned GPT-5.4 nano snapshot, plus matching operator documentation.

- [ ] **Step 1: Write the failing CDK test**

Change the expected Lambda environment value to:

```ts
ASSISTANT_MODEL: 'gpt-5.4-nano-2026-03-17',
```

- [ ] **Step 2: Run the focused CDK test and verify RED**

Run:

```bash
npm --prefix infra test -- test/tti-ai-stack.test.ts
```

Expected: FAIL because the stack still synthesizes `gpt-5.6-luna`.

- [ ] **Step 3: Implement the CDK environment change**

Set:

```ts
ASSISTANT_MODEL: 'gpt-5.4-nano-2026-03-17',
```

Do not change timeout, IAM, quota, CORS, DynamoDB, API Gateway, or secret settings.

- [ ] **Step 4: Update the runbook**

Replace the production model page, exact model ID, reasoning effort, and fact-planner output budget with GPT-5.4 nano snapshot, `medium`, and 512. Preserve the approval, privacy, smoke, monitoring, and rollback constraints.

- [ ] **Step 5: Run the focused CDK test and verify GREEN**

Run:

```bash
npm --prefix infra test -- test/tti-ai-stack.test.ts
```

Expected: all stack tests pass with zero failures.

### Task 3: Local verification and synthesized artifact review

**Files:**
- Verify: `lambdas/public/assistant/**`
- Verify: `infra/cdk.out/TtiAiStack.template.json`
- Verify: synthesized Assistant Lambda asset under `infra/cdk.out/asset.*`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: fresh evidence that source, tests, type system, CDK template, and bundled production path agree.

- [ ] **Step 1: Run all Lambda checks**

```bash
npm --prefix lambdas run typecheck
npm --prefix lambdas test
```

Expected: both commands exit 0 with zero failed tests.

- [ ] **Step 2: Run all infrastructure checks**

```bash
npm --prefix infra test
npm --prefix infra run build
npm --prefix infra run synth
```

Expected: all commands exit 0 and synth targets `ap-northeast-1`.

- [ ] **Step 3: Inspect synthesized configuration and bundle**

Verify the template contains `gpt-5.4-nano-2026-03-17`. Inspect the synthesized Assistant asset for `gpt-5.4-nano-2026-03-17`, `medium`, and a 512-token fact-planner budget. Confirm the active Assistant asset does not contain `gpt-5.6-luna`.

- [ ] **Step 4: Inspect the complete source diff**

Run:

```bash
git diff --check
git status --short
git diff -- lambdas/public/assistant/openaiTransport.ts lambdas/public/assistant/factPlanner.ts lambdas/public/assistant/openai.test.ts infra/lib/tti-ai-stack.ts infra/test/tti-ai-stack.test.ts docs/deployment/site-ai-guide.md docs/superpowers/specs/2026-07-19-gpt-5-4-nano-medium-design.md docs/superpowers/plans/2026-07-19-gpt-5-4-nano-medium.md
```

Expected: no whitespace errors and only the planned files are changed.

### Task 4: AWS diff, deployment, and production verification

**Files:**
- Deploy: synthesized CDK assembly from Task 3.
- Verify: AWS Lambda `tti-ai-site-assistant` in `ap-northeast-1`.

**Interfaces:**
- Consumes: verified CDK assembly and the user's explicit instruction to proceed with the production switch.
- Produces: an active production Lambda using GPT-5.4 nano medium.

- [ ] **Step 1: Verify AWS identity and region**

```bash
aws sts get-caller-identity
aws configure get region
```

Expected: the previously approved account and `ap-northeast-1`. Stop on mismatch.

- [ ] **Step 2: Review CDK diff**

```bash
npm --prefix infra run diff
```

Expected: Assistant Lambda code/environment updates only, with no DynamoDB replacement, secret mutation, IAM broadening, API Gateway change, or unrelated resource mutation.

- [ ] **Step 3: Deploy the reviewed assembly**

```bash
npm --prefix infra run deploy
```

Expected: `TtiAiStack` deploy succeeds and the Assistant Lambda update reaches `Successful`.

- [ ] **Step 4: Verify Lambda configuration**

Read the Lambda configuration in `ap-northeast-1` and assert `ASSISTANT_MODEL=gpt-5.4-nano-2026-03-17`, state `Active`, and last update status `Successful` without exposing other environment values.

- [ ] **Step 5: Run the single approved production smoke**

Send exactly `今週の数学はどこ？` once from an allowed production Origin. Expect HTTP 200, an answer of at most 200 characters, and canonical link `/weekly-math`. Do not retry automatically if it fails.

- [ ] **Step 6: Final verification report**

Report test counts, synthesized model/effort/budget, CDK diff scope, Lambda state, smoke result, residual critical-false-support risk, worktree/commit approval limitation, and all remaining local changes.
