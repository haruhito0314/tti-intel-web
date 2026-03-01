import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'elevated';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    children: ReactNode;
}

const variantStyles = {
    default: `
    bg-white dark:bg-surface-dark
    border border-[var(--border)]
  `,
    glass: `
    glass
  `,
    elevated: `
    bg-white dark:bg-surface-dark
    shadow-lg shadow-primary-500/5 dark:shadow-primary-500/10
    border border-[var(--border)]
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
        rounded-2xl
        transition-all duration-300
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

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`mb-4 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={`text-xl font-semibold text-text-primary-light dark:text-text-primary-dark ${className}`}
            {...props}
        >
            {children}
        </h3>
    );
}

export function CardDescription({ className = '', children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={`text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1 ${className}`}
            {...props}
        >
            {children}
        </p>
    );
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`mt-4 flex items-center gap-4 ${className}`} {...props}>
            {children}
        </div>
    );
}
