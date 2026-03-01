/**
 * API Client for TTI AI Club Website
 * Connects frontend to AWS Lambda backend
 */

// API base URL - configure this for your environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function to generate device ID for rate limiting
function getOrCreateDeviceId(): string {
    const key = 'tti-ai-device-id';
    let deviceId = localStorage.getItem(key);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(key, deviceId);
    }
    return deviceId;
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const deviceId = getOrCreateDeviceId();

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': deviceId,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// =====================
// Posts API
// =====================

export interface Post {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    coverImageUrl?: string;
    tags: string[];
    category: string;
    pinned: boolean;
    publishedAt: string;
    author: string;
}

export interface PostDetail extends Post {
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface PostsResponse {
    posts: Post[];
    nextCursor: string | null;
}

export interface PostResponse {
    post: PostDetail;
}

export async function getPosts(limit = 20, cursor?: string): Promise<PostsResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append('cursor', cursor);
    return fetchApi<PostsResponse>(`/posts?${params}`);
}

export async function getPost(slug: string): Promise<PostResponse> {
    return fetchApi<PostResponse>(`/posts/${encodeURIComponent(slug)}`);
}

// =====================
// Board API
// =====================

export interface Thread {
    id: string;
    title: string;
    body: string;
    displayName: string;
    pinned: boolean;
    locked: boolean;
    createdAt: string;
    commentCount: number;
}

export interface Comment {
    id: string;
    body: string;
    displayName: string;
    createdAt: string;
}

export interface ThreadDetail extends Thread {
    updatedAt: string;
}

export interface ThreadsResponse {
    threads: Thread[];
    nextCursor: string | null;
}

export interface ThreadResponse {
    thread: ThreadDetail;
    comments: Comment[];
}

export interface CreateThreadInput {
    title: string;
    body: string;
    displayName?: string;
}

export interface CreateCommentInput {
    body: string;
    displayName?: string;
}

export async function getThreads(limit = 20, cursor?: string): Promise<ThreadsResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append('cursor', cursor);
    return fetchApi<ThreadsResponse>(`/threads?${params}`);
}

export async function getThread(id: string): Promise<ThreadResponse> {
    return fetchApi<ThreadResponse>(`/threads/${encodeURIComponent(id)}`);
}

export async function createThread(input: CreateThreadInput): Promise<{ thread: Thread }> {
    return fetchApi<{ thread: Thread }>('/threads', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function createComment(
    threadId: string,
    input: CreateCommentInput
): Promise<{ comment: Comment }> {
    return fetchApi<{ comment: Comment }>(`/threads/${encodeURIComponent(threadId)}/comments`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

// =====================
// Contact API
// =====================

export interface ContactInput {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export interface ContactResponse {
    success: boolean;
    message: string;
}

export async function sendContact(input: ContactInput): Promise<ContactResponse> {
    return fetchApi<ContactResponse>('/contact', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}
