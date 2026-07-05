import { useLayoutEffect, useState, type RefObject } from 'react';
import { easeOutCubic } from './devScrollMath';

/** Scroll the mobile ch2 grid so the last row settles ~⅓ from the bottom of the stage */
export function useStack2MobileFlowScroll(
    local: number,
    scrollRef: RefObject<HTMLDivElement | null>,
    contentRef: RefObject<HTMLDivElement | null>,
): number {
    const [translateY, setTranslateY] = useState(0);

    useLayoutEffect(() => {
        const scroll = scrollRef.current;
        const content = contentRef.current;
        if (!scroll || !content) return;

        const sync = () => {
            const stage = scroll.closest('.dev-hero-stage') as HTMLElement | null;
            if (!stage) return;

            const stageRect = stage.getBoundingClientRect();
            const scrollRect = scroll.getBoundingClientRect();
            const contentH = content.offsetHeight;
            if (stageRect.height < 1 || contentH < 1) return;

            const scrollTopInStage = scrollRect.top - stageRect.top;
            const targetBottom = stageRect.height * (2 / 3);
            const endY = targetBottom - scrollTopInStage - contentH;
            const t = easeOutCubic(local);
            setTranslateY(endY * t);
        };

        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(scroll);
        observer.observe(content);
        if (scroll.closest('.dev-hero-stage')) {
            observer.observe(scroll.closest('.dev-hero-stage')!);
        }
        window.addEventListener('resize', sync);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', sync);
        };
    }, [local, scrollRef, contentRef]);

    return translateY;
}
