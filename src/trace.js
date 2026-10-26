// Trace — Fig. 2, the last two minutes: Δp, the ATP share of the adenylates,
// the reduced share of the cell's main carrier (NADPH where it photosynthesizes,
// NADH elsewhere) and its headline flux, sampled at 5 Hz while the chemistry
// runs, with an arrow for each thing you did, as additions are marked on an
// oxygen-electrode trace. Time is wall time (the slowdown applies), so it
// stops while paused. This is the bench's first register (VISION.md).
import Cell from './cell.js';
import { poolShares } from './dashboard.js';
import * as K from './complexes.js';

const SPAN = 120;        // s of wall time shown
const EVERY = 0.2;       // s between samples
const N = Math.round(SPAN / EVERY) + 2;

/** The rows for the cell now under the microscope. */
function rowsFor() {
    const has = Cell.has, photo = has('PSII');
    // a reaction's rate in mM/s of cytosol (a matrix reaction scaled by the matrix's volume)
    const R = (rid) => { const e = Cell.engine, j = e.rIndex[rid]; return j == null ? 0 : e.state.v[j] * (e.model.comps[e.reactions[j].comp] || 1); };
    const flux = photo ? ['O₂ made', () => R('PSII') / 2] : has('BR') ? ['ATP made', () => R('ATPS')]
        : has('CYTOX') ? ['O₂ used', () => R('CYTOX') / 2] : ['glucose in', () => R('EX_glc')];
    return [
        { label: 'Δp', ink: () => K.P.accent, get: () => Cell.engine.dp(), lo: 0, hi: 250, fmt: (v) => Math.round(v) + ' mV' },
        { label: 'ATP share', ink: () => K.ink('ochre'), get: () => poolShares().atp, lo: 0, hi: 1, fmt: (v) => Math.round(v * 100) + '%' },
        photo ? { label: 'NADPH share', ink: () => K.ink('viridian'), get: () => poolShares().nadph, lo: 0, hi: 1, fmt: (v) => Math.round(v * 100) + '%' }
            : { label: 'NADH share', ink: () => K.ink('prussian'), get: () => poolShares().nadh, lo: 0, hi: 1, fmt: (v) => Math.round(v * 100) + '%' },
        { label: flux[0], ink: () => K.ink('verdigris'), get: flux[1], auto: true, fmt: (v) => (Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2)).replace('-', '−') + ' mM/s' },
    ];
}

