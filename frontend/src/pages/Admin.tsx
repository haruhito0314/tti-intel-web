import { useState } from 'react';
import { Shield, LogIn, AlertTriangle, Smartphone, KeyRound, Users, FileText, MessageSquare, Settings } from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';

// Admin states for MVP demo
type AdminState = 'unauthenticated' | 'unauthorized' | 'device_required' | 'authenticated';

export function Admin() {
    // For MVP, we'll simulate different states
    const [adminState, setAdminState] = useState<AdminState>('unauthenticated');
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        // TODO: Cognito Hosted UI redirect
        console.log('Redirecting to Cognito Hosted UI...');
        await new Promise((r) => setTimeout(r, 1000));
        // For demo, simulate login
        setAdminState('device_required');
        setIsLoading(false);
    };

    const handleDeviceRegistration = async () => {
        setIsLoading(true);
        // TODO: Device registration API
        await new Promise((r) => setTimeout(r, 1000));
        setAdminState('authenticated');
        setIsLoading(false);
    };

    // Unauthenticated - Show login
    if (adminState === 'unauthenticated') {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <Card variant="glass" className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                            管理者ログイン
                        </h1>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8">
                            管理者としてログインしてください
                        </p>
                        <Button onClick={handleGoogleLogin} isLoading={isLoading} size="lg" className="w-full">
                            <LogIn className="w-5 h-5" />
                            Googleでログイン
                        </Button>
                        <p className="mt-4 text-xs text-text-muted-light dark:text-text-muted-dark">
                            ※ 事前に承認されたメールアドレスのみログイン可能です
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Unauthorized - Not in Admins group
    if (adminState === 'unauthorized') {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <Card variant="default" className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                            アクセス権限がありません
                        </h1>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8">
                            このページにアクセスする権限がありません。
                            <br />
                            管理者権限が必要な場合は、運営にお問い合わせください。
                        </p>
                        <Button onClick={() => setAdminState('unauthenticated')} variant="outline">
                            ログアウト
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Device Required - Need to register device
    if (adminState === 'device_required') {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <Card variant="glass" className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
                            <Smartphone className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                            端末登録が必要です
                        </h1>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark mb-6">
                            この端末は登録されていません。
                            <br />
                            登録コードを入力して端末を登録してください。
                        </p>

                        <div className="space-y-4">
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
                                <input
                                    type="text"
                                    placeholder="登録コードを入力"
                                    className="
                    w-full pl-12 pr-4 py-3 rounded-xl
                    bg-white dark:bg-surface-dark
                    border border-[var(--border)]
                    text-text-primary-light dark:text-text-primary-dark
                    placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark
                    focus:outline-none focus:ring-2 focus:ring-primary-500
                    text-center text-lg tracking-wider font-mono
                  "
                                    maxLength={8}
                                />
                            </div>
                            <Button onClick={handleDeviceRegistration} isLoading={isLoading} className="w-full">
                                端末を登録
                            </Button>
                        </div>

                        <button
                            onClick={() => setAdminState('unauthenticated')}
                            className="mt-6 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-primary-600 dark:hover:text-primary-400"
                        >
                            別のアカウントでログイン
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Authenticated - Show admin dashboard
    const adminMenuItems = [
        {
            icon: FileText,
            title: '記事管理',
            description: '記事の作成・編集・削除',
            href: '/admin/posts',
        },
        {
            icon: MessageSquare,
            title: '掲示板モデレーション',
            description: 'スレッドとコメントの管理',
            href: '/admin/moderation',
        },
        {
            icon: Users,
            title: '端末管理',
            description: '登録端末の確認・削除',
            href: '/admin/devices',
        },
        {
            icon: KeyRound,
            title: '登録コード発行',
            description: '新しい登録コードを発行',
            href: '/admin/codes',
        },
        {
            icon: Settings,
            title: 'サイト設定',
            description: 'サイト全体の設定',
            href: '/admin/settings',
        },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                                管理者ダッシュボード
                            </h1>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark">
                                サイトの管理・設定を行います
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setAdminState('unauthenticated')}
                        >
                            ログアウト
                        </Button>
                    </div>
                </div>
            </section>

            {/* Dashboard */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {adminMenuItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <Card
                                key={index}
                                variant="elevated"
                                className="hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Quick Stats (Demo) */}
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark mb-6">
                        概要
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: '公開中の記事', value: '12' },
                            { label: '下書き', value: '3' },
                            { label: 'スレッド数', value: '24' },
                            { label: '登録端末', value: '2' },
                        ].map((stat, index) => (
                            <Card key={index} variant="default" padding="md">
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                    {stat.label}
                                </p>
                                <p className="text-3xl font-bold gradient-text mt-1">
                                    {stat.value}
                                </p>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
