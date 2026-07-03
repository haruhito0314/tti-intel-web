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

export function MathMarkdown({ children, paragraphClassName }: MathMarkdownProps) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                p: ({ children }) => (
                    <p className={paragraphClassName}>
                        {children}
                    </p>
                ),
            }}
        >
            {normalizeMathDelimiters(children)}
        </ReactMarkdown>
    );
}
