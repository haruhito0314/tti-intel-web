export const ECOSYSTEM_INITIAL_COVERAGE = 5 / 6;
export const ECOSYSTEM_MAX_SCALE = 1 / ECOSYSTEM_INITIAL_COVERAGE;

export function ecosystemWindowScale(expand: number) {
    const progress = Math.min(1, Math.max(0, expand));
    return 1 + progress * (ECOSYSTEM_MAX_SCALE - 1);
}

export function ecosystemSurfaceHasFrame(sceneIndex: number) {
    return sceneIndex >= 0;
}

export function shouldShowCodexStory(contentReady: boolean, progress: number) {
    return contentReady && progress < 0.84;
}

export function demoCursorTarget(time: number) {
    if (time < 1_700) return 'origin';
    // Approach the Codex icon shortly before the click — don't hover for seconds.
    if (time < 4_800) return 'codex-window';
    if (time < 6_650) return 'input';
    if (time < 7_500) return 'send';
    // Hide while the agent works so the cursor doesn't idle on the pane.
    if (time < 10_200) return null;
    if (time < 12_150) return 'input';
    if (time < 12_950) return 'send';
    if (time < 14_600) return null;
    if (time < 15_700) return 'runtime';
    return null;
}

/** Click the Codex icon, then open the window. */
export const CODEX_LAUNCH_CLICK_MS = 2_480;
export const CODEX_LAUNCH_OPEN_MS = 2_660;
