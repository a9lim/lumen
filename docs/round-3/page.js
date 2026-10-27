// Round three's live figures: Lumen's own engine (src/engine/, bundled as LumenEngine), run in this page.
// A Sim runs one or more histories of a cell in model time, sampling every dt; Views draw a time range of a
// Sim as paired strips (the record), with additions marked as arrows and a cursor that reads every row.
const E = LumenEngine;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

// ─── Reading the engine ───
// A reaction's rate in mM/s of cytosol (a matrix reaction scaled by the matrix's volume), as Fig. 2 reads it
const R = (e, id) => { const j = e.rIndex[id]; return j == null ? 0 : e.state.v[j] * (e.model.comps[e.reactions[j].comp] || 1); };
const home = (e) => 'm' in e.model.comps ? 'm' : 'c';
const share = (e, a, rest) => { const m = home(e), x = e.conc(a, m); let t = x; for (const b of rest) t += e.conc(b, m); return t ? x / t : 0; };
const minus = (s) => s.replace('-', '−');
const pct = (v) => Math.round(v * 100) + '%';
const flux = (v) => Math.abs(v) < 5e-5 ? '0 mM/s' : minus(Math.abs(v) >= 1 ? v.toFixed(2) : Math.abs(v) >= 0.01 ? v.toFixed(3) : v.toFixed(4)) + ' mM/s';
const mM = (v) => minus(v >= 1 ? v.toFixed(2) : v.toFixed(3)) + ' mM';
// Carbon atoms in what crosses the boundary, and in one unit of the biomass row (network.js's E. coli core composition)
const C_BIOMASS = 1.496 * 3 + 3.7478 * 2 + 0.361 * 4 + 0.0709 * 6 + 0.129 * 3 + 0.205 * 6 + 1.0789 * 5 + 1.7867 * 4 + 0.5191 * 3 + 2.8328 * 3 + 0.8977 * 5;

const ROW = {
    dp: { label: 'Δp', ink: '--accent', get: (e) => e.dp(), fmt: (v) => Math.round(v) + ' mV' },
    atp: { label: 'ATP share of the adenylates', ink: '--ink-ochre', get: (e) => share(e, 'atp', ['adp', 'amp']), fmt: pct, lo: 0, hi: 1 },
    atpc: { label: 'ATP share, cytosol', ink: '--ink-ochre', get: (e) => { const c = (x) => e.conc(x, 'c'); return c('atp') / (c('atp') + c('adp') + c('amp')); }, fmt: pct, lo: 0, hi: 1 },
    atpm: { label: 'ATP share, matrix', ink: '--ink-sienna', get: (e) => { const c = (x) => e.conc(x, 'm'); return c('atp') / (c('atp') + c('adp') + c('amp')); }, fmt: pct, lo: 0, hi: 1 },
    nadph: { label: 'NADPH share', ink: '--ink-viridian', get: (e) => share(e, 'nadph', ['nadp']), fmt: pct, lo: 0, hi: 1 },
    nadh: { label: 'NADH share, matrix', ink: '--ink-prussian', get: (e) => share(e, 'nadh', ['nad']), fmt: pct, lo: 0, hi: 1 },
    o2out: { label: 'O₂ given off, net (the electrode’s chamber)', ink: '--ink-verdigris', get: (e) => -R(e, 'EX_o2'), fmt: flux },
    o2in: { label: 'O₂ taken up, net (the electrode’s chamber)', ink: '--ink-verdigris', get: (e) => R(e, 'EX_o2'), fmt: flux },
    gross: { label: 'RuBisCO, gross fixation', ink: '--ink-viridian', get: (e) => R(e, 'RBPC'), fmt: flux },
    co2in: { label: 'CO₂ taken up, net', ink: '--ink-sap', get: (e) => R(e, 'EX_co2'), fmt: flux },
    lac: { label: 'Lactate out', ink: '--ink-madder', get: (e) => R(e, 'EX_lac'), fmt: flux },
    glc: { label: 'Glucose in', ink: '--ink-sienna', get: (e) => R(e, 'EX_glc'), fmt: flux },
    succ: { label: 'Succinate, matrix', ink: '--ink-umber', get: (e) => e.conc('succ', 'm'), fmt: mM, lo: 0 },
    ndh1: { label: 'Complex I, net (negative: backward)', ink: '--ink-indigo', get: (e) => R(e, 'NDH1'), fmt: flux },
    sdh: { label: 'Complex II, net', ink: '--ink-mulberry', get: (e) => R(e, 'SDH'), fmt: flux },
    o2s: { label: 'Superoxide, matrix', ink: '--ink-violet', get: (e) => e.conc('o2s', 'm') * 1e6, fmt: (v) => Math.round(v) + ' nM', lo: 0 },
};

