import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useTheme } from '@/contexts/useTheme';
import { ToastProvider } from '@/components/ui';
import { Layout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { markInitialSplashSeen, shouldShowInitialSplash } from '@/lib/splashSettings';

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
import { GameCommunity } from '@/pages/GameCommunity';
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
const Development = lazy(() => import('@/pages/Development').then(m => ({ default: m.Development })));
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

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

function InitialSplash({
  isFadingOut,
  progress,
}: {
  isFadingOut: boolean;
  progress: number;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const roundedProgress = Math.min(100, Math.round(progress));

  return (
    <div
      className={`initial-splash ${isDark ? 'is-dark' : ''} ${isFadingOut ? 'is-overlay-out' : ''}`}
      aria-hidden={isFadingOut}
    >
      <section className="initial-splash-scene">
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

        <div
          className="initial-splash-progress"
          role="progressbar"
          aria-valuenow={roundedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="読み込み中"
        >
          <div className="initial-splash-progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="initial-splash-progress-label">Loading... {roundedProgress}%</p>
        </div>
      </section>
    </div>
  );
}

const SPLASH_MIN_MS = 2200;
const OVERLAY_FADE_MS = 420;

function App() {
  const [showSplash, setShowSplash] = useState(() => shouldShowInitialSplash());
  const [isSplashFadingOut, setIsSplashFadingOut] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);

  useEffect(() => {
    if (!showSplash) return;
    markInitialSplashSeen();
    let rafId = 0;
    let hideTimer = 0;
    let hasFinished = false;
    const startTime = performance.now();
    let isLoadComplete = document.readyState === 'complete';

    const finishSplash = () => {
      if (hasFinished) return;
      hasFinished = true;
      setSplashProgress(100);
      setIsSplashFadingOut(true);
      hideTimer = window.setTimeout(() => {
        setShowSplash(false);
      }, OVERLAY_FADE_MS);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      setSplashProgress(easeOutCubic(Math.min(1, elapsed / SPLASH_MIN_MS)) * 100);

      if (elapsed >= SPLASH_MIN_MS && isLoadComplete) {
        finishSplash();
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const markLoadComplete = () => {
      isLoadComplete = true;
    };

    rafId = window.requestAnimationFrame(tick);

    if (!isLoadComplete) {
      window.addEventListener('load', markLoadComplete, { once: true });
    }

    return () => {
      window.removeEventListener('load', markLoadComplete);
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(hideTimer);
    };
  }, [showSplash]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;

    if (!showSplash) return;

    html.classList.add('splash-scroll-lock');
    body.classList.add('splash-scroll-lock');

    return () => {
      html.classList.remove('splash-scroll-lock');
      body.classList.remove('splash-scroll-lock');
    };
  }, [showSplash]);

  return (
    <ThemeProvider>
      <ToastProvider>
        {showSplash && <InitialSplash isFadingOut={isSplashFadingOut} progress={splashProgress} />}
        <ErrorBoundary>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="game-community" element={<GameCommunity />} />
              <Route path="weekly-math" element={<Suspense fallback={<PageLoader />}><WeeklyMath /></Suspense>} />
              <Route path="weekly-math/:weekKey" element={<Suspense fallback={<PageLoader />}><WeeklyMathDetail /></Suspense>} />
              <Route path="weekly-math/:weekKey/solution" element={<Suspense fallback={<PageLoader />}><WeeklyMathSolution /></Suspense>} />
              <Route path="news" element={<Suspense fallback={<PageLoader />}><News /></Suspense>} />
              <Route path="news/:slug" element={<Suspense fallback={<PageLoader />}><NewsDetail /></Suspense>} />
              <Route path="app" element={<AppShowcase />} />
              <Route path="development" element={<Suspense fallback={<PageLoader />}><Development /></Suspense>} />
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
                      <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0071E3] text-white font-medium hover:bg-[#0077ED] transition-colors"
                      >
                        ホームに戻る
                      </Link>
                    </div>
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
