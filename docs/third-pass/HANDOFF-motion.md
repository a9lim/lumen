# Handoff: the motion lane

Progress log for BRIEF-motion.md. Newest last.

## Baseline (before any change), probe at 1440×900, 8 s, 60 fps

| specimen | s | protonPops | protonJumps | protonMaxStep | elecMaxStep | elecJumps | carrierPops | molFlips | flipBack<1s | flipsInDock | molJumps | dockStepMax |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cyanobacterium | 5.64 | 91 | 927 | 50.1 | 149.8 | 155 | 72 | 943 | 839 | 18 | 31 | 24.2 |
| animalCell | 5.47 | 91 | 789 | 49.9 | 94.0 | 52 | 29 | 1255 | 1165 | 19 | 49 | 116.5 |
| plantChloroplast | 4.38 | 69 | 598 | 38.8 | 94.5 | 172 | 69 | 44 | 15 | 12 | 59 | 27.8 |
| custom | 5.02 | 91 | 1029 | 61.2 | 117.6 | 129 | 50 | 2243 | 2023 | 31 | 13 | 20.4 |

Live checks run against a private mirror (HEAD for files outside this lane's scope, symlinks to the
working copy for particles/stroma/window/detail/complexes), served on port 8795, because the
coordinator's in-progress index.html crashes ui.js at init in the shared tree. `probe.mjs` now takes
`PORT=` (default 8791).

## Stroma (strobe, docked reversals, dash): done

- `window.js _pools`: a reaction's forward and backward events pair up. An event in the net
  direction changes a molecule with chance (v₊ − v₋)/v₊; the rest are exchange, passed as d = ±0.5
  (a thread from a molecule the enzyme would take, which stays as it was). The cause of most of the
  residual strobe after the reconciliation fix: MDH and HACD4 at equilibrium ran ~30 events/s each
  way against 14 matrix NADH. `Renderer.mapEvent` passes d through unchanged, so no renderer change.
