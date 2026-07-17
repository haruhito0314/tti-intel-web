import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from './ThemeToggle';
import { DesktopSiteNav, MobileSiteNav } from './SiteNavItems';

export function DevHeader() {
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
            className={`dev-header sticky top-0 z-50 w-full ${
                isMobileMenuOpen ? 'dev-header--mobile-open' : ''
            }`}
        >
            {isMobileMenuOpen && <div className="absolute inset-0 dev-header-mobile-bg" />}

            <nav className="dev-header-nav relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative flex items-center gap-3 h-11 shrink-0">
                    <Link
                        to="/"
                        className="flex items-center gap-2 group shrink-0"
                        aria-label={`${siteConfig.name} ホーム`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span className="dev-header-logo-mark">
                            <img
                                src="/load-assets/tti-crest.png"
                                alt=""
                                className="h-6 w-6 object-contain transition-opacity duration-300 group-hover:opacity-80"
                            />
                        </span>
                        <span className="dev-header-logo hidden 2xl:inline whitespace-nowrap">
                            {siteConfig.shortName}
                        </span>
                    </Link>

                    <div className="hidden md:flex flex-1 items-center justify-center min-w-0">
                        <div className="flex items-center gap-0">
                            <DesktopSiteNav
                                linkClassName={(isActive) =>
                                    `dev-header-link apple-nav whitespace-nowrap px-2 py-1 transition-all duration-300 ${
                                        isActive ? 'dev-header-link--active' : ''
                                    }`
                                }
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
                        <ThemeToggle overlay />

                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="dev-header-menu-btn md:hidden p-2 rounded-full transition-colors duration-200"
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="dev-mobile-nav"
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
                        id="dev-mobile-nav"
                        className="dev-header-mobile-panel md:hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label="サイトメニュー"
                    >
                        <div className="dev-header-mobile-links">
                            <MobileSiteNav
                                onNavigate={() => setIsMobileMenuOpen(false)}
                                linkClassName={(isActive) =>
                                    `dev-header-mobile-link ${
                                        isActive ? 'dev-header-mobile-link--active' : ''
                                    }`
                                }
                            />
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
