// Species — every chemical the engine knows, before it is placed in a
// compartment. Formulas and charges come from formulas.js (BiGG) except the
// protein carriers, written here: plastocyanin (which stands for cytochrome c
// and halocyanin too) and ferredoxin, whose oxidized and reduced forms differ
// only by an electron, so a pseudo-element names the protein and the charge
// carries the electron. The quinone pool is ubiquinone-8's formula for every
// quinone (plasto-, mena-): only its two hydrogens matter to the balances.
//
// Moieties are the conserved groups, written out independently of the
// network so the tests can check the network keeps them (VISION.md: null-space
// discovery alone can't catch a network that has quietly lost one).
//
// kind: 'met' a metabolite, 'cof' a cofactor pool, 'car' a membrane carrier,
// 'gas' (crosses membranes freely and lives in the cell's main compartment),
// 'fixed' (water, buffered H⁺ and K⁺: constant, left out of every rate and of Q),
// 'charge' (dq: the net charge the drawn membrane has moved to its lumen side,
// a state, not a chemical: engine.js reads Δψ from it).
import { FORMULAS } from './formulas.js';

/** Elements of a formula: 'C10H12N5O13P3' → { C: 10, H: 12, … }. Pseudo-elements (Pc, Fd) are capitalized words. */
export function elements(formula) {
    const out = {};
    for (const [, el, n] of formula.matchAll(/([A-Z][a-z]*)(\d*)/g)) out[el] = (out[el] || 0) + (n ? +n : 1);
    return out;
}

const SPEC = {};
function sp(id, name, kind, extra = {}) {
    const f = FORMULAS[id];
    SPEC[id] = { id, name, kind, formula: f ? f[0] : extra.formula, charge: f ? f[1] : extra.charge, ...extra };
}

// ─── Cofactors and inorganic species ───
sp('atp', 'ATP', 'cof'); sp('adp', 'ADP', 'cof'); sp('amp', 'AMP', 'cof');
sp('nad', 'NAD⁺', 'cof'); sp('nadh', 'NADH', 'cof'); sp('nadp', 'NADP⁺', 'cof'); sp('nadph', 'NADPH', 'cof');
sp('coa', 'CoA', 'cof'); sp('pi', 'Pᵢ', 'cof'); sp('ppi', 'PPᵢ', 'met');
sp('h2o', 'H₂O', 'fixed'); sp('h', 'H⁺', 'fixed');
// K⁺ stands for the counter-ions (K⁺, Cl⁻, Mg²⁺) whose movement across the membrane
// carries charge without protons; held constant on both sides
sp('k', 'K⁺', 'fixed');
sp('dq', 'Membrane charge', 'charge', { formula: '', charge: 0 });
sp('co2', 'CO₂', 'gas'); sp('o2', 'O₂', 'gas');
// Reactive oxygen: superoxide and hydrogen peroxide
sp('o2s', 'Superoxide', 'met'); sp('h2o2', 'H₂O₂', 'met');

// ─── Membrane carriers ───
sp('q8', 'Q', 'car'); sp('q8h2', 'QH₂', 'car');
sp('pcox', 'PC (oxidized)', 'car', { formula: 'Pc', charge: 1 });
sp('pcred', 'PC (reduced)', 'car', { formula: 'Pc', charge: 0 });
sp('fdox', 'Fd (oxidized)', 'car', { formula: 'Fd', charge: 0 });
sp('fdred', 'Fd (reduced)', 'car', { formula: 'Fd', charge: -1 });
// Electron-transferring flavoprotein: carries acyl-CoA dehydrogenase's two electrons (with their
// protons, as its FADH₂) to ETF:quinone oxidoreductase in the membrane
sp('etfox', 'ETF', 'car', { formula: 'Etf', charge: 0 });
sp('etfred', 'ETF (reduced)', 'car', { formula: 'EtfH2', charge: 0 });

