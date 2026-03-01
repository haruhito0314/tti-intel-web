import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
};

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

        // Get thread metadata
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

        // Get comments
        const queryCommand = new QueryCommand({
            TableName: process.env.BOARD_TABLE!,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': `THREAD#${threadId}`,
                ':skPrefix': 'COMMENT#',
            },
            ScanIndexForward: true, // Oldest first
            Limit: 100, // Max 100 comments per fetch
        });

        const commentsResult = await docClient.send(queryCommand);

        const thread = {
            id: threadResult.Item.threadId,
            title: threadResult.Item.title,
            body: threadResult.Item.body,
            displayName: threadResult.Item.displayName,
            pinned: threadResult.Item.pinned,
            locked: threadResult.Item.locked,
            createdAt: threadResult.Item.createdAt,
            updatedAt: threadResult.Item.updatedAt,
            commentCount: threadResult.Item.commentCount || 0,
        };

        const comments = (commentsResult.Items || []).map((item) => ({
            id: item.commentId,
            body: item.body,
            displayName: item.displayName,
            createdAt: item.createdAt,
        }));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ thread, comments }),
        };
    } catch (error) {
        console.error('Error fetching thread:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
