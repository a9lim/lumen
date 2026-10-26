// Stroma — the cofactor pools as molecules, in the band under the membrane
// where the cell keeps them. The window (window.js) sets each pool's count,
// the slab's mean at the cell's concentrations (store.totalAtpAdp, totalNad,
// totalNadp; FAD stays bound to its enzymes), and how many are in the charged
// or reduced form; the drawing follows. A sampled event with a place moves
// the molecule nearest that place: a membrane complex pulls one in to dock
// (ATP synthase, FNR, NDH-1, NNT) and lets it go changed; an enzyme on the
// map changes one and a thread runs from it to that enzyme, down, across and
// down. Forward and backward events pair up in time, so the drawn count
// wanders about the cell's and only what stays off is reconciled, a little at a
// time and at random among free molecules; a docked molecule's fate is fixed.
// No molecule changes back within a second while another could change instead.
import { store } from './state.js';
import { Membrane } from './membrane.js';
import * as K from './complexes.js';

const TAU = Math.PI * 2;
const PAIRS = [['atp', 'totalAtpAdp'], ['nadh', 'totalNad'], ['nadph', 'totalNadp'], ['fadh2', 'totalFad']];
const THREAD_GROW = 0.3, THREAD_LIFE = 1.2;   // s
const FORM_FADE = 0.15;     // s a molecule's glyph crossfades when it changes form
const REFRACT = 1;          // s after a change before the same molecule is picked again, if another can be
const RECONCILE = 1.5;      // s, the time constant of reconciling the drawn forms with the cell's ratio
const REACH = 16;           // nm a complex reaches for a molecule to dock, before it takes a farther one
const DOCK_V = 40, DOCK_V0 = 8;   // nm/s: a docking molecule's speed, at most and at least

