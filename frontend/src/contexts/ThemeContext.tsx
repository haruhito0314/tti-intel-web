import { useEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './themeContextCore';

const STORAGE_KEY = 'tti-ai-theme';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }
    return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
        const stored = getStoredTheme();
        return stored === 'system' ? getSystemTheme() : stored;
    });

    // Update resolved theme when theme changes or system preference changes
    useEffect(() => {
        const updateResolvedTheme = () => {
            const resolved = theme === 'system' ? getSystemTheme() : theme;
            setResolvedTheme(resolved);

            // Update document class
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(resolved);
        };

        updateResolvedTheme();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                updateResolvedTheme();
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
