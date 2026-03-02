import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pin, Lock, Send } from 'lucide-react';
import { Card, CardContent, Badge, Button, Textarea, Input } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, collection, addDoc, onSnapshot, query, orderBy, Timestamp, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    createdAt: any;
    pinned: boolean;
    locked: boolean;
    commentCount: number;
}

interface Comment {
    id: string;
    body: string;
    displayName: string;
    createdAt: any;
}

export function BoardDetail() {
    const { id } = useParams<{ id: string }>();
    const [thread, setThread] = useState<Thread | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingThread, setIsLoadingThread] = useState(true);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [threadNotFound, setThreadNotFound] = useState(false);

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

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
