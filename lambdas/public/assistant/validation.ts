import type {
  AssistantRequest,
  HistoryMessage,
  ModelGuideResponse,
  OpenAIUsage,
} from './types.js';

const MAX_RAW_BODY_LENGTH = 65_536;
const MAX_MESSAGE_LENGTH = 500;
const MAX_CURRENT_PATH_LENGTH = 256;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CONTENT_LENGTH = 800;
const MAX_HISTORY_TOTAL_LENGTH = 8_000;
const MAX_MODEL_PAGE_IDS = 3;

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODEL_PAGE_ID_PATTERN = /^[a-z0-9-]{1,64}$/;
const ASCII_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;

export class RequestValidationError extends Error {
  readonly name = 'RequestValidationError';
}

export class UnsafeModelOutputError extends Error {
  readonly name = 'UnsafeModelOutputError';

  readonly usage?: Readonly<OpenAIUsage>;

  constructor(message: string, usage?: OpenAIUsage) {
    super(message);
    this.usage = usage === undefined ? undefined : { ...usage };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function invalidRequest(): never {
  throw new RequestValidationError('Invalid assistant request');
}

function unsafeModelOutput(): never {
  throw new UnsafeModelOutputError('Unsafe model output');
}

function parseHistory(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value) || value.length > MAX_HISTORY_MESSAGES) {
    return invalidRequest();
  }

  let totalRawContentLength = 0;

  return value.map((item) => {
    if (!isPlainObject(item)) {
      return invalidRequest();
    }

    const { role, content } = item;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
      return invalidRequest();
    }

    totalRawContentLength += content.length;
    if (
      content.length > MAX_HISTORY_CONTENT_LENGTH
      || totalRawContentLength > MAX_HISTORY_TOTAL_LENGTH
    ) {
      return invalidRequest();
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return invalidRequest();
    }

    return { role, content: trimmedContent };
  });
}

export function parseAssistantRequest(
  rawBody: string | null | undefined,
): AssistantRequest {
  if (typeof rawBody !== 'string' || rawBody.length > MAX_RAW_BODY_LENGTH) {
    return invalidRequest();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return invalidRequest();
  }

  if (!isPlainObject(parsed)) {
    return invalidRequest();
  }

  const { message, currentPath, sessionId, history } = parsed;
  if (typeof message !== 'string') {
    return invalidRequest();
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0 || trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return invalidRequest();
  }

  if (
    typeof currentPath !== 'string'
    || currentPath.length > MAX_CURRENT_PATH_LENGTH
    || !currentPath.startsWith('/')
    || currentPath.startsWith('//')
    || currentPath.includes('?')
    || currentPath.includes('#')
    || currentPath.includes('\\')
    || ASCII_CONTROL_PATTERN.test(currentPath)
  ) {
    return invalidRequest();
  }

  if (typeof sessionId !== 'string' || !UUID_V4_PATTERN.test(sessionId)) {
    return invalidRequest();
  }

  return {
    message: trimmedMessage,
    currentPath,
    sessionId,
    history: parseHistory(history),
  };
}

export function validateModelGuideResponse(
  value: unknown,
): ModelGuideResponse {
  if (!isPlainObject(value)) {
    return unsafeModelOutput();
  }

  const keys = Object.keys(value);
  if (
    keys.length !== 2
    || !Object.hasOwn(value, 'answer')
    || !Object.hasOwn(value, 'pageIds')
  ) {
    return unsafeModelOutput();
  }

  const { answer, pageIds } = value;
  if (typeof answer !== 'string') {
    return unsafeModelOutput();
  }

  const trimmedAnswer = answer.trim();
  if (trimmedAnswer.length === 0 || trimmedAnswer.length > MAX_MESSAGE_LENGTH) {
    return unsafeModelOutput();
  }

  if (!Array.isArray(pageIds) || pageIds.length > MAX_MODEL_PAGE_IDS) {
    return unsafeModelOutput();
  }

  const seenPageIds = new Set<string>();
  for (const pageId of pageIds) {
    if (
      typeof pageId !== 'string'
      || !MODEL_PAGE_ID_PATTERN.test(pageId)
      || seenPageIds.has(pageId)
    ) {
      return unsafeModelOutput();
    }
    seenPageIds.add(pageId);
  }

  return {
    answer: trimmedAnswer,
    pageIds: [...pageIds] as string[],
  };
}
