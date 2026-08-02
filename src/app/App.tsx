// App shell — path (structured learning), home map, area lists, activity host
// with instruction overlay, sticker book, parent gate.
// Navigation is component state (ADR-002).

import { useCallback, useEffect, useRef, useState } from 'react';
import { AREAS, loadContent, type Activity, type ContentBundle } from '../core/content';
import { getProfile, saveProfile, getProgress, saveProgress, allProgress, requestPersistence, type Profile } from '../core/storage';
import { onViewportChange, getViewport, type Viewport } from '../core/viewport';
import { initAudio, playSfx, speak, stopSpeech } from '../core/audio';
import { SCENES } from '../scenes';
import { art } from '../scenes/shared';
import { BackButton, BigButton, Celebration } from '../ui/common';
import Background from '../ui/Background';
import M0Page from './M0Page';

type Route =
  | { name: 'home' }
  | { name: 'path' }
  | { name: 'area'; areaId: string }
  | { name: 'activity'; activity: Activity; from: 'path' | 'area' }
  | { name: 'stickers' }
  | { name: 'parent' }
  | { name: 'm0' };

const STICKER_POOL = ['🦄', '🐬', '🌈', '🚀', '🦖', '🧸', '🎠', '🐙', '🦩', '🍦', '🎨', '🐨', '⭐', '🎪', '🦜'];
const COINS_PER_STICKER = 3;

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [content, setContent] = useState<ContentBundle | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [vp, setVp] = useState<Viewport>(getViewport());
  const [celebrating, setCelebrating] = useState<string | null>(null);

  useEffect(() => {
    void requestPersistence(); // BLUEPRINT §10
    void initAudio();
    void loadContent().then(setContent);
    void getProfile().then(setProfile);
    void allProgress().then((rs) => setDoneIds(new Set(rs.filter((r) => r.completions > 0).map((r) => r.activityId))));
    return onViewportChange(setVp);
  }, []);

  const go = useCallback((r: Route) => { stopSpeech(); setRoute(r); }, []);

  if (!content || !profile) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>🌞</div>;
  }

  const pathActivities = content.path
    .map((id) => content.activities.find((a) => a.id === id))
    .filter((a): a is Activity => !!a);
  const pathIndex = pathActivities.findIndex((a) => !doneIds.has(a.id));
  const currentPathIdx = pathIndex === -1 ? pathActivities.length : pathIndex;

  return (
    <div
      style={{
        position: 'absolute',
        left: vp.offsetX, top: vp.offsetY, width: vp.cssW, height: vp.cssH,
        ['--lu' as string]: `${vp.scale}px`,
        overflow: 'hidden',
        fontFamily: "'Fredoka', -apple-system, 'SF Pro Rounded', 'Chalkboard SE', sans-serif",
      }}
    >
      {route.name === 'home' && (
        <Home profile={profile} pathDone={currentPathIdx} pathTotal={pathActivities.length}
          onPlay={() => go({ name: 'path' })}
          onArea={(id) => go({ name: 'area', areaId: id })}
          onStickers={() => go({ name: 'stickers' })} onParent={() => go({ name: 'parent' })} />
      )}
      {route.name === 'path' && (
        <PathScreen activities={pathActivities} currentIdx={currentPathIdx} doneIds={doneIds}
          onPick={(a) => go({ name: 'activity', activity: a, from: 'path' })}
          onBack={() => go({ name: 'home' })} />
      )}
      {route.name === 'area' && (
        <AreaList content={content} areaId={route.areaId} doneIds={doneIds}
          onPick={(a) => go({ name: 'activity', activity: a, from: 'area' })} onBack={() => go({ name: 'home' })} />
      )}
      {route.name === 'activity' && (
        <ActivityHost
          activity={route.activity}
          onExit={() => go(route.from === 'path' ? { name: 'path' } : { name: 'area', areaId: AREAS.find((ar) => ar.match(route.activity))?.id ?? 'letters' })}
          onDone={async (assisted) => {
            const rec = (await getProgress(route.activity.id)) ?? {
              activityId: route.activity.id, completions: 0, lastResult: 'done' as const,
              misses: 0, difficulty: route.activity.difficulty,
              elofDomain: route.activity.elofTags.domain, updatedAt: 0,
            };
            rec.completions += 1;
            rec.lastResult = assisted ? 'assisted' : 'done';
            rec.updatedAt = Date.now();
            await saveProgress(rec);
            const p = { ...profile, coins: profile.coins + 1 };
            const earned = Math.floor(p.coins / COINS_PER_STICKER);
            p.stickers = STICKER_POOL.slice(0, Math.min(earned, STICKER_POOL.length));
            await saveProfile(p);
            setProfile(p);
            setDoneIds(new Set([...doneIds, route.activity.id]));
            playSfx('coin');
            setCelebrating(route.activity.icon);
          }}
        />
      )}
      {route.name === 'stickers' && <StickerBook profile={profile} onBack={() => go({ name: 'home' })} />}
      {route.name === 'parent' && <ParentGate onBack={() => go({ name: 'home' })} onM0={() => go({ name: 'm0' })} />}
      {route.name === 'm0' && <M0Page onBack={() => go({ name: 'parent' })} />}
      {celebrating && (
        <Celebration icon={celebrating} onDone={() => {
          setCelebrating(null);
          if (route.name === 'activity') {
            go(route.from === 'path' ? { name: 'path' } : { name: 'area', areaId: AREAS.find((ar) => ar.match(route.activity))?.id ?? 'letters' });
          }
        }} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ home
function Home(props: {
  profile: Profile; pathDone: number; pathTotal: number;
  onPlay: () => void; onArea: (id: string) => void; onStickers: () => void; onParent: () => void;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Background animate tint="#A8DCFF" />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(14 * var(--lu))', marginTop: 'calc(20 * var(--lu))' }}>
          <span style={{ fontSize: 'calc(46 * var(--lu))', fontWeight: 700, color: '#3D348B', textShadow: '0 2px 0 #FFF' }}>
            Hi {props.profile.displayName}!
          </span>
          <span style={{ fontSize: 'calc(26 * var(--lu))', background: '#FFD166', borderRadius: 'calc(20 * var(--lu))', padding: 'calc(6 * var(--lu)) calc(14 * var(--lu))', fontWeight: 700, boxShadow: '0 calc(3 * var(--lu)) 0 rgba(0,0,0,0.12)' }}>
            🪙 {props.profile.coins}
          </span>
        </div>

        {/* mascot + big play */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(30 * var(--lu))', marginTop: 'calc(8 * var(--lu))' }}>
          <img src={art('animal_monkey.png')} alt="" draggable={false}
            style={{ width: 'calc(150 * var(--lu))', filter: 'drop-shadow(0 calc(6 * var(--lu)) calc(5 * var(--lu)) rgba(0,0,0,0.18))' }} />
          <button onClick={() => { playSfx('tap'); props.onPlay(); }} style={{
            border: 'none', cursor: 'pointer', touchAction: 'none',
            background: 'linear-gradient(180deg, #FF8A5C, #FF6B6B)',
            borderRadius: 'calc(36 * var(--lu))',
            padding: 'calc(18 * var(--lu)) calc(56 * var(--lu))',
            boxShadow: '0 calc(8 * var(--lu)) 0 #D14D4D',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 'calc(56 * var(--lu))', fontWeight: 700, color: '#FFF', textShadow: '0 2px 2px rgba(0,0,0,0.2)' }}>▶ Play!</span>
            <span style={{ fontSize: 'calc(22 * var(--lu))', color: '#FFE9E1', fontWeight: 600 }}>
              {props.pathDone} / {props.pathTotal} stars on the path
            </span>
          </button>
        </div>

        {/* free-choice areas */}
        <div style={{
          marginTop: 'calc(24 * var(--lu))',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 'calc(34 * var(--lu))',
          padding: 'calc(20 * var(--lu))',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'calc(16 * var(--lu))',
          backdropFilter: 'blur(4px)',
        }}>
          {AREAS.map((a) => (
            <BigButton key={a.id} icon={a.icon} label={a.label} size={118} fontScale={0.4}
              color={a.color} burst onPress={() => props.onArea(a.id)} />
          ))}
          <BigButton icon="📒" label="Stickers" size={118} fontScale={0.4} color="#FFFFFF" onPress={props.onStickers} />
        </div>

        <button onClick={props.onParent} style={{
          position: 'absolute', bottom: 'calc(10 * var(--lu))', right: 'calc(14 * var(--lu))',
          border: 'none', background: 'transparent', fontSize: 'calc(18 * var(--lu))',
          color: '#8888', cursor: 'pointer', touchAction: 'none', fontFamily: 'inherit',
        }}>⚙ grown-ups</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ path
function PathScreen(props: {
  activities: Activity[]; currentIdx: number; doneIds: Set<string>;
  onPick: (a: Activity) => void; onBack: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // scroll the current stone into view
    const el = scrollRef.current?.querySelector('[data-current="true"]');
    el?.scrollIntoView({ block: 'center' });
  }, []);
  const STEP_H = 150; // logical units per stone row

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Background tint="#C5EFC9" />
      <BackButton onPress={props.onBack} />
      <div style={{ textAlign: 'center', marginTop: 'calc(22 * var(--lu))', fontSize: 'calc(44 * var(--lu))', fontWeight: 700, color: '#2E7D32', textShadow: '0 2px 0 #FFF' }}>
        🗺️ My Path
      </div>
      <div ref={scrollRef} style={{
        position: 'absolute', top: 'calc(100 * var(--lu))', bottom: 0, left: 0, right: 0,
        overflowY: 'auto', touchAction: 'pan-y',
      }}>
        <div style={{ position: 'relative', height: `calc(${props.activities.length * STEP_H + 80} * var(--lu))` }}>
          {props.activities.map((a, i) => {
            const done = props.doneIds.has(a.id);
            const current = i === props.currentIdx;
            const locked = i > props.currentIdx;
            const xPct = 50 + Math.sin(i * 0.9) * 26; // winding trail
            return (
              <div key={a.id} data-current={current}
                onClick={() => { if (!locked) { playSfx('tap'); props.onPick(a); } else { playSfx('oops'); speak('Finish the glowing one first!'); } }}
                style={{
                  position: 'absolute',
                  top: `calc(${i * STEP_H + 10} * var(--lu))`,
                  left: `${xPct}%`, transform: 'translateX(-50%)',
                  width: 'calc(120 * var(--lu))', height: 'calc(120 * var(--lu))',
                  borderRadius: '50%',
                  background: done ? '#C9F2D9' : current ? '#FFFFFF' : '#E7E2D5',
                  border: current ? 'calc(6 * var(--lu)) solid #FFB020' : 'calc(6 * var(--lu)) solid rgba(0,0,0,0.06)',
                  boxShadow: current
                    ? '0 0 calc(28 * var(--lu)) rgba(255,176,32,0.75), 0 calc(6 * var(--lu)) 0 rgba(0,0,0,0.12)'
                    : '0 calc(5 * var(--lu)) 0 rgba(0,0,0,0.1)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'calc(44 * var(--lu))',
                  filter: locked ? 'grayscale(0.7) opacity(0.7)' : 'none',
                  cursor: locked ? 'default' : 'pointer',
                  touchAction: 'pan-y',
                  transition: 'transform 0.15s',
                }}>
                <span>{locked ? '🔒' : a.icon}</span>
                <span style={{ fontSize: 'calc(18 * var(--lu))', fontWeight: 700, color: '#555' }}>{a.title}</span>
                {done && <span style={{ position: 'absolute', top: 'calc(-14 * var(--lu))', right: 'calc(-6 * var(--lu))', fontSize: 'calc(38 * var(--lu))' }}>⭐</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ areas
function AreaList(props: { content: ContentBundle; areaId: string; doneIds: Set<string>; onPick: (a: Activity) => void; onBack: () => void }) {
  const area = AREAS.find((a) => a.id === props.areaId)!;
  const acts = props.content.activities.filter(area.match);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Background tint={area.color} />
      <BackButton onPress={props.onBack} />
      <div style={{ textAlign: 'center', marginTop: 'calc(24 * var(--lu))', fontSize: 'calc(46 * var(--lu))', fontWeight: 700, color: '#3D348B', textShadow: '0 2px 0 #FFF' }}>
        {area.icon} {area.label}
      </div>
      <div style={{
        position: 'absolute', top: 'calc(110 * var(--lu))', bottom: 0, left: 0, right: 0,
        overflowY: 'auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(calc(150 * var(--lu)), 1fr))',
        gap: 'calc(20 * var(--lu))', padding: 'calc(30 * var(--lu))',
        touchAction: 'pan-y',
        alignContent: 'start',
      }}>
        {acts.map((a) => (
          <div key={a.id} style={{ position: 'relative' }}>
            <BigButton icon={a.icon} label={a.title} size={140} fontScale={0.4}
              color={props.doneIds.has(a.id) ? '#E8FFF5' : '#FFFFFF'}
              onPress={() => props.onPick(a)} />
            {props.doneIds.has(a.id) && (
              <span style={{ position: 'absolute', top: 'calc(-6 * var(--lu))', right: 'calc(-6 * var(--lu))', fontSize: 'calc(34 * var(--lu))' }}>⭐</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ activity host + instruction overlay
function ActivityHost(props: { activity: Activity; onExit: () => void; onDone: (assisted: boolean) => void }) {
  const Scene = SCENES[props.activity.sceneType];
  const [misses, setMisses] = useState(0);
  const [started, setStarted] = useState(false);
  const effectiveDifficulty = Math.max(1, props.activity.difficulty - Math.floor(misses / 2)); // §11: silent step-down
  const doneRef = useRef(false);
  const area = AREAS.find((ar) => ar.match(props.activity));

  useEffect(() => {
    const t = setTimeout(() => speak(props.activity.instruction), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Background tint={area?.color ?? '#BDE6FF'} />
      {started && (
        <Scene
          activity={props.activity}
          difficulty={effectiveDifficulty}
          onMiss={() => setMisses((m) => m + 1)}
          onComplete={({ assisted }) => {
            if (doneRef.current) return;
            doneRef.current = true;
            props.onDone(assisted);
          }}
        />
      )}
      <BackButton onPress={props.onExit} />
      {started && (
        <div onClick={() => speak(props.activity.instruction)} style={{
          position: 'absolute', top: 'calc(16 * var(--lu))', right: 'calc(16 * var(--lu))',
          width: 'calc(88 * var(--lu))', height: 'calc(88 * var(--lu))', borderRadius: '50%',
          background: '#FFF3D6', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'calc(40 * var(--lu))', boxShadow: '0 calc(4 * var(--lu)) 0 rgba(0,0,0,0.12)',
          cursor: 'pointer', touchAction: 'none', zIndex: 20,
        }}>🔊</div>
      )}
      {!started && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 'calc(22 * var(--lu))',
          background: 'rgba(255,248,231,0.75)', backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: 'calc(40 * var(--lu))',
            padding: 'calc(36 * var(--lu)) calc(60 * var(--lu))',
            boxShadow: '0 calc(10 * var(--lu)) 0 rgba(0,0,0,0.1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'calc(14 * var(--lu))',
            maxWidth: 'calc(640 * var(--lu))',
          }}>
            <span style={{ fontSize: 'calc(110 * var(--lu))' }}>{props.activity.icon}</span>
            <span style={{ fontSize: 'calc(40 * var(--lu))', fontWeight: 700, color: '#3D348B' }}>{props.activity.title}</span>
            <span style={{ fontSize: 'calc(26 * var(--lu))', color: '#666', textAlign: 'center', lineHeight: 1.35 }}>
              {props.activity.instruction}
            </span>
          </div>
          <button onClick={() => { playSfx('good'); setStarted(true); }} style={{
            border: 'none', cursor: 'pointer', touchAction: 'none', fontFamily: 'inherit',
            background: 'linear-gradient(180deg, #35D07F, #06D6A0)',
            borderRadius: 'calc(32 * var(--lu))',
            padding: 'calc(16 * var(--lu)) calc(70 * var(--lu))',
            boxShadow: '0 calc(7 * var(--lu)) 0 #059B74',
            fontSize: 'calc(48 * var(--lu))', fontWeight: 700, color: '#FFF',
            textShadow: '0 2px 2px rgba(0,0,0,0.2)',
          }}>GO!</button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ stickers
function StickerBook(props: { profile: Profile; onBack: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Background tint="#FFE1F0" />
      <BackButton onPress={props.onBack} />
      <div style={{ textAlign: 'center', marginTop: 'calc(24 * var(--lu))', fontSize: 'calc(46 * var(--lu))', fontWeight: 700, color: '#3D348B', textShadow: '0 2px 0 #FFF' }}>
        📒 Stickers
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'calc(20 * var(--lu))',
        padding: 'calc(60 * var(--lu))', alignContent: 'center',
      }}>
        {STICKER_POOL.map((s, i) => (
          <div key={s} style={{
            fontSize: 'calc(80 * var(--lu))', textAlign: 'center',
            filter: i < props.profile.stickers.length ? 'none' : 'grayscale(1) opacity(0.25)',
            transform: i < props.profile.stickers.length ? 'scale(1)' : 'scale(0.85)',
            transition: 'all 0.3s',
          }}>{s}</div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 'calc(26 * var(--lu))', color: '#888' }}>
        🪙 {COINS_PER_STICKER} coins = 1 sticker
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ parent gate
function ParentGate(props: { onBack: () => void; onM0: () => void }) {
  const [open, setOpen] = useState(false);
  const holds = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function press(id: string, on: boolean): void {
    if (on) holds.current.add(id); else holds.current.delete(id);
    if (holds.current.size === 2 && !timer.current) {
      timer.current = setTimeout(() => { setOpen(true); playSfx('good'); }, 2000);
    } else if (holds.current.size < 2 && timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  const pad: React.CSSProperties = {
    position: 'absolute', width: 'calc(140 * var(--lu))', height: 'calc(140 * var(--lu))',
    borderRadius: 'calc(28 * var(--lu))', background: '#EAF6FF',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 'calc(40 * var(--lu))', touchAction: 'none', userSelect: 'none',
  };

  if (!open) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#FFF8E7' }}>
        <BackButton onPress={props.onBack} />
        <div style={{ textAlign: 'center', marginTop: 'calc(140 * var(--lu))', fontSize: 'calc(30 * var(--lu))', color: '#666', padding: '0 calc(120 * var(--lu))' }}>
          Grown-ups: press and hold <b>both</b> blue squares at the same time for 2 seconds.
        </div>
        <div style={{ ...pad, left: 'calc(60 * var(--lu))', bottom: 'calc(60 * var(--lu))' }}
          onPointerDown={() => press('L', true)} onPointerUp={() => press('L', false)} onPointerLeave={() => press('L', false)}>✋</div>
        <div style={{ ...pad, right: 'calc(60 * var(--lu))', bottom: 'calc(60 * var(--lu))' }}
          onPointerDown={() => press('R', true)} onPointerUp={() => press('R', false)} onPointerLeave={() => press('R', false)}>✋</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#FFF8E7' }}>
      <BackButton onPress={props.onBack} />
      <div style={{ textAlign: 'center', marginTop: 'calc(100 * var(--lu))', fontSize: 'calc(40 * var(--lu))', fontWeight: 700, color: '#3D348B' }}>
        Grown-up corner
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16 * var(--lu))', alignItems: 'center', marginTop: 'calc(40 * var(--lu))', fontSize: 'calc(24 * var(--lu))', color: '#555' }}>
        <p style={{ maxWidth: 'calc(640 * var(--lu))', textAlign: 'center' }}>
          Everything runs on this iPad. No accounts, no ads, no analytics, no network.
          If there's no sound, check the ringer switch and volume.
        </p>
        <button onClick={() => speak('Voice check! Hello Maelie!')} style={{ fontFamily: 'inherit', fontSize: 'calc(26 * var(--lu))', padding: 'calc(12 * var(--lu)) calc(24 * var(--lu))', borderRadius: 'calc(16 * var(--lu))', border: 'none', background: '#FFD166', fontWeight: 700, cursor: 'pointer' }}>
          🔊 Voice check
        </button>
        <button onClick={props.onM0} style={{ fontFamily: 'inherit', fontSize: 'calc(26 * var(--lu))', padding: 'calc(12 * var(--lu)) calc(24 * var(--lu))', borderRadius: 'calc(16 * var(--lu))', border: 'none', background: '#EAF6FF', fontWeight: 700, cursor: 'pointer' }}>
          🧪 M0 device tests
        </button>
      </div>
    </div>
  );
}
