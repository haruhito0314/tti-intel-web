import rawGuideEntries from './knowledge/site-guide.json' with { type: 'json' };
import { PAGE_IDS } from './types.js';
import type {
  AssistantLink,
  Audience,
  ContentKind,
  GuideEntry,
  GuideFaq,
  PageId,
  RankedContentEntry,
  RankedGuideEntry,
} from './types.js';

export const KNOWN_PAGE_ROUTES = {
  home: { title: 'ホーム', href: '/' },
  about: { title: 'サークルについて', href: '/about' },
  news: { title: 'お知らせ', href: '/news' },
  apps: { title: 'アプリ', href: '/app' },
  development: { title: '開発について', href: '/development' },
  board: { title: '掲示板', href: '/board' },
  contact: { title: 'お問い合わせ', href: '/contact' },
  'game-community': { title: 'ゲームコミュニティ', href: '/game-community' },
  'weekly-math': { title: '今週の数学', href: '/weekly-math' },
  'table-tennis': { title: 'Table Tennis Match Maker', href: '/app/table-tennis' },
  'color-sort': { title: 'Color Sort Puzzle', href: '/app/color-sort' },
  'cli-practice': { title: 'CLI Practice', href: '/app/cli-practice' },
} as const satisfies Record<PageId, { title: string; href: string }>;

/** Official invite; keep in sync with frontend/src/config/site.ts socialLinks.discord.url */
export const DISCORD_INVITE_URL = 'https://discord.gg/DFWs8GrHxF';

/** Toyota Technological Institute (豊田工業大学) official site. */
export const TOYOTA_TI_URL = 'https://www.toyota-ti.ac.jp/';

/** Circle YouTube channel; keep in sync with frontend About / site config. */
export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@ttiintelligence';

const PAGE_ID_SET: ReadonlySet<string> = new Set(PAGE_IDS);

