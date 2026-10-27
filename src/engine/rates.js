// Rates — each reaction's kinetic parameters and regulation. Every rate is
// separable (Noor et al. 2013, 10.1016/j.febslet.2013.07.028):
//
//   v = Vmax · activity · η_reg · η_sat · η_thermo
//
// with η_sat the saturation of convenience kinetics (Liebermeister et al.
// 2010, 10.1093/bioinformatics/btq141) and η_thermo = 1 − e^(ΔG/RT), so the
// reverse rate follows from the forward one by the Haldane relation: finite
// at zero concentration, zero at equilibrium, and never against ΔG. engine.js
// evaluates it; this file holds the numbers.
//
// Every number here is illustrative unless it says otherwise: magnitudes
// chosen so the network runs at a plausible pace (a few mM/s through central
// metabolism), not fitted to an organism. Vmax is mM/s in the reaction's home
// compartment; Km is mM. VISION.md: parameters keep a provenance tag, and
// SABIO-RK's measured constants replace these over time.

/**
 * Each drawn complex's turnover at full capacity, s⁻¹ (illustrative): the
 * window samples a representative centre's events at this times the share
 * of capacity in use (window.js).
 */
export const KCAT = { ATPS: 300, NDH1: 300, NDH1F: 300, SDH: 100, CYTBF: 400, CYTOX: 400, PSII: 200, PSI: 400, FNR: 200, CEF: 100, BR: 100, NNT: 30, MEHLER: 50 };

/** Km by species when a reaction doesn't name its own, mM. */
export const KM = {
    atp: 0.5, adp: 0.2, amp: 0.1, pi: 5, ppi: 0.05, nad: 0.2, nadh: 0.02, nadp: 0.02, nadph: 0.02,
    coa: 0.02, accoa: 0.05, malcoa: 0.01, succoa: 0.05, o2: 0.001, co2: 0.1, glc__D: 1, hdca: 0.01,
    q8: 0.2, q8h2: 0.2, pcox: 0.1, pcred: 0.1, fdox: 0.02, fdred: 0.02, glycogen: 5, lac__L: 2,
    // Intermediates whose pools are µM are bound at µM: 1,3-bisphosphoglycerate (PGK's ≈ 2 µM), the triose
    // phosphate and the Calvin cycle's bisphosphates
    '13dpg': 0.002, g3p: 0.05, fdp: 0.02, s17bp: 0.02, rb15bp: 0.05,
    // Oxaloacetate is held at µM by malate dehydrogenase's equilibrium; citrate synthase binds it there
    oaa: 0.005,
};
export const KM_DEFAULT = 0.1;
// β-oxidation's enzymes bind their acyl-CoAs at a few µM, so the spiral holds little of the CoA
import { ACYL } from './species.js';
for (const k of [...ACYL.acyl, ...ACYL.enoyl, ...ACYL.hydroxy, ...ACYL.keto]) KM[k] = 0.005;

// Regulation: each effector multiplies the rate.
//   inh: 1 / (1 + (x/K)^h)            act: (b + (x/K)^h) / (1 + (x/K)^h), b the basal fraction
// x is a species' concentration in the reaction's compartment, or a ratio [a, b]
// of two. light: thioredoxin's switch, b + (1 − b)·L with L = I / (I + 0.05);
// dark: the reverse, for enzymes light switches off. dp: a floor on Δp below
// which the enzyme shuts (IF1 on the mitochondrial ATP synthase). brake: holds a
// reaction against running backward (AtpΘ on the cyanobacterium's ATP synthase:
// engine.js), half bound at ΔG = dG kJ/mol, b what it leaves.
const inh = (x, K, h = 1) => ({ type: 'inh', x, K, h });
const act = (x, K, h = 1, b = 0.1) => ({ type: 'act', x, K, h, b });
const light = (b = 0.03) => ({ type: 'light', b });
const dark = (b = 0.1) => ({ type: 'dark', b });

const P = {};
const p = (ids, vmax, extra = {}) => { for (const id of [].concat(ids)) P[id] = { vmax, ...extra }; };

