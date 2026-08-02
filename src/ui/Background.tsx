// Full-bleed illustrated scene backgrounds (Kenney Background Elements,
// rendered 2x from the vector source so they stay crisp on retina iPads).
// Menus get gently drifting clouds; activity screens pass animate={false}
// (research S23: no continuous motion while she's working).

import { art } from '../scenes/shared';

export type SceneName = 'meadow' | 'forest' | 'desert' | 'castle' | 'park' | 'peaks';

export default function Background(props: { scene?: SceneName; animate?: boolean; dim?: boolean }) {
  const { scene = 'meadow', animate = false, dim = false } = props;
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`@keyframes drift { from { transform: translateX(-12%); } to { transform: translateX(112%); } }`}</style>
      <img
        src={art(`bg_${scene}.png`)}
        alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          filter: `saturate(1.35) brightness(1.03)${dim ? ' opacity(0.55)' : ''}`,
        }}
      />
      {dim && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,252,245,0.45)' }} />}
      {/* sun */}
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 'calc(-26 * var(--lu))', right: 'calc(-14 * var(--lu))', width: 'calc(210 * var(--lu))' }}>
        <circle cx="50" cy="50" r="25" fill="#FFCE45" />
        <circle cx="50" cy="50" r="21" fill="#FFDD70" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <line key={i} x1={50 + Math.cos(a) * 32} y1={50 + Math.sin(a) * 32} x2={50 + Math.cos(a) * 41} y2={50 + Math.sin(a) * 41} stroke="#FFCE45" strokeWidth="5.5" strokeLinecap="round" />;
        })}
      </svg>
      {animate && [
        { img: 'cloud1.png', top: '9%', w: 170, dur: 75, delay: 0 },
        { img: 'cloud2.png', top: '20%', w: 125, dur: 100, delay: -40 },
        { img: 'cloud3.png', top: '4%', w: 105, dur: 88, delay: -70 },
      ].map((c, i) => (
        <img key={i} src={art(c.img)} alt="" style={{
          position: 'absolute', top: c.top, left: 0,
          width: `calc(${c.w} * var(--lu))`, opacity: 0.9,
          animation: `drift ${c.dur}s linear ${c.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

/** Decorative animals standing on the ground band. Pure decoration.
 * lively adds a slow staggered bob — menu screens only (S23). */
export function AnimalRow(props: { animals: string[]; size?: number; lively?: boolean }) {
  const { animals, size = 120, lively = false } = props;
  return (
    <div aria-hidden style={{
      position: 'absolute', bottom: 'calc(8 * var(--lu))', left: 0, right: 0,
      display: 'flex', justifyContent: 'space-evenly', alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {animals.map((a, i) => (
        <img key={a} src={art(`animal_${a}.png`)} alt="" className="sticker" style={{
          width: `calc(${size - (i % 2) * 18} * var(--lu))`,
          animation: lively ? `bob ${3.2 + (i % 3) * 0.5}s ease-in-out ${i * 0.45}s infinite` : undefined,
        }} />
      ))}
    </div>
  );
}
