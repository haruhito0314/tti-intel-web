import { useEffect, useState } from 'react';

/** Vertical card flow on narrow or short viewports (Ch2 / Ch5). */
const STACK_VERTICAL_MQ = '(max-width: 768px), (max-height: 620px)';

export function useMobileStackScroll(): boolean {
    const [vertical, setVertical] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia(STACK_VERTICAL_MQ).matches : false,
    );

    useEffect(() => {
        const mq = window.matchMedia(STACK_VERTICAL_MQ);
        const sync = () => setVertical(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return vertical;
}
