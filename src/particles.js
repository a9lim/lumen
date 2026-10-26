// Particles — what moves in the cross-section, each bound to the model.
// Electrons ride the chains the window samples at the drawn centres (their
// callbacks are drawing only: protons crossing, photons), on plastoquinone,
// plastocyanin and ferredoxin where the chain passes a mobile carrier. Lumen
// protons are a pool kept at one per 2 mV of Δp (store.protonGradient):
// pumped protons cross up into it, ATP synthase and NNT draw theirs out of
// it, and any excess leaks back across the bilayer (or through UCP while
// uncoupling is on). Photons are Feynman wiggles. The cofactor pools are
// src/stroma.js's. Time is wall time; the model's slowdown is the window's.
import { simState, store } from './state.js';
import { Membrane } from './membrane.js';
import * as K from './complexes.js';
import { waypoints, variant } from './detail.js';

const TAU = Math.PI * 2;
const MAXP = 600;           // protons drawn at most; the caption gives the count
const MAX_WAIT = 3;         // s an electron waits at a gate before it joins its carrier's pool (and fades)
// The mobile carriers drawn as persistent instances: how many, and their speed at most, nm/s
const CARRIERS = { pq: { n: 8, v: 80 }, pc: { n: 5, v: 90 }, fd: { n: 4, v: 90 } };
const HOP_V = 25, HOP_MIN = 0.06, REST = 0.05;   // an electron's hop between sites: nm/s, s at least; s it rests at each
const QUEUE = 2.6;          // nm between carriers queued at a complex
const H_REACH = 20;         // nm a proton sink reaches into the pool; farther protons wait their turn
const H_V = 25;             // nm/s a proton drifts to the sink that takes it, at most
const H_LATE = 1.5;         // s a sink waits with no proton in reach before it takes the nearest anyway
const H_SHORT = 0.6;        // s, the time constant of the pool's shortfall crossing up through the pumps
const H_BIN = 6, H_D = 2000, H_MIX = 16;   // nm bins, nm²/s and nm/s at most: the pool's lateral spreading
// Each photon's wiggle has the period of the light its absorber takes, nm: P680, P700, bacteriorhodopsin's 568
const LAMBDA = { psii: 680, psi: 700, br: 568 };

