import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import {
  buildQuotaTransaction,
  QuotaExceededError,
  QuotaInfrastructureError,
  readQuotaConfig,
  reserveQuota,
  type QuotaConfig,
  type QuotaReservationInput,
  type TransactionWriter,
} from './quota.js';

const config: QuotaConfig = {
  tableName: 'assistant-usage',
  dailyLimit: 100,
  sessionLimit: 20,
  sessionWindowSeconds: 600,
};

const input: QuotaReservationInput = {
  sessionId: '11111111-1111-4111-8111-111111111111',
  requestId: 'api-gateway-request-1',
  now: new Date('2026-07-16T15:00:00.000Z'),
};

const validEnvironment = {
  ASSISTANT_USAGE_TABLE: 'assistant-usage',
  ASSISTANT_DAILY_LIMIT: '100',
  ASSISTANT_SESSION_LIMIT: '20',
  ASSISTANT_SESSION_WINDOW_SECONDS: '600',
};

function updateAt(
  transaction: ReturnType<typeof buildQuotaTransaction>,
  index: number,
) {
  const update = transaction.TransactItems?.[index]?.Update;
  if (update === undefined) {
    throw new Error(`Missing Update at transaction index ${index}`);
  }
  return update;
}

function transactionCancelled(codes: readonly string[]) {
  return new TransactionCanceledException({
    $metadata: {},
    message: 'Transaction cancelled',
    CancellationReasons: codes.map((Code) => ({ Code })),
  });
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('Expected promise to reject');
}

function createAtomicFakeWriter() {
  const counts = new Map<string, number>();
  const completedTokens = new Set<string>();
  let appliedTransactions = 0;

  const writer: TransactionWriter = async (command) => {
    const { ClientRequestToken, TransactItems } = command.input;
    if (ClientRequestToken === undefined || TransactItems?.length !== 2) {
      throw new Error('Malformed quota transaction');
    }

    if (completedTokens.has(ClientRequestToken)) {
      return;
    }

    const updates = TransactItems.map(({ Update }) => {
      if (Update === undefined) {
        throw new Error('Quota transaction item is not an Update');
      }

      const pk = Update.Key?.pk;
      const sk = Update.Key?.sk;
      const limit = Update.ExpressionAttributeValues?.[':limit'];
      if (typeof pk !== 'string' || typeof sk !== 'string' || typeof limit !== 'number') {
        throw new Error('Malformed quota update');
      }

      return {
        key: `${pk}|${sk}`,
        limit,
      };
    });

    const reasons = updates.map(({ key, limit }) => (
      (counts.get(key) ?? 0) >= limit ? 'ConditionalCheckFailed' : 'None'
    ));
    if (reasons.includes('ConditionalCheckFailed')) {
      throw transactionCancelled(reasons);
    }

    for (const { key } of updates) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    completedTokens.add(ClientRequestToken);
    appliedTransactions += 1;
  };

  return {
    writer,
    countFor(pk: string, sk: string) {
      return counts.get(`${pk}|${sk}`) ?? 0;
    },
    get appliedTransactions() {
      return appliedTransactions;
    },
  };
}

describe('readQuotaConfig', () => {
  it('reads the quota environment', () => {
    expect(readQuotaConfig(validEnvironment)).toEqual(config);
  });

  it.each([
    [
      'a missing table name',
      { ...validEnvironment, ASSISTANT_USAGE_TABLE: undefined },
      'ASSISTANT_USAGE_TABLE',
    ],
    [
      'a zero daily limit',
      { ...validEnvironment, ASSISTANT_DAILY_LIMIT: '0' },
      'ASSISTANT_DAILY_LIMIT',
    ],
    [
      'a negative session limit',
      { ...validEnvironment, ASSISTANT_SESSION_LIMIT: '-1' },
      'ASSISTANT_SESSION_LIMIT',
    ],
    [
      'a fractional session window',
      { ...validEnvironment, ASSISTANT_SESSION_WINDOW_SECONDS: '600.5' },
      'ASSISTANT_SESSION_WINDOW_SECONDS',
    ],
    [
      'a non-numeric daily limit',
      { ...validEnvironment, ASSISTANT_DAILY_LIMIT: 'many' },
      'ASSISTANT_DAILY_LIMIT',
    ],
  ])('rejects %s', (_name, environment, variableName) => {
    expect(() => readQuotaConfig(environment)).toThrow(variableName);
  });
});

