import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardContent } from '@/components/ui';
import { PageSeo } from '@/components/PageSeo';
import { Smartphone, ExternalLink, Rocket, Sparkles } from 'lucide-react';

// Future: Load from Firestore or CMS
const apps: {
    title: string;
    status: 'available' | 'wip';
    description: string;
    url?: string;
    path?: string;
    images?: string[];
    visual?: 'assistant';
}[] = [
    {
        title: 'AI Assistant',
        status: 'available',
        description: 'サイトの公開情報をもとに、知りたい内容を短く案内するAIアシスタント。',
        path: '/app/ai-assistant',
        visual: 'assistant',
    },
    {
        title: '卓球組み合わせ表',
        status: 'available',
        description: '人数とクール数から、卓球の組み合わせと台のローテーションを自動生成。',
        path: '/app/table-tennis',
        images: [
            '/images/table-tennis-match-maker.webp',
        ],
    },
    {
        title: 'カラーソートパズル',
        status: 'available',
        description: 'ボトルの色を移し替えて、同じ色ごとに揃えるミニパズル。',
        path: '/app/color-sort',
        images: [
            '/images/color-sort-puzzle.webp',
        ],
    },
];

function ImageCarousel({ images, title }: { images: string[]; title: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 4000); // 4 seconds per slide
        return () => clearInterval(interval);
    }, [images.length]);

    return (
        <div data-testid="app-card-visual" className="aspect-[4/3] relative overflow-hidden bg-gray-100 dark:bg-gray-800">
            {images.map((img, index) => (
                <img
                    key={img}
                    src={img}
                    alt={`${title} screenshot ${index + 1}`}
                    width={800}
                    height={450}
                    loading="lazy"
                    className={`absolute inset-0 object-cover w-full h-full transition-opacity duration-[1500ms] ${
                        index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                />
            ))}
            {images.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
                    {images.map((_, index) => (
                        <div
                            key={index}
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                                index === currentIndex ? 'bg-white' : 'bg-white/40'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function AssistantCardPreview() {
    return (
        <div
            role="img"
            aria-label="AI Assistantのプレビュー"
            data-testid="app-card-visual"
            className="aspect-[4/3] relative overflow-hidden bg-[#071017] p-3 sm:p-4"
        >
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full border border-[#8ED3F2]/20" />
            <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border border-[#8ED3F2]/15" />
            <div
                data-testid="assistant-preview-shell"
                className="relative grid h-full min-h-0 grid-rows-[32px_minmax(0,1fr)_28px] overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl"
            >
                <div className="flex min-w-0 items-center justify-between border-b border-white/10 px-3 text-[9px] text-white/80">
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#8ED3F2]" />
                        <span className="truncate">AI Assistant</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[8px] font-bold tracking-widest text-[#8FE2BD]">
                        <i className="h-1.5 w-1.5 rounded-full bg-[#46D49B]" /> LIVE
                    </span>
                </div>
                <div
                    data-testid="assistant-preview-messages"
                    className="flex min-h-0 flex-col gap-1.5 overflow-hidden p-2 text-[8px] leading-tight"
                >
                    <div className="ml-auto max-w-[78%] truncate rounded-lg rounded-br-sm bg-[#3A83AC] px-2 py-1 text-white">
                        このAI Assistantは何ができるの？
                    </div>
                    <div className="flex min-w-0 items-start gap-2">
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-md bg-white/10">
                            <Sparkles className="h-3 w-3 text-[#9ADCF8]" />
                        </span>
                        <div className="min-w-0 max-w-[82%] truncate rounded-lg rounded-tl-sm bg-white/10 px-2 py-1 text-white/80">
                            サークルやサイトの情報を短く案内できます。
                        </div>
                    </div>
                </div>
                <div
                    data-testid="assistant-preview-composer"
                    className="mx-2.5 mb-1.5 flex min-w-0 items-center rounded-full border border-white/10 bg-black/15 px-2.5 text-[7px] text-white/35"
                >
                    <span className="truncate">メッセージを入力します</span>
                </div>
            </div>
        </div>
    );
}

export function AppShowcase() {
    return (
        <div className="min-h-screen">
            <PageSeo
                title="Apps | TTI Intelligence"
                description="TTI Intelligenceのメンバーが開発したアプリケーションやプロジェクトを紹介します。"
            />
            {/* Hero */}
            <section className="about-band-hero relative overflow-hidden">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-5">
                            アプリケーション
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-2xl mx-auto leading-relaxed">
                            メンバーが開発したアプリケーションやプロジェクトを紹介します
                        </p>
                    </div>
                </div>
            </section>

            {/* App Grid */}
            <section className="about-band-white">
                <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
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
                                data-testid="app-showcase-card"
                                className={`${index % 2 === 0 ? 'accent-card-soft' : 'accent-card-cool'} flex h-full flex-col overflow-hidden hover:scale-[1.015] transition-transform duration-300 group`}
                            >
                                {/* App Image */}
                                {app.visual === 'assistant' ? (
                                    <AssistantCardPreview />
                                ) : app.images && app.images.length > 0 ? (
                                    <ImageCarousel images={app.images} title={app.title} />
                                ) : (
                                    <div data-testid="app-card-visual" className="aspect-[4/3] bg-[#F5F5F7] dark:bg-[#111113] flex items-center justify-center">
                                        <Smartphone className="w-12 h-12 text-[#5DABFF]" />
                                    </div>
                                )}

                                <CardContent data-testid="app-card-content" className="flex flex-1 flex-col p-6">
                                    <div data-testid="app-card-title-row" className="mb-2 grid grid-rows-[1.75rem_auto] content-start gap-2">
                                        <h3 className="apple-headline truncate self-start text-[#1D1D1F] dark:text-[#F5F5F7]">
                                            {app.title}
                                        </h3>
                                        <div>
                                            <Badge variant={app.status === 'available' ? 'success' : 'warning'}>
                                                {app.status === 'available' ? '公開中' : '調整中'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p data-testid="app-card-description" className="apple-footnote mb-4 h-[3em] line-clamp-2 leading-[1.5] text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        {app.description}
                                    </p>

                                    {/* Link */}
                                    {app.path && (
                                        <Link
                                            to={app.path}
                                            className="mt-auto inline-flex items-center gap-1.5 self-start text-sm text-[#0066CC] dark:text-[#2997FF] hover:underline"
                                        >
                                            アプリを見る
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    )}
                                    {!app.path && app.url && (
                                        <a
                                            href={app.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-auto inline-flex items-center gap-1.5 self-start text-sm text-[#0066CC] dark:text-[#2997FF] hover:underline"
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
                </div>
            </section>
        </div>
    );
}
