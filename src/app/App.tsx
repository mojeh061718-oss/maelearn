// App shell — home map, area lists, activity host, sticker book, parent gate.
// Navigation is component state (ADR-002: no router lib; ~6 screens, no deep
// linking needed for a single-child offline app).

import { useCallback, useEffect, useRef, useState } from 'react';
import { AREAS, loadContent, type Activity, type ContentBundle } from '../core/content';
import { getProfile, saveProfile, getProgress, saveProgress, allProgress, requestPersistence, type Profile } from '../core/storage';
import { onViewportChange, getViewport, type Viewport } from '../core/viewport';
import { playSfx, speak, stopSpeech } from '../core/audio';
import { SCENES } from '../scenes';
import { BackButton, BigButton, Celebration } from '../ui/common';
import M0Page from './M0Page';

type Route =
  | { name: 'home' }
  | { name: 'area'; areaId: string }
  | { name: 'activity'; activity: Activity }
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
    void requestPersistence(); // BLUEPRINT §10 — first-run persistence request
    void loadContent().then(setContent);
    void getProfile().then(setProfile);
    void allProgress().then((rs) => setDoneIds(new Set(rs.filter((r) => r.completions > 0).map((r) => r.activityId))));
    return onViewportChange(setVp);
  }, []);

  const go = useCallback((r: Route) => { stopSpeech(); setRoute(r); }, []);

  if (!content || !profile) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>🌞</div>;
  }

  // stage box: all UI inside the logical viewport (BLUEPRINT §4)
  return (
    <div
      style={{
        position: 'absolute',
        left: vp.offsetX, top: vp.offsetY, width: vp.cssW, height: vp.cssH,
        ['--lu' as string]: `${vp.scale}px`,
        overflow: 'hidden',
      }}
    >
      {route.name === 'home' && (
        <Home profile={profile} onArea={(id) => go({ name: 'area', areaId: id })}
          onStickers={() => go({ name: 'stickers' })} onParent={() => go({ name: 'parent' })} />
      )}
      {route.name === 'area' && (
        <AreaList content={content} areaId={route.areaId} doneIds={doneIds}
          onPick={(a) => go({ name: 'activity', activity: a })} onBack={() => go({ name: 'home' })} />
      )}
      {route.name === 'activity' && (
        <ActivityHost
          activity={route.activity}
          onExit={() => go({ name: 'area', areaId: AREAS.find((ar) => ar.match(route.activity))?.id ?? 'letters' })}
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
      {route.name === 'parent' && (
        <ParentGate onBack={() => go({ name: 'home' })} onM0={() => go({ name: 'm0' })} />
      )}
      {route.name === 'm0' && <M0Page onBack={() => go({ name: 'parent' })} />}
      {celebrating && (
        <Celebration icon={celebrating} onDone={() => {
          setCelebrating(null);
          if (route.name === 'activity') go({ name: 'area', areaId: AREAS.find((ar) => ar.match(route.activity))?.id ?? 'letters' });
        }} />
      )}
    </div>
  );
}

function Home(props: { profile: Profile; onArea: (id: string) => void; onStickers: () => void; onParent: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'calc(16 * var(--lu))',
        marginTop: 'calc(28 * var(--lu))',
      }}>
        <span style={{ fontSize: 'calc(56 * var(--lu))' }}>{props.profile.avatar.base}</span>
        <span style={{ fontSize: 'calc(44 * var(--lu))', fontWeight: 800, color: '#3D348B' }}>
          Hi {props.profile.displayName}!
        </span>
        <span style={{ fontSize: 'calc(32 * var(--lu))', background: '#FFD166', borderRadius: 'calc(20 * var(--lu))', padding: 'calc(6 * var(--lu)) calc(16 * var(--lu))', fontWeight: 800 }}>
          🪙 {props.profile.coins}
        </span>
      </div>
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'calc(28 * var(--lu))', alignContent: 'center', padding: 'calc(40 * var(--lu))',
      }}>
        {AREAS.map((a) => (
          <BigButton key={a.id} icon={a.icon} label={a.label} size={170} fontScale={0.42}
            color="#FFFFFF" burst onPress={() => props.onArea(a.id)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'calc(20 * var(--lu))', marginBottom: 'calc(24 * var(--lu))' }}>
        <BigButton icon="📒" label="Stickers" size={100} fontScale={0.4} color="#EAF6FF" onPress={props.onStickers} />
        {/* parent corner — small, plain, uninteresting to a 4-year-old */}
        <button onClick={props.onParent} style={{
          border: 'none', background: 'transparent', fontSize: 'calc(20 * var(--lu))',
          color: '#999', cursor: 'pointer', touchAction: 'none',
        }}>⚙ grown-ups</button>
      </div>
    </div>
  );
}

