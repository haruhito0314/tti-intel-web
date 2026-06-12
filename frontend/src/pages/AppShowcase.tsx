import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui';
import { Smartphone, ExternalLink, Rocket } from 'lucide-react';

// Future: Load from Firestore or CMS
const apps: {
    title: string;
    description: string;
    tags: string[];
    url?: string;
    path?: string;
    images?: string[];
}[] = [
    {
        title: 'TOEIC Practice (調整中)',
        description: 'TOEIC対策に使える練習アプリ。Part別演習やタイムアタックで、学習の進み具合を確認できます。',
        tags: ['React', 'TypeScript', 'Appwrite'],
        url: 'https://toeic-practice.appwrite.network',
        images: [
            '/images/toeic-practice.png',
        ]
    },
    {
        title: '卓球組み合わせ表ジェネレーター',
        description: '人数とクール数を指定して、卓球の組み合わせを自動生成。番号シャッフル、休み枠、台ローテーションに対応。',
        tags: ['React', 'TypeScript', 'Sports'],
        path: '/app/table-tennis',
        images: [
            '/images/table-tennis-match-maker.png',
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
        <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-gray-800">
            {images.map((img, index) => (
                <img
                    key={img}
                    src={img}
                    alt={`${title} screenshot ${index + 1}`}
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

export function AppShowcase() {
    return (
        <div className="min-h-screen">
            {/* Hero */}
            <section className="about-band-hero relative overflow-hidden">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-6">
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
                                className={`${index % 2 === 0 ? 'accent-card-soft' : 'accent-card-cool'} overflow-hidden hover:scale-[1.015] transition-transform duration-300 group`}
                            >
                                {/* App Image */}
                                {app.images && app.images.length > 0 ? (
                                    <ImageCarousel images={app.images} title={app.title} />
                                ) : (
                                    <div className="aspect-video bg-[#F5F5F7] dark:bg-[#111113] flex items-center justify-center">
                                        <Smartphone className="w-12 h-12 text-[#5DABFF]" />
                                    </div>
                                )}

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
                                    {app.path && (
                                        <Link
                                            to={app.path}
                                            className="inline-flex items-center gap-1.5 text-sm text-[#0066CC] dark:text-[#2997FF] hover:underline"
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
                </div>
            </section>
        </div>
    );
}
