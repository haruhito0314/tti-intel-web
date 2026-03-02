import { Card, CardContent } from '@/components/ui';
import { BookOpen, Code, Cpu, MessageCircle, ChevronDown } from 'lucide-react';
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
        answer: 'はい、もちろんです！基礎から学べる勉強会や、ペアプログラミングによるサポート体制を整えています。経験者と初心者がペアを組んで学ぶ機会も多く、着実にスキルアップできる環境です。',
    },
    {
        question: '活動頻度はどのくらいですか？',
        answer: '週1回の定例勉強会（土曜日）と、月に1〜2回のプロジェクトミーティングが基本です。参加は任意で、自分のペースで活動に参加できます。',
    },
    {
        question: '費用はかかりますか？',
        answer: 'サークル費用は年額2,000円のみです。これは主にイベント運営費や機材費に充てられます。クラウドサービスの学習用クレジットは無料で利用できます。',
    },
    {
        question: '学部や学年に制限はありますか？',
        answer: 'ありません。学部1年生から大学院生まで、すべての学生が参加できます。他学部の学生も歓迎しています。',
    },
    {
        question: '卒業後もコミュニティに参加できますか？',
        answer: 'はい！OB/OGネットワークがあり、卒業後もコミュニティメンバーとして繋がり続けることができます。現役生へのメンタリングや就職相談なども行っています。',
    },
];

export function About() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-6">
                            About <span className="gradient-text">TTI Intelligence</span>
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-3xl mx-auto leading-relaxed">
                            私たちは豊田工業大学の学生を中心としたAIサークルです。
                            AI技術の学習・研究・開発を通じて、次世代のAIエンジニアを育成しています。
                        </p>
                    </div>
                </div>
            </section>

            {/* Philosophy */}
            <section className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <Card variant="glass" padding="lg">
                    <div className="text-center">
                        <h2 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-6">
                            理念
                        </h2>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-3xl mx-auto leading-relaxed">
                            「<span className="font-semibold text-[#0066CC] dark:text-[#2997FF]">学び、創り、共有する</span>」
                            <br className="hidden md:block" />
                            私たちは好奇心を大切にし、AI技術を通じて社会に貢献できる人材を育てます。
                            失敗を恐れず挑戦し、知識は惜しみなく共有する。
                            そんなオープンで活発なコミュニティを目指しています。
                        </p>
                    </div>
                </Card>
            </section>

            {/* Activities */}
            <section className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
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

            {/* FAQ */}
            <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
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

            {/* CTA Section */}
            <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <Card variant="glass" padding="lg" className="text-center">
                    <h2 className="apple-section gradient-text mb-4">
                        興味を持たれた方へ
                    </h2>
                    <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-6 max-w-xl mx-auto">
                        経験や専攻は問いません。AIに興味がある方なら誰でも歓迎です。まずはお気軽にお問い合わせください。
                    </p>
                    <a
                        href="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0071E3] text-white font-medium hover:bg-[#0077ED] transition-colors"
                    >
                        入会について問い合わせる
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                    </a>
                </Card>
            </section>
        </div>
    );
}
