// Map — builds the transit map in world pixels from maplayout.js, decides
// what each segment shows (hidden, switched off, idle, running), hit-tests
// clicks, and advances the trains. Drawing is in mapdraw.js.
import { STATIONS, TRACKS, LOOPS, LINES, GRID, GRID_NARROW, KEY_BOX, LOC_BOX, KC, KW, KH, NARROW_LABEL, NARROW_SIDE, PAIR, offsetPts, rounded, withLengths } from './maplayout.js';
import { flux, segmentState } from './flux.js';
import { segmentLabels, stationLabel, synthesisOnly, cofactorGlyphs } from './mapbind.js';
import { REACTIONS } from './engine/network.js';

/** Segments whose running direction is the engine's reverse (left click runs the line's way). */
export const FLIP = new Set(['adh', 'c6', 'c5', 'c3', 'c2', 'c10', 'p11']);

/** Label anchor offsets from a segment's grid midpoint, or absolute grid points (abs). */
const LABEL_AT = {
    g0: [0, -0.45], g1: [0, -0.45], g2: [0, -0.45], g3: [0, -0.45], g5: [0, -0.45], g6: [0, -0.45], g7: [0, -0.45], g8: [0, -0.45], g9: [0, -0.45],
    c7: [0, -0.42], c0: [-0.2, 0], p10: { abs: [6.35, 1.62], align: 'left' },
    p0: { abs: [2.75, 1.95], align: 'right' }, p1: { abs: [2.75, 0.5] }, p2: { abs: [5.35, 0.42] },
    pdh: [0.2, -0.15], pdc: [0, -0.42], adh: [0, 0.42], ldh: [0.25, 0.1], aldh: [0.2, 0], acs: [0, -0.4], kin: [0.05, 0.55],
    b0: [0, -0.4], b1: [0.22, 0], b2: [0.55, 0.42], b3: [-0.22, 0],
    k1: [0, -0.25],   // on the ring, a nudge along its side: aconitase's name between citrate synthase's and the fatty acid's
};
/** Phone overrides, in the same grid (it is transposed after). */
const NARROW_LABEL_AT = {
    p0: { abs: [2.6, 2.1] }, p1: { abs: [4.3, 1.1] }, b1: [-0.22, 0], b3: [0.22, 0],
    p10: { abs: [6.75, 2.35] }, c7: [0, -0.6], ldh: [-0.4, -0.15], kin: [-0.35, -0.3],
};

