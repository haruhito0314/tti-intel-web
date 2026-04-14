const MOBILE_SPLASH_DISABLED_STORAGE_KEY = 'tti-mobile-splash-disabled';

function canUseLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function isMobileSplashDisabled(): boolean {
    if (!canUseLocalStorage()) return false;
    try {
        return window.localStorage.getItem(MOBILE_SPLASH_DISABLED_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function setMobileSplashDisabled(disabled: boolean): void {
    if (!canUseLocalStorage()) return;
    try {
        if (disabled) {
            window.localStorage.setItem(MOBILE_SPLASH_DISABLED_STORAGE_KEY, 'true');
            return;
        }
        window.localStorage.removeItem(MOBILE_SPLASH_DISABLED_STORAGE_KEY);
    } catch {
        // Ignore storage write failures (private mode, quota, etc.)
    }
}
