# Circle and Site Assistant Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TTI IntelligenceとこのWebサイトに関係する質問だけをLunaで生成し、大学全般・一般質問・挨拶にはAPIを呼ばず短いローカル応答を返す。

**Architecture:** Lambdaの入力検証直後に、決定的な5分類ルーターを置く。`circle` と `site` だけが既存の構造化資料選択、利用枠、Secrets Manager、Luna 1回の経路へ進み、`university`、`conversation`、`out_of_scope` は依存サービスを一切呼ばずに固定応答を返す。大学詳細カタログと一般知識回答指示は削除し、フロントエンドと評価基盤も新しい範囲へ同期する。

**Tech Stack:** TypeScript, AWS Lambda/API Gateway/CDK, OpenAI Responses API (`gpt-5.6-luna`), React, Vitest, Node.js eval scripts, Python/ReportLab PDF generator

## Global Constraints

- 回答対象はTTI Intelligenceと、このWebサイトの内容・使い方に限定する。
- Codex、Vercel、AWS、Plugin、CLI、MCPはサイト掲載内容として回答対象に含める。
- 大学全般は `豊田工業大学については、公式サイトをご確認ください。` と `https://www.toyota-ti.ac.jp/` だけを返す。
- `university`、`conversation`、`out_of_scope` では利用枠、動的検索、Secrets Manager、Lunaを呼ばない。
- `circle` と `site` ではLunaを最大1回だけ呼び、`tools: []` とWeb検索0回を維持する。
- Luna回答は原則200文字以内、最大280文字とする。
- モデルが書いたURLは採用せず、サーバー側の完全一致許可リストだけを返す。
- 大学詳細資料をLunaへ渡さない。

---

### Task 1: 決定的な質問スコープ分類器

**Files:**
- Create: `lambdas/public/assistant/scope.ts`
- Create: `lambdas/public/assistant/scope.test.ts`
- Read: `lambdas/public/assistant/smallTalk.ts`
- Read: `lambdas/public/assistant/runtimeCatalog.ts`

**Interfaces:**
- Consumes: `message: string`, `currentPath: string`, `history: readonly HistoryMessage[]`
- Produces: `AssistantScope`, `AssistantScopeDecision`, `classifyAssistantScope(...)`, `isGenerativeScope(...)`, `shouldSearchDynamicContent(...)`

- [ ] **Step 1: 分類マトリクスの失敗テストを書く**

```ts
import { describe, expect, it } from 'vitest';
import {
  classifyAssistantScope,
  isGenerativeScope,
  shouldSearchDynamicContent,
} from './scope.js';

describe('classifyAssistantScope', () => {
  it.each([
    ['このサークルについて教えて', 'circle'],
    ['AIサークルに参加したい', 'circle'],
    ['TTI Intelligenceの活動は？', 'circle'],
    ['このサイトは何？', 'site'],
    ['掲示板の使い方を教えて', 'site'],
    ['Codexとは？', 'site'],
    ['Vercel、AWS、Plugin、CLI、MCPを説明して', 'site'],
    ['豊田工業大学について教えて', 'university'],
    ['豊工大の学費は？', 'university'],
    ['こんにちは', 'conversation'],
    ['ありがとう', 'conversation'],
    ['東京の天気は？', 'out_of_scope'],
    ['プログラミングを教えて', 'out_of_scope'],
  ] as const)('%s -> %s', (message, scope) => {
    expect(classifyAssistantScope(message, '/', []).scope).toBe(scope);
  });

  it('keeps a referential follow-up in the prior circle scope', () => {
    expect(classifyAssistantScope('それに参加したい', '/', [
      { role: 'user', content: 'TTI Intelligenceについて教えて' },
    ])).toEqual({ scope: 'circle', contextualFollowUp: true });
  });

  it('routes a university follow-up to the local university response', () => {
    expect(classifyAssistantScope('学費は？', '/', [
      { role: 'user', content: '豊田工業大学について教えて' },
    ])).toEqual({ scope: 'university', contextualFollowUp: true });
  });

  it('uses the current page only for a deictic site question', () => {
    expect(classifyAssistantScope('このページは何？', '/development', []).scope).toBe('site');
    expect(classifyAssistantScope('カレーの作り方', '/development', []).scope)
      .toBe('out_of_scope');
  });

  it('marks only circle and site as generative', () => {
    expect(['circle', 'site'].filter(isGenerativeScope)).toEqual(['circle', 'site']);
  });

  it('searches dynamic content only for an in-scope changing-content query', () => {
    expect(shouldSearchDynamicContent('site', '最新のお知らせは？', '/')).toBe(true);
    expect(shouldSearchDynamicContent('circle', '今週の数学は？', '/')).toBe(true);
    expect(shouldSearchDynamicContent('site', 'Codexとは？', '/development')).toBe(false);
    expect(shouldSearchDynamicContent('out_of_scope', '今日のニュースは？', '/')).toBe(false);
  });
});
```

