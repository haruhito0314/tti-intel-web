import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pin, Lock, MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent, Badge, Button, Dialog, Input, Textarea } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const createThreadSchema = z.object({
    title: z.string().min(1, 'タイトルを入力してください').max(100, 'タイトルは100文字以内で入力してください'),
    body: z.string().min(1, '本文を入力してください').max(1000, '本文は1000文字以内で入力してください'),
    displayName: z.string().max(50, '表示名は50文字以内で入力してください').optional(),
});

type CreateThreadForm = z.infer<typeof createThreadSchema>;

interface Thread {
    id: string;
    title: string;
    body: string;
    displayName: string;
    createdAt: any; // Firestore Timestamp
    commentCount: number;
    pinned: boolean;
    locked: boolean;
}

export function Board() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateThreadForm>({
        resolver: zodResolver(createThreadSchema),
    });

    useEffect(() => {
        const q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const threadsData: Thread[] = [];
            querySnapshot.forEach((doc) => {
                threadsData.push({ id: doc.id, ...doc.data() } as Thread);
            });
            setThreads(threadsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching threads:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const onSubmit = async (data: CreateThreadForm) => {
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'threads'), {
                title: data.title,
                body: data.body,
                displayName: data.displayName || '匿名',
                createdAt: Timestamp.now(),
                commentCount: 0,
                pinned: false,
                locked: false,
            });
            setIsCreateDialogOpen(false);
            reset();
            alert('スレッドを作成しました');
        } catch (error) {
            console.error("Error adding document: ", error);
            alert('スレッドの作成に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Sort: pinned first, then by date (already sorted by query, but handle pins here)
    const sortedThreads = [...threads].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0; // maintain descending date order from query
    });

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        // Handle both Firestore Timestamp and JS Date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-[28px] md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2 leading-tight tracking-tight">
                                掲示板
                            </h1>
                            <p className="text-[15px] md:text-base text-text-secondary-light dark:text-text-secondary-dark">
                                サークルメンバー同士で情報交換しましょう
                            </p>
                        </div>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="w-5 h-5" />
                            スレッドを作成
                        </Button>
                    </div>
                </div>
            </section>

            {/* Threads List */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="rounded-2xl border border-[var(--border)] bg-white/50 dark:bg-white/5 p-6 animate-pulse">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0 space-y-3">
                                        <div className="h-5 bg-primary-200/40 dark:bg-primary-800/30 rounded-lg w-3/4" />
                                        <div className="space-y-2">
                                            <div className="h-3.5 bg-gray-200/60 dark:bg-gray-700/40 rounded w-full" />
                                            <div className="h-3.5 bg-gray-200/60 dark:bg-gray-700/40 rounded w-2/3" />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="h-3 bg-gray-200/50 dark:bg-gray-700/30 rounded w-16" />
                                            <div className="h-3 bg-gray-200/50 dark:bg-gray-700/30 rounded w-24" />
                                            <div className="h-3 bg-gray-200/50 dark:bg-gray-700/30 rounded w-10" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : sortedThreads.length === 0 ? (
                    <Card variant="glass" padding="lg" className="text-center py-16">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <MessageSquare className="w-8 h-8 text-primary-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                                    まだスレッドがありません
                                </h3>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-md mx-auto">
                                    最初のスレッドを作成して、メンバー同士の交流を始めましょう！
                                </p>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sortedThreads.map((thread) => (
                            <Link key={thread.id} to={`/board/${thread.id}`} className="block group">
                                <Card
                                    variant="elevated"
                                    className="hover:scale-[1.01] transition-transform duration-300"
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
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
                                                <h2 className="text-[15px] md:text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                                    {thread.title}
                                                </h2>
                                                <p className="text-[13px] md:text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3 line-clamp-2">
                                                    {thread.body}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm text-text-muted-light dark:text-text-muted-dark">
                                                    <span>{thread.displayName}</span>
                                                    <span>•</span>
                                                    <span>{formatDate(thread.createdAt)}</span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageSquare className="w-4 h-4" />
                                                        {thread.commentCount}
                                                    </span>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Thread Dialog */}
            <Dialog
                open={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                title="新しいスレッドを作成"
                description="匿名でスレッドを作成できます"
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="タイトル"
                        placeholder="スレッドのタイトル"
                        error={errors.title?.message}
                        {...register('title')}
                    />
                    <Textarea
                        label="本文"
                        placeholder="スレッドの内容を入力..."
                        rows={5}
                        error={errors.body?.message}
                        {...register('body')}
                    />
                    <Input
                        label="表示名（任意）"
                        placeholder="匿名"
                        helperText="空欄の場合は「匿名」と表示されます"
                        error={errors.displayName?.message}
                        {...register('displayName')}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsCreateDialogOpen(false)}
                        >
                            キャンセル
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            作成する
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}
