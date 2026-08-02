# Maelie's Learning Hub — Architecture Blueprint

**Status:** specification, not implemented
**Audience:** the implementing engineer
**Companion docs:** `docs/research/00-research-report.md` (the *why*, with citations) · `docs/HANDOFF-FABLE.md` (build order and acceptance criteria)

Every decision below marked **[LOCKED]** is settled — implement it as written, do
not re-litigate. Decisions marked **[OPEN]** are genuinely yours to make; pick
one, write down what you picked and why, and move on. Where a decision traces to
research, the source tag (`S12`, `S22`, …) points into the research report's
source table.

---

## 1. Product constraints

Single user: one 4-year-old, on one iPad, who bores easily. That's the whole
product context, and it drives more architecture than it looks like it should.

**[LOCKED]** Hard constraints:

| Constraint | Value | Why |
|---|---|---|
| Delivery | Installable PWA, Home Screen web app | User's requirement |
| Minimum OS | **iPadOS 18.2** | `getCoalescedEvents()` landed in Safari 18.2 (S12) |
| Network at runtime | **None.** Fully offline after install | No COPPA surface (S7/S9); no loading stalls (S24) |
| Backend | **None.** No accounts, no sync, no analytics | Same |
| Orientation | **Both.** Landscape and portrait must work | `ScreenOrientation.lock()` is not Baseline and needs fullscreen (S20) |
| Primary input | **Finger.** Apple Pencil is a bonus path only | She is four |
| Session target | 5–8 minutes with a clean exit | PK4 attention ceiling is 20 min *adult-led* (S22) |

**[LOCKED]** Non-goals — do not build these, they are excluded on evidence, not
on budget:

- No looping background music (continuous distraction measurably impairs
  4-year-olds; intermittent feedback does not — S23)
- No idle-state character nagging (S25)
- No streaks, daily-return prompts, or countdown urgency (S25)
- No hard-fail states anywhere
- No tap-to-pop mechanics presented as learning (classified minds-*off* — S23)
- No ambient background animation while an activity is in progress
- No third-party analytics, ads, or SDKs of any kind

---

## 2. Stack

**[LOCKED]**

| Layer | Choice | Notes |
|---|---|---|
| Build | Vite + TypeScript (strict) | |
| Shell UI | React 18+ | Menus, map, settings — DOM only |
| Activity surface | PixiJS v8 | WebGL sprites/particles. **Not** React-rendered |
| Ink surface | Canvas 2D, `{ desynchronized: true }` | Separate canvas from Pixi (S14) |
| Stroke geometry | `perfect-freehand` | MIT (S16) |
| Character animation | Rive (`@rive-app/canvas`) | State machines; browser-based authoring (S6/S29) |
| Audio | Single `AudioContext`, hand-rolled bus | See §6 — do not reach for a library before reading it |
| Storage | IndexedDB via `idb` | |
| Offline | Workbox service worker, precache-all | |
| Content validation | `zod` | Dev-time only; tree-shaken from prod |
| Art/audio baseline | Kenney All-in-1, CC0, $19.95 | 60k assets, 1200+ sounds, no attribution required (S28) |

**[OPEN]** Router choice, state-management for shell UI (React context is
probably sufficient — there is very little global state), test runner.

---

## 3. Repository layout

```
maelearn/
├─ docs/
│  ├─ BLUEPRINT.md                  ← this file
│  ├─ HANDOFF-FABLE.md
│  └─ research/00-research-report.md
├─ public/
│  ├─ manifest.webmanifest
│  ├─ icons/                        # 180/192/512 + maskable
│  └─ content/
│     ├─ activities/*.json          # one file per activity
│     └─ glyphs/*.json              # letterform stroke paths (§8)
├─ src/
│  ├─ main.tsx
│  ├─ app/                          # shell: routes, map, settings, parent gate
│  ├─ core/
│  │  ├─ input/     PointerInput.ts, viewport.ts
│  │  ├─ render/    PixiStage.ts, InkLayer.ts
│  │  ├─ audio/     AudioBus.ts
│  │  ├─ storage/   db.ts, progress.ts, settings.ts
│  │  ├─ content/   loader.ts, schema.ts
│  │  └─ scoring/   traceScore.ts
│  ├─ scenes/                       # one module per scene type (§7)
│  ├─ ui/                           # design-system components (§9)
│  └─ types/
└─ tools/                           # glyph authoring, content validation CLI
```

