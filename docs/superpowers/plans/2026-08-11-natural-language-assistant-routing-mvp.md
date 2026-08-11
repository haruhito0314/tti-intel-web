# Natural-Language Assistant Routing MVP Plan

> **Execution:** Use `superpowers:subagent-driven-development` with strict TDD. This is the one-hour core implementation; production evaluation/PDF/advanced telemetry are explicitly deferred.

**Goal:** Fix the live failure where `サークルについて教えて` receives the generic scope response, make ordinary Japanese circle/site questions route naturally, and keep replies LINE-like and short.

**Architecture:** Keep the current single-generation-call design. A broadened deterministic router sends clear circle/site questions to the existing grounded Luna generation path, while university, conversation, and obvious general questions remain local zero-call responses. Do not add a second classifier call in this MVP.

**Global constraints:**

- Production generation model remains exactly `gpt-5.6-luna`.
- Circle/site answers are generated from selected structured knowledge on every request; do not add canned circle/site answer text.
- Web search remains off; OpenAI `tools` stays `[]` and `store` stays `false`.
- At most one Luna call per request in this MVP.
- Normal answers are one or two short sentences; hard limit 200 Unicode code points and three clauses.
- University answers contain no generated details and link only to `https://www.toyota-ti.ac.jp/`.
- Preserve request validation, CORS, quotas, safe-link filtering, and privacy-safe logs.

## Task 1: Implement and verify the routing/length fix

**Files:**

- Modify: `lambdas/public/assistant/scope.ts`
- Modify: `lambdas/public/assistant/scope.test.ts`
- Modify: `lambdas/public/assistant/openai.ts`
- Modify: `lambdas/public/assistant/openai.test.ts`
- Modify: `lambdas/public/assistant/validation.ts`
- Modify: `lambdas/public/assistant/validation.test.ts`
- Modify if integration assertions require it: `lambdas/public/assistant/index.test.ts`
- Modify: `frontend/src/pages/AiAssistantProduct.tsx`
- Modify: `frontend/src/pages/AiAssistantProduct.test.tsx`

### Step 1: RED — add exact behavior regressions first

Add focused tests and run them before production edits. They must fail for the current behavior, not from import/setup errors.

Routing expectations on `/app/ai-assistant`:

| Question | Scope |
| --- | --- |
| `サークルについて教えて` | `circle` |
| `サークルって何？` | `circle` |
| `活動は？` | `circle` |
| `何してるの？` | `circle` |
| `参加したい` | `circle` |
| `見学できますか？` | `circle` |
| `会費は？` | `circle` |
| `Discordある？` | `circle` |
| `このサイトについて教えて` | `site` |
| `サイトマップは？` | `site` |
| `Codexとは？` | `site` |
| `豊田工業大学のサークル一覧は？` | `university` |
| `豊田工業大学の公式サイトは？` | `university` |
| `名古屋大学のサークルは？` | `out_of_scope` |
| `東京の天気は？` | `out_of_scope` |
| `病気の治し方は？` | `out_of_scope` |
| `おすすめの株は？` | `out_of_scope` |

Also prove the immediately previous explicit circle/site/university user turn can resolve `それは？`-style follow-ups, while an explicit current university/general question wins over history.

Length tests must accept exactly 200 Unicode code points, reject 201, accept at most three nonempty clauses, and reject four clauses separated by Japanese punctuation or newlines. Payload tests must require `text.verbosity: 'low'`, `max_output_tokens <= 450`, `tools: []`, `store: false`, and instructions that say one or two sentences, usually about 120 characters, hard maximum 200.

Frontend tests must require suggestions for `サークルについて教えて`, `活動は？`, `参加方法は？`, and `このサイトでできることは？`.

Run and record the expected RED commands:

```bash
cd lambdas
npm test -- public/assistant/scope.test.ts public/assistant/openai.test.ts public/assistant/validation.test.ts public/assistant/index.test.ts
cd ../frontend
npm test -- src/pages/AiAssistantProduct.test.tsx
```

### Step 2: GREEN — minimal production implementation

Implement ordered routing, not a three-word alias list:

1. Strip greeting/acknowledgement prefixes without discarding the substantive question.
2. Explicit TTI Intelligence aliases resolve to circle unless the question is specifically about university officiality.
3. Explicit Toyota Technological Institute institutional questions resolve to university before generic `サークル` matching.
4. Another named university/organization never resolves to this circle.
5. Bare circle nouns and ordinary circle actions (`活動`, participation/joining/visit, members/fees/contact/community/works) resolve to circle.
6. Explicit site/page/product/development/navigation intents resolve to site.
7. Conversation and obvious general/current/medical/financial questions stay local.
8. Follow-up history uses only the immediately previous user turn.
9. Do not default every unknown string to circle; only high-confidence circle language does so.

Keep the existing grounded generation path for circle/site. Tighten model instructions and output validation to the length contract above. Count Unicode code points with `[...answer].length` and clauses by splitting on `/[。．.!！？?\n]+/gu`, trimming, and counting nonempty segments. Reject oversized output rather than slicing it.

Update only the four assistant suggestions. Do not change API request/response JSON or frontend timeout.

### Step 3: Verify and commit

```bash
cd lambdas
npm test
npm run typecheck
cd ../frontend
npm test -- src/pages/AiAssistantProduct.test.tsx src/features/assistant/assistantApi.test.ts src/features/assistant/AssistantProvider.test.tsx
npm run build
cd ..
git diff --check
git status --short
git add lambdas/public/assistant/scope.ts lambdas/public/assistant/scope.test.ts lambdas/public/assistant/openai.ts lambdas/public/assistant/openai.test.ts lambdas/public/assistant/validation.ts lambdas/public/assistant/validation.test.ts lambdas/public/assistant/index.test.ts frontend/src/pages/AiAssistantProduct.tsx frontend/src/pages/AiAssistantProduct.test.tsx docs/superpowers/plans/2026-08-11-natural-language-assistant-routing-mvp.md
git commit -m "Improve natural assistant routing"
```

Expected: all Lambda tests/typecheck pass; focused frontend tests and production build pass; the original regression routes to the generative circle path; no Web or second Luna call is introduced.
