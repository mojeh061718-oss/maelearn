// BLUEPRINT §6 — audio is the instruction channel for a pre-reader.
//   1. Exactly ONE AudioContext for the app's lifetime.
//   2. resume() only ever from user-gesture handlers.
//   3. Defensive re-resume on every pointerdown + visibilitychange.
//
// ADR-007 (supersedes ADR-003): voice-over is pre-generated neural TTS
// (Piper, en_US-amy-medium) shipped as mp3 clips + a text→file map, played
// through the single AudioContext. SFX are Kenney CC0 interface sounds (mp3).
// Web Speech API remains only as a fallback for unmapped strings; synthesized
// oscillator SFX remain only as a fallback for missing files.

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext {
  if (!ctx) {
    const AC: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

/** Idempotent + cheap; called from every pointerdown (§6 rule 3). */
export function resumeAudio(): void {
  const c = ensureCtx();
  if (c.state === 'suspended') void c.resume().catch(() => {});
}

document.addEventListener('pointerdown', resumeAudio, { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resumeAudio();
});

// ---------------------------------------------------------------- buffers
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

function loadBuffer(url: string): Promise<AudioBuffer | null> {
  let p = bufferCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((ab) => ensureCtx().decodeAudioData(ab))
      .catch(() => null);
    bufferCache.set(url, p);
  }
  return p;
}

function playBuffer(buf: AudioBuffer, gain = 1): AudioBufferSourceNode {
  const c = ensureCtx();
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g).connect(c.destination);
  src.start();
  return src;
}

// ---------------------------------------------------------------- voice map
let voiceMap: Record<string, string> = {};
let voiceReady = false;

export async function initAudio(): Promise<void> {
  const base = import.meta.env.BASE_URL;
  try {
    voiceMap = await fetch(`${base}voice/map.json`).then((r) => r.json());
  } catch { voiceMap = {}; }
  voiceReady = true;
  // warm the most common SFX
  for (const s of ['tap', 'pop', 'good', 'great', 'oops', 'coin'] as const) {
    void loadBuffer(`${base}assets/sfx/${s}.mp3`);
  }
}

const normalize = (t: string): string => t.trim().replace(/\s+/g, ' ');

let currentVO: AudioBufferSourceNode | null = null;

/** Voice-over: pre-generated clip if we have one, TTS fallback otherwise. */
export function speak(text: string, rate = 0.9): void {
  resumeAudio();
  const key = normalize(text);
  const file = voiceReady ? voiceMap[key] : undefined;
  if (file) {
    window.speechSynthesis?.cancel();
    void loadBuffer(`${import.meta.env.BASE_URL}voice/${file}`).then((buf) => {
      if (!buf) { speakTts(key, rate); return; }
      currentVO?.stop();
      currentVO = playBuffer(buf, 1);
      currentVO.onended = () => { currentVO = null; };
    });
    return;
  }
  speakTts(key, rate);
}

export function stopSpeech(): void {
  currentVO?.stop();
  currentVO = null;
  window.speechSynthesis?.cancel();
}

// ---- TTS fallback (unmapped strings only) ----
let voice: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  if (voice) return voice;
  const vs = window.speechSynthesis?.getVoices() ?? [];
  voice =
    vs.find((v) => v.lang.startsWith('en') && /Samantha|Karen|Ava|Zoe|premium|enhanced/i.test(v.name)) ??
    vs.find((v) => v.lang.startsWith('en-US')) ??
    vs.find((v) => v.lang.startsWith('en')) ?? null;
  return voice;
}
window.speechSynthesis?.addEventListener?.('voiceschanged', () => { voice = null; pickVoice(); });

function speakTts(text: string, rate: number): void {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.05;
  u.lang = 'en-US';
  const v = pickVoice();
  if (v) u.voice = v;
  synth.speak(u);
}

// ---------------------------------------------------------------- SFX
export type Sfx = 'tap' | 'pop' | 'good' | 'great' | 'oops' | 'coin' | 'whoosh' | 'chomp' | 'balloon';

export function playSfx(name: Sfx): void {
  resumeAudio();
  void loadBuffer(`${import.meta.env.BASE_URL}assets/sfx/${name}.mp3`).then((buf) => {
    if (buf) { playBuffer(buf, 0.5); return; }
    fallbackSfx(name);
  });
}

function tone(freq: number, dur: number, at: number, type: OscillatorType, gain: number): void {
  const c = ensureCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + at;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function fallbackSfx(name: Sfx): void {
  switch (name) {
    case 'tap': tone(520, 0.08, 0, 'sine', 0.15); break;
    case 'pop': case 'balloon': case 'chomp': tone(880, 0.09, 0, 'triangle', 0.2); break;
    case 'good': tone(523, 0.12, 0, 'sine', 0.2); tone(784, 0.2, 0.12, 'sine', 0.2); break;
    case 'great': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, i * 0.09, 'triangle', 0.2)); break;
    case 'oops': tone(330, 0.15, 0, 'sine', 0.12); break;
    case 'coin': tone(988, 0.07, 0, 'square', 0.08); tone(1319, 0.18, 0.06, 'square', 0.08); break;
    case 'whoosh': tone(400, 0.2, 0, 'sine', 0.08); break;
  }
}

/** Diagnostic surface for the M0 page. */
export function audioDiagnostics(): { state: string; sampleRate: number; voiceClips: number } {
  const c = ensureCtx();
  return { state: c.state, sampleRate: c.sampleRate, voiceClips: Object.keys(voiceMap).length };
}
