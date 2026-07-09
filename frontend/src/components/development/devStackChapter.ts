import { CHAPTER_BOUNDARY_FADE, SCENE_RANGES } from './devScrollConfig';
import { clamp01, exit, getChapterLocal, getChapterOpacity } from './devScrollMath';
import {
    STACK_GRID_CHAPTER_INDICES,
    stackGridColumns,
    stackGridShellFadeStart,
} from './devSceneMotion';
import {
    isStack2MobileGridChapter,
    stack2MobileExitCompleteLocal,
    stack2MobileShellFadeEndLocal,
} from './devStack2MobileMotion';

function usesStackGridShell(chapterIndex: number, mobileLayout: boolean): boolean {
    if (STACK_GRID_CHAPTER_INDICES.has(chapterIndex)) return true;
    return isStack2MobileGridChapter(chapterIndex, mobileLayout);
}

/** Opacity for stack-grid chapters — cards exit before shell / copy crossfade */
export function getStackChapterOpacity(
    progress: number,
    chapterIndex: number,
    cardCount: number,
    mobileLayout = false,
): number {
    if (!usesStackGridShell(chapterIndex, mobileLayout)) {
        return getChapterOpacity(progress, chapterIndex);
    }

    const [start, end] = SCENE_RANGES[chapterIndex];
    const isLast = chapterIndex === SCENE_RANGES.length - 1;
    const fade = CHAPTER_BOUNDARY_FADE;
    const local = getChapterLocal(progress, chapterIndex);

    if (progress < start) return 0;

    if (!isLast && progress >= end) return 0;

    if (chapterIndex > 0 && progress < start + fade) {
        return clamp01((progress - start) / fade);
    }

    if (isStack2MobileGridChapter(chapterIndex, mobileLayout)) {
        const exitCompleteLocal = stack2MobileExitCompleteLocal(cardCount);
        if (local >= exitCompleteLocal) {
            return exit(local, exitCompleteLocal, stack2MobileShellFadeEndLocal(cardCount));
        }
        return 1;
    }

    const columns = stackGridColumns(mobileLayout);
    const shellFadeStart = stackGridShellFadeStart(cardCount, columns);
    if (local >= shellFadeStart) {
        return exit(local, shellFadeStart, 1);
    }

    return 1;
}