---

## 4. Coordinate system and viewport

**[LOCKED]** All game logic, content authoring, and scoring happen in a fixed
**logical space of 1024 × 768 units**. Never use CSS pixels in scene or scoring
code.

`core/input/viewport.ts` owns the single transform:

```ts
interface Viewport {
  scale: number;        // logical → CSS px
  offsetX: number;      // letterbox offset, CSS px
  offsetY: number;
  dpr: number;          // devicePixelRatio, clamped to ≤ 3
  toLogical(clientX: number, clientY: number): { x: number; y: number };
  toCss(lx: number, ly: number): { x: number; y: number };
}
```

Fit-and-letterbox: `scale = min(vw / 1024, vh / 768)`, centered. Portrait gets
the same logical space with larger letterbox bands — put decorative framing
there, never interactive targets.

Canvas backing stores are sized `logical × scale × dpr`; CSS size is
`logical × scale`. **Every canvas uses the same transform.** A mismatch between
the Pixi layer and the ink layer is the single most likely source of "the ink
doesn't land under her finger" bugs.

---

## 5. Input pipeline

This is the part that has to be right. Everything else is recoverable.

### 5.1 Layer stack

Bottom to top:

1. **Background** — DOM/CSS. Static. No animation during an activity.
2. **Pixi canvas** — sprites, particles, the ghost glyph being traced.
3. **Ink canvas** — Canvas 2D `desynchronized: true`. Committed strokes + live stroke.
4. **DOM overlay** — chrome, buttons, modals. `pointer-events: none` except on controls.

**[LOCKED]** The ink canvas is separate from Pixi and stays cheap. Safari drops
pointer samples during slow animation frames (S14) — a heavy render loop
degrades input *accuracy*, not just frame rate.

### 5.2 PointerInput module

**[LOCKED]** One module owns all pointer handling. Scenes subscribe; scenes never
attach their own pointer listeners.

```ts
interface Sample {
  x: number;          // logical space
  y: number;
  pressure: number;   // 0..1; constant ~0.5 for finger on iOS
  t: number;          // performance.now()
  type: 'touch' | 'pen' | 'mouse';
}

interface StrokeEvents {
  onStrokeStart(s: Sample): void;
  onStrokeMove(samples: Sample[], predicted: Sample[]): void;
  onStrokeEnd(all: Sample[]): void;
}
```

Event flow:

```
pointerdown → setPointerCapture(e.pointerId) → begin stroke
pointermove → const raw = e.getCoalescedEvents?.() ?? [e]
            → map through viewport.toLogical → push to buffer
            → predicted = e.getPredictedEvents?.() ?? []
rAF         → getStroke(buffer, opts) → Path2D → fill on ink ctx
pointerup   → finalize, score, releasePointerCapture
pointercancel → treat as end; never leave a dangling stroke
```

**[LOCKED]** Feature-detect `getCoalescedEvents` and `getPredictedEvents` — both
optional-chained with a single-event fallback. The app must run, degraded, on an
older iPad.

**[LOCKED]** Required CSS on the interactive surface:

```css
touch-action: none;              /* mandatory — suppresses scroll/zoom (S16) */
user-select: none;
-webkit-user-select: none;
-webkit-touch-callout: none;     /* kills long-press callout */
overscroll-behavior: none;
```

Plus `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">` to stop double-tap zoom.

**[LOCKED]** Palm rejection is **opt-in only**, behind an explicit Pencil mode.
Default mode accepts `pointerType === 'touch'`. Do not build a Pencil-first app.

### 5.3 Ink rendering

`perfect-freehand`'s `getStroke(points, options)` returns an outline polygon,
which is what allows variable-width ink (S16). Convert to an SVG path string and
feed `new Path2D(...)`, then `ctx.fill()`.

**[LOCKED]** Starting options — tuned for a 4-year-old's hand, expect to adjust
after M0:

```ts
{ size: 26, thinning: 0.35, smoothing: 0.6, streamline: 0.5,
  simulatePressure: true,  // finger reports constant pressure on iOS (S16)
  start: { taper: 0, cap: true }, end: { taper: 0, cap: true } }
```

`size` is deliberately much larger than perfect-freehand's default of 8 — this is
a chunky crayon, not a pen. When a Pencil is detected, pass real `e.pressure` and
set `simulatePressure: false`.

