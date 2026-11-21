# Lumen: where it could go

Three ideation rounds so far. Round 1 (2026-10-24) found the model's faults and set the north star. Round 2 (2026-10-25) designed the engine. Round 3 (2026-10-27) audited what was built and proposed a record-centred bench; a9 declined the record the same day and returned the cells to archetypes, and the roadmap below is the one decided. All three rounds' decisions are at the end. Each round had two independent reads, Claude's and Codex's (briefed without Claude's ideas), and Codex reviewed each build adversarially. Every reference below was checked against Crossref on the day it was added. Tags: **[standard]** is textbook or published science, **[synthesis]** is our combination of it, **[speculative]** is a bet.

AGENTS.md describes the model as built and its known approximations. Git history keeps the rounds' full findings and probe numbers, the build notes, and the visual passes' proposals.

## Where it stands

- **Built.** Milestones 0 (respiratory control, the conservation leaks), 0.5 (the presets' biology) and 1 (the engine: six cells of balanced, BiGG-identified reactions, eQuilibrator's ΔG'°, separable rates, Δψ and ΔpH, per-cell c-rings, ROS and damage with consequence, integrated by ROS2), then three visual passes (the plate; the pools as molecules and Goodsell closer; the legend, Fig. 2, the phone folio and continuous motion) and polish rounds.
- **Milestone 2, in part (2026-10-27).** The clock: one dial from 300× slower to 1,000× faster; steps up to 60 s where the error allows, the picture interpolated between them, and the chemistry kept on the main thread (steady states run at tens of thousands of model seconds a second). The night: each archetype meets its night's targets, every cause found by ablation before anything changed (glycogen's equilibrium, ferredoxin's partners, storage regulated as a store, the pathways running at night that shouldn't, the night's budget, AtpΘ as a brake, dim light's switches).
- **Milestone 3, in part (2026-10-27, brought into the day at a9's request).** Carbon and nitrogen allocation: growth takes the day's carbon and the store fills with the surplus (ammonium through GS–GOGAT, the biomass row's nitrogen and lipid made explicit, growth's own regulation, pyruvate kinase keyed on RuBP by a9's choice among three cures, separate light switches for dusk). The citrate route, so the animal cell makes its own fatty acid.
- **What a visitor can do.** Pick a specimen; set light, O₂, ATP demand, growth or export, the uncoupler and the clock; knock out lines; feed the medium; pulse, inhibit or hold any enzyme and read its rate as a budget; watch Fig. 2 (the last two minutes, in the cell's time) or the live Z-scheme.

## The thesis, as decided

Round 3 proposed time, comparison and destinations, with a record at their centre: model-time traces, checkpoints, paired controls and provenance, so the classic experiments could be run and shared. a9 declined the record (decision 13). Lumen is a live, spontaneous model of a form of life: a causal, observational sandbox, where you change something and watch the organism answer. Its rigour is in the chemistry, not in bookkeeping about the chemistry. Three principles follow:

- **Watch it happen.** Everything happens live, on the plate, while you watch. There's no record to replay and no control run beside an environmental change: the light, the oxygen and the day are the organism's life, not treatments. A poison is the one exception. It is a treatment, so a ghost of the unpoisoned cell may run beside it (a9).
- **Archetypes, not species.** Each cell is an abstract model of a form of life, "a cyanobacterium" or "an animal cell", as the earliest Lumen had it (a9). The rule for what enters is a9's (decision 16): behaviour that adds to the textbook reading without complicating it is added freely, as when a cyanobacterium respires its glycogen at night and concentrates CO₂ by day. Identity detail that only complicates the reading is left out: the cyanobacterium keeps the textbook Krebs ring, and its lactate stays L. Parameters measured in a representative species (*Synechocystis*'s c-ring and pools, *Halobacterium*'s potentials) serve the archetype.
- **The clock spans the cell's own time.** It runs from 300× slower, where turnovers are visible, to a thousand or more times faster, where a day or a doubling fits in a few minutes. The plate already thins its turnovers as the clock speeds up, and at 1,000× Fig. 2's two minutes of wall time hold more than a day (Claude's; confirmed in decision 16).

## North star

Reframed by decision 14: **a cyanobacterium living through its day**, turning light and CO₂ into more of itself, drawn molecule by molecule and live, with the other archetypes as comparative cuts on the shared engine. It is no longer a named strain on a bench. The classic behaviours stay as headless tests that hold the model honest, but they aren't setups for a visitor.

## Roadmap

As decided in round 3 (decisions 13–17): three milestones, the day and night, the flagship made whole, then growth. Poisons are a side track: instructive, but not the main line.

**2. Day and night**, with the clock it needs. The clock and the night are built (above). What remains is the day:
- The day itself: light as a function of time (the sun's arc, then a cloud passing), glycogen and starch filling and draining, photoprotection at noon (the orange carotenoid protein on the cyanobacterium's phycobilisome; NPQ on the chloroplast's lumen pH), and fluorescence drawn as photons leaving PSII. The theme's "follows sunlight" already points here.
- *What you see:* turn the dial past 1× and watch a day: the morning's ATP and Δp rising, the noon's quenching, glycogen swelling in the map's station, the night's respiration on it, and a cell that is still alive at dawn.

**3. The flagship made whole**, with transport. Carbon and nitrogen allocation and the citrate route are built (above).
- The CCM. Bicarbonate transporters, and the CO₂-uptake NDH-1 complexes (NDH-1₃ and NDH-1₄: Ohkawa et al. 2000), which share a core with the respiratory NDH-1 but are separate complexes, drawn and modelled on their own. Then the carboxysome: carbonic anhydrase and RuBisCO behind a protein shell, much larger than the window, so the cut shows part of it **[standard; the drawing is synthesis]**.
- Photorespiration, which matters where the CCM fails and is why the O₂ dial means something to a plant.
- Transport as anatomy: fare zones and out-of-station interchanges on the map for ANT (exporting ATP spends Δψ), the phosphate carrier, MPC, the malate–aspartate shuttle and the chloroplast's triose-phosphate translocator, with the carboxysome's shell and the CCM's transporters as the cyanobacterium's own boundaries. NADH stops crossing membranes for free.
- *What you see:* part of a carboxysome under the thylakoid, CO₂ no longer drawn down to 2 µM at full sun, carriers as interchanges with their costs, and a growth dial the cell can meet.

**4. Growth.** Biosynthesis that accumulates: the "to the cell" spurs round 2 promised, a live budget of where the carbon is going, allocation between the cell's demands, and a cell that grows and divides (in the cyanobacterium first). The locator could become the whole cell that does it.

**Side track: poisons** (any time; secondary). Named poisons with their mechanisms, drawn bound at their sites in the zoom layer: cyanide at a₃, rotenone at complex I's Q site, antimycin at Qᵢ, oligomycin in F₀, DCMU at Q_B, and FCCP or DNP carrying protons across the bilayer. The ionophores nigericin and valinomycin split Δp's parts. Each has a ghost of the unpoisoned cell on Fig. 2, the one paired control. Superoxide tied to reverse electron transport would complete the reoxygenation story (Chouchani et al. 2014), tested against its observations.

A whole cell predicted from its genome is still a research programme (Codex, round 1). A live, honest model of how a form of life runs its day is achievable, and is the point.

### Open questions

Left by the builds and round 3:

- **The branch point.** Pyruvate kinase keyed on RuBP stands for PirC and PII at the Calvin cycle's branch point (Orthwein et al. 2021), which read carbon and nitrogen, not RuBP; below about a fifth of full sun it starves growth, and a lower threshold brings back the relaxation oscillation it was keyed to stop. The branch point needs regulation that reads the cycle's surplus or the cell's carbon and nitrogen, and the light switch should read ferredoxin's supply rather than the light, with the day's photoprotection. FBPase's AMP brake stands in for an energy homeostat.
- **The store** still gains about 850 mM of glucosyl units a day with nothing to dilute it. Growth that enlarges the cell (4) or a store that feeds back on photosynthesis would bound it.
- **The dim-light refixation [synthesis].** Dimming briefly *raises* gross fixation while net uptake falls, as internal CO₂ climbs. Whether the missing CCM causes it takes an ablation-and-rescue comparison once a CCM exists.
- **The chloroplast's poise.** Round 3 found its NADP 99.6% reduced at full sun, undiagnosed. Linear flow's textbook ATP/NADPH ratio can't explain an operating network, so test capacities and sinks first (Codex).
- **A deletion isn't one switch.** Mutants need gene-to-reaction mapping, not a line's knockout.
- **What Fig. 2 reads.** Its O₂ is PSII's gross production, not the net exchange an electrode shows, and the hold's steady state checks fluxes only.
- **The window.** There are no populations of centre states (Kok's flashes would need them), and membrane centres read net turnover, not one-way. The halophile has nothing to run on in the dark.

### Behaviours the archetypes should show

The classic behaviours, kept as headless tests rather than visitor setups. Each lands with the milestone that gives it its parts.

| Behaviour | What the model must do | When |
|---|---|---|
| Respiratory control | ADP or demand speeds O₂ use; its lack slows it; an uncoupler releases it | built |
| The Pasteur effect | anoxia speeds glycolysis and fermentation in the animal cell | built |
| A stress test (Brand & Nicholls 2011) | oligomycin, an uncoupler, then rotenone and antimycin read as basal, ATP-linked, leak, highest and residual respiration | runs today with generic cuts; named poisons on the side track |
| The night | the cyanobacterium respires glycogen, survives until dawn, ferments only in anoxia | built (tests) |
| The day | storage fills by day and drains by night; noon's excess light is quenched | storage built (tests); quenching 2 |
| The dim-light refixation [synthesis] | with no CCM, gross fixation rises while net CO₂ uptake falls when light dims | runs today; 3 changes it |
| Carbon concentration | with a CCM, internal CO₂ stays high at full sun | 3 |
| Reoxygenation (after Chouchani et al. 2014) | succinate accumulates in anoxia, and reoxygenation reverses complex I | half runs today; RET superoxide on the side track |
| Growth | the cell meets a growth demand it can afford, and its carbon accumulates somewhere | the demand met (tests); accumulation 4 |

Set aside with the bench: Chance & Williams on isolated mitochondria, Jagendorf's acid bath, Racker & Stoeckenius' vesicle, Kok's flashes, Emerson's enhancement, Hill's reaction and Calvin's pulse. Each needs a preparation, an instrument or an isotope rather than a live organism. They stay in the references in case a later round wants them.

## Creative designs

Re-ranked for a live sandbox, by delight per unit of work, each with the milestone that carries it.

1. **A day** (2). The sun crosses; Δp, ATP and NADPH rise with it; glycogen swells in its station and drains overnight; the plate's photons thin to nothing and come back.
2. **A cloud passing** (2). A dip in the light that the cell rides out on its reserves, with photoprotection relaxing and re-engaging.
3. **Every observable drawn** (2). Photons leaving PSII as fluorescence, more of them while its centres are closed; O₂ crossing the boundary.
4. **The carboxysome's edge** (3). Part of the shell in the cut, RuBisCO packed behind it, bicarbonate arriving.
5. **Where the carbon went, live** (4). A rolling budget in the legend and spurs on the map: respired, stored, fermented, gone "to the cell". It's a readout of now, not a ledger of a run.
6. **A whole cell in the locator** **[speculative]** (4). The locator becomes a Goodsell whole-cell section (thylakoids, carboxysomes, glycogen granules, ribosomes) that elongates and divides.
7. **Fare zones** (3). Carriers as out-of-station interchanges, and NADH paying to cross.
8. **The poison cabinet, drawn bound** (side track). Each inhibitor a small molecule in its pocket at the zoom layer, the chain stopping behind it, and a ghost of the unpoisoned cell on Fig. 2.
9. **Same Δp, different consequences** (side track). Nigericin or valinomycin trade Δψ for ΔpH; ATP export and the carriers part ways at the same total.
10. **The smallest working membrane** (optional). Custom as a kit: complexes knocked out at the complex level and drawn absent. Bacteriorhodopsin and ATP synthase alone make ATP in light.
11. **Label, chase** **[later]**. Patterned carbon through the map. It needs validated atom mappings: a major direction of its own.
12. **Listening to the membrane** **[speculative]**. One click per drawn turnover of a chosen complex, so a quantity can be heard.

Dropped with the record: two histories of one cell, the notebook, metabolic fingerprints, URL replay. Mutants are knockouts the sandbox already has.

## Risks

- **Scope creep in the model.** A pathway enters when a behaviour that defines the archetype needs it, not for completeness. Archetypes make this easier to hold.
- **Throughput.** Since the clock's build a day at 1,000× runs on the main thread, but the CCM, photorespiration and transport add rows and stiffness. Profile before rewriting the dense solver (Codex).
- **Calibration.** "% sun" multiplies illustrative capacities. That's fine for an archetype's day, but the light curve's shape (where the cell saturates) should be plausible for the form of life.
- **The legend's density.** A day condition and growth's readouts need room in a 280–320 px column, and they still show rather than tell.

## What it outright lacks

Round 1's list, less what was built and what round 3 set aside:

- **What metabolism is for**: motility on Δp, ion pumping, and biosynthesis that becomes amino acids, nucleotides, lipids and enzymes. The ATP demand dial stands in for all of it.
- **Compartments and transport** as anatomy: the carriers exist chemically but aren't drawn, and NADH crosses no membrane in the cells without one.
- **A real environment**: CO₂ as a condition, light that changes through a day, buffered or finite nutrients beyond feeding.
- **Pathways**: photorespiration, the CCM, the glyoxylate shunt, real fatty-acid synthesis on ACP, photoprotection, the halophile's arginine fermentation (Hartmann et al. 1980), which would give it a night.

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

1. **North star: approved.** *Synechocystis* building itself, on a bench, with the other specimens as comparative cuts on a shared engine. Reframed by 14: a cyanobacterium living through its day.
2. **Truth beats tidiness.** True relative counts and a stated slow-motion factor, so that every number on the plate is defensible. Counts follow each specimen's organism (round 2).
3. **Named cells.** The name decides the chemistry. Answered in round 2 by decision 11; reversed by 14.
4. **Mostly a sandbox.** The bench's experiments are things a visitor can set up, not a guided course; puzzles, if any, stay light.
5. **Milestone 0 first** (built).

Round 2, a9, 2026-10-25. Codex's read came after a9's decisions and refined them.

6. **The verb changes**: a click pulses an enzyme's capacity, a hold sustains a small perturbation against a paired baseline, and where a push dies is observed, not scripted (built).
7. **Engine first, then the bench** (built: the engine).
8. **Biosynthetic demand moves into the engine,** not growth: precursors leave the map on terminal spurs, with an ATP-demand dial and a growth dial. The dials are built; the spurs and the ledger aren't, and the legend says "growing" (round 3, finding 3).
9. **The window onto the cell** at true proportions, the stated slowdown, one model clock (built, except centre-state populations).
10. **Energetics belongs to the engine** (built).
11. **Named preparations**: the specimens are named for the preparations the canonical experiments used; *Synechocystis* is the one intact cell. Reversed by 14: the cells are archetypes.
12. **Oxygen's rule and minimal compartments** as Codex amended them (built).

Round 3, a9, 2026-10-27, on the proposal page (https://claude.ai/artifact/7dmxwN742JP8d7S6Ubhda8).

13. **The record: declined.** Strict provenance, checkpoints and record artifacts distract from what Lumen is: a live, spontaneous model of an organism, a causal and observational sandbox. Environmental changes get no control run beside them; only poisons do.
14. **Identities: not needed; archetypes return.** The inaccuracies are a toy model's simplifications. The cells go back to being abstract models of a form of life, not species or instances, as the earlier Lumen had them. This reverses decisions 3 and 11 (named cells and named preparations) and reframes 1: the north star is a cyanobacterium living through its day, not *Synechocystis* PCC 6803 on a bench.
15. **The focus.** The day-and-night diagnosis, the flagship made whole, transport, and then growth. Poisons stay as an instructive tool, not the main focus.
16. **Claude's follow-ons: confirmed.** The clock runs past life, as the day's prerequisite. Light's bench experiments (Kok, Emerson, Kautsky) are set aside, and fluorescence and photoprotection stay for the day. On archetypes, a9 refined Claude's line between identity and behaviour: behaviour that adds to the textbook reading without complicating it is added freely (glycogen respiration, CO₂ concentration); identity detail that only complicates it stays out.
17. **Three milestones.** The clock folds into the day-and-night build (2), and transport into the flagship made whole (3); growth is 4.
