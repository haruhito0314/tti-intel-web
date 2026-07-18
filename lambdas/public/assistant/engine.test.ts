import { describe, expect, it } from 'vitest';

import {
  answerFromPlan,
  planFromFactSelection,
  planAssistantRequest,
} from './engine.js';
import type { AssistantQueryPlan as QueryPlan } from './engine.js';
import {
  ASSISTANT_FACT_IDS,
  ASSISTANT_FACTS,
} from './facts.js';
import { PAGE_IDS, type HistoryMessage } from './types.js';

function history(...contents: string[]): HistoryMessage[] {
  return contents.map((content) => ({ role: 'user', content }));
}

function expectExactMembers(
  actual: readonly string[],
  expected: readonly string[],
): void {
  expect(actual).toHaveLength(expected.length);
  expect(new Set(actual)).toEqual(new Set(expected));
}

describe('assistant fact catalog', () => {
  it('contains unique ids and only the reviewed public fact fields', () => {
    const entries = Object.entries(ASSISTANT_FACTS);

    expect(new Set(ASSISTANT_FACT_IDS).size).toBe(ASSISTANT_FACT_IDS.length);
    expectExactMembers(ASSISTANT_FACT_IDS, entries.map(([id]) => id));
    for (const [, fact] of entries) {
      expect(Object.keys(fact).sort()).toEqual([
        'answer',
        'compactAnswer',
        'description',
        'externalLinks',
        'pageIds',
      ]);
    }
  });

  it('keeps canonical and compact answers bounded, non-empty, and URL-free', () => {
    for (const [id, fact] of Object.entries(ASSISTANT_FACTS)) {
      expect(fact.description.trim(), id).not.toBe('');
      expect(fact.answer.trim(), id).not.toBe('');
      expect(fact.compactAnswer.trim(), id).not.toBe('');
      expect(fact.answer.length, id).toBeLessThanOrEqual(200);
      expect(fact.compactAnswer.length, id).toBeLessThanOrEqual(200);
      expect(fact.answer, id).not.toMatch(/https?:\/\/|www\./i);
      expect(fact.compactAnswer, id).not.toMatch(/https?:\/\/|www\./i);
    }
  });

  it('owns only canonical page ids and known external link ids without duplicates', () => {
    const knownPages = new Set<string>(PAGE_IDS);
    const knownExternalLinks = new Set(['discord', 'toyota-ti', 'youtube']);

    for (const [id, fact] of Object.entries(ASSISTANT_FACTS)) {
      expect(new Set(fact.pageIds).size, id).toBe(fact.pageIds.length);
      expect(new Set(fact.externalLinks).size, id).toBe(fact.externalLinks.length);
      expect(fact.pageIds.every((pageId) => knownPages.has(pageId)), id).toBe(true);
      expect(
        fact.externalLinks.every((linkId) => knownExternalLinks.has(linkId)),
        id,
      ).toBe(true);
    }
  });

  it('keeps the sensitive factual anchors explicit in reviewed copy', () => {
    expect(ASSISTANT_FACTS['university.abbreviation'].answer)
      .toMatch(/Toyota Technological Institute.*豊田工業大学/);
    expect(ASSISTANT_FACTS['university.location'].answer)
      .toMatch(/名古屋市天白区/);
    expect(ASSISTANT_FACTS['university.location'].answer)
      .not.toMatch(/豊田市/);
    expect(ASSISTANT_FACTS['membership.cost'].answer).toMatch(/無料/);
    expect(ASSISTANT_FACTS['membership.tool-cost'].answer).toMatch(/各自.*負担/);
    expect(ASSISTANT_FACTS['activity.schedule'].answer).toMatch(/土日/);
    expect(ASSISTANT_FACTS['contact.phone'].answer)
      .not.toMatch(/電話番号.{0,12}(?:記載|掲載|載って)/);
  });
});

