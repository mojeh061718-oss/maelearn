# Maelie's Learning Hub — Research Report & Build Plan

**Date:** 2026-08-02
**Target user:** one 4-year-old, on iPad, easily bored
**Delivery target:** installable PWA (home-screen web app), not App Store native

---

## 0. How to read this report (and what it's worth)

This came out of a multi-agent research run: 29 sources fetched and read, 143
falsifiable claims extracted, then an adversarial verification pass that tried
to *kill* each claim (3 independent skeptics per claim, 2 of 3 refutations
required to drop it).

I stopped the verification pass early, deliberately. It had completed 11 claims
out of 143 and was on pace for roughly four more hours. The kill rate was high
enough to be informative — **6 of the 11 fully-verified claims were refuted** —
but the marginal value of verifying claim #90 about Toca Boca's studio headcount
is near zero for a build plan. What matters is flagged inline below.

Confidence markers used throughout:

- **[verified]** — survived 3-vote adversarial refutation
- **[refuted]** — killed by verification; recorded here so nobody re-derives it
- **[primary]** — from a first-party/authoritative source, not verification-tested
- **[unverified]** — single source, plausible, treat as a lead not a fact

The decision-critical technical claims are marked **⚠ TEST ON DEVICE**. For those,
a ten-minute experiment on Maelie's actual iPad beats any amount of further
desk research, and Milestone 0 below exists specifically to run those tests.

---

## 1. Dimension 1 — How these apps are actually built

### 1.1 There is no single stack, and the "clone the architecture" instinct is wrong

The popular pre-K apps do not converge on a technology. What they converge on is
a *production process*.

| App | Stack | Source confidence |
|---|---|---|
| Toca Boca (3D titles) | Unity, with a custom `BatchRendererGroup` rendering backend | [primary] S1 |
| Khan Academy (flagship) | Hybrid native + React Native, incrementally added to existing native apps | [primary] S2 |
| Khan Academy **Kids** | **Unknown** — S2 explicitly does not cover the Kids app | S2 self-flags this |
| Duolingo ABC | Separate native codebases; Android written from scratch in Kotlin ~2yr after iOS | **[refuted]** — see below |

Two notable things.

**First, the Duolingo ABC architecture claims got killed 3/3.** The extracted
claims said ABC is "fully native, per-platform with no code reuse" and that it
sequences animation/audio through Kotlin Coroutines rather than a declarative
animation runtime. Both were refuted as overreach — the engineering blog post
describes *the Android build* and does not support a negative claim about
cross-platform code sharing or about the absence of Lottie/Rive/Spine. Don't
cite Duolingo ABC as evidence for a native-first architecture.

**Second, and more useful: Toca Boca's team shape is the real finding.**
Roughly six to eight people per app — one play designer, one project manager,
two developers, one artist, one 3D artist — inside a studio of ~60 [unverified,
S4/S5]. That is the budget that produces the polish you're reacting to when you
say "non-cheap graphics." You are one person. **The plan below is built around
that asymmetry, not in denial of it:** buy or license the art, spend your own
hours on interaction feel.

### 1.2 The process findings that survived, and one that didn't

- **"Play designer" role** — Toca Boca staffs a designer whose explicit job is to
  hold the child's point of view through production, and starts projects from
  "what are we going to play?" rather than from a learning objective [unverified, S4/S5].
- **"Maximum viable product," not minimum** — they hold releases to a quality bar
  rather than shipping a thin feature set, and late kid-testing can trigger major
  revisions [unverified, S5].
- **[refuted] "Paper prototypes before any digital work"** — killed 3/3. The
  podcast supports kid-testing during production; it does not support a
  paper-prototypes-first pipeline as stated.
- **[refuted] "Toca Boca ships no text in the UI at all"** — killed 2/3 as too
  absolute. The *directional* insight is still sound and worth keeping: design
  for a pre-reader who cannot read your labels. Just don't treat zero-text as a
  law handed down from Stockholm.

### 1.3 Animation tooling: Rive vs Lottie

This is a real decision and the sources are unusually concrete.

- **Lottie**: authored in After Effects, exported via Bodymovin to JSON. Any
  change beyond layer color means round-tripping through After Effects. Playback
  control is play/pause/loop only [primary, S6/S29].
