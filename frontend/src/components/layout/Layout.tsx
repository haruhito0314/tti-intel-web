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
    const assistantEnabled = (
        pathname !== '/admin'
        && !pathname.startsWith('/admin/')
    );

    return (
        <AssistantProvider
            client={assistantClient}
            createId={assistantCreateId}
        >
            <div
                ref={backgroundRef}
                className="min-h-screen flex flex-col"
            >
                {isDevPage ? <DevHeader /> : <Header />}
                <main tabIndex={-1} className="flex-1">
                    <Outlet />
                </main>
                <Footer />
            </div>
            <AssistantWidget
                enabled={assistantEnabled}
                backgroundRef={backgroundRef}
            />
        </AssistantProvider>
    );
}