describe('planAssistantRequest identity', () => {
  it.each([
    'TTIって何？',
    'ttiとは',
    'ＴＴＩは何の略？',
  ])('treats bare TTI as the university abbreviation: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['university.abbreviation']);
    expect(plan.factIds).not.toContain('circle.identity');
    expect(plan.mode).toBe('answer');
    expect(plan.externalLinks).toContain('toyota-ti');
  });

  it.each([
    'TTI Intelligenceって何？',
    'tti intelligenceとは',
    'ＴＴＩ Ｉｎｔｅｌｌｉｇｅｎｃｅってどんな団体？',
    'TTIインテリジェンスって何？',
  ])('treats TTI Intelligence as the circle: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['circle.identity']);
    expect(plan.factIds).not.toContain('university.abbreviation');
    expect(plan.factIds).not.toContain('university.identity');
    expect(plan.externalLinks).not.toContain('toyota-ti');
    expect(plan.mode).toBe('answer');
  });

  it.each([
    '豊田工業大学のサークルは？',
    '豊工大にはどんな部活がある？',
    '大学のサークル一覧を教えて',
    '豊田工業大学にはどんなサークルがありますか',
    '豊工のクラブについて教えて',
    'TTIの部活は？',
    'T.T.I.の部活は？',
    '豊田工業大学、サークルについて教えて',
    'T.T.I.、部活は？',
    '大学のサークルに参加できますか',
  ])('routes university-wide club questions to the scope boundary: %j', (message) => {
    const plan = planAssistantRequest(message, []);
    const response = answerFromPlan(plan);

    expectExactMembers(plan.factIds, ['university.clubs-scope']);
    expect(plan.confidence).toBe('high');
    expect(response.answer).toBe('このサイトではTTI Intelligenceの活動を案内しています。豊田工業大学のサークル全般については、大学公式サイトをご確認ください。');
    expect(response.links).toEqual([
      {
        pageId: 'toyota-ti',
        title: '豊田工業大学',
        href: 'https://www.toyota-ti.ac.jp/',
      },
    ]);
  });

  it('does not join a TTI definition ask to a club ask across sentence boundaries', () => {
    const plan = planAssistantRequest(
      'TTIは何の略？サークルへの参加方法は？',
      [],
    );

    expectExactMembers(plan.factIds, [
      'university.abbreviation',
      'contact.form',
    ]);
  });

  it('keeps an explicit Toyota Tech comparison in university club scope', () => {
    const plan = planAssistantRequest(
      '他大学ではなく豊田工業大学のサークル一覧を教えて',
      [],
    );

    expectExactMembers(plan.factIds, ['university.clubs-scope']);
    expect(plan.confidence).toBe('high');
    expect(plan.externalLinks).toContain('toyota-ti');
  });

  it('recognizes Toyota Tech students as university club scope', () => {
    const plan = planAssistantRequest(
      '豊田工業大学の学生が参加できるサークルを教えて',
      [],
    );

    expectExactMembers(plan.factIds, ['university.clubs-scope']);
    expect(plan.confidence).toBe('high');
  });

  it.each([
    'TTI Intelligenceはどんなサークル？',
    'TTIインテリジェンスについて教えて',
  ])('keeps explicitly named TTI Intelligence questions scoped to the circle: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['circle.identity']);
  });

  it.each([
    'TTIじゃなくてIntelligenceの方のサークルは？',
    'TTIじゃなくてインテリジェンスの方のサークルは？',
  ])('does not mistake an Intelligence correction for university-wide club scope: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['circle.identity']);
  });

  it.each([
    'TTI IntelligenceのTTIと大学のTTIは同じ意味？',
    'TTIとTTI Intelligenceって何が違う？',
  ])('uses the explicit comparison fact when both identities are asked: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['identity.tti-difference']);
    expect(plan.mode).toBe('compare');
    expect(plan.externalLinks).toContain('toyota-ti');
  });
});