- **Rive**: authored in Rive's own browser editor, exports `.riv`. Files embed
  **state machines** — animations respond at runtime to taps and app events, so
  interaction logic lives in the designer file instead of your code [primary, S6/S29].
- Benchmarked on React Native / Sony Xperia Z3: Rive ~60 FPS vs Lottie ~17 FPS
  for equivalent content [unverified, S6 — single vendor-adjacent benchmark on
  one old Android device; do not assume it transfers to iPad Safari].
- File size: one Lottie animation recreated in Rive went 24.37 KB → ~2 KB
  [unverified, S6, sourced to a Rive CEO demo — treat as marketing-adjacent].
- **No 1:1 converter exists between the two formats.** Picking one is a
  committing decision; switching means re-authoring [primary, S29].

**Recommendation: Rive.** Not primarily for the performance numbers, which are
weakly sourced — but because you have no After Effects license, no animator, and
the state-machine model means an interactive character reaction is a file you
author once rather than animation code you maintain per activity.

---

## 2. Dimension 2 — Paid vs unpaid gates

### 2.1 The landscape

| App | Model | Gate mechanism |
|---|---|---|
| ABCmouse | $14.99/mo w/ 30-day trial (web), or $45/yr no trial [verified, S11] | Daily activity-count cap on free tier (**disputed** — see below) |
| Khan Academy Kids | Fully free, no paid tier [unverified, S13] | None |
| PBS KIDS | Fully free [unverified, S13] | None |
| Duolingo ABC | Fully free [unverified, S13] | None |
| HOMER | $12.99/mo or $79.99/yr, 30-day trial [unverified, S13] | Trial-then-wall |
| Starfall | $35/yr home · $70 teacher · $195 classroom · $355 school [unverified, S13] | Audience/feature tier, most reading content stays free |
| ABCya | $9.99/mo or $79/yr; classroom to $299.99/yr [unverified, S13] | 6 games/week content-count cap |
| Toca Boca | Paid app, **no IAP, no ads** [unverified, S4] | Purchase-once |

Notes on reliability: the ABCmouse pricing claim **survived verification**
[verified, S11] and is corroborated independently by S13. But the claim that
ABCmouse's free tier is specifically "10 learning activities per 24-hour period,
one child profile, one grade level" was **refuted 2/2** — the mechanism (a
content-count gate rather than a level or feature gate) is well-supported, the
exact numbers are not. Treat the shape as real and the digits as unconfirmed.

ABCmouse's channel-dependent renewal is worth noting as a business-model
artifact: web signups renew at $45/yr, App Store signups may renew at $59.99/yr
[unverified, S11]. That gap is Apple's commission, made visible.

### 2.2 What ABCmouse conspicuously does *not* gate

Both free and paid tiers are ad-free, and **the reward economy (tickets) and
avatar customization are available on the free tier** [unverified, S11]. The
engagement hooks are not the paywall. The paywall is volume (13,000+
activities), multi-child profiles, grade breadth, and offline mode.

That's the correct read on where value sits in this category, and it's a useful
design signal even for an app you never monetize: *the reward loop is the
retention mechanism, not the product*.

### 2.3 The regulatory picture — and why a self-hosted PWA sidesteps most of it

These claims all **survived adversarial verification**, which makes this the
most solid block in the report:

- **[verified]** Apple's Kids Category requires a **parental gate** in front of
  exactly three things: links out of the app, permission requests, and
  purchasing opportunities [S7/S10].
- **[verified]** Kids Category apps may not transmit personally identifiable
  information *or device information* to third parties. Third-party analytics is
  permitted only where the service transmits no IDFA and nothing identifying
  children or their devices — which rules out essentially every standard
  analytics/attribution SDK [S7/S10].
- **[verified]** A parental gate is **not** legally valid parental consent. Kids
  Category apps handling minors' personal information — *including their
  drawings* and persistent identifiers — must publish a privacy policy and
  comply with COPPA/GDPR separately [S7].
- **[verified]** Under COPPA, "support for internal operations" excludes
  behavioral advertising but *includes* contextual advertising — a child-directed
  app may serve contextual ads without parental consent, never targeted ones [S9].
