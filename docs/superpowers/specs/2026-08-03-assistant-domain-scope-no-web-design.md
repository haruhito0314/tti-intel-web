# Assistant Domain Scope Without Web Search

## Goal

Keep Luna-generated answers for TTI Intelligence and adjacent learning topics while removing web-search cost, unrelated general-purpose usage, and model-controlled URLs.

## Supported scope

The Assistant answers questions about:

- TTI Intelligence, its activities, participation, and relationship to Toyota Technological Institute;
- pages, posts, apps, games, mathematics, and other content published on this site;
- AI, programming, web or app development, mathematics, games, making projects, and learning methods;
- follow-up questions whose recent conversation establishes one of these topics.

Clearly unrelated topics such as weather, travel, cooking, entertainment news, and general current events are out of scope.

## Request routing

Every valid request is classified locally before paid API work.

- Clearly in-scope requests call `gpt-5.6-luna` once.
- Plausibly related or ambiguous requests call Luna once so that brittle keyword rules do not reject useful questions.
- Clearly unrelated requests do not call OpenAI and return a short, fixed scope explanation.
- Follow-ups may use the bounded recent user history already accepted by the request contract.

The existing quota controls remain in place for paid requests. Out-of-scope local responses do not consume the OpenAI quota.

## Web search and current information

The Responses API request exposes no web-search tool. Web-source extraction, `source` links, and frontend support that exists only for arbitrary search-result URLs are removed.

When an in-scope question requires current information that is not present in trusted site data, Luna must state that it cannot verify the latest information. It may still give stable background knowledge.

## Knowledge and URL authority

Luna receives only the trusted facts, relevant guide entries, and relevant public content needed for the question. General adjacent-topic questions do not receive the complete site guide.

Luna returns answer text and reviewed identifiers, never URLs. The server resolves identifiers through the local route catalog and fixed external-link constants. The answer contract forbids inline URLs, and server-side sanitization removes any that still appear. The frontend keeps a second defensive check.

Official links remain limited to:

- reviewed internal routes and dynamic content routes;
- the configured Toyota Technological Institute URL;
- the configured Discord invite;
- the configured TTI Intelligence YouTube channel.

## Failure behavior

- Invalid requests remain `400` responses.
- Quota exhaustion remains `429`.
- OpenAI timeout or unavailability retains the existing safe error behavior.
- Invalid model output returns a scope-appropriate fallback and never introduces a model-written URL.
- Clearly unrelated questions return a successful local response with no links.

## Verification

Tests must prove that:

1. Responses payloads contain no web-search tool or source include.
2. Clearly unrelated questions never call OpenAI or content repositories.
3. AI, programming, development, mathematics, games, and learning questions still call Luna.
4. Relevant follow-ups remain in scope.
5. TTI Intelligence and university questions retain reviewed facts and deterministic links.
6. Model-written URLs and arbitrary `source` links are not rendered.
7. Lambda, frontend, and infrastructure tests and builds continue to pass.

## Deployment

Deploy the Lambda and frontend together after verification. Confirm in production that an adjacent general question succeeds, an unrelated question is handled locally, no web-search outcome is logged, and all displayed links come from the reviewed catalog.