const Particles = {
    electrons: [],
    carriers: [],   // { k, hx, hy, x, y, ph, job, tx, ty, ld, want, slow, fadeAt }: plastoquinone, plastocyanin, ferredoxin
    _req: [], _queues: new Map(), _t: 0, _layout: '',
    protons: [],
    photons: [],
    mols: [],
    _short: 0, _qa: 0, _ql: 0, _qn: 0, _atpOx: 0, _leaked: 0, _nnt: 0, _late: {},

    /**
     * Spawn an electron through the given complexes (keys into Membrane.pos). It
     * steps through each complex's cofactors (detail.js) and rides the mobile
     * carriers (pq, pc, fd) between them: at a donor's exit it waits for a free
     * carrier to dock, boards it, rides to the acceptor and hands over. cb[i] fires
     * as it reaches keys[i]; gates[i], if given, holds it there, on its carrier,
     * until it returns true (that complex turned over). A gate on a carrier's key
     * holds it at the complex the carrier brings it to.
     */
    spawnElectronChain(keys, type, callbacks, gates) {
        const pos = Membrane.pos, v = variant(Membrane.spec, Membrane.specId), n = keys.length - 1;
        if (n < 1) return false;
        for (const k of keys) if (!pos[k] || (CARRIERS[k] && !this.carriers.some(c => c.k === k))) return false;
        const steps = keys.map((k, i) => CARRIERS[k] ? { i, ride: k } : { i, key: k, pts: waypoints(k, pos[k], Membrane.mid, Membrane.s, v) });
        // cyclic flow's ferredoxin reduces the quinone at b₆f's stromal (Qi) site: no free PQ is drawn between them
        for (let i = 1; i < n; i++) if (keys[i - 1] === 'fd' && keys[i] === 'pq' && keys[i + 1] === 'cytb6f') steps[i] = { i, key: 'cytb6f', pts: [qiSite()] };
        // a chain that closes on its first complex (cyclic flow) ends where it began
        if (steps[n].pts && keys[0] === keys[n]) steps[n].pts = steps[n].pts.slice(0, 1);
        const e = { keys, type, cb: callbacks || {}, gates: gates || {}, steps, si: 0, st: '', t: 0, wait: 0, a: 0, fade: 1, gone: false, dead: false, progress: 0,
            car: null, on: null, P: null, Q: null, x: 0, y: 0, hidden: false, fired: new Set(), passed: new Set() };
        this.electrons.push(e);
        this._fire(e, 0);
        if (steps[0].pts) { e.st = 'walk'; e.pi = 0; [e.x, e.y] = steps[0].pts[0]; }
        else this._need(e, 0);
        return true;
    },

    /** Where an electron is drawn, and the carrier it rides, if any. */
    where(e) {
        if (e.on) return { x: e.on.x, y: e.on.y, ride: e.on.k };
        return { x: e.x, y: e.y, ride: null, hidden: e.hidden };
    },

    _fire(e, i) { if (!e.fired.has(i)) { e.fired.add(i); const f = e.cb[i]; if (f) f(); } },

    /** Ride step j: wait for a carrier where the electron is (a donor's exit, a carrier, or anywhere at the start). */
    _need(e, j) {
        const st = e.steps, k = st[j].ride, prev = st[j - 1], next = st[j + 1], M = Membrane, s = M.s;
        // the meeting point of two carriers is under the complex after them (cyclic flow: Fd to PQ at b₆f's stromal face)
        const meetX = () => { const w = st.slice(j + 1).find(q => q.pts); return w ? w.pts[0][0] : M.pos[k].x; };
        e.si = j; e.st = 'need'; e.wait = 0; e.car = null;
        e.Q = !next ? null : next.pts ? dock(k, next.pts[0], prev && prev.pts ? prev.pts[prev.pts.length - 1][0] : M.pos[k].x) : [meetX(), meetY(k, next.ride)];
        e.P = !prev ? null : prev.pts ? dock(k, prev.pts[prev.pts.length - 1], e.Q ? e.Q[0] : M.pos[k].x) : [e.on.x, meetY(k, prev.ride)];
        e.hidden = !prev;
        this._req.push({ e, k, near: e.P || e.Q || [M.pos[k].x, M.pos[k].y] });
    },

    /** An electron's step in its chain: walk a complex's sites, wait for a carrier, board, ride, wait at a gate, hand over. */
    _electron(e, dt) {
        const S = e.steps[e.si];
        e.a = Math.min(1, e.a + dt / 0.15);
        if (e.st === 'walk') {
            // it rests at each site, then hops to the next, the hop timed by its length
            const pts = S.pts;
            e.t += dt;
            for (;;) {
                const a = pts[e.pi];
                if (e.pi === pts.length - 1) {
                    e.x = a[0]; e.y = a[1];
                    if (e.t >= REST) {
                        const next = e.steps[e.si + 1];
                        if (!next) { e.gone = true; e.dead = true; }
                        else if (next.ride) this._need(e, e.si + 1);
                        else { e.st = 'gate'; e.wait = 0; }
                    }
                    return;
                }
                const b = pts[e.pi + 1], h = hopTime(a, b);
                if (e.t < REST) { e.x = a[0]; e.y = a[1]; return; }
                const u = (e.t - REST) / h;
                if (u >= 1) { e.t -= REST + h; e.pi++; continue; }
                const w = u * u * (3 - 2 * u); e.x = a[0] + (b[0] - a[0]) * w; e.y = a[1] + (b[1] - a[1]) * w;
                return;
            }
        }
        if (e.st === 'hop') {
            const u = Math.min(1, (e.t += dt) / e.hop.h), w = u * u * (3 - 2 * u), H = e.hop;
            e.x = H.x0 + (H.x1() - H.x0) * w; e.y = H.y0 + (H.y1() - H.y0) * w;
            if (u >= 1) H.then();
            return;
        }
        if (e.st === 'need') {
            if (e.on) { e.x = e.on.x; e.y = e.on.y; }
            const c = e.car;
            if (c && !e.P) { c.want = 1; this._board(e); return; }          // in place: a reduced carrier from the pool
            if (c && Math.hypot(c.x - e.P[0], c.y - e.P[1]) < 1.5) {
                // the carrier has docked: the electron hops onto it
                const from = e.on; e.on = null;
                this._hop(e, () => c.x, () => c.y, () => { c.want = 1; if (from) this._release(from); this._board(e); });
                return;
            }
            if ((e.wait += dt) > MAX_WAIT) this._giveUp(e);
            return;
        }
        if (e.st === 'gate') {
            // straight on to the next complex (no carrier between), once it turns over
            const next = e.steps[e.si + 1], g = e.gates[next.i];
            if (g && !e.passed.has(next.i)) { if (!g()) { if ((e.wait += dt) > MAX_WAIT) this._giveUp(e); return; } e.passed.add(next.i); }
            this._fire(e, next.i);
            const [x1, y1] = next.pts[0];
            this._hop(e, () => x1, () => y1, () => { e.si++; e.st = 'walk'; e.pi = 0; e.t = 0; });
            return;
        }
        if (e.st === 'ride') {
            const c = e.car, q = e.queue;
            if (!q.list.includes(c)) q.list.push(c);
            const i = q.list.indexOf(c);
            c.tx = e.Q[0] + q.dir * i * QUEUE * Membrane.s; c.ty = e.Q[1];
            if (i === 0 && Math.hypot(c.x - c.tx, c.y - c.ty) < 1.5) this._arrive(e, dt);
            else if (i > 0 && (e.wait += dt) > MAX_WAIT) this._giveUp(e);
        }
    },

    _hop(e, x1, y1, then) {
        const x0 = e.on ? e.on.x : e.x, y0 = e.on ? e.on.y : e.y;
        e.st = 'hop'; e.t = 0; e.x = x0; e.y = y0;
        e.hop = { x0, y0, x1, y1, then, h: hopTime([x0, y0], [x1(), y1()]) };
    },

    /** On its carrier: on to the acceptor's queue, or (the chain's last step) into the carrier's pool. */
    _board(e) {
        const j = e.si, c = e.car;
        e.on = c; e.hidden = false; e.wait = 0;
        if (!e.gates[j]) this._fire(e, j);
        if (!e.Q) { this._release(c, true); e.on = e.car = null; e.dead = true; e.gone = true; e.fade = 0; return; }
        const key = c.k + '@' + e.Q[0].toFixed(1) + ',' + e.Q[1].toFixed(1);
        let q = this._queues.get(key);
        if (!q) this._queues.set(key, q = { dir: Math.sign(c.x - e.Q[0]) || 1, list: [] });
        q.list.push(c); e.queue = q; e.st = 'ride'; e.d0 = Math.hypot(c.x - e.Q[0], c.y - e.Q[1]) || 1;
    },

    /** Docked at the acceptor: wait for its turnover (the gates), then hand over. */
    _arrive(e, dt) {
        const j = e.si, next = e.steps[j + 1];
        for (const g of [j, next.pts ? next.i : -1]) {
            if (g < 0 || !e.gates[g] || e.passed.has(g)) continue;
            if (!e.gates[g]()) { if ((e.wait += dt) > MAX_WAIT) this._giveUp(e); return; }
            e.passed.add(g);
        }
        this._fire(e, j);
        const c = e.car;
        e.queue.list.splice(e.queue.list.indexOf(c), 1); e.queue = null;
        if (next.ride) { this._need(e, j + 1); return; }
        this._fire(e, next.i);
        e.on = null; e.car = null; e.x = c.x; e.y = c.y; this._release(c);
        const [x1, y1] = next.pts[0];
        this._hop(e, () => x1, () => y1, () => { e.si = j + 1; e.st = 'walk'; e.pi = 0; e.t = 0; });
    },

    /** Let a carrier go; one still carrying the electron fades it into its pool. */
    _release(c, keep) {
        if (!c) return;
        // carrying it still, it shows loaded a moment longer, then fades slowly
        c.job = null; c.want = keep ? 1 : 0; c.slow = !!keep; c.fadeAt = keep ? this._t + 0.6 : 0;
        for (const q of this._queues.values()) { const i = q.list.indexOf(c); if (i >= 0) q.list.splice(i, 1); }
    },

    /** Waited MAX_WAIT: the electron joins its carrier's pool (or fades where it is); its own effects still land. */
    _giveUp(e) {
        for (let i = 0; i < e.keys.length; i++) if (!e.gates[i]) this._fire(e, i);
        const on = e.on || (e.st === 'ride' ? e.car : null);
        if (e.car && e.car !== on) this._release(e.car);
        if (on) { this._release(on, true); e.on = null; e.fade = 0; }
        if (e.queue) { const i = e.queue.list.indexOf(e.car); if (i >= 0) e.queue.list.splice(i, 1); }
        e.car = null; e.gone = true; e.dead = true;
        if (e.hidden) e.fade = 0;
    },

    /** Free carriers to the electrons waiting for one, first come first served, the nearest free one each. */
    _assign() {
        for (const r of this._req) {
            if (r.e.dead || r.e.car) continue;
            let best = null, bd = Infinity;
            for (const c of this.carriers) if (c.k === r.k && !c.job) { const d = (c.x - r.near[0]) ** 2 + (c.y - r.near[1]) ** 2; if (d < bd) { bd = d; best = c; } }
            if (!best) continue;
            best.job = r.e; r.e.car = best; best.slow = false; best.want = 0; best.fadeAt = 0;
            [best.tx, best.ty] = r.e.P || [best.x, best.y];
        }
        this._req = this._req.filter(r => !r.e.dead && !r.e.car);
    },

    /** Carriers move toward their job at a capped speed; free ones wander near home. */
    _carriers(dt) {
        const s = Membrane.s, t = this._t;
        for (const c of this.carriers) {
            const tx = c.job ? c.tx : c.hx + Math.sin(t * 0.4 + c.ph) * 0.6 * s, ty = c.job ? c.ty : c.hy + Math.cos(t * 0.31 + c.ph) * 0.25 * s;
            const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), v = Math.min(CARRIERS[c.k].v * s, Math.max(3 * s, d * 10)) * dt;
            if (d <= v) { c.x = tx; c.y = ty; } else { c.x += dx / d * v; c.y += dy / d * v; }
            // loaded or not, crossfaded; an electron joining the pool fades slowly
            if (!c.job && c.fadeAt && t > c.fadeAt) { c.want = 0; c.fadeAt = 0; }
            const r = dt / (c.want < c.ld && c.slow ? 0.8 : 0.15);
            c.ld = c.want > c.ld ? Math.min(c.want, c.ld + r) : Math.max(c.want, c.ld - r);
        }
    },

    /** A proton crossing at x: 'up' into the lumen pool, 'down' out of it. */
    spawnProton(x, dir) {
        const s = Membrane.s;
        if (dir === 'up') {
            this.protons.push({ x: x + (Math.random() - 0.5) * 3 * s, y: Membrane.memBot + 3 * s, mode: 'up', a: 0, vx: 0, vy: 0 });
            return;
        }
        // Protons leave the pool by the store's tallies (see update), not by these calls
    },

    spawnPhoton(key) {
        const t = Membrane.pos[key];
        if (!t) return;
        const s = Membrane.s, a = -Math.PI / 2 - 0.55 + (Math.random() - 0.5) * 0.5;
        const tx = t.x + (Math.random() - 0.5) * 6 * s, ty = Membrane.mid;
        const d = Math.max(60, ty - Membrane.top + 30);
        const sx = tx + Math.cos(a) * d / Math.abs(Math.sin(a)) * 0.6, sy = ty - d;
        const L = Math.hypot(tx - sx, ty - sy);
        this.photons.push({ x: sx, y: sy, dx: (tx - sx) / L, dy: (ty - sy) / L, left: L, ph: Math.random() * TAU, lam: LAMBDA[key] || 680 });
    },

    /** Emit an O₂: 'o2out' leaves PSII, 'o2in' arrives at cytochrome oxidase. */
    emit(type, x, y) {
        const s = Membrane.s, r = Math.random;
        if (type === 'o2out') this.mols.push({ type: 'o2', x: x + (r() - 0.5) * 4 * s, y, vx: (r() - 0.5) * 2 * s, vy: -(1.6 + r()) * s, rot: r() * TAU, age: 0, life: 2.6 });
        else if (type === 'o2in') this.mols.push({ type: 'o2', x: x + (r() - 0.5) * 10 * s, y: y + 9 * s, tx: x, vx: 0, vy: -3.2 * s, rot: r() * TAU, age: 0, life: 2.4, sink: true });
    },

    /** A representative instant for the first frame: photons and electrons already in transit. */
    seed() {
        const can = Membrane.spec.can, pos = Membrane.pos;
        const chains = [];
        if (simState.lightOn && can.photo) chains.push(['psii', 'pq', 'cytb6f', 'pc', 'psi', 'fd', 'fnr'], ['psii', 'pq', 'cytb6f', 'pc', 'psi', 'fd', 'fnr']);
        if (simState.oxygenAvailable && can.resp) chains.push(['ndh1', 'pq', 'cytb6f', 'pc', 'cytOx']);
        // each chain spawned and run on a little, the earlier ones further, carriers with them
        chains.forEach((keys, i) => { if (this.spawnElectronChain(keys, 'seed', {})) for (let k = 0; k < 25 + 40 * ((i * 0.37) % 1); k++) this._stepElectrons(1 / 60); });
        const targets = simState.lightOn ? ['psii', 'psi', 'br'].filter(k => pos[k] && (k === 'br' ? can.brAuto : can.photo)) : [];
        for (let i = 0; i < targets.length * 2; i++) { this.spawnPhoton(targets[i % targets.length]); const p = this.photons[this.photons.length - 1]; const f = 0.25 + 0.5 * Math.random(); p.x += p.dx * p.left * f; p.y += p.dy * p.left * f; p.left *= 1 - f; }
    },

    clear() { this._tally(); this._layout = ''; this.electrons.length = 0; this.protons.length = 0; this.photons.length = 0; this.mols.length = 0; },

    /** Lumen protons to start with, at rest, matching the gradient. */
    fill() {
        this.protons = this.protons.filter(p => p.mode !== 'lumen');
        this._tally();
        // a new layout (or specimen): the carriers start at home, and electrons in flight are dropped
        const key = [Membrane.specId, Membrane.s, Membrane.x0, Membrane.x1, Membrane.mid].join();
        if (key !== this._layout) {
            // the electrons in flight go, but their complexes' turnovers already happened: their own effects land now
            for (const e of this.electrons) if (!e.dead) for (let i = 0; i < e.keys.length; i++) if (!e.gates[i]) this._fire(e, i);
            this._layout = key; this.carriers = homes(); this.electrons.length = 0; this._req = []; this._queues = new Map();
        }
        const n = Math.min(MAXP, store.protonGradient);
        for (let i = 0; i < n; i++) this.protons.push(poolProton());
    },

    /** Electrons along their chains, carriers to the electrons waiting, carriers moving. */
    _stepElectrons(dt) {
        this._t += dt;
        for (const e of this.electrons) if (!e.gone) { this._electron(e, dt); if (!e.gone) progress(e); }
        for (let i = this.electrons.length - 1; i >= 0; i--) {
            const e = this.electrons[i];
            if (e.gone && (e.fade -= dt / 0.4) <= 0) this.electrons.splice(i, 1);
        }
        this._assign();
        this._carriers(dt);
    },

    /** Start the sinks' tallies from the store's, with nothing owed. */
    _tally() { this._atpOx = store.atpOxidative; this._leaked = store.protonsLeaked; this._nnt = store.protonsNnt || 0; this._qa = this._ql = this._qn = 0; this._late = {}; },

    update(dt) {
        const sp = dt, s = Membrane.s, L = Membrane.lumen;
        this._stepElectrons(dt);
        // Protons
        let inPool = 0, up = 0;
        const mix = L && this._spread(L, s);
        for (const p of this.protons) {
            if (p.mode === 'lumen') {
                inPool++;
                p.a = Math.min(1, p.a + sp * 4);
                p.vx += (Math.random() - 0.5) * 900 * dt; p.vy += (Math.random() - 0.5) * 700 * dt;
                p.vx *= 0.94; p.vy *= 0.94;
                p.x += (p.vx + (mix ? mix(p.x) : 0)) * dt; p.y += p.vy * dt;
                confine(p, L);
            } else if (p.mode === 'up') {
                up++;
                p.a = Math.min(1, p.a + sp * 4);
                p.y -= 22 * s * sp;
                if (p.y < Membrane.memTop - 1.5 * s) { p.mode = 'lumen'; p.vy = -60; }
            } else if (p.mode === 'site') {
                // to the sink that takes it, at a capped speed
                const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), v = Math.min(H_V * s, Math.max(4 * s, d * 5)) * sp;
                if (d <= v) { p.x = p.tx; p.y = p.ty; p.mode = 'down'; }
                else { p.x += dx / d * v; p.y += dy / d * v; }
            } else if (p.mode === 'down') {
                p.y += 14 * s * sp;
                if (p.y > Membrane.memBot + 1 * s) p.a -= sp * 3;
            }
        }
        this.protons = this.protons.filter(p => p.a > 0);
        // Keep the pool equal to the gradient. Protons still crossing up count as
        // pooled; protons the store has spent leave the pool, for ATP synthase
        // (its ring's c subunits over three per ATP made), the leak (through UCP
        // while uncoupling) and NNT, as the store's own tallies say, and any
        // excess besides crosses the bilayer where it is.
        const target = Math.min(MAXP, Math.max(0, store.protonGradient - up));
        this._qa = Math.min(400, this._qa + Math.max(0, store.atpOxidative - this._atpOx) * Membrane.ring / 3);
        this._ql = Math.min(400, this._ql + Math.max(0, store.protonsLeaked - this._leaked));
        this._qn = Math.min(400, this._qn + Math.max(0, (store.protonsNnt || 0) - this._nnt));
        this._atpOx = store.atpOxidative; this._leaked = store.protonsLeaked; this._nnt = store.protonsNnt || 0;
        // A sink takes the protons within its reach; the rest of its share waits its turn
        if (inPool > target) {
            let n = inPool - target;
            const a = Math.min(n, Math.floor(this._qa)), sa = send(this, a, 'atpSyn', dt); this._qa -= sa; n -= a;
            const l = Math.min(n, this._ql), sl = send(this, l, simState.uncouplingEnabled && Membrane.pos.ucp ? 'ucp' : null, dt); this._ql -= sl; n -= l;
            if (Membrane.pos.nnt) { const q = Math.min(n, Math.floor(this._qn)), sq = send(this, q, 'nnt', dt); this._qn -= sq; n -= q; }
            send(this, n, null, dt);
            this._short = 0;
        } else if (inPool < target) {
            // The shortfall crosses up through the complexes pumping, in proportion to their rates
            // (store.pumping, the window's); with none pumping, it fades in where it is
            this._short += (target - inPool) * dt / H_SHORT;
            const pumps = Object.entries(store.pumping || {}).filter(([k, v]) => v > 0 && Membrane.pos[k]), tot = pumps.reduce((a, [, v]) => a + v, 0);
            for (; this._short >= 1; this._short--) {
                if (!tot) { const p = poolProton(); p.a = 0; this.protons.push(p); continue; }
                let u = Math.random() * tot, k = pumps[0][0];
                for (const [key, v] of pumps) { k = key; if ((u -= v) <= 0) break; }
                this.spawnProton(Membrane.pos[k].x, 'up');
            }
        } else { this._short = 0; this._qa = Math.min(this._qa, 8); this._ql = Math.min(this._ql, 8); this._qn = Math.min(this._qn, 8); }
        // Photons
        for (const p of this.photons) { const m = 300 * Math.max(0.6, s / 6) * sp; p.x += p.dx * m; p.y += p.dy * m; p.left -= m; p.ph += sp * 30; }
        this.photons = this.photons.filter(p => p.left > 0);
        // O₂
        for (const m of this.mols) {
            m.age += sp;
            if (m.sink) m.x += (m.tx - m.x) * Math.min(1, sp * 1.5);
            m.x += m.vx * sp; m.y += m.vy * sp; m.rot += sp * 0.5;
        }
        this.mols = this.mols.filter(m => m.age < m.life);
    },

    /**
     * The pool's lateral spreading, px/s at x: pooled protons drift down their own density
     * gradient (Fick's law, D = H_D), from where they are pumped in to where they are spent.
     */
    _spread(L, s) {
        const w = H_BIN * s, nb = Math.max(3, Math.ceil((L.x1 - L.x0) / w)), c = new Float64Array(nb), g = new Float64Array(nb), v = new Float64Array(nb);
        const bin = (x) => Math.max(0, Math.min(nb - 1, Math.floor((x - L.x0) / w)));
        for (const p of this.protons) if (p.mode === 'lumen') c[bin(p.x)]++;
        for (let pass = 0; pass < 2; pass++) {
            for (let b = 0; b < nb; b++) g[b] = (c[Math.max(0, b - 1)] + 2 * c[b] + c[Math.min(nb - 1, b + 1)]) / 4;
            c.set(g);
        }
        const D = H_D * s * s, cap = H_MIX * s;
        for (let b = 0; b < nb; b++) {
            const grad = (c[Math.min(nb - 1, b + 1)] - c[Math.max(0, b - 1)]) / (2 * w);
            v[b] = Math.max(-cap, Math.min(cap, -D * grad / Math.max(c[b], 0.5)));
        }
        this._dens = (x) => c[bin(x)];
        return (x) => v[bin(x)];
    },

    draw(c) {
        const s = Membrane.s, P = K.P;
        // The carriers: each drawn loaded by the share of a drawn electron it carries (crossfaded)
        this.riding = [];
        for (const q of this.carriers) {
            drawCarrier(c, q.k, q.x, q.y, s, false);
            if (q.ld > 0) { c.globalAlpha = q.ld; drawCarrier(c, q.k, q.x, q.y, s, true); c.globalAlpha = 1; }
            if (q.ld >= 0.5) this.riding.push([q.k, q.x, q.y]);
        }
        // Electrons off a carrier: on a complex's sites, or hopping between them
        for (const e of this.electrons) {
            if (e.on || e.hidden) continue;
            c.globalAlpha = e.fade * e.a;
            c.beginPath(); c.arc(e.x, e.y, Math.max(1.6, 0.36 * s), 0, TAU); c.lineWidth = 1.2; c.strokeStyle = P.text; c.fillStyle = P.canvas; c.fill(); c.stroke();
        }
        c.globalAlpha = 1;
        // Lumen protons: the red, one per unit of gradient
        c.fillStyle = P.accent;
        const r = Math.max(1.5, 0.4 * s);
        for (const p of this.protons) {
            // Pooled protons are the gradient; those crossing are drawn paler
            c.globalAlpha = Math.max(0, Math.min(1, p.a)) * (p.mode === 'lumen' ? 1 : 0.42);
            c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill();
        }
        c.globalAlpha = 1;
        // Photons as Feynman wiggles
        c.strokeStyle = K.ink('ochre'); c.lineWidth = Math.max(1, 0.2 * s); c.lineCap = 'round';
        for (const p of this.photons) {
            c.beginPath();
            const len = 5 * s, nx = -p.dy, ny = p.dx;
            for (let k = 0; k <= 16; k++) {
                const t = k / 16, al = -len * (1 - t), off = 0.55 * s * Math.sin(p.ph + t * 9 * 680 / p.lam) * Math.sin(Math.PI * t);
                const x = p.x + p.dx * al + nx * off, y = p.y + p.dy * al + ny * off;
                k ? c.lineTo(x, y) : c.moveTo(x, y);
            }
            c.stroke();
        }
        for (const m of this.mols) {
            c.globalAlpha = Math.max(0, Math.min(1, m.age * 3, (m.life - m.age) * 1.5));
            K.o2(c, s, m.x, m.y, m.rot);
        }
        c.globalAlpha = 1;
    },
};

