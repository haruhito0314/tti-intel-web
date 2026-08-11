import { isCasualConversation } from './smallTalk.js';
import type { AssistantResponse } from './types.js';

const FAREWELLS = /^(?:さようなら|さよなら|またね|また会おう|じゃあね|bye|goodbye)[!！?？。．、,，〜~…・\s]*$/iu;
const GREETINGS = /^(?:こんにちは|こんばんは|おはよう|はじめまして|よろしく|ハロー|hello|hi|hey|やあ|こんちゃ|こんちは)/iu;
const THANKS = /^(?:ありがとう|ありがと|どうもありがとう|サンキュー|さんきゅー|thx|ty|thanks|thank you)/iu;

function conversationAnswer(message: string): string {
  const normalized = message.normalize('NFKC').trim();
  if (FAREWELLS.test(normalized)) return 'またいつでも聞いてください。';
  if (GREETINGS.test(normalized)) {
    return 'こんにちは！TTI Intelligenceや、このサイトについて案内できます。';
  }
  if (THANKS.test(normalized)) return 'どういたしまして！';
  return '了解です！';
}

export function localConversationResponseFor(
  message: string,
): AssistantResponse | null {
  if (!FAREWELLS.test(message.normalize('NFKC').trim()) && !isCasualConversation(message)) {
    return null;
  }
  return { answer: conversationAnswer(message), links: [] };
}
