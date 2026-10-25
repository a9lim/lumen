// Organism presets — what the margin says of each: its description, and why
// a line it lacks is missing. Each preset's chemistry is its cell in
// src/engine/cells.js (reactions, compartments, pools, environment), and its
// membrane is its specimen in specimens.js.
export const ORGANISMS = {
    cyanobacterium: {
        name: 'Cyanobacterium',
        desc: 'Photosynthetic prokaryote; it makes fatty acids but cannot burn them, and stores glycogen',
        // von Berlepsch et al. 2012: a functional β-oxidation pathway appears to be missing in cyanobacteria
        lockedReason: {},
    },
    animalCell: {
        name: 'Animal Cell',
        desc: 'Heterotrophic: glycolysis in the cytosol, the Krebs cycle and β-oxidation in the mitochondrial matrix',
        lockedReason: { calvin: 'Animal cells lack RuBisCO and photosystems' },
    },
    obligateAnaerobe: {
        name: 'Obligate Anaerobe',
        desc: 'Fermentation only — no respiratory chain; its ATP synthase runs backward to keep a gradient',
        lockedReason: {
            calvin: 'No photosynthetic machinery',
            krebs: 'Fermenters run no complete Krebs cycle: nothing would take its NADH',
            betaox: 'Without an electron acceptor, a fermenter can’t burn fat',
        },
    },
    plantChloroplast: {
        name: 'Plant Chloroplast',
        desc: 'Light reactions and the Calvin cycle; at night, starch through glycolysis and the PPP on the cytosol’s ATP',
        lockedReason: { krebs: 'The Krebs cycle runs in the mitochondria' },
    },
    archaeon: {
        name: 'Archaeon',
        desc: 'Uses bacteriorhodopsin for light-driven proton pumping; it lives on amino acids, not sugar',
        lockedReason: {
            calvin: 'No photosynthetic carbon fixation',
            // Halobacterium lives on amino acids; it can't catabolize glucose to pyruvate (Todor et al. 2015)
            glycolysis: 'Halobacterium can’t break glucose down to pyruvate',
            ppp: 'Without glycolysis, no sugar phosphates for it to run on',
        },
    },
};
