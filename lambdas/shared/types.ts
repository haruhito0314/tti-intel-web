/**
 * Shared types for Lambda functions
 */

export interface Post {
    pk: string; // POST#<postId>
    sk: string; // META
    postId: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    coverImageUrl?: string;
    tags: string[];
    category: string;
    status: 'draft' | 'published' | 'archived';
    pinned: boolean;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
    author: string;
    // GSI keys
    gsi1pk?: string; // SLUG#<slug>
    gsi1sk?: string; // POST#<postId>
    gsi2pk?: string; // PUBLISHED (only when published)
    gsi2sk?: string; // <publishedAt>#<postId>
}

export interface Thread {
    pk: string; // THREAD#<id>
    sk: string; // META
    threadId: string;
    title: string;
    body: string;
    displayName: string;
    pinned: boolean;
    locked: boolean;
    createdAt: string;
    updatedAt: string;
    commentCount: number;
    clientDeviceId?: string;
    ipHash?: string;
    // GSI keys
    gsi1pk?: string; // THREADS
    gsi1sk?: string; // <pinnedFlag>#<createdAt>#<threadId>
}

export interface Comment {
    pk: string; // THREAD#<threadId>
    sk: string; // COMMENT#<timestamp>#<commentId>
    commentId: string;
    threadId: string;
    body: string;
    displayName: string;
    createdAt: string;
    clientDeviceId?: string;
    ipHash?: string;
}

export interface AdminDevice {
    pk: string; // USER#<userSub>
    sk: string; // DEVICE#<deviceId>
    userSub: string;
    email: string;
    deviceId: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string;
    revoked: boolean;
}

export interface RegistrationCode {
    pk: string; // CODE#<code>
    sk: string; // META
    code: string;
    createdBy: string;
    createdAt: string;
    expiresAt: number; // TTL (Unix timestamp)
    maxUses: number;
    usedCount: number;
}

export interface ApiResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Device-Id',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

export function successResponse(data: unknown): ApiResponse {
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(data),
    };
}

export function errorResponse(statusCode: number, message: string): ApiResponse {
    return {
        statusCode,
        headers: corsHeaders,
        body: JSON.stringify({ error: message }),
    };
}
