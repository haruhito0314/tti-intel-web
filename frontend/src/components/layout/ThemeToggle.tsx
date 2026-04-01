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
        text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]
        hover:bg-[#0071E3]/10 dark:hover:bg-[var(--surface-3)]
        hover:text-[#0066CC] dark:hover:text-[var(--link)]
        transition-all duration-200
      "
            aria-label={`テーマを切り替え (現在: ${themes[currentIndex].label})`}
            title={themes[currentIndex].label}
        >
            <CurrentIcon className="w-5 h-5" />
        </button>
    );
}