- **[refuted]** A claim that persistent identifiers need no notice/consent when
  collected solely for internal operations was killed 2/3 as an oversimplification
  of the exemption's conditions. **If you ever collect anything, get real legal
  advice — do not build off this report's summary of COPPA.**

Additional constraints, not verification-tested:

- Amended COPPA Rule took effect 2025-06-23, full compliance deadline
  **2026-04-22** — i.e. already in force as of today [unverified, S8].
- "Personal information" now expressly includes **biometric identifiers such as
  voiceprints** — so a phonics feature that records Maelie's voice triggers
  consent obligations [unverified, S8].
- Ads in Kids Category apps must be **human-reviewed** before display, which
  effectively bars programmatic ad networks [unverified, S10].

**The strategic finding [primary, S7]:** any unlocking of features, subscriptions,
currency, levels, or premium content *inside a native iOS app* must use Apple's
IAP — no license keys, no QR codes. **A self-hosted PWA is not subject to this
at all.** Combined with the $45-vs-$59.99 renewal gap above, this is a genuine
structural advantage of the delivery model you've already chosen.

**For Maelie's Learning Hub specifically: build it with no accounts, no
analytics, no network calls, and all state in on-device storage.** That choice
puts you outside COPPA's collection triggers entirely, costs you nothing you
want, and removes an entire category of compliance work. If it ever ships to
other families, revisit with a lawyer — don't retrofit from these notes.

---

## 3. Dimension 3 — Precise finger tracking in an iPad PWA

This is the section that determines whether the app feels good or feels cheap,
so it gets the most detail.

### 3.1 The contradiction, resolved

Two sources directly conflict:

- **S14** (Apple Developer Forums, 2021–2023): "Mobile Safari does not implement
  `PointerEvent.getCoalescedEvents()`" — so web apps can't retrieve sub-frame
  input samples, and there is no workaround.
- **S12** (WebKit official blog, 2024-12-09): Safari 18.2 **supports**
  `getCoalescedEvents()` **and** `getPredictedEvents()`.

**S12 wins, on date.** The forum thread predates Safari 18.2 by more than a year;
WebKit's own release notes are first-party. The resolution is that this was a
real, hard limitation that was **fixed in Safari 18.2 (December 2024)**.

**Consequence: your app should require iPadOS 18.2+ and ship a graceful fallback.**
This single fact is why a high-quality tracing PWA is viable now and wasn't in 2023.

⚠ **TEST ON DEVICE** — confirm on Maelie's actual iPad before committing the
rendering architecture.

### 3.2 What Safari gives you now

- `getCoalescedEvents()` returns the PointerEvents the browser merged into one
  `pointermove` — recovers sub-frame samples otherwise lost to rAF batching
  [primary, S12].
- `getPredictedEvents()` returns *estimated future* positions, usable to render a
  speculative ink lead-in that visually masks input-to-photon latency [primary, S12].
- Safari 18.2 added `altitudeAngle` / `azimuthAngle` to pointer events — Apple
  Pencil tilt [primary, S12].
- `click`, `contextmenu`, and `.click()` now dispatch **PointerEvent**, not
  MouseEvent — so one Pointer Events code path handles taps and drags, no mixing
  Touch and Mouse events [primary, S12].
- Via the older Touch Events path: `Touch.force` (pressure, since iOS 9.3),
  `Touch.touchType` (distinguishes stylus from finger — the primitive for palm
  rejection), `radiusX`/`radiusY` (contact geometry) [unverified, S15].

Even on the *old* path, plain `pointermove` in Mobile Safari was measured at up
to **240 Hz** Apple Pencil report rate on an iPad Pro [unverified, S14 — single
forum report]. Low Power Mode halves that to 120 Hz [unverified, S14]. Worth
knowing: **a kid's iPad in Low Power Mode will literally trace worse.**

### 3.3 Known hazards

- **Pointer events are dropped during slow animation frames** [unverified, S14].
  Under the old no-coalescing regime this was unfixable; `getCoalescedEvents()`
  is precisely the mitigation. It also means: *a heavy render loop degrades input
  accuracy*, so the ink surface must stay cheap.
- `canvas.getContext('2d', { desynchronized: true })` reduces ink latency
  [unverified, S14].
- Safari's "Prefer Page Rendering Updates near 60fps" setting gates the 120fps
  path and **cannot be set programmatically** — it's a user/OS setting [unverified, S14].
