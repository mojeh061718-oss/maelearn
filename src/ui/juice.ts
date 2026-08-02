// BLUEPRINT §9 — juice the interaction the child just performed, never the
// background. Particle bursts on a dedicated overlay canvas; short-lived,
// event-triggered only.

import { getViewport, fitCanvasToBody, applyLogicalTransform, onViewportChange } from '../core/viewport';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number; shape: 'dot' | 'star';
}

const COLORS = ['#FF6B6B', '#FFD166', '#06D6A0', '#5BC0EB', '#9B5DE5', '#F3A712'];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let raf = 0;

function ensure(): void {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '50';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const vp = getViewport();
  fitCanvasToBody(canvas, vp);
  if (ctx) applyLogicalTransform(ctx, vp);
  onViewportChange((v) => {
    if (canvas && ctx) { fitCanvasToBody(canvas, v); applyLogicalTransform(ctx, v); }
  });
}

function tick(): void {
  raf = 0;
  if (!ctx || !canvas) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.life -= 1;
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.shape === 'star') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 0.2);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if (particles.length) raf = requestAnimationFrame(tick);
}

/** Burst at a logical-space point. */
export function burst(lx: number, ly: number, count = 18): void {
  ensure();
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: lx, y: ly,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 4,
      life: 30 + Math.random() * 20, maxLife: 50,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      shape: Math.random() > 0.5 ? 'star' : 'dot',
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

/** Burst at the centre of a DOM element (converts through the viewport). */
export function burstAtElement(el: Element, count = 18): void {
  const r = el.getBoundingClientRect();
  const vp = getViewport();
  const { x, y } = vp.toLogical(r.left + r.width / 2, r.top + r.height / 2);
  burst(x, y, count);
}
