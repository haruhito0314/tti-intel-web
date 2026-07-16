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
});
