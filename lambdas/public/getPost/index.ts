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
        const slug = event.pathParameters?.slug;

        if (!slug) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Slug is required' }),
            };
        }

        // Query by slug using GSI1
        const command = new QueryCommand({
            TableName: process.env.POSTS_TABLE!,
            IndexName: 'gsi1',
            KeyConditionExpression: 'gsi1pk = :pk',
            ExpressionAttributeValues: {
                ':pk': `SLUG#${slug}`,
            },
            Limit: 1,
        });

        const result = await docClient.send(command);

        if (!result.Items || result.Items.length === 0) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Post not found' }),
            };
        }

        const item = result.Items[0];

        // Only return published posts
        if (item.status !== 'published') {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Post not found' }),
            };
        }

        const post = {
            id: item.postId,
            slug: item.slug,
            title: item.title,
            excerpt: item.excerpt,
            content: item.content,
            coverImageUrl: item.coverImageUrl,
            tags: item.tags,
            category: item.category,
            pinned: item.pinned,
            publishedAt: item.publishedAt,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            author: item.author,
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ post }),
        };
    } catch (error) {
        console.error('Error fetching post:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
