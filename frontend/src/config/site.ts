/**
 * Site configuration
 * Central place for all site-wide settings
 * Future: Can be migrated to DynamoDB SiteSettings table
 */

export type SiteNavChild = {
    name: string;
    href: string;
};

export type SiteNavItem = {
    name: string;
    href: string;
    children?: readonly SiteNavChild[];
};

export const siteConfig = {
    name: 'TTI Intelligence',
    shortName: 'TTI Intelligence',
    description: 'TTI Intelligenceは、最新のAI技術を共に学び、実践的な開発を通じてアイデアを形にする学生コミュニティです。',
    url: 'https://tti-intel.com',

    // Navigation links
    navigation: [
        { name: 'ホーム', href: '/' },
        { name: 'サークルについて', href: '/about' },
        {
            name: '活動',
            href: '/weekly-math',
            children: [
                { name: '今週の数学', href: '/weekly-math' },
                { name: 'アプリ', href: '/app' },
                { name: 'ゲームコミュニティ', href: '/game-community' },
                { name: '開発について', href: '/development' },
            ],
        },
        { name: 'お知らせ', href: '/news' },
        { name: '掲示板', href: '/board' },
        { name: 'お問い合わせ', href: '/contact' },
    ] satisfies readonly SiteNavItem[],

    // Social links (can be updated without code changes in future)
    social: {
        discord: {
            url: 'https://discord.gg/DFWs8GrHxF',
            label: 'Discord',
        },
        instagram: {
            url: 'https://instagram.com/haruhito_314',
            label: 'Instagram',
        },
        github: {
            url: 'https://github.com/haruhito0314',
            label: 'GitHub',
        },
        youtube: {
            url: 'https://www.youtube.com/@ttiintelligence',
            label: 'YouTube',
        },
    },

    // Contact email (for display purposes)
    contactEmail: 'tti.intel@gmail.com',

    // Footer links
    footerLinks: {
        menu: [
            { name: 'ホーム', href: '/' },
            { name: 'サークルについて', href: '/about' },
            { name: '今週の数学', href: '/weekly-math' },
            { name: 'アプリ', href: '/app' },
            { name: 'ゲームコミュニティ', href: '/game-community' },
            { name: '開発について', href: '/development' },
            { name: 'お知らせ', href: '/news' },
            { name: '掲示板', href: '/board' },
            { name: 'お問い合わせ', href: '/contact' },
        ] satisfies readonly SiteNavChild[],
    },
} as const;

export type SiteConfig = typeof siteConfig;
