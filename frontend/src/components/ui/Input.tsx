import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, helperText, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-2"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`
            w-full px-4 py-3 rounded-xl text-[17px]
            bg-white dark:bg-[#1C1C1E]
            border transition-all duration-200
            text-[#1D1D1F] dark:text-[#F5F5F7]
            placeholder:text-[#86868B] dark:placeholder:text-[rgba(235,235,245,0.3)]
            ${error
                            ? 'border-[#FF3B30] focus:border-[#FF3B30] focus:ring-[#FF3B30]'
                            : 'border-[#D2D2D7] dark:border-[#38383A] focus:border-[#0071E3] focus:ring-[#0071E3]'
                        }
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
                    {...props}
                />
                {(error || helperText) && (
                    <p
                        className={`mt-2 text-sm ${error ? 'text-[#FF3B30]' : 'text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]'
                            }`}
                    >
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
