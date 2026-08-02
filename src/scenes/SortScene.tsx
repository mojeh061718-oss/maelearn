// Sort scene — drag items into bins. DOM drag with pointer capture on the
// card itself (ADR-004: PointerInput is reserved for the ink surface).

import { useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { shuffle } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';

interface SortParams {
  criterion: string;
  bins: { id: string; label: string; icon: string }[];
  items: { icon: string; bin: string; say?: string }[];
}

export default function SortScene({ activity, onComplete, onMiss }: SceneProps) {
  const params = activity.params as SortParams;
  const [items] = useState(() => shuffle(params.items.map((it, i) => ({ ...it, id: i }))));
  const [placed, setPlaced] = useState<Set<number>>(new Set());
  const binRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function onDragEnd(id: number, itemBin: string, clientX: number, clientY: number): boolean {
    for (const b of params.bins) {
      const bel = binRefs.current[b.id];
      if (!bel) continue;
      const r = bel.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        if (b.id === itemBin) {
          playSfx('pop');
          burstAtElement(bel, 12);
          const next = new Set(placed); next.add(id);
          setPlaced(next);
          if (next.size === items.length) {
            playSfx('great');
            setTimeout(() => onComplete({ assisted: false }), 700);
          }
          return true;
        }
        onMiss();
        playSfx('oops');
        speak('Hmm, try the other one!');
        return false;
      }
    }
    return false;
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* bins */}
      <div style={{
        position: 'absolute', top: 'calc(120 * var(--lu))', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 'calc(60 * var(--lu))',
      }}>
        {params.bins.map((b) => (
          <div key={b.id} ref={(el) => { binRefs.current[b.id] = el; }}
            style={{
              width: 'calc(220 * var(--lu))', height: 'calc(200 * var(--lu))',
              borderRadius: 'calc(28 * var(--lu))',
              background: '#FFFFFF',
              border: 'calc(6 * var(--lu)) dashed #C9B896',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 'calc(6 * var(--lu))',
            }}>
            <span style={{ fontSize: 'calc(70 * var(--lu))', fontWeight: 800, color: '#3D348B' }}>{b.icon}</span>
            <span style={{ fontSize: 'calc(26 * var(--lu))', fontWeight: 700, color: '#666' }}>{b.label}</span>
            <span style={{ fontSize: 'calc(30 * var(--lu))' }}>
              {items.filter((it) => placed.has(it.id) && it.bin === b.id).map((it) => it.icon).join(' ')}
            </span>
          </div>
        ))}
      </div>
      {/* draggable items */}
      <div style={{
        position: 'absolute', bottom: 'calc(60 * var(--lu))', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 'calc(24 * var(--lu))', flexWrap: 'wrap',
      }}>
        {items.filter((it) => !placed.has(it.id)).map((it) => (
          <Draggable key={it.id} icon={it.icon} say={it.say}
            onDrop={(x, y) => onDragEnd(it.id, it.bin, x, y)} />
        ))}
      </div>
    </div>
  );
}

function Draggable(props: { icon: string; say?: string; onDrop: (x: number, y: number) => boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const start = useRef({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY };
        setDrag({ dx: 0, dy: 0 });
        playSfx('tap');
        if (props.say) speak(props.say);
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        setDrag({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y });
      }}
      onPointerUp={(e) => {
        if (!drag || !ref.current) return;
        const ok = props.onDrop(e.clientX, e.clientY);
        if (!ok) setDrag(null); // springs back via transition
        else setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
      style={{
        width: 'calc(110 * var(--lu))', height: 'calc(110 * var(--lu))',
        borderRadius: 'calc(24 * var(--lu))',
        background: '#FFFFFF',
        boxShadow: '0 calc(5 * var(--lu)) 0 rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'calc(64 * var(--lu))',
        transform: drag ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.15)` : 'translate(0,0)',
        transition: drag ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        touchAction: 'none',
        zIndex: drag ? 30 : 1,
        position: 'relative',
        cursor: 'grab',
      }}
    >
      {props.icon}
    </div>
  );
}
