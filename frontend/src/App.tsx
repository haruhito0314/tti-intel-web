import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui';
import { Layout } from '@/components/layout';
import { Home, About, News, NewsDetail, Board, BoardDetail, Contact, Admin } from '@/pages';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="news" element={<News />} />
              <Route path="news/:slug" element={<NewsDetail />} />
              <Route path="board" element={<Board />} />
              <Route path="board/:id" element={<BoardDetail />} />
              <Route path="contact" element={<Contact />} />
              <Route path="admin" element={<Admin />} />
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