function invalidGuide(reason: string): never {
  throw new TypeError(`Invalid site guide: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageId(value: unknown): value is PageId {
  return typeof value === 'string' && PAGE_ID_SET.has(value);
}

function parseNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalidGuide(`${field} must be a non-empty string`);
  }
  return value;
}

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    return invalidGuide(`${field} must be an array`);
  }

  return value.map((item, index) => parseNonEmptyString(item, `${field}[${index}]`));
}

function parseAudiences(value: unknown, field: string): Audience[] {
  if (!Array.isArray(value)) {
    return invalidGuide(`${field} must be an array`);
  }

  const audiences: Audience[] = [];
  for (const audience of value) {
    if (audience !== 'visitor' && audience !== 'member') {
      return invalidGuide(`${field} contains an unknown audience`);
    }
    audiences.push(audience);
  }

  if (
    audiences.length !== 2
    || new Set(audiences).size !== 2
    || !audiences.includes('visitor')
    || !audiences.includes('member')
  ) {
    return invalidGuide(`${field} must contain visitor and member exactly once`);
  }

  return audiences;
}

function parseFaqs(value: unknown, field: string): GuideFaq[] {
  if (!Array.isArray(value)) {
    return invalidGuide(`${field} must be an array`);
  }

  return value.map((faq, index) => {
    if (!isRecord(faq)) {
      return invalidGuide(`${field}[${index}] must be an object`);
    }

    return {
      question: parseNonEmptyString(faq.question, `${field}[${index}].question`),
      answer: parseNonEmptyString(faq.answer, `${field}[${index}].answer`),
    };
  });
}

function parseRelatedPageIds(value: unknown, field: string): PageId[] {
  if (!Array.isArray(value)) {
    return invalidGuide(`${field} must be an array`);
  }

  const relatedPageIds: PageId[] = [];
  for (const relatedPageId of value) {
    if (!isPageId(relatedPageId)) {
      return invalidGuide(`${field} contains an unknown page id`);
    }
    if (relatedPageIds.includes(relatedPageId)) {
      return invalidGuide(`${field} contains a duplicate page id`);
    }
    relatedPageIds.push(relatedPageId);
  }
  return relatedPageIds;
}

function parseGuideEntry(value: unknown, index: number): GuideEntry {
  const field = `entries[${index}]`;
  if (!isRecord(value)) {
    return invalidGuide(`${field} must be an object`);
  }
  if (!isPageId(value.id)) {
    return invalidGuide(`${field}.id is unknown`);
  }

  const route = parseNonEmptyString(value.route, `${field}.route`);
  if (route !== KNOWN_PAGE_ROUTES[value.id].href) {
    return invalidGuide(`${field}.route is not canonical for ${value.id}`);
  }

  return {
    id: value.id,
    route,
    title: parseNonEmptyString(value.title, `${field}.title`),
    summary: parseNonEmptyString(value.summary, `${field}.summary`),
    audiences: parseAudiences(value.audiences, `${field}.audiences`),
    keywords: parseStringArray(value.keywords, `${field}.keywords`),
    faqs: parseFaqs(value.faqs, `${field}.faqs`),
    relatedPageIds: parseRelatedPageIds(
      value.relatedPageIds,
      `${field}.relatedPageIds`,
    ),
  };
}

function parseGuideEntries(value: unknown): readonly GuideEntry[] {
  if (!Array.isArray(value) || value.length !== PAGE_IDS.length) {
    return invalidGuide(`catalog must contain exactly ${PAGE_IDS.length} entries`);
  }

  const entries = value.map(parseGuideEntry);
  const seenPageIds = new Set<PageId>();
  for (const entry of entries) {
    if (seenPageIds.has(entry.id)) {
      return invalidGuide(`catalog contains duplicate page id ${entry.id}`);
    }
    seenPageIds.add(entry.id);
  }
  for (const pageId of PAGE_IDS) {
    if (!seenPageIds.has(pageId)) {
      return invalidGuide(`catalog is missing page id ${pageId}`);
    }
  }

  return entries;
}

export const GUIDE_ENTRIES = parseGuideEntries(rawGuideEntries);

const DYNAMIC_PAGE_PATTERNS: readonly [RegExp, PageId][] = [
  [/^\/news\/[^/]+$/, 'news'],
  [/^\/weekly-math\/[^/]+$/, 'weekly-math'],
  [/^\/weekly-math\/[^/]+\/solution$/, 'weekly-math'],
  [/^\/board\/[^/]+$/, 'board'],
];

export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ja-JP').trim().replace(/\s+/g, ' ');
}

export function resolveCurrentPageId(currentPath: string): PageId | null {
  for (const pageId of PAGE_IDS) {
    if (KNOWN_PAGE_ROUTES[pageId].href === currentPath) {
      return pageId;
    }
  }

  for (const [pattern, pageId] of DYNAMIC_PAGE_PATTERNS) {
    if (pattern.test(currentPath)) {
      return pageId;
    }
  }

  return null;
}

export function scoreGuideEntry(
  normalizedQuery: string,
  currentPageId: PageId | null,
  entry: GuideEntry,
): number {
  const query = normalizeSearchText(normalizedQuery);
  const title = normalizeSearchText(entry.title);
  let score = query === title ? 8 : query.includes(title) ? 5 : 0;

  for (const keyword of new Set(entry.keywords.map(normalizeSearchText))) {
    if (keyword && query.includes(keyword)) score += 3;
  }
  for (const faq of entry.faqs) {
    const question = normalizeSearchText(faq.question);
    if (!question || query.length < 2) continue;
    // Full FAQ paste, or a substantial user phrase contained in the FAQ.
    // Short probes like 「何が」「アプリ」 must not match every FAQ that mentions them.
    if (
      query.includes(question)
      || (query.length >= 6 && question.includes(query))
    ) {
      score += 3;
    }
  }
  if (currentPageId === entry.id) score += 1;
  return score;
}

export function isExplanationVideoQuestion(message: string): boolean {
  const normalized = normalizeSearchText(message);
  // Circle video / channel asks — not generic “動画” in activity lists alone.
  return /youtube|ユーチューブ|解説動画|動画コンテンツ|動画(?:が|は|も|を)?(?:ある|あり|見)/
    .test(normalized);
}

/**
 * True when 数学 is a real destination/topic ask — not a denial
 * like 「数学のページじゃないよね？」.
 */
export function isMathDestinationAsk(message: string): boolean {
  const normalized = normalizeSearchText(message);
  if (!/数学/.test(normalized)) return false;
  if (/数学.{0,15}(?:じゃな|ではな|ちゃう|ちがう|違う)/.test(normalized)) {
    return false;
  }
  if (/(?:じゃな|ではな).{0,10}数学/.test(normalized)) return false;
  return true;
}

/** App detail pages — only surface when the user clearly asks about that app. */
const APP_DEEP_PAGE_IDS: ReadonlySet<PageId> = new Set([
  'cli-practice',
  'table-tennis',
  'color-sort',
]);

function isAppDeepPageAsk(message: string, pageId: PageId): boolean {
  const normalized = normalizeSearchText(message);
  switch (pageId) {
    case 'cli-practice':
      return /cli|コマンド|ターミナル|(?:^|[^a-z])git(?:$|[^a-z])|npm|デプロイ/
        .test(normalized);
    case 'table-tennis':
      return /卓球|マッチメイク|対戦表|組み合わせ表/.test(normalized);
    case 'color-sort':
      return /カラーソート|色そろ|色並|ボトル.*パズル|パズル.*ボトル/.test(normalized);
    default:
      return true;
  }
}

export function selectRelevantKnowledge(
  query: string,
  currentPath: string,
): RankedGuideEntry[] {
  const currentPageId = resolveCurrentPageId(currentPath);
  const normalizedQuery = normalizeSearchText(query);

  const ranked = GUIDE_ENTRIES
    .map((entry) => ({
      entry,
      score: scoreGuideEntry(query, currentPageId, entry),
    }))
    .filter(({ score }) => score >= 3)
    .filter(({ entry }) => (
      !APP_DEEP_PAGE_IDS.has(entry.id)
      || isAppDeepPageAsk(query, entry.id)
      || currentPageId === entry.id
    ))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
    })
    .slice(0, 5);

  // YouTube / 解説動画 asks should not pull in weekly-math context
  // (including when the user denies math: 数学じゃないよね？).
  if (isExplanationVideoQuestion(query) && !isMathDestinationAsk(query)) {
    return ranked.filter(({ entry }) => entry.id !== 'weekly-math');
  }

  return ranked;
}

/** Drop stray 今週の数学 sentences from YouTube / 解説動画 answers. */
export function withoutOffTopicMathMention(
  message: string,
  answer: string,
): string {
  if (!isExplanationVideoQuestion(message)) return answer;
  if (isMathDestinationAsk(message)) return answer;
  if (!/今週の数学/.test(answer)) return answer;

  const cleaned = answer
    .split(/(?<=[。．！？!?])/)
    .filter((sentence) => !/今週の数学/.test(sentence))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > 0
    ? cleaned
    : '解説動画はサークルについてページからYouTubeへ行けます。';
}

/**
 * When the latest message alone misses keyword search, combine it with the
 * most recent user turns so short follow-ups like 「どこ？」 can still match.
 */
export function buildFollowUpSearchQuery(
  message: string,
  history: readonly { role: string; content: string }[],
  maxPriorUserMessages = 2,
): string | null {
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0 || maxPriorUserMessages <= 0) {
    return null;
  }

  const priorUserMessages = history
    .filter((entry) => entry.role === 'user')
    .map((entry) => entry.content.trim())
    .filter((content) => content.length > 0)
    .slice(-maxPriorUserMessages);

  if (priorUserMessages.length === 0) {
    return null;
  }

  const augmented = [...priorUserMessages, trimmedMessage].join(' ');
  return augmented === trimmedMessage ? null : augmented;
}

export function isDiscordQuestion(message: string): boolean {
  const normalized = normalizeSearchText(message);
  return (
    normalized.includes('discord')
    || normalized.includes('ディスコード')
    || normalized.includes('でぃすこーど')
    || normalized.includes('ディスコ')
  );
}

/** TTI / 豊田工業大学の正式名称・公式サイトを聞かれたとき. */
export function isToyotaTiQuestion(message: string): boolean {
  const normalized = normalizeSearchText(message)
    .replace(/[!！?？。．、,，〜~…・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    normalized.includes('豊田工業大学')
    || normalized.includes('豊田工大')
    || normalized.includes('豊工大')
    || normalized.includes('豊工')
    || normalized.includes('toyota technological')
    || normalized.includes('toyota-ti')
    || normalized.includes('toyotati')
  ) {
    return true;
  }

  // 「TTIって何／何の略」系（文頭以外でも）。
  return (
    /(?:^|[^a-z0-9])tti(?: intelligence)?(?:って何|とは|は何|なに|ってなに|何の略|の略)/.test(
      normalized,
    )
    || /tti.{0,8}略|略.{0,8}tti/.test(normalized)
    || normalized.includes('ttiって')
    || normalized.includes('ttiとは')
    || normalized.includes('ttiは何')
    || normalized === 'tti'
  );
}

const MAX_ASSISTANT_LINKS = 4;

export function createVerifiedLinks(
  modelPageIds: readonly string[],
  selected: readonly RankedGuideEntry[],
  modelContentIds: readonly string[] = [],
  selectedContent: readonly RankedContentEntry[] = [],
  options: {
    includeDiscord?: boolean;
    includeToyotaTi?: boolean;
    includeYoutube?: boolean;
    extraAllowedPageIds?: readonly PageId[];
  } = {},
): AssistantLink[] {
  const allowedPageIds = new Set<PageId>([
    ...selected.map(({ entry }) => entry.id),
    ...selectedContent.map(({ entry }) => entry.parentPageId),
    'contact',
    ...(options.extraAllowedPageIds ?? []),
  ]);
  const contentById = new Map(
    selectedContent.map(({ entry }) => [entry.id, entry] as const),
  );
  const seenHrefs = new Set<string>();
  const links: AssistantLink[] = [];

  const pushLink = (link: AssistantLink) => {
    if (links.length >= MAX_ASSISTANT_LINKS || seenHrefs.has(link.href)) return;
    seenHrefs.add(link.href);
    links.push(link);
  };

  if (options.includeDiscord) {
    pushLink({
      pageId: 'discord',
      title: 'Discord',
      href: DISCORD_INVITE_URL,
    });
  }

  if (options.includeYoutube) {
    pushLink({
      pageId: 'youtube',
      title: 'YouTube',
      href: YOUTUBE_CHANNEL_URL,
    });
  }

  if (options.includeToyotaTi) {
    pushLink({
      pageId: 'toyota-ti',
      title: '豊田工業大学',
      href: TOYOTA_TI_URL,
    });
  }

  for (const contentId of modelContentIds) {
    const entry = contentById.get(contentId);
    if (!entry) continue;
    if (!isSafeDynamicHref(entry.href, entry.kind)) continue;
    pushLink({
      pageId: entry.parentPageId,
      title: entry.title,
      href: entry.href,
    });
  }

  // Prefer contact when present — multi-page asks used to drop it at the 3-link cap.
  const orderedPageIds = modelPageIds.includes('contact')
    ? ['contact', ...modelPageIds.filter((id) => id !== 'contact')]
    : [...modelPageIds];

  for (const pageId of orderedPageIds) {
    if (
      !isPageId(pageId)
      || !allowedPageIds.has(pageId)
    ) {
      continue;
    }

    pushLink({
      pageId,
      title: KNOWN_PAGE_ROUTES[pageId].title,
      href: KNOWN_PAGE_ROUTES[pageId].href,
    });
  }

  return links;
}

/** Prompt / system-instruction disclosure asks. */
export function isPromptDisclosureQuestion(message: string): boolean {
  const normalized = normalizeSearchText(message);
  if (!/プロンプト|システムプロンプト|指示文|内部指示/.test(normalized)) {
    return false;
  }
  return /見せ|教え|なに|何|どんな|内容|開示|くれ|ちょうだい|知りたい|作ってる/.test(
    normalized,
  );
}

export function promptDisclosureAnswer(message: string): string {
  const normalized = normalizeSearchText(message);
  if (/使い方|どう使う|どうやって使う/.test(normalized)) {
    return '内部の指示文やプロンプトは公開していません。使い方は、知りたいことを短く入力して送信するだけです。';
  }
  return '内部の指示文やプロンプトは公開していません。サイトの使い方や活動内容なら案内できます。';
}

/** Strip leaked internal instruction phrases and broken small-talk mashups. */
export function sanitizeAssistantAnswer(answer: string): string {
  let text = answer.trim();
  if (!text) return text;

  // Model sometimes echoes system lines about Discord / URL injection.
  text = text
    .replace(/Discord(?:の参加)?リンクはシステムが別途[^。．！!？?]*[。．！!？?]?/g, '')
    .replace(/参加リンクはシステムが別途[^。．！!？?]*[。．！!？?]?/g, '')
    .replace(/システムが別途(?:付与|案内)[^。．！!？?]*[。．！!？?]?/g, '')
    .replace(/answerにURLを?書かないでください[。．！!？?]?/g, '')
    .replace(/URLはこのチャットでは案内できませんが[、,]?/g, '')
    .replace(/[（(]URLはここでは表示しません[）)]/g, '')
    .replace(/URLは(?:ここでは|このチャットでは)?表示しません[。．！!？?]?/g, '')
    .replace(/公式サイトは下の「お問い合わせ」で案内します[。．！!？?]?/g, '公式サイトは下のリンクからどうぞ。')
    .replace(/大学公式サイトは「お問い合わせ」から案内します[。．！!？?]?/g, '大学公式サイトは下のリンクからどうぞ。')
    .replace(/公式サイトは.{0,10}お問い合わせ.{0,8}案内します[。．！!？?]?/g, '公式サイトは下のリンクからどうぞ。')
    // Meta hedging when links are already attached.
    .replace(/必要であれば[^。．！!？?]{0,40}リンク[^。．！!？?]*[。．！!？?]?/g, '')
    .replace(/必要なら[^。．！!？?]{0,40}リンク[^。．！!？?]*[。．！!？?]?/g, '')
    .replace(/該当ページへのリンクをお伝えします[。．！!？?]?/g, '')
    .replace(/リンクをお伝えします[。．！!？?]?/g, '')
    // Parrot lead-ins like 「表示がおかしいとのこと、」
    .replace(/[^。．！!？?\s]{1,40}とのこと[、,]?/g, '')
    .replace(/こちらの公式窓口はお問い合わせページへお願いします[。．！!？?]?/g, '');

  // Broken look/empathy mashups like: うん、共感するね。」「難しいね」
  if (/[」』]/.test(text) && /難しいね|むずかしいね/.test(text)) {
    text = text.split(/[」』]/)[0]?.replace(/[「『]/g, '').trim() ?? text;
  }

  text = text
    .replace(/\s+/g, ' ')
    .replace(/[。．]{2,}/g, '。')
    .replace(/^[。．、,\s]+/, '')
    .trim();

  return text;
}

/**
 * Drop a redundant home link when another page is already linked,
 * unless the answer clearly points to the home/top page.
 * home+contact alone: keep contact when the answer mentions お問い合わせ,
 * otherwise keep home (e.g. greetings that also listed contact).
 */
export function withoutRedundantHomePageId(
  answer: string,
  pageIds: readonly string[],
): string[] {
  if (!pageIds.includes('home')) {
    return [...pageIds];
  }

  if (/ホーム|トップページ|サイトのトップ|このサイト全体|主なページ/.test(answer)) {
    return [...pageIds];
  }

  const others = pageIds.filter((id) => id !== 'home');
  if (others.length === 0) {
    return [...pageIds];
  }

  if (others.length === 1 && others[0] === 'contact') {
    if (/お問い合わせ|お問合せ/.test(answer)) {
      return pageIds.filter((id) => id !== 'home');
    }
    return pageIds.filter((id) => id !== 'contact');
  }

  return pageIds.filter((id) => id !== 'home');
}

/** Page-inventory questions: list names in the answer text; chips are redundant. */
export function isPageInventoryQuestion(message: string): boolean {
  const normalized = normalizeSearchText(message);
  return /なんのページ|どんなページ|ページがある|ページ一覧|サイトマップ|主なページ|サイト構成|ページ[^。．]{0,20}一覧|一覧[^。．]{0,12}ページ/
    .test(normalized);
}

/** Page ids the user explicitly asked for in a follow-up (どこ？ etc.). */
export function followUpAskedPageIds(normalizedMessage: string): PageId[] {
  const ids: PageId[] = [];
  const push = (pageId: PageId) => {
    if (!ids.includes(pageId)) ids.push(pageId);
  };

  // Synonyms for site destinations (not eval-specific phrases).
  if (/お問い合わせ|お問合せ|問い合わせ|問合せ|連絡/.test(normalizedMessage)) {
    push('contact');
  }
  if (/ニュース|お知らせ/.test(normalizedMessage)) push('news');
  // 「板どこ」等。単独の「板」は他語に当たるので案内語と一緒のときだけ。
  if (/掲示板|板(?=どこ|って|は|も|、|？|\?)/.test(normalizedMessage)) {
    push('board');
  }
  if (/アプリ|プロダクト一覧|作品一覧/.test(normalizedMessage)) push('apps');
  if (/開発/.test(normalizedMessage)) push('development');
  if (isMathDestinationAsk(normalizedMessage)) push('weekly-math');
  if (/ゲーム/.test(normalizedMessage)) push('game-community');
  if (/discord|ディスコ/.test(normalizedMessage)) push('contact');

  return ids;
}

/** True when the answer directs the user to a page, not merely lists its name. */
function isPageDestination(answer: string, pageName: string): boolean {
  const escaped = pageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?:詳しくは|ぜひ|こちら[のは]?)${escaped}|${escaped}(?:へ|に|ページ|一覧|をご覧|を確認|からどうぞ|もどうぞ|で確認)`,
  ).test(answer);
}

