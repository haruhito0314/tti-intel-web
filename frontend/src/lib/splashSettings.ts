const MOBILE_SPLASH_DISABLED_STORAGE_KEY = 'tti-mobile-splash-disabled';
const INITIAL_SPLASH_SEEN_SESSION_STORAGE_KEY = 'tti-initial-splash-seen';

function canUseLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function canUseSessionStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
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

export function hasSeenInitialSplashThisSession(): boolean {
    if (!canUseSessionStorage()) return false;
    try {
        return window.sessionStorage.getItem(INITIAL_SPLASH_SEEN_SESSION_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function markInitialSplashSeenThisSession(): void {
    if (!canUseSessionStorage()) return;
    try {
        window.sessionStorage.setItem(INITIAL_SPLASH_SEEN_SESSION_STORAGE_KEY, 'true');
    } catch {
        // Ignore storage write failures (private mode, quota, etc.)
    }
}
