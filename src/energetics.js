// Energetics — the proton-motive force and what it permits. The gradient is
// one stored number (store.protonGradient), and each unit of it is worth
// MV_PER millivolts of Δp. Every pump slows as Δp nears its stall, the
// potential at which pumping costs all the energy it has to give, so a full
// gradient throttles the chain (respiratory control). ATP synthase runs
// whichever way Δp and the phosphorylation potential say: below balance it
// runs backward, splitting ATP to pump protons out. NNT moves a hydride from
// NADH to NADP⁺ only while the proton it lets in pays for the two pools' ratios.
import { simState, store, nadpFree } from './state.js';
import { SPECIMENS } from './specimens.js';

export const MV_PER = 2;            // mV of Δp per unit of gradient
const W = 15;                       // mV over which a rate falls to zero at equilibrium (a softened flux–force relation)
const RT = 2.479, F = 96.485;       // kJ/mol at 25 °C; kJ/(mol·V)
const RT_F = RT / F * 1000;         // mV: 25.7
const H_PER_ATP = 4;                // twelve c subunits, three ATP a turn
const DG0_ATP = 30.5;               // kJ/mol, ATP synthesis at standard conditions (pH 7, Mg²⁺)
const PI = 0.01;                    // M phosphate, assumed: the model doesn't track it

// Stall potentials, mV. The respiratory chain's is where its ten protons
// cost all that two electrons release from NADH (−320 mV) to O₂ (+815 mV):
// 2 × 1135 / 10 ≈ 227 mV; FADH₂'s electrons join the same carriers, which
// back up together. The light-driven pumps are assumed to stall at 200 mV,
// where an acid lumen slows cytochrome b₆f (photosynthetic control).
const STALL = { etc_resp: 2 * (815 + 320) / 10, etc_photo: 200, etc_cyclic: 200, br: 200 };
// Protons each pump moves in one event: NADH's chain 10, FADH₂'s 6
const STEP = { etc_photo: 6, etc_cyclic: 4, br: 1 };
const stepOf = (key, i) => key === 'etc_resp' ? (i === 1 || (i !== 0 && store.nadh < 1) ? 6 : 10) : STEP[key];

// Every event is judged over its whole step, at its midpoint, so none is
// uphill overall: a pump counts the protons chains in flight have yet to pump
// (store.protonsPending) as well as its own, and ATP synthase pays for the
// ATP it makes across the step, which leaves a dead band where it runs
// neither way instead of flickering between them.

/** The proton-motive force, mV. */
export const deltaP = () => store.protonGradient * MV_PER;

/** ΔG of the ATP that takes the pool from a ATP to a + 1, kJ/mol: ΔG°′ + RT ln(ATP/(ADP·Pᵢ)) integrated over the step. */
function makeCost(a) {
    const T = store.totalAtpAdp, xlx = x => x > 0 ? x * Math.log(x) : 0;
    return DG0_ATP - RT * Math.log(PI) + RT * (xlx(a + 1) + xlx(T - a - 1) - xlx(a) - xlx(T - a));
}
/** A per-ATP free energy as the Δp that four protons need to match it, mV. */
const asDp = kJ => kJ / (H_PER_ATP * F) * 1000;

/** Whether this membrane's ATP synthase may run backward: photosynthetic ones are braked in the dark. */
function hydrolysisAllowed() {
    const h = (SPECIMENS[simState.specimen] || SPECIMENS.composite).can.hydrolysis;
    return h === true || (h === 'light' && simState.lightOn);
}

/** The Δp the next ATP needs, mV; below the second, ATP synthase runs backward. */
export const atpThreshold = () => asDp(makeCost(store.atp)) + H_PER_ATP / 2 * MV_PER;
const backThreshold = () => asDp(makeCost(store.atp - 1)) - H_PER_ATP / 2 * MV_PER;

/** How far ATP synthase stands from balance each way, mV; positive means that way runs downhill. */
function synthaseMargins() {
    const g = store.protonGradient, a = store.atp;
    return {
        fwd: a <= store.totalAtpAdp - 1 && g >= H_PER_ATP ? (g - H_PER_ATP / 2) * MV_PER - asDp(makeCost(a)) : -Infinity,
        rev: a >= 1 && hydrolysisAllowed() ? asDp(makeCost(a - 1)) - (g + H_PER_ATP / 2) * MV_PER : -Infinity,
    };
}

/**
 * How far NNT stands from balance, mV: the proton it takes in, against
 * RT/F ln of NAD⁺·NADPH / NADH·NADP⁺ (ΔG°′ of the hydride transfer ≈ 0),
 * both at the step's midpoint. Positive means NADH → NADPH runs downhill.
 */
function nntMargin() {
    const nadh = store.nadh - 0.5, nad = store.totalNad - store.nadh + 0.5, nadph = store.nadph + 0.5, nadp = nadpFree() - 0.5;
    if (nadh <= 0 || nadp <= 0 || store.protonGradient < 1) return -Infinity;
    return (store.protonGradient - 0.5) * MV_PER - RT_F * Math.log(nad * nadph / (nadh * nadp));
}

/** Which way ATP synthase runs now: 'forward' (making ATP), 'reverse' (splitting it to pump), or null. */
export function synthaseWay() {
    const m = synthaseMargins();
    return m.fwd > 0 ? 'forward' : m.rev > 0 ? 'reverse' : null;
}

/**
 * The thermodynamic factor on a membrane reaction, 1 − e^(−x/W), where x is
 * how far its step stands from equilibrium in mV of Δp; 1 for reactions it
 * doesn't gate. At 0 the reaction can't run that way at all.
 */
export function drive(key, direction, stepIndex) {
    let x;
    if (key in STALL) x = STALL[key] - (store.protonGradient + store.protonsPending + stepOf(key, stepIndex) / 2) * MV_PER;
    else if (key === 'atp_syn') { const m = synthaseMargins(); x = direction === 'reverse' ? m.rev : m.fwd; }
    else if (key === 'nnt') x = nntMargin();
    else return 1;
    return x > 0 ? 1 - Math.exp(-x / W) : 0;
}

/** Why a membrane reaction can't run, for the toast on a blocked click. */
export function driveReason(key, direction) {
    const dp = Math.round(deltaP());
    if (key in STALL) return store.protonsPending ? `Δp is ${dp} mV with more on its way, as much as this chain can pump against` : `Δp is ${dp} mV, as much as this chain can pump against`;
    if (key === 'atp_syn') {
        if (direction === 'reverse' && !hydrolysisAllowed()) return 'In the dark this ATP synthase is braked against running backward';
        if (direction === 'reverse') return store.atp < 1 ? 'No ATP to split' : `Δp is ${dp} mV; ATP synthase runs backward only below ${Math.round(backThreshold())} mV`;
        return store.atp >= store.totalAtpAdp ? 'No ADP to make ATP from' : `Δp is ${dp} mV; the next ATP needs ${Math.round(atpThreshold())} mV`;
    }
    if (key === 'nnt') return store.nadh < 1 ? 'No NADH to take a hydride from' : `Δp is ${dp} mV, too little to push NADPH any further over NADH`;
    return null;
}
