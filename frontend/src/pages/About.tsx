import { Card, CardContent } from '@/components/ui';
import { BookOpen, Code, Cpu, MessageCircle, ChevronDown, Calendar } from 'lucide-react';
import { useState } from 'react';

const activities = [
    {
        icon: BookOpen,
        title: '資格勉強',
        description: '基本情報・応用情報技術者試験などのIT資格取得に向けた勉強会を実施しています。',
    },
    {
        icon: Code,
        title: '開発',
        description: 'Webアプリやツールなど、チームで実践的なプロダクト開発に取り組んでいます。',
    },
    {
        icon: Cpu,
        title: 'AI研究',
        description: '最新のAI技術や機械学習について学び、研究・実験を行っています。',
    },
    {
        icon: MessageCircle,
        title: '情報交流',
        description: '技術トレンドや学習方法の共有、メンバー間のナレッジ交換を促進しています。',
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
                                className="hover:scale-[1.015] transition-transform duration-300"
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
                <Card variant="glass" className="overflow-hidden bg-[#EBEBF0]/80 dark:bg-[var(--surface-2)]/75">
                    <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/3 event-panel-bg p-8 flex items-center justify-center">
                            <div className="text-center text-white">
                                <Calendar className="w-12 h-12 mx-auto mb-4" />
                                <p className="apple-headline">次回イベント</p>
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
