// Organism preset configurations — pathway/environment combinations
// modeling real biological constraints (e.g. no Calvin in heterotrophs).
// lockedReason takes a line off the map; oneWay leaves it running only one
// way (a pathway the organism builds with but can't break down with);
// ferments says which fermentations regenerate its NAD⁺ without oxygen.
export const ORGANISMS = {
    cyanobacterium: {
        name: 'Cyanobacterium',
        desc: 'Photosynthetic prokaryote; it makes fatty acids but cannot burn them',
        pathways: { glycolysis: true, ppp: true, calvin: true, krebs: true, betaox: true },
        environment: { light: true, oxygen: true },
        initialRatios: { atp: 0.9, nadh: 0.1, nadph: 0.1, fadh2: 0.1 },
        // von Berlepsch et al. 2012: a functional β-oxidation pathway appears to be missing in cyanobacteria
        oneWay: { betaox: 'Cyanobacteria appear to lack β-oxidation: they make fatty acids but don’t burn them' },
        // Synechocystis in the dark without O₂: D-lactate (ddh), acetate, succinate, H₂; no native PDC
        ferments: { lactate: true, ethanol: false },
    },
    animalCell: {
        name: 'Animal Cell',
        desc: 'Heterotrophic — no photosynthesis or carbon fixation',
        pathways: { glycolysis: true, ppp: true, calvin: false, krebs: true, betaox: true },
        environment: { light: false, oxygen: true },
        initialRatios: { atp: 0.9, nadh: 0.1, nadph: 0.1, fadh2: 0.1 },
        lockedReason: { calvin: 'Animal cells lack RuBisCO and photosystems' },
        // No pyruvate decarboxylase: animal cells ferment to lactate
        ferments: { lactate: true, ethanol: false },
    },
    obligateAnaerobe: {
        name: 'Obligate Anaerobe',
        desc: 'Fermentation only — no oxidative phosphorylation',
        pathways: { glycolysis: true, ppp: true, calvin: false, krebs: false, betaox: false },
        environment: { light: false, oxygen: false },
        // Lower ATP ratio reflects reliance on substrate-level phosphorylation only
        initialRatios: { atp: 0.5, nadh: 0.5, nadph: 0.1, fadh2: 0.1 },
        lockedReason: {
            calvin: 'No photosynthetic machinery',
            krebs: 'Fermenters run no complete Krebs cycle: nothing would take its NADH',
            betaox: 'Without an electron acceptor, a fermenter can’t burn fat',
        },
        ferments: { lactate: false, ethanol: true },
    },
    plantChloroplast: {
        name: 'Plant Chloroplast',
        desc: 'Light reactions and the Calvin cycle; at night, starch through glycolysis and the PPP',
        pathways: { glycolysis: true, ppp: true, calvin: true, krebs: false, betaox: true },
        environment: { light: true, oxygen: true },
        // High NADPH reflects light-reaction output surplus
        initialRatios: { atp: 0.3, nadh: 0.1, nadph: 0.5, fadh2: 0.1 },
        lockedReason: { krebs: 'The Krebs cycle runs in the mitochondria' },
        oneWay: { betaox: 'Plant β-oxidation runs in peroxisomes; the plastid only makes fatty acids' },
        ferments: { lactate: false, ethanol: false },
    },
    archaeon: {
        name: 'Archaeon',
        desc: 'Uses bacteriorhodopsin for light-driven proton pumping',
        pathways: { glycolysis: false, ppp: true, calvin: false, krebs: true, betaox: true },
        // Light but no O2 — anaerobic photoheterotroph
        environment: { light: true, oxygen: false },
        initialRatios: { atp: 0.7, nadh: 0.2, nadph: 0.1, fadh2: 0.1 },
        lockedReason: {
            calvin: 'No photosynthetic carbon fixation',
            // Halobacterium lives on amino acids; it can't catabolize glucose to pyruvate
            glycolysis: 'Halobacterium can’t break glucose down to pyruvate',
        },
        // Without O₂ it lives on light (and arginine), not on fermenting sugar
        ferments: { lactate: false, ethanol: false },
    },
};

/** Custom: every pathway, every fermentation, no direction locked. */
export const CUSTOM = { ferments: { lactate: true, ethanol: true }, oneWay: {} };