- CSS `touch-action: none` on the drawing surface is **mandatory** to suppress
  browser scroll/zoom during a stroke [primary, S16].

### 3.4 Ink rendering: use perfect-freehand

`perfect-freehand` (MIT, 5.6k stars, actively maintained) is the right call
[primary, S16]:

- Core API is one pure function, `getStroke(points, options)`, returning an
  **outline polygon** rather than a stroked polyline — that's what makes
  variable-width ink possible.
- Tunable via documented options with defaults: `size` (8), `thinning` (0.5),
  `smoothing` (0.5), `streamline` (0.5), plus taper and cap options. These are
  your knobs for making tracing *feel* right for a 4-year-old's hand.
- **Handles the no-pressure case natively:** a finger on iPad Safari reports
  constant `PointerEvent.pressure`, so perfect-freehand synthesizes pressure from
  inter-point distance/velocity by default. Real Pencil pressure can be passed
  instead with `simulatePressure: false`.
- Output converts to an SVG path string usable by both `<path d>` **and**
  `new Path2D(...)` for Canvas 2D fill — one geometry pipeline, two renderers.
- Documented capture pattern is Pointer Events + `setPointerCapture` +
  `touch-action: none`.

### 3.5 Validating a traced letter

No source in this run covered trace-scoring algorithms — that's a genuine gap.
The design below is my own, built on the one hard standards requirement found:

> **[primary, S22]** Texas PK4 writing outcomes specify writing one's first name
> with legible letters *in correct sequence*, using *correct directionality*
> (top-to-bottom, left-to-right).

So stroke *order* and *direction* are part of the standard, not just final shape.
Score on three axes:

1. **Coverage** — resample the target glyph to a dense polyline; a stroke passes
   when ≥N% of target points have a sample within tolerance `r`. Start generous
   (r ≈ 60–70px at iPad scale) and tighten by level.
2. **Direction** — compare the sign of progress along the target's arc-length
   parameter. Catches tracing an `l` bottom-to-top.
3. **Order** — for multi-stroke glyphs (`A`, `t`, `E`), require strokes in the
   taught sequence, but *only* as a gentle nudge, never a hard fail.

**Never hard-fail a 4-year-old's stroke.** Degrade to a hint (animate the ghost
path, replay the stroke) and let her continue. Failure states are the fastest
route to the boredom you're trying to design around.

### 3.6 PWA platform limits on iOS

- **Storage** — WebKit grants persistent mode (`navigator.storage.persist()`)
  heuristically, and **being installed to the Home Screen is one of the
  heuristics that favors granting it** [primary, S17]. Origins in persistent mode
  are excluded from eviction. **Call `navigator.storage.persist()` on first run.**
- **Quota** — up to ~60% of total disk per origin, 80% overall cap, as of Safari
  17 [primary, S17]. A large offline asset bundle is entirely feasible.
- **The "7-day eviction" rule you may have heard: not asserted by WebKit.** S17
  covers localStorage, Cache API, IndexedDB, Service Workers and the File System
  API together, describes eviction as LRU by last user interaction, and attributes
  time-based deletion of un-interacted sites to ITP **without stating a day count**
  [primary, S17]. Installing to Home Screen does *not* by itself raise the quota.
- **Wake Lock works** in installed Home Screen web apps as of iOS/iPadOS 18.4
  [primary, S18] — screen won't dim during a long activity.
- **Orientation lock is not reliable.** `ScreenOrientation.lock()` generally
  requires fullscreen on mobile, is **not Baseline**, and is unsupported in some
  major browsers [primary, S20]. **Design a layout that works in both
  orientations rather than fighting for landscape lock.**
- **Audio is the sharpest edge.** AudioContext starts suspended and must be
  resumed from a user-gesture handler [unverified, S19]. Worse, three reported
  behaviors that will bite a kids' app specifically:
  - iOS Safari **will not play Web Audio at all if the physical ringer switch is
    on silent** — no gesture unlock fixes this.
  - On iOS 18.5, the context **re-suspends after ~5 seconds of inactivity**, so
    you must be ready to re-resume on later gestures.
  - Safari appears to cap a page at ~4 AudioContext instances. **Create exactly
    one and reuse it.**

  All three are single-source [S19, a blog with long comment threads].
  ⚠ **TEST ON DEVICE** — in a pre-reader app, audio *is* the instruction channel.
  If audio silently fails, the app is unusable, so this is the highest-risk
  unknown in the entire plan.

