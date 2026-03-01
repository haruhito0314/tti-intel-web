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

        // Query published posts from GSI2
        const command = new QueryCommand({
            TableName: process.env.POSTS_TABLE!,
            IndexName: 'gsi2',
            KeyConditionExpression: 'gsi2pk = :pk',
            ExpressionAttributeValues: {
                ':pk': 'PUBLISHED',
            },
            ScanIndexForward: false, // Newest first
            Limit: limit,
            ...(cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString()) }),
        });

        const result = await docClient.send(command);

        const posts = (result.Items || []).map((item) => ({
            id: item.postId,
            slug: item.slug,
            title: item.title,
            excerpt: item.excerpt,
            coverImageUrl: item.coverImageUrl,
            tags: item.tags,
            category: item.category,
            pinned: item.pinned,
            publishedAt: item.publishedAt,
            author: item.author,
        }));

        const response = {
            posts,
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
        console.error('Error fetching posts:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
