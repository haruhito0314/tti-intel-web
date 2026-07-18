import {
  ASSISTANT_FACTS,
  type AssistantFactId,
  type ExternalLinkId,
} from './facts.js';
import {
  DISCORD_INVITE_URL,
  KNOWN_PAGE_ROUTES,
  TOYOTA_TI_URL,
  YOUTUBE_CHANNEL_URL,
} from './runtimeCatalog.js';
import type {
  AssistantLink,
  AssistantResponse,
  HistoryMessage,
  PageId,
} from './types.js';
import { PAGE_IDS } from './types.js';

export type AssistantPlanMode =
  | 'answer'
  | 'navigate'
  | 'list'
  | 'compare'
  | 'content-search'
  | 'small-talk'
  | 'protected'
  | 'unsupported';

export type AssistantPlanConfidence = 'high' | 'low' | 'none';

export interface AssistantQueryPlan {
  mode: AssistantPlanMode;
  confidence: AssistantPlanConfidence;
  requiresHistory: boolean;
  factIds: AssistantFactId[];
  excludedFactIds: AssistantFactId[];
  pageIds: PageId[];
  excludedPageIds: PageId[];
  externalLinks: ExternalLinkId[];
  excludedExternalLinks: ExternalLinkId[];
  suppressLinks: boolean;
}

interface MutablePlanState {
  facts: AssistantFactId[];
  excludedFacts: AssistantFactId[];
  excludedPages: PageId[];
  excludedExternal: ExternalLinkId[];
  navigationRequested: boolean;
  linksRejected: boolean;
  forcePlanner: boolean;
  historyDependent: boolean;
}

const PAGE_ID_SET: ReadonlySet<string> = new Set(PAGE_IDS);

const EXTERNAL_LINKS: Readonly<Record<ExternalLinkId, AssistantLink>> = {
  discord: {
    pageId: 'discord',
    title: 'Discord',
    href: DISCORD_INVITE_URL,
  },
  'toyota-ti': {
    pageId: 'toyota-ti',
    title: '豊田工業大学',
    href: TOYOTA_TI_URL,
  },
  youtube: {
    pageId: 'youtube',
    title: 'YouTube',
    href: YOUTUBE_CHANNEL_URL,
  },
};

const UNSUPPORTED_ANSWER = 'このAI Assistantでは、TTI Intelligenceの活動や参加方法、サイト内ページについて案内できます。';

