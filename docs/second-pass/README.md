# Second pass: the proposal

The sources of the proposal page for Lumen's second visual pass (private artifact
https://claude.ai/artifact/3j2CPQFQHj8sZ1j1JTq6Nx, "Lumen Second Pass", 2026-10-24).
Nothing here is staged or deployed.

- `sketches/`: the page. `python3 build.py OUT.html` assembles it from `head.html`,
  `extra.css`, `body.html`, the scripts and `thumbs/`. The Today drawings port Lumen's
  code at `5738b15`; the Proposed ones are toys whose drawing code is meant to move into
  the sim:
  - `kit.js`: colours (`tones()`), `assembly()` and the complexes' part lists, the
    bilayer (`lipidsProposed`, with peroxidised tails), ATP synthase's binding change
    (`atpHead`), the cofactor glyphs (`molGlyph`), superoxide, the cartouche, scale bar,
    callouts and panel titles.
  - `memkit.js`: the sac layout (after `src/membrane.js`), the particles (after
    `src/particles.js`), and the stroma's pools as molecules with docking,
    reconciliation and threads.
  - `mapkit.js`, `mapdraw.js`: the real map layout, the cofactor connections (`COF`),
    the gates (`gatesOf`, after `src/regulation.js`), the zones, and both keys.
  - `sk-*.js`: one figure each. `sk-locator.js` has the locator drawings, `sk-z.js` the
    Z-scheme ladder and its chain mappings.
- `tools/`: `tour.mjs` screenshots the real sim per specimen (against
  `docs/sim-overhaul/serve.mjs` in the parent); `shoot.mjs` and `full.mjs` screenshot
  the proposal page's figures and the whole page. All use Exploratory's playwright-core.
