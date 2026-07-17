import { createHash } from 'node:crypto';

import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';

import { jstDateKey } from './dayKey.js';

const DAILY_TTL_SECONDS = 2 * 24 * 60 * 60;
const SESSION_TTL_SECONDS = 60 * 60;

const conditionExpression = 'attribute_not_exists(#count) OR #count < :limit';
const updateExpression = [
  'SET #count = if_not_exists(#count, :zero) + :one',
  '#expiresAt = if_not_exists(#expiresAt, :expiresAt)',
  '#kind = if_not_exists(#kind, :kind)',
].join(', ');
const expressionAttributeNames = {
  '#count': 'count',
  '#expiresAt': 'expiresAt',
  '#kind': 'kind',
};

export interface QuotaConfig {
  tableName: string;
  dailyLimit: number;
  sessionLimit: number;
  sessionWindowSeconds: number;
}

export interface QuotaReservationInput {
  sessionId: string;
  requestId: string;
  now: Date;
}

export type TransactionWriter = (
  command: TransactWriteCommand,
) => Promise<unknown>;

export class QuotaExceededError extends Error {
  readonly name = 'QuotaExceededError';

  constructor(readonly scope: 'daily' | 'session') {
    super(`Assistant ${scope} quota exceeded`);
  }
}

export class QuotaInfrastructureError extends Error {
  readonly name = 'QuotaInfrastructureError';

  constructor(cause?: unknown) {
    super('Assistant quota infrastructure unavailable', { cause });
  }
}

type QuotaEnvironment = Readonly<Record<string, string | undefined>>;

function requirePositiveInteger(
  environment: QuotaEnvironment,
  variableName: string,
): number {
  const rawValue = environment[variableName];
  const value = rawValue === undefined ? Number.NaN : Number(rawValue);
  if (
    rawValue === undefined
    || rawValue.trim().length === 0
    || !Number.isSafeInteger(value)
    || value <= 0
  ) {
    throw new Error(
      `Invalid assistant quota configuration: ${variableName} must be a positive integer`,
    );
  }

  return value;
}

export function readQuotaConfig(
  environment: QuotaEnvironment = process.env,
): QuotaConfig {
  const tableName = environment.ASSISTANT_USAGE_TABLE?.trim();
  if (tableName === undefined || tableName.length === 0) {
    throw new Error(
      'Invalid assistant quota configuration: ASSISTANT_USAGE_TABLE is required',
    );
  }

  return {
    tableName,
    dailyLimit: requirePositiveInteger(environment, 'ASSISTANT_DAILY_LIMIT'),
    sessionLimit: requirePositiveInteger(environment, 'ASSISTANT_SESSION_LIMIT'),
    sessionWindowSeconds: requirePositiveInteger(
      environment,
      'ASSISTANT_SESSION_WINDOW_SECONDS',
    ),
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function buildQuotaTransaction(
  config: QuotaConfig,
  input: QuotaReservationInput,
): TransactWriteCommandInput {
  const nowEpochSeconds = Math.floor(input.now.getTime() / 1_000);
  const windowEpochSeconds = Math.floor(
    nowEpochSeconds / config.sessionWindowSeconds,
  ) * config.sessionWindowSeconds;

  return {
    TransactItems: [
      {
        Update: {
          TableName: config.tableName,
          Key: {
            pk: `DAY#${jstDateKey(input.now)}`,
            sk: 'GLOBAL',
          },
          ConditionExpression: conditionExpression,
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: {
            ':zero': 0,
            ':one': 1,
            ':limit': config.dailyLimit,
            ':expiresAt': nowEpochSeconds + DAILY_TTL_SECONDS,
            ':kind': 'daily',
          },
        },
      },
      {
        Update: {
          TableName: config.tableName,
          Key: {
            pk: `SESSION#${sha256(input.sessionId)}`,
            sk: `WINDOW#${windowEpochSeconds}`,
          },
          ConditionExpression: conditionExpression,
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: {
            ':zero': 0,
            ':one': 1,
            ':limit': config.sessionLimit,
            ':expiresAt': nowEpochSeconds + SESSION_TTL_SECONDS,
            ':kind': 'session',
          },
        },
      },
    ],
    ClientRequestToken: sha256(input.requestId).slice(0, 36),
  };
}

export async function reserveQuota(
  writer: TransactionWriter,
  config: QuotaConfig,
  input: QuotaReservationInput,
): Promise<void> {
  try {
    await writer(new TransactWriteCommand(buildQuotaTransaction(config, input)));
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      if (error.CancellationReasons?.[0]?.Code === 'ConditionalCheckFailed') {
        throw new QuotaExceededError('daily');
      }
      if (error.CancellationReasons?.[1]?.Code === 'ConditionalCheckFailed') {
        throw new QuotaExceededError('session');
      }
    }

    throw new QuotaInfrastructureError(error);
  }
}