describe('planAssistantRequest negation', () => {
  it('prefers math and excludes YouTube when the user says YouTubeではなく', () => {
    const plan = planAssistantRequest('YouTubeではなく数学の解説を読みたい', []);

    expectExactMembers(plan.factIds, ['math.answer']);
    expectExactMembers(plan.pageIds, ['weekly-math']);
    expect(plan.externalLinks).not.toContain('youtube');
    expect(plan.excludedPageIds).not.toContain('about');
  });

  it('prefers YouTube and excludes math when the user says 数学じゃなくて', () => {
    const plan = planAssistantRequest('数学じゃなくてYouTubeの解説動画が見たい', []);

    expectExactMembers(plan.factIds, ['video.youtube']);
    expect(plan.pageIds).not.toContain('weekly-math');
    expect(plan.excludedPageIds).toContain('weekly-math');
    expect(plan.externalLinks).toContain('youtube');
  });

  it('returns only the Contact form when Discord is explicitly rejected', () => {
    const plan = planAssistantRequest(
      'Discordはいらない、問い合わせフォームだけ教えて',
      [],
    );

    expectExactMembers(plan.factIds, ['contact.form']);
    expectExactMembers(plan.pageIds, ['contact']);
    expect(plan.externalLinks).not.toContain('discord');
  });

  it('returns only Discord when the Contact form is explicitly rejected', () => {
    const plan = planAssistantRequest(
      '問い合わせフォームではなくDiscordのリンクがほしい',
      [],
    );

    expectExactMembers(plan.factIds, ['contact.discord']);
    expect(plan.pageIds).not.toContain('contact');
    expect(plan.excludedPageIds).toContain('contact');
    expect(plan.externalLinks).toContain('discord');
  });

  it('lists pages without links when links are explicitly rejected', () => {
    const plan = planAssistantRequest(
      'ページを全部教えて。ただしリンクはいらない',
      [],
    );

    expectExactMembers(plan.factIds, ['site.page-inventory']);
    expect(plan.pageIds).toEqual([]);
    expect(plan.externalLinks).toEqual([]);
    expect(plan.mode).toBe('list');
    expect(plan.confidence).toBe('high');
  });

  it('keeps an explicitly requested About fact when only YouTube is rejected', () => {
    const deterministic = planAssistantRequest(
      'YouTubeではなく、TTI Intelligenceの活動内容を教えて',
      [],
    );
    const selected = planFromFactSelection(
      ['video.youtube', 'activity.summary'],
      deterministic,
    );

    expectExactMembers(selected.factIds, ['activity.summary']);
    expectExactMembers(selected.pageIds, ['about']);
    expect(selected.externalLinks).not.toContain('youtube');
  });

  it('does not answer with Contact when a generic contact destination is rejected', () => {
    const plan = planAssistantRequest('連絡先はいらない', []);

    expect(plan.factIds).toEqual([]);
    expect(plan.excludedFactIds).toContain('contact.form');
    expect(plan.confidence).toBe('low');
  });

  it('treats 以外 as an exclusion and keeps the requested alternative', () => {
    const plan = planAssistantRequest('Discord以外の連絡方法を教えて', []);

    expectExactMembers(plan.factIds, ['contact.form']);
    expect(plan.excludedFactIds).toContain('contact.discord');
    expect(plan.externalLinks).not.toContain('discord');
    expect(plan.confidence).toBe('low');
  });
});

describe('planAssistantRequest aliases and multi-topic questions', () => {
  it.each([
    '会費ある？',
    '参加費はかかりますか',
    'サークルに入るのにお金必要？',
    '参加は無料ですか？',
  ])('normalizes common membership-cost phrasings: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['membership.cost']);
    expectExactMembers(plan.pageIds, ['about']);
  });

  it.each([
    'Discordある？',
    'ディスコードはありますか',
    'でぃすこーどの招待リンク',
  ])('normalizes Discord spelling variants: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['contact.discord']);
    expect(plan.externalLinks).toContain('discord');
  });

  it.each([
    'YouTubeの解説動画を見たい',
    'ユーチューブの動画はどこ？',
  ])('normalizes YouTube spelling variants: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['video.youtube']);
    expect(plan.externalLinks).toContain('youtube');
  });

  it.each([
    'お問い合わせフォームはどこ？',
    'お問合せフォームを使いたい',
    '連絡フォームだけ教えて',
  ])('normalizes Contact form spelling variants: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['contact.form']);
    expectExactMembers(plan.pageIds, ['contact']);
  });

  it('keeps all independently asked About facts', () => {
    const plan = planAssistantRequest(
      '活動日はいつ？費用は？初心者でも参加できる？',
      [],
    );

    expectExactMembers(plan.factIds, [
      'activity.schedule',
      'membership.cost',
      'membership.beginner',
    ]);
    expectExactMembers(plan.pageIds, ['about']);
  });

  it('uses other circle aspects in the same message to resolve an elliptical 場所 ask', () => {
    const plan = planAssistantRequest(
      '初心者でも大丈夫？活動は土日？場所は？',
      [],
    );

    expectExactMembers(plan.factIds, [
      'membership.beginner',
      'activity.schedule',
      'activity.location',
    ]);
    expectExactMembers(plan.pageIds, ['about', 'contact']);
  });

  it.each([
    'TTIの正式名称と場所、それからサークルへの参加方法を教えて',
    'TTIの正式名称と場所、サークルへの参加方法を教えて',
    'サークルへの参加方法と、TTIの正式名称と場所を教えて',
  ])('keeps university abbreviation, location, and joining as separate facts: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, [
      'university.abbreviation',
      'university.location',
      'contact.form',
    ]);
    expectExactMembers(plan.pageIds, ['contact']);
    expect(plan.externalLinks).toContain('toyota-ti');
  });

  it.each([
    '他大学の学生でもサークルに参加できますか',
    '他の大学の学生でもサークルに参加できますか',
    '別大学の人でも部活に入れますか',
  ])('keeps other-university participation questions on membership eligibility: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expectExactMembers(plan.factIds, ['membership.eligibility']);
    expect(plan.confidence).toBe('high');
    expectExactMembers(plan.pageIds, ['about']);
  });

  it('keeps both membership cost facts instead of routing tool cost to Apps', () => {
    const plan = planAssistantRequest('参加費は無料？AIツール代も無料？', []);

    expectExactMembers(plan.factIds, [
      'membership.cost',
      'membership.tool-cost',
    ]);
    expectExactMembers(plan.pageIds, ['about']);
    expect(plan.pageIds).not.toContain('apps');
  });

  it('navigates to every explicitly requested page without adding Home', () => {
    const plan = planAssistantRequest('お知らせと掲示板の場所を教えて', []);

    expectExactMembers(plan.factIds, ['page.news', 'page.board']);
    expectExactMembers(plan.pageIds, ['news', 'board']);
    expect(plan.pageIds).not.toContain('home');
    expect(plan.mode).toBe('navigate');
  });
});

