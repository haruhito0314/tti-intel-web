import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
    AssistantProvider,
    AssistantWidget,
    type AssistantClient,
} from '../../features/assistant';
import { DevHeader } from './DevHeader';
import { Header } from './Header';
import { Footer } from './Footer';

function isDevelopmentPath(pathname: string) {
    return pathname === '/development' || pathname.startsWith('/development/');
}

function isAdminPath(pathname: string) {
    const normalizedPathname = pathname.toLowerCase();

    return (
        normalizedPathname === '/admin'
        || normalizedPathname.startsWith('/admin/')
    );
}

function isEmbeddedAssistantPath(pathname: string) {
    return pathname === '/app/ai-assistant';
}

export interface LayoutProps {
    assistantClient?: AssistantClient;
    assistantCreateId?: () => string;
}

export function Layout({
    assistantClient,
    assistantCreateId,
}: LayoutProps = {}) {
    const { pathname } = useLocation();
    const backgroundRef = useRef<HTMLDivElement>(null);
    const isDevPage = isDevelopmentPath(pathname);
    const assistantEnabled = !isAdminPath(pathname);
    const hasEmbeddedAssistant = isEmbeddedAssistantPath(pathname);

    return (
        <AssistantProvider
            client={assistantClient}
            createId={assistantCreateId}
        >
            <div
                ref={backgroundRef}
                className={hasEmbeddedAssistant ? 'h-dvh overflow-hidden' : 'min-h-screen flex flex-col'}
            >
                {!hasEmbeddedAssistant && (isDevPage ? <DevHeader /> : <Header />)}
                <main tabIndex={-1} className={hasEmbeddedAssistant ? 'h-full min-h-0' : 'flex-1'}>
                    <Outlet />
                </main>
                {!hasEmbeddedAssistant && <Footer />}
            </div>
            <AssistantWidget
                enabled={assistantEnabled && !hasEmbeddedAssistant}
                backgroundRef={backgroundRef}
            />
        </AssistantProvider>
    );
}
