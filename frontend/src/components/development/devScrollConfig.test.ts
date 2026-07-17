import { describe, expect, it } from 'vitest';
import {
    DEV_TRACK_HEIGHT_MOBILE_VH,
    DEV_TRACK_HEIGHT_VH,
    SCENE_RANGES,
} from './devScrollConfig';

function chapterSpans() {
    return SCENE_RANGES.map(([start, end]) => end - start);
}

describe('development scroll pacing', () => {
    it('keeps the showcase track long enough for motion without dead scrolling', () => {
        expect(DEV_TRACK_HEIGHT_VH).toBe(1160);
        expect(DEV_TRACK_HEIGHT_MOBILE_VH).toBe(1080);
    });

    it('keeps chapter ranges contiguous and balanced for readability', () => {
        const spans = chapterSpans();

        expect(spans.reduce((total, span) => total + span, 0)).toBeCloseTo(1, 5);
        for (let index = 1; index < SCENE_RANGES.length; index += 1) {
            expect(SCENE_RANGES[index][0]).toBeCloseTo(SCENE_RANGES[index - 1][1], 5);
        }

        const expectedSpans = [0.15, 0.2, 0.13, 0.12, 0.13, 0.15, 0.12];
        expectedSpans.forEach((expected, index) => {
            expect(spans[index]).toBeCloseTo(expected, 5);
        });
        expect(spans[0] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(160);
        expect(spans[1] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(220);
        expect(spans[2] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(140);
        expect(spans[3] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(130);
        expect(spans[4] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(140);
        expect(spans[5] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(160);
        expect(spans[6] * DEV_TRACK_HEIGHT_VH).toBeGreaterThanOrEqual(130);
    });
});