// ─── Carbon ───
const M = (id, name, extra) => sp(id, name, 'met', extra);
M('glc__D', 'Glucose'); M('g6p', 'G6P'); M('f6p', 'F6P'); M('fdp', 'F1,6BP'); M('g3p', 'G3P'); M('13dpg', '1,3-BPG');
M('3pg', '3-PGA'); M('2pg', '2-PGA'); M('pep', 'PEP'); M('pyr', 'Pyruvate'); M('lac__L', 'Lactate');
M('acald', 'Acetaldehyde', { permeant: true }); M('etoh', 'Ethanol', { permeant: true }); M('ac', 'Acetate', { permeant: true });
M('accoa', 'Acetyl-CoA'); M('malcoa', 'Malonyl-CoA');
M('oaa', 'OAA'); M('cit', 'Citrate'); M('icit', 'Isocitrate'); M('akg', 'α-KG'); M('succoa', 'Succinyl-CoA');
M('succ', 'Succinate'); M('fum', 'Fumarate'); M('mal__L', 'Malate');
M('6pgl', '6-PGL'); M('6pgc', '6-PGA'); M('ru5p__D', 'Ru5P'); M('r5p', 'R5P'); M('xu5p__D', 'Xu5P');
M('e4p', 'E4P'); M('s7p', 'S7P'); M('s17bp', 'SBP'); M('rb15bp', 'RuBP');
M('hdca', 'Palmitate');
// Glycogen (or starch): one glucosyl unit of the polymer, so its count is glucose stored. A polymer:
// adding or taking a unit leaves its chains' ends as they were, so its amount enters an enzyme's
// saturation but not a reaction's equilibrium (engine.js)
sp('glycogen', 'Glycogen', 'met', { formula: 'C6H10O5', charge: 0, polymer: true });

// Fatty acyl-CoAs on β-oxidation's spiral, one species per chain length and stage
export const CHAIN = [16, 14, 12, 10, 8, 6, 4];
export const ACYL = {
    acyl: ['pmtcoa', 'tdcoa', 'ddcacoa', 'dcacoa', 'occoa', 'hxcoa', 'btcoa'],
    enoyl: ['hdd2coa', 'td2coa', 'dd2coa', 'dc2coa', 'oc2coa', 'hx2coa', 'b2coa'],
    hydroxy: ['3hhdcoa', '3htdcoa', '3hddcoa', '3hdcoa', '3hocoa', '3hhcoa', '3hbcoa'],
    keto: ['3ohdcoa', '3otdcoa', '3oddcoa', '3odcoa', '3oocoa', '3ohcoa', 'aacoa'],
};
const SUB = '₀₁₂₃₄₅₆₇₈₉', Cn = n => 'C' + String(n).replace(/\d/g, d => SUB[d]);
CHAIN.forEach((n, i) => {
    M(ACYL.acyl[i], n === 16 ? 'Palmitoyl-CoA' : `${Cn(n)} acyl-CoA`, { chain: n });
    M(ACYL.enoyl[i], `${Cn(n)} enoyl-CoA`, { chain: n });
    M(ACYL.hydroxy[i], `${Cn(n)} 3-OH-acyl-CoA`, { chain: n });
    M(ACYL.keto[i], n === 4 ? 'Acetoacetyl-CoA' : `${Cn(n)} 3-ketoacyl-CoA`, { chain: n });
});

/** Conserved moieties, specified by hand: moiety → species → count. */
export const MOIETIES = {
    adenine: { atp: 1, adp: 1, amp: 1 },
    nad: { nad: 1, nadh: 1 },
    nadp: { nadp: 1, nadph: 1 },
    coa: Object.fromEntries(['coa', 'accoa', 'malcoa', 'succoa', ...ACYL.acyl, ...ACYL.enoyl, ...ACYL.hydroxy, ...ACYL.keto].map(k => [k, 1])),
    quinone: { q8: 1, q8h2: 1 },
    plastocyanin: { pcox: 1, pcred: 1 },
    ferredoxin: { fdox: 1, fdred: 1 },
    etf: { etfox: 1, etfred: 1 },
};

for (const s of Object.values(SPEC)) {
    if (s.formula == null) throw new Error('no formula for ' + s.id);
    s.el = elements(s.formula);
    s.carbon = s.el.C || 0;
}

export const SPECIES = SPEC;
