import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';
import { siteConfig } from '@/config/site';

// Social media icons as inline SVGs
function DiscordIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
        </svg>
    );
}

function InstagramIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
    );
}

function GitHubIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
    );
}

function YouTubeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a2.998 2.998 0 00-2.11-2.121C19.516 3.5 12 3.5 12 3.5s-7.516 0-9.388.565A2.998 2.998 0 00.502 6.186 31.31 31.31 0 000 12a31.31 31.31 0 00.502 5.814 2.998 2.998 0 002.11 2.121C4.484 20.5 12 20.5 12 20.5s7.516 0 9.388-.565a2.998 2.998 0 002.11-2.121A31.31 31.31 0 0024 12a31.31 31.31 0 00-.502-5.814zM9.6 15.568V8.432L15.82 12 9.6 15.568z" />
        </svg>
    );
}

const socialIcons = {
    discord: DiscordIcon,
    instagram: InstagramIcon,
    github: GitHubIcon,
    youtube: YouTubeIcon,
};

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-auto bg-[#F5F5F7] dark:bg-[var(--surface-2)] border-t border-[#D2D2D7] dark:border-[var(--border)]">
            <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
                    {/* Brand */}
                    <div>
                        <Link to="/" className="flex items-center gap-2 mb-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/75 ring-1 ring-black/10 shadow-sm dark:bg-white dark:ring-white/20">
                                <img src="/load-assets/tti-crest.png" alt="" className="h-6 w-6 object-contain" />
                            </span>
                            <span className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {siteConfig.name}
                            </span>
                        </Link>
                        <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-md leading-relaxed">
                            {siteConfig.description}
                        </p>
                        <div className="mt-5 max-w-md border-l border-[#D2D2D7] dark:border-white/10 pl-4">
                            <h3 className="apple-footnote font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
                                連絡先情報
                            </h3>
                            <address className="not-italic space-y-3 apple-footnote text-[#424245] dark:text-[rgba(235,235,245,0.68)] leading-relaxed">
                                <div className="flex gap-3">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0071E3] dark:text-[#5CABFF]" aria-hidden="true" />
                                    <p>
                                        <span className="block text-[#6E6E73] dark:text-[rgba(235,235,245,0.45)]">
                                            住所
                                        </span>
                                        〒468-8511 名古屋市天白区久方二丁目12番地1 豊田工業大学
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#0071E3] dark:text-[#5CABFF]" aria-hidden="true" />
                                    <p>
                                        <span className="block text-[#6E6E73] dark:text-[rgba(235,235,245,0.45)]">
                                            Email
                                        </span>
                                        <a
                                            href={`mailto:${siteConfig.contactEmail}`}
                                            className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0066CC] dark:hover:text-[#5CABFF] hover:underline underline-offset-4 transition-colors duration-300"
                                        >
                                            {siteConfig.contactEmail}
                                        </a>
                                    </p>
                                </div>
                            </address>
                        </div>

                        {/* Social Links */}
                        <div className="flex items-center gap-4 mt-5">
                            {Object.entries(siteConfig.social).map(([key, { url, label }]) => {
                                const Icon = socialIcons[key as keyof typeof socialIcons];
                                return (
                                    <a
                                        key={key}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="
                      p-1
                      text-[#86868B] dark:text-[rgba(235,235,245,0.3)]
                      hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]
                      transition-colors duration-300
                    "
                                        aria-label={label}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Menu Links */}
                    <div>
                        <h3 className="apple-footnote font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
                            メニュー
                        </h3>
                        <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                            {siteConfig.footerLinks.menu.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        to={link.href}
                                        className="
                      apple-footnote text-[#424245] dark:text-[rgba(235,235,245,0.6)]
                      hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]
                      hover:underline
                      transition-colors duration-300
                    "
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Admin & Legal */}
                    <div>
                        <h3 className="apple-footnote font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
                            その他
                        </h3>
                        <ul className="space-y-1.5">
                            <li>
                                <Link
                                    to="/admin"
                                    className="
                    apple-footnote text-[#424245] dark:text-[rgba(235,235,245,0.6)]
                    hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]
                    hover:underline
                    transition-colors duration-300
                   "
                                >
                                    管理者ページ
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-10 pt-5 border-t border-[#D2D2D7]/50 dark:border-[var(--border)]/70 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                    <p className="text-center text-[11px] text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">
                        © {currentYear} {siteConfig.name}. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
