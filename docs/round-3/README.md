# Round three: the proposal

The sources of the proposal page for Lumen's third roadmap round (private artifact
https://claude.ai/artifact/7dmxwN742JP8d7S6Ubhda8, "Lumen Round Three", 2026-10-27). The
round itself, with every probe's numbers and the references, is `docs/VISION.md`. Nothing here
is staged or deployed.

`python3 build.py OUT.html` assembles the page from `head.html` (the third pass's styles),
`extra.css`, `body.html`, `page.js`, `seal.svg` and `img/`, and bundles `src/engine/` with the
parent's esbuild into `data/engine.js` (ignored), so the page's figures run Lumen's own engine:

- `page.js`: `Sim` runs histories of a cell in model time with timed additions; `View` draws a
  time range of one as paired strips with arrows and a cursor (the record, milestone 3's
  prototype); `ledger` integrates where each history's carbon went (3b's). Fig. 3 is a stress
  test, Fig. 4 anoxia and reoxygenation, Fig. 5 two histories of one cell. `SKETCH` draws the
  three canvas sketches (the carboxysome, PSII's fluorescence, antimycin at Qᵢ).
- `img/`: the opening frame at 1440 × 900 in both themes, at `e30d90d`.
