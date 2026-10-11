// Ensure window.fetch has a writable setter to prevent "Cannot set property fetch of #<Window> which has only a getter" errors from polyfills
(function () {
  try {
    if (typeof window !== 'undefined' && 'fetch' in window) {
      let currentFetch = window.fetch;
      Object.defineProperty(window, 'fetch', {
        get: () => currentFetch,
        set: (v) => {
          currentFetch = v;
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch {
    // Already defined or non-configurable
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