- [ ] **Step 2: テストを実行してREDを確認する**

Run: `cd lambdas && npm test -- --run public/assistant/scope.test.ts`

Expected: FAIL because `scope.ts` does not exist.

- [ ] **Step 3: 最小の分類器を実装する**

```ts
export type AssistantScope =
  | 'circle' | 'site' | 'university' | 'conversation' | 'out_of_scope';

export interface AssistantScopeDecision {
  scope: AssistantScope;
  contextualFollowUp: boolean;
}

const CIRCLE_PATTERN = /(?:このサークル|AIサークル|TTI\s*Intelligence|TTIインテリジェンス|入部|サークルに参加)/iu;
const SITE_PATTERN = /(?:このサイト|このページ|掲示板|お知らせ|今週の数学|カラーソート|Color\s*Sort|卓球組み合わせ|AI\s*Assistant|Codex|Vercel|AWS|Plugin|CLI|MCP)/iu;
const TOYOTA_UNIVERSITY_PATTERN = /(?:豊田工業大学|豊田工大|豊工大)/u;
const UNIVERSITY_OFFICIALITY_PATTERN = /(?:大学公式|大学公認|認定団体|大学が運営)/u;
const CONVERSATION_PATTERN = /^(?:こんにちは|こんばんは|おはよう|ありがとう(?:ございます)?|了解|さようなら)[!！?？。．\s]*$/u;
const REFERENTIAL_PATTERN = /(?:それ|その|そこ|これ|ここ|参加したい|詳しく|場所|学費)/u;

export function classifyAssistantScope(
  message: string,
  currentPath: string,
  history: readonly HistoryMessage[],
): AssistantScopeDecision {
  const normalized = message.normalize('NFKC').trim();
  const direct = directScope(normalized, currentPath);
  if (direct !== 'out_of_scope') return { scope: direct, contextualFollowUp: false };

  if (REFERENTIAL_PATTERN.test(normalized) && history.length > 0) {
    const prior = directScope(history.at(-1)?.content ?? '', '/');
    if (prior === 'circle' || prior === 'site' || prior === 'university') {
      return { scope: prior, contextualFollowUp: true };
    }
  }
  return { scope: 'out_of_scope', contextualFollowUp: false };
}

export function isGenerativeScope(scope: AssistantScope): scope is 'circle' | 'site' {
  return scope === 'circle' || scope === 'site';
}
```

Implement `directScope` with priority `circle` → `site` → `university` → `conversation` → `out_of_scope`, except that the narrower `UNIVERSITY_OFFICIALITY_PATTERN` explicitly overrides a simultaneous circle match. Do not classify generic `入試`, `学費`, `学部`, or another university name as `university`; those terms inherit `university` only from a prior explicit Toyoda Institute message. Restrict current-path inference to deictic phrases such as `このページ` and `ここ`; do not let the open page turn unrelated text into `site`. Implement `shouldSearchDynamicContent` with the exact aliases `お知らせ`, `ニュース`, `掲示板`, `今週の数学`, `/news`, `/board`, and `/weekly-math`, plus an early false return for non-generative scopes.

