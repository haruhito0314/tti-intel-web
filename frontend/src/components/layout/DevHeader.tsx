import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from './ThemeToggle';

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
            <div
                className={`absolute inset-0 ${
                    isMobileMenuOpen ? 'dev-header-mobile-bg' : 'dev-header-bar-bg'
                }`}
            />

            <nav className="dev-header-nav relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative flex items-center justify-between h-11 shrink-0">
                    <Link
                        to="/"
                        className="flex items-center gap-2 group md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2"
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
                        <span className="dev-header-logo hidden sm:inline lg:hidden xl:inline whitespace-nowrap">
                            {siteConfig.name}
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-0 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                        {siteConfig.navigation.map((link) => (
                            <NavLink
                                key={link.href}
                                to={link.href}
                                className={({ isActive }) =>
                                    `dev-header-link apple-nav whitespace-nowrap px-3 py-1 transition-all duration-300 ${
                                        isActive ? 'dev-header-link--active' : ''
                                    }`
                                }
                            >
                                {link.name}
                            </NavLink>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
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
                            {siteConfig.navigation.map((link) => (
                                <NavLink
                                    key={link.href}
                                    to={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `dev-header-mobile-link ${
                                            isActive ? 'dev-header-mobile-link--active' : ''
                                        }`
                                    }
                                >
                                    {link.name}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
