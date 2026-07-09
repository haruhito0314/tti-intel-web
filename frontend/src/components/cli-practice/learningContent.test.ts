import { describe, expect, it } from 'vitest';
import { TUTORIAL_STEPS } from './tutorialSteps';
import {
    NEXT_ACTIONS,
    getCurrentMilestone,
} from './learningContent';

describe('cli practice learning content', () => {
    it('returns actionable current milestone copy while tutorial is running', () => {
        const milestone = getCurrentMilestone(1, false);

        expect(milestone.currentLabel).toBe(`STEP 2 / ${TUTORIAL_STEPS.length}`);
        expect(milestone.chapter).toBe(TUTORIAL_STEPS[1].chapter);
        expect(milestone.title).toBe(TUTORIAL_STEPS[1].title);
        expect(milestone.nextAction).toBe('pwd を実行して、表示されたパスを見てみましょう。');
    });

    it('returns completion copy after the tutorial is finished', () => {
        const milestone = getCurrentMilestone(0, true);

        expect(milestone.currentLabel).toBe('COMPLETE');
        expect(milestone.chapter).toBe('完走');
        expect(milestone.nextAction).toContain('自由に');
    });

    it('keeps next actions focused on commands students can try', () => {
        expect(NEXT_ACTIONS).toHaveLength(3);
        expect(NEXT_ACTIONS.every((action) => action.command.length > 0)).toBe(true);
        expect(NEXT_ACTIONS.some((action) => action.command === 'pwd')).toBe(true);
    });
});
