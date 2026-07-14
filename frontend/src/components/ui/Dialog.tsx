import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: ReactNode;
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open) {
            dialog.showModal();
            document.body.style.overflow = 'hidden';
        } else {
            dialog.close();
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === dialogRef.current) {
            onClose();
        }
    };

    if (!open) return null;

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            className="
        fixed inset-0 z-50
        w-full max-w-lg m-auto p-0
        bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm
        open:animate-fade-in
      "
            onClick={handleBackdropClick}
        >
            <div
                className="
          glass rounded-2xl p-6
          bg-white dark:bg-[var(--surface-2)]
          border border-[var(--border)]
          shadow-xl
        "
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        {title && (
                            <h2 id={titleId} className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p id={descriptionId} className="text-sm text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="
              p-2 rounded-lg
              text-[#86868B] dark:text-[rgba(235,235,245,0.3)]
              hover:bg-[#F5F5F7] dark:hover:bg-[var(--surface-3)]
              transition-colors duration-200
            "
                        aria-label="Close dialog"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {children}
            </div>
        </dialog>
    );
}
