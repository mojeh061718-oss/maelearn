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

- **87 activities** across 10 scene types: letter/numeral **tracing** (incl.
  "MAELIE"), matching, sorting, counting, patterns, a research-ordered
  **phonics ladder**, shapes, free drawing, and two games — **balloon pop**
  and **feed-the-animal**.
- **Structured learning path**: a 30-step winding trail with sequential
  unlock and stars, plus free-choice areas.
- **Real voice**: 432 pre-generated neural TTS clips (Piper), fully offline.
- Spoken + written **directions** on every activity, with a replay button.
- Art: Kenney CC0 packs (backgrounds, animals, fish, sounds) + Fredoka (OFL).
- Precise finger tracing: Pointer Events + coalesced samples (Safari 18.2+),
  perfect-freehand ink on a desynchronized canvas.
- Sticker rewards on completion only — no streaks, no nagging, no dark patterns.

## Development

```bash
npm install
npm run dev          # local dev server
npm run build        # type-check + production build to dist/
npm run gen:content  # regenerate activities/glyphs/path JSON
sh tools/fetch-voice-model.sh && node tools/gen-voice.mjs  # regenerate voice clips
```

Deploys automatically to GitHub Pages on push to `main`
(`.github/workflows/deploy.yml`).

## Docs

- `docs/research/00-research-report.md` — the research (29 sources, cited)
- `docs/BLUEPRINT.md` — architecture spec
- `docs/HANDOFF-FABLE.md` — build brief + acceptance criteria
- `docs/decisions/` — implementation decisions & deviations
- `docs/M0-RESULTS.md` — device test checklist (**run this on the iPad**)
