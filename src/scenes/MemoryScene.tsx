// Memory game — flip two cards, find the pairs. Pairs can be identical
// pictures, upper↔lower letters, or numeral↔dots (data decides).

import { useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { shuffle } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';
import { charColor } from '../ui/common';

interface MemoryParams { pairs: [string, string][] }

interface Card { idx: number; pair: number; face: string }

export default function MemoryScene({ activity, onComplete, onMiss }: SceneProps) {
  const params = activity.params as MemoryParams;
  const [cards] = useState<Card[]>(() =>
    shuffle(params.pairs.flatMap((p, i) => [
      { pair: i, face: p[0] }, { pair: i, face: p[1] },
    ])).map((c, idx) => ({ ...c, idx })));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set()); // pair ids
  const lock = useRef(false);

  function tap(card: Card, el: HTMLElement): void {
    if (lock.current || matched.has(card.pair) || flipped.includes(card.idx)) return;
    playSfx('tap');
    const now = [...flipped, card.idx];
    setFlipped(now);
    if (now.length < 2) return;
    const [a, b] = now.map((i) => cards[i]);
    if (a.pair === b.pair) {
      lock.current = true;
      setTimeout(() => {
        const next = new Set(matched); next.add(card.pair);
        setMatched(next);
        setFlipped([]);
        lock.current = false;
        playSfx('pop');
        burstAtElement(el, 14);
        if (next.size === params.pairs.length) {
          playSfx('great');
          speak('You found all the pairs!');
          setTimeout(() => onComplete({ assisted: false }), 900);
        }
      }, 450);
    } else {
      lock.current = true;
      onMiss();
      setTimeout(() => {
        setFlipped([]);
        lock.current = false;
      }, 950);
    }
  }

  const isChar = (s: string): boolean => /^[A-Za-z0-9]$/.test(s);

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexWrap: 'wrap',
      alignItems: 'center', justifyContent: 'center', alignContent: 'center',
      gap: 'calc(26 * var(--lu))', padding: 'calc(120 * var(--lu)) calc(140 * var(--lu))',
    }}>
      {cards.map((c) => {
        const up = flipped.includes(c.idx) || matched.has(c.pair);
        const gone = matched.has(c.pair);
        return (
          <div key={c.idx} onPointerDown={(e) => tap(c, e.currentTarget)}
            style={{
              width: 'calc(150 * var(--lu))', height: 'calc(170 * var(--lu))',
              perspective: 'calc(600 * var(--lu))',
              cursor: 'pointer', touchAction: 'none',
              opacity: gone ? 0.9 : 1,
              transform: gone ? 'scale(0.94)' : 'scale(1)',
              transition: 'transform 0.3s, opacity 0.3s',
            }}>
            <div style={{
              position: 'relative', width: '100%', height: '100%',
              transformStyle: 'preserve-3d',
              transform: up ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: 'transform 0.4s cubic-bezier(0.34, 1.3, 0.64, 1)',
            }}>
              {/* back (face-down) */}
              <div style={{
                position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                borderRadius: 'calc(26 * var(--lu))',
                background: 'linear-gradient(160deg, #9B5DE5, #5B4FE9)',
                border: 'calc(6 * var(--lu)) solid #FFFFFF',
                boxShadow: '0 calc(6 * var(--lu)) 0 rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(60 * var(--lu))',
              }}>❓</div>
              {/* front (face-up) */}
              <div style={{
                position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderRadius: 'calc(26 * var(--lu))',
                background: gone ? '#D9F7E8' : '#FFFFFF',
                border: gone ? 'calc(6 * var(--lu)) solid #06D6A0' : 'calc(6 * var(--lu)) solid #FFD166',
                boxShadow: '0 calc(6 * var(--lu)) 0 rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: c.face.length > 2 ? 'calc(34 * var(--lu))' : 'calc(66 * var(--lu))',
                fontWeight: 800,
                color: isChar(c.face) ? charColor(c.face.toUpperCase()) : '#3D348B',
                textAlign: 'center', lineHeight: 1.15, padding: 'calc(6 * var(--lu))',
                wordBreak: 'break-all',
              }}>{c.face}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