describe('buildQuotaTransaction', () => {
  it('builds one idempotent transaction for both counters', () => {
    const transaction = buildQuotaTransaction(config, input);

    expect(transaction.TransactItems).toHaveLength(2);
    expect(transaction.ClientRequestToken).toBe('762a0accba66cb031c74209e236dab783a46');
    expect(transaction.ClientRequestToken).toHaveLength(36);
    expect(JSON.stringify(transaction)).toContain('DAY#2026-07-17');
    expect(JSON.stringify(transaction)).toContain('WINDOW#1784214000');
    expect(JSON.stringify(transaction)).not.toContain(input.sessionId);
    expect(transaction.TransactItems?.every(({ Update }) => (
      Update?.ConditionExpression === 'attribute_not_exists(#count) OR #count < :limit'
    ))).toBe(true);
  });

  it('uses the required keys, updates, limits, kinds, and TTLs in fixed order', () => {
    const transaction = buildQuotaTransaction(config, input);
    const daily = updateAt(transaction, 0);
    const session = updateAt(transaction, 1);
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

    expect(daily).toEqual({
      TableName: 'assistant-usage',
      Key: { pk: 'DAY#2026-07-17', sk: 'GLOBAL' },
      ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':limit': 100,
        ':expiresAt': 1_784_386_800,
        ':kind': 'daily',
      },
    });
    expect(session).toEqual({
      TableName: 'assistant-usage',
      Key: {
        pk: 'SESSION#bd7662a5eeb41614e720d477abfcb2272e19a8a70a93b7e3bc8560d44ad326e9',
        sk: 'WINDOW#1784214000',
      },
      ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':limit': 20,
        ':expiresAt': 1_784_217_600,
        ':kind': 'session',
      },
    });
  });

  it('switches the daily key at midnight JST', () => {
    const beforeMidnight = buildQuotaTransaction(config, {
      ...input,
      now: new Date('2026-07-16T14:59:59.000Z'),
    });
    const midnight = buildQuotaTransaction(config, {
      ...input,
      now: new Date('2026-07-16T15:00:00.000Z'),
    });

    expect(updateAt(beforeMidnight, 0).Key).toEqual({
      pk: 'DAY#2026-07-16',
      sk: 'GLOBAL',
    });
    expect(updateAt(midnight, 0).Key).toEqual({
      pk: 'DAY#2026-07-17',
      sk: 'GLOBAL',
    });
  });

  it('switches the session key at the ten-minute window boundary', () => {
    const beforeBoundary = buildQuotaTransaction(config, {
      ...input,
      now: new Date('2026-07-16T14:59:59.000Z'),
    });
    const boundary = buildQuotaTransaction(config, {
      ...input,
      now: new Date('2026-07-16T15:00:00.000Z'),
    });

    expect(updateAt(beforeBoundary, 1).Key?.sk).toBe('WINDOW#1784213400');
    expect(updateAt(boundary, 1).Key?.sk).toBe('WINDOW#1784214000');
  });

  it('derives stable tokens from request IDs without exposing the request ID', () => {
    const first = buildQuotaTransaction(config, input);
    const repeated = buildQuotaTransaction(config, { ...input });
    const second = buildQuotaTransaction(config, {
      ...input,
      requestId: 'api-gateway-request-2',
    });

    expect(repeated.ClientRequestToken).toBe(first.ClientRequestToken);
    expect(second.ClientRequestToken).toBe('5a6f6659abd52dac5e2c24cc2a55792c3641');
    expect(JSON.stringify(first)).not.toContain(input.requestId);
    expect(JSON.stringify(second)).not.toContain('api-gateway-request-2');
  });
});

