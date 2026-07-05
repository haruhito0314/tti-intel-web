import { CHAPTER_BOUNDARY_FADE, SCENE_RANGES } from './devScrollConfig';
import { clamp01, exit, getChapterLocal, getChapterOpacity } from './devScrollMath';
import {
    STACK_GRID_CHAPTER_INDICES,
    stackGridColumns,
    stackGridShellFadeStart,
} from './devSceneMotion';
import {
    isStack2CircleChapter,
    isStack2MobileGridChapter,
    STACK2_EXIT_COMPLETE_LOCAL,
    stack2AnimLocal,
    stack2CopyFadeEnd,
    stack2CopyFadeStart,
    stack2ShellFadeEndLocal,
} from './devStackCircleMotion';
import { stack2MobileExitCompleteLocal, stack2MobileShellFadeEndLocal } from './devStack2MobileMotion';

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
    if (!usesStackGridShell(chapterIndex, mobileLayout) && !isStack2CircleChapter(chapterIndex, mobileLayout)) {
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

    if (isStack2CircleChapter(chapterIndex, mobileLayout)) {
        if (local >= STACK2_EXIT_COMPLETE_LOCAL) {
            return exit(local, STACK2_EXIT_COMPLETE_LOCAL, stack2ShellFadeEndLocal());
        }
        return 1;
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

/** Chapter 2 copy — fades out after the row is complete, then stays hidden (desktop circle only) */
export function getStack2CopyOpacity(
    progress: number,
    chapterIndex: number,
    cardCount: number,
    mobileLayout = false,
): number {
    if (mobileLayout) {
        return getStackChapterOpacity(progress, chapterIndex, cardCount, mobileLayout);
    }

    const [start, end] = SCENE_RANGES[chapterIndex];
    const fade = CHAPTER_BOUNDARY_FADE;
    const local = getChapterLocal(progress, chapterIndex);

    if (progress < start) return 0;
    if (progress >= end) return 0;

    if (chapterIndex > 0 && progress < start + fade) {
        return clamp01((progress - start) / fade);
    }

    const fadeOutStart = stack2CopyFadeStart();
    const fadeOutEnd = stack2CopyFadeEnd();
    const motionLocal = stack2AnimLocal(local);
    if (motionLocal >= fadeOutEnd) return 0;
    if (motionLocal >= fadeOutStart) {
        return exit(motionLocal, fadeOutStart, fadeOutEnd);
    }

    return 1;
}
