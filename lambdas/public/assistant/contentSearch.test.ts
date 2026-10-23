import { describe, expect, it, vi } from 'vitest';

import {
  contentIdFor,
  isWeeklyMathListingQuery,
  scoreContentCandidate,
  searchRelevantContent,
  selectRelevantContent,
  retrieveDynamicContentSafely,
  truncateExcerpt,
  type ContentRepositories,
} from './contentSearch.js';

function createRepos(
  overrides: Partial<ContentRepositories> = {},
): ContentRepositories {
  return {
    listPublishedNews: vi.fn(async () => []),
    getNewsBySlug: vi.fn(async () => null),
    listBoardThreads: vi.fn(async () => []),
    listPublishedMathProblems: vi.fn(async () => []),
    ...overrides,
  };
}

describe('contentSearch', () => {
  it('returns selected content with an available dynamic-content flag', async () => {
    const selected = [{
      score: 8,
      entry: {
        id: 'news:welcome',
        kind: 'news' as const,
        title: 'Welcome',
        href: '/news/welcome',
        excerpt: 'Published body',
        parentPageId: 'news' as const,
      },
    }];

    await expect(retrieveDynamicContentSafely(async () => selected)).resolves.toEqual({
      content: selected,
      dynamicContentAvailable: true,
    });
  });

  it('contains a dynamic-content exception at the retrieval boundary', async () => {
    await expect(retrieveDynamicContentSafely(async () => {
      throw new Error('private repository failure');
    })).resolves.toEqual({
      content: [],
      dynamicContentAvailable: false,
    });
  });

  it('keeps a partial-availability result intact at the retrieval boundary', async () => {
    const result = { content: [], dynamicContentAvailable: false };
    await expect(retrieveDynamicContentSafely(async () => result)).resolves.toEqual(result);
  });

  it('preserves board and math matches when the news repository fails', async () => {
    const repositories = createRepos({
      listPublishedNews: vi.fn(async () => { throw new Error('news unavailable'); }),
      listBoardThreads: vi.fn(async () => [{
        threadId: 'spring-event',
        title: '春の交流会',
        body: '交流会の相談です。',
      }]),
      listPublishedMathProblems: vi.fn(async () => [{
        weekKey: '2026-W29',
        title: '経路の場合の数',
        problem: '場合の数を求めよ。',
        problemPublished: true,
      }]),
    });

    const result = await searchRelevantContent('春の交流会と経路の場合の数', repositories);
    expect(result.dynamicContentAvailable).toBe(false);
    expect(result.content.map(({ entry }) => entry.id))
      .toEqual(['board:spring-event', 'weekly-math:2026-W29']);
    expect(repositories.getNewsBySlug).not.toHaveBeenCalled();
  });

  it('preserves news matches when the board and math repositories fail', async () => {
    const article = {
      postId: '1', slug: 'spring-event', title: '春の交流会', status: 'published',
    };
    const repositories = createRepos({
      listPublishedNews: vi.fn(async () => [article]),
      getNewsBySlug: vi.fn(async () => ({ ...article, content: '交流会のお知らせです。' })),
      listBoardThreads: vi.fn(async () => { throw new Error('board unavailable'); }),
      listPublishedMathProblems: vi.fn(async () => { throw new Error('math unavailable'); }),
    });

    const result = await searchRelevantContent('春の交流会', repositories);
    expect(result.dynamicContentAvailable).toBe(false);
    expect(result.content.map(({ entry }) => entry.id)).toEqual(['news:spring-event']);
  });

  it('skips only the failed article detail and marks the lookup as incomplete', async () => {
    const first = { postId: '1', slug: 'spring-event', title: '春の交流会' };
    const second = { postId: '2', slug: 'study-group', title: '新入生勉強会' };
    const repositories = createRepos({
      listPublishedNews: vi.fn(async () => [first, second]),
      getNewsBySlug: vi.fn(async (slug) => {
        if (slug === first.slug) throw new Error('detail unavailable');
        return { ...second, content: '新入生を対象にした勉強会です。' };
      }),
    });

    const result = await searchRelevantContent('春の交流会と新入生勉強会', repositories);
    expect(result.dynamicContentAvailable).toBe(false);
    expect(result.content.map(({ entry }) => entry.id)).toEqual(['news:study-group']);
    expect(repositories.getNewsBySlug).toHaveBeenCalledTimes(2);
  });

  it('distinguishes total repository failure from a successful empty lookup', async () => {
    const unavailable = async () => { throw new Error('repository unavailable'); };
    await expect(searchRelevantContent('お知らせ', createRepos({
      listPublishedNews: unavailable,
      listBoardThreads: unavailable,
      listPublishedMathProblems: unavailable,
    }))).resolves.toEqual({ content: [], dynamicContentAvailable: false });
    await expect(searchRelevantContent('お知らせ', createRepos()))
      .resolves.toEqual({ content: [], dynamicContentAvailable: true });
  });

  it('does not treat a deleted or unpublished article as a repository failure', async () => {
    const repositories = createRepos({
      listPublishedNews: vi.fn(async () => [{
        postId: '1', slug: 'removed', title: '春の交流会',
      }]),
      getNewsBySlug: vi.fn(async () => null),
    });
    await expect(searchRelevantContent('春の交流会', repositories))
      .resolves.toEqual({ content: [], dynamicContentAvailable: true });
  });

  it('truncates long excerpts without leaking answer fields from math shaping', async () => {
    expect(truncateExcerpt('a'.repeat(1_250)).endsWith('…')).toBe(true);

    const repositories = createRepos({
      listPublishedMathProblems: vi.fn(async () => [{
        weekKey: '2026-W29',
        title: '経路の場合の数',
        problem: 'カードを引いて a_n=1 となる場合の数を求めよ。',
        hint: '+1 と -1 の回数に注目する',
        problemPublished: true,
      }]),
    });

    const selected = await selectRelevantContent('経路の場合の数', repositories);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.entry.id).toBe(contentIdFor('weekly-math', '2026-W29'));
    expect(selected[0]?.entry.excerpt).toContain('ヒント');
    expect(JSON.stringify(selected)).not.toMatch(/answer|explanation|解答/);
  });

  it('scores and hydrates matching news articles', async () => {
    const repositories = createRepos({
      listPublishedNews: vi.fn(async () => [{
        postId: '1',
        slug: 'welcome-to-tti-intelligence',
        title: 'TTI Intelligenceへようこそ',
        excerpt: 'サークル紹介のお知らせ',
        tags: ['お知らせ'],
        status: 'published',
      }]),
      getNewsBySlug: vi.fn(async () => ({
        postId: '1',
        slug: 'welcome-to-tti-intelligence',
        title: 'TTI Intelligenceへようこそ',
        excerpt: 'サークル紹介のお知らせ',
        content: '本文です。活動内容を紹介しています。',
        tags: ['お知らせ'],
        status: 'published',
      })),
    });

    const selected = await selectRelevantContent(
      'TTI Intelligenceへようこそ',
      repositories,
    );
    expect(selected[0]?.entry).toMatchObject({
      kind: 'news',
      href: '/news/welcome-to-tti-intelligence',
      parentPageId: 'news',
    });
    expect(selected[0]?.entry.excerpt).toContain('本文です');
  });

  it('selects board threads by title overlap', async () => {
    const repositories = createRepos({
      listBoardThreads: vi.fn(async () => [{
        threadId: 'thread-1',
        title: '参加相談のスレッド',
        body: '見学したいです',
      }]),
    });

    const selected = await selectRelevantContent('参加相談のスレッド', repositories);
    expect(selected[0]?.entry.href).toBe('/board/thread-1');
  });

  it.each(['spring-event', '春の交流会'])(
    'retrieves the current article by its encoded detail path: %s',
    async (slug) => {
      const article = { postId: '1', slug, title: '新歓のご案内' };
      const repositories = createRepos({
        listPublishedNews: vi.fn(async () => [article]),
        getNewsBySlug: vi.fn(async () => ({ ...article, content: '体験会の日時です。' })),
      });

      const result = await searchRelevantContent(
        `この記事の内容を教えて\n/news/${encodeURIComponent(slug)}`,
        repositories,
      );
      expect(result.dynamicContentAvailable).toBe(true);
      expect(result.content.map(({ entry }) => entry.id)).toEqual([`news:${slug}`]);
    },
  );

  it('retrieves the current board post without matching a different ID prefix', async () => {
    const repositories = createRepos({
      listBoardThreads: vi.fn(async () => [
        { threadId: '1', title: '見学の相談', body: '見学したいです。' },
        { threadId: '10', title: '新歓のご案内', body: '体験会の日時です。' },
      ]),
    });

    const result = await searchRelevantContent('この投稿の内容を教えて\n/board/10', repositories);
    expect(result.content.map(({ entry }) => entry.id)).toEqual(['board:10']);
  });

  it('does not match an article slug that is only a prefix of the current path', async () => {
    const article = { postId: '1', slug: 'spring-event', title: '新歓のご案内' };
    const repositories = createRepos({
      listPublishedNews: vi.fn(async () => [article]),
    });
    const result = await searchRelevantContent(
      'この記事の内容を教えて\n/news/spring-event-extra',
      repositories,
    );
    expect(result.content).toEqual([]);
    expect(repositories.getNewsBySlug).not.toHaveBeenCalled();
  });

  it('ignores weak matches below the score threshold', async () => {
    expect(scoreContentCandidate('天気', { title: '無関係な記事' })).toBeLessThan(3);
    const selected = await selectRelevantContent('天気はどう？', createRepos({
      listPublishedNews: vi.fn(async () => [{
        postId: '1',
        slug: 'welcome',
        title: 'TTI Intelligenceへようこそ',
        excerpt: 'サークル紹介',
      }]),
    }));
    expect(selected).toEqual([]);
  });

  it('does not attach individual math problems for listing-style questions', async () => {
    const repositories = createRepos({
      listPublishedMathProblems: vi.fn(async () => [
        {
          weekKey: '2026-W28',
          title: '数列の和',
          problem: '和を求めよ',
          problemPublished: true,
        },
        {
          weekKey: '2026-W29',
          title: '経路の場合の数',
          problem: '場合の数を求めよ',
          problemPublished: true,
        },
        {
          weekKey: '2026-W30',
          title: '確率',
          problem: '確率を求めよ',
          problemPublished: true,
        },
      ]),
    });

    expect(isWeeklyMathListingQuery('今週の数学について教えて')).toBe(true);
    expect(await selectRelevantContent('今週の数学について教えて', repositories)).toEqual([]);
    expect(await selectRelevantContent('答え教えて', repositories)).toEqual([]);
    expect(await selectRelevantContent('数学', repositories)).toEqual([]);

    const specific = await selectRelevantContent('経路の場合の数', repositories);
    expect(specific).toHaveLength(1);
    expect(specific[0]?.entry.id).toBe(contentIdFor('weekly-math', '2026-W29'));
  });

  it('does not flood every math item from a bare category word', async () => {
    const repositories = createRepos({
      listPublishedMathProblems: vi.fn(async () => [
        {
          weekKey: '2026-W28',
          title: '数列の和',
          problem: '和を求めよ',
          problemPublished: true,
        },
        {
          weekKey: '2026-W29',
          title: '経路の場合の数',
          problem: '場合の数を求めよ',
          problemPublished: true,
        },
        {
          weekKey: '2026-W30',
          title: '確率',
          problem: '確率を求めよ',
          problemPublished: true,
        },
      ]),
    });

    expect(await selectRelevantContent('数学', repositories)).toEqual([]);
    expect(scoreContentCandidate('数学', {
      title: '経路の場合の数',
      categoryKeywords: ['数学', '問題', '今週'],
    })).toBe(0);
  });

  it('retrieves an explicitly named problem in a follow-up to a math listing', async () => {
    const repositories = createRepos({
      listPublishedMathProblems: vi.fn(async () => [
        {
          weekKey: '2026-W29',
          title: '経路の場合の数',
          problem: '場合の数を求めよ',
          problemPublished: true,
        },
        {
          weekKey: '2026-W30',
          title: '数列の和',
          problem: '和を求めよ',
          problemPublished: true,
        },
      ]),
    });

    const selected = await selectRelevantContent(
      '今週の数学について教えて\n「経路の場合の数」が公開されています。\nもっと詳しく',
      repositories,
    );
    expect(selected.map(({ entry }) => entry.id)).toEqual(['weekly-math:2026-W29']);
  });

  it('does not flood titles from short reverse query matches', () => {
    expect(scoreContentCandidate('経路', {
      title: '経路の場合の数を考える問題',
    })).toBeLessThan(3);
    expect(scoreContentCandidate('経路の場合の数', {
      title: '経路の場合の数を考える問題',
    })).toBeGreaterThanOrEqual(5);
  });

  it('still boosts category keywords when the item already matched', () => {
    const withoutCategory = scoreContentCandidate('経路の場合の数', {
      title: '経路の場合の数',
    });
    const withCategory = scoreContentCandidate('経路の場合の数', {
      title: '経路の場合の数',
      categoryKeywords: ['数学', '経路'],
    });
    // 「経路」 is in both query and categoryKeywords → +1 on top of title match.
    expect(withoutCategory).toBeGreaterThanOrEqual(3);
    expect(withCategory).toBe(withoutCategory + 1);
  });
});
