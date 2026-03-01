import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createHmac, randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Device-Id',
    'Content-Type': 'application/json',
};

function hashIp(ip: string): string {
    const secret = process.env.RATE_LIMIT_SECRET || 'default-secret';
    return createHmac('sha256', secret).update(ip).digest('hex').substring(0, 16);
}

interface CreateThreadInput {
    title: string;
    body: string;
    displayName?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }

        const input: CreateThreadInput = JSON.parse(event.body);

        // Validate input
        if (!input.title || input.title.trim().length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Title is required' }),
            };
        }

        if (input.title.length > 100) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Title must be 100 characters or less' }),
            };
        }

        if (!input.body || input.body.trim().length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Body is required' }),
            };
        }

        if (input.body.length > 1000) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Body must be 1000 characters or less' }),
            };
        }

        const threadId = randomUUID();
        const now = new Date().toISOString();
        const displayName = input.displayName?.trim() || '匿名';
        const clientDeviceId = event.headers['X-Device-Id'] || event.headers['x-device-id'];
        const sourceIp = event.requestContext.identity?.sourceIp || 'unknown';
        const ipHash = hashIp(sourceIp);

        // Create sort key for GSI (pinned threads first, then by date)
        // Format: <pinnedFlag>#<invertedTimestamp>#<threadId>
        // Pinned = 0 (so they sort first in descending order), Not pinned = 1
        const pinnedFlag = '1'; // New threads are not pinned by default
        const gsi1sk = `${pinnedFlag}#${now}#${threadId}`;

        const item = {
            pk: `THREAD#${threadId}`,
            sk: 'META',
            threadId,
            title: input.title.trim(),
            body: input.body.trim(),
            displayName,
            pinned: false,
            locked: false,
            createdAt: now,
            updatedAt: now,
            commentCount: 0,
            clientDeviceId,
            ipHash,
            gsi1pk: 'THREADS',
            gsi1sk,
        };

        await docClient.send(
            new PutCommand({
                TableName: process.env.BOARD_TABLE!,
                Item: item,
            })
        );

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                thread: {
                    id: threadId,
                    title: item.title,
                    body: item.body,
                    displayName: item.displayName,
                    pinned: item.pinned,
                    locked: item.locked,
                    createdAt: item.createdAt,
                    commentCount: 0,
                },
            }),
        };
    } catch (error) {
        console.error('Error creating thread:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