- [ ] **Step 4: 分類テストをGREENにする**

Run: `cd lambdas && npm test -- --run public/assistant/scope.test.ts`

Expected: PASS for the entire classification matrix.

- [ ] **Step 5: 分類器をコミットする**

```bash
git add lambdas/public/assistant/scope.ts lambdas/public/assistant/scope.test.ts
git commit -m "Add assistant scope classifier"
```

---

### Task 2: APIを呼ばないローカル応答と大学公式リンク

**Files:**
- Create: `lambdas/public/assistant/localResponses.ts`
- Create: `lambdas/public/assistant/localResponses.test.ts`
- Modify: `lambdas/public/assistant/types.ts`
- Modify: `lambdas/public/assistant/runtimeCatalog.ts`
- Modify: `frontend/src/features/assistant/assistantApi.ts`
- Modify: `frontend/src/features/assistant/assistantApi.test.ts`

**Interfaces:**
- Consumes: non-generative `AssistantScope`
- Produces: `localResponseFor(scope, message): AssistantResponse | null`
- Produces: exact external link `{ pageId: 'toyota-ti', title: '豊田工業大学 公式サイト', href: TOYOTA_TI_URL }`

- [ ] **Step 1: 固定応答と完全一致URLの失敗テストを書く**

```ts
describe('localResponseFor', () => {
  it('returns only the short official-site redirect for university questions', () => {
    expect(localResponseFor('university', '豊田工業大学について教えて')).toEqual({
      answer: '豊田工業大学については、公式サイトをご確認ください。',
      links: [{
        pageId: 'toyota-ti',
        title: '豊田工業大学 公式サイト',
        href: 'https://www.toyota-ti.ac.jp/',
      }],
    });
  });

  it('returns short link-free conversation and out-of-scope responses', () => {
    expect(localResponseFor('conversation', 'こんにちは')?.answer).toContain('こんにちは');
    expect(localResponseFor('conversation', 'ありがとう')?.answer).toContain('どういたしまして');
    expect(localResponseFor('out_of_scope', '東京の天気は？')?.links).toEqual([]);
    expect(localResponseFor('circle', 'このサークルは？')).toBeNull();
    expect(localResponseFor('site', 'Codexとは？')).toBeNull();
  });
});
```

Move the frontend case `unreviewed university root` from the rejection matrix to the accepted exact-source matrix. Keep query, fragment, lookalike domain, and other university paths rejected.

- [ ] **Step 2: テストを実行してREDを確認する**

Run: `cd lambdas && npm test -- --run public/assistant/localResponses.test.ts`

Run: `cd frontend && npm test -- --run src/features/assistant/assistantApi.test.ts`

Expected: local response module is missing and the university root is rejected.

- [ ] **Step 3: ローカル応答とURL許可を実装する**

```ts
const LOCAL_RESPONSES = {
  university: {
    answer: '豊田工業大学については、公式サイトをご確認ください。',
    links: [{ pageId: 'toyota-ti', title: '豊田工業大学 公式サイト', href: TOYOTA_TI_URL }],
  },
  out_of_scope: {
    answer: 'TTI Intelligenceと、このサイトの内容について案内できます。',
    links: [],
  },
} as const;
```

Implement a message-aware conversation branch: greeting → `こんにちは！TTI Intelligenceや、このサイトについて案内できます。`, thanks → `どういたしまして！`, farewell → `またいつでも聞いてください。`. Add `TOYOTA_TI_URL` to `EXTERNAL_ASSISTANT_HREFS` as an exact string. Do not allow the university domain by prefix or regular expression. Keep `toyota-ti` in `AssistantLinkPageId`.

