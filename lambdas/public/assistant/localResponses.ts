import { isBareEmpathyRemark, isCasualConversation } from './smallTalk.js';
import type { AssistantResponse, HistoryMessage } from './types.js';

const FAREWELLS = /^(?:さようなら|さよなら|またね|また会おう|じゃあね|bye|goodbye)[!！?？。．、,，〜~…・\s]*$/iu;
const GREETINGS = /^(?:こんにちは|こんばんは|おはよう|はじめまして|よろしく|ハロー|hello|hi|hey|やあ|こんちゃ|こんちは)/iu;
const THANKS = /^(?:ありがとう|ありがと|どうもありがとう|サンキュー|さんきゅー|thx|ty|thanks|thank you)/iu;
const CONTEXTUAL_ACKNOWLEDGEMENT = /^(?:はい|はーい|はいはい|うん|うんうん|いいよ|いいです|大丈夫|だいじょうぶ|だいじょぶ|問題ない|ok|okay|オーケー|おけ)(?:です|だよ|ね)?[!！?？。．、,，〜~…・\s]*$/iu;

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
  history: readonly HistoryMessage[] = [],
): AssistantResponse | null {
  const normalized = message.normalize('NFKC').trim();
  if (!FAREWELLS.test(normalized) && !isCasualConversation(message)) {
    return null;
  }

  // 「難しい」 asks for understanding, while 「はい」 can accept an offer in
  // the last answer. Let the model read that answer before responding.
  if (isBareEmpathyRemark(message)) return null;
  const previousTurn = history.at(-1);
  if (
    CONTEXTUAL_ACKNOWLEDGEMENT.test(normalized)
    && previousTurn?.role === 'assistant'
    && !isCasualConversation(previousTurn.content)
    && !FAREWELLS.test(previousTurn.content.normalize('NFKC').trim())
  ) return null;

  return { answer: conversationAnswer(message), links: [] };
}
