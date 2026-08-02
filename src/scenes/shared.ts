import type { Activity } from '../core/content';

export interface SceneProps {
  activity: Activity;
  /** effective difficulty after silent step-down (BLUEPRINT §11) */
  difficulty: number;
  onComplete(result: { assisted: boolean }): void;
  onMiss(): void;
}

/** Kid-friendly letter sounds for TTS phonics. */
export const LETTER_SOUNDS: Record<string, string> = {
  A: 'ah', B: 'buh', C: 'kuh', D: 'duh', E: 'eh', F: 'fff', G: 'guh',
  H: 'huh', I: 'ih', J: 'juh', K: 'kuh', L: 'lll', M: 'mmm', N: 'nnn',
  O: 'oh', P: 'puh', Q: 'kwuh', R: 'rrr', S: 'sss', T: 'tuh', U: 'uh',
  V: 'vvv', W: 'wuh', X: 'ks', Y: 'yuh', Z: 'zzz',
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