// ─── Glycolysis and gluconeogenesis ───
p('HEX1', 2, { reg: [inh('g6p', 2)] });
p('G6PP', 0.5, { km: { g6p: 2.5 } });
p(['PGI', 'FBA', 'GAPD', 'PGM', 'ENO'], 50);
p('PGK', 100);
// PFK senses the energy charge: ATP inhibits, AMP relieves it; FBPase the mirror (no futile cycle)
p('PFK', 4, { reg: [inh(['atp', 'adp'], 8, 2), act('amp', 0.02, 1, 0.3)] });
p('FBP', 4, { reg: [inh('amp', 0.02, 2)] });
p('PYK', 5, { reg: [act('fdp', 0.3, 1, 0.2)] });
p('PC', 2, { reg: [act('accoa', 0.05, 1, 0.1)] });
p('PPCK', 2);
// PEP synthetase spends two ATP: like FBPase, a low energy charge (AMP) holds it, so it doesn't cycle against PK
p('PPS', 1, { reg: [inh('amp', 0.02, 2)] });
p('PPC', 0.3, { reg: [inh('mal__L', 2)] });
// The store: ADP-glucose pyrophosphorylase, glycogen (or starch) synthesis's committed step, needs 3-PGA, the
// Calvin cycle's product, so it takes what the cycle makes beyond its own needs and never its intermediates;
// phosphorylase opens as the energy charge falls (AMP), so a cell draws on its store as it needs to (and
// light switches it off)
p(['GLGS'], 1, { km: { g6p: 1 }, reg: [act('3pg', 0.1, 2, 0)] });
p(['GLGP'], 0.5, { reg: [dark(0.02), act('amp', 0.3, 2, 0.02)] });

// ─── Fermentation and salvage ───
p('LDH', 30);
p('PDC', 5);
p('ADH', 20);
p('ALDH', 2);
p('ACS', 1);
p('PDH', 3, { km: { coa: 0.005 }, reg: [inh(['nadh', 'nad'], 0.4, 2), inh(['accoa', 'coa'], 3)] });

// ─── Pentose phosphate pathway ───
// G6PDH is held back by its product far beyond saturation and shuts as NADPH fills, so the pathway's
// NADPH follows its use (and, in plastids and cyanobacteria, light switches it off: cells.js)
p('G6PDH', 2, { reg: [inh(['nadph', 'nadp'], 3, 4)] });
p('PGL', 20);
p('GND', 5);
// The non-oxidative branch is abundant: in the Calvin cycle transketolase runs uphill (K' 61 the other way),
// and it binds F6P at about a millimolar
p(['RPI', 'RPE', 'TKT1', 'TALA'], 100);
p('TKT2', 100, { km: { f6p: 1 } });

// ─── Calvin cycle: thioredoxin turns its enzymes on in the light ───
// and in the dark CP12 holds PRK and the NADP-GAPDH together, so the cycle is off, not merely slow
// (otherwise PRK would spend the pentose phosphate pathway's Ru5P and ATP at night)
// RuBisCO's apparent Km for CO₂ includes a carbon-concentrating mechanism's help
p('RBPC', 4, { km: { co2: 0.01 }, reg: [light(0.001)] });
p('PRUK', 20, { km: { ru5p__D: 0.02 }, reg: [light(0.001)] });
p('SBA', 100);
p('SBP', 10, { reg: [light(0.001)] });
p('GAPDP', 20, { reg: [light(0.001)] });

// ─── Krebs cycle ───
// Malate dehydrogenase's equilibrium leaves oxaloacetate sub-µM: citrate synthase is abundant and binds it at about 2 µM
// The cycle's enzymes far exceed the flux through it, so its pace is set by its supply and by
// NADH and ADP, not by its capacity
p('CS', 100, { km: { oaa: 0.002 }, reg: [inh(['nadh', 'nad'], 0.5), inh(['atp', 'adp'], 15)] });
p('ACONT', 50);
p('ICDH', 15, { reg: [inh(['nadh', 'nad'], 0.3, 2), act('adp', 0.3, 1, 0.3)] });
p('AKGDH', 15, { km: { coa: 0.005 }, reg: [inh(['nadh', 'nad'], 0.5), inh(['succoa', 'coa'], 2)] });
p('SUCOAS', 30);
p('SDH', 15);
p('FUM', 20);
p('MDH', 50);

// ─── β-oxidation and fatty-acid synthesis ───
// The spiral's enzymes far outrun its entry, so its intermediates (each holding a CoA) stay at µM:
// entry (CPT1 in the matrix's case, the acyl-CoA synthetase's otherwise) sets the pace
for (const n of [16, 14, 12, 10, 8, 6, 4]) {
    p('ACAD' + n, 10, { km: { etfox: 0.002 } }); p('ECH' + n, 50); p('HACD' + n, 50); p('KAT' + n, 50, { km: { coa: 0.01 } });
}
// Malonyl-CoA keeps fatty acids out of the matrix (CPT1). It rises when acetyl-CoA is in surplus
// (as citrate, through ACC), which the matrix's acetyl-CoA/CoA ratio stands for here
p('CPT', 0.1, { reg: [inh('malcoa', 0.005), inh(['accoa[m]', 'coa[m]'], 2, 2)] });
p('FACS', 0.3, { reg: [inh(['accoa', 'coa'], 2, 2)] });
p('ACC', 1, { reg: [act('cit', 0.5, 1, 0.2), inh('pmtcoa', 0.05)] });
for (const n of [4, 6, 8, 10, 12, 14, 16]) p('FAS' + n, 2);

