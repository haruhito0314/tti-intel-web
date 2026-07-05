import { getChapterOpacity } from './devScrollMath';

const COPY_BLOCKS = [
    {
        title: (
            <>
                つくる力は、AIで<span className="dev-gradient-text">加速する</span>。
            </>
        ),
        subtitle: 'TTI Intelligenceの開発は、最新のAIコーディングツールとの対話から始まります。',
        headingLevel: 'h1' as const,
        large: true,
    },
    {
        title: 'モダンな技術スタック。',
        subtitle: 'Webからネイティブアプリまで、プロジェクトに合わせて選んでいます。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: (
            <>
                <span className="dev-gradient-text">MCP</span>で、AIの手が届く範囲を広げる。
            </>
        ),
        subtitle:
            'MCP（Model Context Protocol）は、AIとツールをつなぐ共通規格。コードの編集からブラウザ操作まで、AIが開発環境そのものを扱えるようにしています。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: 'このページも、私たちの作品です。',
        subtitle:
            'いまスクロールしてきたこの体験も、サークルメンバーがAIとともに設計・実装したもの。次は、あなたのアイデアを形にしませんか。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: 'AI・開発ツール。',
        subtitle: '開発の相棒として、日々使っているツールです。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: (
            <>
                AIと開発する、私たちの<span className="dev-gradient-text">進め方</span>。
            </>
        ),
        subtitle: '「AIに全部任せる」のではなく、判断と設計は人間が握る。それが私たちのスタイルです。',
        headingLevel: 'h2' as const,
        large: false,
    },
    {
        title: '次は、あなたの番。',
        subtitle: '未経験でも大丈夫。1から全部サポートします。まずは気軽に覗いてみてください。',
        headingLevel: 'h2' as const,
        large: false,
    },
];

type DevHeroCopyProps =
    | { progress: number; blockIndex?: never }
    | { progress?: never; blockIndex: number };

export function DevHeroCopy(props: DevHeroCopyProps) {
    if (props.blockIndex !== undefined) {
        const block = COPY_BLOCKS[props.blockIndex];
        if (!block) return null;
        const Heading = block.headingLevel;
        return (
            <div
                className={`dev-hero-copy-block dev-hero-copy-block--static${
                    props.blockIndex === 0 ? ' dev-hero-copy-block--intro' : ''
                }${props.blockIndex === 2 ? ' dev-hero-copy-block--mcp' : ''}`}
            >
                <Heading className={`dev-hero-title ${block.large ? '' : 'dev-hero-title--sm'}`}>
                    {block.title}
                </Heading>
                <p className="dev-hero-subtitle">{block.subtitle}</p>
            </div>
        );
    }

    const { progress } = props;

    return (
        <div className="dev-hero-copy-stage" aria-live="polite">
            {COPY_BLOCKS.map((block, index) => {
                const opacity = getChapterOpacity(progress, index);
                const isActive = opacity > 0.5;
                const Heading = block.headingLevel;

                return (
                    <div
                        key={index}
                        className={`dev-hero-copy-block${index === 0 ? ' dev-hero-copy-block--intro' : ''}${
                            index === 2 ? ' dev-hero-copy-block--mcp' : ''
                        }`}
                        style={{
                            opacity,
                            visibility: opacity > 0.04 ? 'visible' : 'hidden',
                            pointerEvents: isActive ? 'auto' : 'none',
                        }}
                        aria-hidden={!isActive}
                    >
                        <Heading className={`dev-hero-title ${block.large ? '' : 'dev-hero-title--sm'}`}>
                            {block.title}
                        </Heading>
                        <p className="dev-hero-subtitle">{block.subtitle}</p>
                    </div>
                );
            })}
        </div>
    );
}
