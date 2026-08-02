// Shared UI primitives. Sizing uses --lu (one logical unit in CSS px) so the
// 88-logical-unit minimum touch target (BLUEPRINT §9) holds at every scale.

import React, { useEffect, useRef, useState } from 'react';
import { playSfx } from '../core/audio';
import { burstAtElement } from './juice';

/** Rainbow palette for single-character (letter/number) card faces. */
const CHAR_COLORS = ['#E4572E', '#F3A712', '#2E933C', '#2274A5', '#7B4FD0', '#D64570'];
export function charColor(ch: string): string {
  return CHAR_COLORS[(ch.charCodeAt(0) + ch.length) % CHAR_COLORS.length];
}
const isChar = (s: string): boolean => /^[A-Z0-9]$/i.test(s);

export function BigButton(props: {
  icon: string;
  label?: string;
  onPress: () => void;
  color?: string;
  size?: number;          // logical units, min 88
  fontScale?: number;
  disabled?: boolean;
  burst?: boolean;
  style?: React.CSSProperties;
}) {
  const { icon, label, onPress, color = '#FFFFFF', size = 110, fontScale = 0.45, disabled, style } = props;
  const ref = useRef<HTMLButtonElement>(null);
  const s = Math.max(88, size);
  const charFace = isChar(icon);
  return (
    <button
      ref={ref}
      disabled={disabled}
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
      onClick={() => {
        if (disabled) return;
        playSfx('tap');
        if (props.burst && ref.current) burstAtElement(ref.current, 10);
        onPress();
      }}
      style={{
        minWidth: `calc(${s} * var(--lu))`,
        minHeight: `calc(${s} * var(--lu))`,
        border: 'calc(5 * var(--lu)) solid rgba(255,255,255,0.95)',
        borderRadius: `calc(26 * var(--lu))`,
        background: `linear-gradient(170deg, #FFFFFF 0%, ${color} 85%)`,
        boxShadow: '0 calc(6 * var(--lu)) 0 rgba(120,90,40,0.22), 0 calc(2 * var(--lu)) calc(10 * var(--lu)) rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `calc(4 * var(--lu))`,
        fontSize: `calc(${s * fontScale} * var(--lu))`,
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
        touchAction: 'none',
        opacity: disabled ? 0.4 : 1,
        padding: `calc(8 * var(--lu))`,
        ...style,
      }}
      onPointerEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
    >
      <span style={{
        lineHeight: 1,
        ...(charFace ? { fontWeight: 700, color: charColor(icon), fontSize: `calc(${s * 0.52} * var(--lu))`, textShadow: '0 2px 0 rgba(0,0,0,0.08)' } : {}),
      }}>{icon}</span>
      {label && (
        <span style={{
          fontSize: `calc(21 * var(--lu))`, fontWeight: 700, color: '#4A4459',
          background: 'rgba(255,255,255,0.85)', borderRadius: 'calc(12 * var(--lu))',
          padding: 'calc(2 * var(--lu)) calc(10 * var(--lu))',
        }}>{label}</span>
      )}
    </button>
  );
}

/** Back arrow — literal directional icon (§9), top-left, always escapable. */
export function BackButton(props: { onPress: () => void }) {
  return (
    <div style={{ position: 'absolute', top: 'calc(16 * var(--lu))', left: 'calc(16 * var(--lu))', zIndex: 20 }}>
      <BigButton icon="⬅️" onPress={props.onPress} size={88} fontScale={0.5} color="#FFF3D6" />
    </div>
  );
}

/** Progress dots for multi-step activities. */
export function Dots(props: { total: number; done: number }) {
  return (
    <div style={{ display: 'flex', gap: 'calc(10 * var(--lu))', justifyContent: 'center' }}>
      {Array.from({ length: props.total }, (_, i) => (
        <div
          key={i}
          style={{
            width: 'calc(18 * var(--lu))',
            height: 'calc(18 * var(--lu))',
            borderRadius: '50%',
            background: i < props.done ? '#06D6A0' : 'rgba(0,0,0,0.12)',
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  );
}

/** Full-screen celebration; auto-dismisses. Tied to completion only (§12). */
export function Celebration(props: { icon: string; onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    playSfx('great');
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(props.onDone, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,248,231,0.92)',
      }}
    >
      <div
        style={{
          fontSize: 'calc(220 * var(--lu))',
          transform: phase ? 'scale(1)' : 'scale(0.2)',
          transition: 'transform 0.5s cubic-bezier(0.34, 1.8, 0.64, 1)',
        }}
      >
        {props.icon}
      </div>
      <div style={{ fontSize: 'calc(60 * var(--lu))', marginTop: 'calc(10 * var(--lu))' }}>🎉 ⭐ 🎉</div>
    </div>
  );
}

/** Gentle wiggle wrapper for wrong answers — feedback, never a fail state. */
export function useWiggle(): [React.CSSProperties, () => void] {
  const [on, setOn] = useState(false);
  const style: React.CSSProperties = on ? { animation: 'wiggle 0.4s' } : {};
  return [style, () => { setOn(true); setTimeout(() => setOn(false), 450); }];
}