export const MapView = {
    G: null,            // { ox, oy, U, rot, us, gap }
    grid: GRID,
    st: {},             // station id → { id, x, y, label, side, kind, count key }
    segs: {},           // segment id → { id, track, line, key, step, label, rev, pts, L, len, from, to, lab:{x,y,align} }
    tracks: {},         // track id → { line, segs: [ids] }
    loops: [],
    phase: {},          // segment id → train phase (px)
    pulse: {},          // segment id → 1 when its enzyme fires, decaying (its connections pulse)
    vis: {},            // segment id → { a: fade 0..1, hidden: bool }
    cof: {},            // segment id → [glyphs running the drawn way, backward], from its main reaction
    cell: null,         // { seg, has, plastid }: the cell the map is drawn for
    bounds: null,
    keyBox: KEY_BOX,    // where the key and the locator sit, grid units
    locBox: LOC_BOX,
    keyRows: [],        // the key's line rows as drawn: [{ line, toggle, box }] (world px), its switches
    keyScreen: null,    // phones: the key under the map instead, { x, y, w } (px)
    pulseOf: null,      // segment id → its enzymes' pulse factor now (main.js), for the pulse marks

    T(x, y) { const G = this.G, R = this.grid; return G.rot ? [G.ox + (y - R.y0) * G.U, G.oy + (x - R.x0) * G.U] : [G.ox + (x - R.x0) * G.U, G.oy + (y - R.y0) * G.U]; },
    Tdir(dx, dy) { return this.G.rot ? [dy, dx] : [dx, dy]; },

    /**
     * Lay the map out in the box (x, y, w, h); rot turns it upright. On wide
     * screens the map fits the cell's own network: a sparse cell (the
     * halophile's) moves the key and the locator into a column at its left
     * when that draws it larger. Returns its height.
     */
    build(x, y, w, h, rot) {
        this._box = [x, y, w, h, rot];
        let GR = rot ? GRID_NARROW : GRID;
        this.keyBox = KEY_BOX; this.locBox = LOC_BOX;
        if (!rot && this.cell) { const f = this._fit(w, h); if (f) { GR = f.grid; this.keyBox = f.key; this.locBox = f.loc; } }
        this.grid = GR;
        const gw = GR.x1 - GR.x0, gh = GR.y1 - GR.y0;
        const U = rot ? w / gh : Math.min(w / gw, h / gh);
        const ox = rot ? x : x + (w - U * gw) / 2, oy = rot ? y : y + Math.max(0, h - U * gh) / 2;
        this.G = { ox, oy, U, rot, us: Math.max(0.55, Math.min(1.25, U / 46)), gap: Math.max(3.5, Math.min(8, U * 0.16)) };
        this.segs = {}; this.tracks = {}; this.st = {};
        for (const [id, def] of Object.entries(TRACKS)) this._track(id, def);
        for (const [id, v] of Object.entries(STATIONS)) {
            const [gx, gy, label, side, kind] = v;
            this.st[id] = { id, gx, gy, pos: this.T(gx, gy), label: (rot && NARROW_LABEL[id]) || label, side: (rot && NARROW_SIDE[id]) || side, kind: kind || 'tick' };
        }
        // Which track and heading each single-line station takes its tick from
        for (const seg of Object.values(this.segs)) for (const [end, idx] of [[seg.from, 0], [seg.to, seg.pts.length - 1]]) {
            const S = this.st[end];
            if (S.kind !== 'tick' || S.seg) continue;
            const a = seg.pts[Math.max(0, idx - 1)], b = seg.pts[Math.min(seg.pts.length - 1, idx + 1)];
            S.seg = seg.id; S.anchor = seg.pts[idx]; S.ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        }
        this.loops = LOOPS.map(l => ({ ...l, pos: this.T(...(rot && l.narrowAt ? l.narrowAt : l.at)), span: l.span ? [this.T(l.span[0], l.at[1] - 0.2), this.T(l.span[1], l.at[1] - 0.2)] : null }));
        for (const id in this.segs) if (!(id in this.phase)) this.phase[id] = 0;
        const c0 = this.T(GR.x0, GR.y0), c1 = this.T(GR.x1, GR.y1);
        this.bounds = { x0: Math.min(c0[0], c1[0]), y0: Math.min(c0[1], c1[1]), x1: Math.max(c0[0], c1[0]), y1: Math.max(c0[1], c1[1]) };
        if (this.cell) this.applyCell(this.cell);
        return this.bounds.y1 - y;
    },

    /** Rebuild in the same box (a new cell: what it has decides the fit). */
    rebuild() { if (this._box) return this.build(...this._box); return 0; },

    /**
     * The fit: the cell's network's extent in grid units (stations with room
     * for their names, loops' names), and the larger of two compositions: the
     * full grid with the key in its lower left and the locator top right, or
     * the network alone with the key and locator in a column at its left.
     */
    _fit(w, h) {
        const has = (id) => (this.cell.seg[id] || []).length > 0;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        const add = (gx, gy, px, py) => { x0 = Math.min(x0, gx - px); x1 = Math.max(x1, gx + px); y0 = Math.min(y0, gy - py); y1 = Math.max(y1, gy + py); };
        let all = true;
        for (const [tid, def] of Object.entries(TRACKS)) for (const [sid, a, b] of def.segs) {
            if (!has(sid)) { all = false; continue; }
            for (const st of [a, b]) add(STATIONS[st][0], STATIONS[st][1], 1.7, 0.8);
            if (def.ring) add(KC[0], KC[1], KW + 1.2, KH + 0.85);
            for (const L of LOOPS) {
                if (L.line !== def.line) continue;
                if (L.span) { add(L.span[0], L.at[1], 0, 0.6); add(L.span[1], L.at[1], 0, 0.6); } else add(L.at[0], L.at[1], 1.1, 0.6);
            }
        }
        if (all || !Number.isFinite(x0)) return null;
        const [kx0, ky0, kx1, ky1] = KEY_BOX, kw = kx1 - kx0, kh = ky1 - ky0;
        const [lx0, ly0, lx1, ly1] = LOC_BOX, lw = lx1 - lx0, lh = ly1 - ly0, gap = 0.6;
        const fullU = Math.min(w / (GRID.x1 - GRID.x0), h / (GRID.y1 - GRID.y0));
        const nw = x1 - x0, nh = Math.max(y1 - y0, kh + lh + gap);
        const colU = Math.min(w / (nw + kw + gap), h / nh);
        if (colU < fullU * 1.08) return null;
        const gx0 = x0 - kw - gap, gy1 = y0 + nh;
        return { grid: { x0: gx0, x1, y0, y1: gy1 }, key: [gx0, gy1 - kh, gx0 + kw, gy1], loc: [gx0 + (kw - lw) / 2, y0, gx0 + (kw + lw) / 2, y0 + lh] };
    },

    /**
     * Name the map for a cell: its segments' enzymes where they differ from
     * the usual (glycogen's, or fatty-acid synthesis's where there is no
     * β-oxidation), its stations' (glycogen or starch at the corridor's head),
     * and each segment's connections from its main reaction's stoichiometry.
     */
    applyCell(cell) {
        this.cell = cell;
        const { seg, has, plastid } = cell, fas = synthesisOnly(has);
        for (const [id, s] of Object.entries(this.segs)) {
            s.label0 ??= s.label; s.rev0 ??= s.rev;
            const L = segmentLabels(id, has);
            s.label = L && L[0] || s.label0; s.rev = L && L[1] || s.rev0;
            if (fas && id[0] === 'b' && s.rev0) s.label = s.rev0;
            const main = (seg[id] || [])[0];
            this.cof[id] = main ? cofactorGlyphs(REACTIONS[main[0]].stoich, Math.sign(main[1])) : null;
        }
        for (const S of Object.values(this.st)) { S.label0 ??= S.label; S.label = stationLabel(S.id, has, plastid) || S.label0; }
    },

    _track(id, def) {
        const G = this.G, line = LINES[def.line];
        const tr = this.tracks[id] = { line: def.line, segs: [] };
        let raw = def.pts.map(q => typeof q === 'string' ? this.T(STATIONS[q][0], STATIONS[q][1]) : this.T(q[0], q[1]));
        if (def.off) {
            if (def.closed) { const u = offsetPts(raw.slice(0, -1), G.gap / 2, true); raw = [...u, u[0]]; }
            else raw = offsetPts(raw, G.gap / 2, false);
        }
        // a line that isn't offset turns inside the ring of an interchange at its corner
        const sharp = def.off ? null : new Set(def.pts.flatMap((q, i) => typeof q === 'string' && STATIONS[q][4] === 'hub' ? [i] : []));
        const pts = rounded(raw, G.U * (def.round ?? 0.42), def.closed, sharp);
        // Segment boundaries: the dense point nearest each end station, searched in order
        let from = 0;
        def.segs.forEach(([sid, a, b, key, step, label, rev], i) => {
            const i0 = from, target = this.T(STATIONS[b][0], STATIONS[b][1]);
            let i1;
            if (i === def.segs.length - 1) i1 = pts.length - 1;
            else { let best = from, bd = 1e9; for (let k = from + 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - target[0], pts[k][1] - target[1]); if (d < bd) { bd = d; best = k; } } i1 = best; }
            from = i1;
            const sp = pts.slice(i0, i1 + 1), sl = withLengths(sp);
            const seg = { id: sid, track: id, line: def.line, ink: line.ink, key, step, label, rev, from: a, to: b, pts: sp, L: sl, len: sl[sl.length - 1] };
            seg.lab = this._labelAt(seg, def.ring);
            this.segs[sid] = seg; tr.segs.push(sid);
        });
    },

    _labelAt(seg, ring) {
        if (!seg.label) return null;
        let gx, gy;
        if (ring) {
            // outside the side the segment runs along, beside its stretch of it
            const A = STATIONS[seg.from], B = STATIONS[seg.to], mx = (A[0] + B[0]) / 2 - KC[0], my = (A[1] + B[1]) / 2 - KC[1];
            if (Math.abs(mx) / KW > Math.abs(my) / KH) { gx = KC[0] + Math.sign(mx) * (KW + 0.42); gy = KC[1] + my; } else { gx = KC[0] + mx; gy = KC[1] + Math.sign(my) * (KH + 0.42); }
            const o = LABEL_AT[seg.id];
            if (o) { gx += o[0]; gy += o[1]; }
        } else {
            const o = (this.G.rot && NARROW_LABEL_AT[seg.id]) || LABEL_AT[seg.id] || [0, -0.4];
            if (o.abs) [gx, gy] = o.abs;
            else { const A = STATIONS[seg.from], B = STATIONS[seg.to]; gx = (A[0] + B[0]) / 2 + o[0]; gy = (A[1] + B[1]) / 2 + o[1]; }
        }
        const p = this.T(gx, gy), mid = seg.pts[Math.floor(seg.pts.length / 2)];
        const dx = p[0] - mid[0], dy = p[1] - mid[1];
        const o = (this.G.rot && NARROW_LABEL_AT[seg.id]) || LABEL_AT[seg.id];
        const align = o && o.align && !this.G.rot ? o.align : Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx > 0 ? 'left' : 'right') : 'center';
        return { x: p[0], y: p[1], align, out: [dx, dy] };
    },

    /**
     * Fade and hidden state per segment: a segment none of whose enzymes the
     * cell has leaves the map; one whose enzymes are switched off fades to a
     * dashed hairline. dt eases the fades (seconds; 0 snaps them).
     */
    updateVis(dt = 0) {
        const k = dt > 0 ? 1 - Math.exp(-dt / 0.25) : 1;
        for (const id in this.segs) {
            const st = segmentState(id), want = st.on ? 1 : 0, v = this.vis[id];
            if (!v) { this.vis[id] = { a: want, hidden: !st.present }; continue; }
            v.hidden = !st.present; v.a += (want - v.a) * k;
        }
        for (const S of Object.values(this.st)) S.hidden = true;
        for (const seg of Object.values(this.segs)) if (!this.vis[seg.id].hidden) { this.st[seg.from].hidden = false; this.st[seg.to].hidden = false; }
    },

    /** Trains move at a speed set by each segment's flux. */
    update(dt) {
        const sp = 42 * this.G.us * dt;
        // mM of carbon per second: a few at full flow
        for (const id in this.segs) this.phase[id] += (flux[id] || 0) * sp * 1.5;
        for (const id in this.pulse) this.pulse[id] = Math.max(0, this.pulse[id] - dt * 1.6);
        for (const L of this.loops) if (L.pulse) L.pulse = Math.max(0, L.pulse - dt * 1.6);
    },

    /** The segment, loop or station under world point (x, y); tol in world px. */
    hitTest(x, y, tol) {
        for (const r of this.keyRows) {
            const b = r.box; if (r.toggle && x > b[0] && x < b[2] && y > b[1] && y < b[3]) return { kind: 'key', row: r };
        }
        for (const L of this.loops) {
            if (L.hidden) continue;
            if (Math.abs(x - L.pos[0]) < L.hw + 4 && Math.abs(y - L.pos[1]) < 11) return { kind: 'loop', loop: L };
        }
        const usable = (id) => { const v = this.vis[id]; return v && !v.hidden && v.a >= 0.35; };
        for (const seg of Object.values(this.segs)) {
            const b = seg.lab && seg.lab.box;
            if (!b || !(x > b[0] && x < b[2] && y > b[1] && y < b[3])) continue;
            if (usable(seg.id)) return { kind: 'seg', seg };
            if (PAIR[seg.id] && usable(PAIR[seg.id])) return { kind: 'seg', seg: this.segs[PAIR[seg.id]] };
        }
        let best = null, bd = tol;
        for (const seg of Object.values(this.segs)) {
            if (!usable(seg.id)) continue;
            const d = distToPolyline(x, y, seg.pts);
            if (d < bd) { bd = d; best = seg; }
        }
        if (best) return { kind: 'seg', seg: best };
        for (const S of Object.values(this.st)) {
            if (S.hidden || !S.box) continue;
            const b = S.box; if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) return { kind: 'station', st: S };
        }
        return null;
    },
};

function distToPolyline(x, y, pts) {
    let best = 1e9;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
        const d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
        if (d < best) best = d;
    }
    return best;
}

