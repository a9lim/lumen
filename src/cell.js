// Cell — the app's handle on the engine: which cell is under the microscope,
// its switches (a line knocked out, uncoupling), its environment and dials,
// and the verb. ui.js and main.js talk to this; the renderer only sees the
// window's picture and calls back through main.js.
import { createEngine } from './engine/engine.js';
import { runCompare, coefficients } from './compare.js';
import { CELLS } from './engine/cells.js';
import { LINE_REACTIONS, COMPLEX, segments } from './mapbind.js';
import { simState } from './state.js';
import Win from './window.js';
import { bindFlux } from './flux.js';

// The presets' cells
export const CELL_OF = {
    cyanobacterium: 'cyanobacterium', animalCell: 'animalCell', obligateAnaerobe: 'obligateAnaerobe',
    plantChloroplast: 'plantChloroplast', archaeon: 'archaeon', custom: 'custom',
};
export const SLOWDOWNS = [300, 100, 30, 10, 3];
// The fluxes a held enzyme's control is reported over, besides its own
export const SYSTEM = [['EX_glc', 'glucose uptake'], ['RBPC', 'carbon fixation'], ['PSII', 'water splitting'], ['CYTOX', 'O₂ use'], ['ATPS', 'ATP synthase'], ['BIOMASS', 'growth'], ['TPT', 'export']];