const Stroma = {
    mols: [],       // { pool, on, was, ft, x, y, vx, vy, rot, vr, dock }
    queue: [],      // changes with a place since the last update: { pool, d, site?: [x, y], to?: [x, y] }
    threads: [],    // { m, to: [x, y], key, col, t }: one live thread per enzyme
    focus: null,    // a map point [x, y]: threads ending there draw at full strength, the rest fainter
    radicals: [],   // superoxide, one per unit of active ROS: { x, y, vx, vy, rot, a, gone }
    gapY: 0,        // where a thread runs across, between the registers
    _rnd: mulberry(7), _spr: null, _sprKey: '', _acc: {},

    /** Molecules for the current pools, scattered through the band. */
    fill() {
        this.mols = []; this.queue = []; this.threads = []; this.radicals = []; this._acc = {};
        for (const [k, tot] of PAIRS) for (let i = 0; i < store[tot]; i++) {
            const m = { pool: k, on: i < store[k], was: i < store[k], ft: 9, x: 0, y: 0, vx: 0, vy: 0, rot: this._rnd() * TAU, vr: 0, dock: null };
            this._place(m); this.mols.push(m);
        }
    },

    /** The band moved (a new layout or specimen): scatter the molecules again, keeping their forms. */
    relayout() {
        if (this.mols.length !== PAIRS.reduce((a, [, t]) => a + store[t], 0)) { this.fill(); return; }
        for (const m of this.mols) { if (m.dock) form(m, m.dock.to); m.dock = null; this._place(m); }
        this.threads = []; this.queue = [];
    },

    /**
     * Queue a change with a place: site = where it docks, to = the map enzyme a thread runs to.
     * d is ±1 for a molecule changed, ±0.5 for an exchange (the enzyme's forward and backward
     * events paired: a thread from a molecule it would take, which stays as it was).
     */
    event(pool, d, site, to) {
        if (d && (site || to)) this.queue.push({ pool, d: Math.sign(d), swap: Math.abs(d) < 1, site: site || null, to: to || null });
    },

    update(dt) {
        const B = Membrane.band, s = Membrane.s, r = this._rnd;
        if (!B) return;
        for (const m of this.mols) {
            m.ft += dt;
            if (m.dock) {
                // drawn in to the site at a capped speed, then let go changed
                const D = m.dock, dx = D.x - m.x, dy = D.y - m.y, d = Math.hypot(dx, dy), v = Math.min(DOCK_V * s, Math.max(DOCK_V0 * s, d * 4)) * dt;
                if (D.phase === 0) { if (d <= v) { m.x = D.x; m.y = D.y; D.phase = 1; D.t = 0; } else { m.x += dx / d * v; m.y += dy / d * v; } }
                else if ((D.t += dt) > 0.18) { form(m, D.to); m.vx = D.ex * 6 * s; m.vy = D.ey * 6 * s; m.dock = null; }
                continue;
            }
            m.vr += (r() - 0.5) * 2.5 * dt; m.vr *= 0.95; m.rot += m.vr * dt;
            // let go outside the band (the crista's ATP synthase heads): back into it at a bounded speed
            const bx = Math.max(B.x0, Math.min(B.x1, m.x)), by = Math.max(B.y0, Math.min(B.y1, m.y)), bd = Math.hypot(bx - m.x, by - m.y);
            if (bd > 0.5 * s) { const v = Math.min(bd, DOCK_V * s * dt); m.x += (bx - m.x) / bd * v; m.y += (by - m.y) / bd * v; m.vx = m.vy = 0; continue; }
            m.vx += (r() - 0.5) * 60 * s * dt; m.vy += (r() - 0.5) * 60 * s * dt; m.vx *= 0.92; m.vy *= 0.92;
            // A molecule just let go inside a complex's footprint drifts out of it; elsewhere it bounces off
            const inside = this._blocked(m.x, m.y, 0);
            if (inside) {
                // straight out from the middle of the footprint it is in
                const E = Membrane.avoid.find(([ax, ay, rx, ry]) => ((m.x - ax) / rx) ** 2 + ((m.y - ay) / ry) ** 2 < 1);
                let ux = E ? (m.x - E[0]) / E[2] : 0, uy = E ? (m.y - E[1]) / E[3] : 1;
                // sideways where the band's edge is in the way
                if ((uy < 0 && m.y - B.y0 < 2 * s) || (uy > 0 && B.y1 - m.y < 2 * s)) { ux = ux < 0 ? -1 : 1; uy = 0; }
                const ul = Math.hypot(ux, uy) || 1;
                m.vx = ux / ul * 6 * s; m.vy = uy / ul * 6 * s;
            }
            const nx = m.x + m.vx * dt, ny = m.y + m.vy * dt;
            if (!inside && this._blocked(nx, ny, 0.3 * s)) { m.vx *= -0.6; m.vy *= -0.6; } else { m.x = nx; m.y = ny; }
            if (m.x < B.x0) { m.x = B.x0; m.vx = Math.abs(m.vx); } else if (m.x > B.x1) { m.x = B.x1; m.vx = -Math.abs(m.vx); }
            if (m.y < B.y0) { m.y = B.y0; m.vy = Math.abs(m.vy); } else if (m.y > B.y1) { m.y = B.y1; m.vy = -Math.abs(m.vy); }
        }
        // Each queued change, in order, moves the free molecule nearest its place that
        // didn't just change (a docking one, the nearest within reach first)
        const reach = (REACH * s) ** 2, far = 1e12;
        for (const ev of this.queue.splice(0)) {
            const near = ev.site || ev.to, d = ev.d;
            let best = null, bd = Infinity;
            for (const m of this.mols) {
                if (m.pool !== ev.pool || m.dock || m.on === (d > 0)) continue;
                let dd = (m.x - near[0]) ** 2 + (m.y - (ev.site ? near[1] : B.y1)) ** 2 * (ev.site ? 1 : 0.2);
                if (ev.site && dd > reach) dd += far;
                if (m.ft < REFRACT) dd += 2 * far;
                if (dd < bd) { bd = dd; best = m; }
            }
            if (best) this._change(best, d, ev);
        }
        // What the events leave off the cell's ratio is reconciled at a rate in proportion to
        // it (a docking molecule counts as what it will leave as), so a forward event is
        // usually met by a backward one before anything is reconciled
        for (const [k] of PAIRS) {
            let on = 0, n = 0;
            for (const m of this.mols) if (m.pool === k) { n++; if (m.dock ? m.dock.to : m.on) on++; }
            const diff = store[k] - on;
            if (!diff || !n) { this._acc[k] = 0; continue; }
            this._acc[k] = (this._acc[k] || 0) + Math.abs(diff) * dt / RECONCILE;
            while (this._acc[k] >= 1) {
                this._acc[k] -= 1;
                const m = this._pickFree(k, diff < 0);
                if (!m) { this._acc[k] = 0; break; }
                form(m, diff > 0);
            }
        }
        for (const t of this.threads) t.t += dt;
        this.threads = this.threads.filter(t => t.t < THREAD_LIFE);
        this._radicals(dt);
    },

    /**
     * Active ROS (produced − scavenged) as superoxide radicals: each appears
     * where Lumen's leaks happen (complex I or NDH-1's arm, the Q-cycle at b₆f
     * or bc₁), wanders the stroma, and fades when it is scavenged.
     */
    _radicals(dt) {
        const B = Membrane.band, s = Membrane.s, r = this._rnd, pos = Membrane.pos;
        const want = Math.min(30, Math.max(0, store.rosProduced - store.rosScavenged));
        let have = this.radicals.filter(q => !q.gone).length;
        const src = [Membrane.sites.ndh1, pos.cytb6f && [pos.cytb6f.x, Membrane.mid + 4 * s]].filter(Boolean);
        while (have < want && src.length) {
            const [x, y] = src[(this.radicals.length + have) % src.length];
            this.radicals.push({ x: x + (r() - 0.5) * 3 * s, y: y + r() * 2 * s, vx: 0, vy: 2 * s, rot: r() * TAU, a: 0, gone: false });
            have++;
        }
        for (const q of this.radicals) if (have > want && !q.gone) { q.gone = true; have--; }
        for (const q of this.radicals) {
            q.a = q.gone ? q.a - dt * 3 : Math.min(1, q.a + dt * 3);
            q.vx += (r() - 0.5) * 40 * s * dt; q.vy += (r() - 0.5) * 40 * s * dt; q.vx *= 0.94; q.vy *= 0.94;
            q.x = Math.max(B.x0, Math.min(B.x1, q.x + q.vx * dt)); q.y = Math.max(B.y0, Math.min(B.y1, q.y + q.vy * dt)); q.rot += dt * 0.7;
        }
        this.radicals = this.radicals.filter(q => q.a > 0 || !q.gone);
    },

    /** Superoxide, O₂•⁻: two atoms and the radical's dot, in the text's ink. */
    drawRadicals(c) {
        const s = Membrane.s * 1.3, P = K.P, col = P.text;
        for (const q of this.radicals) {
            c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.globalAlpha = Math.max(0, q.a);
            for (const d of [-0.34, 0.34]) { c.beginPath(); c.arc(d * s, 0, 0.42 * s, 0, TAU); c.fillStyle = P.canvas; c.fill(); c.lineWidth = Math.max(0.9, 0.13 * s); c.strokeStyle = col; c.stroke(); }
            c.beginPath(); c.arc(0, -0.78 * s, Math.max(1.1, 0.14 * s), 0, TAU); c.fillStyle = col; c.fill();
            c.restore();
        }
    },

    /** The molecules, from sprites rendered at the drawn resolution (px per nm on screen). */
    draw(c, res) {
        const s = Membrane.s, spr = this._sprites(res), w = 3.4 * s, h = 2.2 * s, F = K.POOL_FORMS;
        for (const m of this.mols) {
            c.save(); c.translate(m.x, m.y); c.rotate(m.rot);
            // a molecule that just changed form crossfades from its old glyph to its new one
            const f = m.was === m.on ? 1 : Math.min(1, m.ft / FORM_FADE);
            if (f < 1) { c.globalAlpha = 1 - f; c.drawImage(spr[F[m.pool][m.was ? 0 : 1]], -1.7 * s, -1.1 * s, w, h); c.globalAlpha = f; }
            c.drawImage(spr[F[m.pool][m.on ? 0 : 1]], -1.7 * s, -1.1 * s, w, h);
            c.restore();
        }
    },

    /** Threads: dotted, straight with rounded corners, down from the molecule, across between the registers, down to the enzyme. */
    drawThreads(c) {
        if (!this.threads.length) return;
        c.save(); c.lineWidth = 1; c.setLineDash([1.6, 2.8]); c.lineCap = 'round';   // a 4.4 px period
        const F = this.focus;
        for (const t of this.threads) {
            const grow = Math.min(1, t.t / THREAD_GROW), fade = 1 - Math.max(0, (t.t - THREAD_GROW) / (THREAD_LIFE - THREAD_GROW));
            const pts = sPath(t.m.x, t.m.y, t.to[0], t.to[1], this.gapY);
            // with an enzyme in focus, its threads at full strength and the others fainter
            const dim = F && Math.abs(t.to[0] - F[0]) + Math.abs(t.to[1] - F[1]) > 0.5 ? 0.45 : 1;
            c.globalAlpha = 0.85 * fade * dim; c.strokeStyle = t.col;
            strokePartial(c, pts, grow);
        }
        c.restore();
    },

    /** Change a molecule's form for a change with a place: dock at the site, or change it and run a thread. */
    _change(m, d, ev) {
        if (ev.site) {
            const a = this._rnd() * TAU;
            m.dock = { x: ev.site[0], y: ev.site[1], to: d > 0, phase: 0, t: 0, ex: Math.cos(a) * 0.5, ey: 0.5 + 0.5 * Math.abs(Math.sin(a)) };
        } else {
            if (!ev.swap) form(m, d > 0);
            if (!ev.to) return;
            // one live thread per enzyme: a new event there restarts it from the new molecule,
            // once the last has reached the enzyme (a busy enzyme's thread grows, then moves on)
            const key = ev.to[0].toFixed(1) + ',' + ev.to[1].toFixed(1), col = K.ink(K.MOL[m.pool].ink);
            const t = this.threads.find(q => q.key === key);
            if (!t) this.threads.push({ m, to: ev.to, key, col, t: 0 });
            else if (t.t >= THREAD_GROW) { t.m = m; t.col = col; t.t = 0; }
        }
    },

    /** A free molecule of a pool in a form, at random; one that changed within REFRACT only if no other is. */
    _pickFree(pool, on) {
        let a = null, na = 0, b = null, nb = 0;
        for (const m of this.mols) {
            if (m.pool !== pool || m.dock || m.on !== on) continue;
            if (m.ft >= REFRACT) { if (this._rnd() * ++na < 1) a = m; } else if (this._rnd() * ++nb < 1) b = m;
        }
        return a || b;
    },

    /** The molecule under a world point, if any (within r px). */
    pick(x, y, r) {
        let best = null, bd = r * r;
        for (const m of this.mols) { const d = (m.x - x) ** 2 + (m.y - y) ** 2; if (d < bd) { bd = d; best = m; } }
        return best;
    },

    _place(m) {
        const B = Membrane.band; if (!B) return;
        for (let t = 0; t < 60; t++) {
            m.x = B.x0 + this._rnd() * (B.x1 - B.x0); m.y = B.y0 + this._rnd() * (B.y1 - B.y0);
            if (!this._blocked(m.x, m.y, 0.8 * Membrane.s)) return;
        }
    },

    _blocked(x, y, pad) {
        for (const [ax, ay, rx, ry] of Membrane.avoid) { const dx = (x - ax) / (rx + pad), dy = (y - ay) / (ry + pad); if (dx * dx + dy * dy < 1) return true; }
        for (const [x0, y0, x1, y1] of Membrane.avoidRects) if (x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad) return true;
        return false;
    },

    /** One sprite per form, rendered once per theme and resolution. */
    _sprites(res) {
        const R = Math.max(2, Math.round(res * 4) / 4), key = R + (K.P.dark ? 'd' : 'l');
        if (key === this._sprKey) return this._spr;
        this._spr = {}; this._sprKey = key;
        for (const kind of Object.keys(K.MOL)) {
            const cv = document.createElement('canvas'); cv.width = Math.ceil(3.4 * R); cv.height = Math.ceil(2.2 * R);
            K.molGlyph(cv.getContext('2d'), 1.7 * R, 1.1 * R, R, kind);
            this._spr[kind] = cv;
        }
        return this._spr;
    },
};