Redraw strategy: keep committed strokes on the ink canvas; redraw only the live
stroke each frame. Do not clear and repaint the whole canvas per frame.

---

## 6. Audio

**[LOCKED]** Audio is the instruction channel for a pre-reader. If it fails
silently, the app is unusable. Treat this module as load-bearing.

`core/audio/AudioBus.ts` rules:

1. **Exactly one `AudioContext` for the app's lifetime.** Safari reportedly caps a
   page at ~4 and then stops playing audio entirely (S19).
2. Context starts `suspended`; `resume()` must be called from inside a
   user-gesture handler (S19).
3. **Re-resume defensively.** On iOS 18.5 the context reportedly re-suspends after
   ~5s of inactivity (S19). Check `ctx.state` on every `pointerdown` and on
   `visibilitychange`, and resume if suspended. This must be cheap and idempotent.
4. Preload and decode all clips for an activity before the activity starts. No
   decode during play.
5. **Silent-switch hazard:** iOS reportedly refuses Web Audio entirely when the
   physical ringer switch is on silent (S19). No gesture unlock fixes it.

**[OPEN]** The silent-switch mitigation. Candidates, in order of preference:
`navigator.audioSession.type = 'playback'` if it exists on the target iPadOS;
an `<audio playsinline>` element path instead of Web Audio; or a detect-and-warn
screen telling the parent to flip the switch. **M0 must determine which is
needed before this module is written.** Do not guess.

---

## 7. Scene architecture

**[LOCKED]** Eight reusable scene types cover the entire PK4 map. Activities are
**data**, not code. Adding content means authoring JSON, never writing a
component. This is how one person reaches ABCmouse-scale breadth.

```ts
interface SceneModule<P> {
  type: SceneType;
  paramsSchema: ZodSchema<P>;
  mount(ctx: SceneContext, params: P): SceneHandle;
}

interface SceneContext {
  pixi: PixiStage;
  ink: InkLayer;
  audio: AudioBus;
  input: PointerInput;
  viewport: Viewport;
  onComplete(result: ActivityResult): void;
  onProgress(step: number, total: number): void;
}

interface SceneHandle { unmount(): void; }
```

### Scene types and parameters

| Type | Params (shape) | Standard covered (S22/S21) |
|---|---|---|
| `trace` | `{ glyphId, strokeOrder: boolean, tolerance: number }` | Writing; directionality; ≥20 letters |
| `match` | `{ pairs: [left, right][], mode: 'letter-sound' \| 'case' \| 'numeral-quantity' }` | Alphabet knowledge; cardinality |
| `sort` | `{ items[], bins[], criterion: 'color' \| 'shape' \| 'size' \| 'initial-sound' }` | Sorting; alliteration |
| `count` | `{ target: 1..30, mode: 'tap-count' \| 'subitize' \| 'rote' }` | Counting & cardinality; subitizing to 6 |
| `pattern` | `{ sequence[], mode: 'duplicate' \| 'extend' \| 'create' }` | Operations & algebraic thinking |
| `phonics` | `{ rung: 'compound' \| 'syllable' \| 'rhyme' \| 'alliteration' \| 'onset-rime' \| 'phoneme', items[] }` | Phonological ladder |
| `shape` | `{ shapes[], includeSolid: boolean }` | Geometry & spatial sense |
| `freedraw` | `{ palette[], stamps[] }` | Fine motor; creative play |

**[LOCKED]** `freedraw` has **no scoring and no completion state**. It is the one
activity that cannot be failed or finished. An app that is only drills is an app
she will refuse.

**[LOCKED]** `phonics` rungs must be gated in ladder order — compound words →
syllable → rhyme → alliteration → onset-rime → **phoneme last**, with visual or
gestural scaffolds at the phoneme rung (S22). Presenting phoneme-level work early
is the most common way pre-K literacy apps get the sequence wrong. Do not let
content authoring bypass this ordering.

---

## 8. Trace scoring

**[OPEN — but implement as specified unless M0 contradicts it]** No research
source covered trace-scoring algorithms; this design is derived from the one hard
standards requirement found:

> PK4 writing outcomes require the child's name written with legible letters **in
> correct sequence**, with **correct directionality** (top-to-bottom,
> left-to-right) — S22.

So stroke *order* and *direction* are part of the standard, not just final shape.

### Glyph format