const Cell = {
    engine: null, id: null, lines: {}, seg: {},
    compare: null, onCompare: null, held: null, _worker: null, _seq: 0,

    /** Put a preset's cell under the microscope: a fresh engine, run to a living state. */
    use(preset, specId, warmFor = 40) {
        this.cancelCompare(); this.held = null;
        this.id = CELL_OF[preset];
        this.engine = createEngine(this.id, { seed: 1 });
        this.lines = Object.fromEntries(Object.keys(LINE_REACTIONS).map(k => [k, true]));
        this.seg = segments(this.has);
        this.engine.applyEnv();
        this.warm(warmFor);
        Win.attach(this.engine, specId);
        bindFlux(this.engine, this.seg);
        this.mirror();
    },

    /** Start this cell over: its starting state, run to a living state again. */
    reset(specId, warmFor = 40) {
        const env = { ...this.engine.env }, dial = { ...this.engine.dial };
        this.cancelCompare(); this.held = null;
        this.engine.reset();
        Object.assign(this.engine.env, env); Object.assign(this.engine.dial, dial);
        this.applySwitches();
        this.engine.applyEnv();
        this.warm(warmFor);
        Win.attach(this.engine, specId);
        bindFlux(this.engine, this.seg);
    },

    /** Run the model silently, so the frame opens on a cell already running. */
    warm(seconds) { for (let t = 0; t < seconds; t += 1) this.engine.advance(1); },

    /** Whether this cell has a reaction. */
    has: (rid) => !!Cell.engine && rid in Cell.engine.rIndex,

    /** A line's switch: its reactions stay while any line they belong to is on. */
    setLine(line, on) { this.lines[line] = on; this.applySwitches(); },
    applySwitches() {
        const e = this.engine, owners = {};
        for (const [line, rids] of Object.entries(LINE_REACTIONS)) for (const r of rids) (owners[r] ||= []).push(line);
        for (const [r, ls] of Object.entries(owners)) {
            const j = e.rIndex[r]; if (j == null) continue;
            e.state.activity[j] = ls.some(l => this.lines[l]) ? 1 : 0;
        }
        const u = e.rIndex.UCP; if (u != null) e.state.activity[u] = simState.uncouplingEnabled ? 1 : 0;
        this.checkCompare();
    },

    /** The environment: light (0–1), O₂ and CO₂ (fractions of air). */
    setEnv(key, v) { this.engine.env[key] = v; this.engine.applyEnv(); this.mirror(); this.checkCompare(); },
    /** A demand dial: ATP demand (mM/s), growth (/h) or export (mM/s). */
    setDial(key, v) { this.engine.dial[key] = v; this.checkCompare(); },
    mirror() { simState.lightOn = this.engine.env.light > 0; simState.oxygenAvailable = this.engine.env.o2 > 0; },

    /**
     * The verb: pulse (1) or inhibit (−1) the enzymes of one target or several
     * (a corridor's twin segments, a loop's), each reaction once however many
     * segments draw it. hold sustains ×(1 ± HOLD) and starts the paired baseline.
     */
    pulse(target, sign, hold = false) {
        const e = this.engine, rids = this.targets(target).filter(r => e.state.activity[e.rIndex[r]] > 0);
        // one hold at a time: let the last go before this one takes, since they may share enzymes
        if (hold && rids.length && this.held) this.release(this.held);
        for (const r of rids) e.pulse(e.rIndex[r], sign, hold);
        if (hold && rids.length) { this.held = target; this.startCompare(target, sign, rids); }
        return rids.length > 0;
    },
    release(target) {
        for (const r of this.targets(target)) this.engine.release(this.engine.rIndex[r]);
        if (this.held && String(this.held) === String(target)) this.held = null;
    },
    /**
     * A target's reactions, each once: a segment's ('seg:g5'), a complex's
     * ('mem:atpSyn'), a loop's ('line:krebs'), or an array of targets.
     */
    targets(target) {
        if (Array.isArray(target)) return [...new Set(target.flatMap(t => this.targets(t)))];
        const [kind, id] = target.split(':');
        let rids = [];
        if (kind === 'seg') rids = (this.seg[id] || []).map(([r]) => r);
        else if (kind === 'mem') rids = (COMPLEX[id] || []).filter(this.has);
        else if (kind === 'line') rids = Object.values(this.seg).flat().filter(([r]) => (LINE_REACTIONS[id] || []).includes(r)).map(([r]) => r);
        return [...new Set(rids)].filter(this.has);
    },

    /**
     * The paired baseline (compare.js): a held copy of the cell and an unheld
     * one from this moment, run to a steady state off the picture, for the
     * held enzymes' control coefficients. Conditions changing cancel it.
     */
    startCompare(target, sign, rids) {
        this.cancelCompare();
        const e = this.engine, id = ++this._seq, js = rids.map(r => e.rIndex[r]);
        // its own flux: the target's reaction carrying the most now
        const own = rids.reduce((a, r) => Math.abs(e.state.v[e.rIndex[r]]) > Math.abs(e.state.v[e.rIndex[a]]) ? r : a, rids[0]);
        const asked = [own, ...SYSTEM.map(([r]) => r).filter(r => r !== own && this.has(r))];
        const c = this.compare = { id, targets: [].concat(target), sign, rids, own, t: 0, state: 'running', C: null, steady: false, sig: this._sig() };
        // Transient pushes (pulses, a bolus of food) don't change the steady state it reports; conditions do
        const finish = (res) => {
            if (this.compare !== c || c.state !== 'running') return;
            if (this._sig() !== c.sig) { this.cancelCompare('conditions'); return; }
            Object.assign(c, { state: 'done', t: res.t, steady: res.steady, C: res.steady ? coefficients(res, sign, e.rIndex, asked) : null });
            this.onCompare?.(c);
        };
        const snap = e.snapshot();
        if (typeof Worker !== 'undefined') {
            try {
                const w = this._worker = new Worker(new URL('./compare.js', import.meta.url), { type: 'module' });
                w.onmessage = (ev) => { if (ev.data.id !== id) return; if (ev.data.done) { finish(ev.data); w.terminate(); if (this._worker === w) this._worker = null; } else c.t = ev.data.progress; };
                w.postMessage({ id, cellId: this.id, snap, js, sign });
                return;
            } catch { this._worker = null; }
        }
        setTimeout(() => finish(runCompare(this.id, snap, js, sign)), 0);
    },
    cancelCompare(why) {
        if (this._worker) { this._worker.terminate(); this._worker = null; }
        if (this.compare && this.compare.state === 'running') { this.compare.state = why ? 'cancelled' : 'gone'; if (why) this.onCompare?.(this.compare); }
        if (!why) this.compare = null;
    },
    /** Called as the dashboard refreshes: a running comparison whose conditions changed is cancelled. */
    checkCompare() { if (this.compare && this.compare.state === 'running' && this._sig() !== this.compare.sig) this.cancelCompare('conditions'); },
    _sig() { const e = this.engine; return JSON.stringify([e.env, e.dial]) + Array.from(e.state.activity).join(); },
};

export default Cell;
export { CELLS };
