# Brief: the motion lane of Lumen's third pass

You are fixing the animation faults in Lumen's membrane panel (panel a). The person approved every fix below on 2026-10-26, including the carrier rewrite. Another agent (the coordinator) is rebuilding the shell, the map and the renderer's layout in the same checkout at the same time. Stay inside the files listed under Scope.

Read first: `projects/lumen/AGENTS.md` (whole), especially "The window", "Timing" and "Conventions". The parent repo's AGENTS.md "Inside the scene" rules apply: every effect reads a quantity in the model, and display noise never reaches the model.

## The faults, measured

`docs/third-pass/probe.mjs` tracks every particle frame by frame (`node docs/third-pass/probe.mjs cyanobacterium,animalCell,plantChloroplast,custom 8`). It needs the sims server on port 8791 (`node ../../docs/sim-overhaul/serve.mjs 8791` from `projects/lumen`; one may already be running, check with `lsof -i :8791`). It uses Exploratory's playwright-core. Today's results, 8 s each at 60 fps:

| Fault | Measured | Cause | Agreed fix |
|---|---|---|---|
| Cofactor molecules strobe | animal cell: 1,408 form changes, 94% undone within 1 s, one NAD flipped 180 times | `Stroma.update` restores each pool's count after the sampled events by flipping the *first* molecules in array order | Forward and backward sampled events pair up, so only real drift is reconciled. Drift is reconciled at random among free molecules, and a molecule's glyph crossfades over about 150 ms when it changes form |
| Docked molecules change their minds | 14–33 per 8 s | the same reconciliation flips `dock.to` | a docked molecule's fate is fixed; reconcile only free molecules |
| Protons appear from nowhere | about 11 a second at full opacity, mid-lumen | `Particles.update` tops the lumen pool up with `poolProton()` at random positions (`_short`) | the shortfall crosses up through the complexes the model says are pumping, in proportion to their pumping rates (window.js knows the rates: `Win.rate`, `CHAINS`, `_effect`'s proton counts), and anything new fades in |
| Protons streak to ATP synthase | up to 66 px in one frame | 'site' mode moves at max(60·s, 5·d) px/s | a capped drift speed; the site takes the nearest protons within reach and the rest wait their turn |
| Electrons jump | up to 148 px in a frame; about 20 jumps a second in the cyanobacterium | every chain takes `CHAIN_TIME` 1.39 s whatever its length, so a long leg is crossed in a few frames | time each leg by its distance: hops between a complex's own cofactors stay quick (they are fast in life), carrier legs travel at a bounded speed |
| Carriers teleport | about 10 a second in the cyanobacterium | `Particles.draw` hides an idle PQ/PC/Fd at home and draws a loaded one wherever the electron is | persistent carrier instances (PQ in the membrane, PC on the lumen side, Fd on the stromal side): a free carrier travels to the donor, docks, takes the electron (drawn loaded), rides to the acceptor, hands it over, and wanders back near home. An electron that reaches its donor's exit before a carrier arrives waits there; the existing 3 s give-up (`MAX_WAIT`) still applies |
| Molecules dash to dock | up to 117 px in a frame | docking pulls the nearest molecule of its kind at max(30·s, 4·d) | take the nearest within reach, at a capped speed |

Bounds to aim for, at the probe's settings: no proton, electron, carrier or molecule moving more than about 3·s px in one frame (s is `Membrane.s`, px per nm, about 5.5 at 1440 wide) except a genuinely new object; no pop-ins at full opacity; form flips undone within 1 s down by at least 90%; no flips of docked molecules. Extend the probe to measure carriers directly (each carrier instance's per-frame step), and keep its existing measures meaningful if you change the data structures.

## Constraints

- What each drawn complex does must stay its own sampled turnover (window.js's design: an electron waits at each later complex until that complex turns over; `credits` and hops). Don't make the drawing borrow one complex's rate for another's effect.
- The engine (`src/engine/`) is authoritative and untouched. `store` is display-only.
- Timing is wall time (the window's slowdown is already applied to the rates). The model trajectory must stay frame-independent (the engine tests check this; don't touch the engine).
- Under reduced motion the loop holds still until the first interaction; nothing you add may run then.
- Keep the public surface that other files call, or tell the coordinator in your handoff what changed: `Particles.{spawnElectronChain, spawnProton, spawnPhoton, emit, seed, clear, fill, update, draw, where, riding}`, `Stroma.{fill, relayout, event, update, draw, drawRadicals, drawThreads, pick, mols, gapY}`, and window.js's calls into `Renderer.*` (renderer.js forwards them to Particles and Stroma).
- Threads: also make one live thread per enzyme at a time (a new event at the same enzyme restarts that enzyme's thread from the new molecule rather than adding another), and add `Stroma.focus`: when set to a map point `[x, y]` (the coordinator will set it to the enzyme in the legend's card), threads ending there draw at full strength and the others at about 45%. Leave the thread's route (`sPath`) and the draw order alone; the coordinator owns those.
- Every new effect names its quantity in a comment where it is drawn. Match the surrounding code's style: terse comments, no new dependencies, plain ES modules.

## Scope

You may edit: `src/particles.js`, `src/stroma.js`, `src/window.js`, `src/detail.js` (only if the electron's road needs it), `src/complexes.js` (only the carrier drawings, if needed), and `docs/third-pass/probe.mjs`. Don't edit renderer.js, membrane.js, map*.js, ui.js, main.js, index.html or styles.css. If you need a hook there, describe it in the handoff and the coordinator will add it. Don't commit, don't run the parent repo's `npm run build`, and don't touch the parent repo.

## Checks before you hand back

- `node --test tests/*.test.mjs` and `for f in main.js colors.js src/*.js src/engine/*.js; do node --check "$f"; done` from `projects/lumen`.
- The probe on all four specimens, before and after, with numbers.
- Look at the result: `docs/second-pass/tools/tour.mjs` takes screenshots (scenarios with steps and clip regions; see its header), and a few consecutive frames at 2× zoom around PSII, b₆f, PC, PSI, Fd and FNR will show whether carriers and electrons move continuously. Check the dark theme once.

## Working rules

Keep each response under about 10k tokens and do one idea per turn. Append progress to `docs/third-pass/HANDOFF-motion.md` as you go (what changed, why, probe numbers), so nothing is lost if you are interrupted. Your final message: what changed per fault, the before and after probe numbers, anything you couldn't fix, and any hook you need from the coordinator.