`public/content/glyphs/*.json` — each glyph is an ordered list of strokes, each
stroke a polyline in logical space, pre-resampled at fixed arc-length spacing:

```ts
interface Glyph {
  id: string;              // 'upper-A'
  strokes: {
    points: [number, number][];   // resampled, ~4 logical units apart
    hint: string;                 // 'down from the top', for VO
  }[];
}
```

**[LOCKED]** Author uppercase first — capitals are more visually distinguishable
and PK4 teaches them first (S22).

### Scoring, three axes

1. **Coverage** — for each target point, distance to the nearest user sample.
   Pass when ≥ `coverageThreshold` (start 0.80) of target points have a sample
   within radius `r`.
2. **Direction** — map each user sample to its nearest target point's arc-length
   parameter, then fit a line over sample index. Require positive slope. Catches
   tracing an `l` bottom-to-top.
3. **Order** — for multi-stroke glyphs (`A`, `t`, `E`), require strokes in taught
   sequence. **Advisory only** — never a fail condition.

Tolerance ramp: `r` starts at **56 logical units** and tightens to **32** across
difficulty levels. Start generous.

**[LOCKED] Never hard-fail a stroke.** After two unsuccessful attempts, degrade
to assistance: animate the ghost path, replay the stroke with voiceover, then
accept whatever she draws and advance. Failure states are the fastest route to
the boredom this whole app is designed against.

---

## 9. Design system

**[LOCKED]**

- **Minimum touch target: 88 × 88 logical units.** Double the adult 44pt
  convention — preschool motor control requires it, and targets must be sized
  against actual preschool motor ability (S24).
- **Literal icons only.** Pencils, books, arrows, Play/Pause. **Banned:** house
  glyph for "home", floppy disk for "save", game-controller icons — all
  documented to confuse under-fours (S24).
- **Labels are single words**, always paired with an icon (S24).
- **Explicit visual hierarchy** so a non-reader finds the target unaided: enlarge
  targets, subtle drop shadow or contour line, and give interactive elements a
  **broader colour palette than the background** (S24).
- **Bold, high-contrast primaries** (S24).
- **Letterform requirement:** the tracing/teaching font must use a
  **single-story `a` and single-story `g`**. Typographic double-story forms do not
  match what she'll be taught to write. This constrains font choice more than
  aesthetics do.
- **Assume adult-free use.** Every screen must be escapable by a four-year-old
  with no reading ability.

### Juice, precisely scoped

**[LOCKED]** Animate **the interaction she just performed**. Never the
background. This resolves the tension between game-design "juice" advice (S26)
and the evidence that *extraneous* animation harms learning (S23) — feedback
coherent with the child's own action is fine; ambient decoration is what tested
badly.

Cheap, asset-free wins (S26): easing/tweening rather than linear interpolation;
short particle bursts on contact; a split-second freeze on impact. Sound effects
establish the credibility of every interaction and are load-bearing here, because
audio carries meaning a pre-reader cannot get from text.

---

## 10. Storage and offline

**[LOCKED]**

- Call `navigator.storage.persist()` on first run. Home Screen installation is
  one of the heuristics WebKit uses to grant persistent mode, and persistent
  origins are excluded from eviction (S17).
- IndexedDB stores: `profile`, `progress`, `settings`. No PII — a display name
  and an avatar config, nothing more.
- Workbox precaches the entire app shell and all content. Runtime network
  requests: none.
- Quota is not a concern: up to ~60% of disk per origin (S17). A large offline
  asset bundle is fine.
- Note for anyone who half-remembers a "7-day PWA eviction" rule: WebKit does not
  assert a day count. Eviction is LRU by last user interaction (S17).

Progress records tag against the ELOF hierarchy (§11) so activity selection can
reason about coverage.

**[LOCKED]** Head Start explicitly prohibits using ELOF as an assessment or
checklist, or to conclude a child has failed or is not kindergarten-ready (S21).
Tags are for *internal activity selection only*. Never render a mastery
scorecard or readiness verdict in the UI.

---

## 11. Content model

```ts
interface Activity {
  id: string;
  title: string;              // single word where possible
  icon: string;
  sceneType: SceneType;
  elofTags: {                 // ELOF hierarchy, S21
    domain: ElofDomain;       // 6 preschool domains
    subDomain: string;
    goal: string;
  };
  difficulty: 1 | 2 | 3 | 4 | 5;
  assets: { sprites: string[]; sounds: string[]; rive?: string };
  params: unknown;            // validated against the scene's paramsSchema
}
```

