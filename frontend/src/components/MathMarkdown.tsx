import { Component, type ReactNode } from 'react';
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

function MathMarkdownInner({ children, paragraphClassName }: MathMarkdownInnerProps) {
    return (
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
