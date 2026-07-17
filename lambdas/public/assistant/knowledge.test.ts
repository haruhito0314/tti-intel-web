import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildFollowUpSearchQuery,
  createVerifiedLinks,
  GUIDE_ENTRIES,
  KNOWN_PAGE_ROUTES,
  normalizeSearchText,
  resolveCurrentPageId,
  scoreGuideEntry,
  selectRelevantKnowledge,
} from './knowledge.js';
import { PAGE_IDS, type GuideEntry, type PageId } from './types.js';

const PUBLIC_COPY_CHECKS = {
  home: ['Home.tsx', '豊田工業大学の学生を中心に、AI技術、開発、数学、ゲーム、解説動画へ取り組む学生コミュニティです。'],
  about: ['About.tsx', 'TTI Intelligenceの活動内容、参加条件、開催予定、よくある質問を紹介します。'],
  news: ['News.tsx', 'TTI Intelligenceの活動報告、お知らせ、イベント情報、技術記事を掲載しています。'],
  apps: ['AppShowcase.tsx', 'TTI Intelligenceのメンバーが開発したアプリケーションやプロジェクトを紹介します。'],
  development: ['Development.tsx', '最新のAIコーディングツールとMCPを活用したWeb・アプリ開発'],
  board: ['Board.tsx', '質問、相談、活動に関する投稿を確認できます。'],
  contact: ['Contact.tsx', '参加相談や活動に関する質問を送信できます。'],
  'game-community': ['GameCommunity.tsx', 'VALORANT、APEX LEGENDS、Minecraftなどを中心に'],
  'weekly-math': ['WeeklyMath.tsx', 'TTI Intelligenceが公開する数学問題の一覧です。'],
  'table-tennis': ['TableTennisMatchMaker.tsx', '人数とクール数から卓球の組み合わせ表を自動生成するアプリです。'],
  'color-sort': ['ColorSortPuzzle.tsx', '透明なボトルの色を揃える、TTI Intelligenceのミニパズルアプリです。'],
  'cli-practice': ['CliPractice.tsx', 'git・npm・デプロイの流れを安全に体験できます。'],
} as const satisfies Record<PageId, readonly [string, string]>;

function guideEntry(overrides: Partial<GuideEntry> = {}): GuideEntry {
  return {
    id: 'home',
    route: '/',
    title: 'Unmatched title',
    summary: 'Test entry',
    audiences: ['visitor', 'member'],
    keywords: [],
    faqs: [],
    relatedPageIds: [],
    ...overrides,
  };
}

describe('guide catalog', () => {
  it('contains the 12 unique known page ids with canonical routes and relationships', () => {
    const ids = GUIDE_ENTRIES.map(({ id }) => id);

    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    expect(new Set(ids)).toEqual(new Set(PAGE_IDS));

    for (const entry of GUIDE_ENTRIES) {
      expect(entry.route).toBe(KNOWN_PAGE_ROUTES[entry.id].href);
      expect(entry.title).toBe(KNOWN_PAGE_ROUTES[entry.id].title);
      expect(new Set(entry.audiences)).toEqual(new Set(['visitor', 'member']));
      for (const relatedPageId of entry.relatedPageIds) {
        expect(KNOWN_PAGE_ROUTES).toHaveProperty(relatedPageId);
      }
    }
  });

  it('keeps every canonical public route declared in App.tsx', () => {
    const appSource = readFileSync(
      new URL('../../../frontend/src/App.tsx', import.meta.url),
      'utf8',
    );

    expect(appSource).toMatch(/<Route\s+index\s+element=/);
    for (const [id, route] of Object.entries(KNOWN_PAGE_ROUTES)) {
      if (id === 'home') continue;
      expect(appSource).toContain(`path="${route.href.slice(1)}"`);
    }
  });

  it('keeps the five About page FAQs as exact public source copy', () => {
    const aboutSource = readFileSync(
      new URL('../../../frontend/src/pages/About.tsx', import.meta.url),
      'utf8',
    );
    const about = GUIDE_ENTRIES.find(({ id }) => id === 'about');
    const publicFaqs = about?.faqs.slice(0, 5) ?? [];

    expect(publicFaqs).toHaveLength(5);
    for (const faq of publicFaqs) {
      expect(aboutSource).toContain(faq.question);
      expect(aboutSource).toContain(faq.answer);
    }
  });

  for (const [id, [fileName, phrase]] of Object.entries(PUBLIC_COPY_CHECKS)) {
    it(`keeps ${id} guide copy anchored to its public page source`, () => {
      const pageSource = readFileSync(
        new URL(`../../../frontend/src/pages/${fileName}`, import.meta.url),
        'utf8',
      );

      expect(pageSource).toContain(phrase);
    });
  }
});