// ─── A Sim: histories of one cell, sampled every dt over [0, T], each with its own additions ───
class Sim {
    constructor(spec) {
        this.spec = spec; this.rows = spec.rows.map((k) => (typeof k === 'string' ? ROW[k] : k));
        this.N = Math.round(spec.T / spec.dt) + 1;
        this.H = spec.histories.map((h) => {
            const e = E.createEngine(spec.cell, { seed: 1 }); e.applyEnv();
            return { ...h, e, warm: spec.warm, k: 0, ev: 0, data: this.rows.map(() => new Float32Array(this.N)), acc: { co2: 0, glc: 0, fa: 0, lac: 0, etoh: 0, ac: 0, bio: 0 }, g0: 0, g1: 0 };
        });
        this.views = []; this.done = false; this.dead = false;
    }
    /** One unit of work on history h: a warm-up second, or one sample. Returns false when h is finished. */
    work(h) {
        const { e } = h, dt = this.spec.dt;
        if (h.warm > 0) { e.advance(Math.min(1, h.warm)); h.warm -= 1; if (h.warm <= 0) h.g0 = e.conc('glycogen'); return true; }
        if (h.k >= this.N) return false;
        if (h.k > 0) {
            e.advance(dt); e.evaluate();
            const a = h.acc;
            a.co2 += R(e, 'EX_co2') * dt; a.glc += 6 * R(e, 'EX_glc') * dt; a.fa += 16 * R(e, 'EX_fa') * dt;
            a.lac += 3 * R(e, 'EX_lac') * dt; a.etoh += 2 * R(e, 'EX_etoh') * dt; a.ac += 2 * R(e, 'EX_ac') * dt; a.bio += C_BIOMASS * R(e, 'BIOMASS') * dt;
        } else e.evaluate();
        this.rows.forEach((r, i) => { h.data[i][h.k] = r.get(e); });
        // additions at this moment act after it is recorded, so the arrow sits where the trace turns
        const t = h.k * dt;
        while (h.ev < (h.events || []).length && h.events[h.ev].t <= t + 1e-9) { h.events[h.ev].apply(e); e.applyEnv(); h.ev++; }
        h.k++;
        if (h.k >= this.N) h.g1 = e.conc('glycogen');
        return h.k < this.N;
    }
    /** Work for about budget ms, round-robin over the histories; true when every history is finished. */
    pump(budget) {
        const t0 = performance.now();
        let live = true;
        while (live && performance.now() - t0 < budget) {
            live = false;
            for (const h of this.H) for (let n = 0; n < 8; n++) { if (this.work(h)) live = true; else break; }
        }
        this.done = !live;
        return this.done;
    }
    /** Queue this run; the page computes one run at a time, about 14 ms a frame, so it stays responsive. */
    start(first = false) {
        first ? QUEUE.unshift(this) : QUEUE.push(this);
        if (!pumping) { pumping = true; requestAnimationFrame(loop); }
        return this;
    }
    /** Samples recorded so far (the slowest history's). */
    filled() { return Math.min(...this.H.map((h) => h.k)); }
    /** Mean of row i over [a, b] model seconds in history h. */
    mean(h, i, a, b) {
        const dt = this.spec.dt, k0 = Math.round(a / dt), k1 = Math.round(b / dt);
        let s = 0, n = 0; for (let k = k0; k <= k1 && k < h.k; k++) { s += h.data[i][k]; n++; }
        return n ? s / n : NaN;
    }
}

const QUEUE = [];
let pumping = false;
function loop() {
    while (QUEUE.length && (QUEUE[0].dead || QUEUE[0].done)) QUEUE.shift();
    if (!QUEUE.length) { pumping = false; return; }
    const sim = QUEUE[0];
    if (sim.pump(reduce ? 1e9 : 14)) sim.spec.onDone?.(sim);
    for (const v of sim.views) v.draw();
    requestAnimationFrame(loop);
}

