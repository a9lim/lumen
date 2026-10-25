// Stroma — the four cofactor pools as molecules, in the band under the
// membrane where the cell keeps them. There is one molecule per unit of each
// conserved pair (store.totalAtpAdp, totalNad, totalNadp, totalFad), and the
// number in the charged or reduced form always equals the store's, as the
// lumen's protons equal the gradient. A change with a place moves the
// molecule nearest that place: a membrane reaction pulls one in to dock
// (ATP synthase, FNR, NDH-1, SDH, NNT) and lets it go changed; an enzyme on
// the map changes one and a thread runs from it to that enzyme, down, across
// and down. Changes without a place (the maintenance drain, GPx, a reset)
// change one at random. Time advances by dt × simState.speed.
import { store } from './state.js';
import { Membrane } from './membrane.js';
import * as K from './complexes.js';

const TAU = Math.PI * 2;
const PAIRS = [['atp', 'totalAtpAdp'], ['nadh', 'totalNad'], ['nadph', 'totalNadp'], ['fadh2', 'totalFad']];
const THREAD_GROW = 0.3, THREAD_LIFE = 1.2;   // s

const Stroma = {
    mols: [],       // { pool, on, x, y, vx, vy, rot, vr, dock }
    queue: [],      // changes with a place since the last update: { pool, d, site?: [x, y], to?: [x, y] }
    threads: [],    // { m, to: [x, y], col, t }
    radicals: [],   // superoxide, one per unit of active ROS: { x, y, vx, vy, rot, a, gone }
    gapY: 0,        // where a thread runs across, between the registers
    _rnd: mulberry(7), _spr: null, _sprKey: '',

    /** Molecules for the current pools, scattered through the band. */
    fill() {
        this.mols = []; this.queue = []; this.threads = []; this.radicals = [];
        for (const [k, tot] of PAIRS) for (let i = 0; i < store[tot]; i++) {
            const m = { pool: k, on: i < store[k], x: 0, y: 0, vx: 0, vy: 0, rot: this._rnd() * TAU, vr: 0, dock: null };
            this._place(m); this.mols.push(m);
        }
    },

    /** The band moved (a new layout or specimen): scatter the molecules again, keeping their forms. */
    relayout() {
        if (this.mols.length !== PAIRS.reduce((a, [, t]) => a + store[t], 0)) { this.fill(); return; }
        for (const m of this.mols) { m.dock = null; this._place(m); }
        this.threads = []; this.queue = [];
    },

    /** Queue a change with a place: site = where it docks, to = the map enzyme a thread runs to. */
    event(pool, d, site, to) {
        if (d && (site || to)) this.queue.push({ pool, d: Math.sign(d), site: site || null, to: to || null });
    },

    update(dt) {
        const B = Membrane.band, s = Membrane.s, r = this._rnd;
        if (!B) return;
        for (const m of this.mols) {
            if (m.dock) {
                const D = m.dock, dx = D.x - m.x, dy = D.y - m.y, d = Math.hypot(dx, dy), v = Math.max(30 * s, d * 4) * dt;
                if (D.phase === 0) { if (d <= v) { m.x = D.x; m.y = D.y; D.phase = 1; D.t = 0; } else { m.x += dx / d * v; m.y += dy / d * v; } }
                else if ((D.t += dt) > 0.18) { m.on = D.to; m.vx = D.ex * 6 * s; m.vy = D.ey * 6 * s; m.dock = null; }
                continue;
            }
            m.vx += (r() - 0.5) * 60 * s * dt; m.vy += (r() - 0.5) * 60 * s * dt; m.vx *= 0.92; m.vy *= 0.92;
            m.vr += (r() - 0.5) * 2.5 * dt; m.vr *= 0.95; m.rot += m.vr * dt;
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
        // Each queued change, in order, moves the molecule nearest its place (a molecule
        // docking counts as what it will leave as); then whatever the store changed
        // without a place is reconciled at random
        for (const ev of this.queue.splice(0)) {
            const near = ev.site || ev.to, d = ev.d;
            let best = null, bd = Infinity;
            for (const m of this.mols) {
                if (m.pool !== ev.pool || m.dock || m.on === (d > 0)) continue;
                const dd = near ? (m.x - near[0]) ** 2 + (m.y - (ev.site ? near[1] : B.y1)) ** 2 * (ev.site ? 1 : 0.2) : r();
                if (dd < bd) { bd = dd; best = m; }
            }
            if (best) this._change(best, d, ev);
        }
        for (const [k] of PAIRS) {
            let on = 0;
            for (const m of this.mols) if (m.pool === k && (m.dock ? m.dock.to : m.on)) on++;
            let diff = store[k] - on;
            for (const m of this.mols) {
                if (!diff) break;
                if (m.pool !== k) continue;
                const now = m.dock ? m.dock.to : m.on;
                if (now === (diff > 0)) continue;
                if (m.dock) m.dock.to = !m.dock.to; else m.on = diff > 0;
                diff += diff > 0 ? -1 : 1;
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
        const s = Membrane.s, spr = this._sprites(res), w = 3.4 * s, h = 2.2 * s;
        for (const m of this.mols) {
            const kind = K.POOL_FORMS[m.pool][m.on ? 0 : 1], im = spr[kind];
            c.save(); c.translate(m.x, m.y); c.rotate(m.rot);
            c.drawImage(im, -1.7 * s, -1.1 * s, w, h);
            c.restore();
        }
    },

    /** Threads: dotted, straight with rounded corners, down from the molecule, across between the registers, down to the enzyme. */
    drawThreads(c) {
        if (!this.threads.length) return;
        c.save(); c.lineWidth = 1; c.setLineDash([1.6, 2.8]); c.lineCap = 'round';   // a 4.4 px period
        for (const t of this.threads) {
            const grow = Math.min(1, t.t / THREAD_GROW), fade = 1 - Math.max(0, (t.t - THREAD_GROW) / (THREAD_LIFE - THREAD_GROW));
            const pts = sPath(t.m.x, t.m.y, t.to[0], t.to[1], this.gapY);
            c.globalAlpha = 0.85 * fade; c.strokeStyle = t.col;
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
            m.on = d > 0;
            if (ev.to) this.threads.push({ m, to: ev.to, col: K.ink(K.MOL[m.pool].ink), t: 0 });
        }
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