/** Set a molecule's form, starting its crossfade if it changes. */
function form(m, on) { if (m.on !== on) { m.was = m.on; m.on = on; m.ft = 0; } }

/** Vertical, horizontal at y, vertical; corners rounded. Returns dense points. */
function sPath(x0, y0, x1, y1, y) {
    const r = Math.min(9, Math.abs(x1 - x0) / 2, Math.abs(y - y0), Math.abs(y1 - y));
    const sx = Math.sign(x1 - x0) || 1, pts = [[x0, y0]];
    const arc = (cx, cy, a0, a1) => { for (let k = 1; k <= 6; k++) { const a = a0 + (a1 - a0) * k / 6; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    pts.push([x0, y - r]);
    if (r > 0.5) arc(x0 + sx * r, y - r, sx > 0 ? Math.PI : 0, Math.PI / 2);
    pts.push([x1 - sx * r, y]);
    if (r > 0.5) arc(x1 - sx * r, y + r, -Math.PI / 2, sx > 0 ? 0 : -Math.PI);
    pts.push([x1, y1]);
    return pts;
}
/** Stroke the first f of a path, its dots counted from the far end, so threads that share their last run share their dots. */
function strokePartial(c, pts, f) {
    let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    c.lineDashOffset = -(total % 4.4);
    let left = total * f;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
        const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L <= left) { c.lineTo(b[0], b[1]); left -= L; }
        else { const t = left / L; c.lineTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); left = 0; }
    }
    c.stroke();
}
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export default Stroma;
