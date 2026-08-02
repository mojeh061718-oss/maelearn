// Layered scene background — sky gradient, sun, Kenney clouds and hills.
// Menus get gently drifting clouds; activity screens pass animate={false}
// (research S23: no continuous motion while she's working).

import { art } from '../scenes/shared';

export default function Background(props: { tint?: string; animate?: boolean }) {
  const { tint = '#BDE6FF', animate = false } = props;
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`@keyframes drift { from { transform: translateX(-8%); } to { transform: translateX(108%); } }`}</style>
      {/* sky */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${tint} 0%, #FDF6E3 62%, #FDF6E3 100%)` }} />
      {/* sun */}
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 'calc(-30 * var(--lu))', right: 'calc(-20 * var(--lu))', width: 'calc(220 * var(--lu))', opacity: 0.9 }}>
        <circle cx="50" cy="50" r="26" fill="#FFD166" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <line key={i} x1={50 + Math.cos(a) * 33} y1={50 + Math.sin(a) * 33} x2={50 + Math.cos(a) * 42} y2={50 + Math.sin(a) * 42} stroke="#FFD166" strokeWidth="5" strokeLinecap="round" />;
        })}
      </svg>
      {/* clouds */}
      {[
        { img: 'cloud1.png', top: '8%', left: '12%', w: 170, dur: 70, delay: 0 },
        { img: 'cloud2.png', top: '16%', left: '55%', w: 130, dur: 95, delay: -30 },
        { img: 'cloud3.png', top: '5%', left: '75%', w: 110, dur: 80, delay: -60 },
      ].map((c, i) => (
        <img key={i} src={art(c.img)} alt="" style={{
          position: 'absolute', top: c.top, left: animate ? 0 : c.left,
          width: `calc(${c.w} * var(--lu))`, opacity: 0.85,
          animation: animate ? `drift ${c.dur}s linear ${c.delay}s infinite` : undefined,
        }} />
      ))}
      {/* hills + trees along the bottom */}
      <img src={art('hills1.png')} alt="" style={{ position: 'absolute', bottom: 'calc(-8 * var(--lu))', left: '-4%', width: '58%', opacity: 0.5 }} />
      <img src={art('hills2.png')} alt="" style={{ position: 'absolute', bottom: 'calc(-8 * var(--lu))', right: '-6%', width: '62%', opacity: 0.5 }} />
      <img src={art('tree01.png')} alt="" style={{ position: 'absolute', bottom: 0, left: '3%', height: 'calc(110 * var(--lu))', opacity: 0.65 }} />
      <img src={art('tree08.png')} alt="" style={{ position: 'absolute', bottom: 0, right: '4%', height: 'calc(95 * var(--lu))', opacity: 0.65 }} />
    </div>
  );
}
