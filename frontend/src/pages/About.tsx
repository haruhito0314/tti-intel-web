import { Card, CardContent } from '@/components/ui';
import { Check, Code, Sigma, Gamepad2, Video, ChevronDown, Calendar } from 'lucide-react';
import { useState } from 'react';

const activities = [
    {
        icon: Code,
        title: '開発',
        description: 'AIを使ったvibe codingで、Webサイトやアプリケーションの開発をします。',
    },
    {
        icon: Sigma,
        title: '数学',
        description: '自作問題を作ることをメインに、数学的な発想力と表現力を磨きます。',
    },
    {
        icon: Gamepad2,
        title: 'ゲーム',
        description: 'VALORANT、Apexを中心に、たまにフォートナイト。人数が集まればMinecraft Realms（Java版）も開く予定です。',
    },
    {
        icon: Video,
        title: '解説動画',
        description: '点数を取るためだけでなく、科目の本質をついた真の理解を促す勉強解説動画を制作します。',
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

    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="about-band-hero relative overflow-hidden">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-6">
                            About <span className="gradient-text">TTI Intelligence</span>
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-3xl mx-auto leading-relaxed">
                            私たちは豊田工業大学の学生を中心としたAIサークルです。
                            AI技術を活用しながら、学習・研究・開発をはじめ、
                            多くのことに挑戦していきます。
                        </p>
                    </div>
                </div>
            </section>

            {/* Activities */}
            <section className="about-band-white max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <h2 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] text-center mb-10">
                    活動内容
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {activities.map((activity, index) => {
                        const Icon = activity.icon;
                        return (
                            <Card
                                key={index}
                                variant="elevated"
                                className={`${index % 2 === 0 ? 'accent-card-soft' : 'accent-card-cool'} hover:scale-[1.015] transition-transform duration-300`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <CardContent className="p-6 text-center">
                                    <div className="w-14 h-14 rounded-full bg-[#0071E3]/10 dark:bg-[#2997FF]/10 flex items-center justify-center mx-auto mb-4">
                                        <Icon className="w-7 h-7 text-[#0071E3] dark:text-[#2997FF]" />
                                    </div>
                                    <h3 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                        {activity.title}
                                    </h3>
                                    <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        {activity.description}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* Next Event */}
            <section className="about-band-gray max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <Card variant="default" className="overflow-hidden !bg-transparent dark:!bg-transparent border-[#D2D2D7]/60 dark:border-white/10 shadow-none">
                    <div className="flex flex-col md:flex-row">
                        <div className="md:w-[42%] p-6 md:p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-[#D2D2D7]/60 dark:border-white/10">
                            <div className="relative w-full max-w-[280px] overflow-hidden rounded-3xl bg-white/45 dark:bg-white/[0.03] border border-[#D2D2D7]/60 dark:border-white/10 p-6">
                                <div className="absolute right-5 top-5 h-12 w-12 rounded-full bg-[#E8EEF9] dark:bg-[#1D2A42]" />
                                <div className="absolute left-6 bottom-6 h-8 w-8 rounded-full bg-[#D8E3FA] dark:bg-[#233B68]" />
                                <div className="relative z-10 flex min-h-[260px] flex-col justify-between gap-7">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-semibold tracking-[0.3em] text-[#8AA0C1] dark:text-[#7FA7E8]">
                                            NEXT EVENT
                                        </p>
                                        <p className="mt-2 text-[clamp(22px,7vw,28px)] font-semibold tracking-[-0.03em] leading-tight text-[#0B1B35] dark:text-[#F5F7FB]">
                                            次回イベント
                                        </p>
                                        <div className="mt-4 h-0.5 w-16 bg-[#5A86F7] dark:bg-[#7FA7FF]" />
                                    </div>
                                    <div className="relative ml-auto h-[116px] w-[116px] shrink-0 rounded-[28px] border border-[#DCE5F6] dark:border-white/10 bg-white/85 dark:bg-[#151D2C] shadow-[0_14px_35px_rgba(32,73,145,0.12)] dark:shadow-none">
                                        <div className="h-9 rounded-t-[28px] bg-[#AFC3FA] dark:bg-[#355AAB]" />
                                        <div className="grid grid-cols-4 gap-2 p-4">
                                            {Array.from({ length: 12 }).map((_, index) => (
                                                <span
                                                    key={index}
                                                    className={`h-3 rounded-[4px] ${
                                                        index === 7
                                                            ? 'bg-[#5D7DF4] dark:bg-[#7FA7FF]'
                                                            : 'bg-[#E8EEF8] dark:bg-[#26344D]'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <div className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#5D7DF4] dark:bg-[#7FA7FF] text-white dark:text-[#071225] shadow-[0_10px_22px_rgba(74,105,230,0.34)]">
                                            <Check className="h-7 w-7 stroke-[3]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <CardContent className="flex-1 p-8">
                            <h3 className="apple-title text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                {nextEvent.title}
                            </h3>
                            <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-4">
                                {nextEvent.description}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2 text-[#0071E3] dark:text-[#66B4FF]">
                                    <Calendar className="w-4 h-4" />
                                    {nextEvent.date}
                                </div>
                                <div className="flex items-center gap-2 text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">
                                    📍 {nextEvent.location}
                                </div>
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </section>

            {/* FAQ */}
            <section className="about-band-white max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <h2 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] text-center mb-10">
                    よくある質問
                </h2>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <Card
                            key={index}
                            variant="default"
                            padding="none"
                            className="overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] transition-colors"
                            >
                                <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                                    {faq.question}
                                </span>
                                <ChevronDown
                                    className={`w-5 h-5 text-[#86868B] dark:text-[rgba(235,235,245,0.3)] transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-96' : 'max-h-0'
                                    }`}
                            >
                                <p className="px-6 pb-4 apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                    {faq.answer}
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

        </div>
    );
}