// ─── A View: one time range of a Sim, drawn as strips ───
const fmtT = (t) => (t >= 100 || Number.isInteger(t) ? Math.round(t) : t.toFixed(1)) + ' s';
class View {
    constructor(root, sim, opts = {}) {
        this.root = root; this.sim = sim; this.a = opts.from ?? 0; this.b = opts.to ?? sim.spec.T; this.cursor = null;
        sim.views.push(this);
        root.innerHTML = '';
        root.classList.add('rec');
        const head = el('div', 'rec-head');
        const key = el('div', 'rec-key');
        if (sim.H.length > 1) sim.H.forEach((h) => {
            const s = el('span'); const k = svg('svg', { viewBox: '0 0 26 8' });
            k.append(svg('line', { x1: 0, y1: 4, x2: 26, y2: 4, stroke: h.ctl ? 'var(--muted)' : 'var(--text)', 'stroke-width': h.ctl ? 1.2 : 1.6, 'stroke-dasharray': h.ctl ? '4 3' : 'none' }));
            s.append(k, document.createTextNode(h.name)); key.append(s);
        });
        else key.append(el('span', '', opts.title || ''));
        this.tEl = el('span', 'rec-t');
        head.append(key, this.tEl);
        const body = el('div', 'rec-body');
        this.marks = el('div', 'rec-marks');
        body.append(this.marks);
        this.rowEls = sim.rows.map((r) => {
            const row = el('div', 'rec-row');
            const lab = el('div', 'rec-lab', `<i>${r.label}</i>`); const val = el('b'); lab.append(val);
            const s = svg('svg', { class: 'rec-strip', viewBox: '0 0 1000 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
            const zero = svg('line', { class: 'zero', x1: 0, x2: 1000, y1: -10, y2: -10 });
            const paths = sim.H.map((h) => { const p = svg('path', { class: h.ctl ? 'ctl' : '' }); if (!h.ctl) p.style.stroke = `var(${r.ink})`; return p; });
            s.append(zero, ...paths.slice().reverse());
            row.append(lab, s); body.append(row);
            return { val, paths, zero };
        });
        this.cur = el('div', 'rec-cursor'); this.cur.hidden = true;
        const hit = el('div', 'rec-hit');
        hit.setAttribute('role', 'slider'); hit.tabIndex = 0;
        hit.setAttribute('aria-label', 'Time on the record');
        body.append(this.cur, hit);
        const axis = el('div', 'rec-axis');
        const mid = (this.a + this.b) / 2;
        axis.append(el('span', '', fmtT(this.a)), el('span', '', fmtT(mid)), el('span', '', fmtT(this.b) + ' of model time'));
        root.append(head, body, axis);
        const at = (ev) => { const r = hit.getBoundingClientRect(); return this.a + Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)) * (this.b - this.a); };
        hit.addEventListener('pointermove', (ev) => { this.cursor = at(ev); this.draw(); });
        hit.addEventListener('pointerdown', (ev) => { this.cursor = at(ev); this.draw(); });
        hit.addEventListener('pointerleave', () => { this.cursor = null; this.draw(); });
        hit.addEventListener('keydown', (ev) => {
            const step = (this.b - this.a) / 100;
            if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
                this.cursor = Math.min(this.b, Math.max(this.a, (this.cursor ?? this.b) + (ev.key === 'ArrowLeft' ? -step : step)));
                ev.preventDefault(); this.draw();
            }
        });
        // additions, from every history (the control has none)
        const seen = new Set();
        for (const h of sim.H) for (const ev of h.events || []) {
            if (ev.t < this.a || ev.t > this.b || seen.has(ev.t + ev.label)) continue;
            seen.add(ev.t + ev.label);
            const f = (ev.t - this.a) / (this.b - this.a);
            const m = el('div', 'rec-mark' + (f > 0.85 ? ' r' : f < 0.15 ? ' l' : ''), `<span>${ev.label}</span>`);
            m.style.left = (f * 100) + '%'; this.marks.append(m);
        }
        this.draw();
    }
    draw() {
        const sim = this.sim, dt = sim.spec.dt, a = this.a, b = this.b;
        const k0 = Math.max(0, Math.floor(a / dt)), kEnd = Math.min(sim.N - 1, Math.ceil(b / dt));
        sim.rows.forEach((r, i) => {
            // the range over every history's samples in view
            let lo = Infinity, hi = -Infinity;
            for (const h of sim.H) for (let k = k0; k <= kEnd && k < h.k; k++) { const v = h.data[i][k]; if (v < lo) lo = v; if (v > hi) hi = v; }
            if (!Number.isFinite(lo)) return;
            if (r.lo != null) lo = Math.min(lo, r.lo);
            if (r.hi != null) hi = Math.max(hi, r.hi);
            const span = hi - lo || Math.abs(hi) || 1; lo -= span * 0.06; hi += span * 0.06;
            const Y = (v) => 96 - (v - lo) / (hi - lo) * 92;
            const re = this.rowEls[i];
            if (lo < 0 && hi > 0) { re.zero.setAttribute('y1', Y(0)); re.zero.setAttribute('y2', Y(0)); }
            sim.H.forEach((h, hi_) => {
                // one column of 1000 a pixel: first, min, max, last, so a fifth-of-a-second spike survives
                let d = '', col = -1, f = 0, mn = 0, mx = 0, l = 0;
                const flush = () => { if (col < 0) return; d += `${d ? 'L' : 'M'}${col},${Y(f).toFixed(2)}L${col},${Y(mn).toFixed(2)}L${col},${Y(mx).toFixed(2)}L${col},${Y(l).toFixed(2)}`; };
                for (let k = k0; k <= kEnd && k < h.k; k++) {
                    const x = Math.round(((k * dt) - a) / (b - a) * 1000), v = h.data[i][k];
                    if (x !== col) { flush(); col = x; f = mn = mx = l = v; } else { if (v < mn) mn = v; if (v > mx) mx = v; l = v; }
                }
                flush();
                re.paths[hi_].setAttribute('d', d);
            });
        });
        // the cursor reads every row at one moment (the latest sample while it runs)
        const n = sim.filled();
        const tNow = Math.min(b, Math.max(a, (n - 1) * dt));
        const t = this.cursor ?? tNow, k = Math.min(n - 1, Math.max(0, Math.round(t / dt)));
        this.cur.hidden = this.cursor == null;
        this.cur.style.left = ((t - a) / (b - a) * 100) + '%';
        this.tEl.textContent = (sim.done || this.cursor != null ? '' : 'running · ') + 't ' + fmtT(Math.round(k * dt * 100) / 100);
        if (n <= 0) return;
        sim.rows.forEach((r, i) => {
            const vals = sim.H.map((h) => r.fmt(h.data[i][Math.min(k, h.k - 1)]));
            this.rowEls[i].val.innerHTML = vals.length > 1 ? `<span class="was">${vals[0]}</span> · ${vals[1]}` : vals[0];
        });
    }
}

