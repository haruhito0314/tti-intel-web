import { SCENE_RANGES } from './devScrollConfig';

export const ZOOM_CARD_EXIT_STAGGER = 0.006;
export const ZOOM_CARD_EXIT_DURATION = 0.018;
export const ZOOM_CARD_COUNT = 8;

const CHAPTER4_END = SCENE_RANGES[3][1];

/** Bridge becomes visible under/over the mini-grid */
export const CHAPTER4_ZOOM_BRIDGE_START = CHAPTER4_END - 0.018;
export const CHAPTER4_ZOOM_MOTION_START = CHAPTER4_END - 0.008;
/** Hide scene-4 mini-grid only after the bridge is on top (avoids a blank frame) */
export const CHAPTER4_ZOOM_SOURCE_HIDE = CHAPTER4_ZOOM_MOTION_START;

export const CHAPTER4_ZOOM_END = CHAPTER4_END + 0.028;
export const CHAPTER4_ZOOM_HOLD_END = CHAPTER4_ZOOM_END + 0.032;
export const CHAPTER4_ZOOM_BRIDGE_END =
    CHAPTER4_ZOOM_HOLD_END + (ZOOM_CARD_COUNT - 1) * ZOOM_CARD_EXIT_STAGGER + ZOOM_CARD_EXIT_DURATION;
export const CHAPTER4_ZOOM_COPY_EXIT_DURATION = 0.012;
export const CHAPTER4_ZOOM_SECTION_END = CHAPTER4_ZOOM_BRIDGE_END + CHAPTER4_ZOOM_COPY_EXIT_DURATION;
