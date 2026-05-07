import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Handle Vite's dynamic import errors (e.g. after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
  console.error('Vite preload error detected, reloading...', event);
  window.location.reload();
});

console.log("NoteVix: App starting...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("NoteVix: Root element not found!");
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
