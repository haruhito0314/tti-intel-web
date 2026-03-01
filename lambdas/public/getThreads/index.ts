import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
};

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const limit = Math.min(parseInt(event.queryStringParameters?.limit || '20'), 50);
        const cursor = event.queryStringParameters?.cursor;

        // Query threads from GSI1 (sorted by pinned flag + createdAt)
        const command = new QueryCommand({
            TableName: process.env.BOARD_TABLE!,
            IndexName: 'gsi1',
            KeyConditionExpression: 'gsi1pk = :pk',
            ExpressionAttributeValues: {
                ':pk': 'THREADS',
            },
            ScanIndexForward: false, // Newest first (but pinned at top due to sort key format)
            Limit: limit,
            ...(cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString()) }),
        });

        const result = await docClient.send(command);

        const threads = (result.Items || []).map((item) => ({
            id: item.threadId,
            title: item.title,
            body: item.body.substring(0, 200) + (item.body.length > 200 ? '...' : ''),
            displayName: item.displayName,
            pinned: item.pinned,
            locked: item.locked,
            createdAt: item.createdAt,
            commentCount: item.commentCount || 0,
        }));

        const response = {
            threads,
            nextCursor: result.LastEvaluatedKey
                ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
                : null,
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(response),
        };
    } catch (error) {
        console.error('Error fetching threads:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
