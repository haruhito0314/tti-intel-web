import { defineConfig, normalizePath } from 'vite';
import { fileURLToPath } from 'node:url';
import frontendConfig from '../frontend/vite.config';
import { replaceActivityPhotos } from './activity-photos';

const frontend = fileURLToPath(new URL('../frontend/', import.meta.url));
const aboutPage = normalizePath(`${frontend}src/pages/About.tsx`);

export default defineConfig({
  ...frontendConfig,
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: `${frontend}public`,
  envDir: frontend,
  plugins: [
    {
      name: 'preview-activity-photographs',
      enforce: 'pre',
      transform(code, id) {
        if (normalizePath(id.split('?')[0]) !== aboutPage) return null;
        return { code: replaceActivityPhotos(code), map: null };
      },
    },
    ...(frontendConfig.plugins ?? []),
  ],
  resolve: {
    ...frontendConfig.resolve,
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
});
