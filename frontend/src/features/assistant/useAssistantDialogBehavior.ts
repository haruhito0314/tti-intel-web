import {
    useEffect,
    useRef,
    useState,
    type RefObject,
} from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'summary',
    '[href]',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface AssistantDialogBehaviorOptions {
    active: boolean;
    hidden: boolean;
    dialogRef: RefObject<HTMLElement | null>;
    inputRef: RefObject<HTMLTextAreaElement | null>;
    triggerRef: RefObject<HTMLButtonElement | null>;
    backgroundRef: RefObject<HTMLElement | null>;
    onClose(): void;
}

function getInitialMobile() {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia(MOBILE_QUERY).matches;
}

function isInsideClosedDetails(element: HTMLElement, dialog: HTMLElement) {
    let ancestor = element.parentElement;

    while (ancestor && dialog.contains(ancestor)) {
        if (
            ancestor.tagName === 'DETAILS'
            && !(ancestor as HTMLDetailsElement).open
            && !(
                element.tagName === 'SUMMARY'
                && element.parentElement === ancestor
            )
        ) {
            return true;
        }
        ancestor = ancestor.parentElement;
    }

    return false;
}

function isHiddenOrInert(element: HTMLElement, dialog: HTMLElement) {
    let current: HTMLElement | null = element;

    while (current) {
        if (
            current.hidden
            || current.inert
            || current.hasAttribute('inert')
        ) {
            return true;
        }

        const style = window.getComputedStyle(current);
        if (
            style.display === 'none'
            || style.visibility === 'hidden'
            || style.visibility === 'collapse'
        ) {
            return true;
        }

        if (current === dialog) {
            break;
        }
        current = current.parentElement;
    }

    return false;
}

function getFocusableElements(dialog: HTMLElement) {
    return [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        .filter((element) => (
            !isHiddenOrInert(element, dialog)
            && !isInsideClosedDetails(element, dialog)
            && element.getClientRects().length > 0
        ));
}

export function useAssistantDialogBehavior({
    active,
    hidden,
    dialogRef,
    inputRef,
    triggerRef,
    backgroundRef,
    onClose,
}: AssistantDialogBehaviorOptions): { isMobile: boolean } {
    const [isMobile, setIsMobile] = useState(getInitialMobile);
    const wasActiveRef = useRef(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            setIsMobile(event.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    useEffect(() => {
        if (!active || !isMobile) {
            return;
        }

        const background = backgroundRef.current;
        const inertBackground = background as unknown as
            | { inert?: boolean }
            | null;
        const hadOwnInertProperty = background
            ? Object.prototype.hasOwnProperty.call(background, 'inert')
            : false;
        const previousInert = inertBackground?.inert;
        const previousInertAttribute = background?.getAttribute('inert') ?? null;
        const previousOverflow = document.body.style.overflow;

        if (background) {
            inertBackground!.inert = true;
            background.setAttribute('inert', '');
        }
        document.body.style.overflow = 'hidden';

        return () => {
            if (background) {
                if (previousInert === undefined && !hadOwnInertProperty) {
                    delete inertBackground!.inert;
                } else {
                    inertBackground!.inert = previousInert;
                }
                if (previousInertAttribute === null) {
                    background.removeAttribute('inert');
                } else {
                    background.setAttribute('inert', previousInertAttribute);
                }
            }
            document.body.style.overflow = previousOverflow;
        };
    }, [active, backgroundRef, isMobile]);

    useEffect(() => {
        if (active) {
            const input = inputRef.current;
            input?.focus();
            if (document.activeElement !== input) {
                const dialog = dialogRef.current;
                if (dialog) {
                    getFocusableElements(dialog)[0]?.focus();
                }
            }
        }
    }, [active, dialogRef, inputRef]);

    useEffect(() => {
        if (!active) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== 'Tab' || !isMobile) {
                return;
            }

            const dialog = dialogRef.current;
            if (!dialog) {
                return;
            }

            const focusable = getFocusableElements(dialog);
            const first = focusable[0];
            const last = focusable.at(-1);
            if (!first || !last) {
                return;
            }

            const focused = document.activeElement;
            if (event.shiftKey) {
                if (focused === first || !dialog.contains(focused)) {
                    event.preventDefault();
                    last.focus();
                }
                return;
            }

            if (focused === last || !dialog.contains(focused)) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [active, dialogRef, isMobile, onClose]);

    useEffect(() => {
        const wasActive = wasActiveRef.current;
        wasActiveRef.current = active;

        if (!wasActive || active) {
            return;
        }

        if (hidden) {
            backgroundRef.current
                ?.querySelector<HTMLElement>('main[tabindex="-1"]')
                ?.focus();
            return;
        }

        triggerRef.current?.focus();
    }, [active, backgroundRef, hidden, triggerRef]);

    return { isMobile };
}
