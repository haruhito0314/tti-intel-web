import { useState } from 'react';
import { Card, CardContent } from '@/components/ui';
import { isMobileSplashDisabled, setMobileSplashDisabled } from '@/lib/splashSettings';

export function Settings() {
    const [isSplashDisabled, setIsSplashDisabled] = useState(() => isMobileSplashDisabled());

    const handleToggleSplash = () => {
        const nextValue = !isSplashDisabled;
        setIsSplashDisabled(nextValue);
        setMobileSplashDisabled(nextValue);
    };

    return (
        <div className="animate-fade-in">
            <section className="about-band-hero relative overflow-hidden">
                <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">Settings</h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] max-w-2xl mx-auto">
                            表示や体験に関する設定を変更できます。
                        </p>
                    </div>
                </div>
            </section>

            <section className="about-band-white">
                <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
                    <Card variant="elevated">
                        <CardContent className="p-6 sm:p-8">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <h2 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                                        モバイル起動時のロード画面
                                    </h2>
                                    <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">
                                        スマホでサイトを開いたときに表示されるロゴのロード画面をオフにできます。
                                    </p>
                                    <p className="apple-footnote text-[#86868B] dark:text-[rgba(235,235,245,0.3)] mt-2">
                                        変更は次回アクセス時から反映されます。
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleSplash}
                                    aria-pressed={isSplashDisabled}
                                    className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ${
                                        isSplashDisabled
                                            ? 'bg-[#34C759] border-[#34C759]'
                                            : 'bg-[#D2D2D7] dark:bg-[var(--surface-3)] border-[#C6C6CC] dark:border-[var(--border)]'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200 mt-[3px] ${
                                            isSplashDisabled ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}
