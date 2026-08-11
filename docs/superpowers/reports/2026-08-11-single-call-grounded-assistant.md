# Single-call grounded Assistant release-readiness verification

Verified locally on 2026-08-11 from `feature/single-call-grounded-assistant` at
`98c403b443409e60750e473de753b4ef47002d3d` before this evidence commit.

## Task commits

| Task | Commit |
| --- | --- |
| 1. Response validation | `7713f699ec654fd393a8551218e4a0636b690007` |
| 2. One grounded Luna request | `918f8d7b0f30f19896c9f70c9ea90f26c33a4d81` |
| 3. One-call substantive routing | `0777013f159fde66edce254ea3395d19692a57aa` |
| 4. Grounded-answer guidance | `b4a8ddbc9fc60824a9bba96f42f0764d1f066302` |
| 5. One-call evaluation migration | `431acb614cb70f0e5d2c5e7c5d1693804cc102a4` |
| 6. Evaluator scope-count enforcement | `98c403b443409e60750e473de753b4ef47002d3d` |

## Infrastructure assertion

The synthesized `tti-ai-site-assistant` Lambda is asserted to use
`ASSISTANT_MODEL=gpt-5.6-luna`. The CDK test also asserts that its environment
does not define `WEB_SEARCH` and that the synthesized template contains no
Web-search integration configuration.

## Local verification matrix

Every command below exited 0.

| Command | Result |
| --- | --- |
| `cd lambdas && npm test` | 14 files, 461 tests passed |
| `cd lambdas && npm run typecheck` | passed |
| `cd frontend && npm test` | 35 files, 295 tests passed |
| `cd frontend && npm run build` | passed |
| `cd infra && npm test` | 1 file, 8 tests passed |
| `cd infra && npm run build` | passed |
| `node --test scripts/assistant-prod-eval-core.test.mjs` | 14 tests passed |
| `node scripts/assistant-prod-eval-100-natural.mjs --dry-run` | exactly 100 loaded; 0 production calls; 0 OpenAI calls |
| `git diff --check` | passed |

The frontend test runner emitted non-fatal Node `--localstorage-file` path
warnings; its 295 tests passed and the command exited 0. Vite emitted its
standard chunk-size advisory; the production build exited 0.

## Required production regressions

Each substantive case expects exactly one Luna call and zero Web calls.

| Message | Expected scope | Required link | Luna calls | Web calls |
| --- | --- | --- | ---: | ---: |
| `このサイトでは何があるの？` | site | `/` | 1 | 0 |
| `お問い合わせってしていいの？` | site | `/contact` | 1 | 0 |
| `このサークルって普段何をしてる？` | circle | `/about` | 1 | 0 |
| `掲示板は投稿していいの？` | site | `/board` | 1 | 0 |
| `豊田工業大学について教えて` | university | `https://www.toyota-ti.ac.jp/` | 1 | 0 |
| `東京の天気は？` | out_of_scope | `/contact` | 1 | 0 |

No live 100-case evaluation ran during this local verification, and no
deployment occurred.
