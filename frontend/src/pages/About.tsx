import { Card, CardContent } from '@/components/ui';
import { Brain, Users, Trophy, GraduationCap, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const activities = [
    {
        icon: Brain,
        title: '勉強会',
        description: '最新のAI技術やMLフレームワークについて学ぶ定期勉強会を開催しています。',
    },
    {
        icon: Trophy,
        title: 'コンペティション',
        description: 'Kaggleや各種AIコンペへのチーム参加で実践的なスキルを磨きます。',
    },
    {
        icon: Users,
        title: 'プロジェクト開発',
        description: 'チームでAIを活用したアプリケーションやサービスを開発しています。',
    },
    {
        icon: GraduationCap,
        title: '研究支援',
        description: '卒業研究や論文執筆のサポート、研究者との交流機会を提供します。',
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
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="text-center">
                        <h1 className="text-[28px] md:text-5xl font-bold text-text-primary-light dark:text-text-primary-dark mb-6 leading-tight tracking-tight">
                            About <span className="gradient-text">TTI Intelligence</span>
                        </h1>
                        <p className="text-[15px] md:text-lg text-text-secondary-light dark:text-text-secondary-dark max-w-3xl mx-auto leading-relaxed">
                            私たちは豊田工業大学の学生を中心としたAIサークルです。
                            AI技術の学習・研究・開発を通じて、次世代のAIエンジニアを育成しています。
                        </p>
                    </div>
                </div>
            </section>

            {/* Philosophy */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <Card variant="glass" padding="lg">
                    <div className="text-center">
                        <h2 className="text-xl md:text-3xl font-bold text-text-primary-light dark:text-text-primary-dark mb-6 tracking-tight">
                            理念
                        </h2>
                        <p className="text-[15px] md:text-lg text-text-secondary-light dark:text-text-secondary-dark max-w-3xl mx-auto leading-relaxed">
                            「<span className="font-semibold text-primary-600 dark:text-primary-400">学び、創り、共有する</span>」
                            <br className="hidden md:block" />
                            私たちは好奇心を大切にし、AI技術を通じて社会に貢献できる人材を育てます。
                            失敗を恐れず挑戦し、知識は惜しみなく共有する。
                            そんなオープンで活発なコミュニティを目指しています。
                        </p>
                    </div>
                </Card>
            </section>

            {/* Activities */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <h2 className="text-xl md:text-3xl font-bold text-text-primary-light dark:text-text-primary-dark text-center mb-10 tracking-tight">
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
                                    <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-[15px] md:text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                                        {activity.title}
                                    </h3>
                                    <p className="text-[13px] md:text-sm text-text-secondary-light dark:text-text-secondary-dark">
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
                <h2 className="text-xl md:text-3xl font-bold text-text-primary-light dark:text-text-primary-dark text-center mb-10 tracking-tight">
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
                                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
                                    {faq.question}
                                </span>
                                <ChevronDown
                                    className={`w-5 h-5 text-text-muted-light dark:text-text-muted-dark transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-96' : 'max-h-0'
                                    }`}
                            >
                                <p className="px-6 pb-4 text-text-secondary-light dark:text-text-secondary-dark">
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
                    <h2 className="text-xl md:text-2xl font-bold gradient-text mb-4 tracking-tight">
                        興味を持たれた方へ
                    </h2>
                    <p className="text-[15px] md:text-base text-text-secondary-light dark:text-text-secondary-dark mb-6 max-w-xl mx-auto">
                        経験や専攻は問いません。AIに興味がある方なら誰でも歓迎です。まずはお気軽にお問い合わせください。
                    </p>
                    <a
                        href="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition-opacity"
                    >
                        入会について問い合わせる
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                    </a>
                </Card>
            </section>
        </div>
    );
}
