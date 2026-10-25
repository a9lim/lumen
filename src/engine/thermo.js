// Thermodynamics — every reaction's standard transformed Gibbs energy, ΔG'°,
// kJ/mol in the direction network.js writes it, and the potentials it takes
// to compute the membrane's.
//
// Metabolite reactions are eQuilibrator's (component contribution: Beber et
// al. 2021, 10.1093/nar/gkab1106), computed with equilibrator-api 0.8.1 at
// pH 7, ionic strength 0.25 M, pMg 3, 25 °C by Codex (gaslamp job
// cx-20261025-142319-f749): [ΔG'°, its standard error]. Component
// contribution's formation energies make them consistent around every cycle.
// Reactions with the membrane's carriers are computed per cell instead, from
// the carriers' midpoint potentials (cells.js) against NAD's: eQuilibrator's
// aqueous estimates for the quinones disagree with membrane potentials, so
// only the metabolite half of SDH and ACAD comes from it (succinate and acyl-
// CoA oxidized by NAD⁺), and the carrier half from the potentials.

export const F = 96.485;            // kJ/(mol·V)
export const RT = 8.314462618e-3 * 298.15;   // kJ/mol at 25 °C: 2.479
const HC = 119626.6;                // N_A·h·c, kJ·nm/mol: a mole of photons at λ nm carries HC/λ

/** eQuilibrator's ΔG'° and standard error, kJ/mol. */
const EQ = {
    HEX1: [-17.90, 0.43], G6PP: [-9.46, 0.47], PGI: [2.66, 0.38], PFK: [-14.60, 0.67], FBP: [-12.77, 0.69],
    FBA_: [22.39, 0.53], TPI_: [5.58, 0.55], GAPD: [4.60, 0.41], GAPDP: [4.47, 0.52], PGK: [-19.32, 0.44],
    PGM: [4.52, 0.36], ENO: [-3.81, 0.30], PYK: [-27.58, 0.42], PC: [-10.11, 3.11], PPCK: [10.33, 3.12],
    PPS: [0.41, 0.50], PPC: [-37.70, 3.11], LDH: [-26.76, 0.46], PDC: [-16.40, 3.28], ADH_: [21.11, 0.32],
    ALDH: [-49.74, 1.29], ACS: [-5.40, 0.40], PDH: [-34.02, 3.22], G6PDH: [-3.92, 1.32], PGL: [-22.52, 1.66],
    GND: [10.33, 3.18], RPI: [4.41, 1.67], RPE: [-3.39, 1.15], TKT1: [-1.55, 2.37], TALA: [-0.87, 1.41],
    TKT2: [-10.19, 1.92], RBPC: [-26.39, 3.79], PRUK: [-25.88, 2.29], SBA_: [-20.84, 2.81], SBP: [-13.45, 2.85],
    CS: [-35.92, 0.44], ACONT: [6.84, 0.33], ICDH: [5.61, 3.19], AKGDH: [-28.00, 3.88], SUCOAS: [1.75, 1.33],
    SDH_Q8: [-73.58, 6.52], FUM: [-3.43, 0.28], MDH: [29.56, 0.30], ECH: [-3.28, 1.69], HACD: [16.89, 1.20],
    THL: [-24.96, 0.86], ACAD_Q8: [-81.12, 6.69], ACC: [-12.01, 3.18], FACS: [-10.73, 6.42], ADK: [-0.19, 0.16],
    PPA: [-17.02, 0.19], ATPH: [-27.37, 0.30], NNT: [-0.13, 0.34], NDH_Q8: [-134.80, 6.21],
};
const g = (k) => EQ[k][0];

// Metabolite halves of the quinone-linked reactions, against NAD (the aqueous quinone cancels):
const SUCC_NAD = g('SDH_Q8') - g('NDH_Q8');     // succinate + NAD⁺ → fumarate + NADH: +61.2
const ACYL_NAD = g('ACAD_Q8') - g('NDH_Q8');    // acyl-CoA + NAD⁺ → enoyl-CoA + NADH: +53.7

// Fatty-acid synthesis's round, from its parts: the condensation is thiolase backward with
// malonyl-CoA's decarboxylation (ACC's work, less ATP's) paying for it; the reductions are
// HACD and ACAD backward on NADPH (NADPH → NADH is NNT backward)
const KAS = -g('THL') - (g('ACC') - g('ATPH'));
const FAS_ROUND = KAS + (-g('HACD') - g('NNT')) + (-g('ECH')) + (-ACYL_NAD - g('NNT'));