function AreaList(props: { content: ContentBundle; areaId: string; doneIds: Set<string>; onPick: (a: Activity) => void; onBack: () => void }) {
  const area = AREAS.find((a) => a.id === props.areaId)!;
  const acts = props.content.activities.filter(area.match);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <BackButton onPress={props.onBack} />
      <div style={{ textAlign: 'center', marginTop: 'calc(24 * var(--lu))', fontSize: 'calc(48 * var(--lu))', fontWeight: 800, color: '#3D348B' }}>
        {area.icon} {area.label}
      </div>
      <div style={{
        position: 'absolute', top: 'calc(120 * var(--lu))', bottom: 0, left: 0, right: 0,
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

function ActivityHost(props: { activity: Activity; onExit: () => void; onDone: (assisted: boolean) => void }) {
  const Scene = SCENES[props.activity.sceneType];
  const [misses, setMisses] = useState(0);
  // §11: silent step-down after two consecutive misses; never announced
  const effectiveDifficulty = Math.max(1, props.activity.difficulty - Math.floor(misses / 2));
  const doneRef = useRef(false);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
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
      <BackButton onPress={props.onExit} />
    </div>
  );
}

function StickerBook(props: { profile: Profile; onBack: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <BackButton onPress={props.onBack} />
      <div style={{ textAlign: 'center', marginTop: 'calc(24 * var(--lu))', fontSize: 'calc(48 * var(--lu))', fontWeight: 800, color: '#3D348B' }}>
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

/** Parent gate — hold both corners for 2s (BLUEPRINT: settings behind a gate). */
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
      <div style={{ position: 'absolute', inset: 0 }}>
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
    <div style={{ position: 'absolute', inset: 0 }}>
      <BackButton onPress={props.onBack} />
      <div style={{ textAlign: 'center', marginTop: 'calc(100 * var(--lu))', fontSize: 'calc(40 * var(--lu))', fontWeight: 800, color: '#3D348B' }}>
        Grown-up corner
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16 * var(--lu))', alignItems: 'center', marginTop: 'calc(40 * var(--lu))', fontSize: 'calc(24 * var(--lu))', color: '#555' }}>
        <p style={{ maxWidth: 'calc(640 * var(--lu))', textAlign: 'center' }}>
          Everything runs on this iPad. No accounts, no ads, no analytics, no network.
          Voice uses the built-in speech engine — if there's no sound, check the ringer switch and volume.
        </p>
        <button onClick={() => speak('Voice check! Hello!')} style={{ fontSize: 'calc(26 * var(--lu))', padding: 'calc(12 * var(--lu)) calc(24 * var(--lu))', borderRadius: 'calc(16 * var(--lu))', border: 'none', background: '#FFD166', fontWeight: 700, cursor: 'pointer' }}>
          🔊 Voice check
        </button>
        <button onClick={props.onM0} style={{ fontSize: 'calc(26 * var(--lu))', padding: 'calc(12 * var(--lu)) calc(24 * var(--lu))', borderRadius: 'calc(16 * var(--lu))', border: 'none', background: '#EAF6FF', fontWeight: 700, cursor: 'pointer' }}>
          🧪 M0 device tests
        </button>
      </div>
    </div>
  );
}
