// Pop game — balloons drift upward; pop the ones carrying the target
// letter/number. The motion IS the mechanic, so it's not "ambient" animation.

import { useEffect, useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { shuffle } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';
import { Dots } from '../ui/common';

interface PopParams { kind: 'letter' | 'number'; target: string; decoys: string[]; need: number; say: string }

interface Balloon { id: number; label: string; x: number; dur: number; delay: number; color: string; popped: boolean }

const COLORS = ['#FF6B6B', '#FFD166', '#06D6A0', '#5BC0EB', '#9B5DE5', '#F3A712'];

export default function PopScene({ activity, onComplete, onMiss }: SceneProps) {
  const params = activity.params as PopParams;
  const [popped, setPopped] = useState(0);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const nextId = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    speak(params.say);
    // seed a steady stream: target appears ~40% of the time
    const make = (i: number): Balloon => {
      const isTarget = i % 5 < 2;
      const pool = isTarget ? [params.target] : params.decoys;
      return {
        id: nextId.current++,
        label: pool[Math.floor(Math.random() * pool.length)],
        x: 8 + Math.random() * 78,
        dur: 7 + Math.random() * 5,
        delay: (i % 6) * 1.4 + Math.random(),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        popped: false,
      };
    };
    setBalloons(shuffle(Array.from({ length: 12 }, (_, i) => make(i))));
    const iv = setInterval(() => {
      setBalloons((bs) => {
        const alive = bs.filter((b) => !b.popped).length;
        if (alive >= 10) return bs;
        return [...bs.slice(-24), make(Math.floor(Math.random() * 6))];
      });
    }, 2200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tapBalloon(b: Balloon, el: HTMLElement): void {
    if (b.popped || doneRef.current) return;
    if (b.label === params.target) {
      setBalloons((bs) => bs.map((x) => (x.id === b.id ? { ...x, popped: true } : x)));
      playSfx('balloon');
      burstAtElement(el, 16);
      const n = popped + 1;
      setPopped(n);
      if (n >= params.need) {
        doneRef.current = true;
        playSfx('great');
        speak('You popped them all!');
        setTimeout(() => onComplete({ assisted: false }), 900);
      }
    } else {
      onMiss();
      playSfx('oops');
      speak(params.kind === 'letter' ? `Find the letter ${params.target}!` : `Find the number ${params.target}!`);
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <style>{`@keyframes floatUp { from { transform: translateY(0); } to { transform: translateY(calc(-115 * var(--lu) * 8)); } }`}</style>
      {/* target reminder card */}
      <div style={{
        position: 'absolute', top: 'calc(20 * var(--lu))', left: '50%', transform: 'translateX(-50%)',
        background: '#FFFFFF', borderRadius: 'calc(24 * var(--lu))', padding: 'calc(8 * var(--lu)) calc(30 * var(--lu))',
        boxShadow: '0 calc(5 * var(--lu)) 0 rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 'calc(16 * var(--lu))',
        zIndex: 5,
      }}>
        <span style={{ fontSize: 'calc(64 * var(--lu))', fontWeight: 700, color: '#3D348B' }}>{params.target}</span>
        <Dots total={params.need} done={popped} />
      </div>
      {balloons.map((b) => (
        <div key={b.id}
          onPointerDown={(e) => tapBalloon(b, e.currentTarget)}
          style={{
            position: 'absolute', left: `${b.x}%`, bottom: 'calc(-160 * var(--lu))',
            animation: `floatUp ${b.dur}s linear ${b.delay}s infinite`,
            opacity: b.popped ? 0 : 1,
            transition: 'opacity 0.2s',
            cursor: 'pointer', touchAction: 'none',
            zIndex: 2,
          }}>
          <svg width="0" height="0" style={{ position: 'absolute' }} />
          <div style={{
            width: 'calc(110 * var(--lu))', height: 'calc(132 * var(--lu))',
            background: `radial-gradient(circle at 35% 30%, ${b.color}EE, ${b.color})`,
            borderRadius: '50% 50% 48% 48%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'calc(52 * var(--lu))', fontWeight: 700, color: '#FFFFFF',
            textShadow: '0 2px 4px rgba(0,0,0,0.25)',
            boxShadow: 'inset 0 calc(-8 * var(--lu)) calc(12 * var(--lu)) rgba(0,0,0,0.12)',
          }}>
            {b.label}
          </div>
          <div style={{
            width: '2px', height: 'calc(50 * var(--lu))', background: 'rgba(0,0,0,0.25)',
            margin: '0 auto',
          }} />
        </div>
      ))}
    </div>
  );
}
