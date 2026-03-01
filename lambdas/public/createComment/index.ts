import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

interface CreateCommentInput {
    body: string;
    displayName?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const threadId = event.pathParameters?.id;

        if (!threadId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Thread ID is required' }),
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }

        const input: CreateCommentInput = JSON.parse(event.body);

        // Validate input
        if (!input.body || input.body.trim().length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Body is required' }),
            };
        }

        if (input.body.length > 500) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Body must be 500 characters or less' }),
            };
        }

        // Check if thread exists and is not locked
        const getCommand = new GetCommand({
            TableName: process.env.BOARD_TABLE!,
            Key: {
                pk: `THREAD#${threadId}`,
                sk: 'META',
            },
        });

        const threadResult = await docClient.send(getCommand);

        if (!threadResult.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Thread not found' }),
            };
        }

        if (threadResult.Item.locked) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Thread is locked' }),
            };
        }

        const commentId = randomUUID();
        const now = new Date().toISOString();
        const timestamp = Date.now();
        const displayName = input.displayName?.trim() || '匿名';
        const clientDeviceId = event.headers['X-Device-Id'] || event.headers['x-device-id'];
        const sourceIp = event.requestContext.identity?.sourceIp || 'unknown';
        const ipHash = hashIp(sourceIp);

        // Create comment
        const commentItem = {
            pk: `THREAD#${threadId}`,
            sk: `COMMENT#${timestamp}#${commentId}`,
            commentId,
            threadId,
            body: input.body.trim(),
            displayName,
            createdAt: now,
            clientDeviceId,
            ipHash,
        };

        await docClient.send(
            new PutCommand({
                TableName: process.env.BOARD_TABLE!,
                Item: commentItem,
            })
        );

        // Update thread comment count and updatedAt
        await docClient.send(
            new UpdateCommand({
                TableName: process.env.BOARD_TABLE!,
                Key: {
                    pk: `THREAD#${threadId}`,
                    sk: 'META',
                },
                UpdateExpression: 'SET commentCount = if_not_exists(commentCount, :zero) + :inc, updatedAt = :now',
                ExpressionAttributeValues: {
                    ':zero': 0,
                    ':inc': 1,
                    ':now': now,
                },
            })
        );

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                comment: {
                    id: commentId,
                    body: commentItem.body,
                    displayName: commentItem.displayName,
                    createdAt: commentItem.createdAt,
                },
            }),
        };
    } catch (error) {
        console.error('Error creating comment:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