/** Strip punctuation for entity matching, including dotted forms like T.T.I. */
export function normalizeAssistantQuery(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/[\s\u3000!！?？。．.、,，〜~…・:：;；/／\\()[\]{}「」『』【】"'`´]/g, '');
}

function normalizeAssistantQueryClauses(value: string): string[] {
  const protectedValue = value
    .normalize('NFKC')
    .replace(/T\s*\.\s*T\s*\.\s*I\s*\.?/gi, 'TTI');

  return protectedValue
    .split(/[。.!！?？:：;；\r\n]+/)
    .map(normalizeAssistantQuery)
    .filter((clause) => clause.length > 0);
}

function includesAny(value: string, aliases: readonly string[]): boolean {
  return aliases.some((alias) => value.includes(normalizeAssistantQuery(alias)));
}

const CIRCLE_ALIASES = [
  'TTI Intelligence',
  'TTIインテリジェンス',
] as const;

const UNIVERSITY_ALIASES = [
  '豊田工業大学',
  '豊田工大',
  '豊工大',
  '豊工',
  'Toyota Technological Institute',
] as const;

const UNIVERSITY_CLUB_SCOPE_ENTITIES = [
  ...UNIVERSITY_ALIASES.map(normalizeAssistantQuery),
  '大学',
  'tti',
] as const;

const UNIVERSITY_CLUB_SCOPE_WORDS = ['サークル', '部活', 'クラブ'] as const;

function asksAboutUniversityClubs(
  normalizedClauses: readonly string[],
): boolean {
  for (const value of normalizedClauses) {
    for (const entity of UNIVERSITY_CLUB_SCOPE_ENTITIES) {
      let entityIndex = value.indexOf(entity);

      while (entityIndex !== -1) {
        const entityPrefix = value.slice(Math.max(0, entityIndex - 2), entityIndex);
        const genericUniversityInOtherUniversity = entity === '大学' && (
          /(?:他|他の|別|別の)$/.test(entityPrefix)
        );
        const gapStart = entityIndex + entity.length;

        if (!genericUniversityInOtherUniversity) {
          for (const clubWord of UNIVERSITY_CLUB_SCOPE_WORDS) {
            const clubIndex = value.indexOf(clubWord, gapStart);
            if (clubIndex === -1) continue;

            const gap = value.slice(gapStart, clubIndex);
            if (
              gap.length <= 24
              && !/所属|出身|正式名称|英語名|略称|場所|住所|所在地|アクセス|それから|加えて|および|ならびに/.test(gap)
            ) {
              return true;
            }
          }
        }

        entityIndex = value.indexOf(entity, entityIndex + entity.length);
      }
    }
  }

  return false;
}

function detectIdentityEntities(value: string): {
  circlePhrase: boolean;
  circleCorrection: boolean;
  circleNamed: boolean;
  bareTti: boolean;
  universityNamed: boolean;
  genericUniversityNamed: boolean;
} {
  const circlePhrase = includesAny(value, CIRCLE_ALIASES);
  const circleCorrection = /(?:intelligence|インテリジェンス)(?:の)?(?:ほう|方)/.test(value);
  const circleNamed = circlePhrase || circleCorrection || /サークル|学生コミュニティ/.test(value);
  const withoutCirclePhrase = value
    .replaceAll('ttiintelligence', '')
    .replaceAll('ttiインテリジェンス', '');
  const bareTti = withoutCirclePhrase.includes('tti');
  const universityNamed = includesAny(value, UNIVERSITY_ALIASES) || /大学(?:の|名の?)tti/.test(value);
  const genericUniversityNamed = /大学|豊工/.test(value);

  return {
    circlePhrase,
    circleCorrection,
    circleNamed,
    bareTti,
    universityNamed,
    genericUniversityNamed,
  };
}

function addUnique<T>(target: T[], value: T): void {
  if (!target.includes(value)) target.push(value);
}

function addFact(state: MutablePlanState, factId: AssistantFactId): void {
  addUnique(state.facts, factId);
}

function excludeFact(state: MutablePlanState, factId: AssistantFactId): void {
  addUnique(state.excludedFacts, factId);
}

function excludePage(state: MutablePlanState, pageId: PageId): void {
  addUnique(state.excludedPages, pageId);
}

function excludeExternal(
  state: MutablePlanState,
  externalLink: ExternalLinkId,
): void {
  addUnique(state.excludedExternal, externalLink);
}

function countOccurrences(value: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = value.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const FACT_EXCLUSION_ALIASES: readonly [AssistantFactId, readonly string[]][] = [
  ['video.youtube', ['YouTube', 'ユーチューブ', '解説動画']],
  ['page.weekly-math', ['今週の数学', '数学ページ', '数学のページ']],
  ['math.answer', ['数学の答え', '数学の解答', '解答', 'ヒント']],
  ['contact.discord', ['Discord', 'ディスコード', 'ディスコ']],
  ['contact.form', ['お問い合わせ', '問い合わせフォーム', '連絡先', '連絡方法']],
  ['page.contact', ['お問い合わせページ', '問い合わせページ', '連絡ページ']],
  ['contact.phone', ['電話番号', '電話', '携帯番号']],
  ['contact.instagram', ['Instagram', 'インスタグラム', 'インスタ']],
  ['contact.other-social', ['LINE', 'X', 'Twitter', 'ツイッター']],
  ['page.board', ['掲示板', '匿名投稿']],
  ['page.news', ['お知らせ', 'ニュース', '告知', '活動報告', '技術記事']],
  ['page.color-sort', ['カラーソート', '色そろえ', '色をそろえるゲーム']],
  ['page.table-tennis', ['卓球', '対戦表', '組み合わせ表']],
  ['page.cli-practice', ['CLI練習', 'CLI Practice', 'ターミナル練習']],
  ['page.apps', ['アプリ一覧', '作品一覧', '制作物一覧']],
  ['page.development', ['開発ページ', '開発について']],
  ['page.game-community', ['ゲームコミュニティ', 'ゲームページ']],
  ['page.about', ['サークルについてページ', '活動紹介ページ']],
  ['page.home', ['ホーム', 'トップページ']],
  ['membership.cost', ['会費', '参加費', '入会費']],
  ['membership.tool-cost', ['AIツール代', 'ツール代', 'サブスク代']],
  ['membership.beginner', ['初心者', '未経験']],
  ['game.beginner', ['ゲーム初心者', 'ゲーム未経験']],
  ['membership.eligibility', ['参加条件', '参加対象', '他大学', '他校', '学部', '学年']],
  ['membership.visit', ['見学', '体験']],
  ['activity.schedule', ['活動日', '活動頻度', '曜日', 'スケジュール']],
  ['activity.location', ['活動場所', '集合場所', '集合先']],
  ['activity.summary', ['活動内容', '主な活動']],
  ['activity.ai-tools', ['AIツール', 'MCP', 'Codex', 'Claude Code', 'Antigravity']],
  ['video.request', ['動画制作', '動画の依頼', '動画編集']],
  ['university.location', ['大学の場所', '大学の所在地', '大学の住所', 'キャンパス']],
  ['university.identity', ['大学の英語名', '豊田工業大学']],
];

function asksForDefinition(value: string): boolean {
  return /って何|とは|は何|なに|どんな(?:団体|大学|サークル)|正式名称|英語名|何の略|略称/.test(value);
}

function asksForLocation(value: string): boolean {
  return /場所|どこ|住所|所在地|キャンパス|アクセス/.test(value);
}

function asksForNavigation(value: string): boolean {
  return /どこ|場所|見たい|見る|読みたい|開きたい|開け|行きたい|一覧|ページ|リンク|url|案内|アクセス/.test(value);
}

function asksForPageInventory(value: string): boolean {
  return (
    /ページ(?:を|名を?)?(?:全部|一覧)|ページ名.{0,6}一覧|全部(?:の)?ページ|どんなページ|何のページ|なんのページ|ページがある|ページ構成|サイト構成|サイトマップ|主なページ/.test(value)
  );
}

function isExplicitOutOfScope(value: string): boolean {
  const programmingLanguage = /python|javascript|typescript|java|c\+\+|rust|golang|react|swift|kotlin|php|ruby|sql/.test(value);
  const codeArtifact = /コード|プログラム|スクリプト/.test(value);
  const creationRequest = /書いて|作って|実装して|生成して|組んで/.test(value);
  return (
    creationRequest
    && (programmingLanguage || codeArtifact)
  ) || /天気|ニュース速報|株価|為替|翻訳して|作文して|宿題を解いて|銀河|宇宙|惑星/.test(value);
}

function detectExclusions(value: string, state: MutablePlanState): void {
  const rejection = '(?:ではなく|じゃなくて?|じゃない|ではない|以外|聞いていない|聞いていません|聞いてません|聞いてない|いらない|要らない|必要ない|不要|なし|抜き|除いて|除外|やめて)';

  for (const [factId, aliases] of FACT_EXCLUSION_ALIASES) {
    const rejected = aliases.some((alias) => {
      const normalizedAlias = normalizeAssistantQuery(alias);
      return new RegExp(
        `${escapeRegExp(normalizedAlias)}.{0,12}${rejection}`,
      ).test(value);
    });
    if (!rejected) continue;
    excludeFact(state, factId);
    if (factId.startsWith('page.')) {
      for (const pageId of ASSISTANT_FACTS[factId].pageIds) {
        excludePage(state, pageId);
      }
    }
  }
  const youtubeRejected = new RegExp(`(?:youtube|ユーチューブ)(?:のリンク)?(?:は|が)?${rejection}`).test(value);
  const mathRejected = new RegExp(`(?:今週の数学|数学)(?:のページ)?(?:は|が)?${rejection}`).test(value);
  const discordRejected = new RegExp(`(?:discord|ディスコード|でぃすこーど|ディスコ)(?:のリンク)?(?:は|が)?${rejection}`).test(value);
  const contactRejected = new RegExp(`(?:お問い合わせ|お問合せ|問い合わせ|問合せ|連絡先|連絡方法)(?:フォーム)?(?:は|が)?${rejection}`).test(value);
  const boardRejected = new RegExp(`(?:掲示板)(?:のページ)?(?:は|が)?${rejection}`).test(value);
  const newsRejected = new RegExp(`(?:お知らせ|ニュース|告知)(?:のページ)?(?:は|が)?${rejection}`).test(value);
  const colorSortRejected = new RegExp(`(?:カラーソート|色そろえ|色をそろえるゲーム)(?:は|が)?${rejection}`).test(value);
  const tableTennisRejected = new RegExp(`(?:卓球|対戦表|組み合わせ表)(?:のアプリ)?(?:は|が)?${rejection}`).test(value);
  const membershipCostRejected = new RegExp(`(?:会費|参加費|入会費)(?:は|が)?${rejection}`).test(value);
  const toolCostRejected = new RegExp(`(?:aiツール代|ツール代|サブスク代)(?:は|が)?${rejection}`).test(value);
  const beginnerRejected = /(?:初心者|未経験).{0,12}(?:ではなく|じゃなくて?|聞いていない|聞いていません|聞いてません|聞いてない|不要|除いて)/.test(value);
  const phoneRejected = new RegExp(`(?:電話番号|電話|携帯番号)(?:は|が)?${rejection}`).test(value);

  if (youtubeRejected) {
    excludeFact(state, 'video.youtube');
    excludeExternal(state, 'youtube');
  }
  if (mathRejected) {
    excludeFact(state, 'page.weekly-math');
    excludeFact(state, 'math.answer');
    excludePage(state, 'weekly-math');
  }
  if (discordRejected) {
    excludeFact(state, 'contact.discord');
    excludeExternal(state, 'discord');
  }
  if (contactRejected) {
    excludeFact(state, 'contact.form');
    excludeFact(state, 'page.contact');
    excludePage(state, 'contact');
  }
  if (boardRejected) {
    excludeFact(state, 'page.board');
    excludePage(state, 'board');
  }
  if (newsRejected) {
    excludeFact(state, 'page.news');
    excludePage(state, 'news');
  }
  if (colorSortRejected) {
    excludeFact(state, 'page.color-sort');
    excludePage(state, 'color-sort');
  }
  if (tableTennisRejected) {
    excludeFact(state, 'page.table-tennis');
    excludePage(state, 'table-tennis');
  }
  if (membershipCostRejected) excludeFact(state, 'membership.cost');
  if (toolCostRejected) excludeFact(state, 'membership.tool-cost');
  if (beginnerRejected) excludeFact(state, 'membership.beginner');
  if (phoneRejected) excludeFact(state, 'contact.phone');

  state.linksRejected = /(?:リンク|url)(?:は|が)?(?:いらない|要らない|不要|なし|抜き|結構|付けない|つけない|貼らない|載せない|付けず|つけず|貼らず|載せず)|リンクなし|リンク不要/.test(value);
}

function detectIdentityFacts(
  value: string,
  normalizedClauses: readonly string[],
  state: MutablePlanState,
): boolean {
  const {
    circlePhrase,
    circleCorrection,
    circleNamed,
    bareTti,
    universityNamed,
    genericUniversityNamed,
  } = detectIdentityEntities(value);
  const comparisonCue = /違|同じ|関係|比較|区別|別名|そのもの/.test(value);
  const ttiCount = countOccurrences(value, 'tti');
  const identityComparison = (
    circleNamed
    && (universityNamed || genericUniversityNamed || bareTti || ttiCount >= 2)
    && comparisonCue
  );
  const universityClubScope = (
    asksAboutUniversityClubs(normalizedClauses)
    && !circlePhrase
    && !circleCorrection
    && !identityComparison
  );

  if (universityClubScope) {
    state.facts = ['university.clubs-scope'];
    return true;
  }

  if (identityComparison) {
    addFact(state, 'identity.tti-difference');
  } else {
    if (circleCorrection) {
      addFact(state, 'circle.identity');
    } else {
      if (circlePhrase && !bareTti && !universityNamed) {
        addFact(state, 'circle.identity');
      }

      if (bareTti) {
        addFact(state, 'university.abbreviation');
      } else if (universityNamed && asksForDefinition(value)) {
        addFact(state, 'university.identity');
      }
    }
  }

  if (asksForLocation(value)) {
    if (bareTti || universityNamed) {
      addFact(state, 'university.location');
    } else if (
      (circlePhrase || circleCorrection || /サークル|活動/.test(value))
      && !/ページ|リンク|url|一覧/.test(value)
      && !/活動報告|記事|ニュース|お知らせ|告知|読む|閲覧/.test(value)
    ) {
      addFact(state, 'activity.location');
    }
  }

  return false;
}

function detectMembershipAndActivityFacts(
  value: string,
  state: MutablePlanState,
): void {
  const toolCost = /(?:ai)?ツール(?:の)?(?:代|料金|費用|月額)|サブスク(?:の)?(?:代|料金|費用|月額)|(?:aiサービス|生成ai).{0,8}(?:代|料金|費用|月額|自己負担|自分持ち)|ツール.*(?:各自負担|自己負担|自分持ち)/.test(value);
  const membershipContext = /サークル|参加|入会|入部|活動日|初心者|未経験/.test(value);
  const membershipCost = /会費|参加費|入会費|入会.{0,8}(?:料金|無料|お金|費用)|参加.{0,8}(?:料金|無料|お金|費用)|サークル.{0,8}(?:料金|無料|お金|費用)|入る.{0,8}(?:料金|無料|お金|費用)|お金.{0,8}(?:必要|かかる)/.test(value)
    || (membershipContext && !toolCost && /(?:費用|料金)(?:は|が|も|って|について|いくら|かかる|必要)/.test(value));

  if (membershipCost) addFact(state, 'membership.cost');
  if (toolCost) addFact(state, 'membership.tool-cost');

  if (/活動日|活動頻度|いつ(?:活動|集ま|やって)|毎週いつ|曜日|土日|週末|平日|何時|スケジュール|(?:毎回|毎週).{0,8}(?:参加|出席).{0,8}(?:必須|必要)|参加.{0,8}(?:必須|自由)|出席.{0,8}(?:必須|自由)/.test(value)) {
    addFact(state, 'activity.schedule');
  }
  const gameBeginner = /ゲーム.{0,8}(?:初心者|未経験)|(?:初心者|未経験).{0,8}ゲーム/.test(value);
  const programmingContext = /コード|プログラミング|開発/.test(value);
  const noProgrammingExperience = /経験(?:が|は|も)?(?:ない|なく)|一度も.{0,12}(?:した|やった|書いた)こと(?:が|は)?(?:ない|なく)|書いたこと(?:が|は)?(?:ない|なく)|初めて/.test(value);
  const beginnerParticipationCue = /参加|入会|入部|入れる|大丈夫|問題ない|ついていけ|サポート/.test(value);
  if (gameBeginner) {
    addFact(state, 'game.beginner');
  } else if (
    (/(?:初心者|未経験)/.test(value) && beginnerParticipationCue)
    || (programmingContext && noProgrammingExperience)
  ) {
    addFact(state, 'membership.beginner');
  }
  const participationEligibility = /他(?:の)?大学|他大|他校|別(?:の)?大学|学校が違|学部|学年|文系|理系|誰(?:が|でも)?参加/.test(value)
    || /学生だけ.{0,8}(?:参加|入れる|対象)|(?:参加|入れる|対象).{0,8}学生だけ/.test(value);
  if (participationEligibility) {
    addFact(state, 'membership.eligibility');
  }
  if (/見学|体験/.test(value)) addFact(state, 'membership.visit');
  if (/応用情報|応用情報技術者|資格試験/.test(value)) {
    addFact(state, 'activity.certification-study');
  }
  if (/(?:バイト|アルバイト|就活|就職活動).{0,10}(?:サポート|支援|相談)|(?:サポート|支援).{0,10}(?:バイト|就活|就職)/.test(value)) {
    addFact(state, 'membership.career-support');
  }
  if (/(?:メンバー|部員).{0,10}(?:何人|人数|名簿|公開|教えて)|(?:何人|人数).{0,8}(?:いる|います|公開)/.test(value)) {
    addFact(state, 'contact.members-private');
  }

  const toolsAsked = /codex|claude(?:code)?|antigravity|mcp|生成ai|aiコーディングツール|どんなaiツール|aiツールを使/.test(value);
  if (toolsAsked && !toolCost) addFact(state, 'activity.ai-tools');

  if (/どんな活動|活動内容|何(?:を|やって|して|作って?)る|普段.{0,8}(?:何|なに).{0,6}(?:作|して)|なんのサークル|何のサークル/.test(value)) {
    addFact(state, 'activity.summary');
  }

  if (
    /(?:サークル|ttiintelligence|ttiインテリジェンス).{0,10}(?:場所|どこ|集ま)|どこで活動|(?:対面|活動).{0,8}(?:集合先|集合場所|拠点)|集合先|集合場所/.test(value)
    && !state.facts.includes('university.location')
    && !/活動報告|記事|ニュース|お知らせ|告知|読む|閲覧/.test(value)
  ) {
    addFact(state, 'activity.location');
  }
}

function detectContactAndSocialFacts(value: string, state: MutablePlanState): void {
  if (/電話番号|電話で|(?:代表者|運営|サークル).{0,8}(?:携帯|電話)|携帯番号/.test(value)) {
    addFact(state, 'contact.phone');
  }

  if (/表示.{0,6}(?:おかしい|崩|重な|見え)|不具合|バグ|エラー|壊れて|修正して/.test(value)) {
    addFact(state, 'contact.bug');
  }

  const discordAsked = includesAny(value, [
    'Discord',
    'ディスコード',
    'でぃすこーど',
    'ディスコ',
  ]);
  if (discordAsked && !state.excludedExternal.includes('discord')) {
    addFact(state, 'contact.discord');
  }

  if (/instagram|インスタグラム|インスタ/.test(value)) {
    addFact(state, 'contact.instagram');
  }
  if (/(?:line|x|twitter|ツイッター).{0,8}(?:ある|公式|アカウント|どこ|教えて)/.test(value)) {
    addFact(state, 'contact.other-social');
  }

  const contactAsked = /お問い合わせ|お問合せ|問い合わせ|問合せ|問い合わせフォーム|連絡フォーム|連絡先|連絡方法|メール|(?:^|連絡|問い合わせ)フォーム|フォーム.{0,8}(?:連絡|問い合わせ|送信)|参加(?:の)?(?:方法|手順)|参加希望|入りたい|入り方|入会(?:方法|手順)|どうやって入(?:る|会)|入部|加入|提携|協業|コラボ|取材|スポンサー/.test(value);
  const pureContactPageNavigation = /(?:お問い合わせ|お問合せ|問い合わせ|問合せ|連絡用?)(?:の)?ページ/.test(value)
    && asksForNavigation(value)
    && !/フォーム|メール|参加|入会|入部|加入|相談|提携|協業|コラボ|取材|スポンサー/.test(value);
  if (
    contactAsked
    && !pureContactPageNavigation
    && !state.excludedPages.includes('contact')
    && !state.facts.includes('contact.phone')
    && !state.facts.includes('contact.bug')
  ) {
    addFact(state, 'contact.form');
  }
}

function detectVideoAndMathFacts(value: string, state: MutablePlanState): void {
  const youtubeExcluded = state.excludedExternal.includes('youtube');
  const mathExcluded = state.excludedPages.includes('weekly-math');
  const videoCreation = /(?:動画|映像).{0,10}(?:作って|制作して|制作依頼|編集して|編集依頼|お願い|頼みたい)/.test(value)
    && !/(?:作って|制作).{0,8}(?:じゃなく|ではなく)/.test(value);
  const videoViewing = /youtube|ユーチューブ|解説動画|動画.{0,8}(?:見たい|見る|どこ|場所|ある|視聴|再生|チャンネル)/.test(value);

  if (videoCreation) addFact(state, 'video.request');
  if (videoViewing && !youtubeExcluded) {
    addFact(state, 'video.youtube');
  }

  const mathMentioned = /今週の数学|数学|数学の問題|今週の問題/.test(value);
  const mathAnswer = /(?:数学|問題).{0,8}(?:答え|解答|解説|ヒント)|(?:答え|解答|ヒント).{0,8}(?:教えて|見たい|ほしい|欲しい)/.test(value);
  if (!mathExcluded && (mathMentioned || mathAnswer)) {
    if (
      mathAnswer
      && !/(?:答え|解答|ヒント).{0,5}(?:じゃなく|ではなく)/.test(value)
    ) {
      addFact(state, 'math.answer');
    } else {
      addFact(state, 'page.weekly-math');
      state.navigationRequested = true;
    }
  }
}

function detectPageFacts(value: string, state: MutablePlanState): void {
  const navigation = asksForNavigation(value);

  const addPage = (factId: AssistantFactId) => {
    addFact(state, factId);
    state.navigationRequested = true;
  };

  if (/トップページ|ホームに戻|サイトのトップ|サイトの入口|最初のページ/.test(value)) addPage('page.home');
  if (/サークルについて(?:ページ)?/.test(value) && navigation) addPage('page.about');
  if (/(?:お知らせ|ニュース|告知)/.test(value) && navigation) addPage('page.news');
  if (/イベント情報|技術記事|活動報告/.test(value) && (navigation || /どこ|読む|見たい|最新/.test(value))) {
    addPage('page.news');
  }
  if (/掲示板|(?:^|[^文字])板(?:どこ|って|は|も)|匿名.{0,8}(?:書|投稿)|(?:書き込み|投稿).{0,8}匿名/.test(value) && (navigation || /質問|投稿|匿名|書/.test(value))) {
    addPage('page.board');
  }
  if (/開発/.test(value) && (navigation || /どんな開発|開発活動|web開発|アプリ開発/.test(value))) {
    addPage('page.development');
  }
  if (/ゲームコミュニティ|ゲーム(?:活動|交流)?(?:の)?(?:ページ|場所|どこ)|valorant|apex|minecraft|マインクラフト/.test(value)) {
    addPage('page.game-community');
  }

  const tableTennisAsked = /卓球|対戦表|組み合わせ表|matchmaker/.test(value);
  const colorSortAsked = /カラーソート|色.{0,4}そろ|色並べ|ボトル.{0,8}(?:パズル|ゲーム)|色.{0,8}ボトル/.test(value);
  const cliPracticeAsked = /clipractice|cli練習|コマンド(?:ライン)?(?:を)?練習|ターミナル練習|git.{0,8}(?:コマンド|練習|npm)|ブラウザ.{0,10}(?:git|コマンド)/.test(value);
  if (tableTennisAsked) addPage('page.table-tennis');
  if (colorSortAsked) addPage('page.color-sort');
  if (cliPracticeAsked) addPage('page.cli-practice');

  const appInventoryAsked = /どんなアプリ|アプリ一覧|作品一覧|制作物一覧|toeic|トーイック/.test(value)
    || (/アプリ|作品|制作物|プロダクト|成果物/.test(value)
      && navigation
      && !tableTennisAsked
      && !colorSortAsked
      && !cliPracticeAsked);
  if (appInventoryAsked) addPage('page.apps');

  if (/お問い合わせページ|問い合わせページ/.test(value) && !state.excludedPages.includes('contact')) {
    addPage('page.contact');
  }
  if (/連絡用?(?:の)?ページ|連絡ページ/.test(value) && navigation && !state.excludedPages.includes('contact')) {
    addPage('page.contact');
  }
}

function detectMetaFacts(value: string, state: MutablePlanState): void {
  if (/プロンプト|システムプロンプト|内部指示|指示文|systemprompt|systeminstructions|previousinstructions/.test(value)) {
    addFact(state, 'prompt.protected');
    return;
  }

  if (/何ができる|なにができる|できること|何を聞け|何が聞け|何の案内|どんな案内|このチャット/.test(value)) {
    addFact(state, 'assistant.capabilities');
  }
  if (/使い方|どう使う|質問(?:の)?仕方|どうやって質問/.test(value)) {
    addFact(state, 'assistant.usage');
  }
  if (/このサイト(?:は|って)?(?:何|なに)|何のサイト|なんのサイト|サイトについて/.test(value)) {
    addFact(state, 'site.description');
  }
}

function detectSmallTalk(value: string, state: MutablePlanState): void {
  if (state.facts.length > 0) return;

  if (/^(?:こんにちは|こんばんは|おはよう|はじめまして|hello|hi|hey|やあ|やっほー?|おっす|こんちゃ)/.test(value)) {
    addFact(state, 'small-talk.greeting');
    return;
  }
  if (/^(?:本当に|ほんとに|とても|すごく)?(?:ありがとう|ありがと|どうも|助かった|助かりました|サンキュー|thanks|thankyou|了解|なるほど|おつ)/.test(value)) {
    addFact(state, 'small-talk.thanks');
  }
}

function inferEllipticalFollowUp(
  value: string,
  history: readonly HistoryMessage[],
  state: MutablePlanState,
): void {
  if (state.facts.length > 0 || history.length === 0) return;
  const factCountBeforeHistory = state.facts.length;
  const last = normalizeAssistantQuery(history.at(-1)?.content ?? '');

  if (/(?:住所|所在地|アクセス)(?:も|は|を|お願い|教えて)?/.test(value)) {
    if (/豊田工業大学|豊田工大|豊工|tti/.test(last)) {
      addFact(state, 'university.location');
      state.historyDependent = true;
      return;
    }
  }

  if (/(?:解答|答え|ヒント|解説)(?:のほう|の方)?(?:は|も|お願い|教えて)?/.test(value)) {
    if (/数学|問題/.test(last)) {
      addFact(state, 'math.answer');
      state.historyDependent = true;
      return;
    }
  }

  const locationProbe = /^(?:どこ|場所|リンク)(?:は|なの|ですか)?$/.test(value)
    || /(?:どのあたり|集合先|集合場所).{0,8}(?:集ま|活動)?/.test(value);
  if (locationProbe) {
    if (/数学|問題/.test(last)) addFact(state, 'page.weekly-math');
    else if (/youtube|ユーチューブ|解説動画|動画/.test(last)) addFact(state, 'video.youtube');
    else if (/掲示板/.test(last)) addFact(state, 'page.board');
    else if (/お知らせ|ニュース|告知|活動報告/.test(last)) addFact(state, 'page.news');
    else if (/アプリ|作品|制作物/.test(last)) addFact(state, 'page.apps');
    else if (/問い合わせ|連絡/.test(last)) addFact(state, 'contact.form');
    else if (includesAny(last, ['TTI Intelligence', 'TTIインテリジェンス']) || /サークル|活動/.test(last)) {
      addFact(state, 'activity.location');
    } else if (/豊田工業大学|豊田工大|豊工|tti/.test(last)) {
      addFact(state, 'university.location');
    }
    if (state.facts.some((factId) => factId.startsWith('page.') || factId === 'video.youtube')) {
      state.navigationRequested = true;
    }
  }

  if (state.facts.length > factCountBeforeHistory) {
    state.historyDependent = true;
  }
}

function finalizePlan(
  state: MutablePlanState,
  explicitOutOfScope: boolean,
): AssistantQueryPlan {
  const validFacts = state.facts.filter((factId) => {
    if (state.excludedFacts.includes(factId)) return false;
    if (factId === 'video.youtube' && state.excludedExternal.includes('youtube')) {
      return false;
    }
    if (factId === 'contact.discord' && state.excludedExternal.includes('discord')) {
      return false;
    }
    if (
      (factId === 'page.weekly-math' || factId === 'math.answer')
      && state.excludedPages.includes('weekly-math')
    ) {
      return false;
    }
    if (
      (factId === 'contact.form' || factId === 'page.contact')
      && state.excludedPages.includes('contact')
    ) {
      return false;
    }
    return true;
  });

  const pageIds: PageId[] = [];
  const externalLinks: ExternalLinkId[] = [];
  for (const factId of validFacts) {
    const fact = ASSISTANT_FACTS[factId];
    for (const pageId of fact.pageIds) {
      if (!state.excludedPages.includes(pageId)) addUnique(pageIds, pageId);
    }
    for (const externalLink of fact.externalLinks) {
      if (!state.excludedExternal.includes(externalLink)) {
        addUnique(externalLinks, externalLink);
      }
    }
  }

  if (state.linksRejected) {
    pageIds.length = 0;
    externalLinks.length = 0;
  }

  let mode: AssistantPlanMode = 'answer';
  if (validFacts.length === 0) mode = 'unsupported';
  else if (validFacts.includes('identity.tti-difference')) mode = 'compare';
  else if (validFacts.includes('site.page-inventory')) mode = 'list';
  else if (validFacts.some((id) => id.startsWith('small-talk.'))) mode = 'small-talk';
  else if (validFacts.includes('prompt.protected')) mode = 'protected';
  else if (state.navigationRequested || validFacts.every((id) => id.startsWith('page.'))) {
    mode = 'navigate';
  }

  return {
    mode,
    confidence: validFacts.length > 0
      ? state.forcePlanner ? 'low' : 'high'
      : explicitOutOfScope ? 'none' : 'low',
    requiresHistory: state.historyDependent,
    factIds: validFacts,
    excludedFactIds: [...state.excludedFacts],
    pageIds,
    excludedPageIds: [...state.excludedPages],
    externalLinks,
    excludedExternalLinks: [...state.excludedExternal],
    suppressLinks: state.linksRejected,
  };
}

/**
 * Build a compositional plan from entities and aspects. Explicit topics in the
 * latest turn always win; history is consulted only for genuinely elliptical
 * probes such as 「場所は？」.
 */
export function planAssistantRequest(
  message: string,
  history: readonly HistoryMessage[],
): AssistantQueryPlan {
  const value = normalizeAssistantQuery(message);
  const normalizedClauses = normalizeAssistantQueryClauses(message);
  const state: MutablePlanState = {
    facts: [],
    excludedFacts: [],
    excludedPages: [],
    excludedExternal: [],
    navigationRequested: false,
    linksRejected: false,
    forcePlanner: false,
    historyDependent: false,
  };

  detectExclusions(value, state);

  if (asksForPageInventory(value)) {
    addFact(state, 'site.page-inventory');
  }

  detectMetaFacts(value, state);
  // Protected requests never need unrelated facts or links.
  if (state.facts.includes('prompt.protected')) {
    return finalizePlan(state, false);
  }

  if (detectIdentityFacts(value, normalizedClauses, state)) {
    return finalizePlan(state, false);
  }
  detectMembershipAndActivityFacts(value, state);
  detectContactAndSocialFacts(value, state);
  detectVideoAndMathFacts(value, state);
  detectPageFacts(value, state);

  // Pure TTI comparison supersedes the component identity facts.
  if (state.facts.includes('identity.tti-difference')) {
    state.facts = state.facts.filter((factId) => (
      factId !== 'circle.identity'
      && factId !== 'university.identity'
      && factId !== 'university.abbreviation'
    ));
  }

  inferEllipticalFollowUp(value, history, state);
  detectSmallTalk(value, state);

  // A partially recognized compound question must not become a confident,
  // incomplete answer. Let the narrow fact selector reassess the whole turn.
  const compoundCue = /両方|まとめて|それと|加えて|および|ならびに/.test(value)
    || /.{2,}と.{2,}(?:教えて|知りたい|案内して|答えて|見せて|開きたい)/.test(value);
  const withoutLinkRejection = value.replace(
    /(?:リンク|url).{0,12}(?:いらない|要らない|必要ない|不要|なし|抜き|付けない|つけない|貼らない|載せない|付けず|つけず|貼らず|載せず)/g,
    '',
  );
  const semanticNegation = /ではなく|じゃなくて?|じゃない|ではない|以外|聞いていない|聞いていません|聞いてません|聞いてない|いらない|要らない|必要ない|不要|なし|抜き|除いて|除外|やめて/.test(withoutLinkRejection);
  const historyReferenceCue = history.length > 0 && (
    /^(?:それ|その|そこ|あれ|さっき|先ほど|前の)/.test(value)
    || /リンクだけ/.test(value)
    || /(?:場所|住所|所在地|英語名|正式名称|答え|解答|ヒント|費用|料金|日程|活動日|リンク)(?:も|だけ|は)/.test(value)
  );
  const hasFactExclusions = state.excludedFacts.length > 0
    || state.excludedPages.length > 0
    || state.excludedExternal.length > 0;
  if (
    state.facts.length > 1
    || state.historyDependent
    || historyReferenceCue
    || semanticNegation
    || hasFactExclusions
    || (
      compoundCue
      && !state.facts.includes('identity.tti-difference')
      && !state.facts.includes('site.page-inventory')
    )
  ) {
    state.forcePlanner = true;
  }
  if (historyReferenceCue) {
    state.historyDependent = true;
  }

  return finalizePlan(state, isExplicitOutOfScope(value));
}

/** Apply model-selected fact IDs while preserving deterministic exclusions. */
export function planFromFactSelection(
  factIds: readonly AssistantFactId[],
  constraints: Pick<
    AssistantQueryPlan,
    'excludedFactIds' | 'excludedPageIds' | 'excludedExternalLinks' | 'suppressLinks'
  >,
): AssistantQueryPlan {
  const state: MutablePlanState = {
    facts: [],
    excludedFacts: [...constraints.excludedFactIds],
    excludedPages: [...constraints.excludedPageIds],
    excludedExternal: [...constraints.excludedExternalLinks],
    navigationRequested: factIds.some((factId) => factId.startsWith('page.')),
    linksRejected: constraints.suppressLinks,
    forcePlanner: false,
    historyDependent: false,
  };
  for (const factId of factIds) addFact(state, factId);
  return finalizePlan(state, false);
}

function pageLink(pageId: PageId): AssistantLink {
  const route = KNOWN_PAGE_ROUTES[pageId];
  return { pageId, title: route.title, href: route.href };
}

function isFactId(value: string): value is AssistantFactId {
  return Object.hasOwn(ASSISTANT_FACTS, value);
}

/**
 * Render only reviewed facts and links owned by those facts. Invalid or
 * tampered plans fail closed to a non-empty, link-free response.
 */
export function answerFromPlan(plan: AssistantQueryPlan): AssistantResponse {
  if (
    plan.mode === 'unsupported'
    || plan.factIds.length === 0
    || plan.factIds.some((factId) => !isFactId(factId))
  ) {
    return { answer: UNSUPPORTED_ANSWER, links: [] };
  }

  const excludedFacts = new Set(plan.excludedFactIds ?? []);
  const activeFactIds = plan.factIds.filter((factId) => !excludedFacts.has(factId));
  if (activeFactIds.length === 0) {
    return { answer: UNSUPPORTED_ANSWER, links: [] };
  }
  const facts = activeFactIds.map((factId) => ASSISTANT_FACTS[factId]);
  const fragments = facts.length === 1
    ? [facts[0].answer]
    : facts.map((fact) => fact.compactAnswer);
  const answer = [...new Set(fragments)].join('');

  if (
    answer.length === 0
    || answer.length > 200
    || /guideEntries|contentEntries|pageIds|allowedPageIds|isFollowUp|answerにURL/i.test(answer)
    || /https?:\/\//i.test(answer)
  ) {
    return { answer: UNSUPPORTED_ANSWER, links: [] };
  }

  const allowedPages = new Set<PageId>(facts.flatMap((fact) => [...fact.pageIds]));
  const allowedExternal = new Set<ExternalLinkId>(
    facts.flatMap((fact) => [...fact.externalLinks]),
  );
  const excludedPages = new Set(plan.excludedPageIds);
  const excludedExternal = new Set(plan.excludedExternalLinks);
  const links: AssistantLink[] = [];
  const seenHrefs = new Set<string>();

  const push = (link: AssistantLink) => {
    if (links.length >= 4 || seenHrefs.has(link.href)) return;
    seenHrefs.add(link.href);
    links.push(link);
  };

  for (const externalLink of plan.externalLinks) {
    if (allowedExternal.has(externalLink) && !excludedExternal.has(externalLink)) {
      push(EXTERNAL_LINKS[externalLink]);
    }
  }
  for (const pageId of plan.pageIds) {
    if (
      PAGE_ID_SET.has(pageId)
      && allowedPages.has(pageId)
      && !excludedPages.has(pageId)
    ) {
      push(pageLink(pageId));
    }
  }

  return { answer, links };
}
