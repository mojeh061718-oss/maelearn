// Count scene — three modes (BLUEPRINT §7):
//   tap-count: tap each object, counted aloud, then pick the numeral (minds-on)
//   subitize:  brief flash, pick how many (PK4 target: to 6)
//   rote:      guided count along 1..30, next number glows

import { useEffect, useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { shuffle } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';
import { BigButton } from '../ui/common';

interface CountParams { mode: 'tap-count' | 'subitize' | 'rote'; target: number; icon?: string }

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  'twenty one', 'twenty two', 'twenty three', 'twenty four', 'twenty five', 'twenty six', 'twenty seven', 'twenty eight', 'twenty nine', 'thirty'];

export default function CountScene(props: SceneProps) {
  const { mode } = props.activity.params as CountParams;
  if (mode === 'tap-count') return <TapCount {...props} />;
  if (mode === 'subitize') return <Subitize {...props} />;
  return <Rote {...props} />;
}

function scatter(n: number): { x: number; y: number }[] {
  // deterministic-ish scatter grid with jitter, inside the middle of the stage
  const out: { x: number; y: number }[] = [];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    out.push({
      x: 25 + (c + 0.5) * (50 / cols) + (Math.random() * 8 - 4),
      y: 22 + (r + 0.5) * (48 / rows) + (Math.random() * 6 - 3),
    });
  }
  return out;
}

function TapCount({ activity, onComplete, onMiss }: SceneProps) {
  const { target, icon = '🐠' } = activity.params as CountParams;
  const [positions] = useState(() => scatter(target));
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<'count' | 'pick'>('count');
  const [choices] = useState(() => {
    const c = new Set([target]);
    while (c.size < 3) c.add(Math.max(1, target + Math.floor(Math.random() * 5) - 2));
    return shuffle([...c]);
  });
  const spoken = useRef(false);
  if (!spoken.current) { spoken.current = true; setTimeout(() => speak(`Tap each ${icon === '🐠' ? 'fish' : 'one'} and count with me!`), 300); }

  function tapObj(i: number, el: HTMLElement): void {
    if (tapped.has(i) || phase !== 'count') return;
    const next = new Set(tapped); next.add(i);
    setTapped(next);
    playSfx('pop');
    burstAtElement(el, 8);
    speak(NUM_WORDS[next.size]);
    if (next.size === target) setTimeout(() => { setPhase('pick'); speak(`How many did we count?`); }, 900);
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {positions.map((p, i) => (
        <div key={i} onClick={(e) => tapObj(i, e.currentTarget)}
          style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            fontSize: 'calc(90 * var(--lu))',
            transform: tapped.has(i) ? 'scale(1.25)' : 'scale(1)',
            filter: tapped.has(i) ? 'grayscale(0.6) opacity(0.65)' : 'none',
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: 'pointer', touchAction: 'none',
          }}>
          {icon}
          {tapped.has(i) && (
            <span style={{
              position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
              fontSize: 'calc(40 * var(--lu))', fontWeight: 800, color: '#3D348B',
            }}>{[...tapped].indexOf(i) + 1}</span>
          )}
        </div>
      ))}
      {phase === 'pick' && (
        <div style={{
          position: 'absolute', bottom: 'calc(40 * var(--lu))', left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 'calc(30 * var(--lu))',
        }}>
          {choices.map((c) => (
            <BigButton key={c} icon={String(c)} size={130} burst
              onPress={() => {
                if (c === target) { playSfx('great'); speak(`${NUM_WORDS[target]}! That's right!`); setTimeout(() => onComplete({ assisted: false }), 800); }
                else { onMiss(); playSfx('oops'); speak('Count again with me!'); }
              }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Subitize({ activity, onComplete, onMiss }: SceneProps) {
  const { target } = activity.params as CountParams;
  const [visible, setVisible] = useState(true);
  const [round, setRound] = useState(0);
  const [positions, setPositions] = useState(() => scatter(target));
  const [choices, setChoices] = useState<number[]>([]);

  useEffect(() => {
    setPositions(scatter(target));
    const c = new Set([target]);
    while (c.size < 3) c.add(Math.max(1, target + Math.floor(Math.random() * 5) - 2));
    setChoices(shuffle([...c]));
    setVisible(true);
    speak('Quick! Look how many!');
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, [round, target]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {visible
        ? positions.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, fontSize: 'calc(90 * var(--lu))' }}>🔵</div>
        ))
        : (
          <div style={{
            position: 'absolute', bottom: 'calc(40 * var(--lu))', left: 0, right: 0, top: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'calc(30 * var(--lu))',
          }}>
            {choices.map((c) => (
              <BigButton key={c} icon={String(c)} size={150} burst
                onPress={() => {
                  if (c === target) { playSfx('great'); speak('You saw it!'); setTimeout(() => onComplete({ assisted: false }), 700); }
                  else { onMiss(); playSfx('oops'); speak('Look again!'); setRound((r) => r + 1); }
                }} />
            ))}
          </div>
        )}
    </div>
  );
}

function Rote({ activity, onComplete }: SceneProps) {
  const { target } = activity.params as CountParams;
  const [next, setNext] = useState(1);
  const spoken = useRef(false);
  if (!spoken.current) { spoken.current = true; setTimeout(() => speak('Count to thirty! Tap the glowing number!'), 300); }

  return (
    <div style={{
      position: 'absolute', inset: 'calc(80 * var(--lu))',
      display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'calc(12 * var(--lu))',
      alignContent: 'center',
    }}>
      {Array.from({ length: target }, (_, i) => i + 1).map((n) => (
        <div key={n}
          onClick={(e) => {
            if (n !== next) return;
            playSfx('pop');
            speak(NUM_WORDS[n]);
            burstAtElement(e.currentTarget, 6);
            if (n === target) { playSfx('great'); setTimeout(() => onComplete({ assisted: false }), 800); }
            else setNext(n + 1);
          }}
          style={{
            minHeight: 'calc(88 * var(--lu))',
            borderRadius: 'calc(18 * var(--lu))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'calc(40 * var(--lu))', fontWeight: 800,
            background: n < next ? '#06D6A0' : n === next ? '#FFD166' : '#FFFFFF',
            color: n < next ? '#FFF' : '#3D348B',
            boxShadow: n === next ? '0 0 calc(20 * var(--lu)) #F3A712' : '0 calc(4 * var(--lu)) 0 rgba(0,0,0,0.1)',
            transform: n === next ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.2s',
            cursor: 'pointer', touchAction: 'none',
          }}>
          {n}
        </div>
      ))}
    </div>
  );
}
