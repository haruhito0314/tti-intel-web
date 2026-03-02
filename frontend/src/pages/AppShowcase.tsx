import { Card, CardContent } from '@/components/ui';
import { Smartphone, ExternalLink, Rocket } from 'lucide-react';

// Future: Load from Firestore or CMS
const apps: {
    title: string;
    description: string;
    tags: string[];
    url?: string;
    image?: string;
}[] = [];

export function AppShowcase() {
    return (
        <div className="min-h-screen">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-6">
                            <span className="gradient-text">App</span>
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-2xl mx-auto leading-relaxed">
                            メンバーが開発したアプリケーションやプロジェクトを紹介します
                        </p>
                    </div>
                </div>
            </section>

            {/* App Grid */}
            <section className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                {apps.length === 0 ? (
                    /* Empty State */
                    <Card variant="glass" padding="lg" className="text-center py-20">
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-20 h-20 rounded-3xl bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center">
                                <Rocket className="w-10 h-10 text-[#0071E3]" />
                            </div>
                            <div>
                                <h2 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
                                    Coming Soon
                                </h2>
                                <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-md mx-auto leading-relaxed">
                                    メンバーが開発中のアプリが近日公開予定です。
                                    <br />
                                    お楽しみに！
                                </p>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {apps.map((app, index) => (
                            <Card
                                key={index}
                                variant="elevated"
                                padding="none"
                                className="overflow-hidden hover:scale-[1.015] transition-transform duration-300 group"
                            >
                                {/* App Image Placeholder */}
                                <div className="aspect-video bg-gradient-to-br from-[#0071E3]/10 to-[#00AFBE]/10 dark:from-[#0071E3]/20 dark:to-[#00AFBE]/20 flex items-center justify-center">
                                    <Smartphone className="w-12 h-12 text-[#5DABFF]" />
                                </div>

                                <CardContent className="p-6">
                                    <h3 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                        {app.title}
                                    </h3>
                                    <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4 line-clamp-3">
                                        {app.description}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {app.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 text-xs rounded-full bg-[#0071E3]/10 dark:bg-[#2997FF]/10 text-[#004C99] dark:text-[#5DABFF]"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Link */}
                                    {app.url && (
                                        <a
                                            href={app.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-[#0066CC] dark:text-[#2997FF] hover:underline"
                                        >
                                            アプリを見る
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
