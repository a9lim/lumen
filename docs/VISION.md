# Lumen: where it could go

Ideation round 1, 2026-10-24, against `c09cca0`. a9's decisions on it are recorded at the end; the rest of the plan is direction, not a contract. Two independent reads went into it: Claude's (playing every preset, 30-second state probes, reading the engine) and Codex's (gaslamp job `cx-20261024-213046-93d2`, briefed without Claude's ideas, which reproduced two conservation faults in isolation). Where the two agree, that is noted. Every reference below was checked against Crossref on the day. Tags: **[standard]** is textbook or published science, **[synthesis]** is our combination of it, **[speculative]** is a bet.

## The thesis

The drawing is now truer than the model. The plate promises that every moving thing reads a quantity in the model, and it keeps that promise. But the quantities come from a round-robin schedule (`autoplay.js:56-87`), step-function gates (`regulation.js`) and a light switch that picks directions, not from chemistry. Most of what a visitor sees is choreography: designed, not emergent.

So the next era has two halves. Both reads reached them independently:

1. **Make the model as honest as the drawing.** A declarative reaction network with its own clock, conservation that can't be broken, and directions set by thermodynamics.
2. **Give the cell a reason to metabolize.** Today ATP disappears into a fixed drain. A cell metabolizes to do work, to stay intact and to build more of itself.

The visual register stays. Nothing below needs it reinvented. Most of it is the register finally having something true to read.

## What it is strong at, and how to push each strength

**Coupling made visible.** ATP and reducing power are usually arrows between two separate textbook diagrams. Here they are molecules that dock at a membrane complex and thread down to a map enzyme. This can teach *coupling* better than any pathway animation. *Further:* every connection should answer a question. Where did this carbon come from? What is limiting this enzyme? Why did oxygen uptake change? What was that ATP spent on? (both reads)

**Conservation made physical.** Closed pools drawn as one molecule per unit is rare and good. *Further:*
- **True relative counts.** The 120 drawn ATP are already about the true count. At 3 mM, a slab of the drawn stroma band about 20 nm deep holds ≈110 ATP. The band measures 188 × 16.5 nm in the 1440 px layout. The slab's depth is a free choice. Fix it once so that ATP is true, and let every other pool follow. NADP(H) would then be a handful of molecules and free FAD almost none, which is itself the lesson. The band's width in nm changes with the viewport, so true counts would scale with the layout **[synthesis; arithmetic from `Membrane.band` and `Membrane.s`]**.
- **True redox poise.** In the cytosol NAD is held mostly oxidized and NADP mostly reduced. That asymmetry is *why* the cell keeps two nicotinamide pools: it can oxidize and reduce at once. Lumen starts both at 10% reduced (`state.js:34`) **[standard]**.
- **The missing conserved moieties.** AMP, through adenylate kinase, gives Atkinson's energy charge. CoA and phosphate are the others **[standard]**.
- **FAD drawn where it lives.** FAD is bound to its enzymes (SDH, ETF, ACAD), not free in the cytoplasm. A free FADH₂ pool is a textbook fiction that this register makes look literal (Codex) **[standard]**.

**Comparative anatomy.** The granum, the crista tip, the phycobilisome and the purple patch make different energy strategies feel physically different. *Further:* the chemistry should differ with the anatomy (Codex):
- per-specimen c-rings: c8 in animal mitochondria (Watt et al. 2010), c14 in chloroplasts, c13–15 in cyanobacteria;
- the proton-motive force split into Δψ and ΔpH, mostly Δψ in mitochondria and largely ΔpH in thylakoids, though in vivo partitioning varies (Kramer et al. 2004);
- cyanobacterial NDH-1 taking electrons from ferredoxin, not NADH (Schuller et al. 2019);
- the halophile's ATP synthase as A-type, not F-type;
- β-oxidation electrons entering through ETF, not SDH.

The specimens are also homologous: the crista's complex III is the b₆f's cousin. That relationship could be drawn **[standard]**.

