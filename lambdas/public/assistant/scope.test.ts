import { describe, expect, it } from 'vitest';

import { shouldSearchDynamicContent } from './scope.js';

describe('shouldSearchDynamicContent', () => {
  it.each([
    ['最新のお知らせは？', '/', true],
    ['東京の最新ニュースは？', '/', true],
    ['掲示板は投稿していいの？', '/', true],
    ['今週の数学は？', '/', true],
    ['Codexとは？', '/', false],
    ['豊田工業大学について教えて', '/', false],
    ['こんにちは', '/', false],
    ['確認', '/news', true],
    ['確認', '/board', true],
    ['確認', '/weekly-math', true],
    ['確認', '/news/latest', false],
    ['確認', '/board/thread-1', false],
    ['確認', '/weekly-math/2026-08-10', false],
    ['/news', '/', true],
    ['/news/latest', '/', false],
  ] as const)('returns %s for %s at %s', (message, currentPath, expected) => {
    expect(shouldSearchDynamicContent(message, currentPath)).toBe(expected);
  });
});
