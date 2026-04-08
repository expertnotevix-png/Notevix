import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
