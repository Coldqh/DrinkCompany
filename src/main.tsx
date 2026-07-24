import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';
import './styles/mobile-overhaul.css';
import './styles/luxury-ui.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('Service worker не зарегистрирован', error));
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Корневой элемент приложения не найден');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
