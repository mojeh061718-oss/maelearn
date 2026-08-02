import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './app/App';

// Update discipline for the installed PWA: check for a new service worker
// immediately on launch and every 60s while open; when a new one takes
// control of an already-controlled page, reload once so the child never
// runs a stale build. (First-ever install claims the page too — the
// hadController guard stops that from causing a boot-loop reload.)
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { void updateSW(true); },
  onRegisteredSW(_url, reg) {
    if (reg) setInterval(() => { void reg.update().catch(() => {}); }, 60_000);
  },
});
if ('serviceWorker' in navigator) {
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) location.reload();
    hadController = true;
  });
}

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