// Glycogen through ADP-glucose and phosphorylase, textbook (Lehninger): synthesis ≈ −6.2, the
// phosphorylase ≈ −4.2, chosen to sum to ATP + Pᵢ → ADP + PPᵢ so the pair is consistent
const GLG_PAIR = g('ATPH') - g('PPA');
const GLGP = -4.2, GLGS = GLG_PAIR - GLGP;

/** ΔG'° of the reactions that don't depend on the cell's carriers. */
export const DG0 = {
    ...Object.fromEntries(Object.entries(EQ).filter(([k]) => !k.endsWith('_')).map(([k, v]) => [k, v[0]])),
    FBA: g('FBA_') + g('TPI_'),              // fdp → dhap + g3p, then dhap → g3p
    SBA: g('SBA_') - g('TPI_'),               // its DHAP made from G3P
    ADH: -g('ADH_'),                          // written acetaldehyde → ethanol
    ATPM: g('ATPH'), ATPS: -g('ATPH'),        // ATPS: the chemical half; Δp adds the rest
    ADKm: g('ADK'), PPAm: g('PPA'),
    GLGS, GLGP,
    ACC: g('ACC'), FAS4: FAS_ROUND,
};
for (const n of [6, 8, 10, 12, 14, 16]) DG0['FAS' + n] = FAS_ROUND;
for (const n of [16, 14, 12, 10, 8, 6, 4]) { DG0['ECH' + n] = g('ECH'); DG0['HACD' + n] = g('HACD'); DG0['KAT' + n] = g('THL'); }
// No chemistry, only the proton-motive force's (or nothing): carriers, exchanges, leaks
for (const k of ['MPC', 'ANT', 'PIC', 'MAS', 'OAAX', 'CPT', 'LEAK', 'UCP', 'ION', 'KHE', 'TPT', 'NTT', 'EX_glc', 'EX_fa', 'EX_o2', 'EX_co2', 'EX_pi', 'EX_lac', 'EX_etoh', 'EX_ac']) DG0[k] = 0;

export const E_NAD = -0.320;                          // V
export const E_NADP = E_NAD - g('NNT') / (2 * F);     // from NNT's ΔG'°, so the two pools agree
export const E_O2 = 0.816;
// Oxygen's one-electron steps, V (Wood 1988): O₂/O₂•⁻ and O₂•⁻/H₂O₂; H₂O₂/H₂O then follows from O₂/H₂O,
// so the four steps sum to it and every cycle through the scavengers is consistent
const E_SO = -0.16, E_SH = 0.89, E_HW = (4 * E_O2 - E_SO - E_SH) / 2;
/** A mole of photons at λ nm, kJ/mol. */
export const photon = (nm) => HC / nm;

/**
 * ΔG'° of a reaction in a cell (kJ/mol): the table's, or for the membrane's
 * carriers the potentials' (light's included). chemical: leave out photons.
 */
export function dg0(cell, r, chemical = false) {
    const E = cell.potentials, q = E.q, pc = E.pc, fd = E.fd;
    const light = chemical || !r.photons ? 0 : -r.photons * photon(r.nm);
    switch (r.id) {
        case 'NDH1': return -2 * F * (q - E_NAD);
        case 'CYTBF': return -2 * F * (pc - q);
        case 'CYTOX': return -2 * F * (E_O2 - pc);
        case 'PSII': return -2 * F * (q - E_O2) + light;
        case 'PSI': return -F * (fd - pc) + light;
        case 'FNR': return -2 * F * (E_NADP - fd);
        case 'CEF': return -2 * F * (q - fd);
        // Bacteriorhodopsin's photocycle keeps only part of the photon: it stalls near 280 mV, not at 2 V
        case 'BR': return chemical ? 0 : -F * 0.280;
        case 'MEHLER': return -2 * F * (E_O2 - fd);
        case 'SDH': return SUCC_NAD - 2 * F * (q - E_NAD);
        case 'ROSI': return -2 * F * (E_SO - E_NAD);
        case 'ROSQ': return -F * (E_SO - q) - F * (pc - q);
        case 'SOD': return -F * (E_SH - E_SO);
        case 'CAT': return -2 * F * (E_HW - (E_SO + E_SH) / 2);
        case 'GPX': return -2 * F * (E_HW - E_NADP);
        case 'REPAIR': return DG0.ATPM;
    }
    if (r.group === 'ACAD') return ACYL_NAD - 2 * F * (q - E_NAD);
    if (r.sink) return -Infinity;    // demand rows run one way only: their products aren't the network's
    if (!(r.id in DG0)) throw new Error('no ΔG′° for ' + r.id);
    return DG0[r.id];
}