// ─── Where the carbon went: one patterned bar per history ───
function ledger(root, sim) {
    const parts = (h) => {
        const a = h.acc, dg = 6 * (h.g1 - h.g0);
        const src = [['CO₂', Math.max(a.co2, 0)], ['glucose', a.glc], ['fatty acid', a.fa], ['lactate', Math.max(-a.lac, 0)], ['glycogen', Math.max(-dg, 0)]];
        const dst = [['to the cell', 'p-cell', a.bio], ['glycogen', 'p-store', Math.max(dg, 0)], ['lactate out', 'p-lac', Math.max(a.lac, 0)],
            ['ethanol, acetate out', 'p-out', a.etoh + a.ac], ['CO₂ given off', 'p-co2', Math.max(-a.co2, 0)]];
        const sIn = src.reduce((s, [, v]) => s + v, 0), sOut = dst.reduce((s, [, , v]) => s + v, 0);
        // what came in and didn't leave or get stored sits in the network's pools (or came out of them)
        if (sIn > sOut) dst.push(['held in the pools', 'p-pool', sIn - sOut]); else src.push(['the pools', sIn - sOut < 0 ? sOut - sIn : 0]);
        return { src, dst, total: Math.max(sIn, sOut) };
    };
    const P = sim.H.map(parts), max = Math.max(...P.map((p) => p.total), 1e-9);
    root.innerHTML = '';
    root.append(el('p', 'label', `Where the carbon went, mM of carbon over the ${Math.round(sim.spec.T - (sim.spec.from || 0))} s`));
    sim.H.forEach((h, i) => {
        const row = el('div', 'lrow'); row.append(el('i', '', h.name));
        const bar = el('div', 'lbar');
        for (const [name, cls, v] of P[i].dst) if (v > max * 0.004) { const s = el('span', cls); s.style.width = (v / max * 100) + '%'; s.title = `${name} ${v.toFixed(1)}`; bar.append(s); }
        row.append(bar);
        const to = P[i].dst.filter(([, , v]) => v > 0.05).map(([n, , v]) => `${n} ${v.toFixed(1)}`).join(' · ');
        const from = P[i].src.filter(([, v]) => v > 0.05).map(([n, v]) => `${n} ${v.toFixed(1)}`).join(' · ');
        row.append(el('div', 'lfrom', `from ${from || 'nothing'} → ${to}`));
        root.append(row);
    });
    const key = el('div', 'lkey');
    for (const [n, c] of [['to the cell', 'p-cell'], ['glycogen', 'p-store'], ['lactate out', 'p-lac'], ['ethanol, acetate out', 'p-out'], ['CO₂ given off', 'p-co2'], ['held in the pools', 'p-pool']]) {
        const s = el('span'); const sw = el('em', c); s.append(sw, document.createTextNode(n)); key.append(s);
    }
    root.append(key);
}

