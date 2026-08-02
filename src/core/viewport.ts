// BLUEPRINT §4 — single logical coordinate space, 1024×768, fit-and-letterbox.
// Every canvas and every pointer sample goes through this one transform.

export const LOGICAL_W = 1024;
export const LOGICAL_H = 768;

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
  dpr: number;
  cssW: number;
  cssH: number;
  toLogical(clientX: number, clientY: number): { x: number; y: number };
  toCss(lx: number, ly: number): { x: number; y: number };
}

export function computeViewport(vw: number, vh: number): Viewport {
  const scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
  const cssW = LOGICAL_W * scale;
  const cssH = LOGICAL_H * scale;
  const offsetX = (vw - cssW) / 2;
  const offsetY = (vh - cssH) / 2;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return {
    scale, offsetX, offsetY, dpr, cssW, cssH,
    toLogical(clientX, clientY) {
      return { x: (clientX - offsetX) / scale, y: (clientY - offsetY) / scale };
    },
    toCss(lx, ly) {
      return { x: lx * scale + offsetX, y: ly * scale + offsetY };
    },
  };
}

type Listener = (vp: Viewport) => void;
const listeners = new Set<Listener>();
let current: Viewport = computeViewport(window.innerWidth, window.innerHeight);

function refresh() {
  current = computeViewport(window.innerWidth, window.innerHeight);
  listeners.forEach((l) => l(current));
}
window.addEventListener('resize', refresh);
window.addEventListener('orientationchange', () => setTimeout(refresh, 50));

export function getViewport(): Viewport { return current; }
export function onViewportChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * Size a canvas's backing store + CSS box to exactly cover the logical stage.
 * IMPORTANT: canvases live INSIDE the stage container, which is already
 * positioned at (offsetX, offsetY) — so the canvas itself sits at 0,0.
 * Applying the offset here too shifts ink away from the finger (the M0.5 bug).
 */
export function fitCanvas(canvas: HTMLCanvasElement, vp: Viewport): void {
  canvas.width = Math.round(LOGICAL_W * vp.scale * vp.dpr);
  canvas.height = Math.round(LOGICAL_H * vp.scale * vp.dpr);
  canvas.style.width = `${vp.cssW}px`;
  canvas.style.height = `${vp.cssH}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = '0px';
  canvas.style.top = '0px';
}

/** Same, but for a canvas attached to document.body (e.g. the particle layer). */
export function fitCanvasToBody(canvas: HTMLCanvasElement, vp: Viewport): void {
  fitCanvas(canvas, vp);
  canvas.style.left = `${vp.offsetX}px`;
  canvas.style.top = `${vp.offsetY}px`;
}

/** Set the ctx transform so drawing code works in logical units. */
export function applyLogicalTransform(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  ctx.setTransform(vp.scale * vp.dpr, 0, 0, vp.scale * vp.dpr, 0, 0);
}
