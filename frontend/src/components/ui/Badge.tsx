import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: `
    bg-[#F5F5F7] text-[#6E6E73]
    dark:bg-[#1C1C1E] dark:text-[rgba(235,235,245,0.6)]
  `,
  primary: `
    bg-[#0071E3]/10 text-[#004C99]
    dark:bg-[#2997FF]/10 dark:text-[#5DABFF]
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
