import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 w-full">
            {/* Glass background */}
            <div className="absolute inset-0 glass" />

            <nav className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative flex items-center justify-between h-11">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center gap-2 group md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2"
                        aria-label={`${siteConfig.name} ホーム`}
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/75 ring-1 ring-black/10 shadow-sm dark:bg-white dark:ring-white/20">
                            <img
                                src="/load-assets/tti-crest.png"
                                alt=""
                                className="h-6 w-6 object-contain transition-opacity duration-300 group-hover:opacity-80"
                            />
                        </span>
                        <span className="hidden sm:inline lg:hidden xl:inline whitespace-nowrap text-sm font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {siteConfig.name}
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-0 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                        {siteConfig.navigation.map((link) => (
                            <NavLink
                                key={link.href}
                                to={link.href}
                                className={({ isActive }) => `
                  px-3 py-1 apple-nav whitespace-nowrap
                  transition-all duration-300
                  ${isActive
                                        ? 'text-[#1D1D1F] dark:text-[#F5F5F7] font-medium'
                                        : 'text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                                    }
                `}
                            >
                                {link.name}
                            </NavLink>
                        ))}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
                        <ThemeToggle />

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="
                md:hidden p-2 rounded-full
                text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]
                hover:bg-[#F5F5F7] dark:hover:bg-[var(--surface-2)]
                transition-colors duration-200
              "
                            aria-label="メニューを開く"
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMobileMenuOpen && (
                    <div className="md:hidden py-4 animate-fade-in">
                        <div className="flex flex-col gap-1">
                            {siteConfig.navigation.map((link) => (
                                <NavLink
                                    key={link.href}
                                    to={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) => `
                    px-4 py-3 rounded-xl text-[15px]
                    transition-all duration-200
                    ${isActive
                                            ? 'bg-[#F5F5F7] dark:bg-[var(--surface-2)] text-[#1D1D1F] dark:text-[#F5F5F7] font-medium'
                                            : 'text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] hover:bg-[#F5F5F7] dark:hover:bg-[var(--surface-2)]'
                                        }
                  `}
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
