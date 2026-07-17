import { Link } from 'react-router-dom';
import { PageSeo } from '@/components/PageSeo';
import { Calendar, ChevronDown, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/contexts/useTheme';

const activityShowcases = [
    {
        title: '解説動画',
        description: '科目の本質に踏み込む解説動画を制作し、学びを共有しています。',
        images: {
            light: '/images/about/activity-video-light.webp',
            dark: '/images/about/activity-video-dark.webp',
        },
        imageAlt: '動画編集用のモニター、マイク、キーボード',
        actions: [
            {
                label: 'YouTubeを見る',
                href: 'https://www.youtube.com/@ttiintelligence',
                external: true,
            },
        ],
        cardClass: 'activity-card--video',
        copyPosition: 'activity-copy--top-left',
    },
    {
        title: '開発',
        description: '最新のAIモデルやMCPを活用し、Web・アプリ・ゲーム開発に挑戦しています。',
        images: {
            light: '/images/about/activity-development-light.webp',
            dark: '/images/about/activity-development-dark.webp',
        },
        imageAlt: 'コードエディタを表示したノートPC',
        actions: [
            {
                label: 'アプリケーション',
                href: '/app',
                external: false,
            },
            {
                label: '開発について',
                href: '/development',
                external: false,
            },
        ],
        cardClass: 'activity-card--dev',
        copyPosition: 'activity-copy--top-left',
    },
    {
        title: 'ゲーム交流',
        description: 'VALORANT、APEX、Minecraftなどを中心に、メンバー同士で気軽に遊ぶオンライン交流活動です。',
        images: {
            light: '/images/about/activity-game-light.webp',
            dark: '/images/about/activity-game-dark.webp',
        },
        imageAlt: 'ゲームコントローラーとヘッドセット',
        actions: [
            {
                label: '詳しく見る',
                href: '/game-community',
                external: false,
            },
        ],
        cardClass: 'activity-card--game',
        copyPosition: 'activity-copy--top-left',
    },
    {
        title: '今週の数学',
        description: '自作問題を通して、数学的な発想力と表現力を磨いています。',
        images: {
            light: '/images/about/activity-math-light.webp',
            dark: '/images/about/activity-math-dark.webp',
        },
        imageAlt: '数学の図形が表示されたタブレットとペン',
        actions: [
            {
                label: '問題を見る',
                href: '/weekly-math',
                external: false,
            },
        ],
        cardClass: 'activity-card--math',
        copyPosition: 'activity-copy--top-left',
    },
];

const faqs = [
    {
        question: 'プログラミング未経験でも参加できますか？',
        answer: 'はい、もちろんです！未経験の方にも基礎から丁寧にお教えします。わからないところは1から全部サポートするので、安心して参加してください。',
    },
    {
        question: '活動頻度はどのくらいですか？',
        answer: '主に土日に活動しています。参加は自由で、都合の良いときに参加できます。自分のペースで無理なく続けられる環境です。',
    },
    {
        question: '費用はかかりますか？',
        answer: 'サークルの参加費用は無料です。ただし、AIツールのサブスクリプションなど個人で利用するサービスの費用は各自でご負担いただいています。',
    },
    {
        question: '学部や学年に制限はありますか？',
        answer: 'ありません。学部1年生から大学院生まで、すべての学生が参加できます。他大学の学生も歓迎しています。',
    },
    {
        question: 'どんなAIツールを使いますか？',
        answer: 'OpenAI Codex、Google Antigravity、Claude Codeなどの最新AIコーディングツールを活用しています。実際の開発を通じて、これらのツールの効果的な使い方を学びます。',
    },
];

const nextEvent = {
    title: '応用情報技術者試験',
    date: '2026年11月（秋期）',
    location: '各地の試験会場',
    description: 'メンバー有志で応用情報技術者試験に挑戦します。一緒に合格を目指しましょう！',
};

export function About() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const { resolvedTheme } = useTheme();

    return (
        <div className="animate-fade-in">
            <PageSeo
                title="サークルについて | TTI Intelligence"
                description="TTI Intelligenceの活動内容、参加条件、開催予定、よくある質問を紹介します。"
            />
            <section className="about-band-hero relative overflow-hidden">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-5">
                            サークルについて
                        </h1>
                        <p className="apple-body text-pretty text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-[36em] mx-auto leading-[1.8]">
                            私たちは豊田工業大学の学生を中心としたAIサークルです。
                            <br className="hidden sm:block" />
                            AI技術を活用しながら、学習・研究・開発をはじめ、多くのことに挑戦していきます。
                        </p>
                    </div>
                </div>
            </section>

            <section className="about-activities-section">
                <div className="activities-grid">
                    {activityShowcases.map((item) => (
                        <article
                            key={item.title}
                            className={`activity-card ${item.cardClass} ${item.copyPosition}`}
                        >
                            <div className="activity-copy">
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                                <div className="activity-actions">
                                    {item.actions.map((action) => {
                                        if (!('href' in action) || !action.href) {
                                            return (
                                                <span key={action.label} className="activity-button disabled" aria-disabled="true">
                                                    {action.label}
                                                </span>
                                            );
                                        }

                                        if (action.external) {
                                            return (
                                                <a
                                                    key={action.label}
                                                    href={action.href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="activity-button primary"
                                                >
                                                    {action.label}
                                                </a>
                                            );
                                        }

                                        return (
                                            <Link key={action.label} to={action.href} className="activity-button primary">
                                                {action.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                            <img
                                className="activity-visual"
                                src={item.images[resolvedTheme]}
                                alt={item.imageAlt}
                                width={1600}
                                height={1024}
                                loading="lazy"
                            />
                        </article>
                    ))}
                </div>
            </section>

            <div className="about-band-soft">
                <section className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
                    <p className="text-[13px] font-semibold tracking-[0.04em] text-[#0071E3] dark:text-[#5CABFF] mb-3">
                        次回の取り組み
                    </p>
                    <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.03em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-3 leading-[1.15]">
                        {nextEvent.title}
                    </h2>
                    <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.66)] mb-5 max-w-[36em]">
                        {nextEvent.description}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-[#515154] dark:text-[rgba(235,235,245,0.7)]">
                        <span className="inline-flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#0071E3] dark:text-[#5CABFF]" aria-hidden="true" />
                            {nextEvent.date}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#0071E3] dark:text-[#5CABFF]" aria-hidden="true" />
                            {nextEvent.location}
                        </span>
                    </div>
                </section>

                <section className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16 border-t border-black/10 dark:border-white/10">
                    <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.03em] text-[#1D1D1F] dark:text-[#F5F5F7] text-center mb-8">
                        よくある質問
                    </h2>
                    <div className="divide-y divide-black/10 dark:divide-white/12">
                        {faqs.map((faq, index) => (
                            <div key={faq.question}>
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full py-4 flex items-center justify-between gap-4 text-left"
                                    aria-expanded={openFaq === index}
                                >
                                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                                        {faq.question}
                                    </span>
                                    <ChevronDown
                                        className={`w-5 h-5 shrink-0 text-[#86868B] dark:text-[rgba(235,235,245,0.35)] transition-transform duration-300 ${
                                            openFaq === index ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                        openFaq === index ? 'max-h-96 pb-4' : 'max-h-0'
                                    }`}
                                >
                                    <p className="apple-body text-pretty leading-[1.75] text-[#6E6E73] dark:text-[rgba(235,235,245,0.66)]">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
