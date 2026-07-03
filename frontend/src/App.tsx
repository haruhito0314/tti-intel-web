import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useTheme } from '@/contexts/useTheme';
import { ToastProvider } from '@/components/ui';
import { Layout } from '@/components/layout';
import {
  hasSeenInitialSplashThisSession,
  isMobileSplashDisabled,
  markInitialSplashSeenThisSession,
} from '@/lib/splashSettings';

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
import { TableTennisMatchMakerPage } from '@/pages/TableTennisMatchMaker';
import { ColorSortPuzzlePage } from '@/pages/ColorSortPuzzle';

// Lazy load: pages with Firebase SDK or heavy dependencies
const News = lazy(() => import('@/pages/News').then(m => ({ default: m.News })));
const NewsDetail = lazy(() => import('@/pages/NewsDetail').then(m => ({ default: m.NewsDetail })));
const WeeklyMath = lazy(() => import('@/pages/WeeklyMath').then(m => ({ default: m.WeeklyMath })));
const WeeklyMathDetail = lazy(() => import('@/pages/WeeklyMathDetail').then(m => ({ default: m.WeeklyMathDetail })));
const WeeklyMathSolution = lazy(() => import('@/pages/WeeklyMathSolution').then(m => ({ default: m.WeeklyMathSolution })));
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={`initial-splash ${isDark ? 'is-dark' : ''} ${phase === 'overlay-out' ? 'is-overlay-out' : ''}`}
      aria-hidden={phase === 'overlay-out'}
    >
      <section className={`initial-splash-scene ${phase !== 'enter' ? 'is-scene-out' : ''}`}>
        <div className="initial-splash-campus" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>

        <div className="initial-splash-tech" aria-hidden="true">
          <div className="initial-splash-arc initial-splash-arc-large" />
          <div className="initial-splash-arc initial-splash-arc-small" />
          <div className="initial-splash-hex initial-splash-hex-one" />
          <div className="initial-splash-hex initial-splash-hex-two" />
          <div className="initial-splash-hex initial-splash-hex-three" />
          <div className="initial-splash-node initial-splash-node-one" />
          <div className="initial-splash-node initial-splash-node-two" />
          <div className="initial-splash-dots" />
          <div className="initial-splash-scan" />
        </div>

        <div className="initial-splash-brand">
          <img
            src={isDark ? '/load-assets/tti-lockup-tagline.png' : '/load-assets/tti-lockup-tagline-navy.png'}
            alt="豊田工業大学 進むなら、足跡のない方へ。"
          />
        </div>

        <div className="initial-splash-progress" aria-label="Loading">
          <div className="initial-splash-progress-bar">
            <span />
          </div>
          <p className="initial-splash-progress-label">Loading...</p>
        </div>
      </section>
    </div>
  );
}

function App() {
  const SPLASH_MIN_MS = 2200;
  const OVERLAY_FADE_MS = 420;

  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !isMobileSplashDisabled() && !hasSeenInitialSplashThisSession();
  });
  const [splashPhase, setSplashPhase] = useState<'enter' | 'logo-out' | 'overlay-out'>('enter');

  useEffect(() => {
    if (!showSplash) return;
    markInitialSplashSeenThisSession();
    let firstFrameId = 0;
    let secondFrameId = 0;
    let hideTimer = 0;
    let readyTimer = 0;
    let isLoadComplete = document.readyState === 'complete';
    let hasMinTimeElapsed = false;

    const finishSplash = () => {
      firstFrameId = window.requestAnimationFrame(() => {
        secondFrameId = window.requestAnimationFrame(() => {
          setSplashPhase('overlay-out');
          hideTimer = window.setTimeout(() => {
            setShowSplash(false);
          }, OVERLAY_FADE_MS);
        });
      });
    };

    const tryFinishSplash = () => {
      if (isLoadComplete && hasMinTimeElapsed) {
        finishSplash();
      }
    };

    const markLoadComplete = () => {
      isLoadComplete = true;
      tryFinishSplash();
    };

    readyTimer = window.setTimeout(() => {
      hasMinTimeElapsed = true;
      tryFinishSplash();
    }, SPLASH_MIN_MS);

    if (isLoadComplete) {
      tryFinishSplash();
    } else {
      window.addEventListener('load', markLoadComplete, { once: true });
    }

    return () => {
      window.removeEventListener('load', markLoadComplete);
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
      window.clearTimeout(readyTimer);
      window.clearTimeout(hideTimer);
    };
  }, [showSplash, SPLASH_MIN_MS, OVERLAY_FADE_MS]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    if (showSplash) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    } else {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
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
              <Route path="weekly-math" element={<Suspense fallback={<PageLoader />}><WeeklyMath /></Suspense>} />
              <Route path="weekly-math/:weekKey" element={<Suspense fallback={<PageLoader />}><WeeklyMathDetail /></Suspense>} />
              <Route path="weekly-math/:weekKey/solution" element={<Suspense fallback={<PageLoader />}><WeeklyMathSolution /></Suspense>} />
              <Route path="news" element={<Suspense fallback={<PageLoader />}><News /></Suspense>} />
              <Route path="news/:slug" element={<Suspense fallback={<PageLoader />}><NewsDetail /></Suspense>} />
              <Route path="app" element={<AppShowcase />} />
              <Route path="app/table-tennis" element={<TableTennisMatchMakerPage />} />
              <Route path="app/color-sort" element={<ColorSortPuzzlePage />} />
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
