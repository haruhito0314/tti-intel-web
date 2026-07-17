import { describe, expect, it } from 'vitest';

import {
  buildUnansweredQuestionRecord,
  UNANSWERED_TTL_SECONDS,
} from './unansweredQuestions.js';

describe('buildUnansweredQuestionRecord', () => {
  it('builds a JST day-partitioned item with TTL and without session data', () => {
    // 2026-07-16T20:00Z == 2026-07-17 05:00 JST
    const now = new Date('2026-07-16T20:00:00.000Z');
    const record = buildUnansweredQuestionRecord({
      requestId: 'lambda-request-1',
      message: '今日の天気は？',
      currentPath: '/news',
      reason: 'no_relevant_knowledge',
      now,
    });

    expect(record).toEqual({
      pk: 'DAY#2026-07-17',
      sk: 'TS#2026-07-16T20:00:00.000Z#lambda-request-1',
      message: '今日の天気は？',
      currentPath: '/news',
      reason: 'no_relevant_knowledge',
      requestId: 'lambda-request-1',
      createdAt: '2026-07-16T20:00:00.000Z',
      expiresAt: Math.floor(now.getTime() / 1000) + UNANSWERED_TTL_SECONDS,
    });
    expect(JSON.stringify(record)).not.toContain('session');
  });
});
