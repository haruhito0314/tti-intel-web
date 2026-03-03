import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Shield, Mail } from 'lucide-react';
import { Card, CardContent, Button, Input } from '@/components/ui';
import { collection, setDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const addAdminSchema = z.object({
    email: z.string().email('有効なメールアドレスを入力してください'),
});

type AddAdminForm = z.infer<typeof addAdminSchema>;

interface AdminDoc {
    id: string;
    email: string;
    addedAt: any;
    addedBy: string;
}

export function AdminMembers() {
    const { user, isAdmin, loading } = useAuth();
    const [admins, setAdmins] = useState<AdminDoc[]>([]);
    const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AddAdminForm>({
        resolver: zodResolver(addAdminSchema),
    });

    useEffect(() => {
        const q = query(collection(db, 'admins'), orderBy('addedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: AdminDoc[] = [];
            snapshot.forEach((docSnap) => {
                data.push({ id: docSnap.id, ...docSnap.data() } as AdminDoc);
            });
            setAdmins(data);
            setIsLoadingAdmins(false);
        }, () => {
            setIsLoadingAdmins(false);
        });
        return () => unsubscribe();
    }, []);

    const onSubmit = async (data: AddAdminForm) => {
        // Check if email is already an admin
        if (admins.some((a) => a.email === data.email)) {
            alert('このメールアドレスは既に管理者です');
            return;
        }
        setIsSubmitting(true);
        try {
            await setDoc(doc(db, 'admins', data.email), {
                email: data.email,
                addedAt: Timestamp.now(),
                addedBy: user?.email || 'unknown',
            });
            reset();
        } catch (error) {
            console.error('Error adding admin:', error);
            alert('追加に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (adminDoc: AdminDoc) => {
        // Prevent deleting yourself
        if (adminDoc.email === user?.email) {
            alert('自分自身を削除することはできません');
            return;
        }
        if (!confirm(`${adminDoc.email} を管理者から削除しますか？`)) return;
        try {
            await deleteDoc(doc(db, 'admins', adminDoc.id));
        } catch (error) {
            console.error('Error deleting admin:', error);
            alert('削除に失敗しました');
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="animate-pulse text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                    読み込み中...
                </div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <Card variant="default" className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                            アクセス権限がありません
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-8">
                            このページにアクセスする権限がありません。
                        </p>
                        <Link to="/admin">
                            <Button variant="outline" className="rounded-full">
                                管理者ページへ
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link
                        to="/admin"
                        className="inline-flex items-center gap-2 text-[#0066CC] dark:text-[#2997FF] hover:underline mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        管理者ダッシュボード
                    </Link>
                    <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                        メンバー管理
                    </h1>
                    <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                        管理者アカウントの追加・削除
                    </p>
                </div>
            </section>

            <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Add Admin Form */}
                <Card variant="glass" className="mb-8">
                    <CardContent className="p-6">
                        <h2 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                            管理者を追加
                        </h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <Input
                                    type="email"
                                    placeholder="メールアドレスを入力"
                                    error={errors.email?.message}
                                    {...register('email')}
                                />
                            </div>
                            <Button type="submit" isLoading={isSubmitting} className="rounded-full sm:w-auto">
                                <UserPlus className="w-4 h-4" />
                                追加
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Admin List */}
                <h2 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">
                    管理者一覧 ({admins.length})
                </h2>

                {isLoadingAdmins ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="rounded-2xl border border-[var(--border)] bg-white/50 dark:bg-white/5 p-4 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#D2D2D7]/40 dark:bg-[#38383A]/30" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-[#D2D2D7]/40 dark:bg-[#38383A]/30 rounded w-48" />
                                        <div className="h-3 bg-[#D2D2D7]/30 dark:bg-[#38383A]/20 rounded w-24" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : admins.length === 0 ? (
                    <Card variant="glass" padding="lg" className="text-center py-12">
                        <p className="text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                            管理者が登録されていません。上のフォームから追加してください。
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {admins.map((admin) => (
                            <Card key={admin.id} variant="elevated">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-5 h-5 text-[#0071E3] dark:text-[#2997FF]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                                {admin.email}
                                            </p>
                                            <p className="text-xs text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">
                                                追加日: {formatDate(admin.addedAt)} • 追加者: {admin.addedBy}
                                            </p>
                                        </div>
                                        {admin.email === user.email ? (
                                            <span className="text-xs text-[#86868B] dark:text-[rgba(235,235,245,0.3)] px-3 py-1 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E]">
                                                自分
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleDelete(admin)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                削除
                                            </button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
