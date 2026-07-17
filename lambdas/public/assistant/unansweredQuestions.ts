import { PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { jstDateKey } from './dayKey.js';

export const UNANSWERED_TTL_SECONDS = 90 * 24 * 60 * 60;

export type UnansweredReason =
  | 'no_relevant_knowledge'
  | 'unsafe_model_output';

export interface UnansweredQuestionInput {
  requestId: string;
  message: string;
  currentPath: string;
  reason: UnansweredReason;
  now: Date;
}

export interface UnansweredQuestionRecord {
  pk: string;
  sk: string;
  message: string;
  currentPath: string;
  reason: UnansweredReason;
  requestId: string;
  createdAt: string;
  expiresAt: number;
}

export function buildUnansweredQuestionRecord(
  input: UnansweredQuestionInput,
): UnansweredQuestionRecord {
  const createdAt = input.now.toISOString();
  return {
    pk: `DAY#${jstDateKey(input.now)}`,
    sk: `TS#${createdAt}#${input.requestId}`,
    message: input.message,
    currentPath: input.currentPath,
    reason: input.reason,
    requestId: input.requestId,
    createdAt,
    expiresAt: Math.floor(input.now.getTime() / 1000) + UNANSWERED_TTL_SECONDS,
  };
}

export async function recordUnansweredQuestion(
  documentClient: Pick<DynamoDBDocumentClient, 'send'>,
  tableName: string,
  input: UnansweredQuestionInput,
): Promise<void> {
  await documentClient.send(new PutCommand({
    TableName: tableName,
    Item: buildUnansweredQuestionRecord(input),
  }));
}