- [ ] **Step 4: ローカル応答とフロントURLテストをGREENにする**

Run: `cd lambdas && npm test -- --run public/assistant/localResponses.test.ts`

Run: `cd frontend && npm test -- --run src/features/assistant/assistantApi.test.ts`

Expected: PASS; only the exact root URL is newly accepted.

- [ ] **Step 5: ローカル応答をコミットする**

```bash
git add lambdas/public/assistant/localResponses.ts lambdas/public/assistant/localResponses.test.ts lambdas/public/assistant/types.ts lambdas/public/assistant/runtimeCatalog.ts frontend/src/features/assistant/assistantApi.ts frontend/src/features/assistant/assistantApi.test.ts
git commit -m "Add zero-cost assistant responses"
```

---

### Task 3: 大学詳細資料と一般知識回答経路の削除

**Files:**
- Delete: `lambdas/public/assistant/knowledge/university-knowledge.json`
- Modify: `lambdas/public/assistant/structuredKnowledge.ts`
- Modify: `lambdas/public/assistant/structuredKnowledge.test.ts`
- Modify: `lambdas/public/assistant/types.ts`
- Modify: `lambdas/public/assistant/runtimeCatalog.ts`
- Modify: `lambdas/public/assistant/openai.ts`
- Modify: `lambdas/public/assistant/openai.test.ts`
- Modify: `lambdas/public/assistant/validation.test.ts`
- Modify: `frontend/src/features/assistant/assistantApi.ts`
- Modify: `frontend/src/features/assistant/assistantApi.test.ts`

**Interfaces:**
- Changes `selectAssistantRequestContext(message, currentPath, history, scope, limit?)`
- Restricts `scope` to `'circle' | 'site'`
- Keeps `STRUCTURED_KNOWLEDGE` as the reviewed site/circle catalog only

- [ ] **Step 1: 新しい知識境界の失敗テストを書く**

```ts
it('contains no university domain or detailed university source IDs', () => {
  expect(JSON.stringify(STRUCTURED_KNOWLEDGE)).not.toContain('"domain":"university"');
  expect(JSON.stringify(STRUCTURED_KNOWLEDGE)).not.toMatch(/tti-(?:overview|features|academics|program|student-activity|clubs|access)/);
});

it('selects only circle facts for the circle scope', () => {
  const result = selectAssistantRequestContext(
    'このサークルについて教えて', '/', [], 'circle',
  );
  expect(result.knowledge[0]?.item.id).toBe('circle-identity');
  expect(result.knowledge.every(({ item }) => item.domain === 'circle')).toBe(true);
});

it('keeps every listed development tool available in site scope', () => {
  for (const tool of ['Codex', 'Vercel', 'AWS', 'Plugin', 'CLI', 'MCP']) {
    expect(selectAssistantRequestContext(tool, '/', [], 'site').knowledge.length)
      .toBeGreaterThan(0);
  }
});
```

Update the OpenAI instruction test to require `TTI Intelligenceとこのサイト`, `入力JSONの資料だけ`, and to reject `一般的な質問` / `安定した一般知識` language.

- [ ] **Step 2: テストを実行してREDを確認する**

Run: `cd lambdas && npm test -- --run public/assistant/structuredKnowledge.test.ts public/assistant/openai.test.ts`

Expected: university knowledge and general-knowledge instructions are still present.

- [ ] **Step 3: 大学カタログと大学用ソースを削除する**

Remove the university JSON import, `UNIVERSITY_KNOWLEDGE`, the `university` knowledge domain, the seven detailed `tti-*` source IDs, and their runtime catalog entries. Remove the same seven detailed university URLs from the frontend allowlist and move them to the frontend rejection matrix. Retain only `discord` and `youtube` as model-selectable official sources; the university root is emitted only by `localResponseFor` and remains the only accepted university URL.

