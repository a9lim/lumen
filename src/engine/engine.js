// Engine — a cell's chemistry on its own clock, headless. The state is every
// species' concentration (mM); each reaction runs at its separable rate
// (rates.js), and the state integrates by a linearly implicit Rosenbrock
// step (ROS2: Verwer et al. 1999), since fast near-equilibrium enzymes
// turning over small pools make the system stiff. Rosenbrock steps keep
// every linear conservation law exactly, so the moieties never drift.
//
// Two clocks: the integrator's and the picture's. The integrator takes whole
// steps, each as long as accuracy allows (up to HMAX), and a step's size
// depends only on the state, so its trajectory is the same however frames
// slice time: frame rate, the clock's speed and hidden tabs can't change the
// chemistry, only how much of it a frame shows. advance(dt) steps the
// integrator past the picture's new time and shows the state there on the
// straight line between its last two steps (dense output, which keeps every
// conservation law and every concentration's sign). Anything changed from
// outside (the state, the environment, a dial, a switch, a pulse) happens at
// the picture's time: the integrator is brought back to the picture and
// starts again with short steps.
//
// Units: mM, seconds, mV, kJ/mol. A reaction's rate is in mM/s of its home
// compartment, moved as an amount (rate × its volume) into each species'
// compartment.
//
// Δp = Δψ + ΔpH (in mV) across the drawn membrane, each from its own state.
// Δψ is κψ times dq, the net charge moved to the lumen side: each reaction
// moves z, the charge on the lumen species it makes or spends (translocated
// protons, the lumen's carriers, counter-ions) plus any its carriers move
// between cytosol and matrix (network.js), so complex I moves four, the
// Q-cycle's complex III two and complex IV four. ΔpH is κH times h_l, the
// protons the lumen side has gained, nearly all of them bound to its
// buffers. Moving a proton into the lumen costs F·Δp; moving a charge alone
// costs F·Δψ, and a proton with a counter-charge F·ΔpH. Counter-ions and
// K⁺/H⁺ exchange let one relax into the other (network.js: ION, KHE).
import { buildCell } from './model.js';
import { PARAMS, KM, KM_DEFAULT } from './rates.js';
import { dg0, F, RT } from './thermo.js';
import { MOIETIES } from './species.js';
import { makeRng } from './rng.js';

const V_MEDIUM = 50;       // the medium's volume, relative to the cytosol: finite, so substrates run out
const AIR_O2 = 0.25;       // mM O₂ in air-saturated water, 25 °C
const AIR_CO2 = 0.015;     // mM CO₂ in water under air
const PI_MEDIUM = 5;       // mM phosphate in the medium, held
const RHO = 300;           // g dry weight per litre of cytosol (E. coli, about 0.3 g/mL): turns a growth rate into precursor demand
const GAMMA = 1 + Math.SQRT1_2;   // ROS2's γ: L-stable
// Damage with consequence: reactive oxygen peroxidises the membrane at K_DMG per mM per s, repair
// clears it at K_REP per s for REPAIR_ATP mM of ATP per unit; peroxidised lipid lets protons
// through (the leak grows up to LEAK_DMG-fold) and aconitase's iron–sulfur cluster is lost
const K_DMG = 40, K_REP = 0.05, REPAIR_ATP = 2, LEAK_DMG = 4, ACO_DMG = 0.8;
// The verb (VISION.md): a pulse multiplies an enzyme's activity by 1 + PULSE_UP at its peak, an
// inhibition by 1 − PULSE_DOWN; each fades with PULSE_TAU model seconds; pulses stack (up to
// PULSE_MAX). A hold is the small sustained perturbation, HOLD up or down, kept until let go, for
// metabolic control analysis against a paired baseline (cell.js). Being functions of model time,
// they leave a trajectory independent of frames, and a paused clock holds them.
export const PULSE_UP = 4, PULSE_DOWN = 0.9, PULSE_TAU = 1.5, PULSE_MAX = 20, HOLD = 0.1;
// Steps: error-controlled (RTOL, ATOL) up to HMAX model seconds; while a pulse fades, H_PULSE at most,
// since a step holds the pulse's factor where it started; H0 after an intervention
const RTOL = 2e-3, ATOL = 1e-6, HMAX = 60, H_PULSE = PULSE_TAU / 30, H0 = 1e-3, HMIN = 1e-9;
/** mV per pH unit: 2.303 RT/F. */
export const ZMV = RT * Math.LN10 / F * 1000;

