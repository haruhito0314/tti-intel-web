import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).slice(2, 11);
        const newToast = { ...toast, id };
        setToasts((prev) => [...prev, newToast]);

        // Auto remove after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

const iconMap: Record<ToastType, React.ElementType> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
};

const colorMap: Record<ToastType, string> = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-yellow-500',
};

function ToastContainer({
    toasts,
    removeToast,
}: {
    toasts: Toast[];
    removeToast: (id: string) => void;
}) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-md">
            {toasts.map((toast) => {
                const Icon = iconMap[toast.type];
                return (
                    <div
                        key={toast.id}
                        className="
              glass rounded-xl p-4
              bg-white dark:bg-surface-dark
              border border-[var(--border)]
              shadow-lg
              animate-slide-in
              flex items-start gap-3
            "
                        role="alert"
                    >
                        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorMap[toast.type]}`} />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary-light dark:text-text-primary-dark">
                                {toast.title}
                            </p>
                            {toast.message && (
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                    {toast.message}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="
                p-1 rounded-lg flex-shrink-0
                text-text-muted-light dark:text-text-muted-dark
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition-colors duration-200
              "
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
