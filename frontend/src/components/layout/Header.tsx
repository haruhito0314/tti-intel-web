import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Sparkles } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 w-full">
            {/* Glass background */}
            <div className="absolute inset-0 glass" />

            <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-12">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center group"
                    >
                        <Sparkles className="
              w-7 h-7
              text-primary-500
              group-hover:scale-110
              transition-transform duration-300
              animate-float
            " />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {siteConfig.navigation.map((link) => (
                            <NavLink
                                key={link.href}
                                to={link.href}
                                className={({ isActive }) => `
                  px-3 py-1.5 rounded-lg text-[13px] font-medium
                  transition-all duration-300
                  ${isActive
                                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                                        : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                                    }
                `}
                            >
                                {link.name}
                            </NavLink>
                        ))}
                    </div>

                    {/* Right side - Theme toggle & Mobile menu */}
                    <div className="flex items-center gap-2">
                        <ThemeToggle />

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="
                md:hidden p-2 rounded-xl
                text-text-secondary-light dark:text-text-secondary-dark
                hover:bg-primary-100 dark:hover:bg-primary-900/50
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
                    px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive
                                            ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                                            : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-50 dark:hover:bg-primary-900/30'
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
