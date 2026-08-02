// BLUEPRINT §10 — IndexedDB stores: profile, progress, settings. No PII beyond
// a display name + avatar config. navigator.storage.persist() on first run.

import { openDB, type IDBPDatabase } from 'idb';

export interface Profile {
  id: 'main';
  displayName: string;
  avatar: { base: string; hat: string | null; pet: string | null };
  coins: number;
  stickers: string[];
}

export interface ProgressRecord {
  activityId: string;
  completions: number;
  lastResult: 'done' | 'assisted';
  /** consecutive unsuccessful attempts — drives silent step-down (§11) */
  misses: number;
  difficulty: number;
  elofDomain: string;
  updatedAt: number;
}

export interface Settings {
  id: 'main';
  penOnly: boolean;
  voiceOn: boolean;
}

const DB_NAME = 'maelie-hub';

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore('profile', { keyPath: 'id' });
        d.createObjectStore('progress', { keyPath: 'activityId' });
        d.createObjectStore('settings', { keyPath: 'id' });
      },
    });
  }
  return dbp;
}

export async function requestPersistence(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}

const DEFAULT_PROFILE: Profile = {
  id: 'main',
  displayName: 'Maelie',
  avatar: { base: '🐻', hat: null, pet: null },
  coins: 0,
  stickers: [],
};

export async function getProfile(): Promise<Profile> {
  return ((await (await db()).get('profile', 'main')) as Profile | undefined) ?? { ...DEFAULT_PROFILE };
}
export async function saveProfile(p: Profile): Promise<void> { await (await db()).put('profile', p); }

export async function getProgress(activityId: string): Promise<ProgressRecord | undefined> {
  return (await (await db()).get('progress', activityId)) as ProgressRecord | undefined;
}
export async function allProgress(): Promise<ProgressRecord[]> {
  return (await (await db()).getAll('progress')) as ProgressRecord[];
}
export async function saveProgress(r: ProgressRecord): Promise<void> { await (await db()).put('progress', r); }

export async function getSettings(): Promise<Settings> {
  return ((await (await db()).get('settings', 'main')) as Settings | undefined) ??
    { id: 'main', penOnly: false, voiceOn: true };
}
export async function saveSettings(s: Settings): Promise<void> { await (await db()).put('settings', s); }
