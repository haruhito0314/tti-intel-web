import { useCallback, useRef, useState } from 'react';
import type { TerminalEditorSavedEvent, TerminalHandle, TerminalTutorialEvent } from './Terminal';
import { TUTORIAL_STEPS, type TutorialCheckContext } from './tutorialSteps';
import { describeReplayTarget, replayTutorialToStep } from './tutorialReplay';
import { createInitialState, type ProjectState } from './virtualFs';

export function useTutorialProgress(
    terminalRef: React.RefObject<TerminalHandle | null>,
    setState: (state: ProjectState) => void,
) {
    const [stepIndex, setStepIndex] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [lastFeedback, setLastFeedback] = useState<'success' | 'error' | 'info' | null>(null);
    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const stepIndexRef = useRef(stepIndex);
    stepIndexRef.current = stepIndex;

    const advance = useCallback(() => {
        setStepIndex((current) => {
            const next = current + 1;
            if (next >= TUTORIAL_STEPS.length) {
                setCompleted(true);
                return current;
            }
            return next;
        });
        setLastFeedback(null);
    }, []);

    const handleAdvanceIntro = useCallback(() => {
        advance();
    }, [advance]);

    const handleSkip = useCallback(() => {
        advance();
    }, [advance]);

    const handleGoBack = useCallback(() => {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        setStepIndex((current) => Math.max(0, current - 1));
        setCompleted(false);
        setLastFeedback(null);
    }, []);

    const handleSyncEnvironment = useCallback(() => {
        if (completed || stepIndex <= 0) return;

        const description = describeReplayTarget(stepIndex);
        const confirmed = window.confirm(
            `${description}\n\n今のフォルダやファイルは一度消えますが、チュートリアル通りの状態に戻せます。よろしいですか？`,
        );
        if (!confirmed) return;

        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        setLastFeedback(null);

        const { state: replayedState, lines } = replayTutorialToStep(stepIndex);
        setState(replayedState);
        terminalRef.current?.showReplay(lines);
    }, [completed, setState, stepIndex, terminalRef]);

    const handleRestart = useCallback(() => {
        if (!window.confirm('チュートリアルを最初からやり直します。作成したフォルダやファイルもすべて消えます。よろしいですか？')) {
            return;
        }
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        setStepIndex(0);
        setCompleted(false);
        setLastFeedback(null);
        setState(createInitialState());
        terminalRef.current?.runCommand('reset');
    }, [setState, terminalRef]);

    const handleTutorialEvent = useCallback((event: TerminalTutorialEvent | TerminalEditorSavedEvent) => {
        if (completed) return;

        const step = TUTORIAL_STEPS[stepIndexRef.current];
        if (!step || step.kind === 'intro') return;

        let ctx: TutorialCheckContext;

        if (event.type === 'command') {
            if (step.kind !== 'command') return;
            ctx = {
                command: event.command,
                stateBefore: event.stateBefore,
                stateAfter: event.stateAfter,
            };
        } else {
            if (step.kind !== 'editor') return;
            ctx = {
                stateBefore: event.stateAfter,
                stateAfter: event.stateAfter,
                editorSaved: { file: event.file, content: event.content },
            };
        }

        if (step.check(ctx)) {
            setLastFeedback('success');
            terminalRef.current?.appendTutorialMessage('チュートリアル: ステップ完了', 'success');
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = setTimeout(() => {
                advance();
            }, 1200);
            return;
        }

        if (event.type === 'editor_saved' && step.kind === 'editor') {
            setLastFeedback('error');
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 3500);
        }
    }, [advance, completed, terminalRef]);

    return {
        stepIndex,
        completed,
        lastFeedback,
        handleTutorialEvent,
        handleAdvanceIntro,
        handleSkip,
        handleGoBack,
        handleSyncEnvironment,
        handleRestart,
    };
}