Add a scope filter to knowledge selection:

```ts
type GenerativeAssistantScope = 'circle' | 'site';

function allowedInScope(item: KnowledgeItem, scope: GenerativeAssistantScope): boolean {
  if (scope === 'site') return true;
  return ['circle', 'game', 'math'].includes(item.domain);
}
```

For `circle`, include `app` entries only when the message explicitly asks about the circle's works/apps; encode that as a tested predicate instead of widening every broad circle query. Pass the scope into both current-message and history-assisted knowledge selection.

- [ ] **Step 4: Lunaのシステム指示を対象内専用にする**

Replace the general-knowledge permission with these rules:

```ts
'TTI IntelligenceとこのWebサイトに関する質問だけに答えてください。',
'回答は入力JSONのknowledgeEntriesとcontentEntriesだけを根拠にし、資料にない固有情報や一般知識を補わないでください。',
'質問に必要な根拠がない場合は、確認できないことを短く伝えてください。',
```

Keep the LINE-style 200/280-character instruction, JSON schema, `max_output_tokens: 450`, and `tools: []` unchanged.

- [ ] **Step 5: 知識とOpenAI境界テストをGREENにする**

Run: `cd lambdas && npm test -- --run public/assistant/structuredKnowledge.test.ts public/assistant/openai.test.ts public/assistant/validation.test.ts`

Run: `cd frontend && npm test -- --run src/features/assistant/assistantApi.test.ts`

Expected: PASS with no university catalog references.

- [ ] **Step 6: 不要資料の削除をコミットする**

```bash
git add -A lambdas/public/assistant frontend/src/features/assistant/assistantApi.ts frontend/src/features/assistant/assistantApi.test.ts
git commit -m "Restrict Luna knowledge to circle and site"
```

---

### Task 4: Lambdaハンドラーをゼロコール分岐へ変更

**Files:**
- Modify: `lambdas/public/assistant/index.ts`
- Modify: `lambdas/public/assistant/index.test.ts`
- Modify: `lambdas/public/assistant/intent.ts`
- Modify: `lambdas/public/assistant/intent.test.ts`

**Interfaces:**
- Uses `classifyAssistantScope`, `localResponseFor`, `isGenerativeScope`, `shouldSearchDynamicContent`
- Adds privacy-safe log field `assistantScope: AssistantScope | ''`
- Adds outcomes `local_university`, `local_conversation`, `out_of_scope`

- [ ] **Step 1: ハンドラー依存呼び出し回数の失敗テストを書く**

```ts
it.each([
  ['豊田工業大学について教えて', 'local_university', 'https://www.toyota-ti.ac.jp/'],
  ['東京の天気は？', 'out_of_scope', undefined],
  ['こんにちは', 'local_conversation', undefined],
] as const)('answers %s without paid or data dependencies', async (
  message, expectedOutcome, expectedHref,
) => {
  const dependencies = createDependencies();
  const response = await invoke(dependencies, eventForRequest({ message, history: [] }));

  expect(response.statusCode).toBe(200);
  expect(dependencies.reserveQuota).not.toHaveBeenCalled();
  expect(dependencies.searchContent).not.toHaveBeenCalled();
  expect(dependencies.getApiKey).not.toHaveBeenCalled();
  expect(dependencies.requestOpenAI).not.toHaveBeenCalled();
  expect(JSON.stringify(parsedBody(response))).toContain(expectedHref ?? '');
  expect(dependencies.log).toHaveBeenCalledWith(expect.objectContaining({
    outcome: expectedOutcome,
    lunaCallCount: 0,
  }));
});

it.each([
  ['このサークルについて教えて', 'circle'],
  ['Codexとは？', 'site'],
] as const)('calls Luna once for %s', async (message, assistantScope) => {
  const dependencies = createDependencies();
  await invoke(dependencies, eventForRequest({ message, history: [] }));
  expect(dependencies.reserveQuota).toHaveBeenCalledTimes(1);
  expect(dependencies.getApiKey).toHaveBeenCalledTimes(1);
  expect(dependencies.requestOpenAI).toHaveBeenCalledTimes(1);
  expect(dependencies.log).toHaveBeenCalledWith(expect.objectContaining({
    assistantScope,
    lunaCallCount: 1,
  }));
});
```

