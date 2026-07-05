import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'tti-board-likes';

function getLikedIds(): Set<string> {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
        return new Set();
    }
}

function saveLikedIds(ids: Set<string>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        // Ignore quota / private mode failures
    }
}

export function useLikes() {
    const [likedIds, setLikedIds] = useState<Set<string>>(() => getLikedIds());

    // Sync across tabs
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                setLikedIds(getLikedIds());
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const isLiked = useCallback((id: string) => likedIds.has(id), [likedIds]);

    const toggleLike = useCallback((id: string) => {
        setLikedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            saveLikedIds(next);
            return next;
        });
    }, []);

    return { isLiked, toggleLike };
}
