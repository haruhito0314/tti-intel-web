/** Contiguous chapter spans — sum = 1, no gap dead zones */
const CHAPTER_SPANS = [0.15, 0.2, 0.13, 0.12, 0.13, 0.15, 0.12] as const;

function buildRanges(): readonly (readonly [number, number])[] {
    const ranges: [number, number][] = [];
    let cursor = 0;
    for (const span of CHAPTER_SPANS) {
        ranges.push([cursor, cursor + span]);
        cursor += span;
    }
    return ranges;
}

export const SCENE_RANGES = buildRanges();

/**
 * Track height for the scroll-driven showcase.
 * Long enough for staggered enters to read, short enough to avoid dead holds.
 */
export const DEV_TRACK_HEIGHT_VH = 1160;
export const DEV_TRACK_HEIGHT_MOBILE_VH = 1080;

/** Short crossfade at chapter edges — sole opacity transition */
export const CHAPTER_BOUNDARY_FADE = 0.007;

/** Within a chapter: enter finishes by this local, then hold until chapter end */
export const CHAPTER_ENTER_END = 0.84;

/** Sections 3, 4, 6 — finish enters a bit earlier, ambient motion carries the hold */
export const CHAPTER_ENTER_END_HOLD = 0.74;

/** Section 6 — arrows need a later enter cap, then hold */
export const CHAPTER_ENTER_END_WORKFLOW = 0.82;

/** Final CTA chapter — settle early, then hold with ambient motion */
export const CHAPTER_ENTER_END_FINALE = 0.42;

const EXTENDED_HOLD_CHAPTERS = new Set([2, 3, 5]);

export function getChapterEnterEnd(chapterIndex: number): number {
    if (chapterIndex === 6) return CHAPTER_ENTER_END_FINALE;
    if (chapterIndex === 5) return CHAPTER_ENTER_END_WORKFLOW;
    if (EXTENDED_HOLD_CHAPTERS.has(chapterIndex)) return CHAPTER_ENTER_END_HOLD;
    return CHAPTER_ENTER_END;
}
