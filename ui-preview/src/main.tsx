import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../frontend/src/App';
import './preview.css';
import { activityPhotos } from '../activity-photos';
import { markInitialSplashSeen } from '../../frontend/src/lib/splashSettings';

function PreviewTools() {
  const [showSources, setShowSources] = useState(false);
  return (
    <>
      <aside className="preview-tools" aria-label="プレビューの案内">
        <span>デザインプレビュー</span>
        <div>
          <button type="button" onClick={() => setShowSources(!showSources)} aria-expanded={showSources} aria-controls="preview-photo-sources">
            写真の出典
          </button>
          <a href="https://tti-intel.com/about/" target="_blank" rel="noreferrer">現行サイト ↗</a>
        </div>
      </aside>
      {showSources && (
        <section id="preview-photo-sources" className="preview-sources" aria-label="写真の出典">
          <p>活動のイメージ写真です。実際のメンバーを撮影した写真ではありません。</p>
          <ul>
            {activityPhotos.map((photo) => (
              <li key={photo.key}>
                <a href={photo.source} target="_blank" rel="noreferrer">{photo.title} — {photo.photographer} ↗</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root was not found');
markInitialSplashSeen();

createRoot(root).render(
  <StrictMode>
    <PreviewTools />
    <App />
  </StrictMode>,
);
