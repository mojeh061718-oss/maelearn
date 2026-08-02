// BLUEPRINT §5.2 — one module owns pointer handling. Scenes subscribe;
// scenes never attach their own pointer listeners to the stroke surface.
// getCoalescedEvents / getPredictedEvents are feature-detected with a
// single-event fallback so the app still runs (degraded) pre-18.2.

import { getViewport } from './viewport';

export interface Sample {
  x: number;
  y: number;
  pressure: number;
  t: number;
  type: 'touch' | 'pen' | 'mouse';
}

export interface StrokeEvents {
  onStrokeStart(s: Sample): void;
  onStrokeMove(samples: Sample[], predicted: Sample[]): void;
  onStrokeEnd(all: Sample[]): void;
}

function toSample(e: PointerEvent): Sample {
  const { x, y } = getViewport().toLogical(e.clientX, e.clientY);
  return {
    x, y,
    pressure: e.pressure || 0.5,
    t: e.timeStamp,
    type: e.pointerType === 'pen' ? 'pen' : e.pointerType === 'mouse' ? 'mouse' : 'touch',
  };
}

export interface PointerInputOptions {
  /** Pencil-only mode (palm rejection). Default false: finger is primary (§5.2). */
  penOnly?: boolean;
}

export class PointerInput {
  private el: HTMLElement;
  private handlers: StrokeEvents | null = null;
  private activeId: number | null = null;
  private buffer: Sample[] = [];
  private opts: PointerInputOptions;
  private down = (e: PointerEvent) => this.onDown(e);
  private move = (e: PointerEvent) => this.onMove(e);
  private up = (e: PointerEvent) => this.onUp(e);
  private cancel = (e: PointerEvent) => this.onUp(e); // §5.2: cancel == end, never dangle

  constructor(el: HTMLElement, opts: PointerInputOptions = {}) {
    this.el = el;
    this.opts = opts;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.cancel);
  }

  subscribe(h: StrokeEvents): void { this.handlers = h; }

  private accepts(e: PointerEvent): boolean {
    if (this.opts.penOnly) return e.pointerType === 'pen';
    return true;
  }

  private onDown(e: PointerEvent): void {
    if (!this.accepts(e) || this.activeId !== null || !this.handlers) return;
    this.activeId = e.pointerId;
    this.el.setPointerCapture(e.pointerId);
    const s = toSample(e);
    this.buffer = [s];
    this.handlers.onStrokeStart(s);
  }

  private onMove(e: PointerEvent): void {
    if (e.pointerId !== this.activeId || !this.handlers) return;
    // Feature-detect coalesced/predicted events (Safari 18.2+); fall back to single.
    const raw: PointerEvent[] = (e.getCoalescedEvents?.() ?? []).length
      ? e.getCoalescedEvents!()
      : [e];
    const samples = raw.map(toSample);
    this.buffer.push(...samples);
    const predicted = (e.getPredictedEvents?.() ?? []).map(toSample);
    this.handlers.onStrokeMove(samples, predicted);
  }

  private onUp(e: PointerEvent): void {
    if (e.pointerId !== this.activeId || !this.handlers) return;
    this.activeId = null;
    try { this.el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    const all = this.buffer;
    this.buffer = [];
    this.handlers.onStrokeEnd(all);
  }

  destroy(): void {
    this.el.removeEventListener('pointerdown', this.down);
    this.el.removeEventListener('pointermove', this.move);
    this.el.removeEventListener('pointerup', this.up);
    this.el.removeEventListener('pointercancel', this.cancel);
    this.handlers = null;
  }
}
