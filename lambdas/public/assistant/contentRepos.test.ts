import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMathContentRepository } from './contentRepos.js';

const firebase = vi.hoisted(() => ({
  getApps: vi.fn(() => [{}]),
  initializeApp: vi.fn(() => ({})),
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  getApps: firebase.getApps,
  initializeApp: firebase.initializeApp,
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: firebase.getFirestore,
  collection: firebase.collection,
  getDocs: firebase.getDocs,
}));

describe('createMathContentRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propagates read failures so retrieval can report incomplete context', async () => {
    const failure = new Error('repository unavailable');
    firebase.getDocs.mockRejectedValueOnce(failure);
    const repository = createMathContentRepository({ apiKey: 'test', projectId: 'test' });

    await expect(repository.listPublishedMathProblems()).rejects.toBe(failure);
  });

  it('returns only published problem fields and excludes answers and explanations', async () => {
    firebase.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: '2026-W29',
          data: () => ({
            title: '経路の場合の数',
            problem: '場合の数を求めよ。',
            hint: '回数に注目する。',
            problemPublished: true,
            answer: 'private answer',
            explanation: 'private explanation',
          }),
        },
        {
          id: '2026-W30',
          data: () => ({ title: '未公開', problem: '未公開の問題', problemPublished: false }),
        },
      ],
    });
    const repository = createMathContentRepository({ apiKey: 'test', projectId: 'test' });

    await expect(repository.listPublishedMathProblems()).resolves.toEqual([{
      weekKey: '2026-W29',
      title: '経路の場合の数',
      problem: '場合の数を求めよ。',
      hint: '回数に注目する。',
      problemPublished: true,
    }]);
  });
});
