# Maelie's Learning Hub 🌞

A pre-K learning PWA for one specific 4-year-old, on one iPad. Fully offline,
no accounts, no ads, no analytics, no network calls at runtime.

**Live:** https://mojeh061718-oss.github.io/maelearn/

## Install on the iPad

1. Open the link above in Safari on the iPad.
2. Share button → **Add to Home Screen**.
3. Launch from the Home Screen icon (runs fullscreen, works in Airplane Mode
   after first load).
4. First thing: open `⚙ grown-ups` → `🧪 M0 device tests` and record the
   results into `docs/M0-RESULTS.md` (see that file for what to check).

## What's inside

- **77 activities** across 8 scene types: letter/numeral **tracing** (incl.
  "MAELIE"), letter-sound / case / quantity **matching**, **sorting**,
  **counting** (tap, subitize, rote-to-30), **patterns**, a **phonics ladder**
  in research-backed order, **shapes** (2D + solids), and free **drawing**.
- Precise finger tracing: Pointer Events + coalesced samples (Safari 18.2+),
  perfect-freehand ink on a desynchronized canvas.
- Sticker rewards on completion only — no streaks, no nagging, no dark patterns.

## Development

```bash
npm install
npm run dev          # local dev server
npm run build        # type-check + production build to dist/
npm run gen:content  # regenerate activities/glyphs JSON from tools/gen-content.mjs
```

Deploys automatically to GitHub Pages on push to `main`
(`.github/workflows/deploy.yml`).

## Docs

- `docs/research/00-research-report.md` — the research (29 sources, cited)
- `docs/BLUEPRINT.md` — architecture spec
- `docs/HANDOFF-FABLE.md` — build brief + acceptance criteria
- `docs/decisions/` — implementation decisions & deviations
- `docs/M0-RESULTS.md` — device test checklist (**run this on the iPad**)
