import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js');
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Корневой элемент приложения не найден');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
