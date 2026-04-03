import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui';
import { Layout } from '@/components/layout';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Eager load: lightweight pages without heavy dependencies
import { Home } from '@/pages/Home';
import { About } from '@/pages/About';
import { Contact } from '@/pages/Contact';
import { AppShowcase } from '@/pages/AppShowcase';

// Lazy load: pages with Firebase SDK or heavy dependencies
const News = lazy(() => import('@/pages/News').then(m => ({ default: m.News })));
const NewsDetail = lazy(() => import('@/pages/NewsDetail').then(m => ({ default: m.NewsDetail })));
const Board = lazy(() => import('@/pages/Board').then(m => ({ default: m.Board })));
const BoardDetail = lazy(() => import('@/pages/BoardDetail').then(m => ({ default: m.BoardDetail })));
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })));
const AdminMembers = lazy(() => import('@/pages/AdminMembers').then(m => ({ default: m.AdminMembers })));
const AdminWeeklyMath = lazy(() => import('@/pages/AdminWeeklyMath').then(m => ({ default: m.AdminWeeklyMath })));
const AdminWeeklyMathPreview = lazy(() => import('@/pages/AdminWeeklyMathPreview').then(m => ({ default: m.AdminWeeklyMathPreview })));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#D2D2D7] border-t-[#0071E3] rounded-full animate-spin" />
        <p className="text-sm text-[#86868B] dark:text-[rgba(235,235,245,0.3)]">読み込み中...</p>
      </div>
    </div>
  );
}

function InitialSplash({ phase }: { phase: 'enter' | 'logo-out' | 'overlay-out' }) {
  return (
    <div
      className={`initial-splash ${phase === 'overlay-out' ? 'is-overlay-out' : ''}`}
      aria-hidden={phase === 'overlay-out'}
    >
      <img
        src="/A-3.png"
        alt="TTI Intelligence"
        className={`initial-splash-logo ${phase !== 'enter' ? 'is-logo-out' : ''}`}
      />
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const [splashPhase, setSplashPhase] = useState<'enter' | 'logo-out' | 'overlay-out'>('enter');

  useEffect(() => {
    if (!showSplash) return;
    const logoOutTimer = window.setTimeout(() => {
      setSplashPhase('logo-out');
    }, 2500);
    const overlayOutTimer = window.setTimeout(() => {
      setSplashPhase('overlay-out');
    }, 2750);
    const hideTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => {
      window.clearTimeout(logoOutTimer);
      window.clearTimeout(overlayOutTimer);
      window.clearTimeout(hideTimer);
    };
  }, [showSplash]);

  return (
    <ThemeProvider>
      <ToastProvider>
        {showSplash && <InitialSplash phase={splashPhase} />}
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="news" element={<Suspense fallback={<PageLoader />}><News /></Suspense>} />
              <Route path="news/:slug" element={<Suspense fallback={<PageLoader />}><NewsDetail /></Suspense>} />
              <Route path="app" element={<AppShowcase />} />
              <Route path="board" element={<Suspense fallback={<PageLoader />}><Board /></Suspense>} />
              <Route path="board/:id" element={<Suspense fallback={<PageLoader />}><BoardDetail /></Suspense>} />
              <Route path="contact" element={<Contact />} />
              <Route path="admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
              <Route path="admin/members" element={<Suspense fallback={<PageLoader />}><AdminMembers /></Suspense>} />
              <Route path="admin/weekly-math" element={<Suspense fallback={<PageLoader />}><AdminWeeklyMath /></Suspense>} />
              <Route path="admin/weekly-math/preview" element={<Suspense fallback={<PageLoader />}><AdminWeeklyMathPreview /></Suspense>} />
              {/* 404 fallback */}
              <Route
                path="*"
                element={
                  <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="apple-hero text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">404</h1>
                      <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-8">
                        ページが見つかりません
                      </p>
                      <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0071E3] text-white font-medium hover:bg-[#0077ED] transition-colors"
                      >
                        ホームに戻る
                      </a>
                    </div>
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
