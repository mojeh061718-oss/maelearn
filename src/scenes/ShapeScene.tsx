// Shape scene — "tap the <shape>" rounds. Shapes drawn as inline SVG so the
// silhouettes are geometrically true (emoji shapes vary per platform).

import { useEffect, useState } from 'react';
import type { SceneProps } from './shared';
import { shuffle } from './shared';
import { playSfx, speak } from '../core/audio';
import { burstAtElement } from '../ui/juice';

interface ShapeRound { name: string; kind: string }
interface ShapeParams { rounds: ShapeRound[] }

const ALL_KINDS = ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'sphere', 'cube'];

function ShapeSvg({ kind, size }: { kind: string; size: number }) {
  const s = `calc(${size} * var(--lu))`;
  const common = { width: s, height: s, viewBox: '0 0 100 100' };
  const fill = '#5BC0EB';
  switch (kind) {
    case 'circle': return <svg {...common}><circle cx="50" cy="50" r="42" fill={fill} /></svg>;
    case 'oval': return <svg {...common}><ellipse cx="50" cy="50" rx="44" ry="30" fill={fill} /></svg>;
    case 'square': return <svg {...common}><rect x="12" y="12" width="76" height="76" rx="6" fill="#9BC53D" /></svg>;
    case 'rectangle': return <svg {...common}><rect x="6" y="26" width="88" height="48" rx="6" fill="#9BC53D" /></svg>;
    case 'triangle': return <svg {...common}><polygon points="50,8 92,88 8,88" fill="#F3A712" /></svg>;
    case 'star': return <svg {...common}><polygon points="50,5 61,38 96,38 68,59 78,92 50,72 22,92 32,59 4,38 39,38" fill="#FFD166" /></svg>;
    case 'heart': return <svg {...common}><path d="M50 88 C20 62 8 44 8 30 C8 16 20 8 32 8 C41 8 48 14 50 20 C52 14 59 8 68 8 C80 8 92 16 92 30 C92 44 80 62 50 88 Z" fill="#FF6B6B" /></svg>;
    case 'sphere': return (
      <svg {...common}>
        <defs><radialGradient id="sph" cx="0.35" cy="0.3"><stop offset="0%" stopColor="#BDE6FF" /><stop offset="100%" stopColor="#2274A5" /></radialGradient></defs>
        <circle cx="50" cy="50" r="42" fill="url(#sph)" />
      </svg>);
    case 'cube': return (
      <svg {...common}>
        <polygon points="25,35 65,35 65,75 25,75" fill="#9B5DE5" />
        <polygon points="25,35 40,20 80,20 65,35" fill="#B583F0" />
        <polygon points="65,35 80,20 80,60 65,75" fill="#7B3FD1" />
      </svg>);
    default: return null;
  }
}

export default function ShapeScene({ activity, onComplete, onMiss }: SceneProps) {
  const params = activity.params as ShapeParams;
  const [ri, setRi] = useState(0);
  const [options, setOptions] = useState<string[]>([]);

  const round = params.rounds[ri];

  useEffect(() => {
    const wrong = shuffle(ALL_KINDS.filter((k) => k !== round.kind)).slice(0, 2);
    setOptions(shuffle([round.kind, ...wrong]));
    const t = setTimeout(() => speak(`Tap the ${round.name}!`), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ri]);

  function pick(kind: string, el: HTMLElement): void {
    if (kind === round.kind) {
      playSfx('pop');
      burstAtElement(el, 14);
      speak(`${round.name}! Yes!`);
      if (ri + 1 < params.rounds.length) setTimeout(() => setRi(ri + 1), 1000);
      else { playSfx('great'); setTimeout(() => onComplete({ assisted: false }), 900); }
    } else {
      onMiss();
      playSfx('oops');
      speak(`Hmm, find the ${round.name}!`);
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 'calc(50 * var(--lu))',
    }}>
      {options.map((kind) => (
        <div key={kind} onClick={(e) => pick(kind, e.currentTarget)}
          style={{
            padding: 'calc(26 * var(--lu))',
            borderRadius: 'calc(30 * var(--lu))', background: '#FFFFFF',
            boxShadow: '0 calc(6 * var(--lu)) 0 rgba(0,0,0,0.12)',
            cursor: 'pointer', touchAction: 'none',
          }}>
          <ShapeSvg kind={kind} size={180} />
        </div>
      ))}
    </div>
  );
}