Add tests proving `Codexとは？` skips dynamic content search, while `最新のお知らせは？` performs it once before Luna. Replace old tests that expected weather, travel, recipes, greetings, and university questions to call Luna.

- [ ] **Step 2: ハンドラーテストを実行してREDを確認する**

Run: `cd lambdas && npm test -- --run public/assistant/index.test.ts`

Expected: non-generative questions still reserve quota and call Luna.

- [ ] **Step 3: 入力検証直後にスコープ分岐を実装する**

Insert this flow after request parsing and request-ID validation:

```ts
const scopeDecision = classifyAssistantScope(
  request.message,
  request.currentPath,
  request.history,
);
assistantScope = scopeDecision.scope;

const localResponse = localResponseFor(scopeDecision.scope, request.message);
if (localResponse !== null) {
  outcome = scopeDecision.scope === 'university'
    ? 'local_university'
    : scopeDecision.scope === 'conversation'
      ? 'local_conversation'
      : 'out_of_scope';
  statusCode = 200;
  return jsonResponse(statusCode, localResponse, origin, evaluationRequestId);
}
```

Only after `isGenerativeScope(scopeDecision.scope)` succeeds should the handler reserve quota. Call dynamic search only when `shouldSearchDynamicContent(...)` returns true; otherwise use `{ content: [], dynamicContentAvailable: true }`. Pass the generative scope and `scopeDecision.contextualFollowUp` to structured knowledge/history selection.

- [ ] **Step 4: ログとリンク経路を同期する**

Add `assistantScope` to the existing safe log object. Ensure local responses bypass `createFinalLinks`, so Luna/model IDs cannot alter the university root link. Keep token counters and both call counters at zero for local responses.

- [ ] **Step 5: ハンドラーと関連テストをGREENにする**

Run: `cd lambdas && npm test -- --run public/assistant/index.test.ts public/assistant/intent.test.ts public/assistant/scope.test.ts public/assistant/localResponses.test.ts`

Expected: PASS with exact 0/1 dependency call assertions.

- [ ] **Step 6: ハンドラー分岐をコミットする**

```bash
git add lambdas/public/assistant/index.ts lambdas/public/assistant/index.test.ts lambdas/public/assistant/intent.ts lambdas/public/assistant/intent.test.ts
git commit -m "Route assistant requests before Luna"
```

---

### Task 5: フロントエンドの説明を新しい回答範囲へ同期

**Files:**
- Modify: `frontend/src/features/assistant/AssistantConversation.tsx`
- Modify: `frontend/src/features/assistant/AssistantConversation.test.tsx`
- Modify: `frontend/src/pages/AiAssistantProduct.tsx`
- Modify: `frontend/src/pages/AiAssistantProduct.test.tsx`

**Interfaces:**
- User-facing initial message states the exact supported scope
- Product page states that university/general/small-talk paths do not call Luna

- [ ] **Step 1: UI文言の失敗テストを書く**

```ts
expect(screen.getByRole('article', { name: 'AI Assistantの回答' }))
  .toHaveTextContent('TTI Intelligenceと、このサイトについて案内できます。');
```

In the product-page test, require the phrases `サークルとサイト`, `大学については公式サイト`, and `対象外の質問ではLunaを呼びません`. Remove assertions that advertise stable general knowledge or detailed university answers.

- [ ] **Step 2: UIテストを実行してREDを確認する**

Run: `cd frontend && npm test -- --run src/features/assistant/AssistantConversation.test.tsx src/pages/AiAssistantProduct.test.tsx`