describe('natural-language fact regressions', () => {
  it.each([
    {
      message: 'このサイトは何ですか？',
      factIds: ['site.description'],
      pageIds: ['home'],
      answerPatterns: [/TTI Intelligence/, /公開サイト/],
    },
    {
      message: 'このAI Assistantの使い方は？',
      factIds: ['assistant.usage'],
      pageIds: [],
      answerPatterns: [/短く入力/, /送信/],
    },
    {
      message: '応用情報の勉強や就活サポートはある？',
      factIds: ['activity.certification-study', 'membership.career-support'],
      pageIds: ['about', 'contact'],
      answerPatterns: [/応用情報/, /就職活動|就活/, /お問い合わせ/],
    },
    {
      message: 'ゲーム初心者でも参加できる？',
      factIds: ['game.beginner'],
      pageIds: ['game-community'],
      answerPatterns: [/ゲーム初心者/, /参加/],
    },
    {
      message: 'MCPを使った開発活動について知りたい',
      factIds: ['activity.ai-tools', 'page.development'],
      pageIds: ['about', 'development'],
      answerPatterns: [/MCP/, /開発について/],
    },
    {
      message: 'イベント情報や技術記事はどこ？',
      factIds: ['page.news'],
      pageIds: ['news'],
      answerPatterns: [/イベント情報/, /技術記事/],
    },
    {
      message: 'TOEICのアプリはありますか？',
      factIds: ['page.apps'],
      pageIds: ['apps'],
      answerPatterns: [/TOEIC Practice/, /アプリ/],
    },
    {
      message: 'メールで問い合わせたい',
      factIds: ['contact.form'],
      pageIds: ['contact'],
      answerPatterns: [/お問い合わせフォーム/, /送信/],
    },
  ])('grounds $message in reviewed facts', ({
    message,
    factIds,
    pageIds,
    answerPatterns,
  }) => {
    const plan = planAssistantRequest(message, []);
    const response = answerFromPlan(plan);

    expectExactMembers(plan.factIds, factIds);
    expectExactMembers(plan.pageIds, pageIds);
    for (const pattern of answerPatterns) {
      expect(response.answer).toMatch(pattern);
    }
  });
});