describe('deterministic guide search', () => {
  it('normalizes Japanese width, case, and whitespace', () => {
    expect(normalizeSearchText('  ＣＬＩ\n Practice  ')).toBe('cli practice');
  });

  it('scores title, keyword, FAQ, and current page deterministically', () => {
    const entry = GUIDE_ENTRIES.find(({ id }) => id === 'weekly-math');
    expect(entry).toBeDefined();
    expect(scoreGuideEntry('今週の数学', null, entry!)).toBeGreaterThanOrEqual(8);
    expect(scoreGuideEntry('数学の問題はどこですか？', null, entry!)).toBeGreaterThanOrEqual(3);
    expect(scoreGuideEntry('関係のない質問', 'weekly-math', entry!)).toBe(1);
  });

  it('does not add partial-title points to an exact title match', () => {
    const entry = guideEntry({ title: 'CLI Practice' });

    expect(scoreGuideEntry('CLI Practice', null, entry)).toBe(8);
    expect(scoreGuideEntry('Try CLI Practice now', null, entry)).toBe(5);
  });

  it('adds three per unique keyword, three per FAQ phrase, and one for current page', () => {
    const entry = guideEntry({
      keywords: ['ALPHA', 'ＢＥＴＡ', 'alpha'],
      faqs: [
        { question: 'first phrase', answer: 'First answer' },
        { question: 'second phrase', answer: 'Second answer' },
      ],
    });

    expect(scoreGuideEntry(
      'alpha beta first phrase second phrase',
      'home',
      entry,
    )).toBe(13);
  });

  it('selects an entry from an FAQ question alone', () => {
    const selected = selectRelevantKnowledge('コマンド操作を練習したい', '/unknown');

    expect(selected.map(({ entry }) => entry.id)).toEqual(['cli-practice']);
    expect(selected[0]?.score).toBeGreaterThanOrEqual(3);
  });

  it('matches when the user phrase appears inside a longer FAQ question', () => {
    const entry = guideEntry({
      keywords: [],
      faqs: [{
        question: 'Gitやnpmの練習はできますか？',
        answer: 'できます。',
      }],
    });

    expect(scoreGuideEntry('Gitやnpm', null, entry)).toBe(3);
    expect(selectRelevantKnowledge('Gitやnpmの練習はできますか？', '/unknown').map(
      ({ entry: selected }) => selected.id,
    )).toContain('cli-practice');
  });

  it('matches common About paraphrases via synonym keywords', () => {
    expect(selectRelevantKnowledge('お金かかるの？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('無料？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('初めてなんだけど入れる？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('土日だけ？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('他大学でも大丈夫？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('Codex使ってる？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('いつ集まってる？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('週何回？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
  });

  it('matches priority visitor phrasings for join, schedule, place, and assistant help', () => {
    expect(selectRelevantKnowledge('入りたい', '/').map(
      ({ entry }) => entry.id,
    )).toEqual(expect.arrayContaining(['about', 'contact']));
    expect(selectRelevantKnowledge('会費ある？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('いつやってる？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('場所はどこ？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('TTIって何', '/').map(
      ({ entry }) => entry.id,
    )).toContain('home');
    expect(selectRelevantKnowledge('豊田工大', '/').map(
      ({ entry }) => entry.id,
    )).toEqual(expect.arrayContaining(['home', 'about']));
    expect(selectRelevantKnowledge('使い方教えて', '/').map(
      ({ entry }) => entry.id,
    )).toContain('home');
    expect(selectRelevantKnowledge('何が聞ける', '/').map(
      ({ entry }) => entry.id,
    )).toContain('home');
    expect(selectRelevantKnowledge('取材したい', '/').map(
      ({ entry }) => entry.id,
    )).toContain('contact');
  });

  it('matches what-can-you-do phrasings', () => {
    expect(selectRelevantKnowledge('何ができる？', '/').map(
      ({ entry }) => entry.id,
    )).toEqual(expect.arrayContaining(['home', 'about']));
    expect(selectRelevantKnowledge('なにができるの', '/').map(
      ({ entry }) => entry.id,
    )).toEqual(expect.arrayContaining(['home', 'about']));
    expect(selectRelevantKnowledge('できること教えて', '/').map(
      ({ entry }) => entry.id,
    )).toEqual(expect.arrayContaining(['home', 'about']));
  });

  it('matches site, company, and partnership phrasings', () => {
    expect(selectRelevantKnowledge('サイト', '/').map(
      ({ entry }) => entry.id,
    )).toContain('home');
    expect(selectRelevantKnowledge('会社から連絡したい', '/').map(
      ({ entry }) => entry.id,
    )).toContain('contact');
    expect(selectRelevantKnowledge('提携したい', '/').map(
      ({ entry }) => entry.id,
    )).toContain('contact');
  });

  it('matches short follow-ups like 何が when recent user history is included', () => {
    expect(selectRelevantKnowledge('何が', '/')).toEqual([]);
    expect(selectRelevantKnowledge(
      '活動内容を知りたい 何が',
      '/',
    ).map(({ entry }) => entry.id)).toEqual(expect.arrayContaining(['home', 'about']));
  });

  it('builds a follow-up search query from recent user history only', () => {
    expect(buildFollowUpSearchQuery('どこから見るの？', [
      { role: 'user', content: '活動内容を知りたい' },
      { role: 'assistant', content: 'About Usをご覧ください。' },
      { role: 'user', content: '今週の数学について教えて' },
    ])).toBe('活動内容を知りたい 今週の数学について教えて どこから見るの？');

    expect(buildFollowUpSearchQuery('どこから見るの？', [
      { role: 'user', content: '古い質問1' },
      { role: 'user', content: '古い質問2' },
      { role: 'user', content: '今週の数学について教えて' },
    ], 1)).toBe('今週の数学について教えて どこから見るの？');

    expect(buildFollowUpSearchQuery('どこ？', [])).toBeNull();
    expect(buildFollowUpSearchQuery('どこ？', [
      { role: 'assistant', content: 'About Usをご覧ください。' },
    ])).toBeNull();
  });

  it('matches short follow-ups when recent user history is included in the query', () => {
    expect(selectRelevantKnowledge('どこから見るの？', '/')).toEqual([]);
    expect(selectRelevantKnowledge(
      '今週の数学について教えて どこから見るの？',
      '/',
    ).map(({ entry }) => entry.id)).toContain('weekly-math');
  });

  it('matches common visitor questions for activities, video, and SNS', () => {
    expect(selectRelevantKnowledge('どんな活動をしていますか？', '/').map(
      ({ entry }) => entry.id,
    )).toEqual(expect.arrayContaining(['home', 'about']));
    expect(selectRelevantKnowledge('YouTubeどこ？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('解説動画見たい', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('Discordある？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('contact');
    expect(selectRelevantKnowledge('Instagramある？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('contact');
    expect(selectRelevantKnowledge('インスタある？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('contact');
    expect(selectRelevantKnowledge('答え教えて', '/').map(
      ({ entry }) => entry.id,
    )).toContain('weekly-math');
    expect(selectRelevantKnowledge('ヒントくれ', '/').map(
      ({ entry }) => entry.id,
    )).toContain('weekly-math');
    expect(selectRelevantKnowledge('なにこれ', '/').map(
      ({ entry }) => entry.id,
    )).toContain('home');
    expect(selectRelevantKnowledge('ページは？', '/')).toEqual([]);
    expect(selectRelevantKnowledge(
      '今週の数学について教えて ページは？',
      '/',
    ).map(({ entry }) => entry.id)).toContain('weekly-math');
    expect(selectRelevantKnowledge('見学だけでもいい？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('どんなアプリがある？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('apps');
    expect(selectRelevantKnowledge('ゲーム初心者でもいい？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('game-community');
    expect(selectRelevantKnowledge('解答ある？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('weekly-math');
    expect(selectRelevantKnowledge('メールで問い合わせたい', '/').map(
      ({ entry }) => entry.id,
    )).toContain('contact');
    expect(selectRelevantKnowledge('応用情報やってる？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('about');
    expect(selectRelevantKnowledge('TOEICのアプリある？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('apps');
    expect(selectRelevantKnowledge('サイトの主なページは？', '/').map(
      ({ entry }) => entry.id,
    )).toContain('home');
  });

  it('resolves only known static and dynamic paths', () => {
    expect(resolveCurrentPageId('/')).toBe('home');
    expect(resolveCurrentPageId('/app/table-tennis')).toBe('table-tennis');
    expect(resolveCurrentPageId('/news/launch')).toBe('news');
    expect(resolveCurrentPageId('/weekly-math/2026-07-16')).toBe('weekly-math');
    expect(resolveCurrentPageId('/weekly-math/2026-07-16/solution')).toBe('weekly-math');
    expect(resolveCurrentPageId('/board/thread-1')).toBe('board');
    expect(resolveCurrentPageId('/admin')).toBeNull();
    expect(resolveCurrentPageId('/unknown')).toBeNull();
    expect(resolveCurrentPageId('/news/launch/comments')).toBeNull();
    expect(resolveCurrentPageId('/board/thread-1/replies')).toBeNull();
  });

  it('excludes scores below three and sorts by score then ASCII id', () => {
    expect(selectRelevantKnowledge('天気予報', '/weekly-math')).toEqual([]);

    expect(selectRelevantKnowledge('参加したい 参加方法', '/unknown').map(
      ({ entry, score }) => [entry.id, score],
    )).toEqual([
      ['contact', 6],
      ['about', 3],
    ]);

    expect(selectRelevantKnowledge('アプリ', '/unknown').map(
      ({ entry }) => entry.id,
    )).toEqual(['apps', 'development']);
  });

  it('returns at most five relevant entries', () => {
    const selected = selectRelevantKnowledge(
      'ホーム 活動内容 お知らせ 作品 プログラミング 掲示板 お問い合わせ ゲーム 数学 卓球 カラーソート ターミナル',
      '/unknown',
    );

    expect(selected).toHaveLength(5);
  });
});

describe('verified links', () => {
  it('drops unknown and unselected page ids and uses canonical routes', () => {
    const selected = selectRelevantKnowledge('卓球の組み合わせ', '/app');
    expect(createVerifiedLinks(
      ['evil', 'weekly-math', 'table-tennis', 'contact', 'table-tennis'],
      selected,
    )).toEqual([
      {
        pageId: 'table-tennis',
        title: 'Table Tennis Match Maker',
        href: '/app/table-tennis',
      },
      { pageId: 'contact', title: 'Contact', href: '/contact' },
    ]);
  });

  it('preserves model order and returns no more than three unique links', () => {
    const selected = selectRelevantKnowledge(
      '卓球 カラーソート ターミナル 作品',
      '/unknown',
    );

    expect(createVerifiedLinks(
      ['cli-practice', 'contact', 'table-tennis', 'color-sort', 'apps'],
      selected,
    ).map(({ pageId }) => pageId)).toEqual([
      'cli-practice',
      'contact',
      'table-tennis',
    ]);
  });

  it('prefers selected content hrefs and rejects unsafe dynamic paths', () => {
    const content = [{
      score: 9,
      entry: {
        id: 'board:thread-1',
        kind: 'board' as const,
        title: '参加相談',
        href: '/board/thread-1',
        excerpt: '見学したいです',
        parentPageId: 'board' as const,
      },
    }];

    expect(createVerifiedLinks(
      ['board'],
      [],
      ['board:thread-1', 'board:missing', 'news:evil'],
      content,
    )).toEqual([
      {
        pageId: 'board',
        title: '参加相談',
        href: '/board/thread-1',
      },
      {
        pageId: 'board',
        title: 'Board',
        href: '/board',
      },
    ]);
  });
});
