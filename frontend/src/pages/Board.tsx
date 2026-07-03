import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pin, Lock, MessageSquare, MessageSquarePlus, ArrowRight, Trash2, PinOff, Unlock, Heart } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { Card, CardContent, Badge, Button, Dialog, Input, Textarea } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

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
    createdAt: unknown;
    commentCount: number;
    likeCount: number;
    pinned: boolean;
    locked: boolean;
}

export function Board() {
    const { isAdmin } = useAuth();
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
                likeCount: 0,
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

    const handleDeleteThread = async (threadId: string) => {
        if (!confirm('このスレッドを削除しますか？')) return;
        try {
            await deleteDoc(doc(db, 'threads', threadId));
        } catch (error) {
            console.error('Error deleting thread:', error);
            alert('削除に失敗しました');
        }
    };

    const handleTogglePin = async (threadId: string, currentPinned: boolean) => {
        try {
            await updateDoc(doc(db, 'threads', threadId), { pinned: !currentPinned });
        } catch (error) {
            console.error('Error toggling pin:', error);
            alert('操作に失敗しました');
        }
    };

    const handleToggleLock = async (threadId: string, currentLocked: boolean) => {
        try {
            await updateDoc(doc(db, 'threads', threadId), { locked: !currentLocked });
        } catch (error) {
            console.error('Error toggling lock:', error);
            alert('操作に失敗しました');
        }
    };

    // Sort: pinned first, then by date (already sorted by query, but handle pins here)
    const sortedThreads = [...threads].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0; // maintain descending date order from query
    });

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
            minute: '2-digit'
        });
    };

    return (
        <div className="animate-fade-in">
            <PageSeo
                title="Board | TTI Intelligence"
                description="TTI Intelligenceの掲示板です。質問、相談、活動に関する投稿を確認できます。"
            />
            {/* Header */}
            <section className="about-band-hero relative overflow-hidden">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="max-w-2xl">
                            <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                掲示板
                            </h1>
                            <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                誰でも匿名で自由に書き込める掲示板です
                            </p>
                        </div>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="w-5 h-5" />
                            スレッドを作成
                        </Button>
                    </div>
                </div>
            </section >

            {/* Threads List */}
            <section className="about-band-white">
            <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
                {
                    isLoading ? (
                        <div className="space-y-4" >
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="rounded-2xl border border-[var(--border)] bg-white/50 dark:bg-white/5 p-6 animate-pulse">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0 space-y-3">
                                            <div className="h-5 bg-[#D2D2D7]/40 dark:bg-[#38383A]/30 rounded-lg w-3/4" />
                                            <div className="space-y-2">
                                                <div className="h-3.5 bg-[#D2D2D7]/60 dark:bg-[#38383A]/40 rounded w-full" />
                                                <div className="h-3.5 bg-[#D2D2D7]/60 dark:bg-[#38383A]/40 rounded w-2/3" />
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="h-3 bg-[#D2D2D7]/50 dark:bg-[#38383A]/30 rounded w-16" />
                                                <div className="h-3 bg-[#D2D2D7]/50 dark:bg-[#38383A]/30 rounded w-24" />
                                                <div className="h-3 bg-[#D2D2D7]/50 dark:bg-[#38383A]/30 rounded w-10" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                            }
                        </div >
                    ) : sortedThreads.length === 0 ? (
                        <Card variant="glass" padding="lg" className="text-center py-18">
                            <div className="flex flex-col items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center">
                                    <MessageSquarePlus className="w-8 h-8 text-[#0071E3] dark:text-[#2997FF]" />
                                </div>
                                <div>
                                    <h3 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                        まだスレッドがありません
                                    </h3>
                                    <p className="text-sm text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-md mx-auto">
                                        最初のスレッドを立てて、質問や相談を気軽に共有してみませんか？
                                    </p>
                                </div>
                                <Button onClick={() => setIsCreateDialogOpen(true)}>
                                    <Plus className="w-5 h-5" />
                                    スレッドを作成
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {sortedThreads.map((thread, index) => (
                                <Link key={thread.id} to={`/board/${thread.id}`} className="block group">
                                    <Card
                                        variant="elevated"
                                        className={`${index % 2 === 0 ? 'accent-card-soft' : 'accent-card-cool'} hover:scale-[1.01] transition-transform duration-300`}
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
                                                    <h2 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-1 group-hover:text-[#0066CC] dark:group-hover:text-[#2997FF] transition-colors truncate">
                                                        {thread.title}
                                                    </h2>
                                                    <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-3 line-clamp-2">
                                                        {thread.body}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-sm text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">
                                                        <span>{thread.displayName}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(thread.createdAt)}</span>
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare className="w-4 h-4" />
                                                            {thread.commentCount}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Heart className="w-4 h-4" />
                                                            {thread.likeCount || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-[#0071E3] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                            </div>
                                            {isAdmin && (
                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleTogglePin(thread.id, thread.pinned); }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-colors"
                                                    >
                                                        {thread.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                                        {thread.pinned ? '固定解除' : '固定'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleToggleLock(thread.id, thread.locked); }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] transition-colors"
                                                    >
                                                        {thread.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                                        {thread.locked ? 'ロック解除' : 'ロック'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleDeleteThread(thread.id); }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors ml-auto"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        削除
                                                    </button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )
                }
            </div>
            </section>

            {/* Create Thread Dialog */}
            < Dialog
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
            </Dialog >
        </div >
    );
}