// ─── Fig. 3: two histories of one cell ───
const set = (e, id, a) => { const j = e.rIndex[id]; if (j != null) e.state.activity[j] = a; };
const CHANGES = {
    cyanobacterium: [
        ['Light to 30%', (e) => { e.env.light = 0.3; }],
        ['Dark', (e) => { e.env.light = 0; }],
        ['No oxygen', (e) => { e.env.o2 = 0; }],
        ['ATP demand ×2', (e) => { e.dial.atp *= 2; }],
        ['RuBisCO ×0.1', (e) => { set(e, 'RBPC', 0.1); }],
    ],
    animalCell: [
        ['No oxygen', (e) => { e.env.o2 = 0; }],
        ['ATP demand ×2', (e) => { e.dial.atp *= 2; }],
        ['Uncoupler', (e) => { set(e, 'UCP', 1); }],
        ['PFK ×0.1', (e) => { set(e, 'PFK', 0.1); }],
        ['Oligomycin', (e) => { set(e, 'ATPS', 0); }],
    ],
};
const ROWS_OF = { cyanobacterium: ['dp', 'atp', 'nadph', 'o2out', 'gross', 'co2in', 'lac'], animalCell: ['dp', 'atpc', 'atpm', 'nadh', 'o2in', 'glc', 'lac'] };
const two = { cell: 'cyanobacterium', change: 0, sim: null };
function runTwo() {
    two.sim && (two.sim.dead = true);
    const [label, apply] = CHANGES[two.cell][two.change];
    const sim = new Sim({
        cell: two.cell, warm: 40, T: 120, dt: 0.25, rows: ROWS_OF[two.cell],
        histories: [{ name: 'unchanged', ctl: true, events: [] }, { name: label, events: [{ t: 10, label, apply }] }],
        onDone: (s) => ledger($('#two-ledger'), s),
    });
    two.sim = sim;
    new View($('#two-rec'), sim);
    $('#two-ledger').innerHTML = '<p class="label">Where the carbon went <span class="rec-busy">· running</span></p>';
    sim.start(true);
}
function seg(root, items, pick, on) {
    root.innerHTML = '';
    items.forEach((name, i) => {
        const b = el('button', 'b', name); b.type = 'button'; b.setAttribute('aria-pressed', i === pick ? 'true' : 'false');
        b.addEventListener('click', () => { [...root.children].forEach((c, j) => c.setAttribute('aria-pressed', j === i ? 'true' : 'false')); on(i); });
        root.append(b);
    });
}
function mountTwo() {
    const cells = ['cyanobacterium', 'animalCell'];
    seg($('#two-cell'), ['Cyanobacterium', 'Animal cell'], 0, (i) => {
        two.cell = cells[i]; two.change = 0;
        seg($('#two-change'), CHANGES[two.cell].map(([n]) => n), 0, (j) => { two.change = j; runTwo(); });
        runTwo();
    });
    seg($('#two-change'), CHANGES.cyanobacterium.map(([n]) => n), 0, (j) => { two.change = j; runTwo(); });
    runTwo();
}

// ─── Fig. 4: the stress test ───
function mountStress() {
    const sim = new Sim({
        cell: 'animalCell', warm: 120, T: 330, dt: 0.5, rows: ['o2in', 'lac', 'dp', 'atpc', 'atpm'],
        histories: [{
            name: 'animal cell', events: [
                { t: 60, label: 'oligomycin', apply: (e) => set(e, 'ATPS', 0) },
                { t: 150, label: 'uncoupler', apply: (e) => set(e, 'UCP', 1) },
                { t: 240, label: 'rotenone + antimycin', apply: (e) => { set(e, 'NDH1', 0); set(e, 'CYTBF', 0); } },
            ],
        }],
        onDone: (s) => {
            const h = s.H[0], m = (a, b) => s.mean(h, 0, a, b);
            const basal = m(45, 60), leak = m(135, 150), top = m(225, 240), non = m(315, 330);
            const pair = (k, v) => `<span><i>${k}</i>${flux(v)}</span>`;
            $('#stress-reads').innerHTML = pair('basal', basal) + pair('ATP-linked', basal - leak) + pair('leak', leak) + pair('highest tested', top) + pair('spare', top - basal) + pair('after rotenone + antimycin', non);
        },
    });
    new View($('#stress-rec'), sim, { title: 'Animal cell, intact, O₂ in the chamber’s medium held at air' });
    sim.start();
}

// ─── Fig. 5: anoxia and reoxygenation, whole and the first three seconds ───
function mountReox() {
    const sim = new Sim({
        cell: 'animalCell', warm: 120, T: 200, dt: 0.02, rows: ['succ', 'ndh1', 'sdh', 'dp', 'o2s'],
        histories: [{ name: 'animal cell', events: [{ t: 20, label: 'O₂ to 0', apply: (e) => { e.env.o2 = 0; } }, { t: 140, label: 'O₂ back to air', apply: (e) => { e.env.o2 = 1; } }] }],
    });
    new View($('#reox-rec'), sim, { title: 'Animal cell: two minutes without oxygen' });
    new View($('#reox-zoom'), sim, { from: 139.5, to: 142.5, title: 'The first three seconds back' });
    sim.start();
}

