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
    bg-[#0071E3] text-white
    hover:bg-[#0077ED]
    focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
    secondary: `
    bg-[#F5F5F7] text-[#1D1D1F]
    dark:bg-[#1C1C1E] dark:text-[#F5F5F7]
    hover:bg-[#E8E8ED] dark:hover:bg-[#2C2C2E]
    focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
    ghost: `
    text-[#1D1D1F] dark:text-[#F5F5F7]
    bg-[#F5F5F7]/50 dark:bg-[#1C1C1E]/50
    border border-[var(--border)]
    hover:bg-[#E8E8ED] dark:hover:bg-[#2C2C2E]
    hover:border-[#0071E3]/30 dark:hover:border-[#2997FF]/30
    focus-visible:ring-2 focus-visible:ring-[#0071E3]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
    outline: `
    border border-[#0071E3] text-[#0071E3]
    dark:border-[#2997FF] dark:text-[#2997FF]
    hover:bg-[#0071E3]/5 dark:hover:bg-[#2997FF]/10
    focus-visible:ring-2 focus-visible:ring-[#0071E3]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
    danger: `
    bg-[#FF3B30] text-white
    hover:bg-[#FF453A]
    focus-visible:ring-2 focus-visible:ring-[#FF3B30] focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-[15px]',
    lg: 'px-8 py-3 text-[17px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-full
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
