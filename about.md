---
name: Lumen
title: Lumen — Interactive Cellular Metabolism Simulator
description: Pulse the enzymes of a kinetic model of cellular energy metabolism (glycolysis, the Krebs and Calvin cycles, electron transport, ATP synthase) and watch flux, cofactor pools and the proton gradient answer, in five organisms.
updated: 2026-10-25
---

# Lumen — Interactive Cellular Metabolism Simulator

Lumen is a browser-based model of a cell's energy metabolism. Each organism preset is a kinetic model: its metabolites and cofactors are concentrations, its reactions run at rates set by thermodynamics, saturation and regulation, and an implicit integrator advances them in model time. The figure is a window onto that model. Above, the cell's membrane is drawn in cross-section with the cofactor pools under it; below, its carbon network is drawn as a transit map. The chemistry runs slowed (30× by default; 300× to 3×), and the caption states by how much.

## The Model

Every chemical is named by its BiGG identifier, and its formula and charge come from BiGG's *E. coli* model iJO1366. Each reaction is one enzyme's reaction, balanced in elements and charge, so opposing enzymes such as hexokinase and glucose-6-phosphatase, or phosphofructokinase and fructose-1,6-bisphosphatase, are separate reactions. β-oxidation is resolved by chain length from C16 to C4. Fatty-acid synthesis runs on its own enzymes. Conserved groups (adenine nucleotides, NAD, NADP, coenzyme A, the quinone pool and the protein carriers) are checked by tests: the network may hold no conservation law that was not specified.

Standard reaction free energies come from eQuilibrator (pH 7, ionic strength 0.25 M, pMg 3). Membrane reactions take theirs from the midpoint potentials of their carriers, and the photosystems from the energy of the photons they absorb. Every cycle's free energies sum to zero.

Each rate is the product of a capacity, a regulation factor, a saturation factor (convenience kinetics) and a thermodynamic factor, 1 − e^(ΔG/RT) (the separable form of Noor et al. 2013). A reaction therefore stops at equilibrium and never runs against its ΔG; more enzyme makes it faster but cannot move its equilibrium. Regulation is smooth: ATP, citrate, NADH/NAD⁺ and other effectors slow or speed their enzymes, and light switches the Calvin cycle's enzymes on through thioredoxin. ATP demand, growth and the chloroplast's export of sugar to its cell are dials. Growth draws on the precursors of an *E. coli* core biomass composition and runs at the pace of the scarcest.

The system is stiff, so it is integrated by a linearly implicit Rosenbrock method (ROS2) with a sparse Jacobian. Its steps keep every conservation law exactly. A trajectory depends only on model time, not on how frames slice it, and the tests check this.

## Membrane Energetics

The proton-motive force Δp is set by what the membrane has moved: net charge across mitochondrial and bacterial membranes, protons across thylakoids. Each charge a reaction moves into the lumen costs F·Δp in its free energy. So the gradient pushes back on its pumps without a separate rule. With little ADP the gradient rises until the respiratory chain nearly stalls, and NADH goes unburned; adding ATP demand lets ATP synthase drain the gradient and the chain runs faster. This is respiratory control, and it emerges from the thermodynamics. ATP synthase runs whichever way its ΔG says: forward when four protons' worth of Δp exceeds the free energy of making ATP, backward otherwise, splitting ATP to pump protons as the fermenting anaerobe does. The mitochondrial synthase is braked against running backward by IF1, the photosynthetic ones by the dark. Uncoupling protein adds a conductance that collapses Δp and speeds respiration.

Linear photosynthetic flow runs from water at PSII through plastoquinone, cytochrome b₆f and plastocyanin to PSI, ferredoxin and FNR, which reduces NADP⁺. Cyclic flow returns PSI's electrons to plastoquinone. Where the Calvin cycle cannot take the electrons, they go to oxygen (the water–water cycle). Bacteriorhodopsin pumps a proton per photon.

## Organisms

Five presets each put their own organism and membrane under the microscope:

- **Cyanobacterium:** a thylakoid with phycobilisomes, where respiration and photosynthesis share plastoquinone, cytochrome b₆f and plastocyanin. It fixes CO₂, stores glycogen, makes fatty acids and ferments to lactate without oxygen.
- **Animal cell:** a mitochondrial crista. Glycolysis runs in the cytosol, and the Krebs cycle, β-oxidation and the respiratory chain run in the mitochondrial matrix, joined by lumped carriers (pyruvate, ADP/ATP, phosphate, the malate–aspartate shuttle). Without oxygen it ferments to lactate.
- **Obligate anaerobe:** a plasma membrane under a peptidoglycan wall, with no chain at all. It ferments to ethanol, and its ATP synthase runs backward to keep the membrane energized.
- **Plant chloroplast:** a thylakoid with photosystem II in a stacked granum and photosystem I and ATP synthase in the stroma lamella. Its medium is the plant cell's cytosol, which supplies ATP at night and takes triose phosphate by day. It stores starch.
- **Archaeon:** a halophile's purple membrane, where bacteriorhodopsin alone powers ATP synthesis in the light.

