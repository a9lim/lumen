# Lumen: where it could go

Three ideation rounds so far. Round 1 (2026-10-24, against `c09cca0`) found the model's faults and set the north star. Round 2 (2026-10-25, against `69658c2`) designed the engine. Round 3 (2026-10-27, against `e30d90d`) audited what was built and proposed a record-centred bench; a9 declined the record the same day and returned the cells to archetypes, and the roadmap below is the one decided. All three rounds' decisions are at the end. Each round had two independent reads: Claude's, and Codex's, briefed without Claude's ideas. In round 3 Codex also reviewed the synthesis adversarially (gaslamp thread `lumen-roadmap-round3-codex`: jobs `cx-20261027-133835-8b57` and `cx-20261027-135312-6ee7`), and its corrections are folded in. Where the reads agree, that is noted. Every reference below was checked against Crossref on the day it was added. Tags: **[standard]** is textbook or published science, **[synthesis]** is our combination of it, **[speculative]** is a bet.

The faults rounds 1 and 2 listed are fixed, and the engine they designed is built, except where round 3 says otherwise below. AGENTS.md describes the result; this file's history keeps the old lists.

## Where it stands

- **Built.** Milestones 0 (respiratory control, the conservation leaks), 0.5 (the presets' biology) and 1 (the engine, phases A and B), then three visual passes (the plate; the pools as molecules and Goodsell closer; the legend, Fig. 2 and the phone folio) and polish rounds.
- **The engine.** Six cells of 31 to 115 reactions over 39 to 108 species, BiGG-identified and balanced (the biomass row, a sink, excepted), eQuilibrator's ΔG'°, separable rates, Δψ and ΔpH, per-cell c-rings, ROS and damage with consequence, integrated by ROS2. 28 headless tests (23 s).
- **What a visitor can do.** Pick a specimen; set light, O₂, ATP demand, growth or export, the uncoupler and the slowdown; knock out lines; feed the medium; pulse, inhibit or hold any enzyme and read its rate as a budget; watch Fig. 2 (the last two minutes) or the live Z-scheme.
- **Throughput.** After the 40 s warm-up, on one core of an M5 Max in node, model seconds per wall second: cyanobacterium 370, animal cell 175, anaerobe 1,350, chloroplast 520, halophile 520, composite 175 (both reads measured the same). Steps sit at the cap, `HMAX` = 0.05 s.

## What round 3 found

Ranked by how much each misteaches. Every number is a headless probe at `e30d90d`. a9's decisions (13–14) set aside finding 4 (identities, kept as simplifications) and the experimental half of findings 7 and 8; the step cap and `HMAX` still matter to the day.

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

## The thesis, as decided

Round 3 proposed time, comparison and destinations, with a record at their centre: model-time traces, checkpoints, paired controls and provenance, so the classic experiments could be run and shared. a9 declined the record (decision 13). Lumen is a live, spontaneous model of a form of life: a causal, observational sandbox, where you change something and watch the organism answer. Its rigour is in the chemistry, not in bookkeeping about the chemistry. Three principles follow:

- **Watch it happen.** Everything happens live, on the plate, while you watch. There's no record to replay and no control run beside an environmental change: the light, the oxygen and the day are the organism's life, not treatments. A poison is the one exception. It is a treatment, so a ghost of the unpoisoned cell may run beside it (a9).
- **Archetypes, not species.** Each cell is an abstract model of a form of life, "a cyanobacterium" or "an animal cell", as the earliest Lumen had it (a9). The rule for what enters is a9's (decision 16): behaviour that adds to the textbook reading without complicating it is added freely, as when a cyanobacterium respires its glycogen at night and concentrates CO₂ by day. Identity detail that only complicates the reading is left out: the cyanobacterium keeps the textbook Krebs ring, and its lactate stays L. Parameters measured in a representative species (*Synechocystis*'s c-ring and pools, *Halobacterium*'s potentials) serve the archetype.
- **The clock spans the cell's own time.** It runs from 300× slower, where turnovers are visible, to a thousand or more times faster, where a day or a doubling fits in a few minutes. The plate already thins its turnovers as the clock speeds up, and at 1,000× Fig. 2's two minutes of wall time hold more than a day (Claude's; confirmed in decision 16).

## North star

Reframed by decision 14: **a cyanobacterium living through its day**, turning light and CO₂ into more of itself, drawn molecule by molecule and live, with the other archetypes as comparative cuts on the shared engine. It is no longer a named strain on a bench. The classic behaviours stay as headless tests that hold the model honest, but they aren't setups for a visitor.

## Roadmap

As decided in round 3 (decisions 13–17): three milestones, the day and night, the flagship made whole, then growth. Poisons are a side track: instructive, but not the main line.

**2. Day and night**, with the clock it needs.
- The clock first. The slowdown dial runs on past life into speed-ups, to about 1,000× faster: at 30× a day takes 48 wall hours, at 1,000× under a minute and a half. The engine has to keep up. `advance` completes, or says it didn't; today a call silently stops after 5,000 steps. `HMAX` rises where the state is slow, with convergence checks. The engine moves into a worker if the main thread can't hold the speed: one core runs 175–370 model seconds a second today, with steps capped at 0.05 s. Fig. 2's axis says how much model time its span holds.
  - *Built 2026-10-27.* The clock is one dial from 300× slower to 1,000× faster. The integrator steps up to 60 s where the error allows (0.05 s while a pulse fades), past the picture's time, and the picture is the straight line between its last two steps, so it is smooth at any speed and keeps every conservation law. A change from outside pins the integrator back to the picture, so a pulse at 300× slower answers at once rather than when a minute-long step comes due. Against a tight reference (`hmax` 0.05, `rtol` 2e-4) the worst drift over 23 minutes of light, dark, anoxia and a pulse is 1.3%, halving with the tolerance. Steady states run at 22,000 (animal cell) to 630,000 (halophile) model seconds a second, and 60 s after a switch costs at most 87 ms. So no worker was needed: the chemistry gets 8 ms a frame, drops what it can't reach, and the caption gives the clock's real speed while it lags. Fig. 2's axis reads in the cell's time (−4 s at 30× slower, −33 h at 1,000× faster). The unused event queue is gone.
- The night, against qualitative targets for each archetype. The cyanobacterium respires its glycogen at night, mostly through the oxidative pentose phosphate pathway into NDH-1; it survives the night; it ferments only without oxygen. Dimming slows it without starving it. The chloroplast turns RuBisCO off at night and exports from starch. Where the cell misses a target, find which route, demand or capacity is wrong, and test that first (round 3, findings 1 and 5; Codex's caution).
  - *Built 2026-10-27.* Each cause was found by ablation before anything changed, and most were mechanisms, not parameters:
    - **Glycogen's equilibrium.** Glycogen sat in its reactions' mass-action ratio, so phosphorylase ran backward by day (−0.07 mM/s, the store's real filling route) and pushed forward at night. It is now a `polymer`: its amount enters saturation, not equilibria.
    - **Ferredoxin's partners.** FNR alone bound oxidized ferredoxin weakly; NDH-1, cyclic flow and the flavodiiron outlet were product-inhibited ~14× by a pool 95% oxidized, so FNR took every electron and the ATP-making routes starved. Alone this took 30% sun from EC 0.31 to 0.87.
    - **Storage as a store.** AGPase needs 3-PGA; phosphorylase opens with AMP and light shuts it.
    - **What runs at night that shouldn't.** The Calvin cycle refixed the pentose pathway's CO₂ through PRK (CP12 now holds it); FBPase cycled against PFK (light-gated now); PEP synthetase cycled against PK (AMP holds it); the two GAPDHs and NNT made a proton-leaking transhydrogenase loop.
    - **The night's budget.** The ATP demand (0.4 mM/s) was set for the day; a maintenance demand of 0.05 and a quarter of the thylakoid's leak and counter-ion conductances (K⁺ is held, so they are standing leaks) let a 300 mM store last 12 h at 5% of the day's O₂ evolution.
    - **Anoxia.** ATP synthase split ATP to hold Δp near its equilibrium (vf 1.83 against vb 1.87); no Δp gate could tell that from the aerobic dark, 13 mV apart. AtpΘ became a `brake` on the reaction's own e^(ΔG/RT), half bound at −3 kJ/mol. G6PDH's NADPH feedback steepened (Hill 4) so the pentose pathway's NADPH, which has no outlet without O₂, doesn't jam fermentation's NAD⁺.
    - **Dim light.** Thioredoxin's switch became cooperative (half set at 5% sun, as before) so dark enzymes are off by a fifth of full sun; the respiratory oxidase's capacity fell from 3 to 0.5 so it stops taking PSI's electrons; LDH binds pyruvate weakly (Km 1 mM). In the chloroplast, RuBisCO activase (ATP/ADP) and CF₁'s brake; its export had never worked (TPT's Pᵢ Km of 100 mM capped it at 5% of its dial), and the cytosol now keeps its triose low.
  - *Result.* Cyanobacterium: EC 0.90 at 30% sun and 0.89 at 10%, lactate ≈ 0; compensation between 3% and 10% sun; a 12 h night at EC 0.98–1.0 with glycogen 300 → ~90 mM, O₂ uptake 0.03 mM/s, G6PDH ≫ PFK, NDH-1 the main entry, no lactate; anoxic dark ferments at EC ~0.85 for hours with Δp collapsed, and O₂ restores EC 1.0 in 10 minutes. Two days of a sun arc pass through dawn and dusk at EC 0.82–0.89. Chloroplast: EC 0.95 at 30% sun, night EC 0.89 with a flat thylakoid, RuBisCO off, exporting 0.03 mM/s from starch. Holds now settle in every cell (30–80 ms). Five headless tests carry the targets; each fails on the engine before this.
  - *Codex's adversarial read* (thread `lumen-night-review`, job `cx-20261027-154008-a2c0`). It found the brake's algebra and the polymer's sound at a positive store, the brake stable at 60 s steps, and one bug: synthase run backward could spend an empty store, and clipping then made carbon. Fixed: the synthase needs a chain to build on in both directions (`KM_CHAIN`), with a conservation test. Its other points stand as caveats. The night's budget (maintenance demand ÷8, a mid-morning store, leak and conductances ÷4) is illustrative and sets endurance, so survival doesn't confirm it. PFK's and the oxidase's capacities and LDH's pyruvate Km are calibrated toward the targets, though each answers a mechanism found by ablation. Ferredoxin's partners' weak binding is FNR's value lent to them. The brake's −3 kJ/mol and fourth power are phenomenological. The chloroplast's night export as triose stands in for maltose and glucose. G6PDH's Hill 4, the storage regulation and the cooperative light switch are global: the animal cell's, anaerobe's and halophile's states are unchanged in the probes, but G6PDH's rate law differs (17% faster at the animal cell's starting state), and the composite cell inherits all of it.
  - *Left for the day.* With growth starved (milestones 3, 4) nearly all fixed carbon goes to the store: from the default start, 300 → 4,840 mM of glucosyl units over a 12-hour day, about 780 g/L against a dry weight of 300 g/L, still filling at dusk. The night test sets a 300 mM dusk store, so it doesn't test the day/night budget. Bounding the store (sink limitation feeding back on photosynthesis) or giving growth its carbon is the day's first question. *Answered the same day* by giving growth its carbon: milestone 3's allocation, brought forward (below). The chloroplast exports from starch faster than a clock-paced leaf; IF1 is still a Δp gate.
- The day itself: light as a function of time (the sun's arc, then a cloud passing), glycogen and starch filling and draining, photoprotection at noon (the orange carotenoid protein on the cyanobacterium's phycobilisome; NPQ on the chloroplast's lumen pH), and fluorescence drawn as photons leaving PSII. The theme's "follows sunlight" already points here.
- *What you see:* turn the dial past 1× and watch a day: the morning's ATP and Δp rising, the noon's quenching, glycogen swelling in the map's station, the night's respiration on it, and a cell that is still alive at dawn.

**3. The flagship made whole**, with transport.
- The CCM. Bicarbonate transporters, and the CO₂-uptake NDH-1 complexes (NDH-1₃ and NDH-1₄: Ohkawa et al. 2000), which share a core with the respiratory NDH-1 but are separate complexes, drawn and modelled on their own. Then the carboxysome: carbonic anhydrase and RuBisCO behind a protein shell, much larger than the window, so the cut shows part of it **[standard; the drawing is synthesis]**.
- Photorespiration, which matters where the CCM fails and is why the O₂ dial means something to a plant.
- Carbon and nitrogen allocation made explicit, so growth isn't starved at α-KG: its production and its consumption (GS–GOGAT *spends* 2-oxoglutarate) each qualified, with nitrogen moved out of the biomass row's folded costs (Forchhammer & Selim 2020; Codex).
  - *Brought into the day, 2026-10-27,* at a9's request: growth takes the day's carbon, and the store fills only with the surplus.
    - **Nitrogen.** Ammonium (held at 1 mM in the medium), its uptake, GS, GOGAT (on NADPH) and, in the animal cell, GDH, with eQuilibrator's ΔG'° (Codex, job `cx-20261027-155736-43f9`: −13.1, −50.6 and −36.4 kJ/mol). The biomass row takes 4.94 glutamate and 0.26 glutamine a gram and gives back 4.12 α-KG; GS takes 5.45 ammonium a gram and GOGAT 5.20 α-KG, so assimilation costs a net 1.08. GS reads α-KG over glutamine, as PII does, and glutamine holds it.
    - **Lipid.** The biomass row takes 0.25 mmol palmitoyl-CoA a gram (about 9% lipid, illustrative), and its lumped acetyl-CoA, NADPH and ATP no longer count fatty-acid synthesis. Acetyl-CoA carboxylase is switched by light and held by palmitoyl-CoA, or synthesis locked the CoA pool in acyl chains.
    - **What starved growth,** each found by ablation: the carboxylases bound CO₂ at 0.1 mM where it sits at µM (they take bicarbonate, now a 2 µM Km in its place); citrate synthase took the oxaloacetate α-KG needs (α-KG now holds it, as in *E. coli*, and α-KG dehydrogenase is minor); growth drained the glutamate and glutamine that make themselves (the row binds them loosely: 2 and 0.3 mM); glutamate held GOGAT as its product (Km 10 mM); the animal cell's α-KG went to α-KG dehydrogenase before GDH. PEP synthetase is gone from the cyanobacterium, and its lactate dehydrogenase opens only as NADH accumulates.
    - **Growth's own regulation.** It runs in the light and slows as ATP/ADP falls, so at night the cell keeps itself on its store. The dial is 0.2 /h, the fastest the cell can grow.
    - **Dim light.** Growth drained the Calvin cycle's 3-PGA through pyruvate kinase until RuBP collapsed, then let it recover: a relaxation oscillation, about 78 s at 20% sun, that slowed the integrator 100–1000×. Of the three cures probed (pyruvate kinase's capacity cut to 2: about 50% of the carbon to growth; a PEP-sigmoidal kinase: stable, but full sun starved; the kinase keyed on RuBP: stable except near 40%), a9 chose the RuBP key, labelled phenomenological: it stands for PirC and PII at the cycle's branch point (Orthwein et al. 2021), which read carbon and nitrogen, not RuBP. The glycolytic GAPDH, run forward by day, oxidized the triose the Calvin cycle's GAPDH makes, and NNT closed that loop on Δp at FNR's rate; light now holds it as it holds PFK.
    - **Dusk.** Near 40% sun the energy charge still cycled (0.72–0.88, every 170 s), and Codex found worse with the sun stepped each minute rather than each half hour: at every dusk, near 4% sun, it fell to 0.16 for five minutes. Both came from one switch serving both directions: in dim light the Calvin cycle and the night's pathways (G6PDH, phosphorylase, PFK) were each partly on, and as AMP rose at dusk phosphorylase poured glycogen into the pentose phosphate pathway while the Calvin cycle refixed its CO₂. Removing FBPase's AMP brake (the liver enzyme's, inherited) ended the band but let dim light fall to 0.15–0.35. The enzymes light turns off now have their own switch, half set at 1% sun and steep (I⁴), so they open only once the Calvin cycle has closed. The dusk collapse goes; phosphorylase's switch is each cell's, since the composite, whose demand outruns dim light, needs the gentler one (with the sharp one, sustained 3% sun took it to EC 0.18). The brake stays for deep twilight. The band doesn't go: between 40% and 42% sun the energy charge still cycles, 0.76–0.88 about every 106 s.
  - *Result.* At full sun growth runs at 66% of its dial (0.13 /h) at EC 0.92. Over a day with the sun stepped each five minutes, growth takes 63% of the carbon fixed (1.1 doublings), the store 27% and lactate 0.3%; glycogen goes 300 → 1,370 mM at dusk → 1,150 at dawn, and the lowest energy charge is 0.84 (the sun stepped each minute, read every five seconds). Nitrogen balances: ammonium in is nitrogen grown, and GS's flux equals it. The day test now steps the sun each five minutes and reads the energy charge each minute. 42 headless tests.
  - *Codex's adversarial read* (thread `lumen-allocation-adversarial`, job `cx-20261027-173203-8d41`). It verified the new rows' balance, the nitrogen identity (GS + GOGAT − GDH = ATP hydrolysis, exactly), the lipid arithmetic (seven ACC and FAS4–16 sum to 8 acetyl-CoA, 7 ATP and 14 NADPH a chain), positivity under empty and trace nitrogen pools and a 100 /h dial (at most 3 × 10⁻¹² mM of carbon from clipping), and the 40% diagnosis. Its findings: the dusk collapse (above); a dusk store read half an hour into the night; "each nitrogen spends an α-KG" (the net is 1.08 of 5.45); `factors()` leaving out a demand row's regulation and saturation, and `capacity()` reporting a demand row's Vmax rather than its dial (both fixed); and the shared changes' reach into the chloroplast, which now exports 26% more triose at full sun (0.103 mM/s) and about 76% of a day's fixation (69% before): accepted, since its store too should take only the surplus. A second look (job `cx-20261027-175619-2d2c`) confirmed the dusk fix and the demand rows' capacity and factors (528 checks, within 4 × 10⁻¹⁶), and found the composite stranded in sustained twilight by the sharper phosphorylase switch (now each cell's own), the band still at 40–42% (my probes had stepped over it), and the day's minimum at 0.84, not 0.87.
  - *Left.* Pyruvate kinase keyed on RuBP starves growth where light limits the Calvin cycle: below about a fifth of full sun growth stops and the store takes the carbon, and there dim light is bistable between growing and storing; a lower threshold brings the oscillation back. The branch point needs regulation that reads the cycle's surplus or the cell's carbon and nitrogen, and the light switch should read ferredoxin's supply rather than the light, with the day's photoprotection. FBPase's AMP brake is a stand-in: without it 2–3% sun falls to EC 0.4. Between 40% and 42% sun the energy charge cycles (0.76–0.88, about 106 s), and from 40% to 44% pyruvate reaches 16–20 mM. The store still gains about 850 mM a day, with nothing to dilute it. The animal cell grows only on its medium's palmitate (20–30% of its dial, 26% before, until it runs out after about 15 minutes): it makes no fatty acid; its lipogenesis needs citrate carried out of the matrix, which is this milestone's transport. The composite's fatty-acid synthesis and β-oxidation share a compartment and cycle at C4, so it doesn't grow.
- Transport as anatomy: fare zones and out-of-station interchanges on the map for ANT (exporting ATP spends Δψ), the phosphate carrier, MPC, the malate–aspartate shuttle and the chloroplast's triose-phosphate translocator, with the carboxysome's shell and the CCM's transporters as the cyanobacterium's own boundaries. NADH stops crossing membranes for free.
- *What you see:* part of a carboxysome under the thylakoid, CO₂ no longer drawn down to 2 µM at full sun, carriers as interchanges with their costs, and a growth dial the cell can meet.

**4. Growth.** Biosynthesis that accumulates: the "to the cell" spurs round 2 promised, a live budget of where the carbon is going, allocation between the cell's demands, and a cell that grows and divides (in the cyanobacterium first). The locator could become the whole cell that does it.

**Side track: poisons** (any time; secondary). Named poisons with their mechanisms, drawn bound at their sites in the zoom layer: cyanide at a₃, rotenone at complex I's Q site, antimycin at Qᵢ, oligomycin in F₀, DCMU at Q_B, and FCCP or DNP carrying protons across the bilayer. The ionophores nigericin and valinomycin split Δp's parts. Each has a ghost of the unpoisoned cell on Fig. 2, the one paired control. Superoxide tied to reverse electron transport would complete the reoxygenation story (Chouchani et al. 2014), tested against its observations.

A whole cell predicted from its genome is still a research programme (Codex, round 1). A live, honest model of how a form of life runs its day is achievable, and is the point.

### Behaviours the archetypes should show

The classic behaviours, kept as headless tests rather than visitor setups. Each lands with the milestone that gives it its parts.

| Behaviour | What the model must do | When |
|---|---|---|
| Respiratory control | ADP or demand speeds O₂ use; its lack slows it; an uncoupler releases it | built |
| The Pasteur effect | anoxia speeds glycolysis and fermentation in the animal cell | built |
| A stress test (Brand & Nicholls 2011) | oligomycin, an uncoupler, then rotenone and antimycin read as basal, ATP-linked, leak, highest and residual respiration | runs today with generic cuts; named poisons on the side track |
| The night | the cyanobacterium respires glycogen, survives until dawn, ferments only in anoxia | built (tests) |
| The day | storage fills by day and drains by night; noon's excess light is quenched | 2 |
| The dim-light refixation [synthesis] | with no CCM, gross fixation rises while net CO₂ uptake falls when light dims | runs today; 3 changes it |
| Carbon concentration | with a CCM, internal CO₂ stays high at full sun | 3 |
| Reoxygenation (after Chouchani et al. 2014) | succinate accumulates in anoxia, and reoxygenation reverses complex I | half runs today; RET superoxide on the side track |
| Growth | the cell meets a growth demand it can afford, and its carbon accumulates somewhere | 3, 4 |

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
- **Throughput.** A day at 1,000× needs about three times what one core manages today at the step cap. Slow phases can take longer steps; profile before rewriting the dense solver (Codex).
- **Calibration.** "% sun" multiplies illustrative capacities. That's fine for an archetype's day, but the light curve's shape (where the cell saturates) should be plausible for the form of life.
- **The legend's density.** A day condition and growth's readouts need room in a 280–320 px column, and they still show rather than tell.

## What it outright lacks

Round 1's list, less what was built and what round 3 set aside:

- **What metabolism is for**: motility on Δp, ion pumping, and biosynthesis that becomes amino acids, nucleotides, lipids and enzymes. The ATP demand dial stands in for all of it.
- **Compartments and transport** as anatomy: the carriers exist chemically but aren't drawn, and NADH crosses no membrane in the cells without one.
- **A real environment**: CO₂ as a condition, light that changes through a day, buffered or finite nutrients beyond feeding.
- **Pathways**: photorespiration, the CCM, nitrogen assimilation, the glyoxylate shunt, real fatty-acid synthesis on ACP, photoprotection, the halophile's arginine fermentation (Hartmann et al. 1980), which would give it a night.

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
