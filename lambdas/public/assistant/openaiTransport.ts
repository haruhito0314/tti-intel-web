import {
  GetSecretValueCommand,
  type GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager';

import type { OpenAIUsage } from './types.js';
import { UnsafeModelOutputError } from './validation.js';

export const DEFAULT_OPENAI_TIMEOUT_MS = 20_000;
const RESPONSES_URL = 'https://api.openai.com/v1/responses';

export interface SecretReader {
  send(command: GetSecretValueCommand): Promise<GetSecretValueCommandOutput>;
}

export interface ResponsesRequestInput {
  apiKey: string;
  payload: unknown;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class SecretUnavailableError extends Error {
  readonly name = 'SecretUnavailableError';

  constructor() {
    super('OpenAI API key unavailable');
  }
}

export class OpenAiTimeoutError extends Error {
  readonly name = 'OpenAiTimeoutError';

  constructor() {
    super('OpenAI request timed out');
  }
}

export class OpenAiUpstreamError extends Error {
  readonly name = 'OpenAiUpstreamError';

  constructor(readonly status?: number) {
    super('OpenAI upstream unavailable');
  }
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function unsafeModelOutput(usage?: OpenAIUsage): never {
  throw new UnsafeModelOutputError('Unsafe model output', usage);
}

function secretUnavailable(): never {
  throw new SecretUnavailableError();
}

function parseApiKey(output: GetSecretValueCommandOutput): string {
  if (
    output.SecretBinary !== undefined
    || typeof output.SecretString !== 'string'
  ) {
    return secretUnavailable();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(output.SecretString) as unknown;
  } catch {
    return secretUnavailable();
  }

  if (
    !isPlainObject(parsed)
    || Object.keys(parsed).length !== 1
    || !Object.hasOwn(parsed, 'apiKey')
    || typeof parsed.apiKey !== 'string'
  ) {
    return secretUnavailable();
  }

  const apiKey = parsed.apiKey.trim();
  if (apiKey.length === 0) {
    return secretUnavailable();
  }

  return apiKey;
}

export function createApiKeyProvider(
  reader: SecretReader,
  secretId: string,
): () => Promise<string> {
  let cached: Promise<string> | undefined;

  return () => {
    if (cached !== undefined) return cached;

    const pending = (async () => {
      try {
        const output = await reader.send(new GetSecretValueCommand({
          SecretId: secretId,
        }));
        return parseApiKey(output);
      } catch {
        throw new SecretUnavailableError();
      }
    })();

    cached = pending;
    void pending.catch(() => {
      if (cached === pending) cached = undefined;
    });
    return pending;
  };
}

/** Use the measured semantic-selection baseline for each configured model family. */
export function reasoningEffortForModel(
  model: string,
): 'none' | 'minimal' | 'low' | 'medium' {
  if (/^gpt-5\.4-nano(?:-|$)/i.test(model)) return 'medium';
  if (/gpt-5\.6/i.test(model)) return 'low';
  return /nano|mini/i.test(model) ? 'minimal' : 'none';
}

function parseUsageToken(value: unknown): number {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
  ) ? value : 0;
}

function parseResponsesUsage(value: unknown): OpenAIUsage {
  const usage = (
    isPlainObject(value)
    && isPlainObject(value.usage)
  ) ? value.usage : {};

  return {
    inputTokens: parseUsageToken(usage.input_tokens),
    outputTokens: parseUsageToken(usage.output_tokens),
    totalTokens: parseUsageToken(usage.total_tokens),
  };
}

export function parseCompletedJsonEnvelope(value: unknown): {
  parsedOutput: unknown;
  usage: OpenAIUsage;
} {
  const usage = parseResponsesUsage(value);

  if (
    !isPlainObject(value)
    || value.status !== 'completed'
    || !Array.isArray(value.output)
    || (value.error !== undefined && value.error !== null)
    || (value.incomplete_details !== undefined && value.incomplete_details !== null)
  ) {
    return unsafeModelOutput(usage);
  }

  const outputTexts: string[] = [];
  for (const outputItem of value.output) {
    if (!isPlainObject(outputItem)) return unsafeModelOutput(usage);
    if (
      outputItem.status !== undefined
      && outputItem.status !== 'completed'
    ) {
      return unsafeModelOutput(usage);
    }

    if (outputItem.content === undefined) continue;
    if (!Array.isArray(outputItem.content)) return unsafeModelOutput(usage);

    for (const contentItem of outputItem.content) {
      if (!isPlainObject(contentItem)) return unsafeModelOutput(usage);
      if (
        contentItem.type === 'refusal'
        || contentItem.type === 'content_filter'
      ) {
        return unsafeModelOutput(usage);
      }
      if (contentItem.type === 'output_text') {
        if (typeof contentItem.text !== 'string') {
          return unsafeModelOutput(usage);
        }
        outputTexts.push(contentItem.text);
      }
    }
  }

  if (outputTexts.length !== 1) return unsafeModelOutput(usage);

  let parsedOutput: unknown;
  try {
    parsedOutput = JSON.parse(outputTexts[0]!) as unknown;
  } catch {
    return unsafeModelOutput(usage);
  }

  return { parsedOutput, usage };
}

export async function requestResponsesEnvelope({
  apiKey,
  payload,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_OPENAI_TIMEOUT_MS,
}: ResponsesRequestInput): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetchImpl(RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch {
      if (timedOut) throw new OpenAiTimeoutError();
      throw new OpenAiUpstreamError();
    }

    if (timedOut) throw new OpenAiTimeoutError();
    if (!response.ok) throw new OpenAiUpstreamError(response.status);

    try {
      return await response.json() as unknown;
    } catch (error) {
      if (timedOut) throw new OpenAiTimeoutError();
      if (error instanceof SyntaxError) return unsafeModelOutput();
      throw new OpenAiUpstreamError();
    }
  } finally {
    clearTimeout(timer);
  }
}
