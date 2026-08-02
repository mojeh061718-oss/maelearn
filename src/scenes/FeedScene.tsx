// Feed game — a hungry Kenney animal asks for something; drag the right
// item to its mouth. Listening comprehension + vocabulary/sounds/quantity.

import { useEffect, useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { art, shuffle } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';
import { Dots } from '../ui/common';

interface FeedRound { say: string; answer: { icon: string; word?: string }; wrong: { icon: string }[] }
interface FeedParams { animal: string; name: string; rounds: FeedRound[] }

export default function FeedScene({ activity, onComplete, onMiss }: SceneProps) {
  const params = activity.params as FeedParams;
  const [ri, setRi] = useState(0);
  const [choices, setChoices] = useState<{ icon: string; right: boolean }[]>([]);
  const [munch, setMunch] = useState(false);
  const animalRef = useRef<HTMLDivElement>(null);
  const round = params.rounds[ri];

  useEffect(() => {
    setChoices(shuffle([{ icon: round.answer.icon, right: true }, ...round.wrong.map((w) => ({ icon: w.icon, right: false }))]));
    const t = setTimeout(() => speak(round.say), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ri]);

  function dropOn(x: number, y: number, right: boolean): boolean {
    const a = animalRef.current;
    if (!a) return false;
    const r = a.getBoundingClientRect();
    const inside = x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 20 && y <= r.bottom + 20;
    if (!inside) return false;
    if (right) {
      playSfx('chomp');
      setMunch(true);
      burstAtElement(a, 16);
      setTimeout(() => setMunch(false), 500);
      speak('Yum yum yum! Thank you!');
      if (ri + 1 < params.rounds.length) setTimeout(() => setRi(ri + 1), 1400);
      else {
        playSfx('great');
        setTimeout(() => onComplete({ assisted: false }), 1200);
      }
      return true;
    }
    onMiss();
    playSfx('oops');
    speak('No no, listen again!');
    setTimeout(() => speak(round.say), 1200);
    return false;
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', top: 'calc(24 * var(--lu))', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Dots total={params.rounds.length} done={ri} />
      </div>
      {/* replay speaker */}
      <div onClick={() => speak(round.say)} style={{
        position: 'absolute', top: 'calc(60 * var(--lu))', left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100 * var(--lu))', height: 'calc(100 * var(--lu))', borderRadius: '50%',
        background: '#FFD166', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'calc(48 * var(--lu))', boxShadow: '0 calc(5 * var(--lu)) 0 rgba(0,0,0,0.15)',
        cursor: 'pointer', touchAction: 'none', zIndex: 5,
      }}>🔊</div>
      {/* the hungry animal */}
      <div ref={animalRef} style={{
        position: 'absolute', bottom: 'calc(40 * var(--lu))', left: '50%',
        transform: `translateX(-50%) scale(${munch ? 1.15 : 1})`,
        transition: 'transform 0.25s cubic-bezier(0.34, 1.8, 0.64, 1)',
        textAlign: 'center',
      }}>
        <img src={art(params.animal)} alt={params.name} draggable={false} style={{
          width: 'calc(300 * var(--lu))', height: 'calc(300 * var(--lu))',
          objectFit: 'contain', pointerEvents: 'none',
          filter: 'drop-shadow(0 calc(8 * var(--lu)) calc(6 * var(--lu)) rgba(0,0,0,0.15))',
        }} />
        <div style={{ fontSize: 'calc(34 * var(--lu))', fontWeight: 700, color: '#3D348B' }}>{params.name}</div>
      </div>
      {/* draggable choices */}
      <div style={{
        position: 'absolute', top: 'calc(200 * var(--lu))', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 'calc(50 * var(--lu))',
      }}>
        {choices.map((c, i) => <DragItem key={`${ri}-${i}`} icon={c.icon} onDrop={(x, y) => dropOn(x, y, c.right)} />)}
      </div>
    </div>
  );
}

function DragItem(props: { icon: string; onDrop: (x: number, y: number) => boolean }) {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [gone, setGone] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  if (gone) return null;
  return (
    <div
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY };
        setDrag({ dx: 0, dy: 0 });
        playSfx('tap');
      }}
      onPointerMove={(e) => { if (drag) setDrag({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y }); }}
      onPointerUp={(e) => {
        if (!drag) return;
        const ok = props.onDrop(e.clientX, e.clientY);
        if (ok) setGone(true);
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
      style={{
        minWidth: 'calc(130 * var(--lu))', height: 'calc(130 * var(--lu))',
        padding: '0 calc(14 * var(--lu))',
        borderRadius: 'calc(28 * var(--lu))', background: '#FFFFFF',
        boxShadow: '0 calc(6 * var(--lu)) 0 rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'calc(60 * var(--lu))',
        transform: drag ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.2)` : 'none',
        transition: drag ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        touchAction: 'none', cursor: 'grab', zIndex: drag ? 30 : 1, position: 'relative',
      }}>
      {props.icon}
    </div>
  );
}
