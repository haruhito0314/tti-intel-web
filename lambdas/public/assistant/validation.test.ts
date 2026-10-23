import { describe, expect, it } from 'vitest';

import {
  parseAssistantRequest,
  RequestValidationError,
  UnsafeModelOutputError,
  validateModelGuideResponse,
} from './validation.js';
import type { ModelGuideValidationContext } from './types.js';

const validRequest = {
  message: '今週の数学はどこ？',
  currentPath: '/news',
  sessionId: '11111111-1111-4111-8111-111111111111',
  history: [
    { role: 'user', content: '活動内容を知りたい' },
  ],
};

describe('parseAssistantRequest', () => {
  it('accepts all three question/answer exchanges without dropping assistant choices', () => {
    const history = Array.from({ length: 3 }, (_, index) => [
      { role: 'user', content: `質問${index}` },
      { role: 'assistant', content: '1. アプリ開発 2. ゲーム活動' },
    ]).flat();
    expect(parseAssistantRequest(JSON.stringify({ ...validRequest, history })).history).toEqual(history);
  });

  it('accepts the full supported history budget', () => {
    const history = Array.from({ length: 3 }, () => [
      { role: 'user', content: 'あ'.repeat(500) },
      { role: 'assistant', content: '答'.repeat(1200), references: Array(4).fill('参'.repeat(120)) },
    ]).flat();
    expect(parseAssistantRequest(JSON.stringify({ ...validRequest, history })).history).toEqual(history);
  });


  it.each([
    { role: 'user', content: '質問', references: ['記事'] },
    { role: 'assistant', content: '回答', references: ['x'.repeat(121)] },
    { role: 'assistant', content: '回答', references: Array(5).fill('記事') },
    { role: 'assistant', content: '回答', references: ['   '] },
    { role: 'assistant', content: '回答', references: [3] },
  ])('rejects unbounded or malformed reference titles', (entry) => {
    expect(() => parseAssistantRequest(JSON.stringify({ ...validRequest, history: [entry] }))).toThrow(RequestValidationError);
  });

  it('parses and trims a valid request', () => {
    expect(parseAssistantRequest(JSON.stringify({
      ...validRequest,
      message: '  今週の数学はどこ？  ',
    }))).toEqual(validRequest);
  });

  it('trims history content in the returned request', () => {
    expect(parseAssistantRequest(JSON.stringify({
      ...validRequest,
      history: [{ role: 'user', content: '  活動内容を知りたい  ' }],
    })).history).toEqual([{ role: 'user', content: '活動内容を知りたい' }]);
  });

  it('accepts an uppercase RFC 4122 version 4 UUID', () => {
    const request = parseAssistantRequest(JSON.stringify({
      ...validRequest,
      sessionId: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',
    }));

    expect(request.sessionId).toBe('AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA');
  });

  it.each([
    ['null body', null],
    ['broken JSON', '{'],
    ['oversized raw body', ' '.repeat(65_537)],
    ['null JSON root', 'null'],
    ['array JSON root', '[]'],
    ['blank message', JSON.stringify({ ...validRequest, message: '   ' })],
    ['501 code units', JSON.stringify({ ...validRequest, message: 'a'.repeat(501) })],
    ['invalid UUID', JSON.stringify({ ...validRequest, sessionId: 'session-1' })],
    ['query in path', JSON.stringify({ ...validRequest, currentPath: '/news?page=1' })],
    ['hash in path', JSON.stringify({ ...validRequest, currentPath: '/news#top' })],
    ['backslash in path', JSON.stringify({ ...validRequest, currentPath: '/news\\archive' })],
    ['path without leading slash', JSON.stringify({ ...validRequest, currentPath: 'news' })],
    ['257 path code units', JSON.stringify({ ...validRequest, currentPath: `/${'a'.repeat(256)}` })],
    ['7 history messages', JSON.stringify({
      ...validRequest,
      history: Array.from({ length: 7 }, () => ({ role: 'user', content: 'x' })),
    })],
    ['501 user history code units', JSON.stringify({
      ...validRequest,
      history: [{ role: 'user', content: 'x'.repeat(501) }],
    })],
    ['6,541 total history code units', JSON.stringify({
      ...validRequest,
      history: [
        { role: 'assistant', content: 'x'.repeat(1200) },
        { role: 'assistant', content: 'x'.repeat(1200) },
        { role: 'assistant', content: 'x'.repeat(1200) },
        { role: 'assistant', content: 'x'.repeat(1200) },
        { role: 'assistant', content: 'x'.repeat(1200) },
        { role: 'assistant', content: 'x'.repeat(541) },
      ],
    })],
    ['blank history content', JSON.stringify({
      ...validRequest,
      history: [{ role: 'user', content: '   ' }],
    })],
    ['1,201 assistant history code units', JSON.stringify({
      ...validRequest,
      history: [{ role: 'assistant', content: 'x'.repeat(1201) }],
    })],
    ['unknown role', JSON.stringify({
      ...validRequest,
      history: [{ role: 'system', content: 'x' }],
    })],
    ['ASCII control in path', JSON.stringify({ ...validRequest, currentPath: '/news\u0000archive' })],
    ['scheme-relative path', JSON.stringify({ ...validRequest, currentPath: '//evil.example' })],
  ])('rejects %s', (_name, body) => {
    expect(() => parseAssistantRequest(body)).toThrow(RequestValidationError);
  });

  it('accepts an unknown but syntactically valid pathname', () => {
    expect(parseAssistantRequest(JSON.stringify({
      ...validRequest,
      currentPath: '/not-a-known-page',
    })).currentPath).toBe('/not-a-known-page');
  });
});

