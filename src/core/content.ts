// BLUEPRINT §11 — activities are data. Adding content = authoring JSON.
// zod validates at load time (cheap, and catches authoring mistakes early).

import { z } from 'zod';
import type { Glyph } from './traceScore';

export const SCENE_TYPES = [
  'trace', 'match', 'sort', 'count', 'pattern', 'phonics', 'shape', 'freedraw',
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
  params: z.unknown(),
});
export type Activity = z.infer<typeof ActivitySchema>;

export interface ContentBundle {
  activities: Activity[];
  glyphs: Record<string, Glyph>;
}

let bundle: ContentBundle | null = null;

export async function loadContent(): Promise<ContentBundle> {
  if (bundle) return bundle;
  const base = import.meta.env.BASE_URL;
  const [actsRaw, glyphsRaw] = await Promise.all([
    fetch(`${base}content/activities.json`).then((r) => r.json()),
    fetch(`${base}content/glyphs.json`).then((r) => r.json()),
  ]);
  const activities = z.array(ActivitySchema).parse(actsRaw);
  bundle = { activities, glyphs: glyphsRaw as Record<string, Glyph> };
  return bundle;
}

/** Groups for the home map — literal, single-word labels (§9). */
export const AREAS: { id: string; label: string; icon: string; match: (a: Activity) => boolean }[] = [
  { id: 'letters',  label: 'Letters',  icon: '🔤', match: (a) => a.elofTags.subDomain === 'print-alphabet' || a.elofTags.subDomain === 'writing' },
  { id: 'numbers',  label: 'Numbers',  icon: '🔢', match: (a) => a.elofTags.domain === 'mathematics' && a.elofTags.subDomain !== 'geometry' && a.elofTags.subDomain !== 'algebraic' },
  { id: 'shapes',   label: 'Shapes',   icon: '🔷', match: (a) => a.elofTags.subDomain === 'geometry' },
  { id: 'patterns', label: 'Patterns', icon: '🟡', match: (a) => a.elofTags.subDomain === 'algebraic' },
  { id: 'sounds',   label: 'Sounds',   icon: '👂', match: (a) => a.elofTags.subDomain === 'phonological' },
  { id: 'drawing',  label: 'Drawing',  icon: '🖍️', match: (a) => a.sceneType === 'freedraw' },
];