describe('planAssistantRequest conversational context', () => {
  it('resolves ツール代も？ against the preceding membership-cost topic', () => {
    const plan = planAssistantRequest(
      'ツール代も？',
      history('会費は無料？'),
    );

    expectExactMembers(plan.factIds, ['membership.tool-cost']);
    expectExactMembers(plan.pageIds, ['about']);
    expect(plan.pageIds).not.toContain('apps');
  });

  it('lets an explicit Intelligence correction replace the prior university topic', () => {
    const plan = planAssistantRequest(
      'Intelligenceのほうね',
      history('TTIって何？'),
    );

    expectExactMembers(plan.factIds, ['circle.identity']);
    expect(plan.factIds).not.toContain('university.abbreviation');
    expect(plan.externalLinks).not.toContain('toyota-ti');
  });

  it('does not carry math into an explicit YouTube topic switch', () => {
    const plan = planAssistantRequest(
      'YouTubeは？',
      history('数学の問題はどこ？'),
    );

    expectExactMembers(plan.factIds, ['video.youtube']);
    expect(plan.pageIds).not.toContain('weekly-math');
    expect(plan.externalLinks).toContain('youtube');
  });

  it('honors a latest-turn correction from Discord to Contact only', () => {
    const plan = planAssistantRequest(
      'やっぱり問い合わせフォームだけで',
      history('Discordある？'),
    );

    expectExactMembers(plan.factIds, ['contact.form']);
    expectExactMembers(plan.pageIds, ['contact']);
    expect(plan.externalLinks).not.toContain('discord');
  });

  it('resolves 場所 against the most recent circle topic', () => {
    const plan = planAssistantRequest(
      '場所は？',
      history('TTI Intelligenceについて教えて'),
    );

    expectExactMembers(plan.factIds, ['activity.location']);
    expect(plan.factIds).not.toContain('university.location');
  });

  it('resolves 場所 against the most recent university topic', () => {
    const plan = planAssistantRequest(
      '場所は？',
      history('豊田工業大学について教えて'),
    );

    expectExactMembers(plan.factIds, ['university.location']);
    expect(plan.factIds).not.toContain('activity.location');
  });

  it('does not reuse a prior site topic for a new out-of-scope request', () => {
    const plan = planAssistantRequest(
      'Pythonのコードを書いて',
      history('今週の数学について教えて'),
    );

    expect(plan.factIds).toEqual([]);
    expect(plan.pageIds).toEqual([]);
    expect(plan.externalLinks).toEqual([]);
    expect(plan.mode).toBe('unsupported');
  });

  it('requires planner confirmation when a referential follow-up also matches a fact', () => {
    const plan = planAssistantRequest(
      'それって初心者でも大丈夫？',
      history('ゲームコミュニティについて教えて'),
    );

    expect(plan.factIds).toContain('membership.beginner');
    expect(plan.confidence).toBe('low');
    expect(plan.requiresHistory).toBe(true);
  });

  it('does not send history semantics into an explicit new topic', () => {
    const plan = planAssistantRequest(
      '会費はかかりますか？',
      history('Discordのリンクを教えて'),
    );

    expect(plan.confidence).toBe('high');
    expect(plan.requiresHistory).toBe(false);
  });
});

describe('QueryPlan invariants', () => {
  it.each([
    'TTIって何？',
    'TTI Intelligenceって何？',
    'Discordはいらない、問い合わせフォームだけ教えて',
    '数学じゃなくてYouTubeの解説動画が見たい',
    '活動日はいつ？費用は？初心者でも参加できる？',
    'ページを全部教えて。ただしリンクはいらない',
    'Pythonのコードを書いて',
  ])('returns unique selections and keeps included/excluded pages disjoint: %j', (message) => {
    const plan = planAssistantRequest(message, []);

    expect(new Set(plan.factIds).size).toBe(plan.factIds.length);
    expect(new Set(plan.pageIds).size).toBe(plan.pageIds.length);
    expect(new Set(plan.excludedPageIds).size).toBe(plan.excludedPageIds.length);
    expect(plan.pageIds.some((pageId) => plan.excludedPageIds.includes(pageId))).toBe(false);
    expect(['high', 'low', 'none']).toContain(plan.confidence);
  });

  it('assigns less confidence to an unsupported request than a grounded fact ask', () => {
    const supported = planAssistantRequest('会費はかかりますか？', []);
    const unknown = planAssistantRequest('それについて詳しく教えて', []);
    const outOfScope = planAssistantRequest('銀河の年齢を教えて', []);

    expect(supported.confidence).toBe('high');
    expect(unknown.confidence).toBe('low');
    expect(unknown.mode).toBe('unsupported');
    expect(outOfScope.confidence).toBe('none');
    expect(outOfScope.mode).toBe('unsupported');
  });

  it('recognizes programming inexperience compositionally without a fixed sentence', () => {
    const plan = planAssistantRequest(
      'プログラミングを一度もしたことがなくても大丈夫？',
      [],
    );

    expectExactMembers(plan.factIds, ['membership.beginner']);
    expect(plan.confidence).toBe('high');
  });

  it('treats a spaced programming-language creation request as explicit out of scope', () => {
    const plan = planAssistantRequest('Pythonで家計簿プログラムを書いて', []);

    expect(plan.factIds).toEqual([]);
    expect(plan.confidence).toBe('none');
    expect(plan.mode).toBe('unsupported');
  });
});

