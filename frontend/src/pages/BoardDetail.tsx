import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pin, Lock, Send, PinOff, Unlock, Trash2, Heart } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { Card, CardContent, Badge, Button, Textarea, Input } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, collection, addDoc, onSnapshot, query, orderBy, Timestamp, increment, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useLikes } from '@/hooks/useLikes';

const commentSchema = z.object({
    body: z.string().min(1, 'コメントを入力してください').max(500, 'コメントは500文字以内で入力してください'),
    displayName: z.string().max(50, '表示名は50文字以内で入力してください').optional(),
});

type CommentForm = z.infer<typeof commentSchema>;

interface Thread {
    id: string;
    title: string;
    body: string;
    displayName: string;
    createdAt: unknown;
    pinned: boolean;
    locked: boolean;
    commentCount: number;
    likeCount: number;
}

interface Comment {
    id: string;
    body: string;
    displayName: string;
    createdAt: unknown;
    likeCount: number;
}

export function BoardDetail() {
    const { id } = useParams<{ id: string }>();
    const { isAdmin } = useAuth();
    const { isLiked, toggleLike } = useLikes();
    const [thread, setThread] = useState<Thread | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingThread, setIsLoadingThread] = useState(true);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [threadNotFound, setThreadNotFound] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CommentForm>({
        resolver: zodResolver(commentSchema),
    });

    useEffect(() => {
        if (!id) return;

        setIsLoadingThread(true);
        setIsLoadingComments(true);
        setThread(null);
        setComments([]);
        setThreadNotFound(false);
        setLoadError(false);

        // Fetch Thread details
        const threadRef = doc(db, 'threads', id);
        const unsubscribeThread = onSnapshot(threadRef, (docSnap) => {
            if (docSnap.exists()) {
                setThread({ id: docSnap.id, ...docSnap.data() } as Thread);
                setThreadNotFound(false);
            } else {
                setThreadNotFound(true);
            }
            setIsLoadingThread(false);
        }, (error) => {
            console.error("Error fetching thread:", error);
            setLoadError(true);
            setIsLoadingThread(false);
        });

        // Fetch Comments
        const commentsRef = collection(db, 'threads', id, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));
        const unsubscribeComments = onSnapshot(q, (querySnapshot) => {
            const commentsData: Comment[] = [];
            querySnapshot.forEach((docSnap) => {
                commentsData.push({ id: docSnap.id, ...docSnap.data() } as Comment);
            });
            setComments(commentsData);
            setIsLoadingComments(false);
        }, (error) => {
            console.error("Error fetching comments:", error);
            setIsLoadingComments(false);
        });

        return () => {
            unsubscribeThread();
            unsubscribeComments();
        };
    }, [id]);

    const formatDate = (timestamp: unknown) => {
        if (!timestamp) return '';
        const date = typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof timestamp.toDate === 'function'
            ? timestamp.toDate()
            : new Date(timestamp as string | number | Date);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const onSubmit = async (data: CommentForm) => {
        if (!id) return;
        setIsSubmitting(true);
        try {
            // Add comment to subcollection
            await addDoc(collection(db, 'threads', id, 'comments'), {
                body: data.body,
                displayName: data.displayName || '匿名',
                createdAt: Timestamp.now(),
            });

            // Increment comment count in thread document
            const threadRef = doc(db, 'threads', id);
            await updateDoc(threadRef, {
                commentCount: increment(1)
            });

            reset();
            alert('コメントを投稿しました');
        } catch (error) {
            console.error("Error adding comment: ", error);
            alert('コメントの投稿に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTogglePin = async () => {
        if (!id || !thread) return;
        try {
            await updateDoc(doc(db, 'threads', id), { pinned: !thread.pinned });
        } catch (error) {
            console.error('Error toggling pin:', error);
            alert('操作に失敗しました');
        }
    };

    const handleToggleLock = async () => {
        if (!id || !thread) return;
        try {
            await updateDoc(doc(db, 'threads', id), { locked: !thread.locked });
        } catch (error) {
            console.error('Error toggling lock:', error);
            alert('操作に失敗しました');
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!id || !confirm('このコメントを削除しますか？')) return;
        try {
            await deleteDoc(doc(db, 'threads', id, 'comments', commentId));
            await updateDoc(doc(db, 'threads', id), {
                commentCount: increment(-1)
            });
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('削除に失敗しました');
        }
    };

    if (isLoadingThread) {
        return (
            <div className="animate-fade-in">
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                    <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        <div className="h-4 bg-[#D2D2D7]/40 dark:bg-[#38383A]/30 rounded w-20 mb-6" />
                        <div className="h-8 bg-[#D2D2D7]/40 dark:bg-[#38383A]/30 rounded-lg w-2/3 mb-4" />
                    </div>
                </section>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4 animate-pulse">
                    <div className="rounded-2xl border border-[var(--border)] bg-white/50 dark:bg-white/5 p-6 space-y-3">
                        <div className="h-4 bg-[#D2D2D7]/60 dark:bg-[#38383A]/40 rounded w-full" />
                        <div className="h-4 bg-[#D2D2D7]/60 dark:bg-[#38383A]/40 rounded w-5/6" />
                        <div className="h-4 bg-[#D2D2D7]/60 dark:bg-[#38383A]/40 rounded w-3/4" />
                        <div className="flex items-center gap-4 mt-4">
                            <div className="h-3 bg-[#D2D2D7]/50 dark:bg-[#38383A]/30 rounded w-16" />
                            <div className="h-3 bg-[#D2D2D7]/50 dark:bg-[#38383A]/30 rounded w-28" />
                        </div>
                    </div>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-[var(--border)] bg-white/50 dark:bg-white/5 p-4 space-y-2">
                            <div className="h-3.5 bg-[#D2D2D7]/60 dark:bg-[#38383A]/40 rounded w-full" />
                            <div className="h-3.5 bg-[#D2D2D7]/60 dark:bg-[#38383A]/40 rounded w-1/2" />
                            <div className="flex items-center gap-4 mt-2">
                                <div className="h-3 bg-[#D2D2D7]/50 dark:bg-[#38383A]/30 rounded w-12" />
                                <div className="h-3 bg-[#D2D2D7]/50 dark:bg-[#38383A]/30 rounded w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                    読み込みに失敗しました
                </h1>
                <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-8">
                    スレッドの取得中にエラーが発生しました。時間をおいて再度お試しください。
                </p>
                <Link to="/board">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4" />
                        掲示板へ戻る
                    </Button>
                </Link>
            </div>
        );
    }

    if (threadNotFound || !thread) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                    スレッドが見つかりません
                </h1>
                <p className="text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-8">
                    お探しのスレッドは存在しないか、削除された可能性があります。
                </p>
                <Link to="/board">
                    <Button>
                        <ArrowLeft className="w-4 h-4" />
                        掲示板に戻る
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <PageSeo
                title={`${thread.title} | Board | TTI Intelligence`}
                description={thread.body}
            />
            {/* Header */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link
                        to="/board"
                        className="inline-flex items-center gap-2 text-[#0066CC] dark:text-[#2997FF] hover:underline mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        掲示板
                    </Link>

                    <div className="flex items-center gap-2 mb-3">
                        {thread.pinned && (
                            <Badge variant="warning" className="flex items-center gap-1">
                                <Pin className="w-3 h-3" />
                                固定
                            </Badge>
                        )}
                        {thread.locked && (
                            <Badge variant="default" className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                ロック中
                            </Badge>
                        )}
                    </div>

                    <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                        {thread.title}
                    </h1>

                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleTogglePin}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-colors"
                            >
                                {thread.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                {thread.pinned ? '固定解除' : '固定'}
                            </button>
                            <button
                                onClick={handleToggleLock}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-colors"
                            >
                                {thread.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {thread.locked ? 'ロック解除' : 'ロック'}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Thread Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Original Post */}
                <Card variant="elevated" className="mb-8">
                    <CardContent className="p-6">
                        <p className="text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-pre-wrap mb-4">
                            {thread.body}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">
                            <span className="font-medium">{thread.displayName}</span>
                            <span>•</span>
                            <span>{formatDate(thread.createdAt)}</span>
                            <button
                                onClick={async () => {
                                    const liked = isLiked(`thread-${thread.id}`);
                                    toggleLike(`thread-${thread.id}`);
                                    try {
                                        await updateDoc(doc(db, 'threads', thread.id), { likeCount: increment(liked ? -1 : 1) });
                                    } catch (error) {
                                        toggleLike(`thread-${thread.id}`);
                                        console.error('Error toggling like:', error);
                                    }
                                }}
                                className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${isLiked(`thread-${thread.id}`)
                                    ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                                    : 'text-[#86868B] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                                    }`}
                            >
                                <Heart className={`w-3.5 h-3.5 ${isLiked(`thread-${thread.id}`) ? 'fill-current' : ''}`} />
                                {thread.likeCount || 0}
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Comments */}
                <div className="space-y-4 mb-8">
                    <h2 className="text-base md:text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        コメント ({thread.commentCount || 0})
                    </h2>

                    {isLoadingComments ? (
                        <p className="text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] text-center py-8">
                            コメントを読み込み中...
                        </p>
                    ) : comments.length === 0 ? (
                        <p className="text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] text-center py-8">
                            まだコメントはありません
                        </p>
                    ) : (
                        comments.map((comment, index) => (
                            <Card key={comment.id} variant="default" className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                <CardContent className="p-4">
                                    <p className="text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-pre-wrap mb-3">
                                        {comment.body}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">
                                        <span className="font-medium">{comment.displayName}</span>
                                        <span>•</span>
                                        <span>{formatDate(comment.createdAt)}</span>
                                        <button
                                            onClick={async () => {
                                                if (!id) return;
                                                const liked = isLiked(`comment-${comment.id}`);
                                                toggleLike(`comment-${comment.id}`);
                                                try {
                                                    await updateDoc(doc(db, 'threads', id, 'comments', comment.id), { likeCount: increment(liked ? -1 : 1) });
                                                } catch (error) {
                                                    toggleLike(`comment-${comment.id}`);
                                                    console.error('Error toggling like:', error);
                                                }
                                            }}
                                            className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${isLiked(`comment-${comment.id}`)
                                                ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                                                : 'text-[#86868B] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                                                }`}
                                        >
                                            <Heart className={`w-3.5 h-3.5 ${isLiked(`comment-${comment.id}`) ? 'fill-current' : ''}`} />
                                            {comment.likeCount || 0}
                                        </button>
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                削除
                                            </button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Comment Form */}
                {thread.locked ? (
                    <Card variant="default" className="text-center py-8">
                        <Lock className="w-8 h-8 mx-auto mb-2 text-[#86868B] dark:text-[rgba(235,235,245,0.3)]" />
                        <p className="text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                            このスレッドはロックされているため、コメントできません
                        </p>
                    </Card>
                ) : (
                    <Card variant="glass">
                        <CardContent className="p-6">
                            <h3 className="text-base md:text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                                コメントを投稿
                            </h3>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <Textarea
                                    placeholder="コメントを入力..."
                                    rows={4}
                                    error={errors.body?.message}
                                    {...register('body')}
                                />
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Input
                                        placeholder="表示名（任意）"
                                        className="sm:w-48"
                                        error={errors.displayName?.message}
                                        {...register('displayName')}
                                    />
                                    <Button type="submit" isLoading={isSubmitting} className="sm:ml-auto">
                                        <Send className="w-4 h-4" />
                                        投稿する
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
