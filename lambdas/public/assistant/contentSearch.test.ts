import { describe, expect, it, vi } from 'vitest';

import {
  contentIdFor,
  scoreContentCandidate,
  selectRelevantContent,
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
