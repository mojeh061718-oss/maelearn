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
}
@keyframes popIn {
  0% { transform: scale(0.3); opacity: 0; }
  70% { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(calc(-10 * var(--lu, 1px))); }
}
@keyframes bounceStone {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(calc(-12 * var(--lu, 1px))); }
}
@keyframes confettiFall {
  0% { transform: translateY(calc(-80 * var(--lu, 1px))) rotate(0); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0.8; }
}
@keyframes sunSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
.sticker { filter: drop-shadow(3px 0 0 #FFF) drop-shadow(-3px 0 0 #FFF) drop-shadow(0 3px 0 #FFF) drop-shadow(0 -3px 0 #FFF) drop-shadow(0 6px 5px rgba(0,0,0,0.22)); }
`;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
