// BLUEPRINT §15 / HANDOFF M0 — the device truth-check page, shipped inside the
// app (parent-gated). Run this on the target iPad and record docs/M0-RESULTS.md.

import { useEffect, useRef, useState } from 'react';
import { audioDiagnostics, playSfx, resumeAudio, speak } from '../core/audio';
import { requestPersistence } from '../core/storage';

export default function M0Page({ onBack }: { onBack: () => void }) {
  const [log, setLog] = useState<string[]>([]);
  const padRef = useRef<HTMLDivElement>(null);
  const stats = useRef({ moves: 0, coalesced: 0, t0: 0, rate: 0 });

  const add = (s: string) => setLog((l) => [...l.slice(-30), s]);

  useEffect(() => {
    add(`UA: ${navigator.userAgent}`);
    add(`standalone: ${(navigator as unknown as { standalone?: boolean }).standalone ?? matchMedia('(display-mode: standalone)').matches}`);
    add(`getCoalescedEvents in PointerEvent.prototype: ${'getCoalescedEvents' in PointerEvent.prototype}`);
    add(`getPredictedEvents in PointerEvent.prototype: ${'getPredictedEvents' in PointerEvent.prototype}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = padRef.current;
    if (!el) return;
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      stats.current = { moves: 0, coalesced: 0, t0: performance.now(), rate: 0 };
    };
    const move = (e: PointerEvent) => {
      const st = stats.current;
      st.moves += 1;
      st.coalesced += e.getCoalescedEvents?.().length ?? 1;
    };
    const up = () => {
      const st = stats.current;
      const dt = (performance.now() - st.t0) / 1000;
      if (dt > 0.05) {
        add(`Q1 drag: ${st.moves} pointermove in ${dt.toFixed(2)}s (${(st.moves / dt).toFixed(0)}/s), coalesced samples: ${st.coalesced} (${(st.coalesced / dt).toFixed(0)}/s)`);
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const btn: React.CSSProperties = {
    padding: '14px 18px', borderRadius: 12, border: 'none', background: '#5BC0EB',
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: '#fff', padding: 16, fontFamily: 'monospace', fontSize: 13, touchAction: 'pan-y', zIndex: 100 }}>
      <button style={{ ...btn, background: '#FF6B6B' }} onClick={onBack}>← back</button>
      <h2>M0 device truth-check</h2>
      <p><b>Q1/Q2:</b> drag fast in the box below (finger, then Pencil if available).</p>
      <div ref={padRef} style={{ height: 180, background: '#EAF6FF', borderRadius: 12, touchAction: 'none', marginBottom: 12 }} />
      <p><b>Q3 audio:</b> flip the ringer switch to silent and test again; wait 6s between the two beep tests to check re-suspend.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button style={btn} onClick={() => { resumeAudio(); playSfx('good'); add(`beep at ctx.state=${audioDiagnostics().state}`); }}>beep now</button>
        <button style={btn} onClick={() => { add(`ctx.state=${audioDiagnostics().state}`); }}>ctx.state?</button>
        <button style={btn} onClick={() => { setTimeout(() => { add(`after 6s idle: ctx.state=${audioDiagnostics().state}`); playSfx('good'); }, 6000); add('waiting 6s…'); }}>beep after 6s idle</button>
        <button style={btn} onClick={() => speak('Hello Maelie! This is the voice test.')}>speak test</button>
      </div>
      <p><b>Q4 storage:</b></p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button style={btn} onClick={async () => {
          const p = await requestPersistence();
          const persisted = await navigator.storage?.persisted?.();
          const est = await navigator.storage?.estimate?.();
          add(`persist()=${p} persisted()=${persisted} quota=${est?.quota ? (est.quota / 1e9).toFixed(1) + 'GB' : '?'} usage=${est?.usage}`);
        }}>storage.persist()</button>
      </div>
      <h3>log</h3>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 8, borderRadius: 8 }}>{log.join('\n')}</pre>
    </div>
  );
}
