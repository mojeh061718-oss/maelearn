// BLUEPRINT §6 — audio is the instruction channel for a pre-reader.
// Rules implemented here:
//   1. Exactly ONE AudioContext for the app's lifetime.
//   2. resume() only ever from user-gesture handlers.
//   3. Defensive re-resume on every pointerdown + visibilitychange
//      (iOS reportedly re-suspends after ~5s idle — research S19).
//
// ADR-003: SFX are synthesized (oscillator/noise) and voice-over uses the
// on-device Web Speech API — zero audio assets, fully offline, and it
// sidesteps decode/preload work. Swappable for recorded VO later.

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext {
  if (!ctx) {
    const AC: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

/** Idempotent + cheap; called from every pointerdown (BLUEPRINT §6 rule 3). */
export function resumeAudio(): void {
  const c = ensureCtx();
  if (c.state === 'suspended') void c.resume().catch(() => {});
}

document.addEventListener('pointerdown', resumeAudio, { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resumeAudio();
});

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

export type Sfx = 'tap' | 'pop' | 'good' | 'great' | 'oops' | 'coin' | 'whoosh';

/** Short synthesized stings tied to the child's own action (BLUEPRINT §9). */
export function playSfx(name: Sfx): void {
  resumeAudio();
  switch (name) {
    case 'tap':    tone(520, 0.08, 0, 'sine', 0.15); break;
    case 'pop':    tone(880, 0.09, 0, 'triangle', 0.2); tone(1320, 0.07, 0.03, 'sine', 0.12); break;
    case 'good':   tone(523, 0.12, 0, 'sine', 0.2); tone(659, 0.12, 0.1, 'sine', 0.2); tone(784, 0.2, 0.2, 'sine', 0.22); break;
    case 'great':  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, i * 0.09, 'triangle', 0.2)); break;
    case 'oops':   tone(330, 0.15, 0, 'sine', 0.12); tone(262, 0.2, 0.12, 'sine', 0.1); break; // gentle, not a fail buzzer
    case 'coin':   tone(988, 0.07, 0, 'square', 0.08); tone(1319, 0.18, 0.06, 'square', 0.08); break;
    case 'whoosh': { // filtered noise sweep
      const c = ensureCtx();
      const len = c.sampleRate * 0.25;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(400, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(2400, c.currentTime + 0.22);
      const g = c.createGain();
      g.gain.value = 0.12;
      src.connect(f).connect(g).connect(c.destination);
      src.start();
      break;
    }
  }
}

let voice: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  if (voice) return voice;
  const vs = window.speechSynthesis?.getVoices() ?? [];
  voice =
    vs.find((v) => v.lang.startsWith('en') && /Samantha|Karen|female|child/i.test(v.name)) ??
    vs.find((v) => v.lang.startsWith('en')) ?? null;
  return voice;
}
window.speechSynthesis?.addEventListener?.('voiceschanged', () => { voice = null; pickVoice(); });

/** Voice-over via on-device TTS. Cancels anything still speaking. */
export function speak(text: string, rate = 0.85): void {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.1;
  const v = pickVoice();
  if (v) u.voice = v;
  synth.speak(u);
}

export function stopSpeech(): void { window.speechSynthesis?.cancel(); }

/** Diagnostic surface for the M0 page. */
export function audioDiagnostics(): { state: string; sampleRate: number } {
  const c = ensureCtx();
  return { state: c.state, sampleRate: c.sampleRate };
}
