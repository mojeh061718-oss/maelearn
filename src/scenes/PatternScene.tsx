// Pattern scene — duplicate / extend / create (PK4: recognize, duplicate,
// extend, create). Create mode has no wrong answers: she builds, we read it back.

import { useMemo, useState } from 'react';
import type { SceneProps } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';

interface PatternParams { mode: 'duplicate' | 'extend' | 'create'; unit: string[]; shown: number; choices: string[]; }

const CELL: React.CSSProperties = {
  width: 'calc(110 * var(--lu))', height: 'calc(110 * var(--lu))',
  borderRadius: 'calc(22 * var(--lu))',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 'calc(64 * var(--lu))',
  background: '#FFFFFF',
  boxShadow: '0 calc(4 * var(--lu)) 0 rgba(0,0,0,0.1)',
};

export default function PatternScene({ activity, onComplete, onMiss }: SceneProps) {
  const params = activity.params as PatternParams;
  const sequence = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < params.shown; i++) out.push(params.unit[i % params.unit.length]);
    return out;
  }, [params]);

  const [filled, setFilled] = useState<string[]>([]);

  const targetLen = params.mode === 'extend' ? 1 : params.mode === 'duplicate' ? sequence.length : 6;

  function choose(icon: string, el: HTMLElement): void {
    if (params.mode === 'create') {
      playSfx('pop');
      burstAtElement(el, 8);
      const next = [...filled, icon];
      setFilled(next);
      if (next.length === targetLen) {
        speak('What a beautiful pattern you made!');
        playSfx('great');
        setTimeout(() => onComplete({ assisted: false }), 900);
      }
      return;
    }
    const expected = params.mode === 'extend'
      ? params.unit[sequence.length % params.unit.length]
      : sequence[filled.length];
    if (icon === expected) {
      playSfx('pop');
      burstAtElement(el, 10);
      const next = [...filled, icon];
      setFilled(next);
      if (next.length === targetLen) {
        playSfx('great');
        speak('You found the pattern!');
        setTimeout(() => onComplete({ assisted: false }), 800);
      }
    } else {
      onMiss();
      playSfx('oops');
      speak('Look at the pattern again!');
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 'calc(50 * var(--lu))',
    }}>
      {params.mode !== 'create' && (
        <div style={{ display: 'flex', gap: 'calc(14 * var(--lu))' }}>
          {sequence.map((s, i) => <div key={i} style={CELL}>{s}</div>)}
          {params.mode === 'extend' && (
            <div style={{ ...CELL, background: '#FFF3D6', border: 'calc(5 * var(--lu)) dashed #F3A712' }}>
              {filled[0] ?? '?'}
            </div>
          )}
        </div>
      )}
      {(params.mode === 'duplicate' || params.mode === 'create') && (
        <div style={{ display: 'flex', gap: 'calc(14 * var(--lu))' }}>
          {Array.from({ length: targetLen }, (_, i) => (
            <div key={i} style={{ ...CELL, background: filled[i] ? '#FFFFFF' : '#FFF3D6', border: filled[i] ? undefined : 'calc(5 * var(--lu)) dashed #F3A712' }}>
              {filled[i] ?? ''}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 'calc(30 * var(--lu))', marginTop: 'calc(20 * var(--lu))' }}>
        {params.choices.map((c) => (
          <div key={`c-${c}`} style={{ ...CELL, cursor: 'pointer', touchAction: 'none', background: '#EAF6FF' }}
            onClick={(e) => choose(c, e.currentTarget)}>
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}