---

## 4. Dimension 4 — Pre-K curriculum and engagement

### 4.1 The uncomfortable finding

The strongest research source in the set argues *against* much of what the
popular apps actually do.

Hirsh-Pasek et al. (2015), *Psychological Science in the Public Interest*
[primary, S23] — a peer-reviewed evidence review — finds:

- An app is "educational" only if it is **active, engaged, meaningful, and
  socially interactive** in service of a stated learning goal.
- **Extraneous animations, sound effects, and tangential reward mini-games
  actively harm learning** by breaking coherence. This is a direct argument
  against decorative reward economies and hotspot embellishment.
- Simpler beats feature-rich, empirically: children learned alphabet content
  better from a *simpler* book (Chiong & DeLoache 2012); interactive "bells and
  whistles" distracted 3-year-olds from story comprehension (Parish-Morris et al. 2013).
- **Tapping and swiping do not count as "active."** Only *minds-on* activity —
  thinking, intellectual manipulation — qualifies. Tap-to-pop is classified
  minds-**off**; puzzle placement and reasoning about cardinality are minds-on.
- Age-specific: at 3.5 years *any* distraction impaired performance; **4-year-olds
  were impaired only by *continuous* distraction** (Kannass & Colombo 2007).

That last one is the actionable one for Maelie. **Intermittent, well-timed
feedback is fine at four. Persistent background animation and looping music are
not.** Your instinct to add juice everywhere is the thing to resist selectively.

### 4.2 And the dark-pattern finding

A Michigan Medicine / *JAMA Network Open* study of apps actually used by 160
children aged 3–5 [unverified, S25]:

- **80% of the apps contained manipulative design features**; ~99% of children
  encountered at least one.
- Catalogued taxonomy: reward lures (stickers/trophies/daily rewards),
  return-tomorrow pop-ups, **parasocial character pressure when the child goes
  idle**, fabricated countdown urgency, forced 20-second roadblock ads.
- IAP pressure routed *through the child to the parent* via character dialogue.

Idle-nagging exists specifically to stop children disengaging. You are building
for your own daughter with no revenue motive — **you have the rare freedom to
simply not do any of this**, and the research says the app will teach better for
it. Let her get bored and walk away. That's a feature.

### 4.3 The curriculum map (age 4 / PK4)

Two authoritative frameworks, and they compose well.

**Head Start ELOF** [primary, S21] — for preschoolers (3–5) there are **six**
top-level domains: Approaches to Learning; Social and Emotional Development;
Language and Communication; **Literacy**; **Mathematics Development**; Scientific
Reasoning; plus Perceptual, Motor, and Physical Development.

ELOF's five-level hierarchy — **Domains → Sub-Domains → Goals → Developmental
Progressions → Indicators** — is directly reusable as your content schema, with
indicators specified at 36 and 60 months (60 = your target). Sub-domains map
cleanly onto the skill list:

- *Literacy*: Phonological Awareness · Print & Alphabet Knowledge · Comprehension & Text Structure · Writing
- *Mathematics*: Counting & Cardinality · Operations & Algebraic Thinking · Measurement · Geometry & Spatial Sense
- *Language*: Attending & Understanding · Communicating & Speaking · Vocabulary
- *Approaches to Learning*: Memory · Reasoning & Problem-Solving · Exploration & Discovery

⚠ **Head Start explicitly prohibits using ELOF as a curriculum, an assessment, or
a checklist, or to conclude a child has failed or is not kindergarten-ready**
[primary, S21]. Use it to *tag* activities. Never surface it to a parent as a
mastery scorecard.

**Texas PK4 Guidelines (2022)** [primary, S22] give the concrete numeric targets
ELOF deliberately avoids:

