// Window — panel a as a window onto the cell (VISION.md: the window). The
// engine's concentrations and rates are authoritative; this samples what a
// fixed slab of the cut would show, and writes it into `store`, the picture's
// state, which nothing in the engine reads (display noise never feeds back).
//
// - The stroma's molecules are the slab's mean counts at the cell's
//   concentrations: each pool's total fixed at its mean count, its forms at
//   the cell's ratio. The slab is the cut's length (fixed per specimen, from
//   its complexes' footprints) by the band's 16.5 nm by 20 nm deep.
// - Each drawn complex is a representative centre: it turns over at its
//   turnover number times the share of its capacity in use, at the clock's
//   speed (Win.speed, model seconds a wall second). Its turnovers are what the scene draws: electrons down
//   the chain, photons, protons crossing, ATP synthase's thirds of a turn, O₂.
//   A chain's entry (NDH-1, SDH, PSII, cyclic PSI) sends an electron; it
//   waits on its carrier at each later complex until that complex turns over,
//   and a turnover no drawn electron meets takes one from its donor's pool
//   (a short hop). So every drawn effect is that complex's own turnover.
// - Past MAX_RATE a centre's turnovers are drawn one in w, each standing for
//   w (Win.thin, which the caption states).
// - Threads and dockings are sampled from the one-way fluxes that change a
//   drawn pool in the slab's compartment: coupling between a pool and an
//   enzyme, not one molecule's journey. A reaction's forward and backward
//   events pair up: the paired share is exchange (a thread, the pool as it
//   was), and only its net share changes a molecule. Past MAX_EVENTS a
//   second, one in several is drawn.
// - The lumen's protons are drawn one per 2 mV of Δp, not counted: almost all
//   translocated protons are bound to buffers.
import { store } from './state.js';
import { SPECIES, ACYL } from './engine/species.js';
import { KCAT } from './engine/rates.js';
import { WIDTH, SPECIMENS } from './specimens.js';
import { STATION, COMPLEX, POOLS, stationSpecies } from './mapbind.js';
import Renderer from './renderer.js';
import { Membrane } from './membrane.js';

const NA = 6.02214076e23;
const BAND_NM = 16.5, DEPTH_NM = 20, GAP_NM = 3;
export const MV_PER = 2;                 // mV of Δp per proton drawn in the lumen
const MAX_RATE = 8;                      // drawn turnovers per second per centre, at most (past it, one in w)
const MAX_EVENTS = 3;                    // drawn coupling events per second per reaction, pool and direction, at most
const CREDIT_WAIT = 0.6;                 // wall s a later complex's turnover waits for a drawn electron
// Electron chains sent by an entry complex's turnover (each electron drawn is a pair), and the
// later complexes it must wait for, by the segment it enters them on
const CHAINS = {
    NDH1: { keys: ['ndh1', 'pq', 'cytb6f', 'pc', 'cytOx'], type: 'resp', gates: { 2: 'CYTBF', 3: 'CYTOX' } },
    SDH: { keys: ['sdh', 'pq', 'cytb6f', 'pc', 'cytOx'], type: 'resp', gates: { 2: 'CYTBF', 3: 'CYTOX' } },
    PSII: { keys: ['psii', 'pq', 'cytb6f', 'pc', 'psi', 'fd', 'fnr'], type: 'photo', gates: { 2: 'CYTBF', 4: 'PSI', 5: 'FNR' } },
    // cyclic flow's own step is ferredoxin to the quinone pool; PSI's photochemistry is PSI's turnover
    CEF: { keys: ['fd', 'pq', 'cytb6f', 'pc', 'psi'], type: 'cyclic', gates: { 2: 'CYTBF', 3: 'PSI' } },
    // the cyanobacterium's NDH-1 takes ferredoxin
    NDH1F: { keys: ['fd', 'ndh1', 'pq', 'cytb6f', 'pc', 'cytOx'], type: 'resp', gates: { 3: 'CYTBF', 4: 'CYTOX' } },
};
// Past plastocyanin a ferredoxin-fed chain's electron goes back to PSI (cyclic flow) or on to the oxidase,
// as those two take plastocyanin's electrons (_fire): in the dark, all of it to the oxidase
const BRANCH = {
    CEF: [CHAINS.CEF, { keys: ['fd', 'pq', 'cytb6f', 'pc', 'cytOx'], type: 'resp', gates: { 2: 'CYTBF', 3: 'CYTOX' } }],
    NDH1F: [{ keys: ['fd', 'ndh1', 'pq', 'cytb6f', 'pc', 'psi'], type: 'cyclic', gates: { 3: 'CYTBF', 4: 'PSI' } }, CHAINS.NDH1F],
};
// Electrons per turnover where not two: a drawn turnover is a pair, so PSI's are drawn at half its rate
const ELECTRONS = { PSI: 1 };
// Protons each turnover pumps up through a drawn complex (per electron pair; ATP synthase's run backward are its ring's)
const PUMP = { NDH1: ['ndh1', 4], NDH1F: ['ndh1', 4], PSII: ['psii', 2], CYTBF: ['cytb6f', 4], CYTOX: ['cytOx', 2], BR: ['br', 1] };
// A later complex's turnover that met no drawn electron: a hop from its donor carrier, its effect on segment at
const HOPS = { CYTBF: [['pq', 'cytb6f', 'pc'], 1], CYTOX: [['pc', 'cytOx'], 0], PSI: [['pc', 'psi', 'fd'], 1], FNR: [['fd', 'fnr'], 0] };

