import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Calendar,
    Check,
    Gamepad2,
    Headphones,
    Heart,
    Home,
    Moon,
    Swords,
    Trophy,
} from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { siteConfig } from '@/config/site';

const games = [
    {
        id: 'valorant',
        name: 'VALORANT',
        label: 'VALORANT',
        image: '/images/game/valorant.png',
        imageAlt: 'VALORANTの公式キービジュアル',
        accent: 'valorant' as const,
        description:
            '5v5で連携するタクティカルFPS。エイムだけでなく、声かけや作戦も楽しめるゲームです。初心者でもパーティを組んで参加できます。',
        heroTilt: '-rotate-[3deg]',
    },
    {
        id: 'apex',
        name: 'APEX LEGENDS',
        label: 'APEX',
        image: '/images/game/apex-legends.png',
        imageAlt: 'APEX LEGENDSの公式キービジュアル',
        accent: 'apex' as const,
        description:
            'スピード感のあるバトルロイヤル。カジュアルからランクまで、気分に合わせて遊べます。チームで連携しながら勝ちを目指します。',
        heroTilt: 'rotate-[2deg]',
    },
    {
        id: 'minecraft',
        name: 'Minecraft',
        label: 'Minecraft',
        image: '/images/game/minecraft.png',
        imageAlt: 'Minecraftの公式キービジュアル',
        accent: 'minecraft' as const,
        description:
            '建築、探索、サーバー企画など、自由に遊べる定番ゲーム。FPSが苦手な人でも参加しやすく、のんびり交流できます。',
        heroTilt: '-rotate-[1.5deg]',
    },
];

const recommendedItems = [
    'ゲームが好き',
    '友達を作りたい',
    '気軽に遊びたい',
    'VCで話したい・聞き専でもOK',
    '1人での参加も不安じゃない',
];

const playStyles = [
    {
        title: 'Casual Play',
        description: '初心者歓迎。雑談しながら気軽に遊べます。',
        icon: Gamepad2,
        tone: 'purple',
    },
    {
        title: 'Ranked Match',
        description: '勝ちを目指してランクを一緒に回します。',
        icon: Trophy,
        tone: 'blue',
    },
    {
        title: 'Custom Match',
        description: '人数が集まればカスタムやイベントも開催できます。',
        icon: Swords,
        tone: 'orange',
    },
    {
        title: 'Voice Chat',
        description: 'Discordなどで話しながら交流します。',
        icon: Headphones,
        tone: 'green',
    },
];

const beginnerTags = [
    '初心者サポートあり',
    'ひとり参加も歓迎',
    '学年・学部不問',
    '掛け持ち参加OK',
    '見る専・VCだけの参加もOK',
];

const activityStyles = [
    {
        title: '不定期開催',
        description: 'メンバーの空いている時間に集まってプレイ',
        icon: Calendar,
    },
    {
        title: '夜の時間帯中心',
        description: '授業後や休日に参加しやすい時間で開催',
        icon: Moon,
    },
    {
        title: 'オンライン参加',
        description: '自宅、寮、外出先から気軽に参加可能',
        icon: Home,
    },
];