Expected: existing broad assistant copy does not match the new scope.

- [ ] **Step 3: 短い初期文言と製品説明へ更新する**

Use this greeting:

```ts
const GREETING_MESSAGE =
  'こんにちは！TTI Intelligenceと、このサイトについて案内できます。';
```

Update the product page without changing layout or styling. Explain that only circle/site questions use Luna, university questions show the official link, and other general questions are outside scope.

- [ ] **Step 4: フロントテストとビルドをGREENにする**

Run: `cd frontend && npm test -- --run src/features/assistant/AssistantConversation.test.tsx src/features/assistant/assistantApi.test.ts src/pages/AiAssistantProduct.test.tsx`

Run: `cd frontend && npm run build`

Expected: tests and production build pass.

- [ ] **Step 5: UI文言をコミットする**

```bash
git add frontend/src/features/assistant/AssistantConversation.tsx frontend/src/features/assistant/AssistantConversation.test.tsx frontend/src/features/assistant/assistantApi.ts frontend/src/features/assistant/assistantApi.test.ts frontend/src/pages/AiAssistantProduct.tsx frontend/src/pages/AiAssistantProduct.test.tsx
git commit -m "Explain assistant circle and site scope"
```

---

### Task 6: 100問評価を新しい0/1コール設計へ移行

**Files:**
- Modify: `scripts/fixtures/assistant-noise-eval-100.json`
- Modify: `scripts/assistant-prod-eval-core.mjs`
- Modify: `scripts/assistant-prod-eval-core.test.mjs`
- Modify: `scripts/assistant-prod-eval-100-natural.mjs`
- Modify: `scripts/assistant-eval-telemetry-from-logs.mjs`
- Modify: `scripts/generate-assistant-noise-eval-pdf.py`
- Create: `output/pdf/assistant-circle-site-routing-evaluation-2026-08-10.pdf`

**Interfaces:**
- Every case contains `expectedScope` and `expectedLunaCallCount`
- Telemetry contains `assistantScope`
- 100 cases remain deterministic: 25 topics × 4 wording/noise variants

- [ ] **Step 1: 評価器の新しい失敗テストを書く**

Add behavioral tests proving:

```js
assert.deepEqual(
  evaluateCase(universityCase, universityResponse, {
    assistantScope: 'university', lunaCallCount: 0, webCallCount: 0, usage: zeroUsage,
  }).issues,
  [],
);

assert.ok(evaluateCase(universityCase, universityResponse, {
  assistantScope: 'university', lunaCallCount: 1, webCallCount: 0, usage,
}).issues.includes('luna_call_count'));

assert.ok(evaluateCase(circleCase, circleResponse, {
  assistantScope: 'circle', lunaCallCount: 0, webCallCount: 0, usage: zeroUsage,
}).issues.includes('luna_call_count'));
```

Also require local university answers to contain the exact official root link and reject detailed university claims.

- [ ] **Step 2: 評価器テストを実行してREDを確認する**

Run: `node --test scripts/assistant-prod-eval-core.test.mjs`

Expected: evaluator still requires one Luna call for every case and lacks `assistantScope`.

- [ ] **Step 3: 100ケースを新しい範囲へ再構成する**

Keep exactly 100 cases with four variants per topic:

- 8 circle topics = 32 cases
- 8 site topics, including all six named development tools = 32 cases
- 4 university redirect topics = 16 cases
- 4 out-of-scope topics = 16 cases
- 1 conversation topic = 4 cases

Set `expectedLunaCallCount: 1` for the 64 circle/site cases and `0` for the remaining 36. Set `expectedWebCallCount: 0` for all cases. University cases require the exact university root link; out-of-scope and conversation cases require no links.

- [ ] **Step 4: 評価器・ランナー・ログ変換を更新する**

