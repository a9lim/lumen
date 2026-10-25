// Flux — how much carbon each section of the map has carried lately.
// Every reaction that fires (dispatch.js onReaction) is routed onto the map
// segments it moves carbon along, signed by direction and weighed by the
// carbon atoms it carried there. Each segment keeps a leaky integral of
// those (carbon atoms per second, time constant TAU) and a smoothed copy for
// drawing, so line weight and train speed read carbon flux.
import { simState } from './state.js';

const TAU = 6;      // s, memory of the integrator
const SMOOTH = 1.6; // s, smoothing of the drawn value
export const RUNNING = 0.1;   // carbon atoms per second under which a segment counts as idle

export const flux = {};   // segment id → signed carbon atoms per second (drawn)
const raw = {};           // segment id → signed carbon atoms per second (integrator)
const _listeners = [];

// Carbon atoms carried along a per-step reaction's segment, per molecule of its
// forward substrate (a handler's result.n counts those): the skeleton that runs
// the segment's whole length, so a decarboxylation counts what goes on past its
// CO₂ spur and a condensation the partner already on the line.
const CPM = {
    glycolysis: [6, 6, 6, 6, 0, 3, 3, 3, 3, 3, 5],
    calvin: { 0: 5, 7: 5 },
    ppp: [6, 6, 5],
    krebs: [0, 6, 5, 4, 4, 4, 4, 4],
};

/** β-oxidation's batch carbon along each segment for an n-carbon chain: Σ of the chain over its rounds. */
function spiral(n) {
    let chain = 0;
    for (let k = n; k > 2; k -= 2) chain += k;
    return chain;
}

/** The whole lower half of glycolysis, backward: PGK and GAPDH run on the Calvin track while the Calvin cycle is on. */
function lowerBack() {
    const g = [['g9', -6], ['g8', -6], ['g7', -6]];
    return simState.calvinEnabled ? [...g, ['c6', 6], ['c5', 6]] : [...g, ['g6', -6], ['g5', -6]];
}

/** Segments a reaction moves carbon along: [segment id, signed carbon atoms]. */
function route(key, step, rev, res) {
    const s = rev ? -1 : 1, n = res.n || 0;
    switch (key) {
        case 'glycolysis': {
            const c = CPM.glycolysis[step] * n;
            if (step === 10) return rev ? [['c10', c]] : [['p10', c]];
            // Reversed shared steps run on the Calvin track while the Calvin cycle is on
            if (rev && (step === 2 || step === 3 || step === 5 || step === 6) && simState.calvinEnabled) return [['c' + step, c]];
            return [['g' + step, s * c]];
        }
        case 'calvin': return step === 0 || step === 7 ? [['c' + step, CPM.calvin[step] * n]] : [];
        case 'ppp': return [['p' + step, CPM.ppp[step] * n]];
        // Citrate synthase: OAA's four carbons round the circle, acetyl's two in from the spur
        case 'krebs': return step === 0 ? [['k0', s * 4 * n], ['kin', s * 2 * n]] : [['k' + step, s * CPM.krebs[step] * n]];
        // Thiolase carries the whole chain round to the fatty-acid station, where an acetyl leaves
        // down the spur (both, from acetoacetyl-CoA); KAS the reverse, n being the chain it makes
        case 'betaox': return step === 3 ? [['b3', s * n], ['bspur', s * (n <= 4 ? 4 : 2)]] : [['b' + step, s * n]];
        case 'pdh': return [['pdh', 2 * n]];
        case 'pdc': return [['pdc', 2 * n]];
        case 'fermentation': return [['pdc', 2 * n], ['adh', 2 * n]];
        case 'adh': return [['adh', (rev ? 2 : -2) * n]];   // the track runs acetaldehyde → ethanol
        case 'ldh': return [['ldh', s * 3 * n]];
        case 'aldh': return [['aldh', 2 * n]];
        case 'acs': return [['acs', 2 * n]];
        // The whole-turn services, by their stoichiometry
        case 'run_glycolysis_upper': return ['g0', 'g1', 'g2', 'g3'].map(k => [k, 6 * s]);
        case 'run_glycolysis_lower': return rev ? lowerBack() : ['g5', 'g6', 'g7', 'g8', 'g9'].map(k => [k, 6]);
        // Six RuBP fixed; twelve triose phosphates reduced; ten of them regenerate the six RuBP
        case 'run_calvin': return [['c0', 30], ['c6', 36], ['c5', 36], ['c3', 30], ['c2', 30], ['c10', 30], ['c7', 30]];
        // Six G6P oxidized to six R5P; the R5P reshuffled to five F6P
        case 'run_ppp': return [['p0', 36], ['p1', 36], ['p2', 30], ['p10', 30]];
        case 'run_krebs': return [['kin', 4], ['k0', 8], ['k1', 12], ['k2', 10], ['k3', 8], ['k4', 8], ['k5', 8], ['k6', 8], ['k7', 8]];
        case 'run_betaox': {
            const chain = spiral(n || 16);
            return [['b0', s * chain], ['b1', s * chain], ['b2', s * chain], ['b3', s * chain], ['bspur', s * (n || 16)]];
        }
    }
    return [];
}

/** Observer for dispatch.js onReaction. */
export function recordReaction(key, step, direction, res) {
    const rev = direction === 'reverse';
    const segs = route(key, step, rev, res);
    for (const [id, a] of segs) raw[id] = (raw[id] || 0) + a / TAU;
    for (const fn of _listeners) fn(key, step, rev, res, segs);
}

/** Listen for routed reactions (the map uses this for yield labels). */
export function onFlux(fn) { _listeners.push(fn); }

/** Advance the integrators by dt seconds. */
export function updateFlux(dt) {
    const k = Math.exp(-dt / TAU), ks = 1 - Math.exp(-dt / SMOOTH);
    for (const id in raw) {
        raw[id] *= k;
        const f = flux[id] || 0;
        flux[id] = f + (raw[id] - f) * ks;
    }
}

export function resetFlux() {
    for (const id in raw) raw[id] = 0;
    for (const id in flux) flux[id] = 0;
}