/** The slab's volume, litres: the cut's length (complexes and their gaps) × the band × the depth. */
export function slabVolume(specId) {
    const spec = SPECIMENS[specId] || SPECIMENS.composite;
    const order = spec.order.filter(k => !(spec.frame === 'cristae' && k === 'atpSyn'));
    const L = order.reduce((a, k) => a + WIDTH[k], 0) + GAP_NM * (order.length - 1) + 20;
    return L * BAND_NM * DEPTH_NM * 1e-24;
}

const Win = {
    engine: null, specId: 'thylakoid', speed: 1 / 30, V: 0, perMM: 0, comp: 'c',
    rng: Math.random, pumps: [], credits: [], thin: {}, rate: {},

    /** Look through the window at a new engine (a preset or a reset), at the specimen's slab. */
    attach(engine, specId) {
        this.engine = engine; this.specId = specId;
        this.V = slabVolume(specId);
        this.perMM = 1e-3 * this.V * NA;          // molecules in the slab per mM
        this.comp = 'm' in engine.model.comps ? 'm' : 'c';
        // protons through ATP synthase per ATP: its ring's c subunits over three; the drawing's ring too
        this.hPerAtp = 'ATPS' in engine.rIndex ? -engine.coupling(engine.rIndex.ATPS).nH : 4;
        this.hAcc = 0;
        Membrane.ring = engine.cell.ring || 12;
        this.rng = engine.rng.stream('window');
        this.pumps = []; this.credits = []; this.thin = {}; this.rate = {};
        for (const k of ['atpOxidative', 'atpHydrolyzed', 'o2Produced', 'o2Consumed', 'protonsLeaked', 'protonsNnt', 'rosProduced', 'rosScavenged']) store[k] = 0;
        this.read();
    },

    /** The slab's mean count of a species in a compartment role. */
    count(id, role) {
        const e = this.engine, comp = role === 'mito' ? ('m' in e.model.comps ? 'm' : 'c') : role === 'cyto' ? 'c' : role;
        return e.conc(id, comp) * this.perMM;
    },

    /** Write the picture: the pools' counts and forms, the stations' counts, Δp, health. */
    read() {
        const e = this.engine;
        for (const [k, [on, offs]] of Object.entries(POOLS)) {
            const a = e.conc(on, this.comp), b = offs.reduce((s, id) => s + e.conc(id, this.comp), 0);
            const tot = Math.round((a + b) * this.perMM);
            const T = k === 'atp' ? 'totalAtpAdp' : k === 'nadh' ? 'totalNad' : 'totalNadp';
            store[T] = tot; store[k] = a + b > 0 ? Math.round(tot * a / (a + b)) : 0;
        }
        // FAD stays bound to its enzymes: there is no free pool to draw
        store.fadh2 = 0; store.totalFad = 0;
        const has = (r) => r in e.rIndex;
        for (const st of Object.keys(STATION)) store[st] = Math.round(stationSpecies(st, has).reduce((s, [id, role]) => s + this.count(id, role), 0));
        store.protonGradient = Math.max(0, Math.round(e.dp() / MV_PER));
        store.cellHealth = 100 * (1 - e.state.damage);
    },

    /**
     * Advance the picture by dt wall seconds: sample each drawn centre's
     * turnovers and the pools' coupling events. The engine has already moved.
     */
    sample(dt) {
        const e = this.engine;
        if (!e) return;
        e.evaluate();
        this.read();
        if (dt <= 0) return;
        const pos = Membrane.pos, r = this.rng;
        // Representative centres: turnover number × the share of capacity in use, at the clock's speed
        this.thin = {}; this.rate = {};
        for (const [key, rids] of Object.entries(COMPLEX)) {
            if (!pos[key]) continue;
            for (const rid of rids) {
                const j = e.rIndex[rid];
                if (j == null || !KCAT[rid]) continue;
                const vmax = this._vmax(rid), vf = e.state.vf[j], vb = e.state.vb[j];
                if (!vmax) continue;
                const net = vf - vb, k = KCAT[rid] * Math.abs(net) / vmax * this.speed * (ELECTRONS[rid] || 2) / 2;
                this.rate[rid] = Math.sign(net) * k;
                if (k <= 0) continue;
                // past the cap, one turnover in w is drawn and stands for w
                const w = Math.max(1, Math.ceil(k / MAX_RATE));
                if (w > 1) this.thin[key] = Math.max(this.thin[key] || 1, w);
                this._fire(rid, net >= 0, poisson(r, k / w * dt), w);
            }
        }
        // Where protons are crossing up, wall s⁻¹ per complex: the lumen's shortfall crosses there too (particles.js)
        const pumping = store.pumping = {};
        for (const [rid, [key, n]] of Object.entries(PUMP)) if (this.rate[rid] > 0 && pos[key]) pumping[key] = (pumping[key] || 0) + this.rate[rid] * n;
        if (this.rate.ATPS < 0 && pos.atpSyn) pumping.atpSyn = -this.rate.ATPS * this.hPerAtp;
        // A later complex's turnover that met no electron takes one from its donor's pool
        for (const c of this.credits) c.left -= dt;
        for (const c of this.credits) if (c.left <= 0) this._hop(c.rid);
        this.credits = this.credits.filter(c => c.left > 0);
        // The leak: protons back across the bilayer (or UCP), as its share of the protons spent
        const jA = e.rIndex.ATPS, jL = e.rIndex.LEAK, jU = e.rIndex.UCP;
        const atpH = jA != null ? this.hPerAtp * Math.max(0, e.state.v[jA]) : 0, leak = (jL != null ? e.state.v[jL] : 0) + (jU != null ? e.state.v[jU] : 0);
        if (atpH + leak > 0 && pos.atpSyn) {
            const kA = Math.max(0, this.rate.ATPS || 0) * this.hPerAtp;
            store.protonsLeaked += poisson(r, kA * leak / Math.max(atpH, 1e-9) * dt);
        }
        this._ros(dt);
        this._pools(dt);
        this._pump(dt);
    },

    /**
     * Superoxide in the slab: radicals appear at the model's production rate,
     * and each is cleared at the model's own rate per radical (dismutase's flux
     * over the superoxide there), so inhibiting SOD keeps them on screen longer.
     */
    _ros(dt) {
        const e = this.engine, r = this.rng;
        let made = 0;
        for (const rid of ['ROSI', 'ROSQ']) { const j = e.rIndex[rid]; if (j != null) made += Math.max(0, e.state.v[j]) * this._nu(j, 'o2s') * this._volFactor(e.reactions[j]); }
        store.rosProduced += poisson(r, made * this.perMM * this.speed * dt);
        const jS = e.rIndex.SOD, sup = e.conc('o2s', this.comp);
        const kClear = jS != null && sup > 0 ? -this._nu(jS, 'o2s') * e.state.vf[jS] * this._volFactor(e.reactions[jS]) / sup : 0;   // per model s
        // each radical cleared independently: probability 1 − e^(−k dt) this frame
        const active = store.rosProduced - store.rosScavenged, pc = 1 - Math.exp(-kClear * this.speed * dt);
        let gone = 0;
        for (let i = 0; i < Math.min(active, 200); i++) if (r() < pc) gone++;
        store.rosScavenged += active > 200 ? Math.round(active * pc) : gone;
    },

    /** A reaction's base capacity, mM/s (a pulse raises the turnover a centre is drawn at). */
    _vmax(rid) { const e = this.engine, j = e.rIndex[rid]; return e.capacity(j); },

    /** Turnovers of a drawn centre: the chemistry already happened; this draws n of them, each standing for w. */
    _fire(rid, fwd, n, w = 1) {
        for (let i = 0; i < n; i++) {
            if (rid === 'ATPS') {
                if (fwd) store.atpOxidative += w;
                else { store.atpHydrolyzed += w; this.hAcc += this.hPerAtp; const k = Math.floor(this.hAcc); this.hAcc -= k; this._queue(k, 'atpSyn'); }
                Renderer.poolEvent('atp', fwd ? 1 : -1, 'atpSyn');
            } else if (CHAINS[rid] && fwd) {
                let C = CHAINS[rid];
                if (BRANCH[rid]) {
                    const e = this.engine, v = (r) => r in e.rIndex ? Math.max(0, e.state.v[e.rIndex[r]]) : 0, psi = v('PSI') / 2, ox = v('CYTOX');
                    // with neither taking plastocyanin's electrons, it waits at PSI
                    C = BRANCH[rid][psi + ox > 0 && this.rng() >= psi / (psi + ox) ? 1 : 0];
                }
                const cb = { 0: () => this._effect(rid) }, gates = {};
                for (const [seg, g] of Object.entries(C.gates)) { cb[seg] = () => this._effect(g); gates[seg] = () => this._take(g); }
                Renderer.spawnElectronChain(C.keys, C.type, cb, gates);
            } else if (HOPS[rid] && fwd) this.credits.push({ rid, left: CREDIT_WAIT });
            // FNR run backward (the dark): NADPH's electrons onto ferredoxin, the pool NDH-1 takes them from
            else if (rid === 'FNR') Renderer.spawnElectronChain(['fnr', 'fd'], 'resp', { 0: () => Renderer.poolEvent('nadph', -1, 'fnr') });
            else if (rid === 'BR' && fwd) { Renderer.spawnPhoton('br'); this._queue(1, 'br'); }
            // NNT takes one proton out of the lumen per hydride it moves (store.protonsNnt, particles.js)
            else if (rid === 'NNT' && fwd) { store.protonsNnt += w; Renderer.poolEvent('nadh', -1, 'nnt'); Renderer.poolEvent('nadph', 1, 'nnt'); }
        }
    },

    /** What one turnover of a chain's complex does where it is drawn (per electron pair). */
    _effect(rid) {
        if (PUMP[rid]) this._queue(PUMP[rid][1], PUMP[rid][0]);
        if (rid === 'NDH1') Renderer.poolEvent('nadh', -1, 'ndh1');
        else if (rid === 'PSII') { Renderer.spawnPhoton('psii'); Renderer.spawnPhoton('psii'); store.o2Produced += 0.5; }
        else if (rid === 'PSI') { Renderer.spawnPhoton('psi'); Renderer.spawnPhoton('psi'); }
        else if (rid === 'CYTOX') store.o2Consumed += 0.5;
        else if (rid === 'FNR') Renderer.poolEvent('nadph', 1, 'fnr');
    },
    /** A waiting electron meets a later complex's turnover, if one is waiting. */
    _take(rid) {
        const i = this.credits.findIndex(c => c.rid === rid);
        if (i < 0) return false;
        this.credits.splice(i, 1);
        return true;
    },
    _hop(rid) {
        const [keys, at] = HOPS[rid];
        Renderer.spawnElectronChain(keys, 'hop', { [at]: () => this._effect(rid) });
    },

    /** Protons pumped up through a complex, a few frames apart (wall time, not timers). */
    _queue(n, key) { for (let i = 0; i < n; i++) this.pumps.push({ key, t: i * 0.15 }); },
    _pump(dt) {
        for (const p of this.pumps) p.t -= dt;
        for (const p of this.pumps.filter(p => p.t <= 0)) { const x = Membrane.pos[p.key]?.x; if (x != null) Renderer.spawnProton(x, 'up'); }
        this.pumps = this.pumps.filter(p => p.t > 0);
    },

    /**
     * Coupling events: each map reaction that makes or spends a drawn pool in
     * the slab's compartment touches molecules at its one-way rates there (a
     * reaction at equilibrium still turns them over), and a thread runs to it.
     * Forward and backward pair up: an event in the net direction changes a
     * molecule with the chance (v₊ − v₋)/v₊, and the rest are exchange, a
     * thread only (d ±0.5), so the drawn forms move at the net rate.
     */
    _pools(dt) {
        const e = this.engine, r = this.rng, comp = this.comp;
        for (let j = 0; j < e.reactions.length; j++) {
            const R = e.reactions[j];
            if (R.membrane || R.exchange || R.transport) continue;
            const vf = e.state.vf[j], vb = e.state.vb[j];
            if (!vf && !vb) continue;
            const net = Math.abs(vf - vb) / Math.max(vf, vb);
            for (const [i, nu] of R.stoich) {
                const sp = e.species[i];
                if (sp.comp !== comp || !(sp.id in POOLS)) continue;
                // forward makes ν of the charged form; backward the reverse
                for (const [rate, sgn] of [[vf, 1], [vb, -1]]) {
                    const n = poisson(r, Math.min(MAX_EVENTS, Math.abs(rate * nu) * this.perMM * this.speed * this._volFactor(R)) * dt);
                    const major = (sgn > 0) === (vf >= vb);
                    for (let k = 0; k < n; k++) Renderer.mapEvent(sp.id, Math.sign(nu) * sgn * (major && r() < net ? 1 : 0.5), R.id);
                }
            }
        }
    },
    _volFactor(R) { const c = this.engine.model.comps; return (c[R.comp] || 1) / (c[this.comp] || 1); },
    /** A species' coefficient in reaction j (made +, spent −). */
    _nu(j, id) { const e = this.engine; let n = 0; for (const [i, nu] of e.reactions[j].stoich) if (e.species[i].id === id) n += nu; return n; },
};

/** A Poisson draw with mean m (small m: a Bernoulli trial and a remainder). */
function poisson(r, m) {
    if (m <= 0) return 0;
    if (m < 30) { let k = 0, p = Math.exp(-m), s = p; const u = r(); while (u > s && k < 100) { k++; p *= m / k; s += p; } return k; }
    return Math.max(0, Math.round(m + Math.sqrt(m) * (r() + r() + r() - 1.5) * 2));
}

export { ACYL, SPECIES };
export default Win;
