import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: `
    gradient-bg text-white
    hover:opacity-90
    focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
    secondary: `
    bg-primary-100 text-primary-700
    dark:bg-primary-900 dark:text-primary-200
    hover:bg-primary-200 dark:hover:bg-primary-800
    focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
    ghost: `
    text-text-primary-light dark:text-text-primary-dark
    bg-surface-light/50 dark:bg-surface-dark/50
    border border-[var(--border)]
    hover:bg-primary-100 dark:hover:bg-primary-900/50
    hover:border-primary-300 dark:hover:border-primary-700
    focus-visible:ring-2 focus-visible:ring-primary-500
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
    outline: `
    border border-current text-primary-600 dark:text-primary-400
    hover:bg-primary-50 dark:hover:bg-primary-900/30
    focus-visible:ring-2 focus-visible:ring-primary-500
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
    danger: `
    bg-red-500 text-white
    hover:bg-red-600
    focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-xl
          transition-all duration-200 ease-out
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
