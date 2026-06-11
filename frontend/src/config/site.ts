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
        { name: 'Home', href: '/' },
        { name: 'About Us', href: '/about' },
        { name: 'Weekly Math', href: '/weekly-math' },
        { name: 'News', href: '/news' },
        { name: 'Apps', href: '/app' },
        { name: 'Board', href: '/board' },
        { name: 'Contact', href: '/contact' },
    ],

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
            { name: 'Home', href: '/' },
            { name: 'About Us', href: '/about' },
            { name: 'Weekly Math', href: '/weekly-math' },
            { name: 'News', href: '/news' },
            { name: 'Apps', href: '/app' },
            { name: 'Board', href: '/board' },
            { name: 'Contact', href: '/contact' },
        ],
    },
} as const;

export type SiteConfig = typeof siteConfig;
