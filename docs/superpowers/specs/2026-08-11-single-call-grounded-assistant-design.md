# TTI Intelligence Assistant — single-call grounded design

## Goal

The Assistant must answer natural questions about TTI Intelligence and the
public website without depending on a small list of exact Japanese phrases.
Every substantive question is handled by one Luna request that both decides
the scope and writes the answer from reviewed site data. Web search remains
disabled.

“Complete coverage” means coverage of facts and functions published by TTI
Intelligence and this website. It does not authorize inventing unpublished
facts or answering unrelated general-knowledge questions.

## User-visible behavior

- Circle and website questions accept ordinary variations such as
  「このサイトでは何があるの？」「お問い合わせってしていいの？」
  and 「このサークルって普段何をしてる？」.
- Answers sound like a short LINE message: lead with the answer, use one or
  two sentences, normally stay near 120 Japanese characters, and never exceed
  200 Unicode code points.
- University questions provide only a brief direction to the official Toyota
  Technological Institute site; the Assistant does not reproduce detailed
  university facts.
- Unrelated questions receive a question-specific apology, for example
  「申し訳ありませんが、天気については案内できません。必要であればお問い合わせください。」
  together with the verified contact-page link.
- The generic fixed response
  「TTI Intelligenceと、このサイトの内容について案内できます。」
  is removed from substantive-question handling.
- Greetings, thanks, acknowledgements, and farewells may remain zero-cost local
  responses because they do not require factual interpretation.

## Architecture

### One substantive request, one Luna call

The Lambda performs validation and local conversational handling first. Every
other valid message follows one generative path:

1. Load one compact, reviewed knowledge pack containing the complete public
   circle and site guide.
2. Optionally add up to three relevant current-content excerpts from the
   existing news, board, and weekly-math repositories. Repository failure is
   contained and does not remove the static site guide.
3. Send the message, at most one prior user turn when context is needed, the
   knowledge pack, and current-content excerpts to `gpt-5.6-luna` once.
4. Luna returns both its scope decision and its grounded answer in one strict
   JSON response.
5. The Lambda validates the answer and constructs links only from local
   allowlists.

There is no separate Luna classifier, no second generation call, no Web
search, and no OpenAI tool call. Requests use `store: false` and `tools: []`.

### Model output contract

The strict response schema contains exactly:

- `scope`: `circle | site | university | out_of_scope`
- `topicLabel`: a short Japanese topic label used only for an out-of-scope
  apology
- `answer`: the final Japanese answer
- `pageIds`: up to three reviewed internal page IDs
- `contentIds`: up to three IDs from the supplied current-content excerpts
- `sourceIds`: up to three reviewed official external-source IDs

The model receives explicit instructions to classify by meaning rather than
surface wording. For `out_of_scope`, it must write a brief apology naming the
topic and recommend the contact page. For `university`, it must avoid detailed
claims and direct the user to the official university site.

## Knowledge pack

The static pack is supplied on every substantive Luna request so a valid
question never reaches Luna with zero grounding merely because retrieval
missed a phrase. It contains reviewed facts for:

- TTI Intelligence identity and relationship to Toyota Technological Institute
- activities, participation, eligibility, schedule, fees, contact, Discord,
  and YouTube
- website purpose and navigation
- About, Weekly Math, Apps, Game Community, Development, News, Board, Contact,
  and AI Assistant pages
- Board posting, anonymous-name, thread, and comment behavior
- the published apps and their functions
- Codex, Vercel, AWS, Plugin, CLI, and MCP explanations as presented by the
  Development page

The pack is assembled from reviewed structured data, not scraped at request
time. A catalog test requires every supported public page and circle topic to
have at least one entry and a permitted destination page. When the website
changes, this catalog and its coverage test are updated together.

Current article, thread, and problem excerpts remain optional supplements.
They cannot override system instructions and cannot introduce arbitrary URLs.

## Routing and local behavior

Exact phrase regexes are no longer the primary gate for substantive messages.
They are retained only where deterministic local behavior is safer and
unambiguous: request validation and simple conversation.

The single Luna result controls the substantive scope:

- `circle` and `site`: return the grounded generated answer.
- `university`: accept only the short university direction and attach the
  verified official university URL.
- `out_of_scope`: accept only a brief apology and attach `/contact`.

If the model returns a scope-incompatible answer, an unknown ID, a URL in
answer text, excessive length, malformed JSON, or unsafe instructions, the
Lambda rejects it using the existing safe upstream-error response. It does not
silently substitute the old generic fixed sentence.

## Link safety

- Internal links are created only from the existing reviewed route catalog.
- Dynamic links must pass the existing same-site path validation.
- External links are limited to the reviewed Discord, YouTube, and Toyota
  Technological Institute URLs.
- An `out_of_scope` answer always permits `/contact`; a `university` answer
  permits only the official university link.
- Luna never writes raw URLs or Markdown links in `answer`.

## Cost and latency boundaries

- Simple conversation: zero Luna calls.
- Every substantive valid question: exactly one Luna call.
- Web search and OpenAI tools: zero calls.
- The complete static pack has a deterministic UTF-8 byte limit and fails
  before a paid call if the limit is exceeded.
- The existing daily quota counts paid Luna calls, not routing stages.
- The current Lambda timeout and one shared OpenAI timeout remain sufficient
  because there is no sequential classifier call.

## Testing

Tests cover behavior rather than only regex matches:

1. Handler-boundary tests assert exactly one Luna call and a non-empty complete
   knowledge pack for natural circle and site variants.
2. Payload tests assert the strict combined scope-and-answer schema,
   `gpt-5.6-luna`, `store: false`, `tools: []`, bounded history, and byte limits.
3. Response-validation tests reject unknown links, raw URLs, more than 200 code
   points, malformed scopes, unsafe university detail, and malformed topic
   labels.
4. Local-response tests prove greetings remain zero-call and prove the old
   generic fixed sentence is absent from substantive paths.
5. Exact production regressions include:
   - 「このサイトでは何があるの？」 → site overview
   - 「お問い合わせってしていいの？」 → contact behavior and link
   - 「このサークルって普段何をしてる？」 → circle activities
   - 「掲示板は投稿していいの？」 → anonymous board posting
   - 「豊田工業大学について教えて」 → official university direction
   - 「東京の天気は？」 → topic-specific apology and contact link
6. Full Lambda tests, typecheck, infrastructure tests, and frontend Assistant
   tests must pass before deployment.

## Release acceptance

The release is accepted only when all of the following are true:

- all six production regressions above pass against the deployed API;
- every substantive regression uses exactly one Luna call and zero Web/tool
  calls;
- conversation cases use zero Luna calls;
- answers are at most 200 code points and links are allowlisted;
- CloudFormation reports `UPDATE_COMPLETE`, the Assistant Lambda is active,
  and the matching Amplify job succeeds;
- the published site returns HTTP 200.

