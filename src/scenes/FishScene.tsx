// Fish game — Kenney fish swim across an underwater scene carrying letter
// bubbles; catch (tap) the ones with the target. Motion IS the mechanic,
// same rationale as PopScene.

import { useEffect, useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { art, shuffle, NUM_WORDS } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';
import { Dots } from '../ui/common';

interface FishParams { kind: 'letter' | 'number'; target: string; decoys: string[]; need: number; say: string }

interface Fish { id: number; label: string; y: number; dur: number; delay: number; img: string; flip: boolean; caught: boolean }

const FISH_IMGS = ['fish_blue.png', 'fish_orange.png', 'fish_green.png', 'fish_pink.png', 'fish_red.png', 'fish_brown.png'];

export default function FishScene({ activity, onComplete, onMiss }: SceneProps) {
  const params = activity.params as FishParams;
  const [caught, setCaught] = useState(0);
  const [fishes, setFishes] = useState<Fish[]>([]);
  const nextId = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    speak(params.say);
    // steady school: target appears ~40% of the time
    const make = (i: number): Fish => {
      const isTarget = i % 5 < 2;
      const pool = isTarget ? [params.target] : params.decoys;
      return {
        id: nextId.current++,
        label: pool[Math.floor(Math.random() * pool.length)],
        y: 16 + Math.random() * 62,
        dur: 9 + Math.random() * 6,
        delay: (i % 6) * 1.5 + Math.random(),
        img: FISH_IMGS[Math.floor(Math.random() * FISH_IMGS.length)],
        flip: Math.random() > 0.5,
        caught: false,
      };
    };
    setFishes(shuffle(Array.from({ length: 10 }, (_, i) => make(i))));
    const iv = setInterval(() => {
      setFishes((fs) => {
        const alive = fs.filter((f) => !f.caught).length;
        if (alive >= 9) return fs;
        return [...fs.slice(-20), make(Math.floor(Math.random() * 6))];
      });
    }, 2400);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tapFish(f: Fish, el: HTMLElement): void {
    if (f.caught || doneRef.current) return;
    if (f.label === params.target) {
      setFishes((fs) => fs.map((x) => (x.id === f.id ? { ...x, caught: true } : x)));
      playSfx('pop');
      burstAtElement(el, 16);
      const n = caught + 1;
      setCaught(n);
      speak(NUM_WORDS[n]);
      if (n >= params.need) {
        doneRef.current = true;
        playSfx('great');
        speak('You caught them all!');
        setTimeout(() => onComplete({ assisted: false }), 900);
      }
    } else {
      onMiss();
      playSfx('oops');
      speak(params.kind === 'letter' ? `Find the fish with the letter ${params.target}!` : `Find the fish with the number ${params.target}!`);
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes swimAcross { from { transform: translateX(0); } to { transform: translateX(calc(1560 * var(--lu))); } }
        @keyframes fishWiggle { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(calc(-10 * var(--lu))) rotate(2deg); } }
      `}</style>
      {/* underwater dressing */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(94,180,229,0.35), rgba(34,116,165,0.45))', pointerEvents: 'none' }} />
      <img src={art('background_seaweed_a.png')} alt="" style={{ position: 'absolute', bottom: 0, left: '6%', height: 'calc(170 * var(--lu))', pointerEvents: 'none' }} />
      <img src={art('background_seaweed_b.png')} alt="" style={{ position: 'absolute', bottom: 0, right: '9%', height: 'calc(140 * var(--lu))', pointerEvents: 'none' }} />
      <img src={art('bubble_a.png')} alt="" style={{ position: 'absolute', top: '20%', right: '18%', width: 'calc(32 * var(--lu))', pointerEvents: 'none', opacity: 0.8 }} />
      <img src={art('bubble_b.png')} alt="" style={{ position: 'absolute', top: '38%', left: '14%', width: 'calc(24 * var(--lu))', pointerEvents: 'none', opacity: 0.8 }} />
      {/* target reminder card */}
      <div style={{
        position: 'absolute', top: 'calc(20 * var(--lu))', left: '50%', transform: 'translateX(-50%)',
        background: '#FFFFFF', borderRadius: 'calc(24 * var(--lu))', padding: 'calc(8 * var(--lu)) calc(30 * var(--lu))',
        boxShadow: '0 calc(5 * var(--lu)) 0 rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 'calc(16 * var(--lu))',
        zIndex: 5,
      }}>
        <span style={{ fontSize: 'calc(40 * var(--lu))' }}>🎣</span>
        <span style={{ fontSize: 'calc(64 * var(--lu))', fontWeight: 700, color: '#2274A5' }}>{params.target}</span>
        <Dots total={params.need} done={caught} />
      </div>
      {fishes.map((f) => (
        <div key={f.id}
          style={{
            position: 'absolute', top: `${f.y}%`, left: 'calc(-250 * var(--lu))',
            animation: `swimAcross ${f.dur}s linear ${f.delay}s infinite`,
            zIndex: 2, pointerEvents: 'none',
          }}>
          <div
            onPointerDown={(e) => tapFish(f, e.currentTarget)}
            style={{
              position: 'relative',
              animation: `fishWiggle ${2 + (f.id % 3) * 0.4}s ease-in-out infinite`,
              opacity: f.caught ? 0 : 1,
              transform: f.caught ? 'scale(1.6)' : 'scale(1)',
              transition: 'opacity 0.25s, transform 0.25s',
              cursor: 'pointer', touchAction: 'none', pointerEvents: 'auto',
            }}>
            <img src={art(f.img)} alt="" draggable={false} style={{
              width: 'calc(150 * var(--lu))', pointerEvents: 'none',
              transform: f.flip ? 'scaleX(-1)' : 'none',
              filter: 'drop-shadow(0 calc(4 * var(--lu)) calc(4 * var(--lu)) rgba(0,0,0,0.18))',
            }} />
            <div style={{
              position: 'absolute', top: 'calc(-34 * var(--lu))', left: '50%', transform: 'translateX(-50%)',
              width: 'calc(64 * var(--lu))', height: 'calc(64 * var(--lu))', borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)', border: 'calc(4 * var(--lu)) solid #BDE6FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'calc(38 * var(--lu))', fontWeight: 700, color: '#2274A5',
              boxShadow: '0 calc(3 * var(--lu)) 0 rgba(0,0,0,0.1)',
            }}>
              {f.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
