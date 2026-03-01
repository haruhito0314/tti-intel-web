import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: `
    bg-gray-100 text-gray-700
    dark:bg-gray-800 dark:text-gray-300
  `,
    primary: `
    bg-primary-100 text-primary-700
    dark:bg-primary-900 dark:text-primary-300
  `,
    secondary: `
    bg-accent-100 text-accent-700
    dark:bg-accent-900 dark:text-accent-300
  `,
    success: `
    bg-green-100 text-green-700
    dark:bg-green-900 dark:text-green-300
  `,
    warning: `
    bg-yellow-100 text-yellow-700
    dark:bg-yellow-900 dark:text-yellow-300
  `,
    danger: `
    bg-red-100 text-red-700
    dark:bg-red-900 dark:text-red-300
  `,
};

export function Badge({
    variant = 'default',
    className = '',
    children,
    ...props
}: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center
        px-2.5 py-0.5 rounded-full
        text-xs font-medium
        transition-colors duration-200
        ${variantStyles[variant]}
        ${className}
      `}
            {...props}
        >
            {children}
        </span>
    );
}
