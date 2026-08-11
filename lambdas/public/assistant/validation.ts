import type {
  AssistantModelScope,
  AssistantRequest,
  HistoryMessage,
  ModelGuideResponse,
  ModelGuideValidationContext,
  OpenAIUsage,
} from './types.js';
import { ASSISTANT_MODEL_SCOPES } from './types.js';

const MAX_RAW_BODY_LENGTH = 65_536;
const MAX_MESSAGE_LENGTH = 500;
const MAX_MODEL_ANSWER_LENGTH = 200;
const MAX_MODEL_ANSWER_CLAUSES = 2;
const MAX_CURRENT_PATH_LENGTH = 256;
/** Frontend sends at most 2 prior user turns; match that on the wire. */
const MAX_HISTORY_MESSAGES = 2;
const MAX_HISTORY_CONTENT_LENGTH = 800;
const MAX_HISTORY_TOTAL_LENGTH = 1_200;
const MAX_MODEL_PAGE_IDS = 3;
const MAX_MODEL_CONTENT_IDS = 3;
const MAX_MODEL_SOURCE_IDS = 3;

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODEL_PAGE_ID_PATTERN = /^[a-z0-9-]{1,64}$/;
const MODEL_CONTENT_ID_PATTERN = /^(news|board|weekly-math):[A-Za-z0-9._~%-]{1,128}$/;
const ASCII_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u;
const EMAIL_ADDRESS_PATTERN = /[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,63})+/giu;
const URL_PATTERN = /(?:(?:https?|ftp):\/\/|\/\/|(?:mailto|tel|javascript|data):|www\.|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z]{2,63}\b)/iu;
const MARKDOWN_PATTERN = /(?:\[[^\]\r\n]*\]\([^\)\r\n]+\)|\*\*[^*\r\n]+\*\*|__[^_\r\n]+__|~~[^~\r\n]+~~|`[^`\r\n]+`)/u;
const SENTENCE_CLAUSE_PATTERN = /[。．.!！？?\r\n]+/u;
const UNIVERSITY_DIRECTION_PATTERN = /^(?:豊田工業大学(?:について)?(?:は|の(?:情報|詳細)は)?[、,]?)?(?:詳しくは)?公式(?:サイト|ウェブサイト|ホームページ)(?:をご(?:確認|覧)ください|へ(?:お進み|アクセス)ください|をご利用ください)[。．!?！？]?$/u;
const OUT_OF_SCOPE_APOLOGY_PATTERN = /(?:申し訳(?:ありません|ございません)|すみません|ごめんなさい)/u;
const OUT_OF_SCOPE_INABILITY_PATTERN = /(?:(?:お答え|回答|案内|対応)(?:でき|しかね)|お力にな(?:れ|り)ません)/u;
const OUT_OF_SCOPE_CONTACT_PATTERN = /(?:お問い合わせ(?:ください|フォーム(?:から|をご利用ください)|先(?:へ|に)ご連絡ください)|contact\s+(?:us|form))/iu;

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
    if (role !== 'user' || typeof content !== 'string') {
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

function isModelScope(value: string): value is AssistantModelScope {
  return (ASSISTANT_MODEL_SCOPES as readonly string[]).includes(value);
}

function hasUnsafeText(value: string): boolean {
  return CONTROL_CHARACTER_PATTERN.test(value)
    || URL_PATTERN.test(value.replace(EMAIL_ADDRESS_PATTERN, ''))
    || MARKDOWN_PATTERN.test(value);
}

function validateIdArray(
  value: unknown,
  allowedIds: readonly string[],
  idPattern: RegExp,
  maxLength: number,
): string[] {
  if (!Array.isArray(value) || value.length > maxLength) {
    return unsafeModelOutput();
  }

  const allowedIdSet = new Set(allowedIds);
  const seenIds = new Set<string>();
  for (const id of value) {
    if (
      typeof id !== 'string'
      || !idPattern.test(id)
      || !allowedIdSet.has(id)
      || seenIds.has(id)
    ) {
      return unsafeModelOutput();
    }
    seenIds.add(id);
  }

  return [...value];
}

function hasOnlyIds(ids: readonly string[], expected: readonly string[]): boolean {
  return ids.length === expected.length && ids.every((id, index) => id === expected[index]);
}

function validateScopePolicy(
  scope: AssistantModelScope,
  topicLabel: string,
  answer: string,
  pageIds: readonly string[],
  contentIds: readonly string[],
  sourceIds: readonly string[],
): void {
  if (scope !== 'out_of_scope' && topicLabel !== '') {
    return unsafeModelOutput();
  }

  if (scope === 'circle' || scope === 'site') {
    if (sourceIds.includes('toyota-ti')) return unsafeModelOutput();
    return;
  }

  if (scope === 'university') {
    if (
      !hasOnlyIds(pageIds, [])
      || !hasOnlyIds(contentIds, [])
      || !hasOnlyIds(sourceIds, ['toyota-ti'])
      || !UNIVERSITY_DIRECTION_PATTERN.test(answer)
    ) {
      return unsafeModelOutput();
    }
    return;
  }

  const topicLabelLength = [...topicLabel].length;
  if (
    topicLabelLength < 1
    || topicLabelLength > 24
    || topicLabel.trim().length === 0
    || !hasOnlyIds(pageIds, ['contact'])
    || !hasOnlyIds(contentIds, [])
    || !hasOnlyIds(sourceIds, [])
    || !answer.includes(topicLabel)
    || !OUT_OF_SCOPE_APOLOGY_PATTERN.test(answer)
    || !OUT_OF_SCOPE_INABILITY_PATTERN.test(answer)
    || !OUT_OF_SCOPE_CONTACT_PATTERN.test(answer)
  ) {
    return unsafeModelOutput();
  }
}

export function validateModelGuideResponse(
  value: unknown,
  context: ModelGuideValidationContext,
): ModelGuideResponse;
/** @deprecated Supply the context; retained only until the caller migrates. */
export function validateModelGuideResponse(value: unknown): never;
export function validateModelGuideResponse(
  value: unknown,
  context?: ModelGuideValidationContext,
): ModelGuideResponse {
  if (context === undefined) return unsafeModelOutput();

  if (!isPlainObject(value)) {
    return unsafeModelOutput();
  }

  const keys = Object.keys(value);
  if (
    keys.length !== 6
    || !Object.hasOwn(value, 'scope')
    || !Object.hasOwn(value, 'topicLabel')
    || !Object.hasOwn(value, 'answer')
    || !Object.hasOwn(value, 'pageIds')
    || !Object.hasOwn(value, 'contentIds')
    || !Object.hasOwn(value, 'sourceIds')
  ) {
    return unsafeModelOutput();
  }

  const { scope, topicLabel, answer, pageIds, contentIds, sourceIds } = value;
  if (
    typeof scope !== 'string'
    || !isModelScope(scope)
    || typeof topicLabel !== 'string'
    || typeof answer !== 'string'
    || hasUnsafeText(topicLabel)
    || hasUnsafeText(answer)
  ) {
    return unsafeModelOutput();
  }

  const trimmedAnswer = answer.trim();
  const answerLength = [...answer].length;
  const clauseCount = trimmedAnswer
    .replace(EMAIL_ADDRESS_PATTERN, 'email')
    .split(SENTENCE_CLAUSE_PATTERN)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0)
    .length;
  if (
    trimmedAnswer.length === 0
    || answerLength > MAX_MODEL_ANSWER_LENGTH
    || clauseCount > MAX_MODEL_ANSWER_CLAUSES
  ) {
    return unsafeModelOutput();
  }

  const validatedPageIds = validateIdArray(
    pageIds,
    context.allowedPageIds,
    MODEL_PAGE_ID_PATTERN,
    MAX_MODEL_PAGE_IDS,
  );
  const validatedContentIds = validateIdArray(
    contentIds,
    context.allowedContentIds,
    MODEL_CONTENT_ID_PATTERN,
    MAX_MODEL_CONTENT_IDS,
  );
  const validatedSourceIds = validateIdArray(
    sourceIds,
    context.allowedSourceIds,
    MODEL_PAGE_ID_PATTERN,
    MAX_MODEL_SOURCE_IDS,
  );

  validateScopePolicy(
    scope,
    topicLabel,
    trimmedAnswer,
    validatedPageIds,
    validatedContentIds,
    validatedSourceIds,
  );

  return {
    scope,
    topicLabel,
    answer: trimmedAnswer,
    pageIds: validatedPageIds,
    contentIds: validatedContentIds,
    sourceIds: validatedSourceIds,
  };
}