- `stroma.js`: reconciliation is lazy (rate |drift|/1.5 s), random among free molecules, never a
  docked one (a dock's `to` is fixed); events pick the nearest free molecule that hasn't changed in
  the last 1 s if any can; a form change crossfades the glyph over 150 ms (`was`, `ft`).
- Docking: the nearest within 16 nm first, at most 40 nm/s (at least 8). A molecule let go outside
  the band (the crista's ATP synthase heads) drifts back at that speed instead of snapping to the edge.
- Threads: one per enzyme (keyed by its map point); a new event restarts it from the new molecule
  once the last has grown in (so a busy enzyme's thread grows, then moves on, at most ~3 Hz).
  `Stroma.focus = [x, y]` draws threads ending there at full strength, the rest at 45%.
- Probe: `molFlipsInDock` now counts a dock's fate flipping under the same dock (the change on
  release is legitimate and was being counted); `molJumpEx` samples jumps.

| specimen | molFlips | flipBack<1s | inDock | molJumps | dockStepMax |
|---|---|---|---|---|---|
| cyanobacterium | 943 → 87 | 839 → 0 | → 0 | 31 → 0 | 24.2 → 3.8 |
| animalCell | 1255 → 75 | 1165 → 0 | → 0 | 49 → 0 | 116.5 → 3.7 |
| plantChloroplast | 44 → 50 | 15 → 1 | → 0 | 59 → 0 | 27.8 → 2.9 |
| custom | 2243 → 174 | 2023 → 20 | → 0 | 13 → 0 | 20.4 → 3.4 |

## Probe corrections, and HEAD re-measured with them

- `protonPops` counted every proton on the probe's first frame as new (prevP empty), which is all of
  the brief's ~91 per 8 s: re-measured at HEAD (pure `git archive HEAD` mirror on port 8796) it is 0
  after frame 1. The full-opacity top-up path (`poolProton()` after 1 s short) did exist and is
  replaced; it just rarely fired in steady state.
- New: `poolErrMean`/`poolErrMax`, the drawn pool (pooled + crossing up) minus the gradient it stands
  for, and `qaMax`, ATP synthase's backlog. HEAD's error is 0 because it streaks protons to the sinks.

HEAD, corrected probe: protonJumps 1043 / 687 / 630 / 1046, protonMaxStep 58.4 / 48.8 / 39.2 / 64.3 px
(cyano / animal / chloroplast / custom); molFlipsInDock (new definition) 1 / 17 / 4 / 5; molJumps
84 / 49 / 77 / 13.

## Protons (pop-ins, streaks): done

- Pooled protons that are new fade in (`a` from 0). The shortfall crosses up through the complexes
  pumping, in proportion to their rates: `window.js` writes `store.pumping` (protons per wall s per
  complex key, from `Win.rate` × a `PUMP` table that `_effect` now also uses; ATP synthase run
  backward counts with its ring). With nothing pumping, the shortfall fades in where it is.
- A sink takes the pool protons within 20 nm of its entry, at most 25 nm/s; the rest of its share
  waits its turn (the backlog stays owed). After 1.5 s with none in reach it takes the nearest beyond.
- So that a sink's neighbourhood refills, the pool spreads laterally down its own density gradient
  (Fick, D = 2000 nm²/s, at most 16 nm/s): with the drawn pumps 60–150 nm from ATP synthase this is
  a visible current toward it. That is the lumen's real lateral proton current, slowed with the rest.
- NNT now has its own tally, `store.protonsNnt` (one proton per drawn turnover, × w), instead of
  taking all unattributed excess; the excess besides (the drawn pumps outrunning the drawn sinks,
  since each complex is one representative centre) crosses the bilayer where the pool is densest.

| specimen | protonJumps | protonMaxStep | poolErrMean | poolErrMax |
|---|---|---|---|---|
| cyanobacterium | 1043 → 0 | 58.4 → 2.4 | 0 → 2.7 | 0 → 19 |
| animalCell | 687 → 0 | 48.8 → 2.6 | 0 → 7.5 | 0 → 22 |
| plantChloroplast | 630 → 0 | 39.2 → 1.9 | 0 → 1.3 | 0 → 9 |
| custom | 1046 → 0 | 64.3 → 2.1 | 0 → 0 | 0 → 2 |

The cost of not streaking: the drawn pool can run up to ~8% over its gradient (mean, animal cell)
while ATP synthase's protons wait their turn. The cartouche's number is the store's, unaffected.

## Electrons and carriers (jumps, teleports): done

- Persistent carrier instances (`Particles.carriers`): PQ ×8 in two rows in the bilayer, PC ×5 in two
  rows on the lumen side, Fd ×4 by PSI; at most 80 / 90 / 90 nm/s (≈1.3–1.6 nm a frame at 60 fps).
  A free carrier wanders near home; the nearest free one is sent to an electron waiting at a donor's
  exit (first come, first served), docks beside the cofactor (PQ in the bilayer at it, PC/Fd beside it
  on their side), the electron hops on (the carrier crossfades to loaded over 150 ms), it rides to a
  queue slot at the acceptor (2.6 nm apart, the head at the dock), and only the head checks the gate.
  The electron hops into the acceptor's entry cofactor and the carrier goes free. A chain's last
  carrier (the short hops ending on PC or Fd) carries its electron off loaded and fades it into the
  pool (0.6 s, then 0.8 s); so does a give-up on a carrier.
- An electron walks each complex's cofactors: 50 ms at each, hops timed by length (25 nm/s, at least
  60 ms). A chain that starts on a carrier (cyclic flow, NDH-1 on Fd, the hops) loads the free carrier
  nearest its first acceptor in place.
- Gate semantics kept: cb[i]/gates[i] fire as the electron reaches keys[i]; a gate on a carrier's key
  (FNR on `fd`, CYTOX on `pc`, PSI on `pc` in cyclic flow) holds it on that carrier at the complex
  the carrier brings it to, which is where the old drawing stood it too. MAX_WAIT 3 s applies at a
  donor's exit, in a queue and at a gate; a give-up still fires the chain's ungated callbacks (a
  hop's effect), so no complex's drawn effect is lost.
- Cyclic flow's Fd hands its electron straight into b₆f's stromal Qi site (by heme bʜ) instead of to
  a free PQ: with b₆f the bottleneck in high light every PQ is queued there, and CEF's Fds were held
  3 s waiting, starving the FNR route. (Walk-to-walk steps gained a `gate` state for it.)
- Electrons are dots only off a carrier; on one, the loaded carrier is the electron. `where(e)` returns
  the carrier's position while riding and `hidden` before a start-on-carrier electron has its carrier.
  `riding` is the carriers ≥ half loaded, as before (drawCarrierSites).
- Bug found and fixed on the way: an electron that had handed its carrier over kept `e.car`; giving up
  later at the Qi gate released the carrier from its new owner, orphaning that rider.

Gates met by a drawn electron / turnovers drawn as short hops, 20 s (HEAD → now):

| specimen | b₆f | PSI | FNR | oxidase |
|---|---|---|---|---|
| cyanobacterium | 22/0 → 37/1 | 19/22 → 26/9 | 6/2 → 9/2 | 1/46 → 0/45 |
| plantChloroplast | 19/0 → 22/0 | 14/29 → 23/40 | 6/2 → 2/1 | |
| animalCell | 22/16 → 24/11 | | | 20/7 → 14/3 |

(Turnover counts differ run to run: the window's random stream is seeded, and the pairing draws
shift it. FNR's few turnovers are within noise.)

| specimen | elecMaxStep | elecJumps | carrierPops | carrierMaxStep | carrierJumps | electrons waiting at an exit (mean) |
|---|---|---|---|---|---|---|
| cyanobacterium | 148.4 → 8.5 | 155 → 0 | 75 → 0 | 8.5 | 0 | 10.7 |
| animalCell | 94.0 → 8.3 | 52 → 0 | 29 → 0 | 8.3 | 0 | 1.9 |
| plantChloroplast | 93.7 → 6.6 | 172 → 0 | 69 → 0 | 6.6 | 0 | 8.1 |
| custom | 117.6 → 7.6 | 129 → 0 | 53 → 0 | 7.6 | 0 | 10.4 |

`carrierPops` now counts a loaded carrier instance stepping more than 3·s in a frame (HEAD: a loaded
carrier appearing). The waiting electrons sit mostly at PSII's Qʙ (stacked, they read as one dot):
PSII turns over ~4/s, b₆f ~1.3/s, so the PQs queue at b₆f and PSII's acceptor side backs up, which
is the model's own bottleneck.

## Also

- `complexes.js quinone()`: on the dark ground a reduced PQ is filled with the ochre ink and drawn in
  its darker tone (the line tone sank into the bilayer; a queue of loaded PQs is now the usual sight).
  Light theme unchanged.
- `ladder.js` (not touched) reads `e.keys`, `e.type` and `e.progress`: each electron now keeps a
  derived `progress` with the old meaning (segment i from keys[i] to keys[i + 1], the last through the
  terminal complex), so the Z-scheme's beads still sit where the electrons are.
- Checked: the engine tests (28 pass), `node --check` on everything, `git diff --check`; no console
  errors on the four probe specimens, the anaerobe (no carriers), the archaeon (PQ, PC; no flow by
  default), phone width, and the dark theme. Frame times unchanged (60 fps, no long frames).

## For the coordinator

1. `Stroma.focus = [x, y] | null` exists: set it to the legend card's enzyme as the same map point
   `Renderer.mapEvent` passes as `to` (`sg.lab.glyphAt || [sg.lab.x, sg.lab.y]`); a thread matches
   within 0.5 px. Threads elsewhere draw at 45%.
2. Keep `Renderer.mapEvent` passing `d` through untouched: ±1 changes a molecule, ±0.5 is an exchange
   (a thread only). A `Math.sign(d)` there would bring the strobe back.
3. `window.js` writes two new store fields, `store.pumping` (per sample) and `store.protonsNnt`
   (reset in `attach`); state.js may declare them for documentation, nothing needs it.
4. Public surface kept: `Particles.{spawnElectronChain, spawnProton, spawnPhoton, emit, seed, clear,
   fill, update, draw, where, riding}` and `Stroma.{fill, relayout, event, update, draw, drawRadicals,
   drawThreads, pick, mols, gapY}`. New: `Particles.carriers`, `Stroma.focus`; `where(e)` may return
   `hidden: true` (an electron waiting for its first carrier). `e.progress` is derived, `e.pts`/
   `e.starts` are gone.
5. `ui.js refresh()` calls `Particles.clear(); Stroma.fill(); Particles.fill();` without `seed()`, so
   after a preset change the membrane starts without electrons in transit (as before this lane).
