import { describe, expect, it } from 'vitest';

import { localResponseFor } from './localResponses.js';

describe('localResponseFor', () => {
  it.each(['circle', 'site'] as const)('defers %s questions to the generative path', (scope) => {
    expect(localResponseFor(scope, 'サークルについて教えて')).toBeNull();
  });

  it('returns the university official-site response', () => {
    expect(localResponseFor('university', '豊田工業大学について教えて')).toEqual({
      answer: '豊田工業大学については、公式サイトをご確認ください。',
      links: [{
        pageId: 'toyota-ti',
        title: '豊田工業大学 公式サイト',
        href: 'https://www.toyota-ti.ac.jp/',
      }],
    });
  });

  it('returns the out-of-scope boundary response', () => {
    expect(localResponseFor('out_of_scope', '銀河の年齢を教えて')).toEqual({
      answer: 'TTI Intelligenceと、このサイトの内容について案内できます。',
      links: [],
    });
  });

  it.each([
    ['greeting', 'こんにちは！', 'こんにちは！TTI Intelligenceや、このサイトについて案内できます。'],
    ['thanks', 'ありがとうございます', 'どういたしまして！'],
    ['farewell', 'またね', 'またいつでも聞いてください。'],
    ['acknowledgement', '了解です', '了解です！'],
  ])('returns a short %s response', (_kind, message, answer) => {
    expect(localResponseFor('conversation', message)).toEqual({ answer, links: [] });
  });
});
