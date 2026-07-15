import { describe, expect, it } from 'vitest';
import { getDefaultWeeklyMathProblem } from './weeklyMath';
import {
    resolveWeeklyMathSolutionContent,
    ROUTE_COUNTING_ANSWER,
    ROUTE_COUNTING_EXPLANATION,
} from './weeklyMathFallbacks';

describe('route counting solution', () => {
    it('states the central binomial coefficient and uses the full polynomial degree', () => {
        expect(ROUTE_COUNTING_ANSWER).toContain('\\binom{2n}{n}');
        expect(ROUTE_COUNTING_EXPLANATION).toContain('\\sum_{j=0}^{2n}A_jx^j');
        expect(ROUTE_COUNTING_EXPLANATION).not.toContain('\\sum_{k=0}^{n}A_kx^k');
    });

    it('keeps the built-in default solution identical to the public fallback', () => {
        const defaultProblem = getDefaultWeeklyMathProblem();

        expect(defaultProblem.answer).toBe(ROUTE_COUNTING_ANSWER);
        expect(defaultProblem.explanation).toBe(ROUTE_COUNTING_EXPLANATION);
    });

    it('ignores stale stored content for the route-counting problem', () => {
        expect(resolveWeeklyMathSolutionContent({
            title: '経路の場合の数',
            answer: '古い解答',
            explanation: '古い解説',
        })).toEqual({
            answerMarkdown: ROUTE_COUNTING_ANSWER,
            explanationMarkdown: ROUTE_COUNTING_EXPLANATION,
        });
    });
});
