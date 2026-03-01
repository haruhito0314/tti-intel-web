import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownItem {
    label: string;
    value: string;
    icon?: React.ElementType;
    disabled?: boolean;
}

interface DropdownProps {
    trigger: ReactNode;
    items: DropdownItem[];
    onSelect: (value: string) => void;
    align?: 'left' | 'right';
}

export function Dropdown({ trigger, items, onSelect, align = 'left' }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (value: string) => {
        onSelect(value);
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
            {isOpen && (
                <div
                    className={`
            absolute z-50 mt-2 min-w-[180px]
            glass rounded-xl py-1
            bg-white dark:bg-surface-dark
            border border-[var(--border)]
            shadow-lg
            animate-fade-in
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
                >
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.value}
                                onClick={() => !item.disabled && handleSelect(item.value)}
                                disabled={item.disabled}
                                className={`
                  w-full px-4 py-2 text-left
                  flex items-center gap-3
                  text-sm
                  transition-colors duration-150
                  ${item.disabled
                                        ? 'text-text-muted-light dark:text-text-muted-dark cursor-not-allowed'
                                        : 'text-text-primary-light dark:text-text-primary-dark hover:bg-primary-50 dark:hover:bg-primary-900/30'
                                    }
                `}
                            >
                                {Icon && <Icon className="w-4 h-4" />}
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
    placeholder?: string;
    className?: string;
}

export function Select({ value, onChange, options, placeholder, className = '' }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={selectRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="
          w-full px-4 py-3 rounded-xl
          bg-white dark:bg-surface-dark
          border border-[var(--border)]
          text-left
          flex items-center justify-between
          text-text-primary-light dark:text-text-primary-dark
          focus:outline-none focus:ring-2 focus:ring-primary-500
          transition-all duration-200
        "
            >
                <span className={selectedOption ? '' : 'text-text-muted-light dark:text-text-muted-dark'}>
                    {selectedOption?.label || placeholder || 'Select...'}
                </span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen && (
                <div
                    className="
            absolute z-50 w-full mt-2
            glass rounded-xl py-1
            bg-white dark:bg-surface-dark
            border border-[var(--border)]
            shadow-lg
            animate-fade-in
            max-h-60 overflow-y-auto
          "
                >
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`
                w-full px-4 py-2 text-left text-sm
                transition-colors duration-150
                ${option.value === value
                                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                                    : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-50 dark:hover:bg-gray-800'
                                }
              `}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
