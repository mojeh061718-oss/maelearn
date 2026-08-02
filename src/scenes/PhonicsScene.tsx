// Phonics scene — one component per ladder rung, all choice-based rounds with
// audio scaffolding. Rung order is data-gated (BLUEPRINT §7): the ladder index
// lives in content; this scene renders whichever rung it's given.

import { useEffect, useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { shuffle } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';

type Choice = { icon: string; word?: string };

interface RoundSpec {
  say: string;                 // the audio prompt
  scaffold?: string[];         // visual scaffold chips (phoneme rung — S22)
  answer: Choice;
  wrong: Choice[];
}

function roundsFor(params: Record<string, unknown>): RoundSpec[] {
  const rung = params.rung as string;
  const items = params.items as Record<string, unknown>[];
  return items.map((it) => {
    switch (rung) {
      case 'compound':
        return { say: `${it.a as string}. ${it.b as string}. What word do they make?`, answer: { icon: it.icon as string, word: it.word as string }, wrong: (it.wrong as string[]).map((w) => ({ icon: w })) };
      case 'syllable': {
        const w = it.word as string, n = it.syllables as number;
        const others = [1, 2, 3].filter((x) => x !== n);
        return { say: `Clap it with me. ${w}. How many claps?`, answer: { icon: String(n), word: w }, wrong: others.map((o) => ({ icon: String(o) })) };
      }
      case 'rhyme': {
        const a = it.answer as Choice;
        return { say: `What rhymes with ${it.word as string}?`, answer: a, wrong: it.wrong as Choice[] };
      }
      case 'alliteration': {
        const a = it.answer as Choice;
        return { say: `Which one starts with ${it.sound as string}, like the letter ${it.letter as string}?`, answer: a, wrong: it.wrong as Choice[] };
      }
      case 'onset-rime':
        return { say: `${it.onset as string}. ${it.rime as string}. What word?`, scaffold: [it.onset as string, it.rime as string], answer: { icon: it.icon as string, word: it.word as string }, wrong: (it.wrong as string[]).map((w) => ({ icon: w })) };
      default: // phoneme — visual scaffold required at this rung (S22)
        return { say: (it.phonemes as string[]).join('. ') + '. What word?', scaffold: it.phonemes as string[], answer: { icon: it.icon as string, word: it.word as string }, wrong: (it.wrong as string[]).map((w) => ({ icon: w })) };
    }
  });
}

export default function PhonicsScene({ activity, onComplete, onMiss }: SceneProps) {
  const [rounds] = useState(() => roundsFor(activity.params as Record<string, unknown>));
  const [ri, setRi] = useState(0);
  const [choices, setChoices] = useState<Choice[]>([]);
  const missesRef = useRef(0);

  const round = rounds[ri];

  useEffect(() => {
    setChoices(shuffle([round.answer, ...round.wrong]));
    missesRef.current = 0;
    const t = setTimeout(() => speak(round.say, 0.75), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ri]);

  function pick(c: Choice, el: HTMLElement): void {
    if (c === round.answer) {
      playSfx('pop');
      burstAtElement(el, 14);
      if (c.word) speak(`${c.word}! That's it!`);
      if (ri + 1 < rounds.length) setTimeout(() => setRi(ri + 1), 1100);
      else { playSfx('great'); setTimeout(() => onComplete({ assisted: false }), 1000); }
    } else {
      onMiss();
      missesRef.current += 1;
      playSfx('oops');
      if (missesRef.current >= 2) {
        // §8 spirit: assist, don't block — highlight by re-speaking slowly
        speak(round.say, 0.6);
      } else {
        speak('Listen again!');
        setTimeout(() => speak(round.say, 0.7), 900);
      }
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 'calc(48 * var(--lu))',
    }}>
      {/* replay prompt — literal speaker icon (§9) */}
      <div onClick={() => speak(round.say, 0.75)}
        style={{
          width: 'calc(130 * var(--lu))', height: 'calc(130 * var(--lu))',
          borderRadius: '50%', background: '#FFD166',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'calc(64 * var(--lu))',
          boxShadow: '0 calc(5 * var(--lu)) 0 rgba(0,0,0,0.15)',
          cursor: 'pointer', touchAction: 'none',
        }}>🔊</div>
      {round.scaffold && (
        <div style={{ display: 'flex', gap: 'calc(16 * var(--lu))' }}>
          {round.scaffold.map((s, i) => (
            <div key={i} onClick={() => speak(s, 0.6)}
              style={{
                minWidth: 'calc(88 * var(--lu))', minHeight: 'calc(88 * var(--lu))',
                padding: 'calc(10 * var(--lu))',
                borderRadius: 'calc(20 * var(--lu))', background: '#EAF6FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(44 * var(--lu))', fontWeight: 800, color: '#3D348B',
                boxShadow: '0 calc(4 * var(--lu)) 0 rgba(0,0,0,0.1)',
                cursor: 'pointer', touchAction: 'none',
              }}>{s}</div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 'calc(36 * var(--lu))' }}>
        {choices.map((c, i) => (
          <div key={i} onClick={(e) => pick(c, e.currentTarget)}
            style={{
              width: 'calc(160 * var(--lu))', height: 'calc(160 * var(--lu))',
              borderRadius: 'calc(30 * var(--lu))', background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'calc(84 * var(--lu))', fontWeight: 800, color: '#3D348B',
              boxShadow: '0 calc(6 * var(--lu)) 0 rgba(0,0,0,0.12)',
              cursor: 'pointer', touchAction: 'none',
              transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>{c.icon}</div>
        ))}
      </div>
    </div>
  );
}
