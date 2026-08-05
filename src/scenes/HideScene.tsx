// Peekaboo game — animal friends pop up from behind grassy mounds holding a
// letter/number card; tap the friend holding the target. Timed peeking is the
// mechanic (like whack-a-mole, but friendly — nobody gets whacked).

import { useEffect, useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { art, NUM_WORDS } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';
import { Dots } from '../ui/common';

interface HideParams { kind: 'letter' | 'number'; target: string; decoys: string[]; need: number; say: string }

interface Spot { up: boolean; label: string; animal: string }

const ANIMALS = ['monkey', 'rabbit', 'panda', 'penguin', 'pig', 'giraffe', 'parrot', 'hippo'];
const POSITIONS = [
  { left: '17%', top: '15%' }, { left: '50%', top: '15%' }, { left: '83%', top: '15%' },
  { left: '17%', top: '56%' }, { left: '50%', top: '56%' }, { left: '83%', top: '56%' },
];

export default function HideScene({ activity, onComplete, onMiss }: SceneProps) {
  const params = activity.params as HideParams;
  const [found, setFound] = useState(0);
  const [spots, setSpots] = useState<Spot[]>(() =>
    POSITIONS.map((_, i) => ({ up: false, label: '', animal: ANIMALS[i % ANIMALS.length] })));
  const doneRef = useRef(false);
  const lastTargetAt = useRef(0);

  useEffect(() => {
    speak(params.say);
    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    const iv = setInterval(() => {
      if (doneRef.current) return;
      setSpots((ss) => {
        const downIdx = ss.map((s, i) => (s.up ? -1 : i)).filter((i) => i >= 0);
        if (!downIdx.length) return ss;
        const i = downIdx[Math.floor(Math.random() * downIdx.length)];
        // keep the target findable: force it if none visible for a while
        const targetVisible = ss.some((s) => s.up && s.label === params.target);
        const forceTarget = !targetVisible && Date.now() - lastTargetAt.current > 3500;
        const isTarget = forceTarget || Math.random() < 0.4;
        if (isTarget) lastTargetAt.current = Date.now();
        const label = isTarget ? params.target : params.decoys[Math.floor(Math.random() * params.decoys.length)];
        const next = [...ss];
        next[i] = { up: true, label, animal: ANIMALS[Math.floor(Math.random() * ANIMALS.length)] };
        const t = setTimeout(() => {
          timeouts.delete(t);
          setSpots((cur) => {
            const after = [...cur];
            if (after[i].up && after[i].label === label) after[i] = { ...after[i], up: false };
            return after;
          });
        }, 2100);
        timeouts.add(t);
        return next;
      });
    }, 1000);
    return () => { clearInterval(iv); timeouts.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tapSpot(i: number, el: HTMLElement): void {
    const s = spots[i];
    if (!s.up || doneRef.current) return;
    if (s.label === params.target) {
      playSfx('pop');
      burstAtElement(el, 16);
      setSpots((ss) => { const next = [...ss]; next[i] = { ...next[i], up: false }; return next; });
      const n = found + 1;
      setFound(n);
      speak(NUM_WORDS[n]);
      if (n >= params.need) {
        doneRef.current = true;
        playSfx('great');
        speak('You found them all! Peekaboo!');
        setTimeout(() => onComplete({ assisted: false }), 900);
      }
    } else {
      onMiss();
      playSfx('oops');
      speak(params.kind === 'letter' ? `Find the friend holding the letter ${params.target}!` : `Find the friend holding the number ${params.target}!`);
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* target reminder card */}
      <div style={{
        position: 'absolute', top: 'calc(20 * var(--lu))', left: '50%', transform: 'translateX(-50%)',
        background: '#FFFFFF', borderRadius: 'calc(24 * var(--lu))', padding: 'calc(8 * var(--lu)) calc(30 * var(--lu))',
        boxShadow: '0 calc(5 * var(--lu)) 0 rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 'calc(16 * var(--lu))',
        zIndex: 10,
      }}>
        <span style={{ fontSize: 'calc(40 * var(--lu))' }}>🙈</span>
        <span style={{ fontSize: 'calc(64 * var(--lu))', fontWeight: 700, color: '#2E933C' }}>{params.target}</span>
        <Dots total={params.need} done={found} />
      </div>
      {POSITIONS.map((pos, i) => {
        const s = spots[i];
        return (
          <div key={i}
            onPointerDown={(e) => tapSpot(i, e.currentTarget)}
            style={{
              position: 'absolute', left: pos.left, top: pos.top, transform: 'translateX(-50%)',
              width: 'calc(230 * var(--lu))', height: 'calc(290 * var(--lu))',
              cursor: 'pointer', touchAction: 'none',
            }}>
            {/* the peeking friend, clipped so it rises from behind the bush */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', bottom: 'calc(48 * var(--lu))', left: '50%',
                width: 'calc(230 * var(--lu))',
                transform: `translateX(-50%) translateY(${s.up ? '0' : '115%'})`,
                transition: 'transform 0.35s cubic-bezier(0.34, 1.45, 0.64, 1)',
                textAlign: 'center',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 'calc(66 * var(--lu))', height: 'calc(66 * var(--lu))', padding: '0 calc(8 * var(--lu))',
                  borderRadius: 'calc(18 * var(--lu))', background: '#FFFFFF', border: 'calc(4 * var(--lu)) solid #FFD166',
                  fontSize: 'calc(40 * var(--lu))', fontWeight: 700, color: '#3D348B',
                  boxShadow: '0 calc(3 * var(--lu)) 0 rgba(0,0,0,0.12)',
                  marginBottom: 'calc(4 * var(--lu))',
                }}>{s.label}</div>
                <img src={art(`animal_${s.animal}.png`)} alt="" draggable={false} className="sticker"
                  style={{ width: 'calc(132 * var(--lu))', display: 'block', margin: '0 auto', pointerEvents: 'none' }} />
              </div>
            </div>
            {/* grassy bush in front */}
            <div style={{
              position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: 'calc(210 * var(--lu))', height: 'calc(84 * var(--lu))',
              borderRadius: 'calc(105 * var(--lu)) calc(105 * var(--lu)) calc(20 * var(--lu)) calc(20 * var(--lu))',
              background: 'linear-gradient(180deg, #9BD97A 0%, #5FA84B 90%)',
              border: 'calc(5 * var(--lu)) solid rgba(255,255,255,0.9)',
              boxShadow: '0 calc(5 * var(--lu)) 0 rgba(60,100,45,0.3), inset 0 calc(-8 * var(--lu)) 0 rgba(0,0,0,0.08)',
              pointerEvents: 'none',
            }}>
              {/* little grass blades on top */}
              <div style={{ position: 'absolute', top: 'calc(-20 * var(--lu))', left: '18%', width: 0, height: 0, borderLeft: 'calc(8 * var(--lu)) solid transparent', borderRight: 'calc(8 * var(--lu)) solid transparent', borderBottom: 'calc(24 * var(--lu)) solid #7CC45C' }} />
              <div style={{ position: 'absolute', top: 'calc(-26 * var(--lu))', left: '46%', width: 0, height: 0, borderLeft: 'calc(9 * var(--lu)) solid transparent', borderRight: 'calc(9 * var(--lu)) solid transparent', borderBottom: 'calc(30 * var(--lu)) solid #8FD16E' }} />
              <div style={{ position: 'absolute', top: 'calc(-18 * var(--lu))', left: '72%', width: 0, height: 0, borderLeft: 'calc(8 * var(--lu)) solid transparent', borderRight: 'calc(8 * var(--lu)) solid transparent', borderBottom: 'calc(22 * var(--lu)) solid #7CC45C' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
