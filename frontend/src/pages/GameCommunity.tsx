import { useRef, type ReactNode } from 'react';
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
import { useGameCommunityAnimations } from '@/hooks/useGameCommunityAnimations';

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

function DoodleStar({ className = '', size = 18 }: { className?: string; size?: number }) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
                d="M9 1.5L10.6 6.4L15.5 8L10.6 9.6L9 14.5L7.4 9.6L2.5 8L7.4 6.4L9 1.5Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function DoodleHeart({ className = '' }: { className?: string }) {
    return (
        <svg className={className} width="22" height="20" viewBox="0 0 22 20" fill="none" aria-hidden="true">
            <path
                d="M11 18.2C11 18.2 2 12.4 2 6.8C2 4.2 4.1 2.2 6.7 2.2C8.4 2.2 9.9 3 11 4.3C12.1 3 13.6 2.2 15.3 2.2C17.9 2.2 20 4.2 20 6.8C20 12.4 11 18.2 11 18.2Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function DoodleSquiggle({ className = '' }: { className?: string }) {
    return (
        <svg className={className} width="48" height="22" viewBox="0 0 48 22" fill="none" aria-hidden="true">
            <path
                d="M2 14C8 4 14 18 22 9C28 2 34 16 46 7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

function DoodleSparkle({ className = '' }: { className?: string }) {
    return (
        <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5V14.5M1.5 8H14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path
                d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.55"
            />
        </svg>
    );
}

function DoodleCircle({ className = '' }: { className?: string }) {
    return (
        <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <ellipse cx="14" cy="14" rx="11" ry="10.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2.5" />
        </svg>
    );
}

function DoodleArrow({ className = '' }: { className?: string }) {
    return (
        <svg className={className} width="36" height="24" viewBox="0 0 36 24" fill="none" aria-hidden="true">
            <path d="M2 16C10 6 18 20 28 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path
                d="M24 6L29 7.5L27 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function DoodleDots({ className = '' }: { className?: string }) {
    return (
        <svg className={className} width="40" height="12" viewBox="0 0 40 12" fill="none" aria-hidden="true">
            <circle cx="4" cy="6" r="2" fill="currentColor" />
            <circle cx="14" cy="6" r="2" fill="currentColor" opacity="0.75" />
            <circle cx="24" cy="6" r="2" fill="currentColor" opacity="0.5" />
            <circle cx="34" cy="6" r="2" fill="currentColor" opacity="0.35" />
        </svg>
    );
}

function DoodleZigzag({ className = '' }: { className?: string }) {
    return (
        <svg className={className} width="44" height="16" viewBox="0 0 44 16" fill="none" aria-hidden="true">
            <path
                d="M2 12L9 4L16 12L23 4L30 12L37 4L42 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function WashiTape({
    className = '',
    tone = 'peach',
}: {
    className?: string;
    tone?: 'peach' | 'mint' | 'sky' | 'pink' | 'cream';
}) {
    return <span className={`game-washi-tape game-washi-tape--${tone} ${className}`} aria-hidden="true" />;
}

type HandwrittenTone = 'cream' | 'pink' | 'yellow' | 'mint' | 'sky' | 'peach';
type HandwrittenFont = 'yomogi' | 'caveat' | 'kalam' | 'brush';

function StickyNote({
    className = '',
    children,
    tone = 'yellow',
    font = 'yomogi',
}: {
    className?: string;
    children: ReactNode;
    tone?: HandwrittenTone;
    font?: HandwrittenFont;
}) {
    return (
        <div className={`game-sticky-note game-sticky-note--${tone} ${className}`}>
            <span className="game-sticky-tape" aria-hidden="true" />
            <p className={`game-handwritten game-handwritten--${font}`}>{children}</p>
        </div>
    );
}

function HandNote({
    className = '',
    children,
    font = 'yomogi',
}: {
    className?: string;
    children: ReactNode;
    font?: HandwrittenFont;
}) {
    return <p className={`game-hand-note game-handwritten game-handwritten--${font} ${className}`}>{children}</p>;
}

export function GameCommunity() {
    const rootRef = useRef<HTMLDivElement>(null);
    const heroCardsRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<HTMLElement[]>([]);
    const playStyleRefs = useRef<HTMLElement[]>([]);
    const joinPhotosRef = useRef<HTMLDivElement>(null);

    useGameCommunityAnimations({
        root: rootRef,
        heroCards: heroCardsRef,
        sections: sectionRefs,
        playStyleCards: playStyleRefs,
        joinPhotos: joinPhotosRef,
    });

    const setSectionRef = (index: number) => (el: HTMLElement | null) => {
        if (el) sectionRefs.current[index] = el;
    };

    const setPlayStyleRef = (index: number) => (el: HTMLElement | null) => {
        if (el) playStyleRefs.current[index] = el;
    };

    return (
        <div ref={rootRef} className="game-community animate-fade-in">
            <PageSeo
                title="Game Community | TTI Intelligence"
                description="VALORANT、APEX LEGENDS、Minecraftなどを中心に、メンバー同士で気軽に遊ぶゲーム交流活動を紹介します。"
            />

            {/* Hero */}
            <section className="game-band-hero">
                <div className="game-hero-glow" aria-hidden="true" />
                <div className="game-hero-glow game-hero-glow--secondary" aria-hidden="true" />
                <div className="game-hero-doodles" aria-hidden="true">
                    <DoodleStar className="game-doodle game-doodle--star-1" size={20} />
                    <DoodleStar className="game-doodle game-doodle--star-2" size={14} />
                    <DoodleStar className="game-doodle game-doodle--star-hero-3" size={12} />
                    <DoodleSparkle className="game-doodle game-doodle--sparkle-hero-1" />
                    <DoodleSparkle className="game-doodle game-doodle--sparkle-hero-2" />
                    <DoodleSquiggle className="game-doodle game-doodle--squiggle" />
                    <DoodleCircle className="game-doodle game-doodle--circle-hero" />
                    <DoodleDots className="game-doodle game-doodle--dots-hero" />
                    <DoodleHeart className="game-doodle game-doodle--heart-hero" />
                </div>

                <div className="game-container game-hero-layout">
                    <div className="game-hero-copy">
                        <p className="game-eyebrow game-handwritten game-handwritten--yomogi game-eyebrow--hand">ゲーム交流</p>
                        <h1 className="game-hero-title">Game Community</h1>
                        <p className="game-hero-lead">放課後、オンラインで集まるもう一つの活動場所。</p>
                        <p className="game-hero-body">
                            VALORANT、APEX LEGENDS、Minecraftなどを中心に、メンバー同士で気軽に遊ぶゲーム交流活動です。初心者から経験者まで、空いている時間に集まって楽しめます。
                        </p>
                        <HandNote className="game-hero-side-note" font="yomogi">
                            みんなでワイワイ♪
                        </HandNote>
                    </div>

                    <div className="game-hero-visual">
                        <div className="game-hero-cards-wrap">
                            <StickyNote className="game-hero-sticky" tone="mint" font="kalam">
                                Welcome!
                            </StickyNote>
                            <StickyNote className="game-hero-sticky-alt" tone="peach" font="yomogi">
                                初心者OK！
                            </StickyNote>
                            <div ref={heroCardsRef} className="game-hero-cards">
                                {games.map((game) => (
                                    <article
                                        key={game.id}
                                        className={`game-hero-card game-hero-card--${game.accent} ${game.heroTilt}`}
                                    >
                                        <WashiTape
                                            className="game-hero-card-tape"
                                            tone={
                                                game.id === 'minecraft'
                                                    ? 'mint'
                                                    : game.id === 'apex'
                                                      ? 'peach'
                                                      : 'pink'
                                            }
                                        />
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
            <section ref={setSectionRef(0)} className="game-band-cream game-band--decorated">
                <div className="game-section-doodles" aria-hidden="true">
                    <DoodleStar className="game-doodle game-doodle--about-star-1" size={16} />
                    <DoodleStar className="game-doodle game-doodle--about-star-2" size={12} />
                    <DoodleSquiggle className="game-doodle game-doodle--about-squiggle" />
                    <DoodleDots className="game-doodle game-doodle--about-dots" />
                    <DoodleCircle className="game-doodle game-doodle--about-circle" />
                </div>
                <div className="game-container game-about-layout">
                    <div className="game-about-copy">
                        <div className="game-section-heading">
                            <Gamepad2 className="game-section-icon" aria-hidden="true" />
                            <h2>ゲーム交流とは</h2>
                        </div>
                        <p className="game-body-text">
                            ゲーム交流は、メンバー同士がオンラインで集まり、FPS、バトルロイヤル、サンドボックスゲームなどを通して交流する活動です。勝ちを目指して真剣にプレイする日もあれば、雑談しながら気軽に遊ぶ日もあります。ゲームが得意な人だけでなく、初心者や久しぶりに遊ぶ人も参加しやすい雰囲気を大切にしています。
                        </p>
                        <HandNote className="game-about-side-note" font="caveat">
                            play & hang out
                        </HandNote>
                        <DoodleArrow className="game-about-arrow" />
                    </div>
                    <aside className="game-recommend-card">
                        <WashiTape className="game-recommend-tape" tone="pink" />
                        <StickyNote className="game-recommend-sticky" tone="pink" font="yomogi">
                            ぜひきてね♪
                        </StickyNote>
                        <p className="game-recommend-title game-handwritten game-handwritten--yomogi">こんな人におすすめ！</p>
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
            <section ref={setSectionRef(1)} className="game-band-light game-band--decorated">
                <div className="game-section-doodles" aria-hidden="true">
                    <DoodleSparkle className="game-doodle game-doodle--feat-sparkle-1" />
                    <DoodleSparkle className="game-doodle game-doodle--feat-sparkle-2" />
                    <DoodleZigzag className="game-doodle game-doodle--feat-zigzag" />
                    <DoodleStar className="game-doodle game-doodle--feat-star" size={14} />
                    <DoodleHeart className="game-doodle game-doodle--feat-heart" />
                </div>
                <div className="game-container">
                    <div className="game-section-heading game-section-heading--center">
                        <h2 className="game-handwritten--kalam">Featured Games</h2>
                        <span
                            className="game-heading-underline game-heading-underline--orange game-heading-underline--hand"
                            aria-hidden="true"
                        />
                        <HandNote className="game-featured-note" font="yomogi">
                            いろいろ遊べる！
                        </HandNote>
                    </div>
                    <div className="game-featured-grid">
                        {games.map((game, index) => (
                            <article key={game.id} className={`game-featured-card game-featured-card--${game.accent}`}>
                                <WashiTape
                                    className={`game-featured-tape game-featured-tape--${index}`}
                                    tone={game.id === 'minecraft' ? 'mint' : game.id === 'apex' ? 'peach' : 'pink'}
                                />
                                <span
                                    className={`game-featured-sticker game-featured-sticker--${game.accent} game-handwritten game-handwritten--yomogi`}
                                >
                                    {game.id === 'valorant' && '連携が楽しい！'}
                                    {game.id === 'apex' && 'カジュアル勢多め'}
                                    {game.id === 'minecraft' && 'のんびり派歓迎'}
                                </span>
                                <div className="game-featured-image">
                                    <img src={game.image} alt={game.imageAlt} loading="lazy" />
                                </div>
                                <div className="game-featured-copy">
                                    <h3>{game.name}</h3>
                                    <p>{game.description}</p>
                                    <span className="game-featured-arrow" aria-hidden="true">
                                        <ArrowRight />
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                    <StickyNote className="game-featured-bottom-note" tone="cream" font="caveat">
                        pick your vibe
                    </StickyNote>
                </div>
            </section>

            {/* Play Style */}
            <section ref={setSectionRef(2)} className="game-band-cream game-band--decorated">
                <div className="game-section-doodles" aria-hidden="true">
                    <DoodleCircle className="game-doodle game-doodle--play-circle" />
                    <DoodleDots className="game-doodle game-doodle--play-dots" />
                    <DoodleSquiggle className="game-doodle game-doodle--play-squiggle" />
                    <DoodleStar className="game-doodle game-doodle--play-star" size={15} />
                    <DoodleSparkle className="game-doodle game-doodle--play-sparkle" />
                </div>
                <div className="game-container">
                    <div className="game-section-heading game-section-heading--center">
                        <h2 className="game-handwritten--caveat">Play Style</h2>
                        <HandNote className="game-playstyle-note" font="yomogi">
                            自分のペースでOK
                        </HandNote>
                    </div>
                    <div className="game-play-grid">
                        {playStyles.map((style, index) => {
                            const Icon = style.icon;
                            const handLabel =
                                style.title === 'Casual Play'
                                    ? 'いちばん人気！'
                                    : style.title === 'Voice Chat'
                                      ? '話すの好きな人に'
                                      : style.title === 'Ranked Match'
                                        ? '本気でいく日も'
                                        : 'イベントも！';
                            return (
                                <article
                                    key={style.title}
                                    ref={setPlayStyleRef(index)}
                                    className={`game-play-card game-play-card--${style.tone}`}
                                >
                                    <WashiTape className="game-play-tape" tone={index % 2 === 0 ? 'sky' : 'cream'} />
                                    <span className="game-play-hand-label game-handwritten game-handwritten--yomogi">
                                        {handLabel}
                                    </span>
                                    <div className="game-play-icon">
                                        <Icon aria-hidden="true" />
                                    </div>
                                    <h3>{style.title}</h3>
                                    <p>{style.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Beginners Welcome */}
            <section ref={setSectionRef(3)} className="game-band-light game-band--decorated">
                <div className="game-section-doodles" aria-hidden="true">
                    <DoodleHeart className="game-doodle game-doodle--beginner-heart-1" />
                    <DoodleHeart className="game-doodle game-doodle--beginner-heart-2" />
                    <DoodleStar className="game-doodle game-doodle--beginner-star" size={14} />
                    <DoodleSparkle className="game-doodle game-doodle--beginner-sparkle" />
                    <DoodleZigzag className="game-doodle game-doodle--beginner-zigzag" />
                </div>
                <div className="game-container game-beginner-layout">
                    <div className="game-beginner-copy">
                        <StickyNote className="game-beginner-sticky" tone="yellow" font="yomogi">
                            ひとり参加OK！
                        </StickyNote>
                        <div className="game-section-heading">
                            <Heart className="game-section-icon game-section-icon--heart" aria-hidden="true" />
                            <h2>初心者歓迎</h2>
                        </div>
                        <p className="game-body-text">
                            勝つことだけを目的にするのではなく、一緒に遊ぶ時間を通してメンバー同士が自然に話せる場所を目指しています。初心者、復帰勢、見る専、作業しながらVCだけ参加したい人も歓迎です。大学の授業後や休日に、気軽に集まれるオンラインの交流場所として活動しています。
                        </p>
                        <div className="game-tag-list">
                            {beginnerTags.map((tag) => (
                                <span key={tag} className="game-tag">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="game-beginner-decor" aria-hidden="true">
                        <DoodleStar className="game-doodle game-doodle--star-3" size={18} />
                        <DoodleHeart className="game-doodle game-doodle--heart" />
                        <DoodleCircle className="game-doodle game-doodle--beginner-side-circle" />
                        <HandNote className="game-beginner-decor-note" font="caveat">
                            no pressure :)
                        </HandNote>
                    </div>
                </div>
            </section>

            {/* Activity Style */}
            <section ref={setSectionRef(4)} className="game-band-cream game-band--decorated">
                <div className="game-section-doodles" aria-hidden="true">
                    <DoodleDots className="game-doodle game-doodle--act-dots" />
                    <DoodleSquiggle className="game-doodle game-doodle--act-squiggle" />
                    <DoodleStar className="game-doodle game-doodle--act-star" size={13} />
                    <DoodleCircle className="game-doodle game-doodle--act-circle" />
                    <DoodleSparkle className="game-doodle game-doodle--act-sparkle" />
                </div>
                <div className="game-container">
                    <div className="game-section-heading game-section-heading--center">
                        <h2 className="game-handwritten--brush">Activity Style</h2>
                        <StickyNote className="game-activity-sticky" tone="sky" font="yomogi">
                            授業後に集合！
                        </StickyNote>
                    </div>
                    <div className="game-activity-grid">
                        {activityStyles.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <article key={item.title} className="game-activity-card">
                                    <WashiTape
                                        className="game-activity-tape"
                                        tone={index === 0 ? 'sky' : index === 1 ? 'peach' : 'mint'}
                                    />
                                    <div className="game-activity-icon">
                                        <Icon aria-hidden="true" />
                                    </div>
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                </article>
                            );
                        })}
                    </div>
                    <HandNote className="game-activity-bottom-note" font="kalam">
                        night vibes only
                    </HandNote>
                </div>
            </section>

            {/* Join */}
            <section ref={setSectionRef(5)} className="game-band-dark">
                <div className="game-join-doodles" aria-hidden="true">
                    <DoodleStar className="game-doodle game-doodle--join-star-1" size={16} />
                    <DoodleStar className="game-doodle game-doodle--join-star-2" size={12} />
                    <DoodleSparkle className="game-doodle game-doodle--join-sparkle" />
                    <DoodleSquiggle className="game-doodle game-doodle--join-squiggle" />
                    <DoodleDots className="game-doodle game-doodle--join-dots" />
                    <DoodleHeart className="game-doodle game-doodle--join-heart" />
                </div>
                <div className="game-container game-join-layout">
                    <div ref={joinPhotosRef} className="game-join-photos" aria-hidden="true">
                        {games.map((game, index) => (
                            <div key={game.id} className={`game-join-photo game-join-photo--${index}`}>
                                <img src={game.image} alt="" />
                                <span className="game-join-tape" />
                            </div>
                        ))}
                        <StickyNote className="game-join-photo-sticky" tone="yellow" font="yomogi">
                            let&apos;s play!
                        </StickyNote>
                    </div>

                    <div className="game-join-copy">
                        <HandNote className="game-join-hand-title" font="brush">
                            Join the Game Night
                        </HandNote>
                        <h2 className="sr-only">Join the Game Night</h2>
                        <p>
                            初心者でも、1人参加でも大丈夫。まずは気軽に参加して、一緒に遊んでみませんか？
                        </p>
                        <HandNote className="game-join-side-note" font="caveat">
                            see you online!
                        </HandNote>
                        <div className="game-join-actions">
                            <a
                                href={siteConfig.social.discord.url}
                                target="_blank"
                                rel="noreferrer"
                                className="game-btn game-btn--primary"
                            >
                                Discordに参加する
                            </a>
                            <Link to="/contact" className="game-btn game-btn--outline">
                                お問い合わせ
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="game-disclaimer">
                    このページは豊田工業大学の学生サークル「TTI Intelligence」の活動紹介であり、各ゲームの公式サイトではありません。VALORANT、APEX LEGENDS、Minecraft
                    の名称・画像・商標等は、それぞれの権利者に帰属します。
                </p>
            </section>
        </div>
    );
}
