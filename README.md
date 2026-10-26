# Lumen

An interactive model of how cells make and spend energy. A membrane is drawn in cross-section above the cell's carbon network, drawn as a transit map, and both run on one kinetic model of the cell's chemistry, slowed so you can watch it. Pulse an enzyme and see where the push spreads and where it dies.

**[Open it](https://a9l.im/lumen)** · part of [a9l.im](https://a9l.im)

## What's in it

- A kinetic model per organism: BiGG-identified species in compartments, every reaction one enzyme's and balanced in elements and charge, rates set by thermodynamics (eQuilibrator ΔG'°), saturation and regulation, the proton-motive force split into Δψ and ΔpH, integrated by an implicit Rosenbrock method.
- The plate. Panel a is the organism's membrane cut through, at roughly true relative size in David Goodsell's manner: a cyanobacterial thylakoid, a chloroplast thylakoid by its granum, a mitochondrial crista, an anaerobe's plasma membrane, a halophile's purple membrane, or a composite. Its cofactor pools are drawn as molecules under it, one for each in a fixed slab of the cell. Panel b is the carbon network as a transit map, with line weight and trains showing carbon flux, gates where regulation holds an enzyme back, and threads from the molecules an enzyme changes to the enzyme.
- The legend. The conditions are a sentence whose values you drag (light, oxygen, ATP demand, growth, the uncoupler, the slowdown). Under it, a card shows the rate of the enzyme you last clicked as a budget of its factors, and the flux control coefficients after you hold one. Fig. 2 traces the last two minutes with an arrow at each change, or shows the electron transport chain as a live Z-scheme.
- Reference pages for each pathway and for the model, with its sources.

## Controls

- Click an enzyme on the map or a complex in the membrane to pulse it; right-click inhibits; press and hold holds it 10% up against an unchanged copy of the cell. Click a loop's name for a whole line. On touch, tap and long-press, and switch taps to inhibit under the plate (X).
- Drag a value in the legend's sentence, or focus it and use the arrow keys; click it for a dial.
- Click a line in the plate's key to knock it out (or 1–5).
- Space play · `,` / `.` faster / slower chemistry · R reset · G / F add glucose / fatty acid · L light · O oxygen · U uncoupler
- T theme (light / dark / follows sunlight) · S legend · V Fig. 2's view · `=` / `-` / `0` zoom; drag to pan, scroll to zoom
- Shift+click (or long-press) an info button for its reference page.

## Running locally

The project has no build step of its own; it loads the shared design system from
the parent site by absolute path. From a checkout of
[a9lim.github.io](https://github.com/a9lim/a9lim.github.io) with submodules:

    npm install && npm run build
    python3 -m http.server --directory dist 8000   # http://localhost:8000/lumen/

## How it's built

Vanilla JavaScript ES modules drawing on Canvas 2D, with no dependencies of its own; KaTeX renders the math on the reference pages. The engine (`src/engine/`) is headless and has its own tests (`node --test tests/*.test.mjs`); the window samples it into the picture, and nothing on screen feeds back into the model. [AGENTS.md](AGENTS.md) has the file map and the mechanics.

## License

[AGPL-3.0](LICENSE)