**The live Z-scheme.** An energy diagram that moves with the model. *Further:* ladders for everything:
- the ΔG landscape of glycolysis, with three steep steps and the rest near equilibrium;
- Δp as a rung;
- the P/O ratio *derived on screen* from the c-ring and the transport cost. With c8: 10 H⁺ per NADH ÷ (8/3 + 1) H⁺ per cytosolic ATP ≈ 2.7 **[standard]**.

## What it gets wrong now

Confirmed by probe or by reading the code. Ranked by how much it misteaches. Items 1 and 2 were fixed in milestone 0 (2026-10-24; AGENTS.md describes the result); 3–5 are milestone 0.5.

1. **Conservation breaks.**
   - The four-step β-oxidation spiral never shortens the chain. Thiolase returns the fatty acid and adds an acetyl-CoA (`reactions/betaoxidation.js:47-50`), so each turn makes two carbons from nothing. Codex reproduced ten turns from one fatty acid yielding ten acetyl-CoA with the fatty acid intact. The batch path is balanced, so manual and autoplay modes run different chemistries.
   - Linear electron flow splits water and pumps protons even when NADP⁺ is exhausted (`reactions/etc.js:57-68`). The terminal callback skips the NADPH, so the electrons vanish. Acceptor limitation can never back up the chain, which removes much of cyclic flow's purpose (Codex, reproduced).
2. **No respiratory control.** Pumping never feels the gradient (`reactions/etc.js:24-49`), and ATP synthase runs only forward (`etc.js:87`). The central fact of chemiosmosis, that electron flow is throttled by Δp and so by ADP, is absent. The two halves are independent processes sharing a counter. What the probes saw:
   - The animal cell at rest stalls. After 30 s, ATP is 120/120 with no ADP left, the gradient is stuck at 88, and Krebs and PDH run at 0/min. β-oxidation has burned all four fatty acids into 32 acetyl-CoA that nothing takes, because nothing models CPT1's inhibition by malonyl-CoA. The "living frame" is a stalled one.
   - The anaerobe's ATP synthase "turns not at all". Real fermenters run it *backward*, spending glycolytic ATP to keep a gradient. That would turn the dullest specimen into a twist **[standard]**.
3. **Wrong biology in the presets.**
   - Animal cells ferment to ethanol; there is no LDH or lactate. The probe found 2 ethanol after 30 s anoxic.
   - The chloroplast locks are false (`organisms.js:39-43`). Plastids run the oxidative PPP and glycolytic steps (at night, on starch), and plant β-oxidation is peroxisomal, not mitochondrial (Codex).
   - Gluconeogenesis omits the GTP of PEPCK. Reverse GAPDH spends NADPH even in the animal cell (`glycolysis.js:92-100`, Codex).
   - Fatty-acid synthesis charges 14 ATP; the textbook cost is 7, for ACC (`betaoxidation.js:72-81`). Running it as reversed β-oxidation hides the reason the two pathways are separate: to avoid a futile cycle.
   - "Cyanobacterium: all pathways available" probably overstates it. Most cyanobacteria are thought to lack β-oxidation, and they store glycogen, not glucose **[check before acting]**.
4. **Switches decide what chemistry should.**
   - Sunlight globally reverses upper glycolysis and β-oxidation (`autoplay.js:62-63, 79`). Turn the light on in the animal cell and it starts gluconeogenesis and fatty-acid synthesis.
   - Oxygen disables Krebs and PDH by rule (`krebs.js:8`, `fermentation.js:8`). The real dependency runs through NAD⁺ regeneration.
   - In the chloroplast, light really does switch enzymes, through the ferredoxin–thioredoxin system: Calvin enzymes on, plastid G6PDH off. That is a mechanism the model could carry instead of a flag **[standard]**.
5. **Flux is a schedule artifact.** Batch keys deposit fixed weights on their segments (3 for Calvin, PPP and β-ox; `flux.js:35-40`), regardless of stoichiometric extent. The caption's "carries the most carbon" (`main.js:88`) is therefore stronger than its measurement (Codex).
6. **The renderer owns chemistry timing.** Chain callbacks fire as particles enter segments, so particle speed changes when chemistry happens, and the warm-up runs everything at once (Codex). Chemistry needs its own clock; the drawing should observe it.
7. **Damage without consequence.** ROS lowers a health number that touches no catalytic capacity or permeability, and health regenerates for free (`autoplay.js:117-137`, Codex). The peroxidised lipids are the one place the scene draws a quantity with no effects.
8. **Engineering.** No tests. Reactions are imperative code, and conservation holds by convention ("nothing clamps afterwards"). The canvas is one image to assistive tech, with no keyboard path to an individual enzyme (`index.html:254`, Codex).

