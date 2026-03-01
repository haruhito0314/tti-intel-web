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
                        className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={`
            w-full px-4 py-3 rounded-xl
            bg-white dark:bg-surface-dark
            border transition-all duration-200
            text-text-primary-light dark:text-text-primary-dark
            placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark
            resize-y min-h-[120px]
            ${error
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-[var(--border)] focus:border-primary-500 focus:ring-primary-500'
                        }
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
                    {...props}
                />
                {(error || helperText) && (
                    <p
                        className={`mt-2 text-sm ${error ? 'text-red-500' : 'text-text-secondary-light dark:text-text-secondary-dark'
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
