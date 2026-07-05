import { Outlet, useLocation } from 'react-router-dom';
import { DevHeader } from './DevHeader';
import { Header } from './Header';
import { Footer } from './Footer';

function isDevelopmentPath(pathname: string) {
    return pathname === '/development' || pathname.startsWith('/development/');
}

export function Layout() {
    const { pathname } = useLocation();
    const isDevPage = isDevelopmentPath(pathname);

    return (
        <div className="min-h-screen flex flex-col">
            {isDevPage ? <DevHeader /> : <Header />}
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