### PK4 targets to author against (S22)

| Skill | Target |
|---|---|
| Letter naming | ≥20 letters (upper *or* lower) — **not 26** |
| Letter–sound correspondence | ≥20 |
| Case order | **Uppercase first** |
| Rote counting | to 30 |
| 1:1 counting with cardinality | to 10 |
| Subitizing | to 6 |
| Numeral recognition | 0–10 |
| Addition / representation | up to 5 objects |
| Geometry | common 2D shapes + ≥1 3D solid |
| Patterns | recognize, duplicate, extend, create; plus sorting |
| Writing | own first name — legible, correct sequence and directionality |

**Author `trace` content for "MAELIE" early.** Writing one's own name is an
explicit PK4 outcome and it's the activity most likely to hold her attention.

### Difficulty adaptation

**[LOCKED]** Quietly step difficulty **down** after two consecutive
unsuccessful attempts. Never announce it. Never show a score, a percentage, or a
comparison.

---

## 12. Rewards

**[LOCKED]** Include a *small* reward economy — stickers or coins unlocking
**cosmetic** avatar items only. Note that ABCmouse keeps its ticket economy and
avatar customization on the **free** tier (S11): the reward loop is the retention
mechanism, not the product.

Constraints: rewards are granted on activity completion only — never on a timer,
never for returning, never for a streak. No idle prompts. If she walks away, the
app says nothing.

---

## 13. Monetization

**[LOCKED] None.** No accounts, no IAP, no ads, no paywall.

Recorded for future reference only: a self-hosted PWA is **not** subject to
Apple's requirement that all in-app unlocking go through IAP (S7) — the cost of
that rule is visible in ABCmouse's own pricing, $45/yr for web signups versus
$59.99/yr through the App Store (S11). If this app is ever distributed beyond
one family, the relevant constraints are Apple's Kids Category parental-gate
rules and COPPA — and that conversation starts with a lawyer, not with this
document. The research report's COPPA summary is explicitly not legal advice, and
one of its claims was refuted during verification.

---

## 14. Milestones

Detailed acceptance criteria are in `docs/HANDOFF-FABLE.md`.

| # | Milestone | Gate |
|---|---|---|
| **M0** | **Device truth-check** | Four empirical answers (§15). **Blocks everything.** |
| M1 | Shell | Installable PWA, offline, IndexedDB, map, one `trace` scene, both orientations |
| M2 | Scene engine | All 8 scene types, data-driven, ~10 activities |
| M3 | Content | Full PK4 map — 26 letters, 0–10, shapes, patterns, phonics ladder. 60–80 activities |
| M4 | Feel | Rive characters, particles/easing, full audio layer, adaptive difficulty |
| M5 | Her testing | Watch her use it without helping |

**[LOCKED]** M4 is real work, not cleanup. It is the milestone that decides
whether this reads as expensive or cheap, which was the user's original ask.

**[LOCKED]** For M5, expect late revisions and budget for them — Toca Boca holds
releases to a "maximum viable product" bar rather than shipping a thin feature
set, and late kid-testing triggers major rework (S5).

---

## 15. M0 — the blocking experiment

**[LOCKED]** A throwaway page on Maelie's actual iPad, before any app code.
Four questions, all currently single-source or untested:

1. **Does `getCoalescedEvents()` fire, and at what sample rate?** Record samples
   per second during a fast drag. Two sources directly contradicted each other on
   this and the contradiction was resolved by *date*, not by testing (S12 vs S14).
2. **How does the ink feel?** perfect-freehand at the §5.3 options, under *her*
   finger. Record perceived latency and whether `size: 26` is right.
3. **Audio, all three hazards:** does it play with the ringer switch on silent?
   Does the context re-suspend after ~5s idle? Confirm one context works. All
   three are single-source (S19), and this is the **highest-risk unknown in the
   plan** — it determines whether §6's `[OPEN]` mitigation is needed at all.
4. **Does `navigator.storage.persist()` return `true`** once installed to the
   Home Screen (S17)?

Record the answers in `docs/M0-RESULTS.md`. If any answer contradicts this
blueprint, **the blueprint is wrong and gets amended** — do not work around a
false premise silently.
