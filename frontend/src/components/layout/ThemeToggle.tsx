import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const themes = [
        { value: 'light', icon: Sun, label: 'ライトモード' },
        { value: 'dark', icon: Moon, label: 'ダークモード' },
        { value: 'system', icon: Monitor, label: 'システム設定' },
    ] as const;

    const currentIndex = themes.findIndex((t) => t.value === theme);

    const cycleTheme = () => {
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex].value);
    };

    const CurrentIcon = themes[currentIndex].icon;

    return (
        <button
            onClick={cycleTheme}
            className="
        p-2 rounded-xl
        text-text-secondary-light dark:text-text-secondary-dark
        hover:bg-primary-100 dark:hover:bg-primary-900/50
        hover:text-primary-600 dark:hover:text-primary-400
        transition-all duration-200
      "
            aria-label={`テーマを切り替え (現在: ${themes[currentIndex].label})`}
            title={themes[currentIndex].label}
        >
            <CurrentIcon className="w-5 h-5" />
        </button>
    );
}
