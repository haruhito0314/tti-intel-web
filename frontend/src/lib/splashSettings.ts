const MOBILE_SPLASH_DISABLED_STORAGE_KEY = 'tti-mobile-splash-disabled';
const INITIAL_SPLASH_SEEN_STORAGE_KEY = 'tti-initial-splash-seen';

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

export function shouldShowInitialSplash(): boolean {
    if (typeof window === 'undefined') return false;
    if (isMobileSplashDisabled()) return false;
    return !hasSeenInitialSplash();
}

export function markInitialSplashSeen(): void {
    if (!canUseLocalStorage()) return;
    try {
        window.localStorage.setItem(INITIAL_SPLASH_SEEN_STORAGE_KEY, 'true');
    } catch {
        // Ignore storage write failures (private mode, quota, etc.)
    }
}

function hasSeenInitialSplash(): boolean {
    if (!canUseLocalStorage()) return false;
    try {
        return window.localStorage.getItem(INITIAL_SPLASH_SEEN_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}
