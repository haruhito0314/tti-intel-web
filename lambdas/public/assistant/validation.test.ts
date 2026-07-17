import { describe, expect, it } from 'vitest';

import {
  parseAssistantRequest,
  RequestValidationError,
  UnsafeModelOutputError,
  validateModelGuideResponse,
} from './validation.js';

const validRequest = {
  message: '今週の数学はどこ？',
  currentPath: '/news',
  sessionId: '11111111-1111-4111-8111-111111111111',
  history: [
    { role: 'user', content: '活動内容を知りたい' },
  ],
};

describe('parseAssistantRequest', () => {
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
    ['3 history messages', JSON.stringify({
      ...validRequest,
      history: Array.from({ length: 3 }, () => ({ role: 'user', content: 'x' })),
    })],
    ['801 history code units', JSON.stringify({
      ...validRequest,
      history: [{ role: 'user', content: 'x'.repeat(801) }],
    })],
    ['1,201 total history code units', JSON.stringify({
      ...validRequest,
      history: [
        { role: 'user', content: 'x'.repeat(800) },
        { role: 'user', content: 'x'.repeat(401) },
      ],
    })],
    ['blank history content', JSON.stringify({
      ...validRequest,
      history: [{ role: 'user', content: '   ' }],
    })],
    ['assistant history role', JSON.stringify({
      ...validRequest,
      history: [{ role: 'assistant', content: 'x' }],
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
  it('parses and trims a valid model response', () => {
    expect(validateModelGuideResponse({
      answer: '  今週の数学はNewsから確認できます。  ',
      pageIds: ['news', 'weekly-math'],
    contentIds: [],
    })).toEqual({
      answer: '今週の数学はNewsから確認できます。',
      pageIds: ['news', 'weekly-math'],
    contentIds: [],
    });
  });

  it.each([
    ['null output', null],
    ['array output', []],
    ['empty answer', { answer: '   ', pageIds: [], contentIds: [] }],
    ['201 character answer', { answer: 'a'.repeat(201), pageIds: [], contentIds: [] }],
    ['4 IDs', { answer: 'answer', pageIds: ['home', 'about', 'news', 'apps'], contentIds: [] }],
    ['duplicate ID', { answer: 'answer', pageIds: ['news', 'news'], contentIds: [] }],
    ['non-string ID', { answer: 'answer', pageIds: ['news', 1], contentIds: [] }],
    ['invalid ID format', { answer: 'answer', pageIds: ['News'], contentIds: [] }],
    ['missing contentIds', { answer: 'answer', pageIds: [] }],
    ['extra property', { answer: 'answer', pageIds: [], contentIds: [], extra: true }],
  ])('rejects %s', (_name, value) => {
    expect(() => validateModelGuideResponse(value)).toThrow(UnsafeModelOutputError);
  });
});
