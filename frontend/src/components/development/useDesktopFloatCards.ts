import { useEffect, useState } from 'react';
import { DESKTOP_FLOAT_CARDS_MQ } from './floatCardMotion';

/** Ch1 float cards — desktop only to save space on phones/tablets */
export function useDesktopFloatCards(): boolean {
    const [visible, setVisible] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia(DESKTOP_FLOAT_CARDS_MQ).matches : false,
    );

    useEffect(() => {
        const mq = window.matchMedia(DESKTOP_FLOAT_CARDS_MQ);
        const sync = () => setVisible(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return visible;
}
