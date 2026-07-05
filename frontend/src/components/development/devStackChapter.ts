import { CHAPTER_BOUNDARY_FADE, SCENE_RANGES } from './devScrollConfig';
import { clamp01, exit, getChapterLocal, getChapterOpacity } from './devScrollMath';
import {
    STACK_GRID_CHAPTER_INDICES,
    stackGridShellFadeStart,
} from './devSceneMotion';
import { isStack2CircleChapter, stack2ShellFadeStart } from './devStackCircleMotion';

/** Opacity for stack-grid chapters — cards exit before shell / copy crossfade */
export function getStackChapterOpacity(
    progress: number,
    chapterIndex: number,
    cardCount: number,
): number {
    if (!STACK_GRID_CHAPTER_INDICES.has(chapterIndex) && !isStack2CircleChapter(chapterIndex)) {
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

    const shellFadeStart = isStack2CircleChapter(chapterIndex)
        ? stack2ShellFadeStart()
        : stackGridShellFadeStart(cardCount);
    if (local >= shellFadeStart) {
        return exit(local, shellFadeStart, 1);
    }

    return 1;
}
