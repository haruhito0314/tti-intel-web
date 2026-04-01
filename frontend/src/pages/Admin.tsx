import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Shield, LogIn, LogOut, Users, FileText, MessageSquare, Settings, Sigma } from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';

export function Admin() {
    const { user, isAdmin, loading, login, logout } = useAuth();

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <div className="animate-pulse text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                    読み込み中...
                </div>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <Card variant="glass" className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-[#0071E3] dark:text-[#2997FF]" />
                        </div>
                        <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                            管理者ログイン
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-8">
                            管理者としてログインしてください
                        </p>
                        <Button onClick={login} size="lg" className="w-full rounded-full">
                            <LogIn className="w-5 h-5" />
                            Googleでログイン
                        </Button>
                        <p className="mt-4 text-xs text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">
                            ※ 事前に承認されたメールアドレスのみログイン可能です
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Logged in but not admin
    if (!isAdmin) {
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
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-2">
                            このページにアクセスする権限がありません。
                        </p>
                        <p className="apple-footnote text-[#86868B] dark:text-[rgba(235,235,245,0.3)] mb-8">
                            ログイン中: {user.email}
                        </p>
                        <Button onClick={logout} variant="outline" className="rounded-full">
                            <LogOut className="w-4 h-4" />
                            ログアウト
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Admin dashboard
    const adminMenuItems = [
        {
            icon: MessageSquare,
            title: '掲示板モデレーション',
            description: 'スレッドの固定・ロック・削除',
            href: '/board',
        },
        {
            icon: FileText,
            title: '記事管理',
            description: '記事の作成・編集・削除（準備中）',
            href: '#',
        },
        {
            icon: Users,
            title: 'メンバー管理',
            description: '管理者アカウントの追加・削除',
            href: '/admin/members',
        },
        {
            icon: Sigma,
            title: '今週の数学 管理',
            description: 'ホームの数学問題を週次更新',
            href: '/admin/weekly-math',
        },
        {
            icon: Settings,
            title: 'サイト設定',
            description: 'サイト全体の設定（準備中）',
            href: '#',
        },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                管理者
                            </h1>
                            <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                {user.email}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={logout}
                            className="rounded-full"
                        >
                            <LogOut className="w-4 h-4" />
                            ログアウト
                        </Button>
                    </div>
                </div>
            </section>

            {/* Dashboard */}
            <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid sm:grid-cols-2 gap-6">
                    {adminMenuItems.map((item, index) => {
                        const Icon = item.icon;
                        const isDisabled = item.href === '#';
                        const cardContent = (
                            <Card
                                key={index}
                                variant="elevated"
                                className={`transition-transform duration-300 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] cursor-pointer'}`}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-6 h-6 text-[#0071E3] dark:text-[#2997FF]" />
                                        </div>
                                        <div>
                                            <h3 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                                                {item.title}
                                            </h3>
                                            <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                        return isDisabled ? (
                            <div key={index}>{cardContent}</div>
                        ) : (
                            <Link key={index} to={item.href}>{cardContent}</Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
