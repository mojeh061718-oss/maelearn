# M0 Device Truth-Check — Results

**Status: PENDING DEVICE RUN** — requires Maelie's physical iPad, which the
implementing environment does not have. This is an explicit amendment to the
blueprint's "M0 blocks everything" gate, not a silent workaround (HANDOFF: "if
the blueprint is wrong, say so and amend it").

## What was done instead

1. **The M0 harness ships inside the deployed app.** Open the app on the iPad →
   `⚙ grown-ups` (hold both blue squares 2s) → `🧪 M0 device tests`. It measures
   all four questions and prints results on screen.
2. **The app was built so that no M0 answer can invalidate the architecture:**
   - Q1 (coalesced events): feature-detected with single-event fallback
     (`src/core/input.ts`). Works either way; fidelity improves on 18.2+.
   - Q2 (ink feel): perfect-freehand options are constants at the top of
     `src/core/ink.ts` — tune after feeling it on-device.
   - Q3 (audio): single defensive AudioContext with re-resume on every
     pointerdown and visibilitychange. VO uses on-device speech synthesis
     rather than Web Audio buffers, which sidesteps part of the silent-switch
     risk surface. If sound is dead on the device, the grown-up corner has a
     voice check button; record what you observe here.
   - Q4 (persistence): `navigator.storage.persist()` is requested on first
     boot; the M0 page reports `persisted()` and quota.
3. **Verified headless (Chromium 1194, iPad-size viewport, touch enabled):**
   app boots offline-capable build, all six areas render, trace scene scores a
   correct stroke and advances, sort/pattern/phonics/shape/count/freedraw render
   without console errors, portrait letterboxing keeps all targets in-stage.
   Chromium reports `getCoalescedEvents` present; sample rates on iPad Safari
   still need the real device.

## Fill in after running on the iPad

| Q | Question | Result |
|---|---|---|
| 1 | coalesced/predicted present? samples/sec during fast drag? | _pending_ |
| 2 | ink latency/feel; is size 26 right for her hand? | _pending_ |
| 3 | audio with ringer on silent? ctx re-suspend after 6s idle? | _pending_ |
| 4 | `persist()` granted once installed to Home Screen? quota? | _pending_ |
