# Lumen: where it could go

Three ideation rounds so far. Round 1 (2026-10-24, against `c09cca0`) found the model's faults and set the north star. Round 2 (2026-10-25, against `69658c2`) designed the engine. Round 3 (2026-10-27, against `e30d90d`) audits what was built and reorients the roadmap; its proposals wait on a9's decisions, recorded at the end with rounds 1 and 2's. Each round had two independent reads: Claude's, and Codex's, briefed without Claude's ideas. In round 3 Codex also reviewed the synthesis adversarially (gaslamp thread `lumen-roadmap-round3-codex`: jobs `cx-20261027-133835-8b57` and `cx-20261027-135312-6ee7`), and its corrections are folded in. Where the reads agree, that is noted. Every reference below was checked against Crossref on the day it was added. Tags: **[standard]** is textbook or published science, **[synthesis]** is our combination of it, **[speculative]** is a bet.

The faults rounds 1 and 2 listed are fixed, and the engine they designed is built, except where round 3 says otherwise below. AGENTS.md describes the result; this file's history keeps the old lists.

## Where it stands

- **Built.** Milestones 0 (respiratory control, the conservation leaks), 0.5 (the presets' biology) and 1 (the engine, phases A and B), then three visual passes (the plate; the pools as molecules and Goodsell closer; the legend, Fig. 2 and the phone folio) and polish rounds.
- **The engine.** Six cells of 31 to 115 reactions over 39 to 108 species, BiGG-identified and balanced (the biomass row, a sink, excepted), eQuilibrator's ΔG'°, separable rates, Δψ and ΔpH, per-cell c-rings, ROS and damage with consequence, integrated by ROS2. 28 headless tests (23 s).
- **What a visitor can do.** Pick a specimen; set light, O₂, ATP demand, growth or export, the uncoupler and the slowdown; knock out lines; feed the medium; pulse, inhibit or hold any enzyme and read its rate as a budget; watch Fig. 2 (the last two minutes) or the live Z-scheme.
- **Throughput.** After the 40 s warm-up, on one core of an M5 Max in node, model seconds per wall second: cyanobacterium 370, animal cell 175, anaerobe 1,350, chloroplast 520, halophile 520, composite 175 (both reads measured the same). Steps sit at the cap, `HMAX` = 0.05 s.

## What round 3 found

Ranked by how much each misteaches. Every number is a headless probe at `e30d90d`.

1. **The flagship's first dial misbehaves.** Light is the first condition and the cyanobacterium the first specimen. Each case below is read 60 s after the change:
   - At 30% sun, with full O₂, its ATP falls from 2.6 to 0.58 mM (19% of the adenylates) and it exports lactate at 0.12 mM/s.
   - In the aerobic dark it sends about as many electrons to lactate as to oxygen: LDH runs at 0.125 mM/s, against 0.072 mM/s of O₂ taken up (0.144 electron pairs a second).
   - In the anoxic dark, within two minutes every adenylate is AMP (3.0 mM) and NADH/NAD⁺ is 32. Glycolysis stops at PFK, which needs the ATP the cell no longer has, so it ferments nothing at all. Oxygen revives it.
   - The chloroplast shows the same shortfall at 30% sun (ATP share 0.39).

   Which causes matter is a hypothesis to test, not a finding. Glycolytic NADH does have exits: NNT carries 0.140 mM/s of it to NADPH in the dark, and NDH-2 0.044 (Codex). Dark carbon runs mostly through the NAD-linked GAPDH (0.19 mM/s, against G6PDH's 0.019), where *Synechocystis* leans on the oxidative pentose phosphate pathway, and the Entner–Doudoroff route also matters physiologically (Chen et al. 2016), though no study fixes a universal dark partition. ATP demand is substrate-limited all the way down (0.23 mM/s against its dial's 0.4 at 0.69 mM ATP), so the dials are demands set for the light, which the cell meets as far as its ATP allows. The LDH is also the L-isomer's, where *Synechocystis* makes D-lactate (Akiyama & Osanai 2024) **[synthesis; Claude's probes, Codex's corrections]**.
2. **No carbon-concentrating mechanism.** At full sun the cyanobacterium's CO₂ is 2.2 µM against air's 15 µM, RuBP piles up to 2.6 mM, and PSII runs at 60% of its capacity. Real cyanobacteria pump inorganic carbon and keep RuBisCO in carboxysomes (Price et al. 2008) **[standard]**.

   Round 2's open quirk is consistent with that. Dropping light to 30% *raises* RuBisCO from 0.67 to 0.97 mM/s for about two seconds, as internal CO₂ climbs and RuBisCO spends its RuBP backlog. The CO₂ climbs for two reasons: less is drawn down, and the oxidative PPP releases more as G6PDH's dark switch lifts (GND 0.004 → 0.20). Gross fixation rises while net uptake falls, from 0.64 to 0.11 mM/s by five seconds. The transient survives a 100× tighter tolerance (Codex). Whether the missing CCM causes it takes an ablation-and-rescue comparison once a CCM exists **[synthesis; both reads]**.
3. **Growth is starved, and its carbon disappears.** The cyanobacterium asks 0.07 /h and makes 0.0014 /h, 2% of its dial. α-KG sits at 0.1 µM against the biomass row's 5 µM, and OAA at 0.06 µM. The animal cell makes 35% of its dial. Round 2 promised "to the cell" spurs on the map and a ledger of what was made; neither exists. And the legend says "growing" where round 2 decided "biosynthetic demand" **[both reads]**.
4. **The flagship's identities.** It runs α-ketoglutarate dehydrogenase, which *Synechocystis* lacks. Instead it closes the cycle through 2-oxoglutarate decarboxylase and succinic semialdehyde dehydrogenase (Zhang & Bryant 2011) and the GABA shunt (Xiong et al. 2014) **[standard; Codex found it]**.
5. **The chloroplast's poise.** Its NADP is 99.6% reduced at full sun, with cyclic flow at 0.55 and the Mehler reaction at 0.16 mM/s, and at night it stays 94% reduced while RuBisCO still runs at 0.04 mM/s. Neither cause is diagnosed: linear flow's textbook ATP/NADPH ratio can't explain an operating network, so capacities and sinks need testing first (Codex) **[synthesis]**.
6. **A deletion isn't one switch.** Switching glycogen synthase off doesn't make a glycogen-less cell: phosphorylase runs backward (−0.081 mM/s) and glycogen still climbs, 23.5 → 28.3 mM in 60 s (Codex). Mutants need gene-to-reaction mapping, and the lumped phosphorylase needs a look **[synthesis]**.
7. **Fig. 2 records the instant, not an experiment** (Codex):
   - Its two minutes are wall time: at 30× that is four model seconds, and changing the slowdown changes the apparent kinetics within one trace.
   - Its O₂ is PSII's gross production (0.89 mM/s), not the net exchange an electrode's chamber would show (0.64). In the dark it shows zero while the cell takes up 0.07.
   - The hold's "steady state" checks fluxes only. A cyanobacterial RuBisCO hold reports steady at 264 s while glycogen still climbs 0.085 mM/s (to 327 mM in an hour; RuBP to 15 mM). The coefficient is stable (0.202, 0.203, 0.201 at 264, 900, 3,600 s), but the regime isn't a steady state.
   - Holds take 2 to 7.7 s of worker time, not the documented 1 to 4.
8. **The clock isn't ready for a bench** (Codex, confirmed in the code):
   - `advance` stops after 5,000 steps (about 250 model s a call), so a long call silently falls short.
   - Events run after the step that passes them, up to a step late (40 ms seen).
   - Snapshots drop the held pulses, the event queue and the RNG; they serve the paired baseline, not save and replay.
   - The Jacobian is assembled sparsely but stored and factored dense.
9. **Round 2's window is half built.** The drawn centres sample turnovers. There are no populations of centre states, which Kok needs, and membrane centres read net turnover, not one-way. The halophile has nothing to do in the dark (ATP 0), and its map barely moves in the light.

What holds up is the core. Respiratory control, the Pasteur effect in the animal cell (anoxia: O₂ uptake to zero within a second, glucose uptake 0.10 → 0.39, LDH 0.03 → 0.95), the anaerobe's backward synthase (−0.19 mM/s) and demand's bounded response all emerge (Codex). Two classic protocols already run on today's engine, with generic inhibition:

- **A mitochondrial stress test** (Brand & Nicholls 2011) on the animal cell. Basal O₂ use is 0.226 mM/s. Oligomycin (ATP synthase off) brings it to 0.016, and glycolysis takes over (lactate 0.95 mM/s). The uncoupler stands in for FCCP: at UCP ×1 it raises O₂ use to 0.69, three times basal, and at ×4 lowers it to 0.61, so the highest tested rate isn't necessarily the maximum. Rotenone and antimycin bring it to 0.
- **Anoxia and reoxygenation** (after Chouchani et al. 2014). Two minutes of anoxia run SDH backward, and succinate climbs from 0.008 to 3.0 mM. A fifth of a second after oxygen returns, complex I is running backward (reverse electron transport), SDH races at 4.4 mM/s and Δp overshoots to 207 mV. Superoxide barely rises (57 nM against 41), since complex I's superoxide is written as an NADH-to-oxygen reaction with no tie to the reverse electron transport or the cofactor state. Anoxia in one cell is also narrower than ischemia in a tissue.

## The thesis, round 3

Round 1 found the drawing truer than the model. The model is now a mechanism, not a schedule, but it lives in the instant. Lumen shows *now* well. It can't hold a moment, compare two histories, run long enough for the classic experiments, or say where the carbon went. The next era makes **time, comparison and destinations** tangible (Codex's framing; Claude's reached the first two independently). The flagship's misbehaviour at its first dial is the first thing those tools should be pointed at.

Two principles, proposed with it **[synthesis]**:

- **One model, two observers.** The plate and the instruments read the same model, each through an explicit measurement function, and never each other. The plate samples a small slab, rounds counts and thins turnovers, so an instrument must never count glyphs. The oxygen electrode reads dissolved O₂ in a chamber of stated volume, and consumption is inferred from its time course. 340 nm absorbance sums NADH and NADPH with their absorptivities and path. pH is an activity, through the buffers, and fluorescence needs excitation, yields and a detector. Where the plate can draw what an instrument measures, it should: the O₂ crossing the boundary, the photons PSII sends back out. That's an aspiration for the drawing, not a gate on the bench (Codex's correction of Claude's "instruments read what the plate draws").
- **Run fast, look slow.** The record runs ahead at bench speed: minutes to hours of model time, in a worker. The plate looks at any moment of it, slowed. Scrubbing moves an observation cursor; it never edits the past. Changing a condition at an earlier moment makes an explicit branch beside the recorded future, not a replacement for it. The plate's picture at a past moment is rebuilt by replaying from the nearest checkpoint through the logged events, or is marked as freshly sampled. This resolves the tension between a plate that has to be slowed 30× to be watched and experiments that last minutes.

## North star

Unchanged: *Synechocystis* sp. PCC 6803 turning light and CO₂ into more of itself, drawn molecule by molecule and checkable against the experiments that discovered how it works, with the other specimens as comparative cuts on the shared engine (decision 1). Round 3 sets a nearer star on the way: **a bench where the classic figures can be redrawn, compared and shared**. Every later milestone is easier to check, and more fun to use, once it exists.

## Roadmap

Proposed in round 3, for a9's decision. Milestone 2 was "the bench". Both reads keep the bench next but split it, because bundled it would be another engine rewrite (Codex). The record's core comes first, and the flagship's day and night are diagnosed *on* it, not before it, because the record is what makes that diagnosis inspectable. Preparations come forward from old milestone 3. Each famous experiment becomes its own extension.

**2. Identities** (small; can land any time).
- The TCA bypass in place of α-ketoglutarate dehydrogenase in *Synechocystis*; D-lactate.
- The legend says "biosynthetic demand", as round 2 decided.
- Stale numbers in AGENTS.md and here corrected.

**3. The record** (the bench's core; both reads' first pick).
- The clock: events at exact model times (steps stop at event boundaries); `advance` completes or says it didn't; complete checkpoints (held pulses, events, RNG); long runs in a worker in bounded, cancellable chunks. The slowdown dial runs past life, up to 100× faster, with the plate thinning as it already does. Raising `HMAX` takes convergence and event-resolution checks, not only frame independence.
- Fig. 2 in model time, with observables defined by their measurement functions (net O₂ exchange, gross PSII, Δp and its parts, the pools), and additions marked as arrows at model times.
- One paired control: mark a moment, change one thing, run the unchanged copy beside it, overlay the two traces.
- The hold reports a steady state only when the internal state is stationary, or names what is accumulating.
- CSV export, stamped with the model's version.
- *What you see:* a record in model time with its additions marked, and two outcomes of one cell side by side.

**3b. The record, extended.**
- Scrubbing, with the plate rebuilt at the cursor by replay, and branches as explicit forks.
- **Where the carbon went**: integrated ledgers of carbon and ATP, so fermentation, storage and growth's products read as destinations. It brings the "to the cell" spurs and the biomass ledger round 2 promised.
- Setups in the URL (preset, conditions, protocol, seed, and the pinned model and parameter version), so a link replays a run exactly; the notebook.

**4. The flagship's day and night, diagnosed on the record.**
- Targets first: measured dark respiration, dark survival and fermentation products for *Synechocystis*, each with its conditions (reserves, acclimation, nitrogen). Exhaustion and recovery are allowed; an ATP floor alone doesn't establish viability.
- Then the routes and demands that miss them: where dark carbon and NADH go (the OPPP, Entner–Doudoroff, NNT, NDH-2, LDH), demands that a night can carry, the chloroplast's poise and its RuBisCO at night, and the phosphorylase that runs backward.
- *What you see:* dimming the light and night read as the organism's, with the record and the ledger as evidence.

**5. Preparations and the poison cabinet** (old milestone 3's preparations, brought forward).
- One named preparation and one complete assay first: isolated mitochondria (the animal cell's matrix with the cytosol replaced by a cuvette of stated volume), substrates and ADP as additions, the oxygen electrode as a chamber model. Chance & Williams' states 3 and 4, the respiratory control ratio and the P/O ratio, measured as they were. Then the stress test on intact cells.
- Named poisons with their mechanism, drawn bound at their sites in the zoom layer: cyanide at a₃, rotenone at complex I's Q site, antimycin at Qᵢ, oligomycin in F₀, DCMU at Q_B; FCCP and DNP as protonophores that carry protons across the bilayer, not a generic leak. A generic activity cut stays labelled "inhibition".
- A candidate extension: superoxide tied to reverse electron transport and complex I's cofactor state, tested against reoxygenation observations.
- *What you see:* the classic O₂-electrode figure redrawn from the model, with its arrows where the additions went and the poisons in their pockets.

**6. The flagship made whole.**
- The CCM. Bicarbonate transporters, and the CO₂-uptake NDH-1 complexes (NDH-1₃ and NDH-1₄: Ohkawa et al. 2000), which share a core with the respiratory NDH-1 but are separate complexes, so they're drawn and modelled on their own, not added to `NDH1F`. Then the carboxysome: carbonic anhydrase and RuBisCO behind a protein shell. The shell is much larger than the window's 16.5 × 20 nm slab, so the cut shows part of it, by choice of where the cut falls **[standard; the drawing is synthesis]**.
- Photorespiration, which matters most where the CCM fails, and is the reason the O₂ dial means something to a plant.
- Carbon and nitrogen allocation made explicit: α-KG's production and its consumption (GS–GOGAT *spends* 2-oxoglutarate) qualified separately, with nitrogen moved out of the biomass row's folded costs, not charged twice (Forchhammer & Selim 2020; Codex).
- *What you see:* part of a carboxysome under the thylakoid, and growth that meets its dial or shows which precursor holds it back.

**7. Light's instruments.** Each is its own extension, and none needs the others.
- PSII's centre states: Q_A open or closed, the Mn cluster's S-states as populations.
- Chlorophyll fluorescence, drawn as photons PSII sends back out; Kautsky's induction and PAM's saturating pulses (Schreiber et al. 1986).
- Kok's flashes.
- Light with colour: the phycobilisome's orange, chlorophyll's red and far-red; Emerson's enhancement.
- Photoprotection: the orange carotenoid protein, photoactivated, docking on the phycobilisome and released by FRP (Kirilovsky & Kerfeld 2016); state transitions.
- **A day**: light as a function of time, glycogen by day and night, then a cloud passing.

**8. Transport anatomy and named cells.** Fare zones and out-of-station interchanges (ANT, the phosphate carrier, MPC, the malate–aspartate shuttle, the triose-phosphate translocator). Isolated thylakoids and the Racker–Stoeckenius vesicle as preparations. The halophile's night, on arginine it is given (Hartmann et al. 1980), with its products accounted for. Named animal cells where a story needs one.

**9. Growth.** Enzyme allocation, a cell that grows, and division, in *Synechocystis* first; on the bench, a culture's optical density.

A whole cell predicted from its genome is still a research programme with large parameter uncertainty (Codex, round 1). A disciplined central-metabolism model with an honest bench is achievable, and Lumen becomes exceptional well before the far edge.

### The experiments

The classic figures, as setups a visitor can run and as regression tests that hold the model honest. Each lands with the milestone that gives it its parts.

| Experiment | What the model must reproduce | Needs |
|---|---|---|
| A mitochondrial stress test (Brand & Nicholls 2011; Divakaruni et al. 2014) | oligomycin → FCCP → rotenone + antimycin, read as basal, ATP-linked, the highest tested and spare respiration | runs today with generic inhibition; 3 for the record, 5 for named poisons |
| Chance & Williams' oxygen-electrode trace (1955) | adding ADP speeds O₂ uptake (state 3); running out of it slows it (state 4); an uncoupler releases it; cyanide stops it | 5: isolated mitochondria |
| Anoxia and reoxygenation (after Chouchani et al. 2014) | succinate accumulates in anoxia; reoxygenation drives reverse electron transport at complex I, and a superoxide burst | half runs today; 5 for a tested RET superoxide |
| The dim-light paradox [synthesis] | gross fixation rises while net CO₂ uptake falls, as the cell refixes its own CO₂ | runs today; 3b for the ledger; 6 for the CCM comparison |
| Jagendorf's acid bath (Jagendorf & Uribe 1966) | thylakoids at pH 4, moved to pH 8 with ADP, make ATP in the dark | 8: isolated thylakoids |
| Racker & Stoeckenius' vesicle (1974) | bacteriorhodopsin and an ATP synthase in a vesicle make ATP in light | 8: a restricted preparation |
| Kautsky's induction (Kautsky & Hirsch 1931) | fluorescence rises, peaks and quenches as the chain fills and the Calvin cycle starts | 7: centre states, fluorescence |
| Kok's flashes (Joliot et al. 1969; Kok et al. 1970) | O₂ per flash oscillates with period four and peaks on the third flash, damped by misses and double hits | 7: S-states |
| Emerson's enhancement (Emerson et al. 1957) | far-red alone does little, red alone some, both more than the sum | 7: light with colour |
| Hill's reaction (1937); Ruben et al. (1941) | isolated thylakoids evolve O₂ with an artificial acceptor; the O₂ comes from water | 7–8 |
| A glycogen-less mutant (Gründel et al. 2012) | ΔglgC lacks glycogen, copes badly with stress and overflows, depending on its nutrients | 4 for the night; gene-to-reaction mapping (finding 6) |
| Calvin's pulse (Bassham, Benson & Calvin) | label appears in 3-PGA first | a labelled-carbon engine |
| Peters' lethal synthesis (1952) | fluoroacetate becomes fluorocitrate and stops aconitase | 5 |
| Warburg (1956) | aerobic glycolysis in a proliferating cell | 8: a named cell |

## Creative designs

Ranked roughly by delight per unit of work, each with what it needs from the engine. The first two are milestones 3 and 3b.

1. **Two histories of one cell** (Codex; Claude's "run fast, look slow" is the same idea). Pin a moment, change one condition, and watch the outcomes diverge on paired traces; switch the plate between them at any moment. Needs complete checkpoints and an event log.
2. **Where the carbon went** (Codex). A patterned ribbon (pattern before hue) splits imported carbon into respiratory loss, storage, products and what went "to the cell". No atom-path claim is needed: element ledgers suffice.
3. **The poison cabinet, drawn bound** (both rounds). Each inhibitor a small Goodsell molecule in its pocket at the zoom layer, the chain stopping behind it. DNP's history (a 1930s diet pill) belongs in the about panel, not on the plate.
4. **Every observable drawn** (Claude, narrowed by Codex). Where an instrument's quantity can be drawn, the plate draws it: the photons PSII re-emits leaving it, the O₂ crossing the boundary. The instrument still reads the model, never the glyphs.
5. **Metabolic fingerprints** (Codex). Save an intervention's response as a small trace specimen; compare an unknown perturbation against your own collection, with an optional reveal and no lesson sequence. Round 1's "diagnose an unknown", made a collection.
6. **The notebook** (Claude). Fig. 1 is the plate and Fig. 2 the live record; each finished run pins as Fig. 3, Fig. 4, …, small multiples you can overlay (a paired control is two figures overlaid) and share by URL. The figure-and-caption register already in place, extended to a session.
7. **Same Δp, different consequences** (Codex). Trade Δψ for ΔpH with nigericin or valinomycin and watch ATP export and the carriers respond differently at the same total. The engine has it; it needs the additions and the transporters' connections drawn.
8. **The smallest working membrane** (both rounds). Custom becomes a kit: complexes knocked out at the complex level and drawn absent. Bacteriorhodopsin and ATP synthase alone is Racker–Stoeckenius; "NADPH without PSII?" the first instructive failure.
9. **Reoxygenation** (Claude). The engine already accumulates succinate in anoxia and runs complex I backward when oxygen returns. A candidate extension, superoxide tied to reverse electron transport, would be tested against reoxygenation observations (Chouchani et al. 2014).
10. **Mutants as specimens** (Claude). ΔglgC, Δpgr5, ΔndhD1/D2 as persistent deletions. Not one switch each: the glycogen case shows a deletion needs gene-to-reaction mapping and the right reversibility (finding 6), and its phenotype depends on the nutrients and the cell's history.
11. **A cloud passing, then a day** (both). Replay one fluctuating light history with different reserves and watch glycogen buy time; then the sun's arc and KaiABC's rhythm **[the clock is speculative here]**.
12. **Label, chase, recover** (both; Codex's first pick in round 1). Patterned carbon through the map and a chromatogram on the bench. Needs validated atom mappings and isotopomer dynamics: a major, distinctive direction, not a particle effect.
13. **A whole cell in the locator** **[speculative]**. The locator grows into a Goodsell whole-cell cross-section (thylakoid stacks, carboxysomes, glycogen granules, ribosomes) that elongates and divides with the growth milestone.
14. **Listening to the membrane** **[speculative]**. One click per drawn turnover of a chosen complex, so a quantity in the model can be heard. It would help low-vision visitors; it is decoration unless it reads a quantity.

Round 1's "zoom is time" stays speculative: the slowdown dial's four decades (300× slower to 100× faster) cover most of what it wanted.

## Risks

- **Scope creep in the model.** Every milestone tempts a new pathway. A pathway enters with the experiment or the misteaching that needs it, not for completeness (Codex).
- **The legend's density.** At 280–320 px it already holds conditions, the enzyme card and Fig. 2. The record wants room: an expandable, full-width recording area under the plate, rather than more permanent rows in the legend (Codex). On phones, compare traces together and switch the plate between histories; two plates at once would bury the experiment.
- **Throughput.** A model day is about four minutes of one core for one trajectory, before new mechanisms. The dense LU will cost more than the reaction count suggests as the network grows. Profile before rewriting the solver (Codex).
- **Calibration.** "% sun" multiplies illustrative capacities. Light-response curves and named poisons invite quantitative comparison, so their parameters need sources, or a visible "illustrative".

## What it outright lacks

Round 1's list, less what was built:

- **What metabolism is for**: motility on Δp, ion pumping, and biosynthesis that becomes amino acids, nucleotides, lipids and enzymes. The ATP demand dial stands in for all of it.
- **Compartments and transport** as anatomy: the carriers exist chemically but aren't drawn, and NADH crosses no membrane in the cells without one.
- **A real environment**: CO₂ as a condition, spectrum, buffered or finite nutrients beyond feeding.
- **Pathways**: photorespiration, the CCM, nitrogen assimilation, the glyoxylate shunt, real fatty-acid synthesis on ACP, photoprotection, the halophile's arginine fermentation.
- **Experimental memory**: replay, saved setups, paired controls, export, and provenance on every displayed quantity.

## Prior art and data

- **Whole cells.**
  - Karr et al. 2012, *Cell*, 10.1016/j.cell.2012.05.044: whole-cell *M. genitalium*.
  - Thornburg et al. 2022, *Cell*, 10.1016/j.cell.2021.12.025: a living minimal cell.
  - Thornburg et al. 2026, *Cell*, 10.1016/j.cell.2026.04.003: the minimal cell in 4D.
  - Breuer et al. 2019, *eLife*, 10.7554/eLife.36842: syn3A's metabolism.
- **Organelle scale.** Singharoy et al. 2019, *Cell*, 10.1016/j.cell.2019.10.021: a purple bacterium's chromatophore, from atoms to ATP output.
- **Goodsell's whole-cell work.**
  - cellPACK: Johnson et al. 2014, *Nat Methods*, 10.1038/nmeth.3204.
  - Maritan et al. 2022, *J Mol Biol*, 10.1016/j.jmb.2021.167351.
  - Goodsell 2009, *BAMBEd*, 10.1002/bmb.20345 (*E. coli*).
- **Network and parameters.**
  - Nogales et al. 2012, *PNAS*, 10.1073/pnas.1117907109.
  - BiGG: King et al. 2015, *NAR*, 10.1093/nar/gkv1049.
  - eQuilibrator: 10.1093/nar/gkr874 and 10.1093/nar/gkab1106.
  - Park et al. 2016, *Nat Chem Biol*, 10.1038/nchembio.2077.
  - Bennett et al. 2009, *Nat Chem Biol*, 10.1038/nchembio.186.
  - Ito, Watanabe & Osanai 2023, *Plant Physiol*, 10.1093/plphys/kiad580: *Synechocystis*'s high NADP⁺/NAD⁺ ratio.
  - von Berlepsch et al. 2012, *Plant Physiol*, 10.1104/pp.112.195263: cyanobacteria appear to lack β-oxidation.
  - Akiyama & Osanai 2024, *Front Microbiol*, 10.3389/fmicb.2023.1332449: *Synechocystis*'s dark anoxic products, D-lactate among them.
  - Todor et al. 2015, *PLOS ONE*, 10.1371/journal.pone.0135693: *Halobacterium salinarum* can't catabolize glucose to pyruvate.
  - Zhang & Bryant 2011, *Science*, 10.1126/science.1210858: the cyanobacterial TCA cycle's bypass.
  - Xiong et al. 2014, *Mol Microbiol*, 10.1111/mmi.12699: the GABA shunt closes the cycle in *Synechocystis*.
  - Chen et al. 2016, *PNAS*, 10.1073/pnas.1521916113: the Entner–Doudoroff route in cyanobacteria and plants.
  - Gründel et al. 2012, *Microbiology*, 10.1099/mic.0.062950-0: a glycogen-less *Synechocystis* overflows.
  - Forchhammer & Selim 2020, *FEMS Microbiol Rev*, 10.1093/femsre/fuz025: carbon/nitrogen homeostasis in cyanobacteria.
  - Hartmann, Sickinger & Oesterhelt 1980, *PNAS*, 10.1073/pnas.77.7.3821: the halophile grows anaerobically on arginine.
  - SABIO-RK; Escher, for data-rich metabolic maps; VCell, for separating model, geometry and solver (Codex).
- **Kinetics.**
  - Kacser & Burns 1973, *Symp Soc Exp Biol* 27: "The control of flux", reprinted with a commentary in 1995, *Biochem Soc Trans*, 10.1042/bst0230341.
  - Heinrich & Rapoport 1974, *Eur J Biochem*, 10.1111/j.1432-1033.1974.tb03318.x.
  - Noor et al. 2013, *FEBS Lett*, 10.1016/j.febslet.2013.07.028.
  - Liebermeister et al. 2010, *Bioinformatics*, 10.1093/bioinformatics/btq141.
  - Gillespie 1977, *J Phys Chem*, 10.1021/j100540a008.
  - Flamholz et al. 2013, *PNAS*, 10.1073/pnas.1215283110: why cells pick a glycolytic route.
- **Bioenergetics and photosynthesis.**
  - Mitchell 1961, *Nature*, 10.1038/191144a0.
  - Watt et al. 2010, *PNAS*, 10.1073/pnas.1011099107.
  - Schuller et al. 2019, *Science*, 10.1126/science.aau3613.
  - Ohkawa, Pakrasi & Ogawa 2000, *J Biol Chem*, 10.1074/jbc.M003706200: *Synechocystis*'s functionally distinct NDH-1 complexes, CO₂ uptake among them.
  - Price et al. 2008, *J Exp Bot*, 10.1093/jxb/erm112: the cyanobacterial CCM.
  - Kirilovsky & Kerfeld 2016, *Nat Plants*, 10.1038/nplants.2016.180: photoprotection by the orange carotenoid protein.
  - Kramer et al. 2004, *Trends Plant Sci*, 10.1016/j.tplants.2004.05.001.
  - Moser et al. 1992, *Nature*, 10.1038/355796a0.
  - Lane & Martin 2012, *Cell*, 10.1016/j.cell.2012.11.050.
  - Nakajima et al. 2005, *Science*, 10.1126/science.1108451.
- **Experiments.**
  - Chance & Williams 1955, *JBC* 217: part I, the kinetics of oxygen utilization in rat and guinea-pig liver mitochondria, 10.1016/s0021-9258(19)57189-7; part II, difference spectra, 10.1016/s0021-9258(19)57190-3.
  - Chouchani et al. 2014, *Nature*, 10.1038/nature13909: succinate accumulated in ischaemia drives reperfusion injury through mitochondrial ROS.
  - Jagendorf & Uribe 1966, *PNAS*, 10.1073/pnas.55.1.170.
  - Racker & Stoeckenius 1974, *JBC*, 10.1016/s0021-9258(19)43080-9.
  - Joliot et al. 1969, *Photochem Photobiol*, 10.1111/j.1751-1097.1969.tb05696.x.
  - Kok et al. 1970, *Photochem Photobiol*, 10.1111/j.1751-1097.1970.tb06017.x.
  - Emerson et al. 1957, *PNAS*, 10.1073/pnas.43.1.133.
  - Hill 1937, *Nature*, 10.1038/139881a0.
  - Ruben et al. 1941, *JACS*, 10.1021/ja01848a512.
  - Kautsky & Hirsch 1931, *Naturwissenschaften*, 10.1007/bf01516164.
  - Schreiber, Schliwa & Bilger 1986, *Photosynth Res*, 10.1007/bf00024185: continuous recording of photochemical and non-photochemical quenching.
  - Peters 1952, *Proc R Soc B*, 10.1098/rspb.1952.0001.
  - Warburg 1956, *Science*, 10.1126/science.123.3191.309.
  - Brand & Nicholls 2011, *Biochem J*, 10.1042/bj20110162.
  - Divakaruni et al. 2014, *Methods Enzymol*, 10.1016/b978-0-12-801415-8.00016-3.
- **Pedagogy.** PhET's inquiry design: predict, manipulate, explain, around one carefully chosen experiment (Codex, round 1).

## Decisions

Round 1, a9, 2026-10-24.

1. **North star: approved.** *Synechocystis* building itself, on a bench, with the other specimens as comparative cuts on a shared engine.
2. **Truth beats tidiness.** True relative counts and a stated slow-motion factor, so that every number on the plate is defensible. Counts follow each specimen's organism (round 2).
3. **Named cells.** The name decides the chemistry. Answered in round 2 by decision 11.
4. **Mostly a sandbox.** The bench's experiments are things a visitor can set up, not a guided course; puzzles, if any, stay light.
5. **Milestone 0 first** (built).

Round 2, a9, 2026-10-25. Codex's read came after a9's decisions and refined them.

6. **The verb changes**: a click pulses an enzyme's capacity, a hold sustains a small perturbation against a paired baseline, and where a push dies is observed, not scripted (built).
7. **Engine first, then the bench** (built: the engine).
8. **Biosynthetic demand moves into the engine,** not growth: precursors leave the map on terminal spurs, with an ATP-demand dial and a growth dial. The dials are built; the spurs and the ledger aren't, and the legend says "growing" (round 3, finding 3).
9. **The window onto the cell** at true proportions, the stated slowdown, one model clock (built, except centre-state populations).
10. **Energetics belongs to the engine** (built).
11. **Named preparations**: the specimens are named for the preparations the canonical experiments used; *Synechocystis* is the one intact cell.
12. **Oxygen's rule and minimal compartments** as Codex amended them (built).

Round 3, 2026-10-27: open, for a9.

13. **The thesis.** Time, comparison and destinations as the next era, with its two principles: one model, two observers; run fast, look slow.
14. **The order.** Identities, then the record's core, then the flagship's day and night diagnosed on it (Codex's order, recommended); or the flagship's night repaired first, before any record (Claude's first draft)?
15. **Where the record lives.** An expandable full-width area under the plate (recommended), Fig. 2 growing inside the legend, or a permanent panel c?
16. **The clock.** One clock whose dial runs past life, with a scrubbed cursor rebuilding the plate by replay (recommended); or a separate bench run beside a live plate?
17. **The flagship made whole** (the CCM, the carboxysome, carbon and nitrogen) before or after light's instruments?
18. **Which creative designs** to carry into milestones, and which to drop.