Custom shows a composite membrane with all fourteen complexes on a composite cell. Switching a line off knocks out its enzymes; a line the organism lacks is locked, with the reason.

## The Window

Panel a shows a fixed slab of the cell: the drawn length of membrane, 16.5 nm of the space under it, 20 nm deep. The cofactor molecules drawn there are the slab's mean counts at the cell's concentrations, so the animal cell's matrix holds a few free NADH among many NAD⁺. FAD stays bound to its enzymes and is not drawn. The lumen's protons are drawn one per 2 mV of Δp, not counted, because almost all translocated protons are bound to buffers.

Each complex drawn is a representative centre turning over at its turnover number times the share of its capacity in use, slowed. Its turnovers are what moves: an electron (standing for a pair) entering at NDH-1, SDH or PSII waits on its carrier at each later complex until that complex turns over, which pumps that complex's protons, uses its oxygen or makes its NADPH. ATP synthase's rotor turns a third of a turn per ATP and its head shows the binding change. Above eight turnovers a second a centre is drawn one turnover in several, and the caption says so. When an enzyme on the map makes or spends a drawn cofactor, a dotted thread runs from the molecule it changed to the enzyme. Superoxide radicals appear where the chain leaks them and are cleared at the model's own rate. At 2.5× zoom each complex shows its cofactors, the sites electrons step between.

## The Verb

Clicking an enzyme on the map or a complex in the membrane pulses it: its activity rises fivefold and fades over about 1.5 s of model time. Right-clicking inhibits it the same way, and pulses stack. Watching where a push spreads and where it dies shows how control is shared. Holding an enzyme instead raises its activity by 10% and keeps it there. Lumen then runs two copies of the cell from that moment, one held and one not, until both reach a steady state. Each flux's response gives the enzyme's flux control coefficient over it (Kacser & Burns 1973): the fractional change in the flux per fractional change in the enzyme. Coefficients are reported only once a steady state exists, for the enzyme's own flux and for the cell's glucose uptake, carbon fixation, water splitting, oxygen use, ATP synthesis and growth.

## The Map

The carbon network is drawn as a transit map: glycolysis runs the corridor, the Calvin cycle runs back along it, the pentose phosphate pathway loops above, the Krebs cycle is a circle line and β-oxidation a loop. Line weight and train speed read each segment's carbon flux in mM of carbon per second, and the chevron trains point the way carbon runs. Each enzyme carries the cofactors it makes (+) or spends (−) as glyphs after its name. An enzyme held back by a regulator, or by the dark, shows the effector across the track: ⊣ inhibits, → is needed, dashed while it only slows the enzyme.

## Reactive Oxygen and Damage

Complex I and the Q-cycle leak superoxide, faster as Δp rises. Superoxide dismutase, catalase and glutathione peroxidase (which spends NADPH) remove it and its peroxide. What remains damages the membrane: the damage raises the proton leak and inactivates aconitase, and the membrane's lipids are drawn peroxidised in proportion. Repair spends ATP, so a cell without ATP stays damaged.

## Educational Use

The margin sets light and oxygen (as fractions of full sun and of air), ATP demand and growth, switches pathways and uncoupling, and adds glucose or fatty acid to the medium. The Stats tab opens on a live Z-scheme: each carrier at its midpoint potential, with the electrons in flight drawn on the carriers they have reached. Below it the inspector explains any enzyme's rate: its ΔG and the thermodynamic, saturation and regulation factors whose product sets it. The tab also shows the cofactor pools with sixty-second sparklines, Δp beside the Δp ATP synthesis needs, oxidative stress, ATP's sources and the cell's exchange with its medium. The canonical behaviours of bioenergetics follow from the model rather than from rules: respiratory control, the Pasteur effect (glycolysis speeds up when oxygen is removed), the effects of uncoupling, and the switch between light and dark metabolism.

## Accessibility

Lumen provides keyboard shortcuts, labeled controls, and light, dark and sunlight-following themes. The inspector's select and buttons reach every enzyme without a pointer. Line states carry patterns as well as color: switched-off lines are dashed, gates are dashed or barred, and trains are chevrons. With reduced motion requested, Lumen opens on a still frame and moves only after the first interaction.

## Limitations

Most kinetic parameters and many pool sizes are illustrative, not measured. Δp is one number per membrane; its electrical and pH components are not yet separated. Every ATP synthase has a twelve-subunit ring (four protons per ATP), and the halophile's is modeled as F-type. β-oxidation's electrons reach the quinone pool directly rather than through ETF. The animal cell makes no fatty acid, the halophile has no amino-acid metabolism, and the biomass composition is *E. coli*'s in every organism.
