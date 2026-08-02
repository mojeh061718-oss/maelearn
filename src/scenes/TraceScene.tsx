// BLUEPRINT §7/§8 — trace scene. Ghost glyph + animated guide dot on one
// canvas; ink on its own desynchronized canvas; PointerInput owns the surface.
// Never hard-fails: two misses on a stroke → assisted accept (§8).

import { useEffect, useRef, useState } from 'react';
import type { SceneProps } from './shared';
import { PointerInput, type Sample } from '../core/input';
import { InkLayer } from '../core/ink';
import { getViewport, onViewportChange, fitCanvas, applyLogicalTransform } from '../core/viewport';
import { scoreStroke, toleranceForDifficulty, type Glyph } from '../core/traceScore';
import { loadContent } from '../core/content';
import { playSfx, speak } from '../core/audio';
import { burst } from '../ui/juice';
import { charColor } from '../ui/common';

interface TraceParams { glyphIds: string[]; speakEach?: boolean; celebrateWord?: string; }

export default function TraceScene({ activity, difficulty, onComplete, onMiss }: SceneProps) {
  const params = activity.params as TraceParams;
  const hostRef = useRef<HTMLDivElement>(null);
  const [glyphs, setGlyphs] = useState<Glyph[] | null>(null);
  const [gi, setGi] = useState(0);            // glyph index
  const [, setSi] = useState(0);              // re-render trigger on stroke advance
  const stateRef = useRef({ gi: 0, si: 0, misses: 0, assisted: false });

  useEffect(() => {
    void loadContent().then((c) => setGlyphs(params.glyphIds.map((id) => c.glyphs[id])));
  }, [params.glyphIds]);

  useEffect(() => {
    if (!glyphs || !hostRef.current) return;
    const host = hostRef.current;
    const vp0 = getViewport();

    // ghost canvas (glyph + guide), under the ink canvas
    const ghost = document.createElement('canvas');
    const gctx = ghost.getContext('2d')!;
    fitCanvas(ghost, vp0);
    applyLogicalTransform(gctx, vp0);
    host.appendChild(ghost);

    const ink = new InkLayer(host, vp0);
    ink.setColor(charColor(glyphs[0]?.label ?? 'A'));
    const offVp = onViewportChange((v) => {
      fitCanvas(ghost, v); applyLogicalTransform(gctx, v);
      ink.resize(v); drawGhost();
    });

    // input surface on top
    const surface = document.createElement('div');
    surface.style.position = 'absolute';
    surface.style.inset = '0';
    host.appendChild(surface);
    const input = new PointerInput(surface);

    let guideT = 0;
    let raf = 0;

    const cur = () => {
      const st = stateRef.current;
      const g = glyphs[st.gi];
      return { g, stroke: g?.strokes[st.si] };
    };

    function drawGhost(): void {
      const st = stateRef.current;
      const g = glyphs![st.gi];
      if (!g) return;
      gctx.save();
      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.clearRect(0, 0, ghost.width, ghost.height);
      gctx.restore();
      // handwriting paper guides: solid top/base lines, dashed midline
      const GX0 = 262, GX1 = 762, TOP = 124, MID = 364, BASE = 604;
      gctx.lineWidth = 4;
      gctx.setLineDash([]);
      gctx.strokeStyle = '#B9D4EA';
      gctx.beginPath(); gctx.moveTo(GX0, TOP); gctx.lineTo(GX1, TOP); gctx.stroke();
      gctx.beginPath(); gctx.moveTo(GX0, BASE); gctx.lineTo(GX1, BASE); gctx.stroke();
      gctx.strokeStyle = '#F3B8C6';
      gctx.setLineDash([14, 14]);
      gctx.beginPath(); gctx.moveTo(GX0, MID); gctx.lineTo(GX1, MID); gctx.stroke();
      gctx.setLineDash([]);
      g.strokes.forEach((s, i) => {
        gctx.beginPath();
        s.points.forEach(([x, y], j) => (j ? gctx.lineTo(x, y) : gctx.moveTo(x, y)));
        gctx.lineWidth = 46;
        gctx.lineCap = 'round';
        gctx.lineJoin = 'round';
        gctx.strokeStyle = i < st.si ? 'rgba(6,214,160,0.35)'          // done
          : i === st.si ? 'rgba(91,79,233,0.28)'                       // current
          : 'rgba(0,0,0,0.07)';                                        // upcoming
        gctx.stroke();
      });
      // demo trail: the current stroke draws itself over and over ("watch me!")
      const s = g.strokes[st.si];
      if (s) {
        const idx = Math.max(1, Math.floor(guideT * (s.points.length - 1)));
        gctx.beginPath();
        for (let j = 0; j <= idx; j++) {
          const [x, y] = s.points[j];
          if (j === 0) gctx.moveTo(x, y); else gctx.lineTo(x, y);
        }
        gctx.lineWidth = 18;
        gctx.lineCap = 'round';
        gctx.lineJoin = 'round';
        gctx.strokeStyle = 'rgba(91,79,233,0.55)';
        gctx.stroke();
        // start dot
        const [sx, sy] = s.points[0];
        gctx.beginPath(); gctx.arc(sx, sy, 22, 0, Math.PI * 2);
        gctx.fillStyle = '#06D6A0'; gctx.fill();
        gctx.beginPath(); gctx.arc(sx, sy, 22, 0, Math.PI * 2);
        gctx.lineWidth = 5; gctx.strokeStyle = '#FFF'; gctx.stroke();
        // guide dot at the moving tip
        const [dx, dy] = s.points[idx];
        gctx.beginPath(); gctx.arc(dx, dy, 14, 0, Math.PI * 2);
        gctx.fillStyle = '#FF6B6B'; gctx.fill();
        gctx.beginPath(); gctx.arc(dx, dy, 14, 0, Math.PI * 2);
        gctx.lineWidth = 4; gctx.strokeStyle = '#FFF'; gctx.stroke();
      }
    }

    const loop = () => {
      raf = requestAnimationFrame(loop);
      guideT = (guideT + 0.006) % 1;
      drawGhost();
    };
    loop();

    function advance(): void {
      const st = stateRef.current;
      const g = glyphs![st.gi];
      st.misses = 0;
      if (st.si + 1 < g.strokes.length) {
        st.si += 1;
        setSi(st.si);
        playSfx('good');
      } else {
        // glyph finished
        const [cx, cy] = g.strokes[0].points[Math.floor(g.strokes[0].points.length / 2)];
        burst(cx, cy, 24);
        playSfx('great');
        if (params.speakEach) speak(g.label);
        ink.clear();
        if (st.gi + 1 < glyphs!.length) {
          st.gi += 1; st.si = 0;
          setGi(st.gi); setSi(0);
          const next = glyphs![st.gi];
          ink.setColor(charColor(next.label));
          setTimeout(() => speak(`Now trace ${next.label}! ${next.strokes[0].hint}`), 700);
        } else {
          if (params.celebrateWord) setTimeout(() => speak(`You wrote ${params.celebrateWord}!`), 600);
          setTimeout(() => onComplete({ assisted: st.assisted }), 900);
        }
      }
    }

    input.subscribe({
      onStrokeStart: (s: Sample) => ink.beginStroke(s),
      onStrokeMove: (samples) => ink.extendStroke(samples),
      onStrokeEnd: (all) => {
        ink.endStroke(all);
        const { stroke } = cur();
        if (!stroke) return;
        const st = stateRef.current;
        const tol = toleranceForDifficulty(difficulty);
        const res = scoreStroke(all, stroke, tol);
        if (res.accidental) { ink.undo(); return; } // graze/tap — not an attempt
        if (res.pass) {
          advance();
        } else {
          st.misses += 1;
          onMiss();
          ink.undo();
          // She keeps trying — no quick auto-accept. Help escalates with each
          // miss; only after 4 real attempts do we accept assisted (§8: never
          // hard-fail, but never breeze past her either).
          if (st.misses >= 4) {
            st.assisted = true;
            speak('Good trying! Watch the dot, and off we go!');
            playSfx('good');
            advance();
          } else {
            playSfx('oops');
            if (st.misses === 1) {
              speak(res.directionOk ? 'Almost! Start at the green dot.' : stroke.hint);
            } else if (st.misses === 2) {
              speak(`Watch the little red dot. ${stroke.hint}`);
            } else {
              speak('Try one more time! Follow the dot with your finger.');
            }
          }
        }
      },
    });

    const first = glyphs[0];
    if (first) speak(`Trace ${first.label}! ${first.strokes[0].hint}`);

    return () => {
      cancelAnimationFrame(raf);
      offVp();
      input.destroy();
      ink.destroy();
      ghost.remove();
      surface.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyphs]);

  const total = glyphs?.length ?? 1;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* paper panel behind the letter */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 'calc(560 * var(--lu))', height: 'calc(600 * var(--lu))',
        background: '#FFFFFF', borderRadius: 'calc(40 * var(--lu))',
        boxShadow: '0 calc(10 * var(--lu)) 0 rgba(0,0,0,0.08)',
      }} />
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{
        position: 'absolute', top: 'calc(20 * var(--lu))', left: 0, right: 0, pointerEvents: 'none',
        display: 'flex', justifyContent: 'center', gap: 'calc(10 * var(--lu))',
      }}>
        {(glyphs ?? []).map((g, i) => (
          <div key={i} style={{
            minWidth: 'calc(56 * var(--lu))', height: 'calc(56 * var(--lu))',
            borderRadius: 'calc(16 * var(--lu))',
            background: i < gi ? '#B9EFD0' : i === gi ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
            border: i === gi ? 'calc(4 * var(--lu)) solid #FFB020' : 'calc(4 * var(--lu)) solid rgba(255,255,255,0.8)',
            boxShadow: '0 calc(3 * var(--lu)) 0 rgba(120,90,40,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'calc(32 * var(--lu))', fontWeight: 700,
            color: i <= gi ? charColor(g.label) : '#AAA',
          }}>
            {i < gi ? '⭐' : g.label}
          </div>
        ))}
        {total === 1 && null}
      </div>
    </div>
  );
}