describe('planFromFactSelection low-confidence safety', () => {
  it('preserves deterministic YouTube exclusions over a model-selected fact', () => {
    const deterministic = planAssistantRequest(
      'YouTubeはいらない、数学のページを見たい',
      [],
    );
    const selected = planFromFactSelection(
      ['video.youtube', 'page.weekly-math'],
      deterministic,
    );

    expectExactMembers(selected.factIds, ['page.weekly-math']);
    expectExactMembers(selected.pageIds, ['weekly-math']);
    expect(selected.externalLinks).not.toContain('youtube');
    expect(selected.excludedExternalLinks).toContain('youtube');
  });

  it('preserves deterministic Contact exclusions over model-selected facts', () => {
    const deterministic = planAssistantRequest(
      '問い合わせフォームではなくDiscordがほしい',
      [],
    );
    const selected = planFromFactSelection(
      ['contact.form', 'contact.discord'],
      deterministic,
    );

    expectExactMembers(selected.factIds, ['contact.discord']);
    expect(selected.pageIds).not.toContain('contact');
    expect(selected.externalLinks).toContain('discord');
    expect(selected.excludedPageIds).toContain('contact');
  });

  it('preserves a rejected app fact over an over-selected model plan', () => {
    const deterministic = planAssistantRequest(
      'カラーソートではなく卓球の対戦表を開いて',
      [],
    );
    const selected = planFromFactSelection(
      ['page.color-sort', 'page.table-tennis'],
      deterministic,
    );

    expectExactMembers(selected.factIds, ['page.table-tennis']);
    expectExactMembers(selected.pageIds, ['table-tennis']);
    expect(selected.excludedFactIds).toContain('page.color-sort');
    expect(answerFromPlan(selected).answer).not.toMatch(/Color Sort|カラーソート/);
  });

  it('preserves schedule exclusion when the model selects every mentioned fact', () => {
    const deterministic = planAssistantRequest(
      '活動日はいらない、参加費だけ教えて',
      [],
    );
    const selected = planFromFactSelection(
      ['activity.schedule', 'membership.cost'],
      deterministic,
    );

    expectExactMembers(selected.factIds, ['membership.cost']);
    expect(selected.excludedFactIds).toContain('activity.schedule');
    expect(answerFromPlan(selected).answer).not.toMatch(/土日|活動日/);
  });

  it('preserves an explicit no-links request after model fact selection', () => {
    const deterministic = planAssistantRequest(
      'ページについて教えて。ただしリンクはいらない',
      [],
    );
    const selected = planFromFactSelection(['page.news'], deterministic);

    expectExactMembers(selected.factIds, ['page.news']);
    expect(selected.pageIds).toEqual([]);
    expect(selected.externalLinks).toEqual([]);
    expect(selected.suppressLinks).toBe(true);
    expect(answerFromPlan(selected).links).toEqual([]);
  });

  it('deduplicates repeated model-selected fact ids', () => {
    const deterministic = planAssistantRequest('それについて教えて', []);
    const selected = planFromFactSelection(
      ['membership.cost', 'membership.cost', 'membership.tool-cost'],
      deterministic,
    );

    expectExactMembers(selected.factIds, [
      'membership.cost',
      'membership.tool-cost',
    ]);
    expectExactMembers(selected.pageIds, ['about']);
  });
});

