import { TOYOTA_TI_URL, normalizeSearchText } from './runtimeCatalog.js';
import { isGreetingMessage } from './smallTalk.js';
import type { AssistantScope } from './scope.js';
import type { AssistantResponse } from './types.js';

const FAREWELLS = new Set(['さようなら', 'さよなら', 'またね', 'また会おう', 'じゃあね', 'bye', 'goodbye']);
const ACKNOWLEDGEMENTS = new Set([
  '了解', '了解です', '了解しました', 'りょうかい', 'わかった', 'わかりました',
  'オーケー', 'おけ', 'おけです', 'ok', 'okay',
]);

function normalizedConversationMessage(message: string): string {
  return normalizeSearchText(message).replace(/[!！?？。．、,，〜~…・]/g, '');
}

function conversationAnswer(message: string): string {
  const normalized = normalizedConversationMessage(message);

  if (FAREWELLS.has(normalized)) return 'またいつでも聞いてください。';
  if (isGreetingMessage(message)) return 'こんにちは！TTI Intelligenceや、このサイトについて案内できます。';
  if (/^(?:ありがとう|ありがと|どうもありがとう|サンキュー|さんきゅー|thx|ty|thanks|thank you)/.test(normalized)) {
    return 'どういたしまして！';
  }
  if (ACKNOWLEDGEMENTS.has(normalized)) return '了解です！';
  return '了解です！';
}

export function localResponseFor(
  scope: AssistantScope,
  message: string,
): AssistantResponse | null {
  if (scope === 'circle' || scope === 'site') return null;

  if (scope === 'university') {
    return {
      answer: '豊田工業大学については、公式サイトをご確認ください。',
      links: [{
        pageId: 'toyota-ti',
        title: '豊田工業大学 公式サイト',
        href: TOYOTA_TI_URL,
      }],
    };
  }

  if (scope === 'out_of_scope') {
    return {
      answer: 'TTI Intelligenceと、このサイトの内容について案内できます。',
      links: [],
    };
  }

  return { answer: conversationAnswer(message), links: [] };
}