/** The carriers' homes: PQ in two rows in the bilayer, PC in two over the lumen side, Fd in a row by PSI. */
function homes() {
    const pos = Membrane.pos, s = Membrane.s, out = [];
    for (const k in CARRIERS) {
        const p = pos[k], n = CARRIERS[k].n;
        if (!p) continue;
        for (let j = 0; j < n; j++) {
            const col = j >> 1, cols = Math.ceil(n / 2);
            const hx = k === 'fd' ? p.x + (j - (n - 1) / 2) * 3.2 * s : p.x + (col - (cols - 1) / 2) * (k === 'pq' ? 2.4 : 3.6) * s;
            const hy = k === 'pq' ? Membrane.mid + (j % 2 ? 0.8 : -0.8) * s : k === 'pc' ? p.y - (j % 2) * 3.4 * s : p.y + (j % 2) * 2.2 * s;
            out.push({ k, hx, hy, x: hx, y: hy, ph: j * 2.1 + k.length, job: null, tx: hx, ty: hy, ld: 0, want: 0, slow: false, fadeAt: 0 });
        }
    }
    return out;
}

function poolProton() {
    const L = Membrane.lumen;
    return { x: L.x0 + Math.random() * (L.x1 - L.x0), y: L.y0 + Math.random() * (L.y1 - L.y0), mode: 'lumen', a: 1, vx: 0, vy: 0 };
}

