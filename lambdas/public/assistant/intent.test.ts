import { describe, expect, it } from 'vitest';

import { routingIntentFor } from './intent.js';

describe('routingIntentFor', () => {
  it('returns routing constraints only and cannot replace Luna prose', () => {
    const intent = routingIntentFor('豊田工業大学について教えて', []);

    expect(intent).toEqual({
      requiresHistory: false,
      excludedPageIds: [],
      excludedExternalLinks: [],
      suppressLinks: false,
    });
    expect(intent).not.toHaveProperty('answer');
    expect(intent).not.toHaveProperty('hint');
    expect(intent).not.toHaveProperty('factIds');
  });

  it('keeps only explicitly rejected page and external-link candidates out', () => {
    expect(routingIntentFor(
      '掲示板とYouTubeはいらない。Discordと問い合わせを教えて',
      [],
    )).toEqual({
      requiresHistory: false,
      excludedPageIds: ['board'],
      excludedExternalLinks: ['youtube'],
      suppressLinks: false,
    });
  });

  it('preserves math and official-source exclusion aliases', () => {
    expect(routingIntentFor(
      '数学じゃなくてYouTubeの解説動画が見たい',
      [],
    ).excludedPageIds).toEqual(['weekly-math']);
    expect(routingIntentFor(
      '大学公式リンクはいらない',
      [],
    ).excludedExternalLinks).toEqual(['toyota-ti']);
  });

  it('suppresses every link when the latest request rejects links', () => {
    expect(routingIntentFor('Discordについて教えて。リンクはいらない', []))
      .toMatchObject({ suppressLinks: true });
  });

  it('also suppresses links for established acknowledgements', () => {
    expect(routingIntentFor('Codex わかりました', [], false))
      .toMatchObject({ suppressLinks: true });
  });

  it('recognizes contextual follow-ups without carrying history into a new topic', () => {
    const history = [{ role: 'user' as const, content: '豊田工業大学について教えて' }];

    expect(routingIntentFor('その場所は？', history, true).requiresHistory).toBe(true);
    expect(routingIntentFor('会費はかかりますか？', history).requiresHistory).toBe(false);
    expect(routingIntentFor('住所を教えて', history, false).requiresHistory).toBe(false);
    expect(routingIntentFor('住所を教えて', history, true).requiresHistory).toBe(true);
    expect(routingIntentFor('どこから見るの？', history, false).requiresHistory)
      .toBe(false);
    expect(routingIntentFor('どこから見るの？', history, true).requiresHistory)
      .toBe(true);
    expect(routingIntentFor(
      'どこに豊田工業大学がありますか？',
      history,
      false,
    ).requiresHistory).toBe(false);
    expect(routingIntentFor('これから京都へ旅行します', history, false).requiresHistory)
      .toBe(false);
  });

  it('does not expose removed Assistant app candidates through exclusions', () => {
    const intent = routingIntentFor(
      'CLI PracticeとTOEIC Practiceはいらない。開発について教えて',
      [],
    );

    expect(intent.excludedPageIds).toEqual([]);
  });
});