Replace the hard-coded `lunaCallCount === 1` rule with equality against each case's expected count. Validate and persist `assistantScope` in sanitized telemetry. For zero-call cases, require all five usage counters to be zero. Keep run ID, case ID, server request ID, observed time, privacy, and correlation validation unchanged.

- [ ] **Step 5: 評価器をGREENにし、dry-runで外部呼び出し0回を確認する**

Run: `node --test scripts/assistant-prod-eval-core.test.mjs`

Run: `node scripts/assistant-prod-eval-100-natural.mjs --dry-run`

Expected: tests pass; dry-run loads exactly 100 cases and performs 0 production/OpenAI calls.

- [ ] **Step 6: PDFを再生成して目視確認する**

Run the existing PDF generator, render every page with Poppler, inspect each rendered page, extract text with `pdfplumber`, and confirm the document states `64 Luna calls / 36 zero-call responses / 0 web calls`. Remove temporary rendered PNGs after inspection.

- [ ] **Step 7: 評価資産をコミットする**

```bash
git add scripts/fixtures/assistant-noise-eval-100.json scripts/assistant-prod-eval-core.mjs scripts/assistant-prod-eval-core.test.mjs scripts/assistant-prod-eval-100-natural.mjs scripts/assistant-eval-telemetry-from-logs.mjs scripts/generate-assistant-noise-eval-pdf.py
git add -f output/pdf/assistant-circle-site-routing-evaluation-2026-08-10.pdf
git commit -m "Update assistant scope evaluation"
```

---

### Task 7: 全体検証、本番反映、スモークテスト

**Files:**
- Verify: all files changed in Tasks 1–6
- Deploy from: `infra/`

**Interfaces:**
- Production API: `https://dfqmc56d94.execute-api.ap-northeast-1.amazonaws.com/prod/assistant`
- AWS profile: `tti-deploy`

- [ ] **Step 1: 全自動テストと静的検証を実行する**

Run: `cd lambdas && npm test -- --run`

Run: `cd lambdas && npm run typecheck`

Run: `cd frontend && npm test -- --run`

Run: `cd frontend && npm run build`

Run: `cd infra && npm test -- --run && npm run build`

Run: `git diff --check && git status --short`

Expected: all tests, type checks, builds, and diff checks pass; only intended files are changed.

- [ ] **Step 2: スコープ回帰をローカルで確認する**

Run the focused matrices for `scope`, `localResponses`, `structuredKnowledge`, `index`, `openai`, frontend API, and greeting. Confirm:

- circle/site: quota 1, secret 1, Luna 1
- university/conversation/out-of-scope: quota 0, search 0, secret 0, Luna 0
- all requests: web 0

- [ ] **Step 3: 最終実装コミットを作る**

```bash
git add -A
git commit -m "Complete circle and site assistant routing"
```

Skip this commit if all intended files are already cleanly committed by Tasks 1–6.

- [ ] **Step 4: AWSへデプロイする**

Run: `cd infra && AWS_PROFILE=tti-deploy npm run deploy -- --require-approval never`

Expected: `TtiAiStack` reaches `UPDATE_COMPLETE` and outputs the existing API URL.

- [ ] **Step 5: 本番4経路を確認する**

Send one request each with unique UUIDv4 session IDs and sanitized evaluation correlation:

1. `このサークルについて教えて` → short TTI Intelligence answer
2. `Codexとは？` → site-grounded Codex answer
3. `豊田工業大学について教えて` → exact short official-site redirect
4. `東京の天気は？` → short out-of-scope response, no links

Export the four correlated CloudWatch log records and verify expected `assistantScope`, `lunaCallCount` (`1, 1, 0, 0`), `webCallCount: 0`, zero usage on local responses, and no message/history/session content in logs.

- [ ] **Step 6: 最終状態を報告する**

Report the commit hash, AWS stack status, production API URL, test totals, the four smoke-response summaries, and measured call counts. State that only two live Luna calls were used by the four-request smoke test.