## What it outright lacks

- **What metabolism is for** (both reads; Codex's framing). Demand: ATP-consuming work, ion pumping, motility (the bacterial flagellar motor runs directly on Δp). Biosynthesis: precursors drawn off the map into amino acids, nucleotides, lipids and enzymes. Repair, and growth. Carbon should become the cell.
- **Energetics.** Δψ and ΔpH; respiratory control; a reversible ATP synthase; per-specimen c-rings; energy charge; phosphate.
- **Compartments and transport.** Today one shared store makes cytosolic and matrix NADH interchangeable. Missing: ANT (electrogenic, so exporting ATP spends Δψ), the phosphate carrier, MPC, the malate–aspartate shuttle, and the plastid triose-phosphate translocator. On the transit map, a transporter is an *out-of-station interchange* between fare zones **[synthesis]**.
- **A real environment.** Continuous light intensity (and spectrum: PSII/PSI balance, far-red), O₂ tension, CO₂, buffered or finite nutrients.
- **Pathways.** Lactate; photorespiration (RuBisCO's oxygenase, so the O₂ switch matters to a plant); glycogen and starch; the glyoxylate shunt (why fat can't become sugar in animals); nitrogen assimilation; real fatty-acid synthesis; carbon-concentrating mechanisms; photoprotection (NPQ triggered by lumen pH, PSII's D1 repair cycle).
- **Experimental memory** (Codex). Seeded randomness, saveable conditions, replay, a paired control, time-series export, and provenance on every displayed quantity (measured, fitted, estimated or illustrative).

## North star: a cell that builds itself, on a bench

> **A named cyanobacterium, *Synechocystis* sp. PCC 6803, turning light and CO₂ into more of itself: drawn molecule by molecule, and checkable against the experiments that discovered how it works.**

This joins the two reads. Codex's: *watch a cell build itself from its environment*. One named flagship follows light, carbon and nutrients into ATP, reductant, amino acids, lipids and enzymes, until it grows and divides. That closes the causal loop: the membrane powers metabolism, and metabolism builds and repairs the membrane. Claude's: *the canonical experiments are both the curriculum and the test suite*. Every classic figure of bioenergetics should be reproducible from the one model, and each reproduction is a regression test that holds the model honest.

Why *Synechocystis*. It is the flagship preset already, it is what "Lumen" names, and it has a genome-scale model (Nogales et al. 2012). It also grows on glucose, which gives "+ Glucose" a real meaning.

The alternatives are each worse for this sim:
- JCVI-syn3A has a complete 4D whole-cell model (Thornburg et al. 2022, 2026), but it has no respiratory chain and no light.
- *Synechococcus elongatus* PCC 7942 is the clock organism (KaiABC was reconstituted in vitro from its proteins: Nakajima et al. 2005), but its metabolic models are thinner.

The other specimens stay as comparative cuts that share the engine. They are not separate models.

### The engine

- **A declarative network.** Reactions become data: stoichiometry, compartment, ΔG°′, rate parameters and effectors. Tests then fall out:
  - element and charge balance per reaction;
  - conserved moieties from the stoichiometric matrix's left null space (the four cofactor pairs appear on their own; any new leak fails a test);
  - thermodynamic consistency around cycles.

  The map's `COF` glyphs, the reference pages and the tooltips can be generated from the same table.
- **Separable rate laws** (Noor et al. 2013). Each rate is v = E · k_cat · η_thermo · η_sat · η_reg. That is enzyme amount, times the thermodynamic driving force (1 − e^{ΔG/RT}), times substrate saturation, times allosteric regulation. Each factor is drawable. The map already draws regulation gates; add the other two and "why did this stop?" (Codex's fourth experience) answers itself on the track. Directions then come from ΔG, never from a light switch **[standard method; synthesis in the drawing]**.
- **Stochastic at the drawn counts, deterministic where it's cheap.** The existing architecture is already event-driven: `advanceStep` fires and observers draw threads, docks and flux. A Gillespie-style scheduler (Gillespie 1977) whose propensities come from the rate laws slots straight into it, so each event stays a drawable event. Fast near-equilibrium steps (PGI, TPI, aldolase, enolase) can be pooled as rapid equilibria. Codex prefers continuous kinetics for abundant species with stochastic events where useful; at Lumen's counts the two meet in the middle. Decorative Brownian motion should never be claimed as diffusion (Codex).
- **Its own clock.** Chemistry advances on a model clock, and particles are a view of events already decided. The caption states the time scale ("slowed 300×"), the way the scale bar states space.
- **Data with provenance.**
  - ΔG°′ from eQuilibrator (Flamholz et al. 2012; Beber et al. 2021).
  - Absolute concentrations, fluxes and ΔG for *E. coli*, yeast and a mammalian line from Park et al. 2016 and Bennett et al. 2009. These map neatly onto three of the presets.
  - Kinetic constants from SABIO-RK.
  - Network identifiers from BiGG (King et al. 2015).

  Parameters keep a measured / fitted / illustrative tag, which the inspector shows.

### The bench

A third register, panel **c**, under the plate: the instrument trace an experimentalist would see. The model is the truth, and instruments are partial projections of it.
- the Clark oxygen electrode: state 3 and state 4 respiration, the respiratory control ratio, the P/O ratio (Chance & Williams 1955);
- the fluorometer: Kautsky's induction curve (Kautsky & Hirsch 1931);
- the 340 nm NADH absorbance;
- the isotope chromatogram.

Additions are marked with arrows on the trace, as in the classic figures. Experiments that become both lessons and tests:

| Experiment | What the model must reproduce |
|---|---|
| Chance & Williams' oxygen-electrode trace (1955) | adding ADP speeds O₂ uptake (state 3); running out of it slows it (state 4); an uncoupler releases it; cyanide stops it |
| A Seahorse-style mito stress test (Brand & Nicholls 2011; Divakaruni et al. 2014) | oligomycin → FCCP → rotenone + antimycin, read as basal, ATP-linked, maximal and spare respiration |
| Jagendorf's acid bath (Jagendorf & Uribe 1966) | thylakoids at pH 4, moved to pH 8 with ADP, make ATP in the dark: chemiosmosis from a pH jump alone |
| Racker & Stoeckenius' vesicle (1974) | bacteriorhodopsin plus ATP synthase in one membrane make ATP in light. The Custom composite *is* this experiment |
| Kok's flashes (Joliot et al. 1969; Kok et al. 1970) | O₂ per flash oscillates with period four and peaks on the third flash, damped by misses and double hits. PSII's S-states drawn at the zoom layer |
| Emerson's enhancement (Emerson et al. 1957) | far-red alone does little, red alone some, and both together more than the sum: two photosystems |
| Calvin's pulse (Bassham, Benson & Calvin) | label appears in 3-PGA first |
| Hill's reaction (1937); Ruben et al. (1941) | isolated thylakoids evolve O₂ with an artificial acceptor; the O₂ comes from water |
| Peters' lethal synthesis (1952) | fluoroacetate becomes fluorocitrate and stops aconitase |
| Warburg (1956) | aerobic glycolysis in a proliferating cell |

### Milestones

Each stage leaves a better simulator. This is Codex's ordering, with the bench pulled earlier.

0. **Respiratory control and the conservation leaks** (a9's cut, 2026-10-24). Fix both conservation leaks. Pumping slows as Δp nears each chain's stall, and ATP synthase's direction comes from Δp against the phosphorylation potential, so it can run backward.
0.5. **The rest of the correctness pass.** Add lactate and LDH. Correct the preset texts and the gluconeogenesis and fatty-acid synthesis costs. Weight flux by extent. Choose directions from state, not the light switch.
1. **Declarative network and tests.** The same behavior from data, with a balance test suite and a chemistry clock separate from the renderer.
2. **Energetics.** Δψ/ΔpH, per-specimen c-rings, separable rate laws, thermodynamic directions. A demand control replaces the fixed drain. A keyboard-accessible reaction inspector draws the η factors.
3. **The bench.** Panel c, the poison cabinet, and the first experiments (Chance–Williams, Jagendorf, Kok) as lessons and regression tests. Kok's flashes need little beyond an S-state counter at PSII and could ship before milestone 1 as a proof of the bench.
4. **Compartments.** Matrix, intermembrane space and cytosol; plastid stroma. Transporters as interchanges between zones.
5. **Breadth.** Photorespiration, glycogen, nitrogen assimilation, the glyoxylate shunt, NPQ; the day–night cycle.
6. **Growth.** Biomass, enzyme allocation and division, in *Synechocystis* first.

A whole cell cycle predicted from the genome is a research programme with large parameter uncertainty (Codex). A disciplined central-metabolism model with coarse growth is achievable over sustained work, and Lumen becomes exceptional well before the far edge.

## Fun directions

Ranked roughly by delight per unit of work. All stay true to the science.

1. **Follow a labelled carbon.** Pulse ¹⁴CO₂ or labelled glucose. Labelled molecules carry a pattern (red is taken by protons), and panel c becomes a chromatogram. Atom mappings are needed before claiming atom-level paths (Codex's first pick).
2. **The poison cabinet.** Each inhibitor is drawn bound at its site in the zoom layer:
   - cyanide at cytochrome a₃, rotenone at complex I's Q site, antimycin at Qi;
   - oligomycin in Fo, DCMU at PSII's Q_B site, paraquat stealing electrons from PSI (so the ROS system finally matters);
   - DNP and FCCP ferrying protons across the bilayer;
   - arsenate at GAPDH, fluoroacetate's lethal synthesis.

   DNP has a history to tell: it was sold as a 1930s diet pill **[standard]**.
3. **Diagnose an unknown perturbation** (Codex). A mystery poison, a paired control cell, and the bench's instruments. Is it an electron-transfer block or an uncoupler? The answer is revealed afterward.
4. **Kok's flashes.** Click the flash; the manganese cluster at PSII steps S₀→S₄; O₂ comes every fourth flash. It is self-contained and probably the cheapest high-wonder item here.
5. **Build a membrane.** Custom becomes a construction kit: drag complexes onto a bare bilayer and see whether the membrane makes ATP. Racker–Stoeckenius is the first success; "NADPH without PSII?" is the first instructive failure.
6. **A day.** The sun crosses, light intensity varies continuously, glycogen fills by day and drains by night. In cyanobacteria, KaiC's phosphorylation rhythm can be drawn too. The theme's "follows sunlight" state already points this way.
7. **Sprint and marathon** (needs a named animal cell, below). Phosphocreatine buffers the first seconds; then comes glycolysis to lactate; then the switch to fat and oxygen.
8. **Inborn errors.**
   - G6PD deficiency and fava beans uses the link Lumen already has: PPP NADPH feeds glutathione peroxidase. Knock G6PDH down, add an oxidant, and watch the cell fail.
   - Others: complex I deficiency, MCAD deficiency, the Warburg effect.
9. **Zoom is time** **[speculative]**. Camera zoom sets the model clock. At the cofactors you see electron hops (Moser–Dutton tunneling: Moser et al. 1992), at the membrane enzyme turnover, at the map pool turnover, and at the whole cell growth. The caption names the time scale. The idea is elegant but could confuse; it deserves a sketch before a decision.
10. **Deep time** **[speculative]**. The specimens are related by descent: chloroplast from cyanobacterium, mitochondrion from an alphaproteobacterium. A homolog highlight across specimens is cheap and **[standard]**. A deep-time chapter (the Great Oxidation Event, chemiosmosis at alkaline vents: Lane & Martin 2012) is a bet. It risks becoming decoration unless it runs on the model.

## Prior art and data

- **Whole cells.**
  - Karr et al. 2012, *Cell*, 10.1016/j.cell.2012.05.044: whole-cell *M. genitalium*.
  - Thornburg et al. 2022, *Cell*, 10.1016/j.cell.2021.12.025: a living minimal cell.
  - Thornburg et al. 2026, *Cell*, 10.1016/j.cell.2026.04.003: the minimal cell in 4D.
  - Breuer et al. 2019, *eLife*, 10.7554/eLife.36842: syn3A's metabolism.
- **Organelle scale.** Singharoy et al. 2019, *Cell*, 10.1016/j.cell.2019.10.021: a purple bacterium's chromatophore, from atoms to ATP output. The closest existing thing to Lumen's membrane plate made quantitative.
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
  - SABIO-RK.
  - Escher, for data-rich metabolic maps (Codex).
  - VCell, for separating model, geometry and solver (Codex).
- **Kinetics.**
  - Noor et al. 2013, *FEBS Lett*, 10.1016/j.febslet.2013.07.028.
  - Liebermeister et al. 2010, *Bioinformatics*, 10.1093/bioinformatics/btq141.
  - Gillespie 1977, *J Phys Chem*, 10.1021/j100540a008.
  - Flamholz et al. 2013, *PNAS*, 10.1073/pnas.1215283110: why cells pick a glycolytic route.
- **Bioenergetics.**
  - Mitchell 1961, *Nature*, 10.1038/191144a0.
  - Watt et al. 2010, *PNAS*, 10.1073/pnas.1011099107.
  - Schuller et al. 2019, *Science*, 10.1126/science.aau3613.
  - Kramer et al. 2004, *Trends Plant Sci*, 10.1016/j.tplants.2004.05.001.
  - Zhang & Bryant 2011, *Science*, 10.1126/science.1210858: the cyanobacterial TCA cycle.
  - Moser et al. 1992, *Nature*, 10.1038/355796a0.
  - Lane & Martin 2012, *Cell*, 10.1016/j.cell.2012.11.050.
  - Nakajima et al. 2005, *Science*, 10.1126/science.1108451.
- **Experiments.**
  - Chance & Williams 1955, *JBC*, 10.1016/s0021-9258(19)57190-3.
  - Jagendorf & Uribe 1966, *PNAS*, 10.1073/pnas.55.1.170.
  - Racker & Stoeckenius 1974, *JBC*, 10.1016/s0021-9258(19)43080-9.
  - Joliot et al. 1969, *Photochem Photobiol*, 10.1111/j.1751-1097.1969.tb05696.x.
  - Kok et al. 1970, *Photochem Photobiol*, 10.1111/j.1751-1097.1970.tb06017.x.
  - Emerson et al. 1957, *PNAS*, 10.1073/pnas.43.1.133.
  - Hill 1937, *Nature*, 10.1038/139881a0.
  - Ruben et al. 1941, *JACS*, 10.1021/ja01848a512.
  - Kautsky & Hirsch 1931, *Naturwissenschaften*, 10.1007/bf01516164.
  - Peters 1952, *Proc R Soc B*, 10.1098/rspb.1952.0001.
  - Warburg 1956, *Science*, 10.1126/science.123.3191.309.
  - Brand & Nicholls 2011, *Biochem J*, 10.1042/bj20110162.
  - Divakaruni et al. 2014, *Methods Enzymol*, 10.1016/b978-0-12-801415-8.00016-3.
- **Pedagogy.** PhET's inquiry design: predict, manipulate, explain, around one carefully chosen experiment (Codex).

## Decisions

a9, 2026-10-24. Each of these is a direction for later sessions; only milestone 0 is being built now.

1. **North star: approved.** *Synechocystis* building itself, on a bench, with the other specimens as comparative cuts on a shared engine.
2. **Truth beats tidiness.** True relative counts (a tiny NADPH pool, almost no free FAD) and a stated slow-motion factor, so that every number on the plate is defensible.
3. **Named cells.** "Animal cell", "obligate anaerobe" and "archaeon" become named cells, and the name decides the chemistry. A hepatocyte makes glucose and a muscle fibre doesn't; the archaeon is *Halobacterium* in all but name. Which cells is still open.
4. **Mostly a sandbox.** The bench's experiments are things a visitor can set up, not a guided course; puzzles, if any, stay light.
5. **Milestone 0 first,** cut to respiratory control and the two conservation leaks. The other correctness fixes are milestone 0.5, for a later session.