function DoodleStar({ className = '' }: { className?: string }) {
    return (
        <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
                d="M9 1.5L10.6 6.4L15.5 8L10.6 9.6L9 14.5L7.4 9.6L2.5 8L7.4 6.4L9 1.5Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

type HandwrittenTone = 'cream' | 'pink' | 'yellow' | 'mint' | 'sky' | 'peach';

function StickyNote({
    className = '',
    children,
    tone = 'yellow',
}: {
    className?: string;
    children: ReactNode;
    tone?: HandwrittenTone;
}) {
    return (
        <div className={`game-sticky-note game-sticky-note--${tone} ${className}`}>
            <span className="game-sticky-tape" aria-hidden="true" />
            <p className="game-handwritten">{children}</p>
        </div>
    );
}

function HandNote({ className = '', children }: { className?: string; children: ReactNode }) {
    return <p className={`game-hand-note game-handwritten ${className}`}>{children}</p>;
}

export function GameCommunity() {
    return (
        <div className="game-community">
            <PageSeo
                title="Game Community | TTI Intelligence"
                description="VALORANT、APEX LEGENDS、Minecraftなどを中心に、メンバー同士で気軽に遊ぶゲーム交流活動を紹介します。"
            />

            {/* Hero */}
            <section className="game-band-hero">
                <div className="game-hero-glow" aria-hidden="true" />
                <div className="game-hero-doodles" aria-hidden="true">
                    <DoodleStar className="game-doodle game-doodle--star-1" />
                    <DoodleStar className="game-doodle game-doodle--star-2" />
                    <svg className="game-doodle game-doodle--squiggle" width="42" height="20" viewBox="0 0 42 20" fill="none">
                        <path d="M2 12C8 4 14 16 20 8C26 0 32 14 40 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>

                <div className="game-container game-hero-layout">
                    <div className="game-hero-copy">
                        <p className="game-eyebrow game-handwritten game-eyebrow--hand">ゲーム交流</p>
                        <h1 className="game-hero-title game-handwritten">Game Community</h1>
                        <p className="game-hero-lead">放課後、オンラインで集まるもう一つの活動場所。</p>
                        <p className="game-hero-body">
                            VALORANT、APEX LEGENDS、Minecraftなどを中心に、メンバー同士で気軽に遊ぶゲーム交流活動です。初心者から経験者まで、空いている時間に集まって楽しめます。
                        </p>
                        <HandNote className="game-hero-side-note">みんなでワイワイ♪</HandNote>
                    </div>

                    <div className="game-hero-visual">
                        <div className="game-hero-cards-wrap">
                            <StickyNote className="game-hero-sticky" tone="mint">
                                初心者OK！
                            </StickyNote>
                            <div className="game-hero-cards">
                            {games.map((game) => (
                                <article
                                    key={game.id}
                                    className={`game-hero-card game-hero-card--${game.accent} ${game.heroTilt}`}
                                >
                                    <div className="game-hero-card-image-wrap">
                                        <img src={game.image} alt={game.imageAlt} loading="eager" />
                                    </div>
                                    <span className={`game-hero-card-label game-hero-card-label--${game.accent}`}>
                                        {game.label}
                                    </span>
                                </article>
                            ))}
                        </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About */}
            <section className="game-band-cream">
                <div className="game-container game-about-layout">
                    <div className="game-about-copy">
                        <div className="game-section-heading">
                            <Gamepad2 className="game-section-icon" aria-hidden="true" />
                            <h2 className="game-handwritten">ゲーム交流とは</h2>
                        </div>
                        <p className="game-body-text">
                            ゲーム交流は、メンバー同士がオンラインで集まり、FPS、バトルロイヤル、サンドボックスゲームなどを通して交流する活動です。勝ちを目指して真剣にプレイする日もあれば、雑談しながら気軽に遊ぶ日もあります。ゲームが得意な人だけでなく、初心者や久しぶりに遊ぶ人も参加しやすい雰囲気を大切にしています。
                        </p>
                    </div>
                    <aside className="game-recommend-card">
                        <StickyNote className="game-recommend-sticky" tone="pink">
                            ぜひきてね♪
                        </StickyNote>
                        <p className="game-recommend-title game-handwritten">こんな人におすすめ！</p>
                        <ul className="game-recommend-list">
                            {recommendedItems.map((item) => (
                                <li key={item}>
                                    <Check className="game-recommend-check" aria-hidden="true" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </aside>
                </div>
            </section>

            {/* Featured Games */}
            <section className="game-band-light">
                <div className="game-container">
                    <div className="game-section-heading game-section-heading--center">
                        <h2 className="game-handwritten">Featured Games</h2>
                        <span className="game-heading-underline game-heading-underline--orange game-heading-underline--hand" aria-hidden="true" />
                        <HandNote className="game-featured-note">いろいろ遊べる！</HandNote>
                    </div>
                    <div className="game-featured-grid">
                        {games.map((game) => (
                            <article key={game.id} className={`game-featured-card game-featured-card--${game.accent}`}>
                                <span className={`game-featured-sticker game-featured-sticker--${game.accent} game-handwritten`}>
                                    {game.id === 'valorant' && '連携が楽しい！'}
                                    {game.id === 'apex' && 'カジュアル勢多め'}
                                    {game.id === 'minecraft' && 'のんびり派歓迎'}
                                </span>
                                <div className="game-featured-image">
                                    <img src={game.image} alt={game.imageAlt} loading="lazy" />
                                </div>
                                <div className="game-featured-copy">
                                    <h3 className="game-handwritten">{game.name}</h3>
                                    <p>{game.description}</p>
                                    <span className="game-featured-arrow" aria-hidden="true">
                                        <ArrowRight />
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Play Style */}
            <section className="game-band-cream">
                <div className="game-container">
                    <div className="game-section-heading game-section-heading--center">
                        <h2 className="game-handwritten">Play Style</h2>
                        <HandNote className="game-playstyle-note">自分のペースでOK</HandNote>
                    </div>
                    <div className="game-play-grid">
                        {playStyles.map((style) => {
                            const Icon = style.icon;
                            const handLabel =
                                style.title === 'Casual Play'
                                    ? 'いちばん人気！'
                                    : style.title === 'Voice Chat'
                                      ? '話すの好きな人に'
                                      : null;
                            return (
                                <article
                                    key={style.title}
                                    className={`game-play-card game-play-card--${style.tone}`}
                                >
                                    {handLabel && (
                                        <span className="game-play-hand-label game-handwritten">{handLabel}</span>
                                    )}
                                    <div className="game-play-icon">
                                        <Icon aria-hidden="true" />
                                    </div>
                                    <h3 className="game-handwritten">{style.title}</h3>
                                    <p>{style.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Beginners Welcome */}
            <section className="game-band-light">
                <div className="game-container game-beginner-layout">
                    <div className="game-beginner-copy">
                        <StickyNote className="game-beginner-sticky" tone="yellow">
                            ひとり参加OK！
                        </StickyNote>
                        <div className="game-section-heading">
                            <Heart className="game-section-icon game-section-icon--heart" aria-hidden="true" />
                            <h2 className="game-handwritten">初心者歓迎</h2>
                        </div>
                        <p className="game-body-text">
                            勝つことだけを目的にするのではなく、一緒に遊ぶ時間を通してメンバー同士が自然に話せる場所を目指しています。初心者、復帰勢、見る専、作業しながらVCだけ参加したい人も歓迎です。大学の授業後や休日に、気軽に集まれるオンラインの交流場所として活動しています。
                        </p>
                        <div className="game-tag-list">
                            {beginnerTags.map((tag) => (
                                <span key={tag} className="game-tag game-handwritten">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="game-beginner-decor" aria-hidden="true">
                        <DoodleStar className="game-doodle game-doodle--star-3" />
                        <svg className="game-doodle game-doodle--heart" width="22" height="20" viewBox="0 0 22 20" fill="none">
                            <path
                                d="M11 18.2C11 18.2 2 12.4 2 6.8C2 4.2 4.1 2.2 6.7 2.2C8.4 2.2 9.9 3 11 4.3C12.1 3 13.6 2.2 15.3 2.2C17.9 2.2 20 4.2 20 6.8C20 12.4 11 18.2 11 18.2Z"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>
            </section>

            {/* Activity Style */}
            <section className="game-band-cream">
                <div className="game-container">
                    <div className="game-section-heading game-section-heading--center">
                        <h2 className="game-handwritten">Activity Style</h2>
                        <StickyNote className="game-activity-sticky" tone="sky">
                            授業後に集合！
                        </StickyNote>
                    </div>
                    <div className="game-activity-grid">
                        {activityStyles.map((item) => {
                            const Icon = item.icon;
                            return (
                                <article key={item.title} className="game-activity-card">
                                    <div className="game-activity-icon">
                                        <Icon aria-hidden="true" />
                                    </div>
                                    <h3 className="game-handwritten">{item.title}</h3>
                                    <p>{item.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Join */}
            <section className="game-band-dark">
                <div className="game-container game-join-layout">
                    <div className="game-join-photos" aria-hidden="true">
                        {games.map((game, index) => (
                            <div
                                key={game.id}
                                className={`game-join-photo game-join-photo--${index}`}
                            >
                                <img src={game.image} alt="" />
                                <span className="game-join-tape" />
                            </div>
                        ))}
                    </div>

                    <div className="game-join-copy">
                        <HandNote className="game-join-hand-title game-handwritten">Join the Game Night</HandNote>
                        <h2 className="sr-only">Join the Game Night</h2>
                        <p>
                            初心者でも、1人参加でも大丈夫。まずは気軽に参加して、一緒に遊んでみませんか？
                        </p>
                        <div className="game-join-actions">
                            <a
                                href={siteConfig.social.discord.url}
                                target="_blank"
                                rel="noreferrer"
                                className="game-btn game-btn--primary game-handwritten"
                            >
                                Discordに参加する
                            </a>
                            <Link to="/contact" className="game-btn game-btn--outline game-handwritten">
                                お問い合わせ
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="game-disclaimer">
                    このページは豊田工業大学の学生サークル「TTI Intelligence」の活動紹介であり、各ゲームの公式サイトではありません。VALORANT、APEX LEGENDS、Minecraft の名称・画像・商標等は、それぞれの権利者に帰属します。
                </p>
            </section>
        </div>
    );
}
