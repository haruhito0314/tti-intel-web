import { useEffect, useRef, useState, type RefObject } from 'react';
import { getTrackProgress, quantizeProgress } from './devScrollMath';

function lockStageMetrics(track: HTMLElement) {
    const height = window.innerHeight;
    const stage = track.querySelector('.dev-hero-stage') as HTMLElement | null;
    track.style.setProperty('--dev-stage-height', `${height}px`);
    stage?.style.setProperty('--dev-stage-height', `${height}px`);
}

export function useDevScrollProgress(trackRef: RefObject<HTMLElement | null>) {
    const [progress, setProgress] = useState(0);
    const [reducedMotion, setReducedMotion] = useState(false);
    const rafRef = useRef(0);
    const lastRef = useRef(0);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReducedMotion(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const track = trackRef.current;
        if (!track || reducedMotion) return;

        lockStageMetrics(track);

        const onResize = () => lockStageMetrics(track);
        window.addEventListener('resize', onResize, { passive: true });

        return () => window.removeEventListener('resize', onResize);
    }, [trackRef, reducedMotion]);

    useEffect(() => {
        const track = trackRef.current;
        if (!track || reducedMotion) return;

        const update = () => {
            const next = quantizeProgress(getTrackProgress(track));
            if (next === lastRef.current) return;
            lastRef.current = next;
            setProgress(next);
        };

        const onScroll = () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            cancelAnimationFrame(rafRef.current);
        };
    }, [trackRef, reducedMotion]);

    return { progress, reducedMotion };
}