function confine(p, L) {
    const n = L.neck;
    const inNeck = n && p.x > n.x0 && p.x < n.x1 && p.y < L.y0;
    if (!inNeck) {
        if (p.x < L.x0) { p.x = L.x0; p.vx = Math.abs(p.vx); }
        if (p.x > L.x1) { p.x = L.x1; p.vx = -Math.abs(p.vx); }
        if (p.y < L.y0 && !(n && p.x > n.x0 && p.x < n.x1)) { p.y = L.y0; p.vy = Math.abs(p.vy); }
    } else {
        if (p.x < n.x0) { p.x = n.x0; p.vx = Math.abs(p.vx); }
        if (p.x > n.x1) { p.x = n.x1; p.vx = -Math.abs(p.vx); }
        if (p.y < n.y0) { p.y = n.y0; p.vy = Math.abs(p.vy); }
    }
    if (p.y > L.y1) { p.y = L.y1; p.vy = -Math.abs(p.vy); }
}

/** Where a proton enters a complex from the lumen side. */
function entry(siteKey) {
    const s = Membrane.s, p = Membrane.pos[siteKey];
    if (siteKey === 'atpSyn' && p) {
        if (p.rot !== undefined) { const c = Math.cos(p.rot), sn = Math.sin(p.rot); return [p.x + 3.4 * s * c + 2.5 * s * sn, p.y + 3.4 * s * sn - 2.5 * s * c]; }
        return [p.x + 3.4 * s, Membrane.memTop];
    }
    return [p ? p.x : Membrane.x0, Membrane.memTop];
}