/** If the answer directs to a page, ensure that page id is present for linking. */
export function withMentionedPageIds(
  answer: string,
  pageIds: readonly string[],
): string[] {
  const ids = [...pageIds];
  const push = (pageId: PageId) => {
    if (!ids.includes(pageId)) ids.push(pageId);
  };

  // Contact is often named lightly ("お問い合わせからどうぞ").
  if (/お問い合わせ|お問合せ/.test(answer)) push('contact');
  // Other pages often appear in inventory lists (「アプリ」「サークルについて」など) —
  // only link when the answer directs the user there.
  if (isPageDestination(answer, 'サークルについて')) push('about');
  if (isPageDestination(answer, '今週の数学')) push('weekly-math');
  if (isPageDestination(answer, 'ゲームコミュニティ')) push('game-community');
  if (isPageDestination(answer, '掲示板')) push('board');
  if (isPageDestination(answer, 'お知らせ')) push('news');
  if (isPageDestination(answer, '開発について')) push('development');
  if (
    /アプリページ|アプリ一覧|アプリから/.test(answer)
    || isPageDestination(answer, 'アプリ')
  ) {
    push('apps');
  }
  if (isPageDestination(answer, 'ホーム')) push('home');

  return ids;
}

/**
 * Drop contact when the answer never mentions it and a more specific page
 * is already linked (model often pads contact from the always-allowed set).
 */
