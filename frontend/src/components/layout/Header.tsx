import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from './ThemeToggle';
import { DesktopSiteNav, MobileSiteNav } from './SiteNavItems';

export function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isMobileMenuOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileMenuOpen]);

    return (
        <header
            className={`site-header sticky top-0 z-40 w-full ${
                isMobileMenuOpen ? 'site-header--mobile-open' : ''
            }`}
        >
            <div
                className={`absolute inset-0 ${
                    isMobileMenuOpen ? 'site-header-mobile-bg' : 'glass'
                }`}
            />

            <nav className="site-header-nav relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative flex items-center gap-3 h-11 shrink-0">
                    <Link
                        to="/"
                        className="flex items-center gap-2 group shrink-0"
                        aria-label={`${siteConfig.name} ホーム`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/75 ring-1 ring-black/10 shadow-sm dark:bg-white dark:ring-white/20">
                            <img
                                src="/load-assets/tti-crest.png"
                                alt=""
                                className="h-6 w-6 object-contain transition-opacity duration-300 group-hover:opacity-80"
                            />
                        </span>
                        <span className="hidden 2xl:inline whitespace-nowrap text-sm font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {siteConfig.shortName}
                        </span>
                    </Link>

                    <div className="hidden md:flex flex-1 items-center justify-center min-w-0">
                        <div className="flex items-center gap-0">
                            <DesktopSiteNav
                                linkClassName={(isActive) => `
                  px-2 py-1 apple-nav whitespace-nowrap
                  transition-all duration-300
                  ${isActive
                                        ? 'text-[#1D1D1F] dark:text-[#F5F5F7] font-medium'
                                        : 'text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                                    }
                `}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
                        <ThemeToggle />

                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="site-header-menu-btn md:hidden p-2 rounded-full transition-colors duration-200 text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] hover:bg-[#F5F5F7] dark:hover:bg-[var(--surface-2)]"
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="site-mobile-nav"
                            aria-label={isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                {isMobileMenuOpen && (
                    <div
                        id="site-mobile-nav"
                        className="site-header-mobile-panel md:hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label="サイトメニュー"
                    >
                        <div className="site-header-mobile-links">
                            <MobileSiteNav
                                onNavigate={() => setIsMobileMenuOpen(false)}
                                linkClassName={(isActive) =>
                                    `site-header-mobile-link ${isActive ? 'site-header-mobile-link--active' : ''}`
                                }
                            />
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