// ─── The drawings: canvas, from the theme's tokens, redrawn on a theme change ───
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function palette() {
    const P = { text: tok('--text'), muted: tok('--muted'), canvas: tok('--canvas'), panel: tok('--panel'), rule: tok('--rule'), accent: tok('--accent') };
    for (const k of ['indigo', 'prussian', 'verdigris', 'viridian', 'sap', 'ochre', 'sienna', 'umber', 'madder', 'mulberry', 'violet']) P[k] = tok('--ink-' + k);
    P.dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' || document.documentElement.dataset.theme === 'dark';
    return P;
}
const FONT = "'Newsreader', 'STIX Two Text', Georgia, serif";
function blob(c, x, y, rx, ry, fill, P, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = fill; c.fill(); c.globalAlpha = 0.55; c.lineWidth = 1; c.strokeStyle = P.dark ? P.canvas : P.text; c.stroke(); c.restore();
}
function label(c, s, x, y, P, align = 'left', size = 11.5) { c.font = `italic ${size}px ${FONT}`; c.fillStyle = P.muted; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); }
function bilayer(c, y0, y1, w, P) {
    for (let x = 4; x < w; x += 7.2) {
        c.strokeStyle = P.rule; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, y0 + 3); c.lineTo(x + 0.8, (y0 + y1) / 2 - 1); c.moveTo(x, y1 - 3); c.lineTo(x - 0.8, (y0 + y1) / 2 + 1); c.stroke();
        for (const y of [y0, y1]) { c.beginPath(); c.arc(x, y, 3.1, 0, Math.PI * 2); c.fillStyle = P.umber; c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1; }
    }
}
function wave(c, x0, y0, x1, y1, ink, dashed) {
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    c.strokeStyle = ink; c.lineWidth = 1.4; c.setLineDash(dashed ? [3, 2.5] : []);
    c.beginPath();
    for (let s = 0; s <= L - 6; s += 1) { const a = Math.sin(s / 2.6) * 3.2; const x = x0 + ux * s - uy * a, y = y0 + uy * s + ux * a; s ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - ux * 7 - uy * 4, y1 - uy * 7 + ux * 4); c.lineTo(x1 - ux * 7 + uy * 4, y1 - uy * 7 - ux * 4); c.closePath(); c.fillStyle = ink; c.fill();
}
function co2(c, x, y, P, rot = 0) { c.save(); c.translate(x, y); c.rotate(rot); for (const dx of [-5, 0, 5]) { c.beginPath(); c.arc(dx, 0, dx ? 2.6 : 2.2, 0, Math.PI * 2); c.fillStyle = dx ? P.madder : P.text; c.globalAlpha = dx ? 0.8 : 0.65; c.fill(); } c.restore(); c.globalAlpha = 1; }
function hco3(c, x, y, P) { c.beginPath(); c.arc(x, y, 2.3, 0, Math.PI * 2); c.fillStyle = P.text; c.globalAlpha = 0.65; c.fill(); for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; c.beginPath(); c.arc(x + Math.cos(a) * 4.6, y + Math.sin(a) * 4.6, 2.5, 0, Math.PI * 2); c.fillStyle = P.prussian; c.globalAlpha = 0.8; c.fill(); } c.globalAlpha = 1; }
function hexagon(c, x, y, r, rot, fill, P) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](x + r * Math.cos(a), y + r * Math.sin(a)); } c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = P.dark ? P.canvas : P.text; c.globalAlpha = 0.35; c.stroke(); c.globalAlpha = 1; }

function lead(c, x0, y0, x1, y1, P) { c.strokeStyle = P.muted; c.globalAlpha = 0.7; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.globalAlpha = 1; }
function boxed(c, s, x, y, P, align = 'center') {
    c.font = `italic 11.5px ${FONT}`; const w = c.measureText(s).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    c.fillStyle = P.canvas; c.globalAlpha = 0.9; c.fillRect(x0 - 3, y - 8, w + 6, 16); c.globalAlpha = 1; label(c, s, x, y, P, align);
}
// A label with a subscript: base, then sub smaller and lower, then the rest
function sublabel(c, base, sub, rest, x, y, P) {
    c.font = `italic 11.5px ${FONT}`; c.fillStyle = P.muted; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(base, x, y); let w = c.measureText(base).width;
    c.font = `italic 8.5px ${FONT}`; c.fillText(sub, x + w, y + 3); w += c.measureText(sub).width;
    c.font = `italic 11.5px ${FONT}`; c.fillText(rest, x + w, y);
}

