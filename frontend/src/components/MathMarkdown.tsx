import { Component, useLayoutEffect, useRef, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { normalizeMathDelimiters } from '@/lib/markdown';

type MathMarkdownProps = {
    children: string;
    paragraphClassName?: string;
};

type MathMarkdownInnerProps = MathMarkdownProps;

function fitKatexDisplays(root: HTMLElement) {
    const displays = root.querySelectorAll<HTMLElement>('.katex-display');

    displays.forEach((display) => {
        const katex = display.querySelector<HTMLElement>(':scope > .katex');
        if (!katex) return;

        katex.style.transform = '';
        katex.style.transformOrigin = '';
        display.style.height = '';

        const available = display.clientWidth;
        const needed = katex.scrollWidth;
        if (available <= 0 || needed <= available) return;

        const scale = available / needed;
        katex.style.transform = `scale(${scale})`;
        katex.style.transformOrigin = 'left top';
        display.style.height = `${katex.getBoundingClientRect().height}px`;
    });
}

function MathMarkdownInner({ children, paragraphClassName }: MathMarkdownInnerProps) {
    const rootRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        let cancelled = false;
        const run = () => {
            if (!cancelled) fitKatexDisplays(root);
        };
        run();

        const resizeObserver = new ResizeObserver(run);
        resizeObserver.observe(root);

        if ('fonts' in document) {
            void document.fonts.ready.then(run);
        }

        return () => {
            cancelled = true;
            resizeObserver.disconnect();
        };
    }, [children, paragraphClassName]);

    return (
        <div ref={rootRef} className="math-markdown">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    p: ({ children: paragraphChildren }) => (
                        <p className={paragraphClassName}>{paragraphChildren}</p>
                    ),
                }}
            >
                {normalizeMathDelimiters(children)}
            </ReactMarkdown>
        </div>
    );
}

type MathMarkdownBoundaryState = {
    hasError: boolean;
};

class MathMarkdownBoundary extends Component<MathMarkdownProps, MathMarkdownBoundaryState> {
    state: MathMarkdownBoundaryState = { hasError: false };

    static getDerivedStateFromError(): MathMarkdownBoundaryState {
        return { hasError: true };
    }

    componentDidUpdate(prevProps: MathMarkdownProps) {
        if (prevProps.children !== this.props.children && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <p className={this.props.paragraphClassName ?? 'text-red-600 dark:text-red-400'}>
                    数式の表示に失敗しました。内容を確認してください。
                </p>
            );
        }

        return <MathMarkdownInner {...this.props} />;
    }
}

export function MathMarkdown(props: MathMarkdownProps) {
    return <MathMarkdownBoundary {...props} />;
}
