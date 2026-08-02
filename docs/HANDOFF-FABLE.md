# Implementation Handoff — Maelie's Learning Hub

**To:** implementing engineer
**From:** architecture
**Read first:** `docs/BLUEPRINT.md` (the spec) · `docs/research/00-research-report.md` (the evidence)

---

## What this is

A PWA that teaches pre-K curriculum to one specific 4-year-old on one iPad. It
is not a product, has no users but her, and will never have a backend.

The architecture is specified. Your job is to build it, in the order below,
against the acceptance criteria below. Where the blueprint says **[LOCKED]**,
build it as written. Where it says **[OPEN]**, decide and record the decision in
a short ADR under `docs/decisions/`.

---

## Start here: M0 blocks everything

**Do not write application code until M0 is done.** Four platform assumptions in
the blueprint are single-source or untested, and one of them (audio) can make the
entire app unusable if it turns out badly. Building on top of an unverified
premise and discovering it in M3 costs weeks.

### M0 deliverable

A single throwaway page — no framework, no build step needed — served over HTTPS
and opened on Maelie's actual iPad, installed to the Home Screen. It answers:

**Q1 — Coalesced pointer events.**
Log `e.getCoalescedEvents?.().length` per `pointermove` and total samples/sec
during a fast drag. Also check `getPredictedEvents`.
*Expected:* supported on iPadOS 18.2+. Two sources flatly contradicted each other
here (WebKit's blog says yes as of Safari 18.2, an Apple dev-forum thread says
never); the contradiction was resolved by publication date, not by testing. Verify it.

**Q2 — Ink feel.**
perfect-freehand with the blueprint §5.3 options. Draw with a finger. Record:
perceived latency, whether `size: 26` is right for her hand, whether
`streamline: 0.5` feels laggy. Try `desynchronized: true` on and off and note
whether it's perceptible.

**Q3 — Audio (highest risk).**
Three separate reported iOS behaviours, all from one blog source:
- Does Web Audio play at all with the **physical ringer switch on silent**?
- Does the `AudioContext` **re-suspend after ~5s idle** (reported on iOS 18.5)?
- Confirm a single context works for many clips.

If the silent-switch behaviour reproduces, test the mitigations in blueprint §6
`[OPEN]` — `navigator.audioSession`, then an `<audio playsinline>` path — and
report which works. **This determines the audio architecture. Do not write
`AudioBus.ts` before answering it.**

**Q4 — Storage persistence.**
Does `navigator.storage.persist()` resolve `true` once installed to the Home
Screen? Report `navigator.storage.estimate()` too.

### M0 acceptance

`docs/M0-RESULTS.md` exists, with a measured answer to all four questions and, for
each, an explicit note on whether it **confirms or contradicts** the blueprint.

**If anything contradicts the blueprint, amend the blueprint and say so.** Do not
silently work around a false premise — the premise is the deliverable here.

---

## M1 — Shell

**Build:** installable PWA (manifest, icons, Workbox precache), viewport
transform (§4), `PointerInput` (§5.2), `InkLayer` (§5.3), IndexedDB via `idb`,
`navigator.storage.persist()` on boot, home map, settings behind a parent gate,
and **one working `trace` scene** for a single uppercase letter.

**Acceptance:**
- Installs to Home Screen; **launches and runs fully with the iPad in Airplane Mode**
- Works in **both orientations** — no interactive target ever lands in a letterbox band
- Ink lands under the finger at every screen size (test at least two iPad sizes or simulator equivalents)
- `touch-action: none` verified: no scroll, no zoom, no long-press callout during a stroke
- `pointercancel` never leaves a dangling stroke
- Minimum touch target 88×88 logical units, enforced

## M2 — Scene engine

**Build:** all 8 scene types (§7) as data-driven modules, zod param schemas,
content loader, ~10 activities as JSON.

**Acceptance:**
- Adding an activity requires **authoring JSON only** — zero code changes. This is the load-bearing property of the whole architecture; if it doesn't hold, stop and fix it before M3
- `freedraw` has no scoring and no completion state
- `phonics` rungs gated in ladder order; content authoring cannot bypass the sequence
- Trace scoring implements all three axes (§8) and **cannot hard-fail** — two failed attempts degrades to assisted-accept

## M3 — Content

**Build:** the full PK4 map (§11). 60–80 activities. Uppercase letters first.

**Acceptance:**
- Meets every PK4 target in the blueprint §11 table
- **"MAELIE" is authorable and traceable as her own name** — explicit PK4 outcome, and the activity most likely to hold her
- Every activity carries ELOF tags; **no mastery scorecard or readiness verdict appears anywhere in the UI** (Head Start prohibits this use — S21)

## M4 — Feel

**Build:** Rive characters, particle/easing polish, full Kenney audio layer,
adaptive difficulty.

**Acceptance:**
- Juice is attached to **her actions only** — nothing ambient animates during an activity
- **No looping background music**
- Difficulty steps down silently after two consecutive misses; no score, percentage, or comparison is ever displayed
- Rewards granted on completion only — no timers, no streaks, no return prompts, no idle nagging

This milestone is not cleanup. It is the one that decides whether the app reads
as expensive or cheap, which was the original ask.

## M5 — Her testing

Watch her use it without helping. Expect late revisions and budget for them.

---

## The five things most likely to go wrong

1. **Audio dies silently on a muted iPad.** Highest-risk item; single-source. M0 Q3.
2. **Ink drifts from the finger** — mismatched transform between the Pixi and ink
   canvases. One `Viewport`, used by both, no exceptions (§4).
3. **Input accuracy degrades under render load.** Safari drops pointer samples
   during slow frames; a heavy loop costs *accuracy*, not just FPS. Keep the ink
   layer cheap (§5.1).
4. **Scene types stop being data-driven.** The first time a new activity "just
   needs a small code change," the M3 content plan collapses. Hold the line at M2.
5. **Engagement mechanics creep back in.** Streaks, daily rewards, and idle
   character prompts are what the popular apps do and what the evidence says to
   avoid. The exclusion list in blueprint §1 is on evidence, not budget.

---

## Things deliberately not specified

Left to your judgement — pick, record briefly in `docs/decisions/`, move on:

- Router and shell state management (there is very little global state)
- Test runner and how much of this is worth testing
- Pixi scene-graph organisation within a scene
- Glyph authoring workflow (`tools/`) — how stroke polylines get produced
- Asset pipeline: sprite atlas packing, audio sprite sheets
- The audio silent-switch mitigation — **but only after M0 Q3 answers it**

---

## Ground rules

- **No backend, no accounts, no analytics, no network at runtime.** This is what
  keeps the app outside COPPA's collection triggers entirely. Do not add a
  "harmless" telemetry ping.
- **No third-party SDKs** beyond the libraries named in blueprint §2.
- The research report's COPPA and App Store summaries are **not legal advice**;
  one COPPA claim was refuted during verification. Don't build compliance logic
  from them — the app avoids the question by collecting nothing.
- If the blueprint is wrong, **say so and amend it**. It was written from research,
  not from a running app, and M0 exists precisely because some of it may not survive
  contact with the device.