| Skill | PK4 target |
|---|---|
| Letter naming | **≥20 letters** (upper *or* lower) — not 26 |
| Letter–sound correspondence | **≥20** distinct correspondences |
| Case order | **Uppercase first** — capitals are more visually distinguishable |
| Rote counting | to **30** |
| 1:1 counting with cardinality | to **10** |
| Subitizing | to **6** |
| Numeral recognition | **0–10** |
| Addition / representation | up to **5 objects** |
| Geometry | common 2D shapes + **≥1 3D solid** |
| Patterns | recognize, duplicate, extend, create; plus sorting |
| Writing | own first name, legible, **correct sequence and directionality** |
| **Attention span** | **up to 20 minutes** on an engaging adult-led activity |

**Phonological awareness is an ordered ladder, large units → small** [primary, S22]:
compound words → syllable blending/segmenting → rhyme → alliteration → onset-rime
→ **phoneme blending/segmenting last**, with visual or gestural scaffolds at the
phoneme level. Building phoneme work early is the single most common way pre-K
literacy apps get the sequence wrong.

That 20-minute figure is a standards-based *upper bound* for an adult-led
activity — solo app sessions should target well under it. Design for **5–8 minute
sessions with a clean exit**.

### 4.4 Making it look expensive rather than cheap

- Bold primary colors and high-contrast layouts are preferred from age 2–3 and
  the preference persists through five [unverified, S24].
- **Preserve explicit visual hierarchy** so a non-reader can find the tappable
  target unaided: enlarge targets, add subtle drop shadows or contour lines, give
  interactive elements a *broader palette than the background*, reinforce with
  audio and animation [unverified, S24].
- **Icons must be literal.** Pencils, books, arrows, Play/Pause work. Abstract
  metaphors fail — home buttons, floppy-disk save icons, and game-controller
  icons confuse children under four [unverified, S24].
- Pair icons with **single-word** labels: under-threes attend only to the icon;
  approaching five, the label starts to help [unverified, S24].
- Assume **adult-free use**, and **do not trade graphical richness for load
  performance** — loading delays frustrate young users [unverified, S24].
- "Juice" is a **post-mechanics polish layer**, not a substitute for a working
  core — which implies a build order: mechanics first, feel second [unverified, S26].
  Cheap, asset-free wins: **easing/tweening instead of linear interpolation**,
  short particle bursts on contact, a split-second freeze on impact.
- **Sound effects establish the credibility of every interaction** — load-bearing
  in a pre-reader app where audio carries meaning text cannot [unverified, S26].

Note the tension with §4.1: "juice" advice comes from general game design, while
the peer-reviewed evidence warns that *extraneous* animation harms learning. The
reconciliation is precision — **juice the interaction the child just performed;
do not juice the background.** Feedback tied to the child's own action is
coherent. Ambient decoration is the thing that tested badly.

### 4.5 Assets on an indie budget

- **Kenney Game Assets All-in-1** — **CC0 (public domain)**, unlimited commercial
  use, **no attribution required**; one-time **$19.95**; 60,000+ assets in a
  509 MB zip; PNG/SVG for 2D and UI, OGG audio; **1,200+ sound effects and music
  loops** [primary, S28]. This is the single highest-leverage $20 in the plan and
  covers your entire UI-sound and reward-sting layer on day one.
- **On AI-generated art** [unverified, S27]: fully AI-generated assets receive
  **no U.S. copyright protection** (Copyright Office, Jan 2025); *Thaler v.
  Perlmutter* (D.C. Cir., Mar 2025) affirmed human authorship is required. Apple
  imposes no AI disclosure requirement as of early 2026. **For a personal family
  app this is irrelevant** — use AI art freely. It only matters if you later
  commercialize and want to own the art.

---

## 5. The build plan for Maelie's Learning Hub

### 5.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite + TypeScript** | Fast HMR; you'll iterate on feel constantly |
| Shell UI | **React** | Menus, maps, settings — DOM is right for these |
| Activity surface | **PixiJS v8** (WebGL) | Sprites, particles, 60fps; not React |
| Ink | **Canvas 2D, `desynchronized: true`**, separate layer | Lowest-latency path (S14); isolate from the game render loop |
| Stroke geometry | **perfect-freehand** | §3.4 |
| Character animation | **Rive** | State machines; browser-based authoring; no After Effects |
| Audio | **Howler.js** or hand-rolled over a **single** AudioContext | Must be one context (S19) |
| Storage | **IndexedDB** (via `idb`) + `navigator.storage.persist()` | Eviction-exempt (S17) |
| Offline | **Workbox** service worker, precache everything | Zero network at runtime |
| Art baseline | **Kenney CC0 bundle** ($19.95) | §4.5 |
| Backend | **None** | §2.3 — no accounts, no analytics, no COPPA surface |

