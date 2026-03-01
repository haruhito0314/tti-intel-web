import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui';
import { Layout } from '@/components/layout';

// Eager load: lightweight pages without heavy dependencies
import { Home } from '@/pages/Home';
import { About } from '@/pages/About';
import { Contact } from '@/pages/Contact';

// Lazy load: pages with Firebase SDK or heavy dependencies
const News = lazy(() => import('@/pages/News').then(m => ({ default: m.News })));
const NewsDetail = lazy(() => import('@/pages/NewsDetail').then(m => ({ default: m.NewsDetail })));
const Board = lazy(() => import('@/pages/Board').then(m => ({ default: m.Board })));
const BoardDetail = lazy(() => import('@/pages/BoardDetail').then(m => ({ default: m.BoardDetail })));
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark">読み込み中...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="news" element={<Suspense fallback={<PageLoader />}><News /></Suspense>} />
              <Route path="news/:slug" element={<Suspense fallback={<PageLoader />}><NewsDetail /></Suspense>} />
              <Route path="board" element={<Suspense fallback={<PageLoader />}><Board /></Suspense>} />
              <Route path="board/:id" element={<Suspense fallback={<PageLoader />}><BoardDetail /></Suspense>} />
              <Route path="contact" element={<Contact />} />
              <Route path="admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
              {/* 404 fallback */}
              <Route
                path="*"
                element={
                  <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
                      <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8">
                        ページが見つかりません
                      </p>
                      <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-bg text-white font-medium"
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
