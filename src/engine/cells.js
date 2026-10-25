// Cells — what each preset's organism is made of, for the engine: which of
// network.js's reactions it has, its compartments and their volumes, the
// redox potentials of its membrane carriers, and the sizes of its conserved
// pools. Volumes are relative to the cytosol; only their ratios matter to
// the chemistry (the window onto the cell has its own, in window.js).
//
// Pool sizes are totals of each conserved moiety, mM in its compartment, and
// tagged with where they come from: 'measured' (with the source), or
// 'illustrative' where no measurement for that organism was at hand.

// ─── Reaction sets ───
const GLYC = ['HEX1', 'PGI', 'PFK', 'FBA', 'GAPD', 'PGK', 'PGM', 'ENO', 'PYK'];
const PPP_OX = ['G6PDH', 'PGL', 'GND'];
const PPP_NONOX = ['RPI', 'RPE', 'TKT1', 'TALA', 'TKT2'];
const CALVIN = ['RBPC', 'PRUK', 'SBA', 'SBP', 'FBP', 'GAPDP'];
const KREBS = ['CS', 'ACONT', 'ICDH', 'AKGDH', 'SUCOAS', 'SDH', 'FUM', 'MDH'];
const BETAOX = [16, 14, 12, 10, 8, 6, 4].flatMap(n => ['ACAD' + n, 'ECH' + n, 'HACD' + n, 'KAT' + n]);
const FAS = ['ACC', 'FAS4', 'FAS6', 'FAS8', 'FAS10', 'FAS12', 'FAS14', 'FAS16'];
const RESP = ['NDH1', 'CYTBF', 'CYTOX'];
const PHOTO = ['PSII', 'CYTBF', 'PSI', 'FNR', 'CEF'];
const STORE = ['GLGS', 'GLGP'];
const HOUSE = ['ADK', 'PPA', 'ATPM', 'ATPS', 'LEAK', 'EX_pi', 'EX_co2'];
const MATRIX = ['MPC', 'ANT', 'PIC', 'MAS', 'OAAX', 'CPT', 'ADKm', 'PPAm'];

const uniq = (...lists) => [...new Set(lists.flat())];

// Midpoint potentials of the membrane carriers, V at pH 7 (Codex's retrieval,
// gaslamp job cx-20261025-142319-f749): the quinone pool, the soluble carrier
// in the lumen (plastocyanin, cytochrome c, halocyanin) and ferredoxin
const E_PQ = 0.080, E_UQ = 0.045, E_PC = 0.370, E_CYTC = 0.260, E_FD = -0.428;

export const CELLS = {
    cyanobacterium: {
        name: 'Synechocystis sp. PCC 6803',
        reactions: uniq(HOUSE, GLYC, PPP_OX, PPP_NONOX, CALVIN, STORE, KREBS, FAS, RESP, PHOTO,
            ['PPS', 'PPC', 'PDH', 'LDH', 'EX_lac', 'EX_glc', 'EX_o2', 'NNT']),
        compartments: { c: 1, l: 0.1 },
        potentials: { q: E_PQ, pc: E_PC, fd: E_FD },
        pools: {
            // Ito, Watanabe & Osanai 2023 (10.1093/plphys/kiad580): NADP 2.8 mM against NAD 2.3 mM
            c: { nad: [2.3, 'measured'], nadp: [2.8, 'measured'], adenine: [3, 'illustrative'], coa: [1, 'illustrative'] },
        },
    },
    animalCell: {
        name: 'Animal cell',
        reactions: uniq(HOUSE, GLYC, PPP_OX, PPP_NONOX, KREBS, BETAOX, RESP, MATRIX,
            ['G6PP', 'FBP', 'PC', 'PPCK', 'PDH', 'LDH', 'ADH', 'ALDH', 'ACS', 'FACS', 'EX_lac', 'EX_glc', 'EX_fa', 'EX_etoh', 'EX_ac', 'EX_o2', 'NNT', 'UCP']),
        compartments: { c: 1, m: 0.2, l: 0.02 },
        potentials: { q: E_UQ, pc: E_CYTC, fd: E_FD },
        pools: {
            c: { nad: [0.5, 'illustrative'], nadp: [0.1, 'illustrative'], adenine: [5, 'illustrative'], coa: [0.1, 'illustrative'] },
            m: { nad: [3, 'illustrative'], nadp: [0.5, 'illustrative'], adenine: [8, 'illustrative'], coa: [2, 'illustrative'] },
        },
    },
    obligateAnaerobe: {
        name: 'Obligate anaerobe',
        reactions: uniq(HOUSE, GLYC, PPP_OX, PPP_NONOX, ['PDC', 'ADH', 'EX_etoh', 'EX_glc', 'NNT']),
        compartments: { c: 1, l: 0.1 },
        potentials: { q: E_UQ, pc: E_CYTC, fd: E_FD },
        pools: { c: { nad: [2.6, 'illustrative'], nadp: [0.12, 'illustrative'], adenine: [5, 'illustrative'], coa: [1, 'illustrative'] } },
    },
    plantChloroplast: {
        name: 'Chloroplast',
        reactions: uniq(HOUSE, GLYC, PPP_OX, PPP_NONOX, CALVIN, STORE, FAS, PHOTO, ['PDH', 'TPT', 'EX_o2']),
        compartments: { c: 1, l: 0.1 },
        potentials: { q: E_PQ, pc: E_PC, fd: E_FD },
        pools: { c: { nad: [0.5, 'illustrative'], nadp: [1, 'illustrative'], adenine: [2, 'illustrative'], coa: [0.5, 'illustrative'] } },
    },
    archaeon: {
        name: 'Halobacterium salinarum',
        // Menaquinone and halocyanin. No glycolysis (Todor et al. 2015), so no sugar phosphates for a
        // pentose phosphate pathway to run on; without anaplerosis the Krebs cycle keeps its intermediates
        reactions: uniq(HOUSE, KREBS, BETAOX, RESP, ['PDH', 'FACS', 'EX_fa', 'EX_o2', 'BR']),
        compartments: { c: 1, l: 0.1 },
        potentials: { q: -0.074, pc: 0.183, fd: E_FD },
        pools: { c: { nad: [2, 'illustrative'], nadp: [0.5, 'illustrative'], adenine: [4, 'illustrative'], coa: [1, 'illustrative'] } },
    },
    custom: {
        name: 'Composite cell',
        reactions: uniq(HOUSE, GLYC, PPP_OX, PPP_NONOX, CALVIN, STORE, KREBS, BETAOX, FAS, RESP, PHOTO,
            ['G6PP', 'PC', 'PPCK', 'PPS', 'PPC', 'PDH', 'LDH', 'PDC', 'ADH', 'ALDH', 'ACS', 'FACS',
             'EX_lac', 'EX_glc', 'EX_fa', 'EX_etoh', 'EX_ac', 'EX_o2', 'NNT', 'UCP', 'BR']),
        compartments: { c: 1, l: 0.1 },
        potentials: { q: E_PQ, pc: E_PC, fd: E_FD },
        // Bennett et al. 2009 (10.1038/nchembio.186), E. coli on glucose: ATP 9.6, ADP 0.56, AMP 0.28 mM;
        // NAD⁺ 2.6, NADH 0.083; NADP⁺ 0.0021, NADPH 0.12
        pools: { c: { nad: [2.68, 'measured'], nadp: [0.122, 'measured'], adenine: [10.4, 'measured'], coa: [1.5, 'illustrative'] } },
    },
};
