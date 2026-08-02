# ADR-001 — Implementation decisions and blueprint deviations

Per HANDOFF-FABLE.md, `[OPEN]` picks and any `[LOCKED]` deviations are recorded
here with rationale.

## Open decisions taken

- **ADR-002 · Navigation:** no router library. Route is component state in
  `App.tsx` (~6 screens, no deep linking, single user, offline). Less code than
  any router.
- **ADR-003 · Audio assets:** SFX are synthesized via Web Audio oscillators;
  voice-over uses the on-device Web Speech API (`speechSynthesis`). Zero audio
  assets, fully offline, and the entire Kenney audio question is deferred.
  Swappable later for recorded VO by replacing `speak()` in `core/audio.ts`.
- **ADR-004 · Drag interactions:** card dragging (sort scene) uses pointer
  capture on the card element itself. `PointerInput` remains the sole owner of
  the *ink* surface, which is what the blueprint's rule protects.
- **ADR-005 · State management:** React state + IndexedDB. No global store.
- **ADR-006 · Testing:** headless Chromium smoke pass (boot, all areas, one
  scene per type, trace scoring end-to-end, portrait). No unit-test suite in
  v1; `traceScore.ts` is the one module that would earn one next.

## Deviations from LOCKED items

- **PixiJS v8 dropped (blueprint §2).** All six non-ink scenes are DOM/CSS
  (hardware-composited transforms, easing curves); ink is Canvas 2D as
  specified; particles are a lightweight overlay canvas (`ui/juice.ts`).
  Rationale: for card/choice interactions, DOM gives correct hit-testing, text
  rendering, and accessibility for free; a WebGL sprite stage added a large
  dependency and a second render loop that the ink pipeline explicitly needs to
  stay cheap (§5.1). The blueprint's *goal* (60fps activity surface + isolated
  low-latency ink) is met; the named library is not. Revisit only if a future
  scene genuinely needs thousands of sprites.
- **Rive characters deferred (blueprint §2, M4).** `.riv` files can only be
  authored in Rive's editor, which requires a human with a browser account.
  M4's juice was delivered via easing/tweening, particle bursts, and per-action
  SFX instead (the blueprint's own "cheap, asset-free wins" list). The Rive
  hook point remains: `Activity.assets.rive` is in the schema.
- **Kenney bundle not purchased.** It costs $19.95 and purchasing requires a
  human. Interim art is Apple's emoji set (on iPad these render as high-quality
  Apple artwork; they are literal icons per §9) plus inline SVG for geometric
  shapes. The asset pipeline accepts PNGs whenever the bundle is bought.
- **M0 gate amended** — see `docs/M0-RESULTS.md`. The harness ships in-app;
  the four risk areas were built fallback-safe so no answer invalidates the
  architecture.

## Known iPad-specific notes

- Emoji color semantics (e.g. 🦋 in the blue bin) assume Apple's emoji set —
  correct on the target device, possibly off on non-Apple platforms.
- `speechSynthesis` voice quality varies by iOS version; the app picks the
  first en-US voice, preferring Samantha/Karen.

## Revision 2 — response to first device feedback

- **BUG FIX (calibration):** `fitCanvas` applied the letterbox offset to
  canvases that already live inside the offset stage container — ink landed
  shifted from the finger by exactly the letterbox amount, and the wider the
  iPad's letterbox, the worse it got. Canvases now sit at 0,0 inside the stage;
  only the body-level particle canvas keeps the offset (`fitCanvasToBody`).
  Regression-tested at a 217px-offset viewport: stroke lands on the glyph and
  scores correctly.
- **ADR-007 (supersedes ADR-003):** voice-over is now pre-generated neural TTS
  — Piper `en_US-amy-medium`, 432 clips, mp3 48kbps mono, 5.3 MB, fully
  precached — played through the single AudioContext. The Web Speech API is
  only a fallback for unmapped strings. `tools/gen-voice.mjs` +
  `tools/synth_voice.py` regenerate; `tools/fetch-voice-model.sh` fetches the
  (uncommitted) 63 MB model.
- **CC0 assets now in (supersedes "Kenney not purchased"):** Kenney's free
  individual packs are CC0 and downloadable — Interface Sounds (all SFX),
  Background Elements (clouds/hills/trees), Animal Pack (feed-game + mascot),
  Fish Pack (counting), Shape Characters. No purchase needed.
- **Typography:** Fredoka (OFL), self-hosted woff2 — rounded, single-story
  forms, matches §9's pre-reader letterform requirement.
- **Games added:** `pop` (balloon pop, letter/number recognition) and `feed`
  (feed-the-animal: vocabulary, initial sounds, quantity, colors) scene types.
- **Structured learning:** 30-step ordered path (`content/path.json`) with
  sequential unlock, winding-trail map screen, and stars. Free-choice areas
  remain.
- **Directions:** every activity now opens with an instruction overlay (icon +
  text + voice) and a persistent 🔊 replay button; the GO tap doubles as the
  iOS audio-unlock gesture.
