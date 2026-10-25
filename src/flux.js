// Flux — how much carbon each section of the map carries: the engine's
// rates through each segment's reactions, weighed by the carbon each carries
// along it (mapbind.js), in mM of carbon per second of model time (rates in
// the matrix scaled to the cytosol's volume), smoothed for drawing so line
// weight and train speed read carbon flux.
const SMOOTH = 0.5;            // s (wall), smoothing of the drawn value
export const RUNNING = 0.02;   // mM C/s under which a segment counts as idle

export const flux = {};        // segment id → signed mM C/s (drawn)
let engine = null, SEG = {};

/** Read flux from this engine through these segment bindings. */
export function bindFlux(e, seg) {
    engine = e; SEG = seg;
    for (const id in flux) delete flux[id];
    updateFlux(1e9);
}

/** A segment's carbon flux now, unsmoothed. */
export function segmentFlux(id) {
    const parts = SEG[id];
    if (!parts || !engine) return 0;
    const v = engine.state.v, comps = engine.model.comps;
    let f = 0;
    for (const [rid, w, mode] of parts) {
        const j = engine.rIndex[rid];
        let x = v[j] * (comps[engine.reactions[j].comp] || 1);
        if (mode === 'pos') x = Math.max(0, x); else if (mode === 'neg') x = Math.min(0, x);
        f += w * x;
    }
    return f;
}

/** Ease the drawn values toward the engine's (dt in wall seconds); the rates are already evaluated. */
export function updateFlux(dt) {
    const k = 1 - Math.exp(-dt / SMOOTH);
    for (const id in SEG) { const f = flux[id] || 0; flux[id] = f + (segmentFlux(id) - f) * k; }
}

/** Whether a segment's enzymes exist in this cell, and whether any is switched on. */
export function segmentState(id) {
    const parts = SEG[id];
    if (!parts || !parts.length || !engine) return { present: false, on: false };
    return { present: true, on: parts.some(([rid]) => engine.state.activity[engine.rIndex[rid]] > 0) };
}

export function resetFlux() { for (const id in flux) flux[id] = 0; }

/** The part of a segment carrying the most now: [reaction id, carbon weight], or null. */
export function segmentMain(id) {
    const parts = SEG[id];
    if (!parts || !parts.length || !engine) return null;
    const v = engine.state.v;
    let main = parts[0], best = -1;
    for (const p of parts) { const x = Math.abs(v[engine.rIndex[p[0]]] * p[1]); if (x > best) { best = x; main = p; } }
    return main;
}

/** Whether the cell under the microscope has a reaction. */
export const cellHas = (rid) => !!engine && rid in engine.rIndex;

// An effector's glyph: a drawn pool where it is one (or its ratio's numerator), else a word
const POOL_OF = { atp: 'atp', adp: 'atp', amp: 'atp', nadh: 'nadh', nad: 'nadh', nadph: 'nadph', nadp: 'nadph' };
const WORD = { light: 'light', dark: 'dark', dp: 'Δp', fdp: 'F1,6BP', '3pg': '3-PGA', g6p: 'G6P', accoa: 'AcCoA', coa: 'CoA', cit: 'citrate', malcoa: 'malonyl-CoA', mal__L: 'malate', pmtcoa: 'palmitoyl-CoA', succoa: 'Suc-CoA' };

/**
 * The regulation acting on a segment's main enzyme, as the map draws it:
 * the effector holding it back most, how it acts ('⊣' inhibits, '→' is
 * needed, '⊕' activates) and its factor. null when nothing much is acting.
 */
export function segmentGate(id) {
    const parts = SEG[id];
    if (!parts || !parts.length || !engine) return null;
    const main = segmentMain(id);
    const eff = engine.effectors(engine.rIndex[main[0]]);
    if (!eff.length) return null;
    let g = eff[0];
    for (const e of eff) if (e.f < g.f) g = e;
    if (g.f > 0.8) return null;
    const key = Array.isArray(g.what) ? g.what[0] : g.what;
    // Thioredoxin's switch reads as light's: light needed (→), or light inhibiting (⊣) what runs in the dark
    if (key === 'light' || key === 'dark') return { factor: g.f, eff: null, word: 'light', how: key === 'light' ? '→' : '⊣' };
    return { factor: g.f, eff: POOL_OF[key] || null, word: POOL_OF[key] ? null : WORD[key] || key, how: g.how === 'inh' ? '⊣' : '→' };
}
