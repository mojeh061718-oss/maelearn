// BLUEPRINT §11 — activities are data. Adding content = authoring JSON.
// zod validates at load time (cheap, and catches authoring mistakes early).

import { z } from 'zod';
import type { Glyph } from './traceScore';

export const SCENE_TYPES = [
  'trace', 'match', 'sort', 'count', 'pattern', 'phonics', 'shape', 'freedraw',
  'pop', 'feed', 'fish', 'memory', 'hide',
] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

// §7: phonics ladder order is enforced structurally — rung index gates content.
export const PHONICS_LADDER = [
  'compound', 'syllable', 'rhyme', 'alliteration', 'onset-rime', 'phoneme',
] as const;
export type PhonicsRung = (typeof PHONICS_LADDER)[number];

export const ActivitySchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string(),
  sceneType: z.enum(SCENE_TYPES),
  elofTags: z.object({
    domain: z.string(),
    subDomain: z.string(),
    goal: z.string(),
  }),
  difficulty: z.number().int().min(1).max(5),
  instruction: z.string(),
  params: z.unknown(),
});
export type Activity = z.infer<typeof ActivitySchema>;

export interface ContentBundle {
  activities: Activity[];
  glyphs: Record<string, Glyph>;
  /** ordered activity ids — the structured learning path */
  path: string[];
}

let bundle: ContentBundle | null = null;

export async function loadContent(): Promise<ContentBundle> {
  if (bundle) return bundle;
  const base = import.meta.env.BASE_URL;
  const [actsRaw, glyphsRaw, pathRaw] = await Promise.all([
    fetch(`${base}content/activities.json`).then((r) => r.json()),
    fetch(`${base}content/glyphs.json`).then((r) => r.json()),
    fetch(`${base}content/path.json`).then((r) => r.json()),
  ]);
  const activities = z.array(ActivitySchema).parse(actsRaw);
  bundle = { activities, glyphs: glyphsRaw as Record<string, Glyph>, path: z.array(z.string()).parse(pathRaw) };
  return bundle;
}

const GAME_SCENES: SceneType[] = ['pop', 'feed', 'fish', 'memory', 'hide'];
const isGame = (a: Activity): boolean => GAME_SCENES.includes(a.sceneType);

/** Groups for the home map — literal, single-word labels (§9). */
export const AREAS: { id: string; label: string; icon: string; color: string; scene: string; match: (a: Activity) => boolean }[] = [
  { id: 'letters', scene: 'park',  label: 'Letters',  icon: '🔤', color: '#FFE1E1', match: (a) => !isGame(a) && (a.elofTags.subDomain === 'print-alphabet' || a.elofTags.subDomain === 'writing') },
  { id: 'numbers', scene: 'peaks',  label: 'Numbers',  icon: '🔢', color: '#E1F0FF', match: (a) => !isGame(a) && a.elofTags.domain === 'mathematics' && a.elofTags.subDomain !== 'geometry' && a.elofTags.subDomain !== 'algebraic' },
  { id: 'shapes', scene: 'desert',   label: 'Shapes',   icon: '🔷', color: '#E1FFE9', match: (a) => !isGame(a) && a.elofTags.subDomain === 'geometry' },
  { id: 'patterns', scene: 'meadow', label: 'Patterns', icon: '🟡', color: '#FFF3D6', match: (a) => !isGame(a) && a.elofTags.subDomain === 'algebraic' },
  { id: 'sounds', scene: 'forest',   label: 'Sounds',   icon: '👂', color: '#F3E1FF', match: (a) => !isGame(a) && a.elofTags.subDomain === 'phonological' },
  { id: 'games', scene: 'castle',    label: 'Games',    icon: '🎈', color: '#FFE9D6', match: isGame },
  { id: 'drawing', scene: 'park',  label: 'Drawing',  icon: '🖍️', color: '#E1FFF9', match: (a) => a.sceneType === 'freedraw' },
];