/**
 * Send up to n pool protons out, returning how many went: to a complex's entry, the
 * nearest within its reach (after H_LATE s with none in reach, the nearest one beyond),
 * or across the bilayer where they are.
 */
function send(P, n, site, dt) {
    if (n <= 0) return 0;
    const [ex, ey] = site ? entry(site) : [0, 0], reach = (H_REACH * Membrane.s) ** 2;
    let sent = 0;
    for (; sent < n; sent++) {
        let best = null, bd = Infinity;
        for (const p of P.protons) {
            if (p.mode !== 'lumen') continue;
            // across the bilayer, an excess leaves where the pool is densest (by its pumps)
            const d = site ? (p.x - ex) ** 2 + (p.y - ey) ** 2 : -(P._dens ? P._dens(p.x) : 0) - Math.random();
            if (d < bd) { bd = d; best = p; }
        }
        if (!best) break;
        if (site && bd > reach) {
            if ((P._late[site] = (P._late[site] || 0) + dt) < H_LATE) break;
            P._late[site] = 0;
        }
        best.mode = 'site';
        if (site) { best.tx = ex; best.ty = ey; } else { best.tx = best.x; best.ty = Membrane.memTop; }
    }
    if (site && sent === n) P._late[site] = 0;
    return sent;
}

/**
 * How far along its chain an electron is, 0–1, as the Stats tab's ladder reads it: segment i runs
 * from keys[i] to keys[i + 1], the last on through the terminal complex. Drawing only.
 */
