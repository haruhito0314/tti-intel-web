import { useEffect, useState } from 'react';

export const DEV_MOBILE_MQ = '(max-width: 768px)';

export function useDevMobileLayout(): boolean {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(DEV_MOBILE_MQ).matches,
    );

    useEffect(() => {
        const mq = window.matchMedia(DEV_MOBILE_MQ);
        const sync = () => setIsMobile(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return isMobile;
}
