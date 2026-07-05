import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout() {
    const { pathname } = useLocation();
    const isDevPage = pathname === '/development';

    return (
        <div className="min-h-screen flex flex-col">
            {!isDevPage && <Header />}
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
