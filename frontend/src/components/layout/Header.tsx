import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Sparkles, Menu, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 w-full">
            {/* Glass background */}
            <div className="absolute inset-0 glass" />

            <nav className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-11">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center group"
                    >
                        <Sparkles className="
              w-6 h-6
              text-[#0071E3] dark:text-[#2997FF]
              group-hover:scale-110
              transition-transform duration-300
            " />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-0">
                        {siteConfig.navigation.map((link) => (
                            <NavLink
                                key={link.href}
                                to={link.href}
                                className={({ isActive }) => `
                  px-3 py-1 apple-nav
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
                    <div className="flex items-center gap-2">
                        <ThemeToggle />

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="
                md:hidden p-2 rounded-full
                text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]
                hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E]
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
                                            ? 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] font-medium'
                                            : 'text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E]'
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
