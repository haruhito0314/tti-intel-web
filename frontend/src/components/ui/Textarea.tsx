import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = '', label, error, helperText, id, ...props }, ref) => {
        const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-2"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={`
            w-full px-4 py-3 rounded-xl text-[17px]
            bg-white dark:bg-[var(--surface-2)]
            border transition-all duration-200
            text-[#1D1D1F] dark:text-[#F5F5F7]
            placeholder:text-[#86868B] dark:placeholder:text-[rgba(235,235,245,0.3)]
            resize-y min-h-[120px]
            ${error
                            ? 'border-[#FF3B30] focus:border-[#FF3B30] focus:ring-[#FF3B30]'
                            : 'border-[#D2D2D7] dark:border-[var(--border)] focus:border-[#0071E3] focus:ring-[#0071E3]'
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

Textarea.displayName = 'Textarea';
