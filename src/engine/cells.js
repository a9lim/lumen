// Cells — what each preset's organism is made of, for the engine: which of
// network.js's reactions it has, its compartments and their volumes, the
// redox potentials of its membrane carriers, and the sizes of its conserved
// pools. Volumes are relative to the cytosol; only their ratios matter to
// the chemistry (the window onto the cell has its own, in window.js).
//
// Each cell is an archetype, an abstract model of a form of life rather than
// a species (VISION.md, decision 14). Measured values come from a
// representative of it: Synechocystis for the cyanobacterium, Halobacterium
// for the halophile, E. coli for the composite.
//
// Pool sizes are totals of each conserved moiety, mM in its compartment, and
// tagged with where they come from: 'measured' (with the source), or
// 'illustrative' where no measurement for that organism was at hand.
//
// Each cell also sets its environment (light 0–1 of full sun, O₂ and CO₂ as
// fractions of air), its medium (mM; finite, so substrates run out), its
// membrane (pmf: κψ, mV of Δψ per mM of charge moved, and κH, mV of ΔpH per
// mM of protons the lumen side gains, small where its buffers soak them up;
// share, Δψ's part of Δp at the start: engine.js), its ATP demand (mM/s), and
// kinetic overrides. How Δp divides at steady state is the ratio of two
// conductances, K⁺/H⁺ exchange over counter-ions: Δψ/ΔpH = g(KHE)/g(ION).
import { light, dark, act } from './rates.js';

// The Calvin cycle's intermediates, mM, for cells that start in the light, and a store of glycogen (or starch)
// as by mid-morning, glucosyl units: about 15% of the dry weight, enough for a night (illustrative)
const CALVIN_START = { rb15bp: 2, '3pg': 3, g3p: 0.2, f6p: 0.5, s7p: 0.3, r5p: 0.1, ru5p__D: 0.05, xu5p__D: 0.05, e4p: 0.05, glycogen: 300 };

// IF1: below about 60 mV the mitochondrial ATP synthase is held, so it can't drain the cell's ATP
const IF1 = { type: 'dp', K: 60, h: 4 };

// Membranes. Mitochondria and bacteria keep about four fifths of Δp as Δψ (about 150 of 180 mV, ΔpH
// 0.5); thylakoids nearly all as ΔpH, once counter-ions have let Δψ relax (Kramer et al. 2003; the
// lumen near pH 5.8 in the light). The conductances set the steady division (see above); in
// mitochondria the pyruvate and phosphate carriers spend ΔpH too, so their counter-ions run faster.
// ATP synthase's c-ring (ring: c subunits; ring/3 protons per ATP, model.js): c₈ in bovine mitochondria
// (Watt et al. 2010, 10.1073/pnas.1011099107), c₁₄ in spinach chloroplasts (Seelert et al. 2000,
// 10.1038/35013148) and in Synechocystis PCC 6803 (Pogoryelov et al. 2007, 10.1128/JB.00581-07, where
// cyanobacteria range from c₁₃ to c₁₅), c₁₀ in E. coli (Jiang et al. 2001, 10.1073/pnas.081424898),
// standing in for the anaerobe. The halophile's A-type ring is uncounted (its c subunit is a single
// hairpin: Casuso et al. 2010, 10.1016/j.bpj.2010.07.028); twelve is illustrative.
const PMF_ENERGIZED = { psi: 20, ph: 3, share: 0.8 };
const ION_ENERGIZED = { ION: { vmax: 0.0005 }, KHE: { vmax: 0.002 } };
const ION_MITO = { ION: { vmax: 0.0012 }, KHE: { vmax: 0.001 } };
const PMF_THYLAKOID = { psi: 20, ph: 0.6, share: 0.1 };
// K⁺ is held on both sides, so the counter-ions are standing conductances: small enough that in the dark,
// on respiration's few protons, they don't take most of them (Δψ relaxes in about 20 s)
const ION_THYLAKOID = { ION: { vmax: 0.0025 }, KHE: { vmax: 0.00075 } };

