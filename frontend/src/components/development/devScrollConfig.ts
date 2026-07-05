/** Contiguous chapter spans — sum ≈ 1, no gap dead zones */
const CHAPTER_SPANS = [0.13, 0.415, 0.09, 0.07, 0.075, 0.095, 0.12] as const;

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

export const DEV_TRACK_HEIGHT_VH = 1720;
export const DEV_TRACK_HEIGHT_MOBILE_VH = 1480;

/** Short crossfade at chapter edges — sole opacity transition */
export const CHAPTER_BOUNDARY_FADE = 0.006;

/** Within a chapter: enter finishes by this local, then hold until chapter end */
export const CHAPTER_ENTER_END = 0.72;

/** Sections 3, 4 — finish enters earlier → more scroll dwell after full reveal */
export const CHAPTER_ENTER_END_HOLD = 0.58;

/** Section 6 — slower arrows need a later enter cap, then hold */
export const CHAPTER_ENTER_END_WORKFLOW = 0.7;

/** Final CTA chapter — finish enter early, long scroll hold */
export const CHAPTER_ENTER_END_FINALE = 0.34;

const EXTENDED_HOLD_CHAPTERS = new Set([2, 3, 5]);

export function getChapterEnterEnd(chapterIndex: number): number {
    if (chapterIndex === 6) return CHAPTER_ENTER_END_FINALE;
    if (chapterIndex === 5) return CHAPTER_ENTER_END_WORKFLOW;
    if (EXTENDED_HOLD_CHAPTERS.has(chapterIndex)) return CHAPTER_ENTER_END_HOLD;
    return CHAPTER_ENTER_END;
}