export function createEngine(cellId, opts = {}) {
    const model = buildCell(cellId), cell = model.cell;
    const S = model.species, nS = S.length, R = model.reactions, nR = R.length;
    const vol = Float64Array.from(S, s => s.comp === 'e' ? V_MEDIUM : model.comps[s.comp]);
    const idx = (id, comp) => model.index[id + '_' + comp];
    const iHl = idx('h', 'l'), iQ = idx('dq', 'l');
    // κψ, mV per mM of charge; κH, mV per mM of protons the lumen gains (cells.js)
    const pmf = { psi: 20, ph: 1, share: 0.8, ...(cell.pmf || {}) };
    const psiOf = (x) => x[iQ] * pmf.psi, phOf = (x) => x[iHl] * pmf.ph;
    const dpOf = (x) => psiOf(x) + phOf(x);

    const env = { light: 0, o2: 1, co2: 1, ...(cell.env || {}), ...(opts.env || {}) };
    // The dials: ATP demand (mM/s), growth (per hour), a plastid's export (mM/s)
    const dial = { atp: cell.atpDemand ?? 0.6, growth: cell.growth ?? 0, export: cell.export ?? 0.5 };

    // Species the integration leaves alone: fixed (water, buffered H⁺) and the medium's gases and Pᵢ, set by
    // env; with opts.chemostat, the whole medium, so a steady state can exist (compare.js)
    const hold = Uint8Array.from(S, s => s.fixed || (s.comp === 'e' && (opts.chemostat || ['o2', 'co2', 'pi', 'atp', 'adp'].includes(s.id))) ? 1 : 0);
    const free = [...Array(nS).keys()].filter(i => !hold[i]), nF = free.length;
    const fpos = new Int32Array(nS).fill(-1); free.forEach((i, k) => { fpos[i] = k; });

    // ─── Compile each reaction ───
    const RX = R.map((r, j) => {
        const par = PARAMS[r.id] || { vmax: 1 };
        const over = (cell.kinetics || {})[r.id] || {};
        const km = { ...(par.km || {}), ...(over.km || {}) };
        const sub = [], pro = [];
        // What the reaction moves to the lumen side: charge (z: every lumen species', and its carriers'
        // between cytosol and matrix) and protons (nH)
        let z = r.z || 0, nH = 0;
        for (const [i, nu] of r.stoich) { if (S[i].comp === 'l') z += nu * S[i].charge; if (i === iHl) nH += nu; }
        for (const [i, nu] of r.stoich) {
            if (i === iHl) continue;
            if (S[i].fixed) continue;
            const K = km[S[i].id] ?? KM[S[i].id] ?? KM_DEFAULT;
            const Kd = par.kmDemand ? par.kmDemand[S[i].id] ?? par.kmDemand.default : 0;
            (nu < 0 ? sub : pro).push([i, Math.abs(nu), K, Kd]);
        }
        const regs = [...(par.reg || []), ...(over.reg || [])].map(e => compileReg(e, r.comp)).filter(Boolean);
        const law = par.law || 'cm';
        // Which species its rate reads: substrates, products, effectors, and Δp when protons cross
        const deps = new Set([...sub, ...pro].map(([i]) => i));
        for (const e of regs) { if (e.a != null) deps.add(e.a); if (e.bx != null) deps.add(e.bx); if (e.type === 'dp') { deps.add(iHl); deps.add(iQ); } }
        if (z || nH || law === 'leak') { deps.add(iHl); deps.add(iQ); }
        return {
            r, j, law, vmax: over.vmax ?? par.vmax, light: !!par.light, sub, pro, z, nH, regs,
            dmg: r.id === 'LEAK' ? 'leak' : r.id === 'ACONT' ? 'aco' : null,
            dg0: dg0(cell, r), homeVol: model.comps[r.comp],
            deps: [...deps].filter(i => !hold[i]),
            stoich: [...r.stoich.filter(([i]) => !hold[i]), ...(z ? [[iQ, z]] : [])],
        };
    });
    function compileReg(e, home) {
        // An effector names a species in the reaction's compartment, or another with a tag: 'accoa[m]'
        const pick = (id) => { const m = /^(.+?)(?:\[([clme])\])?$/.exec(id); return m[2] ? idx(m[1], m[2]) ?? idx(m[1], 'c') : idx(id, home) ?? idx(id, 'c'); };
        if (e.type === 'light' || e.type === 'dark' || e.type === 'dp') return e;
        if (Array.isArray(e.x)) {
            const a = pick(e.x[0]), bx = pick(e.x[1]);
            return a == null || bx == null ? null : { ...e, a, bx };
        }
        const a = pick(e.x);
        return a == null ? null : { ...e, a };
    }

    // The picture's state at its time t (what every reader sees), and the integrator's: its state at
    // its own time, ahead of the picture by less than a step, and the step before it (p), to draw between
    const state = {
        x: new Float64Array(nS), t: 0, damage: 0,
        activity: new Float64Array(nR).fill(1),
        v: new Float64Array(nR), vf: new Float64Array(nR), vb: new Float64Array(nR),
    };
    const I = { x: new Float64Array(nS), t: 0, damage: 0, h: H0, xp: new Float64Array(nS), tp: 0, dp: 0 };
    // The time and damage the rates are read at: the integrator's while it steps, the picture's otherwise
    const now = { t: 0, damage: 0 };
    // A tighter integrator, for checking this one against (tests)
    const rtol = opts.rtol ?? RTOL, hmax = opts.hmax ?? HMAX;

    // ─── Rates ───
    const lightOn = () => env.light / (env.light + 0.05);

    /** η_reg: the product of the reaction's effectors (rates.js) at state x. */
    function regFactor(c, x, dp) {
        let f = 1;
        for (const e of c.regs) {
            if (e.type === 'light') f *= e.b + (1 - e.b) * lightOn();
            else if (e.type === 'dark') f *= e.b + (1 - e.b) * (1 - lightOn());
            else if (e.type === 'dp') { const q = Math.pow(Math.max(dp, 0) / e.K, e.h); f *= q / (1 + q); }
            else {
                const val = e.bx != null ? x[e.a] / Math.max(x[e.bx], 1e-12) : x[e.a];
                const q = Math.pow(Math.max(val, 0) / e.K, e.h);
                f *= e.type === 'inh' ? 1 / (1 + q) : (e.b + q) / (1 + q);
            }
        }
        return f;
    }

    /** The pulses on reaction j at model time t: a multiplier on its activity. */
    const pulses = new Map();   // j → { up, down, t0, held }
    function pulseFactor(j, t) {
        const p = pulses.get(j);
        if (!p) return 1;
        const f = p.held ? 1 : Math.exp(-Math.max(0, t - p.t0) / PULSE_TAU);
        return (1 + p.up * f) * (1 - p.down * f);
    }

    /** Reaction j's forward and backward rates at state x, mM/s in its home compartment, into RF and RB. */
    let RF = 0, RB = 0;
    function rate1(j, x) {
        const c = RX[j], psi = psiOf(x), ph = phOf(x), dp = psi + ph;
        const act = state.activity[j] * (pulses.size ? pulseFactor(j, now.t) : 1);
        let V = c.vmax * act;
        if (c.r.demand === 'atp') V = dial.atp * act;
        else if (c.r.demand === 'export') V = dial.export * act;
        else if (c.r.demand === 'growth') V = dial.growth / 3600 * RHO * act;
        else if (c.r.demand === 'repair') V = K_REP * REPAIR_ATP * now.damage * act;
        if (c.dmg) V *= c.dmg === 'leak' ? 1 + LEAK_DMG * now.damage : 1 - ACO_DMG * now.damage;
        if (c.light) V *= env.light;
        if (V === 0) { RF = RB = 0; return; }
        // a conductance: the flux follows what drives it, mV (Δp for a proton, Δψ for a charge alone, ΔpH for an exchange)
        if (c.law === 'leak') { const drive = -(c.z * psi + c.nH * ph); RF = V * Math.max(drive, 0); RB = V * Math.max(-drive, 0); return; }
        if (c.law === 'diffusion') { RF = V * x[c.sub[0][0]]; RB = V * x[c.pro[0][0]]; return; }
        if (c.law === 'demand') {
            // Liebig: the scarcest precursor sets the pace (VISION.md: one row, every ingredient together)
            let m = 1;
            for (const [i, , , Kd] of c.sub) { const s = Math.max(x[i], 0); m = Math.min(m, s / (Kd + s)); }
            RF = V * m; RB = 0; return;
        }
        V *= regFactor(c, x, dp);
        let num = 1, d1 = 1, d2 = 1, prodM = 1, ksM = 1;
        for (const [i, nu, K] of c.sub) {
            const r = Math.max(x[i], 0) / K;
            num *= nu === 1 ? r : Math.pow(r, nu);
            d1 *= nu === 1 ? 1 + r : Math.pow(1 + r, nu);
            ksM *= nu === 1 ? K / 1000 : Math.pow(K / 1000, nu);
        }
        for (const [i, nu, K] of c.pro) {
            const s = Math.max(x[i], 0);
            d2 *= nu === 1 ? 1 + s / K : Math.pow(1 + s / K, nu);
            prodM *= nu === 1 ? s / 1000 : Math.pow(s / 1000, nu);
        }
        const D = d1 + d2 - 1;
        // 1/K' with the proton-motive force: each charge moved to the lumen side costs F·Δψ, each proton F·ΔpH more
        const invK = Math.exp((c.dg0 + (c.z * psi + c.nH * ph) * F / 1000) / RT);
        RF = V * num / D; RB = V * prodM * invK / ksM / D;
    }

    /** Every reaction's rate at state x: net, forward and backward. */
    function rates(x, v, vf, vb) {
        for (let j = 0; j < nR; j++) { rate1(j, x); vf[j] = RF; vb[j] = RB; v[j] = RF - RB; }
    }

    /** dx/dt at state x into out (free species only, by species index). */
    const tv = new Float64Array(nR), tf = new Float64Array(nR), tb = new Float64Array(nR);
    function deriv(x, out) {
        rates(x, tv, tf, tb);
        out.fill(0);
        for (let j = 0; j < nR; j++) {
            const c = RX[j], amount = tv[j] * c.homeVol;
            if (amount) for (const [i, nu] of c.stoich) out[i] += nu * amount / vol[i];
        }
    }

    /** The Jacobian over free species (dense, nF × nF), by finite differences reaction by reaction. */
    const J = new Float64Array(nF * nF);
    function jacobian(x) {
        J.fill(0);
        for (let j = 0; j < nR; j++) {
            const c = RX[j];
            if (!c.deps.length) continue;
            rate1(j, x); const v0 = RF - RB;
            for (const k of c.deps) {
                const xk = x[k], d = Math.max(Math.abs(xk) * 1e-6, 1e-10);
                x[k] = xk + d; rate1(j, x); x[k] = xk;
                const dv = (RF - RB - v0) / d * c.homeVol, col = fpos[k];
                if (dv) for (const [i, nu] of c.stoich) J[fpos[i] * nF + col] += nu * dv / vol[i];
            }
        }
    }

    // ─── LU of (I − γhJ), partial pivoting ───
    const A = new Float64Array(nF * nF), piv = new Int32Array(nF);
    function factor(h) {
        const g = GAMMA * h;
        for (let i = 0; i < nF * nF; i++) A[i] = -g * J[i];
        for (let i = 0; i < nF; i++) A[i * nF + i] += 1;
        for (let k = 0; k < nF; k++) {
            let p = k, mx = Math.abs(A[k * nF + k]);
            for (let i = k + 1; i < nF; i++) { const a = Math.abs(A[i * nF + k]); if (a > mx) { mx = a; p = i; } }
            piv[k] = p;
            if (p !== k) for (let j = 0; j < nF; j++) { const t = A[k * nF + j]; A[k * nF + j] = A[p * nF + j]; A[p * nF + j] = t; }
            const d = A[k * nF + k];
            if (d === 0) continue;
            for (let i = k + 1; i < nF; i++) {
                const f = A[i * nF + k] /= d;
                if (f) for (let j = k + 1; j < nF; j++) A[i * nF + j] -= f * A[k * nF + j];
            }
        }
    }
    function solve(b) {
        for (let k = 0; k < nF; k++) { const p = piv[k]; if (p !== k) { const t = b[k]; b[k] = b[p]; b[p] = t; } }
        for (let i = 1; i < nF; i++) { let s = b[i]; for (let j = 0; j < i; j++) s -= A[i * nF + j] * b[j]; b[i] = s; }
        for (let i = nF - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < nF; j++) s -= A[i * nF + j] * b[j]; b[i] = s / A[i * nF + i]; }
    }

    // ─── ROS2 with an embedded first-order (linearly implicit Euler) error estimate ───
    const f0 = new Float64Array(nS), f1 = new Float64Array(nS), y = new Float64Array(nS);
    const k1 = new Float64Array(nF), k2 = new Float64Array(nF);
    /** One step of the integrator from its state: as long as the error allows, retried shorter if not. */
    function step() {
        const x = I.x;
        now.t = I.t; now.damage = I.damage;
        deriv(x, f0);
        jacobian(x);
        let fading = false;
        for (const p of pulses.values()) if (!p.held) { fading = true; break; }
        I.h = Math.min(I.h, hmax, fading ? H_PULSE : Infinity);
        for (;;) {
            const h = I.h;
            factor(h);
            for (let k = 0; k < nF; k++) k1[k] = f0[free[k]];
            solve(k1);
            y.set(x);
            for (let k = 0; k < nF; k++) y[free[k]] += h * k1[k];
            deriv(y, f1);
            for (let k = 0; k < nF; k++) k2[k] = f1[free[k]] - 2 * k1[k];
            solve(k2);
            let err = 0, neg = false;
            for (let k = 0; k < nF; k++) {
                const i = free[k], yn = x[i] + h * (1.5 * k1[k] + 0.5 * k2[k]);
                y[i] = yn;
                if (yn < -ATOL && i !== iQ && i !== iHl) neg = true;   // Δψ's charge and ΔpH's protons may go either way
                const e = h * 0.5 * (k1[k] + k2[k]);
                err = Math.max(err, Math.abs(e) / (ATOL + rtol * Math.max(Math.abs(x[i]), Math.abs(yn))));
            }
            if ((neg || err > 1 || !Number.isFinite(err)) && h > HMIN) {
                I.h = Math.max(HMIN, h * (neg || !Number.isFinite(err) ? 0.25 : Math.max(0.2, 0.9 / Math.sqrt(err))));
                continue;
            }
            for (let k = 0; k < nF; k++) { const i = free[k]; x[i] = y[i] < 0 && i !== iQ && i !== iHl ? 0 : y[i]; }
            // Damage, a slow variable outside the chemistry: made by reactive oxygen (a per second, of what
            // is undamaged), cleared only as fast as repair spends its ATP (k per second, of what is
            // damaged), solved exactly over the step with both held
            if (rosIdx.length) {
                let ros = 0; for (const i of rosIdx) ros += x[i];
                const a = K_DMG * ros;
                let k = 0;
                if (jRepair != null) { now.damage = 1; rate1(jRepair, x); k = (RF - RB) / REPAIR_ATP; }
                const d = I.damage, s = a + k, eq = s > 0 ? a / s : d;
                I.damage = Math.min(1, Math.max(0, eq + (d - eq) * Math.exp(-s * h)));
            }
            I.t += h;
            I.h = Math.min(hmax, h * Math.min(3, 0.9 / Math.sqrt(Math.max(err, 1e-6))));
            return h;
        }
    }

    // ─── The picture and the integrator ───
    // What the picture last showed, so a change from outside is noticed before the next step
    const seen = { x: new Float64Array(nS), activity: new Float64Array(nR), damage: 0, env: [], dial: [] };
    function remember() {
        seen.x.set(state.x); seen.activity.set(state.activity); seen.damage = state.damage;
        seen.env = Object.values(env); seen.dial = Object.values(dial);
    }
    function touched() {
        if (state.damage !== seen.damage) return true;
        for (let i = 0; i < nS; i++) if (state.x[i] !== seen.x[i]) return true;
        for (let j = 0; j < nR; j++) if (state.activity[j] !== seen.activity[j]) return true;
        const ev = Object.values(env), dv = Object.values(dial);
        return ev.length !== seen.env.length || dv.length !== seen.dial.length || ev.some((v, k) => v !== seen.env[k]) || dv.some((v, k) => v !== seen.dial[k]);
    }
    /** Bring the integrator back to the picture: whatever changed, changed now. */
    function pin() {
        I.x.set(state.x); I.t = state.t; I.damage = state.damage; I.h = H0;
        I.xp.set(I.x); I.tp = I.t; I.dp = I.damage;
        remember();
    }
    /** Show the state at time t, on the line between the integrator's last two steps. */
    function show(t) {
        const span = I.t - I.tp, th = span > 0 ? (t - I.tp) / span : 1;
        for (let i = 0; i < nS; i++) state.x[i] = I.xp[i] + th * (I.x[i] - I.xp[i]);
        state.damage = I.dp + th * (I.damage - I.dp);
        state.t = t;
        remember();
    }

    const rosIdx = ['o2s', 'h2o2'].flatMap(id => ['c', 'm'].map(c => idx(id, c))).filter(i => i != null);
    const jRepair = R.findIndex(r => r.id === 'REPAIR') >= 0 ? R.findIndex(r => r.id === 'REPAIR') : null;
    const rng = makeRng(opts.seed ?? 1);
    const clock = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();

    const engine = {
        model, cell, env, dial, state, rng, pmf, vol,
        get t() { return state.t; },
        get x() { return state.x; },
        /** The integrator's own clock and state (the picture is at engine.t, at most a step behind). */
        get integrator() { return { t: I.t, x: I.x, h: I.h }; },
        index: model.index,
        rIndex: Object.fromEntries(R.map((r, j) => [r.id, j])),
        species: S, reactions: R,

        /**
         * Advance the picture's clock by dt model seconds, stepping the integrator past it. Given ms, it
         * stops stepping after that much wall time and the picture waits where the integrator got to.
         * Returns the model seconds it fell short by: 0 when it got there.
         */
        advance(dt, ms = Infinity) {
            if (touched()) pin();
            const end = state.t + dt, t0 = ms < Infinity ? clock() : 0;
            while (I.t < end) {
                if (ms < Infinity && clock() - t0 > ms) break;
                I.xp.set(I.x); I.tp = I.t; I.dp = I.damage;
                step();
                for (const [j, p] of pulses) if (!p.held && I.t - p.t0 > 8 * PULSE_TAU) pulses.delete(j);
            }
            const short = Math.max(0, end - I.t);
            show(short ? I.t : end);
            now.t = state.t; now.damage = state.damage;
            return short;
        },
        /** Run until nothing changes by more than tol per second (or maxT): returns the time it took. */
        settle(maxT = 600, tol = 1e-3) {
            const t0 = state.t; let last = Float64Array.from(state.x);
            while (state.t - t0 < maxT) {
                this.advance(1);
                let d = 0;
                for (const i of free) d = Math.max(d, Math.abs(state.x[i] - last[i]) / (Math.abs(last[i]) + 0.01));
                last = Float64Array.from(state.x);
                if (d < tol) break;
            }
            return state.t - t0;
        },
        /** Evaluate every rate at the picture's state (net, forward, backward). */
        evaluate() { now.t = state.t; now.damage = state.damage; rates(state.x, state.v, state.vf, state.vb); return state.v; },
        /** Concentration of a species, mM, by id and compartment; 0 if the cell has none. */
        conc(id, comp = 'c') { const i = idx(id, comp); return i == null ? 0 : state.x[i]; },
        set(id, comp, value) { const i = idx(id, comp); if (i != null) state.x[i] = value; },
        /** The proton-motive force, mV, and its parts: Δψ (mV) and ΔpH (mV; pH units are mV / ZMV). */
        dp() { return dpOf(state.x); },
        psi() { return psiOf(state.x); },
        dpH() { return phOf(state.x); },
        /** Why a reaction runs as it does: its factors, ΔG (kJ/mol) and its kinetic law ('cm', 'leak', 'diffusion', 'demand'). */
        factors(j) {
            const c = RX[j], x = state.x, psi = psiOf(x), ph = phOf(x), dp = psi + ph;
            now.t = state.t; now.damage = state.damage;
            rate1(j, x);
            // ln Q exactly: a missing substrate makes ΔG +∞, a missing product −∞
            let lnQ = 0;
            for (const [i, nu] of c.sub) lnQ -= nu * Math.log(Math.max(x[i], 0) / 1000);
            for (const [i, nu] of c.pro) lnQ += nu * (x[i] > 0 ? Math.log(x[i] / 1000) : -Infinity);
            if (Number.isNaN(lnQ)) lnQ = 0;
            const dG = c.dg0 + RT * lnQ + (c.z * psi + c.nH * ph) * F / 1000;
            // η_sat: convenience kinetics' saturation, as the rate uses it
            let num = 1, d1 = 1, d2 = 1;
            for (const [i, nu, K] of c.sub) { const r = Math.max(x[i], 0) / K; num *= Math.pow(r, nu); d1 *= Math.pow(1 + r, nu); }
            for (const [i, nu, K] of c.pro) d2 *= Math.pow(1 + Math.max(x[i], 0) / K, nu);
            const sat = c.law === 'cm' ? num / (d1 + d2 - 1) : 1;
            return { dG, thermo: 1 - Math.exp(dG / RT), sat, reg: c.law === 'cm' ? regFactor(c, x, dp) : 1, vf: RF, vb: RB, v: RF - RB, law: c.law || 'cm' };
        },
        /**
         * Pulse a reaction (sign 1) or inhibit it (−1) now, in model time; a second pulse
         * stacks on what is left of the first. hold instead sustains ×(1 ± HOLD) until release().
         */
        pulse(j, sign = 1, hold = false) {
            pin();
            const t = state.t;
            if (hold) { pulses.set(j, { up: sign > 0 ? HOLD : 0, down: sign < 0 ? HOLD : 0, t0: t, held: true }); return; }
            const old = pulses.get(j);
            const f = old ? (old.held ? 1 : Math.exp(-(t - old.t0) / PULSE_TAU)) : 0;
            const up = Math.min(PULSE_MAX, (old ? old.up * f : 0) + (sign > 0 ? PULSE_UP : 0));
            const down = 1 - (1 - (old ? old.down * f : 0)) * (sign < 0 ? 1 - PULSE_DOWN : 1);
            pulses.set(j, { up, down, t0: t, held: false });
        },
        /** Whether any pulse is held. */
        holding() { for (const p of pulses.values()) if (p.held) return true; return false; },
        /** Everything that makes the trajectory from the picture's moment, to start a paired run from (a baseline). */
        snapshot() {
            return {
                x: Float64Array.from(state.x), t: state.t, damage: state.damage, activity: Float64Array.from(state.activity),
                env: { ...env }, dial: { ...dial },
                pulses: [...pulses].filter(([, p]) => !p.held).map(([j, p]) => [j, { ...p }]),   // the fading ones, not the held
            };
        },
        restore(snap) {
            state.x.set(snap.x); state.t = snap.t; state.damage = snap.damage; state.activity.set(snap.activity);
            Object.assign(env, snap.env); Object.assign(dial, snap.dial);
            pulses.clear(); for (const [j, p] of snap.pulses || []) pulses.set(j, { ...p });
            pin();
        },
        /** Let a held pulse fade from now. */
        release(j) {
            const p = pulses.get(j);
            if (!p || !p.held) return;
            pin();
            p.held = false; p.t0 = state.t;
        },
        /** The multiplier pulses put on reaction j now. */
        pulseNow(j) { return pulseFactor(j, state.t); },
        /**
         * Each effector on reaction j now: what it is (a species id, a ratio [a, b], or
         * 'light', 'dark', 'dp'), how it acts ('inh' or 'act') and the factor it puts on the rate.
         */
        effectors(j) {
            const c = RX[j], x = state.x, dp = dpOf(x);
            now.t = state.t; now.damage = state.damage;
            return c.regs.map(e => {
                let f;
                if (e.type === 'light') f = e.b + (1 - e.b) * lightOn();
                else if (e.type === 'dark') f = e.b + (1 - e.b) * (1 - lightOn());
                else if (e.type === 'dp') { const q = Math.pow(Math.max(dp, 0) / e.K, e.h); f = q / (1 + q); }
                else {
                    const val = e.bx != null ? x[e.a] / Math.max(x[e.bx], 1e-12) : x[e.a];
                    const q = Math.pow(Math.max(val, 0) / e.K, e.h);
                    f = e.type === 'inh' ? 1 / (1 + q) : (e.b + q) / (1 + q);
                }
                const what = e.type === 'light' || e.type === 'dark' || e.type === 'dp' ? e.type : Array.isArray(e.x) ? e.x.map(s => s.replace(/\[.\]$/, '')) : e.x;
                return { what, how: e.type === 'inh' || e.type === 'dark' ? 'inh' : 'act', f };
            });
        },
        /** What reaction j moves across the membrane: z charges and nH protons to the lumen side; its ΔG'° (kJ/mol). */
        coupling(j) { return { z: RX[j].z, nH: RX[j].nH, dg0: RX[j].dg0 }; },
        /** A reaction's base capacity, mM/s in its home compartment (without pulses, switches or light). */
        capacity(j) { return RX[j].vmax; },
        /** Add to the medium (a bolus of glucose or fatty acid), mM. */
        feed(id, mM) { const i = idx(id, 'e'); if (i != null) state.x[i] += mM; },
        /** Hold the medium's gases and phosphate at the environment's values. */
        applyEnv() {
            const o2 = idx('o2', 'e'), co2 = idx('co2', 'e'), pi = idx('pi', 'e');
            if (o2 != null) state.x[o2] = AIR_O2 * env.o2;
            if (co2 != null) state.x[co2] = AIR_CO2 * env.co2;
            if (pi != null) state.x[pi] = PI_MEDIUM;
            // A chloroplast's medium is its cell's cytosol: ATP held at 2 mM, ADP at 0.2
            const atp = idx('atp', 'e'), adp = idx('adp', 'e');
            if (atp != null) { state.x[atp] = 2; state.x[adp] = 0.2; }
        },
        /** Fill the pools and metabolites to the cell's starting state. */
        reset() {
            state.x.fill(0); state.t = 0; state.damage = 0; pulses.clear();
            for (let j = 0; j < nR; j++) state.activity[j] = R[j].off ? 0 : 1;
            initialState(engine);
            this.applyEnv();
            pin();
        },
        /** The total of a moiety in a compartment, mM. */
        moiety(name, comp) {
            const m = MOIETIES[name]; let s = 0;
            for (const sp of S) if (sp.comp === comp && m[sp.id]) s += m[sp.id] * state.x[model.index[sp.key]];
            return s;
        },
    };
    engine.reset();
    return engine;
}