**Requires iPadOS 18.2+.** Detect and warn; ship the non-coalesced fallback path
regardless.

### 5.2 Input pipeline (the part that has to be right)

```
pointerdown → setPointerCapture, begin stroke
pointermove → e.getCoalescedEvents() ?? [e]     // 18.2+, fallback to single
            → push {x, y, pressure, t} into raw buffer
            → (optional) getPredictedEvents() for speculative lead-in
rAF         → getStroke(buffer, opts) → Path2D → fill on desynchronized 2D ctx
pointerup   → finalize, score, release capture
```

Non-negotiables: `touch-action: none` on the surface; `user-select: none` and
`-webkit-touch-callout: none` to kill the long-press callout; `viewport-fit` and
`user-scalable=no` to stop double-tap zoom; keep the ink layer's per-frame work
minimal so pointer samples aren't dropped under load (§3.3).

Palm rejection: use `Touch.touchType` / pointer `pointerType` to ignore non-stylus
input **only** in an explicit Pencil mode. Maelie is four — **finger is the
primary input**, Pencil is a bonus. Do not build a Pencil-first app.

### 5.3 Content architecture

Model content as data, not code, so adding an activity is authoring a JSON file:

```
Activity {
  id, title, icon, sceneType,          // 'trace' | 'match' | 'sort' | 'count' | ...
  elofTags: [domain, subdomain, goal], // per S21 hierarchy
  difficulty: 1..5,
  assets: { sprites[], sounds[], rive? },
  params: { ... }                      // scene-type-specific
}
```

Six to eight reusable **scene types** cover the entire PK4 map. Author dozens of
activities as data on top of them. That is how you get ABCmouse-scale content
breadth as one person.

### 5.4 Activity list, mapped to standards

| Scene type | Activities | Standard (S22/S21) |
|---|---|---|
| **Trace** | Uppercase letters (first), lowercase, numerals 0–10, **her own name** | Writing; directionality; ≥20 letters |
| **Match** | Letter→sound, upper→lower, numeral→quantity | Alphabet knowledge; cardinality |
| **Sort / drag** | By color, shape, size, initial sound | Sorting; alliteration |
| **Count** | Tap-to-count to 10, subitize flash to 6, rote count to 30 | Counting & cardinality; subitizing |
| **Pattern** | Duplicate → extend → create AB/ABC patterns | Operations & algebraic thinking |
| **Rhyme / sound** | Compound blending → syllable clap → rhyme → alliteration | Phonological ladder, **in order** |
| **Shape** | 2D naming, plus ≥1 3D solid | Geometry & spatial sense |
| **Free draw** | Open canvas, no scoring | Fine motor; creative play |

Free draw earns its place: it's the one activity with no failure state, and per
Toca Boca's "what are we going to play?" framing, an app that is *only* drills
is an app she'll refuse.

### 5.5 Engagement design — deliberately restrained

**Include:** a small reward economy (stickers/coins) that unlocks *cosmetic*
avatar items; an activity map she can navigate herself; per-interaction juice
(easing, particle burst, sound sting) tied to her own actions; adaptive
difficulty that quietly steps down after two failures.

**Exclude, on evidence:** looping background music (continuous distraction, S23);
idle character nagging (S25); return-tomorrow prompts and streaks (S25);
countdown urgency (S25); any hard-fail state; any tap-to-pop mechanic presented
as learning (minds-off, S23).

**Session shape:** 5–8 minutes, clean exit, no "just one more" prompt. If she
walks away, the app says nothing.

### 5.6 Milestones

**M0 — Device truth-check (do this first, ~1 day).**
A single throwaway page on Maelie's iPad that answers, empirically:
1. Does `getCoalescedEvents()` fire, and at what sample rate?
2. How does perfect-freehand ink *feel* under her finger — latency, width, taper?
3. Does audio play with the ringer switch silent? Does the context re-suspend
   after ~5s idle?
4. Does `navigator.storage.persist()` return `true` once installed to Home Screen?

