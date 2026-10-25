// Compare — the sustained verb's paired baseline (VISION.md: the verb).
// Holding an enzyme sustains a small perturbation, its activity ×(1 ± HOLD).
// The comparison starts two copies of the cell from that moment, one held and
// one not, and runs both to a steady state. There each flux's response gives
// the enzyme's flux control coefficient over it, C = d ln J / d ln e ≈
// ln(J_held / J_base) / ln(1 ± HOLD) (Kacser & Burns 1973), reported only once
// a steady state exists. In the page it runs in a module worker, ahead of the
// picture; the tests call runCompare directly.
import { createEngine, HOLD } from './engine/engine.js';

const MAX_T = 900;      // model s to look for a steady state
const CALM = 5;         // seconds in a row with every flux still, in both copies
const TOL = 1e-3;       // still: no flux changes by more than this share a second
const FLOOR = 1e-3;     // mM/s: fluxes smaller than this are too small to judge

/** Run a held copy and its baseline from snap until both are steady: { t, steady, va, vb }. */
export function runCompare(cellId, snap, js, sign, onProgress) {
    const a = createEngine(cellId), b = createEngine(cellId);
    a.restore(snap); b.restore(snap);
    for (const j of js) a.pulse(j, sign, true);
    let last = null, calm = 0, t = 0;
    while (t < MAX_T) {
        a.advance(1); b.advance(1); t++;
        const va = Float64Array.from(a.evaluate()), vb = Float64Array.from(b.evaluate());
        if (last) {
            let d = 0;
            for (let j = 0; j < va.length; j++) {
                d = Math.max(d, Math.abs(va[j] - last[0][j]) / (Math.abs(va[j]) + FLOOR), Math.abs(vb[j] - last[1][j]) / (Math.abs(vb[j]) + FLOOR));
            }
            calm = d < TOL ? calm + 1 : 0;
            if (calm >= CALM) return { t, steady: true, va, vb };
        }
        last = [va, vb];
        if (onProgress && t % 20 === 0) onProgress(t);
    }
    return { t, steady: false, va: last[0], vb: last[1] };
}

/** Control coefficients from a finished comparison, per reaction asked: C, or null where the flux is too small to judge. */
export function coefficients(res, sign, rIndex, rids) {
    const out = {};
    for (const r of rids) {
        const j = rIndex[r];
        if (j == null) continue;
        const A = res.va[j], B = res.vb[j];
        out[r] = Math.abs(B) < FLOOR || A * B <= 0 ? null : Math.log(A / B) / Math.log(1 + sign * HOLD);
    }
    return out;
}

// As a worker: one comparison per message
if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
    globalThis.onmessage = (ev) => {
        const { id, cellId, snap, js, sign } = ev.data;
        const res = runCompare(cellId, snap, js, sign, (t) => globalThis.postMessage({ id, progress: t }));
        globalThis.postMessage({ id, done: true, ...res });
    };
}