// ─── Reaction sets ───
const GLYC = ['HEX1', 'PGI', 'PFK', 'FBA', 'GAPD', 'PGK', 'PGM', 'ENO', 'PYK'];
const PPP_OX = ['G6PDH', 'PGL', 'GND'];
const PPP_NONOX = ['RPI', 'RPE', 'TKT1', 'TALA', 'TKT2'];
const CALVIN = ['RBPC', 'PRUK', 'SBA', 'SBP', 'FBP', 'GAPDP'];
const KREBS = ['CS', 'ACONT', 'ICDH', 'AKGDH', 'SUCOAS', 'SDH', 'FUM', 'MDH'];
const BETAOX = [16, 14, 12, 10, 8, 6, 4].flatMap(n => ['ACAD' + n, 'ECH' + n, 'HACD' + n, 'KAT' + n]).concat('ETFQO');
const FAS = ['ACC', 'FAS4', 'FAS6', 'FAS8', 'FAS10', 'FAS12', 'FAS14', 'FAS16'];
const RESP = ['NDH1', 'CYTBF', 'CYTOX'];
const ROS = ['ROSI', 'ROSQ', 'SOD', 'CAT', 'GPX', 'REPAIR'];
const PHOTO = ['PSII', 'CYTBF', 'PSI', 'FNR', 'CEF', 'MEHLER'];
const STORE = ['GLGS', 'GLGP'];
const HOUSE = ['ADK', 'PPA', 'ATPM', 'ATPS', 'LEAK', 'ION', 'KHE', 'EX_pi', 'EX_co2'];
// Cells that can make all of the biomass row's precursors take it
const GROW = ['BIOMASS'];
const MATRIX = ['MPC', 'ANT', 'PIC', 'MAS', 'OAAX', 'CPT', 'ADKm', 'PPAm'];

const uniq = (...lists) => [...new Set(lists.flat())];

// Midpoint potentials of the membrane carriers, V at pH 7 (Codex's retrieval,
// gaslamp job cx-20261025-142319-f749): the quinone pool, the soluble carrier
// in the lumen (plastocyanin, cytochrome c, halocyanin) and ferredoxin
const E_PQ = 0.080, E_UQ = 0.045, E_PC = 0.370, E_CYTC = 0.260, E_FD = -0.428;