const Trace = {
    t: 0, rows: [], data: [], times: new Float64Array(N), head: 0, count: 0, marks: [], _acc: 0, dirty: false,

    /** A fresh trace for a new cell (a preset or a reset). */
    reset() {
        this.rows = rowsFor();
        this.data = this.rows.map(() => new Float32Array(N));
        this.head = 0; this.count = 0; this.marks = []; this._acc = EVERY; this.dirty = true;
    },

    /** Advance the trace's clock while the chemistry runs; sample every EVERY seconds. */
    tick(dt) {
        if (!Cell.engine || !this.rows.length) return;
        this.t += dt; this._acc += dt;
        if (this._acc < EVERY) return;
        this._acc = 0;
        this.times[this.head] = this.t;
        this.rows.forEach((r, i) => { this.data[i][this.head] = r.get(); });
        this.head = (this.head + 1) % N; if (this.count < N) this.count++;
    },

    /** An arrow for something you did; a run of the same change (a drag) moves one arrow. */
    mark(label, key = label) {
        const m = this.marks[this.marks.length - 1];
        this.dirty = true;
        if (m && m.key === key && this.t - m.t < 1.5) { m.t = this.t; m.label = label; return; }
        this.marks.push({ t: this.t, label, key });
        if (this.marks.length > 40) this.marks.shift();
    },

    draw(cv) {
        const w = cv.offsetWidth, h = cv.offsetHeight;
        if (!w || !h) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        const c = cv.getContext('2d'), P = K.P, fs = 11.5;
        c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
        const top = 28, axis = 15, n = this.rows.length, rh = (h - top - axis) / n, x0 = 0, x1 = w;
        const X = (t) => x1 - (this.t - t) / SPAN * (x1 - x0);
        c.textBaseline = 'alphabetic';
        // Rows: the quantity's line over a hairline, its name and value now above it
        this.rows.forEach((r, i) => {
            const y0 = top + i * rh, base = y0 + rh - 3.5, d = this.data[i];
            let lo = r.lo, hi = r.hi;
            if (r.auto) {
                lo = 0; hi = 0;
                for (let k = 0; k < this.count; k++) { const v = d[(this.head - 1 - k + N) % N]; if (v > hi) hi = v; if (v < lo) lo = v; }
                hi = Math.max(hi * 1.15, 0.05); lo = lo < 0 ? lo * 1.15 : 0;
            }
            const Y = (v) => base - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo || 1) * (rh - fs - 6);
            c.fillStyle = K.rgba(P.text, P.dark ? 0.13 : 0.12); c.fillRect(x0, Math.round(base) + 0.5, x1 - x0, 1);
            if (lo < 0) { c.fillStyle = K.rgba(P.text, 0.08); c.fillRect(x0, Math.round(Y(0)), x1 - x0, 1); }
            c.strokeStyle = r.ink(); c.lineWidth = 1.5; c.lineJoin = 'round'; c.lineCap = 'round';
            c.beginPath();
            for (let k = this.count - 1, first = true; k >= 0; k--) {
                const at = (this.head - 1 - k + N) % N, x = X(this.times[at]);
                if (x < x0 - 2) continue;
                const y = Y(d[at]);
                if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y);
            }
            c.stroke();
            // its name and its value now at the left, clear of the arrows, which gather at the right
            c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = P.muted; c.textAlign = 'left';
            c.fillText(r.label, x0, y0 + fs);
            if (this.count) {
                const lw = c.measureText(r.label + ' ').width;
                c.font = `${fs + 0.5}px ${_FONT.text}`; c.fillStyle = P.text;
                c.fillText(r.fmt(d[(this.head - 1 + N) % N]), x0 + lw + 2, y0 + fs);
            }
        });
        // Arrows for what you did, their labels on two staggered lines
        const ends = [-1e9, -1e9];
        c.font = `italic ${fs - 0.5}px ${_FONT.text}`;
        for (const m of this.marks) {
            const x = X(m.t);
            if (x < x0 + 2 || x > x1) continue;
            c.strokeStyle = K.rgba(P.text, 0.32); c.lineWidth = 1; c.setLineDash([2, 3]);
            c.beginPath(); c.moveTo(Math.round(x) + 0.5, top - 3); c.lineTo(Math.round(x) + 0.5, h - axis); c.stroke(); c.setLineDash([]);
            c.fillStyle = P.text; c.beginPath(); c.moveTo(x - 3.5, top - 9); c.lineTo(x + 3.5, top - 9); c.lineTo(x, top - 3); c.closePath(); c.fill();
            const tw = c.measureText(m.label).width, lx = Math.max(x0, Math.min(x1 - tw, x - tw / 2));
            const line = lx > ends[0] + 4 ? 0 : lx > ends[1] + 4 ? 1 : -1;
            if (line < 0) continue;
            ends[line] = lx + tw;
            c.fillStyle = P.text2; c.textAlign = 'left'; c.fillText(m.label, lx, line ? top - 22.5 : top - 11.5);
        }
        // The time axis
        c.font = `${fs - 1}px ${_FONT.text}`; c.fillStyle = P.muted;
        for (const [t, s, a] of [[SPAN, '−2 min', 'left'], [SPAN / 2, '−1 min', 'center'], [0, 'now', 'right']]) {
            const x = x1 - t / SPAN * (x1 - x0);
            c.textAlign = a; c.fillText(s, x, h - 2);
            c.fillStyle = K.rgba(P.text, 0.3); c.fillRect(Math.round(x) - (a === 'right' ? 1 : 0), h - axis, 1, 3); c.fillStyle = P.muted;
        }
    },
};

export default Trace;