describe('reserveQuota', () => {
  it('passes a TransactWriteCommand to the injected writer', async () => {
    let received: TransactWriteCommand | undefined;
    const writer: TransactionWriter = async (command) => {
      received = command;
    };

    await reserveQuota(writer, config, input);

    expect(received).toBeInstanceOf(TransactWriteCommand);
    if (received === undefined) {
      throw new Error('Writer did not receive a command');
    }
    expect(received.input).toEqual(buildQuotaTransaction(config, input));
  });

  it('maps the first conditional cancellation reason to the daily scope', async () => {
    const writer: TransactionWriter = async () => {
      throw transactionCancelled(['ConditionalCheckFailed', 'None']);
    };

    await expect(reserveQuota(writer, config, input)).rejects.toMatchObject({
      name: 'QuotaExceededError',
      message: 'Assistant daily quota exceeded',
      scope: 'daily',
    });
  });

  it('maps the second conditional cancellation reason to the session scope', async () => {
    const writer: TransactionWriter = async () => {
      throw transactionCancelled(['None', 'ConditionalCheckFailed']);
    };

    await expect(reserveQuota(writer, config, input)).rejects.toMatchObject({
      name: 'QuotaExceededError',
      message: 'Assistant session quota exceeded',
      scope: 'session',
    });
  });

  it.each([
    [
      'a transaction conflict',
      transactionCancelled(['TransactionConflict', 'None']),
    ],
    [
      'provisioned throughput exhaustion',
      transactionCancelled(['ProvisionedThroughputExceeded', 'None']),
    ],
    [
      'on-demand throttling',
      transactionCancelled(['None', 'ThrottlingError']),
    ],
    [
      'an ordinary writer error',
      new Error('socket closed'),
    ],
  ])('maps %s to an infrastructure error, never an exceeded quota', async (_name, source) => {
    const writer: TransactionWriter = async () => {
      throw source;
    };

    const error = await captureRejection(reserveQuota(writer, config, input));

    expect(error).toBeInstanceOf(QuotaInfrastructureError);
    expect(error).not.toBeInstanceOf(QuotaExceededError);
    expect((error as QuotaInfrastructureError).cause).toBe(source);
  });

  it('does not double-consume when the same request token is sent again', async () => {
    const fake = createAtomicFakeWriter();

    await reserveQuota(fake.writer, config, input);
    await reserveQuota(fake.writer, config, input);

    expect(fake.appliedTransactions).toBe(1);
    expect(fake.countFor('DAY#2026-07-17', 'GLOBAL')).toBe(1);
    expect(fake.countFor(
      'SESSION#bd7662a5eeb41614e720d477abfcb2272e19a8a70a93b7e3bc8560d44ad326e9',
      'WINDOW#1784214000',
    )).toBe(1);
  });

  it('atomically allows only 100 of 101 distinct sessions for one day', async () => {
    const fake = createAtomicFakeWriter();
    const inputs = Array.from({ length: 101 }, (_, index): QuotaReservationInput => ({
      sessionId: `session-${index}`,
      requestId: `request-${index}`,
      now: input.now,
    }));

    const results = await Promise.allSettled(inputs.map((reservation) => (
      reserveQuota(fake.writer, config, reservation)
    )));
    const successes = results.filter(({ status }) => status === 'fulfilled');
    const failures = results.filter(({ status }) => status === 'rejected');
    const failedSessionUpdate = updateAt(buildQuotaTransaction(config, inputs[100]!), 1);

    expect(successes).toHaveLength(100);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      reason: { name: 'QuotaExceededError', scope: 'daily' },
    });
    expect(fake.countFor('DAY#2026-07-17', 'GLOBAL')).toBe(100);
    expect(fake.countFor(
      String(failedSessionUpdate.Key?.pk),
      String(failedSessionUpdate.Key?.sk),
    )).toBe(0);
  });

  it('atomically allows only 20 of 21 requests in one session window', async () => {
    const fake = createAtomicFakeWriter();
    const inputs = Array.from({ length: 21 }, (_, index): QuotaReservationInput => ({
      ...input,
      requestId: `same-session-request-${index}`,
    }));

    const results = await Promise.allSettled(inputs.map((reservation) => (
      reserveQuota(fake.writer, config, reservation)
    )));
    const successes = results.filter(({ status }) => status === 'fulfilled');
    const failures = results.filter(({ status }) => status === 'rejected');

    expect(successes).toHaveLength(20);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      reason: { name: 'QuotaExceededError', scope: 'session' },
    });
    expect(fake.countFor('DAY#2026-07-17', 'GLOBAL')).toBe(20);
    expect(fake.countFor(
      'SESSION#bd7662a5eeb41614e720d477abfcb2272e19a8a70a93b7e3bc8560d44ad326e9',
      'WINDOW#1784214000',
    )).toBe(20);
  });
});
