// Match scene — minds-on pairing (research S23): letter↔sound, upper↔lower,
// numeral↔quantity. Tap one from each side; matches fly away.

import { useMemo, useState } from 'react';
import type { SceneProps } from './shared';
import { LETTER_SOUNDS, NUM_WORDS, shuffle } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';

interface MatchParams {
  mode: 'letter-sound' | 'case' | 'numeral-quantity';
  letters?: string[];
  numbers?: number[];
}

interface CardDef { key: string; face: string; speakOnTap?: string; small?: boolean }

export default function MatchScene({ activity, onComplete, onMiss }: SceneProps) {
  const params = activity.params as MatchParams;

  const { left, right } = useMemo(() => {
    if (params.mode === 'letter-sound') {
      const ls = params.letters!;
      return {
        left: ls.map((L): CardDef => ({ key: L, face: '🔊', speakOnTap: `${LETTER_SOUNDS[L]}. ${LETTER_SOUNDS[L]}.` })),
        right: shuffle(ls.map((L): CardDef => ({ key: L, face: L }))),
      };
    }
    if (params.mode === 'case') {
      const ls = params.letters!;
      return {
        left: ls.map((L): CardDef => ({ key: L, face: L, speakOnTap: `Big ${L}` })),
        right: shuffle(ls.map((L): CardDef => ({ key: L, face: L.toLowerCase(), speakOnTap: `small ${L}` }))),
      };
    }
    const ns = params.numbers!;
    return {
      left: ns.map((n): CardDef => ({ key: String(n), face: String(n), speakOnTap: NUM_WORDS[n] })),
      right: shuffle(ns.map((n): CardDef => ({ key: String(n), face: '🍎'.repeat(n), small: true }))),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sel, setSel] = useState<{ side: 'L' | 'R'; key: string; el: HTMLElement } | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongKey, setWrongKey] = useState<string | null>(null);

  function tap(side: 'L' | 'R', card: CardDef, el: HTMLElement): void {
    if (matched.has(card.key + side)) return;
    playSfx('tap');
    if (card.speakOnTap) speak(card.speakOnTap);
    if (!sel || sel.side === side) {
      setSel({ side, key: card.key, el });
      return;
    }
    // second tap, other side
    if (sel.key === card.key) {
      const next = new Set(matched);
      next.add(card.key + 'L'); next.add(card.key + 'R');
      setMatched(next);
      setSel(null);
      playSfx('pop');
      burstAtElement(el, 14);
      burstAtElement(sel.el, 14);
      if (next.size === left.length * 2) {
        playSfx('great');
        setTimeout(() => onComplete({ assisted: false }), 700);
      }
    } else {
      onMiss();
      playSfx('oops');
      setWrongKey(card.key + side);
      setTimeout(() => setWrongKey(null), 500);
      setSel(null);
    }
  }

  const cardStyle = (card: CardDef, side: 'L' | 'R', isSel: boolean): React.CSSProperties => ({
    minWidth: 'calc(130 * var(--lu))',
    minHeight: 'calc(130 * var(--lu))',
    borderRadius: 'calc(26 * var(--lu))',
    background: isSel ? '#FFD166' : '#FFFFFF',
    border: isSel ? 'calc(6 * var(--lu)) solid #F3A712' : 'calc(6 * var(--lu)) solid transparent',
    boxShadow: '0 calc(5 * var(--lu)) 0 rgba(0,0,0,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: card.small ? 'calc(26 * var(--lu))' : 'calc(64 * var(--lu))',
    fontWeight: 800, color: '#3D348B',
    opacity: matched.has(card.key + side) ? 0 : 1,
    transform: matched.has(card.key + side) ? 'scale(0.2)' : 'scale(1)',
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    animation: wrongKey === card.key + side ? 'wiggle 0.4s' : undefined,
    padding: 'calc(8 * var(--lu))',
    maxWidth: 'calc(200 * var(--lu))',
    lineHeight: 1.2,
    textAlign: 'center',
    wordBreak: 'break-all',
    cursor: 'pointer',
    touchAction: 'none',
  });

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 'calc(120 * var(--lu))',
    }}>
      {[{ side: 'L' as const, cards: left }, { side: 'R' as const, cards: right }].map(({ side, cards }) => (
        <div key={side} style={{ display: 'flex', flexDirection: 'column', gap: 'calc(20 * var(--lu))' }}>
          {cards.map((c) => (
            <div key={c.key + side} style={cardStyle(c, side, sel?.side === side && sel.key === c.key)}
              onClick={(e) => tap(side, c, e.currentTarget)}>
              {c.face}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