// ─── Housekeeping ───
p(['ADK', 'ADKm'], 20);
p(['PPA', 'PPAm'], 10);
// The ATP demand dial sets ATPM's Vmax (engine.js); the work it stands for doesn't wait on its products
p('ATPM', 1, { km: { atp: 0.5, adp: 100, pi: 100 } });
// The growth dial sets the biomass row's rate; it slows as soon as any one precursor runs short
// (half-saturation by each precursor's pool: oxaloacetate's is sub-µM, held there by malate dehydrogenase)
p('BIOMASS', 0, { law: 'demand', kmDemand: { default: 0.005, oaa: 0.0001, e4p: 0.0005, '13dpg': 0.0005 } });

// ─── The membrane ───
p('NDH1', 10);
p('CYTBF', 20);
p('CYTOX', 30);
// Photosystems and bacteriorhodopsin: Vmax at full light, scaled by the light's intensity
// PSII lets its O₂ go: no product holds it back
p('PSII', 3, { light: true, km: { o2: 100 } });
p('PSI', 10, { light: true });
// FNR runs backward in the dark, NADPH to ferredoxin for NDH-1's respiration: oxidized ferredoxin's weak
// binding gives that direction its capacity (Haldane: kcat_b / K_P = (kcat_f / K_S) / K')
p('FNR', 20, { km: { fdox: 0.3 } });
// Ferredoxin's other partners (cyclic flow, NDH-1, the flavodiiron outlet) are given FNR's weak binding of the
// oxidized form (illustrative, not measured for them), so a mostly oxidized pool doesn't hold them back and FNR
// doesn't take every electron
p('CEF', 1.5, { km: { fdox: 0.3 } });
p('ETFQO', 10, { km: { etfred: 0.002 } });
// Ferredoxin-fed NDH-1 (cyanobacteria) and the non-pumping NDH-2, a minor route
p('NDH1F', 3, { km: { fdred: 0.02, fdox: 0.3 } });
p('NDH2', 0.05);
p('BR', 2, { light: true });
// The water–water cycle: ferredoxin (or flavodiiron proteins, in cyanobacteria) hands electrons to O₂,
// the photosynthetic chain's outlet when the Calvin cycle can't take them
p('MEHLER', 0.3, { km: { o2: 0.05, fdox: 0.3 } });
p('ATPS', 15);
p('NNT', 2);
// The plastid's ATP/ADP translocator: at night a chloroplast lives on the cytosol's ATP
p('NTT', 1);
// The leaks are conductances: mM/s per mV of what drives them (Δp for protons, Δψ for the
// counter-ions, ΔpH for K⁺/H⁺ exchange); each cell sets the last two (cells.js)
p('LEAK', 0.004, { law: 'leak' });
p('UCP', 0.5, { law: 'leak' });
p('ION', 0.0005, { law: 'leak' });
p('KHE', 0.0025, { law: 'leak' });

// ─── Reactive oxygen: the leaks climb steeply with Δp; the scavengers are fast ───
p('ROSI', 0.004, { km: { o2: 0.05 }, reg: [{ type: 'dp', K: 190, h: 6 }] });
p('ROSQ', 0.008, { km: { o2: 0.05 }, reg: [{ type: 'dp', K: 190, h: 6 }] });
p('SOD', 50, { km: { o2s: 0.0005 } });
p('CAT', 20, { km: { h2o2: 1 } });
p('GPX', 3, { km: { h2o2: 0.005, nadph: 0.01 } });
p('REPAIR', 0, { km: { atp: 0.5, adp: 100, pi: 100 } });

// ─── Carriers between the cytosol and the matrix ───
p('MPC', 5); p('ANT', 20); p('PIC', 50); p('MAS', 5); p('OAAX', 1);

// ─── Exchange with the medium: gases diffuse (rate constants, /s); the rest are carriers ───
p(['EX_o2', 'EX_co2'], 50, { law: 'diffusion' });
p('EX_glc', 2); p('EX_fa', 0.2); p('EX_pi', 2, { km: { pi: 0.1 } });
p(['EX_lac', 'EX_etoh', 'EX_ac'], 5, { km: { lac__L: 5, etoh: 5, ac: 5 } });
// The plastid's export dial sets TPT's Vmax; it binds the stroma's triose at the tens of µM the Calvin
// cycle leaves, and its Pᵢ at about a millimolar
p('TPT', 1, { km: { g3p: 0.05, pi: 1 } });

export const PARAMS = P;
export { inh, act, light, dark };