describe('answerFromPlan deterministic grounded responses', () => {
  it('returns the same response for the same plan', () => {
    const plan = planAssistantRequest(
      '活動日はいつ？費用は？初心者でも参加できる？',
      [],
    );

    expect(answerFromPlan(plan)).toEqual(answerFromPlan(plan));
  });

  it('covers every requested fact in a compound answer and deduplicates links', () => {
    const response = answerFromPlan(planAssistantRequest(
      '活動日はいつ？費用は？初心者でも参加できる？',
      [],
    ));

    expect(response.answer).toMatch(/土日/);
    expect(response.answer).toMatch(/無料/);
    expect(response.answer).toMatch(/未経験|初心者/);
    expect(response.links).toEqual([
      { pageId: 'about', title: 'サークルについて', href: '/about' },
    ]);
  });

  it('never adds a rejected YouTube link to a math response', () => {
    const response = answerFromPlan(planAssistantRequest(
      'YouTubeではなく数学の解説を読みたい',
      [],
    ));

    expect(response.answer).toMatch(/数学/);
    expect(response.answer).not.toMatch(/YouTube|ユーチューブ/);
    expect(response.links.map(({ href }) => href)).toEqual(['/weekly-math']);
  });

  it('never adds a rejected Discord link to a Contact-only response', () => {
    const response = answerFromPlan(planAssistantRequest(
      'Discordはいらない、問い合わせフォームだけ教えて',
      [],
    ));

    expect(response.answer).toMatch(/お問い合わせ|フォーム/);
    expect(response.answer).not.toMatch(/Discord|ディスコード/);
    expect(response.links).toEqual([
      { pageId: 'contact', title: 'お問い合わせ', href: '/contact' },
    ]);
  });

  it('grounds the tool-cost follow-up in membership facts, not the Apps page', () => {
    const response = answerFromPlan(planAssistantRequest(
      'ツール代も？',
      history('会費は無料？'),
    ));

    expect(response.answer).toMatch(/各自|自己負担|個人.*負担/);
    expect(response.links.map(({ href }) => href)).toEqual(['/about']);
    expect(response.links.map(({ href }) => href)).not.toContain('/app');
  });

  it('returns a page inventory with no links when links are unwanted', () => {
    const response = answerFromPlan(planAssistantRequest(
      'ページを全部教えて。ただしリンクはいらない',
      [],
    ));

    for (const pageName of [
      'サークルについて',
      'お知らせ',
      'アプリ',
      '開発について',
      '掲示板',
      '今週の数学',
      'ゲームコミュニティ',
      'お問い合わせ',
    ]) {
      expect(response.answer).toContain(pageName);
    }
    expect(response.links).toEqual([]);
  });

  it('does not claim that a phone number is listed on Contact', () => {
    const plan = planAssistantRequest('このサイトの運営者の電話番号は？', []);
    const response = answerFromPlan(plan);

    expect(plan.factIds).toContain('contact.phone');
    expect(response.answer).not.toMatch(/電話番号.{0,12}(?:記載|掲載|載って)/);
    expect(response.answer).toMatch(/公開してい|案内してい|お問い合わせフォーム/);
    expect(response.links.map(({ href }) => href)).toContain('/contact');
  });

  it('explains the TTI distinction without confusing the circle and university', () => {
    const response = answerFromPlan(planAssistantRequest(
      'TTI IntelligenceのTTIと大学のTTIは同じ意味？',
      [],
    ));

    expect(response.answer).toMatch(/TTI Intelligence/);
    expect(response.answer).toMatch(/豊田工業大学/);
    expect(response.answer).toMatch(/Toyota Technological Institute/);
  });

  it('answers bare TTI without adding an unsolicited circle explanation', () => {
    const response = answerFromPlan(planAssistantRequest('TTIって何？', []));

    expect(response.answer).toMatch(/Toyota Technological Institute/);
    expect(response.answer).toMatch(/豊田工業大学/);
    expect(response.answer).not.toMatch(/TTI Intelligence|サークル/);
  });

  it('answers TTI Intelligence as the circle without replacing it with university copy', () => {
    const response = answerFromPlan(planAssistantRequest(
      'TTI Intelligenceって何？',
      [],
    ));

    expect(response.answer).toMatch(/TTI Intelligence/);
    expect(response.answer).toMatch(/学生|コミュニティ|サークル/);
    expect(response.answer).not.toMatch(/TTIはToyota Technological Instituteの略/);
  });
});

