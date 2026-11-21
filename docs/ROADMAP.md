# Lumen: roadmap

## What steers it

- Lumen is a live, causal, observational sandbox of a form of life: you change something and watch the organism answer. There is no record, checkpoint or replay, and no control run beside an environmental change; only a poison gets a ghost of the unpoisoned cell beside it.
- The north star is a cyanobacterium living through its day, turning light and CO₂ into more of itself. The other cells are comparative cuts on the same engine.
- Cells are archetypes ("a cyanobacterium", "an animal cell"), not species. Behaviour that adds to the textbook reading without complicating it enters freely; identity detail that only complicates it stays out (the cyanobacterium keeps the textbook Krebs ring and L-lactate).
- A pathway enters when a behaviour that defines the archetype needs it, not for completeness.
- The clock spans the cell's own time, from turnovers you can follow to a day in a minute and a half.
- Classic behaviours are headless tests, not visitor setups. Bench experiments that need a preparation, an instrument or an isotope (Kok's flashes, Emerson, Kautsky, Chance & Williams, Jagendorf, Racker & Stoeckenius, Hill, Calvin's pulse) are set aside.

## Next, in order

1. **The day.** Light as a function of time: the sun's arc, then a cloud passing that the cell rides out on its reserves. Photoprotection at noon: the orange carotenoid protein on the phycobilisome (Kirilovsky & Kerfeld 2016, 10.1038/nplants.2016.180) and NPQ on the chloroplast's lumen pH. Fluorescence drawn as photons leaving PSII, more of them while its centres are closed. Target: turn the clock past 1× and watch ATP and Δp rise through the morning, quenching at noon, glycogen swelling in its station and respired overnight, and a cell alive at dawn.
2. **The flagship made whole.**
   - The CCM: bicarbonate transporters and the CO₂-uptake NDH-1 complexes (NDH-1₃ and NDH-1₄, separate from the respiratory NDH-1: Ohkawa et al. 2000, 10.1074/jbc.M003706200), then the carboxysome, carbonic anhydrase and RuBisCO behind a shell larger than the window, so the cut shows part of it (Price et al. 2008, 10.1093/jxb/erm112). Target: internal CO₂ stays high at full sun instead of falling to about 3 µM.
   - Photorespiration, which matters where the CCM fails and gives the O₂ dial meaning for a plant.
   - Transport as anatomy: fare zones and out-of-station interchanges for ANT (exporting ATP spends Δψ), the phosphate carrier, MPC, the malate–aspartate shuttle, the citrate carrier and the chloroplast's triose-phosphate translocator, with the carboxysome's shell and the CCM's transporters as the cyanobacterium's boundaries. NADH stops crossing membranes for free.
3. **Growth.** "To the cell" spurs on the map for what biosynthesis takes, a live budget of where the carbon is going now (respired, stored, fermented, grown; a readout, not a ledger), and a cell that grows and divides, the cyanobacterium first. The locator could become a Goodsell whole-cell section that elongates and divides.
4. **Side track: poisons**, any time. Cyanide at a₃, rotenone at complex I's Q site, antimycin at Qᵢ, oligomycin in F₀, DCMU at Q_B, FCCP or DNP across the bilayer, each drawn bound in the zoom layer with a ghost of the unpoisoned cell on Fig. 2; nigericin and valinomycin trading Δψ for ΔpH. Then a mitochondrial stress test with named poisons (Brand & Nicholls 2011, 10.1042/bj20110162), and superoxide tied to reverse electron transport, so reoxygenation after anoxia raises it as observed (Chouchani et al. 2014, 10.1038/nature13909).

Later or optional: Custom as a kit (complexes knocked out and drawn absent; bacteriorhodopsin and ATP synthase alone make ATP in light); label and chase, which needs validated atom mappings; one click per drawn turnover of a chosen complex.

## Open questions

- **The branch point.** The cyanobacterium's pyruvate kinase is keyed on RuBP as a stand-in for PirC and PII (Orthwein et al. 2021, 10.1073/pnas.2019988118; Forchhammer & Selim 2020, 10.1093/femsre/fuz025), which read carbon and nitrogen. Below about a fifth of full sun it starves growth and dim light is bistable between growing and storing; a lower threshold brings back the relaxation oscillation it was keyed to stop. It needs regulation that reads the cycle's surplus or the cell's carbon and nitrogen, and the light switch should read ferredoxin's supply rather than the light, which the day's photoprotection may settle.
- **Twilight's energy charge.** FBPase's AMP brake (the liver enzyme's) stands in for an energy homeostat: without it 2–3% sun falls into a Calvin–pentose-phosphate cycle at an energy charge of 0.4. Between 40% and 42% sun the energy charge still cycles (0.76–0.88, about 106 s), and from 40% to 44% pyruvate climbs to 16–20 mM behind a PDH held by acetyl-CoA.
- **The store** gains about 850 mM of glucosyl units a day with nothing to dilute it, since growth neither enlarges the cell nor accounts its products. Growth (3) or a store that feeds back on photosynthesis would bound it.
- **Dimming briefly raises gross fixation** while net uptake falls, as internal CO₂ climbs. Whether the missing CCM causes it takes an ablation-and-rescue comparison once a CCM exists.
- **The chloroplast's poise.** Its NADP is nearly all reduced at full sun, undiagnosed. Test capacities and sinks before reaching for linear flow's textbook ATP/NADPH ratio.
- **The animal cell's lipid.** With no lipid store it burns about 90% of the fatty acid it makes, and without fat in its medium it grows at about a quarter of its dial until its glucose runs out. The composite cell's fatty-acid synthesis and β-oxidation share a compartment and cycle at C4, so it doesn't grow. Fatty-acid synthesis runs on acyl-CoA, not ACP.
- **The night's budget** (maintenance demand, the mid-morning store, the thylakoid's leak) is illustrative and sets how long a night lasts, and several capacities and constants were calibrated toward the night's targets. Survival doesn't confirm them.
- **Smaller gaps.** A deletion isn't one switch (mutants would need gene-to-reaction mapping). Fig. 2's O₂ is PSII's gross production, not net exchange, and the hold's steady state checks fluxes only. There are no populations of centre states, and membrane centres read net turnover. The halophile has nothing to run on in the dark; arginine fermentation would give it a night (Hartmann et al. 1980, 10.1073/pnas.77.7.3821). IF1 is a Δp gate where AtpΘ and CF₁ are brakes. The pulse's size and fade and the hold's 10% are first guesses.
- **Calibration and parameters.** Most kinetic constants and pool sizes are illustrative; SABIO-RK's constants and measured pools should replace them, and the light curve's shape should be plausible for each form of life. The biomass row is E. coli's core composition in every cell.
- **Throughput.** New pathways add rows and stiffness; profile before rewriting the dense solver.
- **The legend's density.** A day condition and growth's readouts need room in a 280–320 px column.
