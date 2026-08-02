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
import { Dots } from '../ui/common';

interface TraceParams { glyphIds: string[]; speakEach?: boolean; celebrateWord?: string; }

export default function TraceScene({ activity, difficulty, onComplete, onMiss }: SceneProps) {
  const params = activity.params as TraceParams;
  const hostRef = useRef<HTMLDivElement>(null);
  const [glyphs, setGlyphs] = useState<Glyph[] | null>(null);
  const [gi, setGi] = useState(0);            // glyph index
  const [si, setSi] = useState(0);            // stroke index within glyph
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
      // start dot + guide dot on current stroke
      const s = g.strokes[st.si];
      if (s) {
        const [sx, sy] = s.points[0];
        gctx.beginPath(); gctx.arc(sx, sy, 20, 0, Math.PI * 2);
        gctx.fillStyle = '#06D6A0'; gctx.fill();
        const idx = Math.floor(guideT * (s.points.length - 1));
        const [dx, dy] = s.points[idx];
        gctx.beginPath(); gctx.arc(dx, dy, 12, 0, Math.PI * 2);
        gctx.fillStyle = 'rgba(255,107,107,0.9)'; gctx.fill();
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
          setTimeout(() => speak(`Now trace ${next.label}. ${next.strokes[0].hint}`), 700);
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
        if (res.pass) {
          advance();
        } else {
          st.misses += 1;
          onMiss();
          ink.undo();
          if (st.misses >= 2) {
            // §8: assisted accept — replay hint, take whatever she draws next...
            // actually: accept now and move on, with encouragement.
            st.assisted = true;
            speak('Good trying! Watch the dot, and off we go!');
            playSfx('good');
            advance();
          } else {
            playSfx('oops');
            speak(res.directionOk ? 'Almost! Start at the green dot.' : stroke.hint);
          }
        }
      },
    });

    const first = glyphs[0];
    if (first) speak(`Trace the ${activity.elofTags.subDomain === 'writing' && first.label.length === 1 && isNaN(Number(first.label)) ? 'letter' : ''} ${first.label}. ${first.strokes[0].hint}`);

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
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', top: 'calc(24 * var(--lu))', left: 0, right: 0, pointerEvents: 'none' }}>
        {total > 1 && <Dots total={total} done={gi} />}
        <div style={{ textAlign: 'center', fontSize: 'calc(30 * var(--lu))', color: '#8886', marginTop: 'calc(6 * var(--lu))' }}>
          {si + 1}
        </div>
      </div>
    </div>
  );
}
