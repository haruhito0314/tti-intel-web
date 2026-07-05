import { useLayoutEffect, useRef, type ReactNode } from 'react';

type DevFitScaleProps = {
    children: ReactNode;
    className?: string;
    /** When true, content spans full container width before scaling (stack grids). */
    stretch?: boolean;
};

/** Scale children down uniformly so they fit the available box (never upscale). */
export function DevFitScale({ children, className = '', stretch = false }: DevFitScaleProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const wrapper = wrapperRef.current;
        const content = contentRef.current;
        if (!container || !wrapper || !content) return;

        const update = () => {
            content.style.transform = 'none';
            content.style.width = 'max-content';
            content.style.maxWidth = '100%';
            wrapper.style.width = '';
            wrapper.style.height = '';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';

            const cw = container.clientWidth;
            const ch = container.clientHeight;
            if (cw <= 0 || ch <= 0) return;

            const sw = content.scrollWidth;
            const sh = content.scrollHeight;
            if (sw <= 0 || sh <= 0) return;

            const scale = Math.min(1, cw / sw, ch / sh);
            const visualW = sw * scale;
            const visualH = sh * scale;

            wrapper.style.width = `${visualW}px`;
            wrapper.style.height = `${visualH}px`;
            content.style.width = `${sw}px`;
            content.style.height = `${sh}px`;
            content.style.transformOrigin = 'center center';
            content.style.transform = scale < 0.999 ? `scale(${scale})` : 'none';
        };

        const ro = new ResizeObserver(() => {
            requestAnimationFrame(update);
        });

        ro.observe(container);
        ro.observe(content);
        update();

        return () => ro.disconnect();
    }, [stretch]);

    return (
        <div ref={containerRef} className={`dev-fit-scale${stretch ? ' dev-fit-scale--stretch' : ''} ${className}`.trim()}>
            <div ref={wrapperRef} className="dev-fit-scale__wrapper">
                <div ref={contentRef} className="dev-fit-scale__content">
                    {children}
                </div>
            </div>
        </div>
    );
}
