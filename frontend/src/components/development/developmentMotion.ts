export const ECOSYSTEM_INITIAL_COVERAGE = 5 / 6;
export const ECOSYSTEM_MAX_SCALE = 1 / ECOSYSTEM_INITIAL_COVERAGE;

export function ecosystemWindowScale(expand: number) {
    const progress = Math.min(1, Math.max(0, expand));
    return 1 + progress * (ECOSYSTEM_MAX_SCALE - 1);
}

export function ecosystemSurfaceHasFrame(sceneIndex: number) {
    return sceneIndex >= -1;
}

export function shouldShowCodexStory(contentReady: boolean, progress: number) {
    return contentReady && progress < 0.84;
}

export const CODEX_CURSOR_DEPART_MS = 500;

export function demoCursorTarget(time: number) {
    if (time < CODEX_CURSOR_DEPART_MS) return 'origin';
    // Approach the Codex icon shortly before the click — don't hover for seconds.
    if (time < 3_200) return 'codex-window';
    if (time < 5_050) return 'input';
    if (time < 5_750) return 'send';
    // Hide while the agent works so the cursor doesn't idle on the pane.
    if (time < 10_200) return null;
    if (time < 12_150) return 'input';
    if (time < 12_950) return 'send';
    if (time < 14_600) return null;
    if (time < 15_700) return 'runtime';
    return null;
}

/** Click the Codex icon, then open the window. */
export const CODEX_LAUNCH_CLICK_MS = 1_900;
export const CODEX_LAUNCH_OPEN_MS = 2_080;
export const CODEX_IMPLEMENTATION_COMPLETE_MS = 9_450;
export const CODEX_SECOND_FILE_READY_MS = 9_650;
export const CODEX_AGENT_FINISHED_MS = 9_850;

export function codexLaunchState(time: number, reducedMotion: boolean) {
    return {
        opening: reducedMotion || time >= CODEX_LAUNCH_OPEN_MS,
        contentVisible: true as const,
    };
}

export function codexWorkState(time: number, reducedMotion: boolean) {
    return {
        planComplete: reducedMotion || time >= CODEX_IMPLEMENTATION_COMPLETE_MS,
        firstFileReady: reducedMotion || time >= CODEX_IMPLEMENTATION_COMPLETE_MS,
        secondFileReady: reducedMotion || time >= CODEX_SECOND_FILE_READY_MS,
        agentFinished: reducedMotion || time >= CODEX_AGENT_FINISHED_MS,
    };
}