describe('answerFromPlan defense in depth', () => {
  it('never trusts page or external link ids that the selected facts do not allow', () => {
    const validPlan = planAssistantRequest('会費はかかりますか？', []);
    const tamperedPlan: QueryPlan = {
      ...validPlan,
      pageIds: ['about', 'apps', 'contact'],
      externalLinks: ['discord', 'youtube'],
    };

    const response = answerFromPlan(tamperedPlan);

    expect(response.links).toEqual([
      { pageId: 'about', title: 'サークルについて', href: '/about' },
    ]);
  });

  it('gives excluded pages precedence over included pages', () => {
    const validPlan = planAssistantRequest('数学の問題はどこ？', []);
    const contradictoryPlan: QueryPlan = {
      ...validPlan,
      pageIds: [...validPlan.pageIds, 'weekly-math'],
      excludedPageIds: ['weekly-math'],
    };

    const response = answerFromPlan(contradictoryPlan);

    expect(response.links.map(({ pageId }) => pageId)).not.toContain('weekly-math');
  });

  it('deduplicates facts and links even if a caller supplies duplicates', () => {
    const validPlan = planAssistantRequest('会費はかかりますか？', []);
    const duplicatePlan = {
      ...validPlan,
      factIds: ['membership.cost', 'membership.cost', 'membership.cost'],
      pageIds: ['about', 'about', 'about'],
    } as unknown as QueryPlan;

    const response = answerFromPlan(duplicatePlan);
    const hrefs = response.links.map(({ href }) => href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual(['/about']);
    expect(response.answer.match(/無料/g)?.length).toBe(1);
  });

  it('returns no more than four verified links for an oversized plan', () => {
    const oversizedPlan = {
      factIds: [
        'page.news',
        'page.apps',
        'page.development',
        'page.board',
        'page.weekly-math',
        'page.game-community',
        'contact.form',
      ],
      excludedFactIds: [],
      pageIds: [
        'news',
        'apps',
        'development',
        'board',
        'weekly-math',
        'game-community',
        'contact',
      ],
      excludedPageIds: [],
      externalLinks: [],
      excludedExternalLinks: [],
      suppressLinks: false,
      mode: 'navigate',
      confidence: 'high',
      requiresHistory: false,
    } as QueryPlan;

    const response = answerFromPlan(oversizedPlan);

    expect(response.links.length).toBeLessThanOrEqual(4);
    expect(new Set(response.links.map(({ href }) => href)).size)
      .toBe(response.links.length);
  });

  it('falls back safely from an unknown fact id without throwing', () => {
    const invalidPlan = {
      factIds: ['unknown.fact'],
      pageIds: ['contact'],
      excludedPageIds: [],
      externalLinks: ['discord'],
      excludedExternalLinks: [],
      suppressLinks: false,
      mode: 'answer',
      confidence: 'high',
    } as unknown as QueryPlan;

    const response = answerFromPlan(invalidPlan);

    expect(response.answer.trim().length).toBeGreaterThan(0);
    expect(response.answer.length).toBeLessThanOrEqual(200);
    expect(JSON.stringify(response)).not.toContain('unknown.fact');
    expect(response.links).toEqual([]);
  });

  it.each([
    'TTIって何？',
    '活動日はいつ？費用は？初心者でも参加できる？',
    'お知らせと掲示板の場所を教えて',
    '銀河の年齢を教えて',
  ])('always produces a bounded non-empty answer: %j', (message) => {
    const response = answerFromPlan(planAssistantRequest(message, []));

    expect(response.answer.trim().length).toBeGreaterThan(0);
    expect(response.answer.length).toBeLessThanOrEqual(200);
  });
});

describe('independent blind-evaluation regressions', () => {
  it.each([
    ['最近の活動報告はどこで読めますか？', [], ['page.news']],
    ['お問い合わせページを開いてください。', [], ['page.contact']],
  ] as const)('keeps a high-confidence anchored plan for %j', (message, history, expected) => {
    const plan = planAssistantRequest(message, history);

    expectExactMembers(plan.factIds, expected);
    expect(plan.confidence).toBe('high');
  });

  it.each([
    [
      'TTIとTTI Intelligenceの違いと、大学の所在地を教えてください。',
      [],
      ['identity.tti-difference', 'university.location'],
    ],
    ['YouTubeではなく、数学問題の答えを見たいです。', [], ['math.answer']],
    [
      'どこ？',
      [{ role: 'user' as const, content: '解説動画を見たいです。' }],
      ['video.youtube'],
    ],
    [
      '卓球の対戦表とカラーソートの両方を開きたいです。',
      [],
      ['page.table-tennis', 'page.color-sort'],
    ],
    [
      'CLI練習アプリと作品一覧を両方見せてください。',
      [],
      ['page.cli-practice', 'page.apps'],
    ],
  ] as const)('keeps candidates but requires planner confirmation for %j', (message, history, expected) => {
    const plan = planAssistantRequest(message, history);

    expectExactMembers(plan.factIds, expected);
    expect(plan.confidence).toBe('low');
  });

  it('routes a partially recognized compound question to the fact planner', () => {
    const plan = planAssistantRequest('会費と部室の広さを教えて', []);

    expect(plan.factIds).toContain('membership.cost');
    expect(plan.confidence).toBe('low');
  });
});
