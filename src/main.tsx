import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';

// global keyframes used by scenes (wiggle = gentle wrong-answer feedback)
const style = document.createElement('style');
style.textContent = `
@keyframes wiggle {
  0%, 100% { transform: translateX(0) rotate(0); }
  25% { transform: translateX(calc(-6 * var(--lu, 1px))) rotate(-2deg); }
  75% { transform: translateX(calc(6 * var(--lu, 1px))) rotate(2deg); }
}`;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
