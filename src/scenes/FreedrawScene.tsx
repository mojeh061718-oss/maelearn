// Freedraw — BLUEPRINT §7: no scoring, no completion state. The one activity
// that cannot be failed or finished.

import { useEffect, useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { PointerInput } from '../core/input';
import { InkLayer } from '../core/ink';
import { getViewport, onViewportChange } from '../core/viewport';
import { playSfx } from '../core/audio';

interface FreedrawParams { palette: string[]; stamps: string[] }

export default function FreedrawScene({ activity }: SceneProps) {
  const params = activity.params as FreedrawParams;
  const hostRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<InkLayer | null>(null);
  const [color, setColor] = useState(params.palette[0]);
  const [stamp, setStamp] = useState<string | null>(null);
  const stampRef = useRef<string | null>(null);
  stampRef.current = stamp;
  const [stamps, setStamps] = useState<{ icon: string; x: number; y: number }[]>([]);

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    const ink = new InkLayer(host, getViewport());
    inkRef.current = ink;
    const offVp = onViewportChange((v) => ink.resize(v));

    const surface = document.createElement('div');
    surface.style.position = 'absolute';
    surface.style.inset = '0';
    host.appendChild(surface);
    const input = new PointerInput(surface);
    input.subscribe({
      onStrokeStart: (s) => {
        if (stampRef.current) {
          setStamps((prev) => [...prev, { icon: stampRef.current!, x: s.x, y: s.y }]);
          playSfx('pop');
          return;
        }
        ink.beginStroke(s);
      },
      onStrokeMove: (samples) => { if (!stampRef.current) ink.extendStroke(samples); },
      onStrokeEnd: (all) => { if (!stampRef.current) ink.endStroke(all); },
    });

    return () => { offVp(); input.destroy(); ink.destroy(); surface.remove(); };
  }, []);

  useEffect(() => { inkRef.current?.setColor(color); }, [color]);

  const chip = (active: boolean): React.CSSProperties => ({
    width: 'calc(88 * var(--lu))', height: 'calc(88 * var(--lu))',
    borderRadius: '50%',
    border: active ? 'calc(7 * var(--lu)) solid #3D348B' : 'calc(7 * var(--lu)) solid #FFFFFF',
    boxShadow: '0 calc(4 * var(--lu)) 0 rgba(0,0,0,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 'calc(48 * var(--lu))',
    cursor: 'pointer', touchAction: 'none',
    transition: 'transform 0.15s',
    transform: active ? 'scale(1.12)' : 'scale(1)',
  });

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      {/* placed stamps live above ink, below toolbars */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {stamps.map((s, i) => {
          const vp = getViewport();
          const css = vp.toCss(s.x, s.y);
          return (
            <span key={i} style={{
              position: 'fixed', left: css.x, top: css.y, transform: 'translate(-50%, -50%)',
              fontSize: 'calc(70 * var(--lu))',
            }}>{s.icon}</span>
          );
        })}
      </div>
      {/* palette — right edge */}
      <div style={{
        position: 'absolute', right: 'calc(14 * var(--lu))', top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 'calc(12 * var(--lu))', zIndex: 10,
      }}>
        {params.palette.map((c) => (
          <div key={c} style={{ ...chip(color === c && !stamp), background: c }}
            onClick={() => { setStamp(null); setColor(c); playSfx('tap'); }} />
        ))}
        {params.stamps.map((s) => (
          <div key={s} style={{ ...chip(stamp === s), background: '#FFF' }}
            onClick={() => { setStamp(stamp === s ? null : s); playSfx('tap'); }}>{s}</div>
        ))}
      </div>
      {/* undo / clear — bottom left, literal icons */}
      <div style={{
        position: 'absolute', left: 'calc(14 * var(--lu))', bottom: 'calc(14 * var(--lu))',
        display: 'flex', gap: 'calc(12 * var(--lu))', zIndex: 10,
      }}>
        <div style={{ ...chip(false), background: '#FFF' }} onClick={() => { inkRef.current?.undo(); playSfx('whoosh'); }}>↩️</div>
        <div style={{ ...chip(false), background: '#FFF' }} onClick={() => { inkRef.current?.clear(); setStamps([]); playSfx('whoosh'); }}>🗑️</div>
      </div>
    </div>
  );
}
