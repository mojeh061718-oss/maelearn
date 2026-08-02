// BLUEPRINT §5.3 — ink on its own Canvas 2D layer, desynchronized where
// supported. Committed strokes stay put; only the live stroke redraws.

import { getStroke } from 'perfect-freehand';
import type { Sample } from './input';
import { fitCanvas, applyLogicalTransform, type Viewport, LOGICAL_W, LOGICAL_H } from './viewport';

// §5.3 starting options — chunky crayon, not a pen. Tune after M0.
const FINGER_OPTS = {
  size: 26,
  thinning: 0.35,
  smoothing: 0.6,
  streamline: 0.5,
  simulatePressure: true,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
};

export function strokeToPath(samples: Sample[], penPressure: boolean, size = 26): Path2D {
  const opts = penPressure ? { ...FINGER_OPTS, size, simulatePressure: false } : { ...FINGER_OPTS, size };
  const pts = samples.map((s) => [s.x, s.y, s.pressure] as [number, number, number]);
  const outline = getStroke(pts, opts);
  const p = new Path2D();
  if (!outline.length) return p;
  p.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) p.lineTo(outline[i][0], outline[i][1]);
  p.closePath();
  return p;
}

export class InkLayer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private committed: { path: Path2D; color: string }[] = [];
  private live: Sample[] = [];
  private liveColor = '#5B4FE9';
  private liveIsPen = false;
  private raf = 0;
  private dirty = false;
  size = 26;

  constructor(container: HTMLElement, vp: Viewport) {
    this.canvas = document.createElement('canvas');
    // desynchronized reduces ink latency where supported (research S14).
    const ctx =
      this.canvas.getContext('2d', { desynchronized: true }) ??
      this.canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    this.resize(vp);
    container.appendChild(this.canvas);
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (this.dirty) { this.dirty = false; this.repaint(); }
    };
    loop();
  }

  resize(vp: Viewport): void {
    fitCanvas(this.canvas, vp);
    applyLogicalTransform(this.ctx, vp);
    this.dirty = true;
  }

  setColor(c: string): void { this.liveColor = c; }

  beginStroke(s: Sample): void {
    this.live = [s];
    this.liveIsPen = s.type === 'pen';
    this.dirty = true;
  }

  extendStroke(samples: Sample[]): void {
    this.live.push(...samples);
    this.dirty = true;
  }

  /** Commit the live stroke and return its samples. */
  endStroke(all: Sample[]): Sample[] {
    if (all.length > 1) {
      this.committed.push({ path: strokeToPath(all, this.liveIsPen, this.size), color: this.liveColor });
    }
    this.live = [];
    this.dirty = true;
    return all;
  }

  undo(): void { this.committed.pop(); this.dirty = true; }
  clear(): void { this.committed = []; this.live = []; this.dirty = true; }

  private repaint(): void {
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.restore();
    // Note: committed strokes redraw only when dirty (a stroke ends / clear /
    // resize), not per pointer sample — the per-frame cost is the live stroke.
    for (const s of this.committed) { c.fillStyle = s.color; c.fill(s.path); }
    if (this.live.length > 1) {
      c.fillStyle = this.liveColor;
      c.fill(strokeToPath(this.live, this.liveIsPen, this.size));
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
  }
}

export { LOGICAL_W, LOGICAL_H };
