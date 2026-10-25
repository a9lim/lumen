# Lumen: where it could go

Ideation round 1, 2026-10-24, against `c09cca0`; round 2, 2026-10-25, against `69658c2`, refined the milestones and the engine's design. a9's decisions on both are recorded at the end; the rest of the plan is direction, not a contract. Two independent reads went into it: Claude's (playing every preset, 30-second state probes, reading the engine) and Codex's (gaslamp job `cx-20261024-213046-93d2`, briefed without Claude's ideas, which reproduced two conservation faults in isolation). Where the two agree, that is noted. Every reference below was checked against Crossref on the day. Tags: **[standard]** is textbook or published science, **[synthesis]** is our combination of it, **[speculative]** is a bet.

## The thesis

The drawing is now truer than the model. The plate promises that every moving thing reads a quantity in the model, and it keeps that promise. But the quantities come from a round-robin schedule (`autoplay.js:56-87`), step-function gates (`regulation.js`) and a light switch that picks directions, not from chemistry. Most of what a visitor sees is choreography: designed, not emergent.

So the next era has two halves. Both reads reached them independently:

1. **Make the model as honest as the drawing.** A declarative reaction network with its own clock, conservation that can't be broken, and directions set by thermodynamics.
2. **Give the cell a reason to metabolize.** Today ATP disappears into a fixed drain. A cell metabolizes to do work, to stay intact and to build more of itself.

The visual register stays. Nothing below needs it reinvented. Most of it is the register finally having something true to read.

## What it is strong at, and how to push each strength

**Coupling made visible.** ATP and reducing power are usually arrows between two separate textbook diagrams. Here they are molecules that dock at a membrane complex and thread down to a map enzyme. This can teach *coupling* better than any pathway animation. *Further:* every connection should answer a question. Where did this carbon come from? What is limiting this enzyme? Why did oxygen uptake change? What was that ATP spent on? (both reads)

**Conservation made physical.** Closed pools drawn as one molecule per unit is rare and good. *Further:*
- **True relative counts.** The 120 drawn ATP are already about the true count. At 3 mM, a slab of the drawn stroma band about 20 nm deep holds ≈110 ATP. The band measures 188 × 16.5 nm in the 1440 px layout. The slab's depth is a free choice. Fix it once so that ATP is true, and let every other pool follow. At *E. coli*'s concentrations (Bennett et al. 2009: ATP 9.6 mM, NAD⁺ 2.6 mM, NADH 83 µM, NADP⁺ 2.1 µM, NADPH 0.12 mM) a 20 nm slab would hold about 360 ATP, 97 NAD⁺, 3 NADH, 4 NADPH and usually no NADP⁺, with free FAD almost none. Proportions differ by organism, though: *Synechocystis* keeps a markedly higher NADP⁺/NAD⁺ ratio than *E. coli* (Ito et al. 2023), so the flagship's NADP pool is not tiny. Each specimen's counts follow its own organism. The band's width in nm changes with the viewport today; the window (below) needs a fixed physical geometry instead **[synthesis; arithmetic from `Membrane.band` and `Membrane.s`]**.
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

Confirmed by probe or by reading the code. Ranked by how much it misteaches. Items 1 and 2 were fixed in milestone 0 (2026-10-24; AGENTS.md describes the result). Milestone 0.5 (2026-10-25) fixed 3 and 5 and put an interim rule on 4; the engine (milestone 1) takes the rest of 4, and 6–8; its phase A did so on 2026-10-25.

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
   - "Cyanobacterium: all pathways available" probably overstates it. Most cyanobacteria are thought to lack β-oxidation, and they store glycogen, not glucose **[check before acting]**. *Checked in 0.5:* "a functional β-oxidation pathway appears to be missing in cyanobacteria" (von Berlepsch et al. 2012), so the cyanobacterium now runs that line only as fatty-acid synthesis. In the dark without O₂ *Synechocystis* makes D-lactate, acetate, succinate and H₂ (Akiyama & Osanai 2023), not ethanol. And the halophile can't catabolize glucose to pyruvate at all (Todor et al. 2015), so its glycolysis is locked.
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

Round 2 settled its shape. Codex's adversarial read of the round-2 proposal (gaslamp job `cx-20261025-133216-da5c`) corrected the window, the verb and the landing order; those corrections are folded in below.

- **Reaction identities first.** Many of today's "reverse" directions are different reactions catalysed by different enzymes: HK and G6Pase, PFK and FBPase, PK and PC + PEPCK, and GAPDH switching from NAD to NADP (`reactions/glycolysis.js`). One reversible row can't represent such a pair, so the network splits enzyme and reaction identities before it attaches ΔG or rates (Codex).
- **A declarative network.** Reactions become data: stoichiometry, compartment, ΔG°′, rate parameters and effectors. Tests then fall out:
  - element and charge balance per reaction, against independently specified element vectors;
  - the conserved moieties (the four cofactor pairs, the adenylates with AMP, phosphate, CoA) asserted as independently specified vectors and checked against the stoichiometric matrix's left null space. Discovering moieties from the null space alone can't catch a network that has quietly lost one (Codex);
  - thermodynamic consistency around cycles, with chemical species and protonation kept separate from the transformed ΔG°′ convention.

  The map's `COF` glyphs, the reference pages and the tooltips can be generated from the same table.
- **Minimal compartments from the start.** Concentrations need volumes, Δψ needs a membrane between two spaces, and an isolated preparation needs a boundary, so the engine has volumes, boundaries and reservoir exchanges from its first phase. Transporter anatomy (shuttles, ANT's charge, the interchanges on the map) waits for milestone 3 (Codex).
- **Continuous environment.** Light intensity, O₂ tension and CO₂ are inputs with values; today's switches become presets of them. A photosystem's rate is a photon flux times its cross-section.
- **Separable rate laws** (Noor et al. 2013). Each rate is v = E · k_cat · η_thermo · η_sat · η_reg. That is enzyme amount, times the thermodynamic driving force (1 − e^{ΔG/RT}), times substrate saturation, times allosteric regulation. Each factor is drawable. The map already draws regulation gates; add the other two and "why did this stop?" (Codex's fourth experience) answers itself on the track. Directions then come from ΔG, never from a light switch **[standard method; synthesis in the drawing]**.
  - The product is an organizing decomposition, not a finished law. Each law also needs consistent forward and reverse parameters, finite behavior at zero concentration, exact cancellation at equilibrium, positivity and convergence (Codex).
  - The engine exposes one-way fluxes, not only net ones. Near equilibrium both directions run while the net goes to zero, and the window's dockings need the one-way rates. They follow from the net flux and ΔG through the flux–force relation, v₋/v₊ = e^{ΔG/RT} **[standard]**.
- **Its own clock.** Chemistry advances on a model clock that runs headless in node. Particles are a view of events already decided, so nothing depends on frame rate, viewport, hidden rendering or animation speed. No single factor covers electron hops (microseconds), diffusion and turnover, so the caption states the turnover slowdown ("slowed 300×", the way the scale bar states space) and names the transitions stretched further (Codex).
- **The window.** The cell is authoritative and continuous: its concentrations, and the populations of each kind of complex in each state (which cofactor holds an electron, which S-state a PSII centre is in). Panel a is a fixed-volume window onto it, with its own physical geometry rather than the viewport's.
  - The drawn complexes are seeded representative centres. They step through the same kinetics as the populations but don't debit the bulk pools. Electrons, carrier reduction and the Z-scheme's beads all read one centre's sampled state, never independent samples. Kok's flashes run on the ensemble of S-state occupancies (misses, double hits, dark relaxation), and the drawn PSII is one realization of it.
  - Pool molecules are a representative sample at true proportions, not literal instantaneous counts: each pool's drawn total is fixed at its mean count in the window, and its forms follow the cell's ratio. Their motion is illustrative, and display noise never feeds back into regulation.
  - Threads draw coupling and sampled flux between a pool and a map enzyme, not one molecule's journey (Codex).

  This settles round 1's choice between Gillespie events and continuous kinetics. A fully stochastic slab would misteach: at 6 × 10⁻²⁰ L, 1 µM averages 0.04 molecules, and diffusion exchanges the slab in microseconds, so a closed stochastic box gets both the noise and the regulation wrong. ATP synthase turns over on the order of 10² per second, so a 100–300× slowdown shows each one making about an ATP a second **[synthesis]**.
- **The verb.** A click pulses one enzyme's activity, right-click inhibits it, and holding sustains a small perturbation against a paired baseline.
  - The pulse scales a multiplier on catalytic capacity, not the enzyme's amount: changing the amount would mean synthesis and a biomass cost (Codex).
  - Where a push spreads or dies is something the visitor observes, not a scripted lesson. Control of flux is shared among enzymes and depends on conditions (Kacser & Burns 1973) **[standard]**. Flux control coefficients are computed only once a steady state exists.
  - Still to specify: amplitude, model-time duration (at a 300× slowdown one model second lasts five wall-clock minutes), stacking, recovery, behavior while paused, and keyboard and touch equivalents.
  - Poisons act through the same multiplier at first. Binding kinetics, competition and irreversible inhibition come with the bench, and an inherited deficiency is a persistent setting, not a click (Codex).
  - A keyboard-accessible inspector shows the η factors.
- **Biosynthetic demand.** Carbon leaves the network to become the cell. The twelve precursors (G6P, F6P, R5P, E4P, triose phosphate, 3-PG, PEP, pyruvate, acetyl-CoA, OAA, α-KG, succinyl-CoA) leave the map on terminal spurs, "to the cell" **[standard; the spurs are synthesis]**. A growth dial sits beside an ATP-demand dial that replaces today's fixed drain. This is labelled biosynthetic demand, not predicted growth (Codex):
  - one biomass row drawing every ingredient together in a stated composition, with its ATP and NADPH costs and the CoA and phosphate it returns, and a ledger of what accumulates. Twelve independent sinks would be a different model;
  - withdrawing OAA and α-KG needs anaplerosis (PEP carboxylase in cyanobacteria, pyruvate carboxylase in animals), or the Krebs cycle drains away **[standard]**.
- **Damage with consequence.** With an activity multiplier in every rate, ROS can lower it where damage is known to bite (aconitase's iron–sulfur cluster is the classic target), and peroxidised lipid can raise the leak. Repair then costs ATP and amino acids instead of regenerating for free **[standard mechanisms; synthesis in the model]**.
- **Data with provenance.**
  - ΔG°′ from eQuilibrator (Flamholz et al. 2012; Beber et al. 2021).
  - Absolute concentrations, fluxes and ΔG for *E. coli*, yeast and a mammalian line from Park et al. 2016 and Bennett et al. 2009. These map neatly onto three of the presets. Each specimen takes its pool proportions from its own organism, not from *E. coli*.
  - Kinetic constants from SABIO-RK.
  - Network identifiers from BiGG (King et al. 2015).

  Parameters keep a measured / fitted / illustrative tag and an uncertainty, which the inspector shows.

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
| Racker & Stoeckenius' vesicle (1974) | *Halobacterium* purple membrane and bovine-heart oligomycin-sensitive ATPase, reconstituted in soybean phospholipid vesicles, make ATP in light. It needs its own restricted preparation, with orientation and medium; the Custom composite, which carries every complex, is only its ancestor (Codex) |
| Kok's flashes (Joliot et al. 1969; Kok et al. 1970) | O₂ per flash oscillates with period four and peaks on the third flash, damped by misses and double hits. PSII's S-states drawn at the zoom layer |
| Emerson's enhancement (Emerson et al. 1957) | far-red alone does little, red alone some, and both together more than the sum: two photosystems |
| Calvin's pulse (Bassham, Benson & Calvin) | label appears in 3-PGA first |
| Hill's reaction (1937); Ruben et al. (1941) | isolated thylakoids evolve O₂ with an artificial acceptor; the O₂ comes from water |
| Peters' lethal synthesis (1952) | fluoroacetate becomes fluorocitrate and stops aconitase |
| Warburg (1956) | aerobic glycolysis in a proliferating cell |

### Milestones

Each stage leaves a better simulator. Round 2 reordered round 1's list (Codex's, with the bench pulled earlier): the engine comes first, with energetics and biosynthetic demand inside it, and the bench follows.

0. **Respiratory control and the conservation leaks** (a9's cut, 2026-10-24; built). Fix both conservation leaks. Pumping slows as Δp nears each chain's stall, and ATP synthase's direction comes from Δp against the phosphorylation potential, so it can run backward.
0.5. **The rest of the correctness pass** (built 2026-10-25).
   - Add lactate and LDH. Correct the preset texts and locks, PEPCK's GTP, fatty-acid synthesis's cost (7 ATP), and the NADPH that reverse GAPDH spends in the animal cell. Weight flux by carbon extent. Clear the unreachable code.
   - Sunlight's reversal becomes an interim rule for the photosynthetic specimens only; real directions come from ΔG in the engine and aren't built twice.
   - Oxygen's rule on Krebs and PDH stays until the engine has compartments. Without them, cytosolic LDH would regenerate the matrix's NAD⁺ and keep the cycle turning in anoxia (Codex).
   - *What you see:* the animal cell ferments to lactate, light no longer makes it gluconeogenic, the chloroplast gets its PPP back, and line weights are honest. Mostly the presets stop misstating the biology.
   - *As built:* each preset ferments as its organism does (lactate in the animal cell and the cyanobacterium, ethanol in the anaerobe, none in the chloroplast or the halophile), and β-oxidation runs only as fatty-acid synthesis in the cyanobacterium and the chloroplast. Line weight reads carbon atoms per second. NNT also got a thermodynamic gate (Δp against the two nicotinamide ratios): without it, the anoxic mitochondrion drained every NADH into NADPH, leaving LDH nothing to ferment with. Still open for the engine: light doesn't switch plastid enzymes (thioredoxin), per-organism enzyme sets are coarse (the cyanobacterial Krebs cycle, the chloroplast's ADH), and the round-robin can't speed glycolysis up in anoxia, so the anoxic animal cell starves.
1. **The engine,** one milestone developed in two phases.
   - *Phase A, the core.* Landing order (Codex):
     1. species, units, compartments (volumes, boundaries, reservoir exchanges) and reaction identities;
     2. headless state, injected randomness and model-time events;
     3. declarative transactions under the old schedule, checked by store-diff equivalence. That is a migration check, not a chemistry oracle, and it compares everything (acyl lengths, reservations, pending events, counters), not frame-by-frame callback timing;
     4. balances and thermodynamic constraints, independently specified;
     5. kinetics qualified on one small complete subsystem, then expanded;
     6. the window, the verb, biosynthetic demand and the inspector.

     *As built (2026-10-25):* all six steps landed, and the app runs on the engine. The schedule, the dispatcher and the regulation gates are deleted; step 3's migration check served while both existed and went with them. The engine is BiGG-identified species with iJO1366 formulas, every reaction balanced in elements and charge, eQuilibrator ΔG'° (equilibrator-api 0.8.1, computed by Codex) and midpoint potentials for the membrane, separable rates (Noor et al. 2013) and a ROS2 Rosenbrock integrator. Respiratory control, the Pasteur effect, uncoupling, the light–dark switch (thioredoxin on plastid and cyanobacterial enzymes) and the anaerobe's backward ATP synthase all emerge; the headless suite (23 tests) checks them, along with conservation, frame independence, the cycles' thermodynamic consistency and the paired baseline.

     Codex reviewed each step. Its review of step 6 found eight faults, all fixed before landing. Electron chains drew downstream turnovers they hadn't earned, so now an electron waits at each complex until that complex turns over. Clicks stacked pulses on enzymes the map draws twice. Repair cleared damage without paying for it. Touch couldn't hold. The window's turnover cap silently changed the slowdown, so thinning is now stated in the caption. Radicals were cleared on a fixed timer, not by SOD. Stations outside the matrix read zero. And the held verb had no baseline: holding now sustains ×1.1 while a held and an unheld copy of the cell run to a steady state in a worker, which reports flux control coefficients (PFK's over glucose uptake is about 0.6 in the animal cell; cytochrome oxidase's over O₂ use is near 0, since it has capacity to spare).

     Open from phase A, besides phase B: most parameters are illustrative; the lit cyanobacterium's NADPH sits about 15% reduced, held at b₆f by Δp; holds take 200–750 model seconds to settle; the pulse defaults (×5 peak, 1.5 s fade, stacking) are a first guess for a9 to tune.
   - *Phase B, membrane energetics.* Δψ and ΔpH; per-specimen c-rings (c8 in animal mitochondria, c14 in chloroplasts, c13–15 in cyanobacteria); ETF entry for β-oxidation; the halophile's A-type synthase; ferredoxin-fed NDH-1 in cyanobacteria; the P/O ratio derived on the Stats ladder.

     *As built (2026-10-25):* all six. Δψ and ΔpH are separate signed states (net charge moved, protons gained); each reaction pays F·Δψ per charge and F·ΔpH per proton it moves, so ANT spends only Δψ and the pyruvate and phosphate carriers only ΔpH. A counter-ion channel and K⁺/H⁺ exchange set the partition (about 160 mV and 0.5 pH units in the mitochondrion, 40 mV and 2.3 units in the lit thylakoid), and raising either reproduces nigericin and valinomycin. The rings and their sources came from Codex (DOIs checked on Crossref): c₈ bovine, c₁₄ spinach and *Synechocystis*, c₁₀ *E. coli* for the anaerobe, the halophile's uncounted (c₁₂ illustrative). The Stats tab derives P/O 30/11 from NADH in the animal cell, and 1.3 ATP per NADPH from linear flow. ETF sits at −25 mV (Gustafson et al. 1986). The cyanobacterium's NDH-1 takes ferredoxin, which took two more fixes: FNR needed a real backward capacity, and its ATP synthase was braked in the dark like a chloroplast's, which starved its night respiration; AtpΘ (Song et al. 2022) replaces the brake. Holds now run in a chemostat, since a finite medium running out has no steady state.
   - *Behavioral tests, headless, landing throughout* (Codex), so the rewrite is never unguarded while the bench waits:
     - conservation including enzyme-bound intermediates, external exchanges and pending events; no species negative at depletion;
     - identical model trajectories across frame rates, viewport sizes, hidden rendering and animation speeds; replayable seeds; a reset cancels old events;
     - equilibrium gives zero net flux, and perturbing the reaction quotient reverses it; enzyme activity can't move an equilibrium; an undriven closed cycle can't make ATP;
     - adding ADP stimulates respiration and exhausting it slows it; more leak lowers Δp and can speed a backpressured chain;
     - anoxia stops oxygen reduction at once but allows transient upstream turnover; NAD⁺ exhaustion and reoxygenation shut down and recover. Every Krebs step need not stop in anoxia;
     - NADP⁺ limitation keeps electrons balanced; phosphate and the adenylates constrain ATP synthesis;
     - demand gives a bounded response, and sustained overload exhausts reserves without creating substrate;
     - the window's samples have the right ensemble means, and display noise never reaches bulk regulation.
   - *What you see:* the schedule is gone. Lines run because they are downhill and fed, and a stalled line shows on its track whether thermodynamics, saturation or regulation stopped it. The stroma holds each organism's true proportions (a large NADP pool in *Synechocystis*, scarce free NADH in the animal cell, no free FAD anywhere) and the caption states the slowdown. Carbon leaves the map at "to the cell" spurs, ATP demand and growth are dials, and a click pulses an enzyme. After phase B the Stats tab reads Δψ and ΔpH, the c-rings differ per specimen at the zoom layer, and the ladder derives the P/O ratio.
2. **The bench.** Panel c; the poison cabinet, with binding kinetics; the experiments as setups and regression tests (Chance–Williams, the stress test, Jagendorf, Kok, Emerson, Hill). Light spectrum joins the inputs for Emerson. Seeded replay, saved setups, paired controls and time-series export.
   - *What you see:* a third register under the plate with an instrument trace, additions marked by arrows as in the classic figures, and inhibitors drawn bound at their sites in the zoom layer.
3. **Transport and named preparations.** Matrix, intermembrane space and cytosol, and the plastid stroma, drawn as fare zones; ANT, the phosphate carrier, MPC, the malate–aspartate shuttle and the triose-phosphate translocator as out-of-station interchanges between them. The specimens are named for the preparations the canonical experiments used:
   - rat liver mitochondria (Chance & Williams' part I used rat and guinea-pig liver mitochondria);
   - spinach chloroplasts (Jagendorf & Uribe);
   - the Racker–Stoeckenius vesicle as its own restricted preparation;
   - *Synechocystis* PCC 6803 stays the one intact cell;
   - the bench can isolate mitochondria from a hepatocyte, which removes the cytosol and makes the visitor supply substrates.

   *What you see:* NADH stops crossing membranes for free, and the cost of exporting ATP (ANT spends Δψ) shows on the map.
4. **Breadth and a day.** Photorespiration, glycogen, nitrogen assimilation, the glyoxylate shunt, NPQ; the day–night cycle.
5. **Growth.** Enzyme allocation, a cell that grows, and division, in *Synechocystis* first.

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
  - Ito, Watanabe & Osanai 2023, *Plant Physiol*, 10.1093/plphys/kiad580: *Synechocystis*'s high NADP⁺/NAD⁺ ratio.
  - von Berlepsch et al. 2012, *Plant Physiol*, 10.1104/pp.112.195263: cyanobacteria appear to lack β-oxidation.
  - Akiyama & Osanai 2023, *Front Microbiol*, 10.3389/fmicb.2023.1332449: *Synechocystis*'s dark anoxic products, D-lactate among them.
  - Todor et al. 2015, *PLOS ONE*, 10.1371/journal.pone.0135693: *Halobacterium salinarum* can't catabolize glucose to pyruvate.
  - SABIO-RK.
  - Escher, for data-rich metabolic maps (Codex).
  - VCell, for separating model, geometry and solver (Codex).
- **Kinetics.**
  - Kacser & Burns 1973, *Symp Soc Exp Biol* 27: "The control of flux", reprinted with a commentary in 1995, *Biochem Soc Trans*, 10.1042/bst0230341.
  - Heinrich & Rapoport 1974, *Eur J Biochem*, 10.1111/j.1432-1033.1974.tb03318.x.
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
  - Chance & Williams 1955, *JBC* 217: part I, the kinetics of oxygen utilization in rat and guinea-pig liver mitochondria, 10.1016/s0021-9258(19)57189-7; part II, difference spectra, 10.1016/s0021-9258(19)57190-3.
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

Round 1, a9, 2026-10-24. Each of these is a direction for later sessions; milestone 0 is built.

1. **North star: approved.** *Synechocystis* building itself, on a bench, with the other specimens as comparative cuts on a shared engine.
2. **Truth beats tidiness.** True relative counts (a tiny NADPH pool, almost no free FAD) and a stated slow-motion factor, so that every number on the plate is defensible. *Round 2:* the tiny NADPH pool is *E. coli*'s; *Synechocystis* keeps a large one, so counts follow each specimen's organism.
3. **Named cells.** "Animal cell", "obligate anaerobe" and "archaeon" become named cells, and the name decides the chemistry. A hepatocyte makes glucose and a muscle fibre doesn't; the archaeon is *Halobacterium* in all but name. Which cells is still open.
4. **Mostly a sandbox.** The bench's experiments are things a visitor can set up, not a guided course; puzzles, if any, stay light.
5. **Milestone 0 first,** cut to respiratory control and the two conservation leaks. The other correctness fixes are milestone 0.5, for a later session.

Round 2, a9, 2026-10-25, on Claude's proposal for the milestones. Codex's read came after a9's decisions and refined them; its changes are marked.

6. **The verb changes.** A click pulses an enzyme instead of firing one reaction. Codex made the pulse a multiplier on catalytic capacity, added a sustained mode against a paired baseline, and made "where the push dies" an observation rather than a script.
7. **Engine first, then the bench.** a9 leans engine-first and would accept either order. The engine's headless behavioral tests land with it, so the rewrite isn't unguarded while the bench waits.
8. **Biosynthetic demand moves into the engine,** not growth: precursors leave the map on terminal spurs, with an ATP-demand dial and a growth dial.
9. **The realism improvements:** the window onto the cell at true proportions, the stated slowdown, one model clock. Codex reshaped the window: centre states and concentrations are authoritative, drawn centres and pool molecules are representative samples, and threads draw coupling, not trajectories.
10. **Energetics belongs to the engine:** one milestone, developed as a core phase and a membrane-energetics phase.
11. **Named preparations** answer decision 3. The specimens are named for the preparations the canonical experiments used; *Synechocystis* is the one intact cell.
12. **The smaller points stand,** with two changes from Codex. Oxygen's rule on Krebs and PDH stays in milestone 0.5, since dropping it before compartments exist would let cytosolic LDH keep the matrix's cycle turning in anoxia. Minimal compartments (volumes, boundaries, reservoir exchanges) move into the engine's first phase; transporter anatomy stays in milestone 3.