Everything downstream depends on these four answers, and all four are currently
single-source or untested. **Do not write the app before running this.**

**M1 — Shell.** Installable PWA, service worker, offline precache, IndexedDB
profile, home map, one working Trace scene. Landscape *and* portrait layouts.

**M2 — Scene engine.** All 8 scene types as data-driven components. ~10 activities.

**M3 — Content pass.** Author to the full PK4 map: 26 letters, numerals 0–10,
shapes, patterns, the phonological ladder in sequence. ~60–80 activities.

**M4 — Feel pass.** Rive characters, particle/easing polish, full Kenney audio
layer, adaptive difficulty. This is the "expensive vs cheap" milestone — treat it
as real work, not cleanup.

**M5 — Her testing.** Watch her use it without helping. Per Toca Boca's
maximum-viable-product stance, expect late revisions and budget for them.

---

## 6. Open questions

1. **All four M0 questions above.** Highest-risk items in the plan; the audio
   silent-switch behavior is the one most likely to be a genuine blocker.
2. **Trace-scoring** was not covered by any source — §3.5 is my design, unvalidated.
3. **Khan Academy Kids' actual stack** remains unknown; S2 covers only the
   flagship app and self-flags the gap.
4. **ABCmouse free-tier limits** — mechanism confirmed, exact numbers refuted.
5. **132 of 143 claims never completed adversarial verification.** Anything marked
   [unverified] above is a single-source lead. The run is journaled and resumable
   if any specific claim turns out to be load-bearing.

---

## Appendix — Sources

| # | URL | Type |
|---|---|---|
| S1 | https://unity.com/blog/how-toca-boca-built-a-high-performance-scalable-rendering-backend | blog |
| S2 | https://blog.khanacademy.org/migrating-to-a-mobile-monorepo-for-react-native/ | blog |
| S3 | https://blog.duolingo.com/a-good-read-building-duolingo-abc-for-android/ | primary |
| S4 | https://motionographer.com/2016/04/27/the-design-process-behind-toca-bocas-infectious-apps/ | secondary |
| S5 | https://joanganzcooneycenter.org/2018/09/14/podcast-transcript-the-app-fairy-talks-to-toca-boca/ | primary |
| S6 | https://www.callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation | blog |
| S7 | https://developer.apple.com/app-store/review/guidelines/ | primary |
| S8 | https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know | secondary |
| S9 | https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions | primary |
| S10 | https://developer.apple.com/news/?id=091202019a | primary |
| S11 | https://support.abcmouse.com/hc/en-us/articles/34385411866391-Subscription-Pricing-Options-for-ABCmouse | primary |
| S12 | https://webkit.org/blog/16301/webkit-features-in-safari-18-2/ | primary |
| S13 | https://brighterly.com/blog/abcmouse-alternatives/ | blog |
| S14 | https://developer.apple.com/forums/thread/689375 | forum |
| S15 | https://github.com/shuding/apple-pencil-safari-api-test | repo |
| S16 | https://github.com/steveruizok/perfect-freehand | primary |
| S17 | https://webkit.org/blog/14403/updates-to-storage-policy/ | primary |
| S18 | https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ | primary |
| S19 | https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos | blog |
| S20 | https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock | primary |
| S21 | https://headstart.gov/interactive-head-start-early-learning-outcomes-framework-ages-birth-five | primary |
| S22 | https://tea.texas.gov/academics/early-childhood-education/2022-texas-prekindergarten-guidelines-pk4-streamlined.pdf | primary |
| S23 | https://kathyhirshpasek.com/wp-content/uploads/sites/9/2019/07/apps.pdf | primary (peer-reviewed) |
| S24 | https://www.uxmatters.com/mt/archives/2011/10/effective-use-of-color-and-graphics-in-applications-for-children | blog |
| S25 | https://www.michiganmedicine.org/health-lab/design-tricks-commonly-used-monetize-young-childrens-app-use | secondary |
| S26 | https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design- | blog |
| S27 | https://blog.promise.legal/ai-generated-game-assets-legal-guide/ | blog |
| S28 | https://kenney.itch.io/kenney-game-assets | primary |
| S29 | https://www.motiontheagency.com/blog/lottie-vs-rive | blog |