export const CELLS = {
    cyanobacterium: {
        name: 'Cyanobacterium',
        // NDH-1 takes ferredoxin here, NDH-2 NADH (network.js). It makes fatty acids but has no β-oxidation:
        // a functional pathway appears to be missing in cyanobacteria (von Berlepsch et al. 2012)
        reactions: uniq(HOUSE, GROW, GLYC, PPP_OX, PPP_NONOX, CALVIN, STORE, KREBS, FAS, ['NDH1F', 'NDH2', 'CYTBF', 'CYTOX'], ROS, PHOTO,
            ['PPS', 'PPC', 'PDH', 'LDH', 'EX_lac', 'EX_glc', 'EX_o2', 'NNT']),
        compartments: { c: 1, l: 0.1 },
        potentials: { q: E_PQ, pc: E_PC, fd: E_FD },
        // Its maintenance, illustrative: what a night's respiration pays, a few percent of the day's photosynthesis
        env: { light: 1, o2: 1, co2: 1 }, medium: { glc__D: 0 }, pmf: PMF_THYLAKOID, ring: 14, atpDemand: 0.05, growth: 0.07,
        carriers: { q: 2, pc: 1, fd: 0.3 },
        // The Calvin cycle is autocatalytic: it starts with its intermediates on hand
        start: CALVIN_START,
        // At night it respires its glycogen through the oxidative pentose phosphate pathway into NDH-1;
        // glycolysis is a minor route beside it, and held back in the light, where the Calvin cycle needs
        // its triose and PGA. G6PDH is switched off by light, so the pentose phosphate pathway doesn't
        // burn what the Calvin cycle fixes, and FBPase on (thioredoxin), so it doesn't cycle against PFK
        // at night. The ATP synthase makes ATP on respiration in the dark; AtpΘ binds as it stalls and
        // stops it running backward (Song et al. 2022, 10.1016/j.cub.2021.10.051), so in anoxia the cell
        // keeps its ATP rather than Δp. The glycolytic GAPDH (GAP1) is a minor activity beside the
        // Calvin cycle's (GAP2). The thylakoid's leak is a quarter of the default: a night's few protons
        // aren't all lost to it
        kinetics: { ...ION_THYLAKOID, ATPS: { reg: [{ type: 'brake', b: 0, dG: -3, name: 'AtpΘ' }] }, LEAK: { vmax: 0.001 },
            GAPD: { vmax: 2 }, PFK: { vmax: 0.5, reg: [dark(0.05)] }, PYK: { reg: [dark(0.05)] }, FBP: { reg: [light()] },
            G6PDH: { reg: [dark(0.01)] }, TALA: { vmax: 1 },
            // Respiration shares the thylakoid's carriers: its oxidase's capacity is a night's respiration's
            // few times over, small beside PSI's, so in dim light it doesn't take light's electrons from PSI
            CYTOX: { vmax: 0.5 },
            // Its lactate dehydrogenase is a minor activity for dark anoxia: it binds pyruvate weakly, so it
            // only runs once pyruvate piles up, as it does when PDH stops for want of NAD⁺
            LDH: { vmax: 2, km: { pyr: 1 } } },
        pools: {
            // Ito, Watanabe & Osanai 2023 (10.1093/plphys/kiad580): NADP 2.8 mM against NAD 2.3 mM
            c: { nad: [2.3, 'measured'], nadp: [2.8, 'measured'], adenine: [3, 'illustrative'], coa: [1, 'illustrative'] },
        },
    },
    animalCell: {
        name: 'Animal cell',
        reactions: uniq(HOUSE, GROW, GLYC, PPP_OX, PPP_NONOX, KREBS, BETAOX, RESP, ROS, MATRIX,
            ['G6PP', 'FBP', 'PC', 'PPCK', 'PDH', 'LDH', 'ADH', 'ALDH', 'ACS', 'FACS', 'EX_lac', 'EX_glc', 'EX_fa', 'EX_etoh', 'EX_ac', 'EX_o2', 'NNT', 'UCP']),
        compartments: { c: 1, m: 0.2, l: 0.02 },
        potentials: { q: E_UQ, pc: E_CYTC, fd: E_FD },
        env: { light: 0, o2: 1, co2: 1 }, medium: { glc__D: 5, hdca: 0.1, lac__L: 1 }, pmf: PMF_ENERGIZED, ring: 8, atpDemand: 1, growth: 0.02,
        kinetics: { ...ION_MITO, ATPS: { reg: [IF1] } },
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
        env: { light: 0, o2: 0, co2: 1 }, medium: { glc__D: 10 }, pmf: PMF_ENERGIZED, ring: 10, atpDemand: 0.3, kinetics: ION_ENERGIZED,
        pools: { c: { nad: [2.6, 'illustrative'], nadp: [0.12, 'illustrative'], adenine: [5, 'illustrative'], coa: [1, 'illustrative'] } },
    },
    plantChloroplast: {
        name: 'Chloroplast',
        reactions: uniq(HOUSE, GLYC, PPP_OX, PPP_NONOX, CALVIN, STORE, FAS, PHOTO, ['PDH', 'TPT', 'NTT', 'EX_o2']),
        compartments: { c: 1, l: 0.1 },
        potentials: { q: E_PQ, pc: E_PC, fd: E_FD },
        env: { light: 1, o2: 1, co2: 1 }, medium: {}, pmf: PMF_THYLAKOID, ring: 14, atpDemand: 0.2, export: 1,
        carriers: { q: 2, pc: 1, fd: 0.3 }, start: CALVIN_START,
        // Light switches the plastid's enzymes through thioredoxin: FBPase, ADP-glucose pyrophosphorylase and
        // ATP synthase on, G6PDH off (Née et al. 2009). At night it exports from its starch as triose, standing in
        // for the maltose and glucose a leaf's chloroplast exports (MEX1, pGlcT); its cytosol is an open
        // reservoir, so with no starch left the translocator brings a little triose back. The oxidized ATP synthase also resists running
        // backward, so at night, with no respiration of its own, the thylakoid goes flat rather than spend
        // the cell's ATP on a gradient. RuBisCO activase needs ATP, so RuBisCO deactivates as the stroma's
        // ATP/ADP falls, and in dim light the cycle slows before it drains the stroma's ATP
        kinetics: { ...ION_THYLAKOID, ATPS: { reg: [light(0.05), { type: 'brake', b: 0, dG: -3, name: 'CF₁' }] }, FBP: { reg: [light()] },
            GLGS: { reg: [light()] }, RBPC: { reg: [act(['atp', 'adp'], 4, 2, 0.02)] }, G6PDH: { reg: [dark(0.01)] },
            PFK: { reg: [dark(0.05)] }, PYK: { reg: [dark(0.05)] }, TALA: { vmax: 5 } },
        pools: { c: { nad: [0.5, 'illustrative'], nadp: [1, 'illustrative'], adenine: [2, 'illustrative'], coa: [0.5, 'illustrative'] } },
    },
    archaeon: {
        name: 'Halophilic archaeon',
        // Menaquinone and halocyanin. No glycolysis (Todor et al. 2015), so no sugar phosphates for a
        // pentose phosphate pathway to run on; without anaplerosis the Krebs cycle keeps its intermediates
        reactions: uniq(HOUSE, KREBS, BETAOX, RESP, ['PDH', 'FACS', 'EX_fa', 'EX_o2', 'BR']),
        compartments: { c: 1, l: 0.1 },
        potentials: { q: -0.074, pc: 0.183, fd: E_FD },
        env: { light: 1, o2: 0, co2: 1 }, medium: { hdca: 0.1 }, pmf: PMF_ENERGIZED, ring: 12, atpDemand: 0.3, kinetics: ION_ENERGIZED,
        pools: { c: { nad: [2, 'illustrative'], nadp: [0.5, 'illustrative'], adenine: [4, 'illustrative'], coa: [1, 'illustrative'] } },
    },
    custom: {
        name: 'Composite cell',
        reactions: uniq(HOUSE, GROW, GLYC, PPP_OX, PPP_NONOX, CALVIN, STORE, KREBS, BETAOX, FAS, RESP, ROS, PHOTO,
            ['G6PP', 'PC', 'PPCK', 'PPS', 'PPC', 'PDH', 'LDH', 'PDC', 'ADH', 'ALDH', 'ACS', 'FACS',
             'EX_lac', 'EX_glc', 'EX_fa', 'EX_etoh', 'EX_ac', 'EX_o2', 'NNT', 'UCP', 'BR']),
        compartments: { c: 1, l: 0.1 },
        potentials: { q: E_PQ, pc: E_PC, fd: E_FD },
        env: { light: 1, o2: 1, co2: 1 }, medium: { glc__D: 5, hdca: 0.1 }, pmf: PMF_THYLAKOID, kinetics: ION_THYLAKOID, atpDemand: 0.6, growth: 0.1,
        carriers: { q: 2, pc: 1, fd: 0.3 }, start: CALVIN_START,
        // Bennett et al. 2009 (10.1038/nchembio.186), E. coli on glucose: ATP 9.6, ADP 0.56, AMP 0.28 mM;
        // NAD⁺ 2.6, NADH 0.083; NADP⁺ 0.0021, NADPH 0.12
        pools: { c: { nad: [2.68, 'measured'], nadp: [0.122, 'measured'], adenine: [10.4, 'measured'], coa: [1.5, 'illustrative'] } },
    },
};