function progress(e) {
    const n = e.keys.length - 1, S = e.steps[e.si];
    let p = e.progress * n;
    if (e.st === 'walk' || e.st === 'gate') { const f = Math.min(1, (e.pi + (e.st === 'gate' ? 1 : 0)) / S.pts.length); p = e.si === n ? n - 0.5 + 0.5 * f : e.si + 0.95 * f; }
    else if (e.st === 'need') p = e.si - (e.steps[e.si - 1] ? 0.1 : 0);
    else if (e.st === 'ride' && e.car) {
        // riding into the chain's last complex covers the first half of the last segment (the ladder walks the complex in the rest)
        const span = e.si + 1 === n && e.steps[n].pts ? 0.5 : 0.99;
        p = e.si + span * Math.min(1, Math.max(0, 1 - Math.hypot(e.car.x - e.Q[0], e.car.y - e.Q[1]) / e.d0));
    }
    e.progress = Math.max(0, Math.min(0.9999, p / n));
}

/** How long an electron's hop between two points takes: quick between a complex's own sites. */
function hopTime(a, b) { return Math.max(HOP_MIN, Math.hypot(b[0] - a[0], b[1] - a[1]) / (HOP_V * Membrane.s)); }

/** Where carrier k docks to take or give an electron at site [x, y]: PQ in the bilayer, PC and Fd beside it on their side, toward tx. */
function dock(k, [x, y], tx) {
    const M = Membrane, s = M.s;
    if (k === 'pq') return [x, Math.max(M.memTop + 1.1 * s, Math.min(M.memBot - 1.1 * s, y))];
    const dx = (Math.sign(tx - x) || 1) * 1.5 * s;
    return k === 'pc' ? [x + dx, Math.min(y, M.memTop - 1.9 * s)] : [x + dx, Math.max(y, M.memBot + 1.8 * s)];
}
/** b₆f's (or bc₁'s) stromal quinone site, by its heme bʜ. */
function qiSite() { const s = Membrane.s; return [Membrane.pos.cytb6f.x - 1.9 * s, Membrane.mid + 1.0 * s]; }

/** The height carrier k meets another at: PQ at the face the other works on. */
function meetY(k, other) {
    const M = Membrane, s = M.s;
    if (k === 'pq') return other === 'pc' ? M.memTop + 1.1 * s : M.memBot - 1.1 * s;
    return k === 'pc' ? M.memTop - 1.9 * s : M.memBot + 1.8 * s;
}

function drawCarrier(c, k, x, y, s, loaded) {
    if (k === 'pq') { c.save(); c.translate(x, y); K.quinone(c, s, loaded); c.restore(); }
    else if (k === 'pc') K.carrier(c, s, x, y, 1.7, 19, K.ink('prussian'), loaded);
    else K.carrier(c, s, x, y, 1.4, 22, K.ink('sienna'), loaded);
}

export default Particles;
