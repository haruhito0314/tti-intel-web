export interface BoardThread {
    id: string;
    title: string;
    body: string;
    displayName: string;
    createdAt: unknown;
    commentCount: number;
    likeCount: number;
    pinned: boolean;
    locked: boolean;
}

export interface BoardComment {
    id: string;
    body: string;
    displayName: string;
    createdAt: unknown;
    likeCount: number;
}
