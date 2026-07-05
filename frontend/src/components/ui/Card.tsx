import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'elevated';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    children: ReactNode;
}

const variantStyles = {
    default: `
    bg-white dark:bg-[var(--surface-2)]
    border border-[#D2D2D7] dark:border-[var(--border)]
  `,
    glass: `
    glass
  `,
    elevated: `
    bg-white dark:bg-[var(--surface-2)]
    shadow-lg shadow-black/[0.04] dark:shadow-white/[0.02]
    border border-[#D2D2D7]/50 dark:border-[var(--border)]/70
  `,
};

const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export function Card({
    variant = 'default',
    padding = 'md',
    className = '',
    children,
    ...props
}: CardProps) {
    return (
        <div
            className={`
        rounded-3xl
        transition-all duration-300 ease-out
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
}
