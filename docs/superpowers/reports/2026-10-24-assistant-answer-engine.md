# Assistant answer generation rebuild — 2026-10-24

The assistant keeps its existing screen and API response shape. Generation now
uses a conversation rather than an isolated question with a single user-only
history fragment. This report supersedes the answer-length and conversation
rules in the August single-call design for the changed implementation.

## Generation flow

1. The frontend sends the previous three complete question/answer exchanges.
   Clearing the conversation sends empty history. There is no new server-side
   conversation database or browser storage.
2. Lambda validates a maximum of six history messages: user messages are at
   most 500 and assistant replies 1,200 UTF-16 code units. Assistant history
   carries up to four link-card titles (120 units each) in display order, so
   「2つ目」 also works when the prose only points at those cards. The aggregate
   history limit is 6,540 units. Only `user` and `assistant` are allowed; old
   user-only clients remain valid.
3. The reviewed knowledge pack includes all 38 catalog topics, including
   previously omitted activity details, development examples, and contact
   information. Review dates and volatility are preserved.
4. Optional content retrieval uses the active conversation and current detail
   page. A new topic does not inherit an older article. Independent repositories
   run concurrently, and partial failures preserve successfully retrieved data.
5. One Responses API call receives native user/assistant messages, followed by
   the latest question and its grounded context. The instructions are rewritten
   around answering the question, resolving references, explaining more simply,
   and distinguishing unknown information from unavailable retrieval.
6. The existing strict output schema and verified link construction remain.
   Answers may contain paragraphs and explanations up to 1,200 UTF-16 code
   units, without a fixed sentence count. Short questions still request short
   answers. Unrelated topics no longer automatically redirect to Contact.

The configured model remains `gpt-5.6-luna`; the output budget is 2,000 tokens.
Requests use `store: false`, no tools, and the existing timeout and quotas. The
knowledge pack limit is 32KB and serialized conversation-input limit is 64KB.
No credentials, infrastructure resources, or deployment settings were changed.

## Verification and rollout

Regression tests cover native conversation history, references to prior choices,
acknowledgements that accept an offer, topic switches, resetting conversation,
detail-page retrieval, partial failures, output limits, link validation, and the
production evaluation contract. Frontend tests, lint/build, Lambda tests and
typecheck, and the production evaluator tests are the local verification gates.

These tests verify integration and constraints with mocked model responses;
they do not establish a measured gain in live model answer quality. No live AI
calls or deployment were made during this work. Live comparison should include
multi-turn cases such as 「2つ目を詳しく」「難しいから簡単に説明して」,
followed by an explicit topic change.

Deploy the backend before the frontend: the new backend accepts the old
user-only history, while the old backend rejects the new assistant-history
messages. Deploying only the frontend would break follow-up requests.

The native conversation format follows the official [conversation-state
guide](https://developers.openai.com/api/docs/guides/conversation-state).