describe('validateModelGuideResponse', () => {
  const context: ModelGuideValidationContext = {
    allowedPageIds: ['about', 'news', 'contact'],
    allowedContentIds: ['news:welcome'],
    allowedSourceIds: ['discord', 'youtube', 'toyota-ti'],
  };

  const validCircle = {
    scope: 'circle',
    topicLabel: '',
    answer: 'TTI Intelligenceでは開発や学習活動を行っています。詳しくはサークルについてをご覧ください。',
    pageIds: ['about'],
    contentIds: ['news:welcome'],
    sourceIds: ['discord'],
  };

  const validSite = {
    scope: 'site',
    topicLabel: '',
    answer: 'このサイトでは活動内容やアプリを紹介しています。お知らせページもご確認いただけます。',
    pageIds: ['news'],
    contentIds: [],
    sourceIds: ['youtube'],
  };

  const validUniversity = {
    scope: 'university',
    topicLabel: '',
    answer: '豊田工業大学については公式サイトをご確認ください。',
    pageIds: [],
    contentIds: [],
    sourceIds: ['toyota-ti'],
  };

  const validOutOfScope = {
    scope: 'out_of_scope',
    topicLabel: '東京の天気',
    answer: '東京の天気については案内できません。このサイトやTTI Intelligenceについてならお答えできます。',
    pageIds: [],
    contentIds: [],
    sourceIds: [],
  };

  it.each([validCircle, validSite, validUniversity, validOutOfScope])(
    'accepts a valid $scope result',
    (value) => {
      expect(validateModelGuideResponse(value, context)).toEqual(value);
    },
  );

  it('accepts a valid site result with a safe non-empty topic label', () => {
    const value = { ...validSite, topicLabel: 'サイトの内容' };

    expect(validateModelGuideResponse(value, context)).toEqual(value);
  });

  it.each(
    [validCircle, validSite, validUniversity, validOutOfScope].flatMap((value) => [
      ['control character', value.scope, { ...value, topicLabel: 'サイト\u0000' }],
      ['raw URL', value.scope, { ...value, topicLabel: 'https://example.com' }],
      ['Markdown', value.scope, { ...value, topicLabel: '**サイト**' }],
      ['25 code points', value.scope, { ...value, topicLabel: '😀'.repeat(25) }],
    ]),
  )('rejects a %s topic label for %s', (_kind, _scope, value) => {
    expect(() => validateModelGuideResponse(value, context)).toThrow(UnsafeModelOutputError);
  });

  it('accepts exactly 1200 UTF-16 code units', () => {
    const answer = '😀'.repeat(600);
    expect(validateModelGuideResponse({ ...validSite, answer }, context).answer).toBe(answer);
  });


  it('accepts a useful explanation with paragraphs and more than two sentences', () => {
    const answer = '掲示板から投稿できます。\n1. 新規スレッドを開きます。\n2. タイトルと本文を入力します。\n3. 投稿ボタンを押します。';
    expect(validateModelGuideResponse({ ...validSite, answer }, context).answer).toBe(answer);
  });

  it('accepts normal Japanese punctuation in a safe answer', () => {
    const answer = '活動内容はサイトで確認できます。詳しくはお問い合わせください！';
    expect(validateModelGuideResponse({ ...validSite, answer }, context).answer).toBe(answer);
  });

  it.each([
    'はい。掲示板は誰でも匿名で自由に書き込めます。質問や相談などを投稿できます。',
    'いいえ。表示名は空欄でも投稿できます。空欄の場合は匿名と表示されます。',
    'もちろんです。掲示板にはスレッドを投稿できます。コメントも書き込めます。',
    'ご提案ありがとうございます。幅広いご相談を歓迎しています。詳しくはお問い合わせください。',
    'ご相談ありがとうございます。内容を確認して判断します。詳しくはお問い合わせください。',
  ])('accepts natural replies with multiple sentences: %s', (answer) => {
    expect(validateModelGuideResponse({ ...validSite, answer }, context).answer).toBe(answer);
  });

  it('accepts a safe university direction without a source ID', () => {
    const value = {
      ...validUniversity,
      answer: '詳しくは豊田工業大学の公式ウェブサイトをご覧ください。',
      sourceIds: [],
    };

    expect(validateModelGuideResponse(value, context)).toEqual(value);
  });

  it('accepts a safe bounded out-of-scope answer without prescribed wording', () => {
    const value = {
      ...validOutOfScope,
      answer: '東京の天気には対応できません。お問い合わせフォームをご利用ください。',
    };

    expect(validateModelGuideResponse(value, context)).toEqual(value);
  });

  it.each([
    'お問い合わせはtti.intel@gmail.comまでお願いします。',
    '連絡先はhello@example.orgです。',
  ])('accepts a plain-text email address in a safe answer: %s', (answer) => {
    expect(validateModelGuideResponse({ ...validSite, answer }, context).answer).toBe(answer);
  });

  it.each([
    ['unknown scope', { ...validSite, scope: 'other' }],
    ['extra property', { ...validSite, extra: true }],
    ['raw URL in answer', { ...validSite, answer: 'https://example.com を見てください。' }],
    ['Markdown link in answer', { ...validSite, answer: '[外部サイト](https://example.com)' }],
    ['bare domain in answer', { ...validSite, answer: 'example.com を見てください。' }],
    ['protocol-relative URL in answer', { ...validSite, answer: '//example.com を見てください。' }],
    ['www URL in answer', { ...validSite, answer: 'www.example.com を見てください。' }],
    ['ordinary Markdown in answer', { ...validSite, answer: '**重要**です。' }],
    ['raw URL in topic label', { ...validOutOfScope, topicLabel: 'https://evil.example' }],
    ['Markdown link in topic label', { ...validOutOfScope, topicLabel: '[天気](https://evil.example)' }],
    ['control character in answer', { ...validSite, answer: '確認してください\u0000。' }],
    ['1201 UTF-16 code units', { ...validSite, answer: 'あ'.repeat(1201) }],
    ['blank out-of-scope topic label', { ...validOutOfScope, topicLabel: '' }],
    ['whitespace-only out-of-scope topic label', {
      ...validOutOfScope,
      topicLabel: '   ',
      answer: '申し訳ありませんが、   については案内できません。必要であればお問い合わせください。',
    }],
    ['unknown page ID', { ...validSite, pageIds: ['apps'] }],
    ['unknown content ID', { ...validCircle, contentIds: ['news:unknown'] }],
    ['unknown source ID', { ...validSite, sourceIds: ['unknown-source'] }],
    ['four IDs', { ...validSite, pageIds: ['about', 'news', 'contact', 'about'] }],
    ['duplicate ID', { ...validSite, pageIds: ['news', 'news'] }],
    ['circle Toyota link', { ...validCircle, sourceIds: ['toyota-ti'] }],
    ['site Toyota link', { ...validSite, sourceIds: ['toyota-ti'] }],
    ['university internal page link', { ...validUniversity, pageIds: ['about'] }],
    ['out-of-scope source link', { ...validOutOfScope, sourceIds: ['discord'] }],
    ['out-of-scope page link', { ...validOutOfScope, pageIds: ['about'] }],
  ])('rejects %s', (_name, value) => {
    expect(() => validateModelGuideResponse(value, context)).toThrow(UnsafeModelOutputError);
  });
});
