import { useLayoutEffect, useRef, useState } from 'react';
import {
    getMobileStackMaxPanOffset,
    getMobileStackStageOffset,
    type StackGridLayout,
} from './chapterMotion';

type UseMobileStackStagePanArgs = {
    enabled: boolean;
    layout: StackGridLayout;
    local: number;
    cardCount: number;
    staticMode: boolean;
};

export function useMobileStackStagePan({
    enabled,
    layout,
    local,
    cardCount,
    staticMode,
}: UseMobileStackStagePanArgs) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [maxOffsetPx, setMaxOffsetPx] = useState(0);

    useLayoutEffect(() => {
        if (!enabled || layout !== 'mobile-scroll') {
            setMaxOffsetPx(0);
            return;
        }

        const scrollEl = scrollRef.current;
        const stageEl = stageRef.current;
        if (!scrollEl || !stageEl) return;

        const measure = () => {
            setMaxOffsetPx(getMobileStackMaxPanOffset(stageEl.scrollHeight, scrollEl.clientHeight));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(scrollEl);
        observer.observe(stageEl);

        return () => observer.disconnect();
    }, [enabled, layout, cardCount, local]);

    const stageOffset =
        enabled && layout === 'mobile-scroll'
            ? getMobileStackStageOffset(local, cardCount, staticMode, layout, maxOffsetPx)
            : 0;

    return { scrollRef, stageRef, stageOffset };
}