/** The starting state: pools split by plausible ratios, metabolites at small amounts, the medium fed. */
function initialState(eng) {
    const { cell } = eng, set = (id, comp, v) => eng.set(id, comp, v);
    for (const [comp, pools] of Object.entries(cell.pools)) {
        const tot = (k) => pools[k] ? pools[k][0] : 0;
        set('atp', comp, 0.85 * tot('adenine')); set('adp', comp, 0.12 * tot('adenine')); set('amp', comp, 0.03 * tot('adenine'));
        set('nad', comp, 0.95 * tot('nad')); set('nadh', comp, 0.05 * tot('nad'));
        set('nadp', comp, 0.4 * tot('nadp')); set('nadph', comp, 0.6 * tot('nadp'));
        set('coa', comp, 0.7 * tot('coa')); set('accoa', comp, 0.3 * tot('coa'));
        set('pi', comp, PI_MEDIUM);
    }
    const carriers = cell.carriers || { q: 1, pc: 1, fd: 0.2 };
    const mem = 'm' in eng.model.comps ? 'm' : 'c';
    set('q8', mem, 0.6 * carriers.q); set('q8h2', mem, 0.4 * carriers.q);
    set('pcox', 'l', 0.5 * carriers.pc); set('pcred', 'l', 0.5 * carriers.pc);
    set('fdox', 'c', 0.7 * carriers.fd); set('fdred', 'c', 0.3 * carriers.fd);
    // ETF, tens of µM in the matrix (illustrative), where β-oxidation runs
    set('etfox', mem, 0.04); set('etfred', mem, 0.01);
    const start = { g6p: 1, f6p: 0.3, fdp: 0.5, g3p: 0.05, '13dpg': 0.01, '3pg': 1, '2pg': 0.1, pep: 0.2, pyr: 0.2,
        rb15bp: 0.5, ru5p__D: 0.02, r5p: 0.05, xu5p__D: 0.02, s7p: 0.1, e4p: 0.02, s17bp: 0.02,
        oaa: 0.01, cit: 1, icit: 0.05, akg: 0.3, succoa: 0.05, succ: 0.5, fum: 0.1, mal__L: 0.5, glycogen: 20, lac__L: 0.5 };
    for (const [id, v] of Object.entries({ ...start, ...(cell.start || {}) })) for (const comp of ['c', 'm']) set(id, comp, v);
    for (const [id, v] of Object.entries(cell.medium || {})) set(id, 'e', v);
    // Δp starts at 150 mV, divided as the cell's membrane divides it
    set('dq', 'l', 150 * eng.pmf.share / eng.pmf.psi);
    set('h', 'l', 150 * (1 - eng.pmf.share) / eng.pmf.ph);
}
