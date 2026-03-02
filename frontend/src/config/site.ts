/**
 * Site configuration
 * Central place for all site-wide settings
 * Future: Can be migrated to DynamoDB SiteSettings table
 */

export const siteConfig = {
    name: 'TTI Intelligence',
    shortName: 'TTI Intelligence',
    description: 'TTI Intelligenceは、最新のAI技術を共に学び、実践的な開発を通じてアイデアを形にする学生コミュニティです。',
    url: 'https://ai.toyota-ti.ac.jp', // Replace with actual URL

    // Navigation links
    navigation: [
        { name: 'ホーム', href: '/' },
        { name: 'About', href: '/about' },
        { name: 'News', href: '/news' },
        { name: 'App', href: '/app' },
        { name: '掲示板', href: '/board' },
        { name: 'お問い合わせ', href: '/contact' },
    ],

    // Social links (can be updated without code changes in future)
    social: {
        discord: {
            url: 'https://discord.gg/9WFFPdWD',
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
    },

    // Contact email (for display purposes)
    contactEmail: 'tti.intel@gmail.com',

    // Footer links
    footerLinks: {
        menu: [
            { name: 'ホーム', href: '/' },
            { name: 'About', href: '/about' },
            { name: 'News', href: '/news' },
            { name: 'App', href: '/app' },
            { name: '掲示板', href: '/board' },
            { name: 'お問い合わせ', href: '/contact' },
        ],
        legal: [
            { name: 'プライバシーポリシー', href: '/privacy' },
            { name: '利用規約', href: '/terms' },
        ],
    },
} as const;

export type SiteConfig = typeof siteConfig;