const SKETCH = {
    // Part of a carboxysome entering the window under a thylakoid, and a CO₂-uptake NDH-1 hydrating CO₂ at CupA.
    // 4 px per nm: the window's 16.5 nm is 66 px under the membrane; the shell is far larger than that.
    carboxysome(c, W, H, P) {
        const m0 = 46, m1 = 70, band = m1 + 66;
        bilayer(c, m0, m1, W, P);
        label(c, 'thylakoid lumen', 10, 24, P);
        // the shell: an icosahedral outline of hexamers, pentamers at the vertices, its top inside the window
        const cx = W * 0.62, r = 236, cy = 112 + r, nV = 16;
        const verts = []; for (let i = 0; i < nV; i++) { const a = -Math.PI / 2 + (i - nV / 2 + 0.5) * (Math.PI * 2 / nV); verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
        c.save(); c.beginPath(); verts.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](x, y)); c.closePath(); c.clip();
        // RuBisCO packed inside: L₈S₈ seen end-on, four large subunits and the small ones at the corners
        for (let y = 140; y < H + 20; y += 27) for (let x = (Math.round(y / 27) % 2) * 13 + 6; x < W; x += 27) {
            if (Math.hypot(x - cx, y - cy) > r - 24) continue;
            for (const [dx, dy] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) blob(c, x + dx, y + dy, 5.4, 5.4, P.viridian, P);
            for (const [dx, dy] of [[-10, 0], [10, 0], [0, -10], [0, 10]]) { c.beginPath(); c.arc(x + dx, y + dy, 2.1, 0, Math.PI * 2); c.fillStyle = P.sap; c.fill(); }
        }
        // carbonic anhydrase just inside the shell
        for (const t of [-0.32, 0.05, 0.27]) { const a = -Math.PI / 2 + t; blob(c, cx + (r - 17) * Math.cos(a), cy + (r - 17) * Math.sin(a), 6, 5, P.verdigris, P); }
        c.restore();
        for (let i = 0; i < nV; i++) {
            const [x0, y0] = verts[i], [x1, y1] = verts[(i + 1) % nV], L = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(L / 10.5);
            const rot = Math.atan2(y1 - y0, x1 - x0), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
            for (let k = 1; k < n; k++) for (const off of [0, 8]) hexagon(c, x0 + (x1 - x0) * k / n + nx * off, y0 + (y1 - y0) * k / n + ny * off, 5.2, rot, off ? P.ochre : P.sienna, P);
            c.beginPath(); for (let j = 0; j < 5; j++) { const a = j * 1.2566 - Math.PI / 2; c[j ? 'lineTo' : 'moveTo'](x0 + 6.5 * Math.cos(a), y0 + 6.5 * Math.sin(a)); } c.closePath(); c.fillStyle = P.umber; c.fill();
        }
        // the window's lower edge
        c.strokeStyle = P.muted; c.setLineDash([2, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(0, band); c.lineTo(W, band); c.stroke(); c.setLineDash([]);
        // its depth, as a dimension at the left edge
        c.strokeStyle = P.muted; c.lineWidth = 0.8; c.beginPath(); c.moveTo(2, m1); c.lineTo(8, m1); c.moveTo(5, m1); c.lineTo(5, band); c.moveTo(2, band); c.lineTo(8, band); c.stroke();
        c.save(); c.translate(15, (m1 + band) / 2); c.rotate(-Math.PI / 2); label(c, '16.5 nm', 0, 0, P, 'center', 10.5); c.restore();
        // NDH-1₃: its membrane arm, the peripheral arm, CupA at the tip
        for (let i = 0; i < 5; i++) blob(c, 30 + i * 11, 58, 7, 13, P.indigo, P);
        blob(c, 44, 88, 9, 14, P.indigo, P, 0.2); blob(c, 50, 107, 8, 10, P.indigo, P);
        blob(c, 62, 122, 11, 9, P.verdigris, P);
        co2(c, 98, 128, P, 0.4); co2(c, 112, 112, P, -0.3);
        hco3(c, 116, 92, P); hco3(c, 148, 104, P); hco3(c, 176, 110, P);
        label(c, 'NDH-1₃ · CupA', 8, band + 16, P); lead(c, 46, band + 9, 58, 131, P);
        label(c, 'CO₂', 122, 130, P);
        label(c, 'HCO₃⁻', 128, 82, P);
        label(c, 'carboxysome shell', cx + 28, 98, P);
        lead(c, cx + 26, 101, cx + 6, 110, P);
        boxed(c, 'RuBisCO', cx - 8, 238, P);
    },
    // PSII's light: photons in through the phycobilisome, a few back out as fluorescence, OCP docked at the core
    psii(c, W, H, P) {
        const y0 = 92, y1 = 116, mx = W / 2;
        bilayer(c, y0, y1, W, P);
        label(c, 'thylakoid lumen', 10, 40, P);
        for (const [dx, f] of [[-28, P.sap], [-10, P.viridian], [10, P.viridian], [28, P.sap]]) blob(c, mx + dx, (y0 + y1) / 2, 11, 17, f, P);
        for (const dx of [-18, 18]) blob(c, mx + dx, y0 - 14, 9, 6, P.sap, P);
        const cy = y1 + 30;
        for (const dx of [-15, 0, 15]) blob(c, mx + dx, cy, 10, 10, P.prussian, P);
        for (let i = 0; i < 6; i++) {
            const a = Math.PI * (0.15 + i * 0.14), ux = Math.cos(a), uy = Math.sin(a);
            for (let k = 0; k < 3; k++) { const d = 26 + k * 12; blob(c, mx + ux * d * 1.35, cy + uy * d, 5, 8, k ? P.indigo : P.prussian, P, a - Math.PI / 2); }
        }
        // OCP, photoactivated, docked at the core's side
        blob(c, mx + 31, cy - 5, 6, 4, P.sienna, P, 0.5);
        label(c, 'OCP', mx + 92, cy - 16, P); lead(c, mx + 89, cy - 14, mx + 38, cy - 6, P);
        label(c, 'PSII', mx + 50, (y0 + y1) / 2, P);
        label(c, 'phycobilisome', mx - 104, cy - 10, P);
        wave(c, 34, H - 18, mx - 64, cy + 50, P.ochre, false);
        wave(c, mx + 6, H - 10, mx + 4, cy + 66, P.ochre, false);
        wave(c, W - 40, H - 22, mx + 70, cy + 52, P.ochre, false);
        wave(c, mx - 22, y0 - 8, mx - 92, 20, P.madder, true);
        wave(c, mx + 24, y0 - 6, mx + 112, 26, P.madder, true);
        label(c, 'photons in', mx + 14, H - 22, P);
        label(c, 'fluorescence out', W - 6, 44, P, 'right');
    },
    // Antimycin bound at complex III's Qᵢ site: the zoom layer's cofactors, and an electron that waits
    antimycin(c, W, H, P) {
        const y0 = 96, y1 = 150, mx = W * 0.38, my = (y0 + y1) / 2, lx = mx + 84;
        bilayer(c, y0, y1, W, P);
        label(c, 'intermembrane space', 10, 28, P);
        label(c, 'matrix', 10, H - 18, P);
        for (const [dx, dy, rx, ry] of [[-40, 0, 20, 30], [-12, 4, 15, 34], [14, 4, 15, 34], [42, 0, 20, 30], [-24, 52, 18, 14], [26, 52, 18, 14], [0, -46, 24, 13]]) blob(c, mx + dx, my + dy, rx, ry, P.prussian, P);
        const site = (x, y, ink) => { c.beginPath(); c.arc(x, y, 4.6, 0, Math.PI * 2); c.fillStyle = ink; c.fill(); c.strokeStyle = P.canvas; c.lineWidth = 1; c.stroke(); };
        const qo = [mx - 6, y0 + 8], bl = [mx - 6, y0 + 24], bh = [mx - 6, y1 - 22], qi = [mx + 4, y1 - 4];
        site(...qo, P.panel); site(...bl, P.madder); site(...bh, P.madder);
        // the electron, waiting at b_H
        c.beginPath(); c.arc(bh[0] - 10, bh[1], 3.6, 0, Math.PI * 2); c.fillStyle = P.canvas; c.fill(); c.strokeStyle = P.text; c.lineWidth = 1.2; c.stroke();
        // antimycin in the Qᵢ pocket: a ring and its tail, in the text ink, as the zoom layer draws a bound ligand
        const [ax, ay] = qi;
        c.strokeStyle = P.text; c.lineWidth = 1.6;
        c.beginPath(); for (let i = 0; i < 9; i++) { const a = i * 0.698; c[i ? 'lineTo' : 'moveTo'](ax + 6 * Math.cos(a), ay + 6 * Math.sin(a)); } c.closePath(); c.stroke();
        c.beginPath(); c.moveTo(ax + 6, ay); c.lineTo(ax + 12, ay + 4); c.lineTo(ax + 18, ay); c.lineTo(ax + 24, ay + 4); c.stroke();
        c.beginPath(); c.moveTo(ax - 6, ay); c.lineTo(ax - 11, ay - 5); c.stroke();
        // labels beside the complex, on leaders
        sublabel(c, 'Q', 'o', '', lx, y0 + 2, P); lead(c, lx - 4, y0 + 2, qo[0] + 6, qo[1], P);
        sublabel(c, 'heme b', 'L', '', lx, y0 + 20, P); lead(c, lx - 4, y0 + 20, bl[0] + 6, bl[1], P);
        sublabel(c, 'heme b', 'H', ', an electron waiting', lx, y1 - 18, P); lead(c, lx - 4, y1 - 18, bh[0] + 6, bh[1], P);
        sublabel(c, 'antimycin at Q', 'i', '', lx, y1 + 8, P); lead(c, lx - 4, y1 + 8, ax + 26, ay + 3, P);
    },
};
function mountSketches() {
    const all = [...document.querySelectorAll('canvas[data-sketch]')];
    const draw = () => {
        const P = palette();
        for (const cv of all) {
            const W = 400, H = 300, dpr = Math.min(3, window.devicePixelRatio || 1), cw = cv.clientWidth || 400;
            cv.width = Math.round(cw * dpr); cv.height = Math.round(cw * dpr * (cv.clientHeight / cv.clientWidth || 0.75));
            const c = cv.getContext('2d'); const s = cv.width / W;
            c.setTransform(s, 0, 0, s, 0, 0); c.clearRect(0, 0, W, cv.height / s);
            SKETCH[cv.dataset.sketch](c, W, cv.height / s, P);
        }
    };
    draw();
    document.fonts?.ready?.then(draw);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 120); });
}

mountTwo();
mountStress();
mountReox();
mountSketches();