export function withoutRedundantContactPageId(
  answer: string,
  pageIds: readonly string[],
): string[] {
  if (!pageIds.includes('contact')) {
    return [...pageIds];
  }
  if (/お問い合わせ|お問合せ/.test(answer)) {
    return [...pageIds];
  }
  const hasSpecific = pageIds.some((id) => id !== 'contact' && id !== 'home');
  if (!hasSpecific) {
    return [...pageIds];
  }
  return pageIds.filter((id) => id !== 'contact');
}

/**
 * When the model over-routes to contact-only despite a strong guide match,
 * keep the top matched page in front of contact.
 */
export function withTopGuidePageId(
  answer: string,
  pageIds: readonly string[],
  selected: readonly RankedGuideEntry[],
): string[] {
  const top = selected[0]?.entry;
  if (!top || top.id === 'contact') {
    return [...pageIds];
  }

  const contactOnlyIntent = /不具合|表示が|重なって|見えにく|修正依頼|参加希望|参加方法|入りたい|名簿|何人|メンバー|取材|提携|連携/
    .test(answer)
    && !/サークルについて|今週の数学|ゲームコミュニティ|お知らせ|掲示板|アプリ|開発について|ホーム/
      .test(answer);

  const hasGuideFact = /無料|土日|他大学|歓迎|YouTube|VALORANT|APEX|Minecraft|一覧|確認できます|公開情報/
    .test(answer);

  const pureContactAnswer = /お問い合わせ|お問合せ/.test(answer)
    && !hasGuideFact
    && !/サークルについて|今週の数学|ゲームコミュニティ|お知らせ|掲示板|アプリ|開発について|ホーム|Discord/
      .test(answer);

  if ((contactOnlyIntent || pureContactAnswer) && !hasGuideFact) {
    return [...pageIds];
  }

  const ids = [...pageIds];
  if (ids.includes(top.id)) {
    return ids;
  }

  // Only repair empty / contact-only / home-only selections.
  // Home-only is often a lazy fallback when a more specific page matched.
  if (ids.length === 0) {
    return [top.id];
  }
  if (ids.length === 1 && ids[0] === 'contact') {
    return [top.id, 'contact'];
  }
  if (
    ids.length === 1
    && ids[0] === 'home'
    && top.id !== 'home'
    && !/ホーム|トップページ|サイトのトップ|主なページ/.test(answer)
  ) {
    return [top.id];
  }

  return ids;
}

function isSafeDynamicHref(href: string, kind: ContentKind): boolean {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('?') || href.includes('#')) {
    return false;
  }

  if (kind === 'news') {
    return /^\/news\/[^/]+$/.test(href);
  }
  if (kind === 'board') {
    return /^\/board\/[^/]+$/.test(href);
  }
  if (kind === 'weekly-math') {
    return /^\/weekly-math\/[^/]+$/.test(href);
  }
  return false;
}
