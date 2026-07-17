import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { siteConfig, type SiteNavItem } from '@/config/site';

function isNavItemActive(item: SiteNavItem, pathname: string) {
    if (item.children?.length) {
        return item.children.some(
            (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
        );
    }
    if (item.href === '/') return pathname === '/';
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function DesktopNavItem({
    item,
    linkClassName,
}: {
    item: SiteNavItem;
    linkClassName: (active: boolean) => string;
}) {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const openedByHoverRef = useRef(false);
    const menuId = useId();
    const active = isNavItemActive(item, location.pathname);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                openedByHoverRef.current = false;
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                openedByHoverRef.current = false;
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    useEffect(() => {
        openedByHoverRef.current = false;
        setOpen(false);
    }, [location.pathname]);

    if (!item.children?.length) {
        return (
            <NavLink to={item.href} className={() => linkClassName(active)}>
                {item.name}
            </NavLink>
        );
    }

    return (
        <div
            ref={rootRef}
            className={`site-nav-dropdown ${open ? 'site-nav-dropdown--open' : ''}`}
            onMouseEnter={() => {
                openedByHoverRef.current = true;
                setOpen(true);
            }}
            onMouseLeave={() => {
                openedByHoverRef.current = false;
                setOpen(false);
            }}
        >
            <button
                type="button"
                className={`${linkClassName(active)} site-nav-dropdown-trigger`}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls={menuId}
                onClick={() => {
                    // Hover already opened the menu; ignore the following click so it doesn't snap shut.
                    if (openedByHoverRef.current) return;
                    setOpen((value) => !value);
                }}
            >
                {item.name}
                <ChevronDown className="site-nav-dropdown-chevron" aria-hidden="true" />
            </button>
            {open && (
                <div className="site-nav-dropdown-panel-wrap">
                    <div id={menuId} className="site-nav-dropdown-panel" role="menu">
                        {item.children.map((child) => (
                            <NavLink
                                key={child.href}
                                to={child.href}
                                role="menuitem"
                                className={({ isActive }) =>
                                    `site-nav-dropdown-link${isActive ? ' site-nav-dropdown-link--active' : ''}`
                                }
                                onClick={() => {
                                    openedByHoverRef.current = false;
                                    setOpen(false);
                                }}
                            >
                                {child.name}
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function DesktopSiteNav({
    linkClassName,
}: {
    linkClassName: (active: boolean) => string;
}) {
    return (
        <>
            {siteConfig.navigation.map((item) => (
                <DesktopNavItem key={item.name} item={item} linkClassName={linkClassName} />
            ))}
        </>
    );
}

export function MobileSiteNav({
    onNavigate,
    linkClassName,
}: {
    onNavigate: () => void;
    linkClassName: (active: boolean) => string;
}) {
    const location = useLocation();
    const [expanded, setExpanded] = useState(() =>
        siteConfig.navigation.some(
            (item) => item.children?.length && isNavItemActive(item, location.pathname),
        ),
    );

    return (
        <>
            {siteConfig.navigation.map((item) => {
                if (!item.children?.length) {
                    return (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={onNavigate}
                            className={() => linkClassName(isNavItemActive(item, location.pathname))}
                        >
                            {item.name}
                        </NavLink>
                    );
                }

                const groupActive = isNavItemActive(item, location.pathname);

                return (
                    <div key={item.name} className="site-nav-mobile-group">
                        <button
                            type="button"
                            className={`${linkClassName(groupActive)} site-nav-mobile-group-trigger`}
                            aria-expanded={expanded}
                            onClick={() => setExpanded((value) => !value)}
                        >
                            {item.name}
                            <ChevronDown
                                className={`site-nav-dropdown-chevron${expanded ? ' site-nav-dropdown-chevron--open' : ''}`}
                                aria-hidden="true"
                            />
                        </button>
                        {expanded && (
                            <div className="site-nav-mobile-group-links">
                                {item.children.map((child) => (
                                    <NavLink
                                        key={child.href}
                                        to={child.href}
                                        onClick={onNavigate}
                                        className={({ isActive }) =>
                                            `site-nav-mobile-child${isActive ? ' site-nav-mobile-child--active' : ''}`
                                        }
                                    >
                                        {child.name}
                                    </NavLink>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}
