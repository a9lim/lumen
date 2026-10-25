// Membrane — the specimen's cross-section above the map. layout() places the
// membrane and its complexes for the current specimen in world pixels;
// drawStatic() paints everything that doesn't move (frame, lipids, protein
// bodies), which the renderer caches; drawLive() paints the turning rotors
// and the callouts. Positions in nanometres become pixels through `s`.
import { SPECIMENS, WIDTH } from './specimens.js';
import * as K from './complexes.js';
import { drawCallouts } from './plate.js';

const TAU = Math.PI * 2;
const MEM = 5;        // bilayer thickness, nm
const LUMEN = 12;     // lumen width, nm
const BELOW = 21;     // depth reserved on the stroma side, nm

// Vertical frame of each specimen, nm: room above the cut (outer), the lumen
// between a sac's two membranes, or for a single membrane where the cell
// wall or S-layer ends (edge, from the top).
const FRAME = {
    sac: { outer: 6, lumen: 10 },
    granum: { outer: 19.5, lumen: 10 },
    cristae: { outer: 9, lumen: 10.5 },
    wall: { outer: 25, single: true, edge: 13 },
    slayer: { outer: 17, single: true, edge: 4.5 },
};
const GAP = 3;        // lipids between neighbouring complexes, nm
const LIPID = 0.85;   // spacing of lipids along a leaflet, nm

export const Membrane = {
    specId: 'thylakoid', spec: SPECIMENS.thylakoid,
    s: 6, x0: 0, x1: 0, top: 0, mid: 0, memTop: 0, memBot: 0, upperMid: 0, bottom: 0,
    pos: {},          // engine key → { x, y } electron anchor, plus drawing data
    items: [],        // [{ key, x, n }] complexes in order along the straight membrane
    paths: [],        // membrane midlines as point lists (for lipids)
    lumen: null,      // { x0, x1, y0, y1, neck? } where lumen protons live
    callouts: [],     // [{ key, x, y (leader's end), text, w, row, ly (baseline) }]
    hit: [],          // [{ key, x, y, w, h }]
    tip: null,        // cristae: { x, y, r } and the dimer's transforms
    narrow: false,

    layout(specId, x0, x1, top, narrow, budget) {
        const spec = SPECIMENS[specId] || SPECIMENS.thylakoid;
        this.specId = specId; this.spec = spec; this.narrow = narrow;
        this.x0 = x0; this.x1 = x1;
        const F = this.F = FRAME[spec.frame];
        const order = spec.order.filter(k => !(spec.frame === 'cristae' && k === 'atpSyn'));
        let foot = order.reduce((a, k) => a + WIDTH[k], 0) + GAP * (order.length - 1);
        const endL = spec.frame === 'cristae' ? 48 : 6, endR = spec.frame === 'cristae' ? 26 : spec.frame === 'sac' || spec.frame === 'granum' ? 14 : 6;
        const blockNm = F.outer + MEM + (F.single ? 0 : F.lumen + MEM) + BELOW;
        const fs = this.fs = narrow ? 10 : 12, lh = fs + 4;
        const s = this.s = Math.max(2.1, Math.min(narrow ? 3.4 : 7, (x1 - x0) / (foot + endL + endR), (budget - 2 * lh - 8) / blockNm));

        // Complexes along the straight membrane, centred in the space between the ends
        const span = x1 - x0 - (endL + endR) * s, spare = Math.max(0, span - foot * s);
        const extra = order.length > 1 ? Math.min(10 * s, spare / (order.length - 1)) : 0;
        let x = x0 + endL * s + (spare - extra * (order.length - 1)) / 2;
        this.items = []; this.pos = {};
        let nL = 0;
        for (const k of order) {
            const w = WIDTH[k] * s, cx = x + w / 2;
            this.items.push({ key: k, x: cx, n: k === 'lhcii' ? nL++ : 0 });
            if (k !== 'lhcii') this.pos[k] = { x: cx };
            x += w + GAP * s + extra;
        }
        if (this.pos.psi && !this.pos.fd) this.pos.fd = { x: this.pos.psi.x + 12 * s };
        // The callouts' rows, above the cut; their height pushes the frame down
        this.calloutTop = top;
        const rows = this._calloutRows(spec.frame === 'cristae' ? x0 + 30 * s : null);
        top += rows * lh + 8;
        this.top = top;
        if (F.single) { this.mid = top + (F.outer + MEM / 2) * s; this.upperMid = top + F.edge * s; }
        else { this.upperMid = top + (F.outer + MEM / 2) * s; this.mid = this.upperMid + (MEM + F.lumen) * s; }
        this.memTop = this.mid - MEM / 2 * s; this.memBot = this.mid + MEM / 2 * s;
        this.bottom = this.mid + BELOW * s;
        const yOf = { pq: this.mid, pc: this.memTop - 2.6 * s, fd: this.memBot + 2.4 * s, sdh: this.mid + 4 * s, fnr: this.mid + 4.6 * s };
        for (const k in this.pos) this.pos[k].y = yOf[k] ?? this.mid;
        this._frame();
        this._hitsAndLabels();
        this._stroma();
        return this.bottom;
    },

    /**
     * The stroma under the membrane, where the cofactor pools live: its band,
     * the complexes' stromal parts the molecules keep clear of (ellipses
     * [x, y, rx, ry] and rects), and where each membrane reaction takes or
     * hands back a molecule.
     */
    _stroma() {
        const { s, mid, pos, spec } = this, mito = this.specId === 'cristae';
        this.band = { x0: this.x0, x1: this.x1, y0: this.memBot + 1.2 * s, y1: this.bottom - 0.8 * s };
        const av = this.avoid = [], el = (x, y, rx, ry) => av.push([x, y, rx, ry]);
        for (const it of this.items) {
            const x = it.x, k = it.key;
            if (k === 'psii') spec.antenna === 'phycobilisome' ? el(x, mid + 13 * s, 17 * s, 11 * s) : el(x, mid + 3.4 * s, 11 * s, 1.8 * s);
            else if (k === 'ndh1') mito ? el(x + 5.8 * s, mid + 8 * s, 3.9 * s, 7 * s) : el(x + 5.3 * s, mid + 5.4 * s, 3.6 * s, 4 * s);
            else if (k === 'sdh') el(x + 0.4 * s, mid + 5.6 * s, 3.4 * s, 3.6 * s);
            else if (k === 'psi') el(x, mid + 4 * s, 9 * s, 2 * s);
            else if (k === 'fnr') el(x, mid + 4.8 * s, 3.2 * s, 2.8 * s);
            else if (k === 'fd') el(x, mid + 4.9 * s, 2 * s, 2 * s);
            else if (k === 'atpSyn') el(x + 0.8 * s, mid + 11.6 * s, 6.6 * s, 7.4 * s);
            else if (k === 'nnt') el(x, mid + 5 * s, 5 * s, 3.6 * s);
            else if (k === 'cytb6f' && (mito || spec.frame === 'slayer')) el(x, mid + 6 * s, 5.4 * s, 4 * s);
            else if (k === 'cytOx' || k === 'cytb6f') el(x, mid + 3 * s, 4.6 * s, 1.4 * s);
        }
        this.sites = {};
        const head = (d) => [d.x - Math.sin(d.rot) * 12.8 * s, d.y + Math.cos(d.rot) * 12.8 * s];
        if (this.tip) {
            for (const d of this.tip.dimer) { const [hx, hy] = head(d); el(hx, hy, 7 * s, 7 * s); el((hx + d.x) / 2, (hy + d.y) / 2, 3 * s, 3 * s); }
            this.sites.atpSyn = head(this.tip.dimer[0]);
        } else if (pos.atpSyn) this.sites.atpSyn = [pos.atpSyn.x, mid + 12.8 * s];
        if (pos.fnr) this.sites.fnr = [pos.fnr.x, mid + 4.6 * s];
        if (pos.ndh1) this.sites.ndh1 = mito ? [pos.ndh1.x + 6.4 * s, mid + 12.4 * s] : [pos.ndh1.x + 5.8 * s, mid + 7.2 * s];
        if (pos.sdh) this.sites.sdh = [pos.sdh.x + 0.6 * s, mid + 7.4 * s];
        if (pos.nnt) this.sites.nnt = [pos.nnt.x, mid + 7 * s];
        this.avoidRects = (this.discs || []).filter(d => d.y > mid).map(d => [d.x0 - 2 * s, d.y - d.h - 2 * s, d.x1 + 2 * s, d.y + 2 * s]);
    },

    /**
     * Callout rows from the complexes' x positions: each name goes in the
     * lowest row it fits without crowding its left neighbour. tipX places the
     * crista's ATP synthase, which stands at the tip rather than in the row.
     */
    _calloutRows(tipX) {
        const { spec, narrow, fs } = this;
        _mc.font = `italic ${fs}px ${_FONT.text}`;
        const list = [];
        for (const it of this.items) {
            if (it.key === 'lhcii') continue;
            let text = spec.names[it.key];
            if (narrow) text = NARROW[text] || text;
            list.push({ key: it.key, x: it.x, text, w: _mc.measureText(text).width });
        }
        if (tipX !== null) list.push({ key: 'atpSyn', x: tipX, text: narrow ? 'ATP syn.' : spec.names.atpSyn, w: _mc.measureText(spec.names.atpSyn).width });
        list.sort((a, b) => a.x - b.x);
        const ends = [];
        for (const L of list) {
            let row = 0;
            while (ends[row] !== undefined && ends[row] > L.x - L.w / 2 - 8) row++;
            ends[row] = L.x + L.w / 2;
            L.row = row;
        }
        this.callouts = list;
        return Math.max(1, ends.length);
    },

    /** Midline paths, the lumen region and, for cristae, the tip. */
    _frame() {
        const { spec, s, x0, x1, mid, upperMid } = this;
        const pad = 40, line = (a, b, y) => [[a, y], [b, y]];
        this.paths = []; this.tip = null; this.discs = null;
        const R = (mid - upperMid) / 2, cy = (mid + upperMid) / 2;
        if (spec.frame === 'sac' || spec.frame === 'granum') {
            const xr = x1 - 12 * s;
            this.paths.push([...line(x0 - pad, xr, mid), ...arcPts(xr, cy, R, Math.PI / 2, -Math.PI / 2), [x0 - pad, upperMid]]);
            this.lumen = { x0: x0 + 2, x1: xr + R * 0.6, y0: upperMid + MEM / 2 * s, y1: mid - MEM / 2 * s };
            if (spec.frame === 'granum') this._granum(xr);
        } else if (spec.frame === 'cristae') {
            // A crista: the tip on the left, lined with ATP synthase dimers; the
            // junction on the right, where the crista lumen opens toward the boundary membrane
            const xt = x0 + 36 * s, xn = x1 - 14 * s, wn = 9 * s, r = 4 * s, R2 = mid - upperMid;
            this.tip = { x: xt, y: cy, r: R };
            this.paths.push([...arcPts(xt, cy, R, -Math.PI / 2, -3 * Math.PI / 2),
                ...arcPts(xn + wn / 2 - R2, mid - R2, R2, Math.PI / 2, 0), [xn + wn / 2, this.top - pad]]);
            this.paths.push([[xt, upperMid], ...arcPts(xn - wn / 2 - r, upperMid - r, r, Math.PI / 2, 0), [xn - wn / 2, this.top - pad]]);
            this.lumen = { x0: xt - R * 0.5, x1: xn + wn / 2 - MEM / 2 * s, y0: upperMid + MEM / 2 * s, y1: mid - MEM / 2 * s,
                neck: { x0: xn - wn / 2 + MEM / 2 * s, x1: xn + wn / 2 - MEM / 2 * s, y0: this.top } };
            this.tip.dimer = [0.5, -0.5].map(d => { const a = Math.PI + d; return { x: xt + R * Math.cos(a), y: cy + R * Math.sin(a), rot: a - Math.PI / 2 }; });
            const lower = this.tip.dimer[0];
            this.pos.atpSyn = { x: lower.x, y: lower.y, rot: lower.rot };
        } else {
            this.paths.push(line(x0 - pad, x1 + pad, mid));
            this.lumen = { x0: x0 + 2, x1: x1 - 2, y0: upperMid + 2.2 * s, y1: mid - MEM / 2 * s };
        }
    },

    /** Chloroplast: stacked discs above the right end of the sac. */
    _granum(xr) {
        const { s, mid, upperMid, top } = this;
        const gx0 = this.pos.psii ? this.pos.psii.x - 15 * s : xr - 50 * s;
        const h = (MEM + 4.5) * s, gapM = (MEM + 3.6) * s;   // a disc midline to midline; across a partition gap
        this.discs = [];
        const disc = (yLow) => {
            const r = h / 2, cy = yLow - r;
            this.paths.push([[gx0, yLow], [xr, yLow], ...arcPts(xr, cy, r, Math.PI / 2, -Math.PI / 2), [gx0, yLow - h], ...arcPts(gx0, cy, r, -Math.PI / 2, -3 * Math.PI / 2)]);
            this.discs.push({ y: yLow, h, x0: gx0, x1: xr });
        };
        for (let y = upperMid - gapM; y - h > top - 1 * s; y -= h + gapM) disc(y);
        disc(mid + gapM + h);
    },

    _hitsAndLabels() {
        const { s, pos, spec, narrow } = this;
        this.hit = [];
        const box = (key, x, y, w, h) => this.hit.push({ key, x, y, w, h });
        for (const it of this.items) {
            const k = it.key; if (k === 'lhcii') continue;
            const p = pos[k], w = WIDTH[k] * s;
            if (k === 'pq') box(k, p.x, p.y, 6 * s, 5 * s);
            else if (k === 'pc' || k === 'fd') box(k, p.x, p.y, 5 * s, 5 * s);
            else if (k === 'fnr') box(k, p.x, p.y, 7 * s, 6 * s);
            else if (k === 'sdh') box(k, p.x, this.mid + 3 * s, w + 2 * s, 12 * s);
            else box(k, p.x, this.mid + 2 * s, w, 12 * s);
        }
        if (this.tip) for (const d of this.tip.dimer) box('atpSyn', d.x, d.y, 12 * s, 12 * s);
        else if (pos.atpSyn) box('atpSyn', pos.atpSyn.x, this.mid + 8 * s, 11 * s, 22 * s);
        // Callouts: rows above the cut, leaders down to each complex's lumenal top
        const lh = this.fs + 4, rows = Math.max(...this.callouts.map(L => L.row)) + 1;
        for (const L of this.callouts) {
            L.ly = this.calloutTop + this.fs + (rows - 1 - L.row) * lh;
            if (L.key === 'atpSyn' && this.tip) { const d = this.tip.dimer[1]; L.x = d.x + 2 * s; L.y = d.y - 6 * s; }
            else L.y = this.mid + ((spec.frame === 'cristae' || spec.frame === 'slayer') && L.key === 'cytb6f' ? -4.6 : TOP_NM[L.key] ?? -3) * s;
            if (L.key === 'psi' && !spec.psiTrimer) L.x += 4 * s;
            box(L.key, L.x, L.ly - this.fs * 0.35, L.w + 6, this.fs + 6);
        }
    },

    /**
     * Everything that doesn't move; zoom decides how much of the bilayer's
     * detail to paint, and damage (0..1) what share of its lipids is drawn
     * peroxidised.
     */
    drawStatic(c, zoom = 1, damage = 0) {
        const { spec, s } = this, detail = s * zoom >= 9, mito = this.specId === 'cristae';
        if (spec.frame === 'wall') this._wall(c);
        if (spec.frame === 'slayer') this._slayer(c, true);
        this.paths.forEach((path, i) => drawLipids(c, path, s, spec.lipid, spec.frame === 'granum' && i > 0, detail, i, this.tip, damage));
        if (spec.frame === 'slayer') this._slayer(c, false);
        if (this.discs) this._discProteins(c);
        const at = (x, y, f, rot) => { c.save(); c.translate(x, y); if (rot) c.rotate(rot); f(); c.restore(); };
        for (const it of this.items) {
            const k = it.key, x = it.x, y = this.mid;
            switch (k) {
                case 'psii': at(x, y, () => { if (spec.antenna === 'phycobilisome') K.phycobilisome(c, s); K.psii(c, s); }); break;
                case 'lhcii': at(x, y, () => K.lhcii(c, s, it.n)); break;
                case 'ndh1': at(x, y, () => K.ndh1(c, s, mito)); break;
                case 'sdh': at(x, y, () => K.sdh(c, s)); break;
                // The thylakoid's b₆f; the crista's and the archaeon's cytochrome bc
                case 'cytb6f': at(x, y, () => K.b6f(c, s, spec.frame === 'cristae' || spec.frame === 'slayer')); break;
                case 'cytOx': at(x, y, () => K.cytOx(c, s)); break;
                case 'psi': at(x, y, () => K.psi(c, s, spec.psiTrimer)); break;
                case 'fnr': at(x, y, () => K.fnr(c, s)); break;
                case 'nnt': at(x, y, () => K.nnt(c, s)); break;
                case 'ucp': at(x, y, () => K.ucp(c, s)); break;
                case 'br': at(x, y, () => K.brPatch(c, s, 5)); break;
                case 'atpSyn': at(x, y, () => K.atpStator(c, s)); break;
            }
        }
        if (this.tip) for (const d of this.tip.dimer) at(d.x, d.y, () => K.atpStator(c, s), d.rot);
    },

    /** ATP synthase's rotor and head, every frame: the rotor turns, the head's β subunits step with it. */
    drawLive(c, phase) {
        const { s } = this, third = phase / (TAU / 3), step = Math.floor(third + 1e-6), f = third - step;
        const one = (x, y, rot) => { c.save(); c.translate(x, y); if (rot) c.rotate(rot); K.atpRotor(c, s, phase); K.atpHead(c, s, step, f); c.restore(); };
        if (this.tip) for (const d of this.tip.dimer) one(d.x, d.y, d.rot);
        else if (this.pos.atpSyn) one(this.pos.atpSyn.x, this.mid, 0);
    },

    drawLabels(c, hoverKey) {
        drawCallouts(c, this.callouts, this.fs, hoverKey);
        // The lumen's name, in its far end where no complex stands
        const L = this.lumen, sd = this.spec.sides, fs = this.fs;
        c.save(); c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = K.P.muted; c.textBaseline = 'middle';
        if (this.spec.frame === 'sac' || this.spec.frame === 'granum') {
            const R = (this.mid - this.upperMid) / 2;
            c.textAlign = 'center'; c.fillText(this.narrow ? 'lumen' : sd.lumen.replace('thylakoid ', ''), this.x1 - 12 * this.s + R * 0.1, (L.y0 + L.y1) / 2);
        } else if (this.spec.frame === 'cristae') {
            c.textAlign = 'left'; c.fillText(sd.lumen, this.tip.x + this.tip.r * 0.2, (L.y0 + L.y1) / 2);
        } else {
            c.textAlign = 'right'; c.fillText(sd.lumen, this.x1 - 4, (L.y0 + L.y1) / 2);
        }
        c.restore();
    },

    _wall(c) {
        // A Gram-positive wall: glycan strands, wavy, joined by short peptide bridges, and
        // lipoteichoic acids anchored in the membrane's outer leaflet, threading up through it
        const { s, x0, x1, top, upperMid, memTop } = this, u = K.ink('umber');
        const strand = K.mix(u, K.P.canvas, K.P.dark ? 0.35 : 0.5), bridge = K.mix(u, K.P.canvas, K.P.dark ? 0.55 : 0.68);
        const rows = [];
        for (let y = top + 1 * s; y < upperMid; y += 1.7 * s) rows.push(y);
        c.lineCap = 'round'; c.lineWidth = Math.max(0.7, 0.16 * s);
        c.strokeStyle = bridge; c.beginPath();
        rows.forEach((y, r) => { if (r + 1 < rows.length) for (let x = x0 + (r % 2 ? 1.3 : 0.2) * s; x < x1; x += 2.6 * s) { c.moveTo(x, y + 0.2 * s); c.lineTo(x + 0.3 * s, rows[r + 1] - 0.2 * s); } });
        c.stroke();
        c.strokeStyle = strand; c.lineWidth = Math.max(0.9, 0.24 * s); c.beginPath();
        rows.forEach((y, r) => { for (let x = x0; x <= x1; x += 0.5 * s) { const yy = y + Math.sin(x / s * 0.9 + r * 1.7) * 0.22 * s; x === x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); } });
        c.stroke();
        const lta = K.tones(K.ink('ochre'));
        for (let x = x0 + 5 * s, i = 0; x < x1; x += 9.5 * s, i++) {
            c.strokeStyle = lta.seam; c.lineWidth = Math.max(0.7, 0.14 * s); c.beginPath(); c.moveTo(x, memTop + 0.4 * s);
            const pts = [];
            for (let y = memTop - 0.8 * s, k = 0; y > top + 3 * s; y -= 0.9 * s, k++) { const px = x + Math.sin(k * 0.9 + i) * 0.5 * s; c.lineTo(px, y); pts.push([px, y]); }
            c.stroke();
            for (const [px, py] of pts) { c.beginPath(); c.arc(px, py, 0.26 * s, 0, TAU); c.fillStyle = lta.t[2]; c.fill(); c.lineWidth = Math.max(0.4, 0.07 * s); c.strokeStyle = lta.line; c.stroke(); }
        }
    },

    _slayer(c, stalks) {
        // The S-layer: a crystalline canopy of glycoprotein over the membrane, its units abutting
        // in a lattice (the seams between them are its pores), each on a pillar anchored in the membrane
        const { s, x0, x1, upperMid, memTop } = this, u = K.ink('umber');
        for (let x = x0 + 7 * s, i = 0; x < x1 + 8 * s; x += 15 * s, i++) {
            if (stalks) K.assembly(c, s, [[x / s, (upperMid + memTop) / 2 / s, 0.55, (memTop - upperMid) / 2 / s + 0.3, 0, 1]], u, 40 + i);
            else K.assembly(c, s, [[x / s - 4.6, upperMid / s - 0.1, 4.4, 1.25, -3, 0], [x / s + 4.6, upperMid / s - 0.1, 4.4, 1.25, 3, 2], [x / s, upperMid / s + 0.3, 2.2, 1.5, 0, 1]], K.mix(u, K.P.canvas, 0.15), 50 + i);
        }
    },

    _discProteins(c) {
        // Appressed granum membranes are crowded with photosystem II dimers, each flanked by LHCII trimers
        const { s } = this;
        c.save(); c.globalAlpha = 0.85;
        for (const d of this.discs) for (const y of [d.y, d.y - d.h]) {
            const flip = y === d.y ? 1 : -1;
            for (let x = d.x0 + 8 * s, i = 0; x < d.x1 - 6 * s; i++) {
                c.save(); c.translate(x, y); c.scale(1, flip);
                if (i % 3 === 0) { K.assembly(c, s, [[-3.1, 0, 1.9, 2.6, 0, 0], [-0.9, 0, 1.3, 2.6, 0, 1], [0.9, 0, 1.3, 2.6, 0, 2], [3.1, 0, 1.9, 2.6, 0, 0]], K.ink('sap'), 60 + i); x += 11 * s; }
                else { K.lhcii(c, s, i); x += 8.2 * s; }
                c.restore();
            }
        }
        c.restore();
    },
};

function arcPts(cx, cy, r, a0, a1) {
    const pts = [], n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / 3));
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
}

// Where each callout's leader ends: the complex's lumenal top (or, for Fd and FNR, its stromal top), nm from the midline
const TOP_NM = { psii: -5.6, ndh1: -2.6, sdh: -2.6, pq: -0.4, cytb6f: -6.6, pc: -6.2, cytOx: -5.0, psi: -3.0, fd: 3.6, fnr: 2.6, atpSyn: -2.4, nnt: -2.6, ucp: -2.8, br: -2.5 };
const _mc = document.createElement('canvas').getContext('2d');

const NARROW = { 'ATP synthase': 'ATP syn.', 'cyt oxidase': 'cyt ox.', 'bacteriorhodopsin': 'BR', 'complex I': 'I', 'complex II': 'II', 'complex III': 'III', 'complex IV': 'IV', 'halocyanin': 'HC' };

/**
 * Lipids along a midline, in Goodsell's manner: a pale band for the tails and
 * a row of heads on each face, in a warm neutral (ochre is the quinones' and
 * the light's). Tails are drawn one by one only when zoomed in (detail). Each
 * membrane carries its signature lipids: in a thylakoid, sugar-ring heads
 * (MGDG one ring, DGDG two, the sulfolipid SQDG a ring with its sulfonate);
 * in the crista, cardiolipin (a double head over four tails), gathered where
 * the tip curves; in the archaeon, ether lipids whose tails branch. A share
 * `damage` of them is peroxidised, the damage ROS does: a tail kinked at its
 * peroxide and a darkened head, drawn at any zoom, so cell health reads in
 * the bilayer itself.
 */
function drawLipids(c, path, s, kind, faint, detail, seed, tip, damage = 0) {
    const u = K.ink('umber'), d = K.P.dark;
    const band = K.mix(u, K.P.canvas, d ? 0.82 : 0.87), headC = K.mix(u, K.P.canvas, d ? 0.42 : 0.58), rim = K.mix(u, K.P.canvas, d ? 0.12 : 0.18), tailC = K.mix(u, K.P.canvas, d ? 0.5 : 0.52);
    const cl = K.tones(K.ink('sienna')), sq = K.tones(K.ink('ochre'));
    const step = LIPID * s, off = (MEM / 2 - 0.42) * s, rH = 0.4 * s;
    const pts = [];
    let carry = 0;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
        if (!L) continue;
        const nx = -dy / L, ny = dx / L;
        for (let dd = carry; dd < L; dd += step) pts.push([a[0] + dx * dd / L, a[1] + dy * dd / L, nx, ny]);
        carry = (carry - L) % step; if (carry < 0) carry += step;
    }
    if (pts.length < 2) return;
    // Which lipid sits at each head: a fixed hash, so the cache repaints the same membrane
    const hash = (i, sg) => { let h = (i * 374761393 + (sg + 2) * 668265263 + seed * 2246822519) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
    const sort = (i, sg, x, y) => {
        const r = hash(i, sg);
        if (kind === 'galacto') return r < 0.5 ? 'mgdg' : r < 0.8 ? 'dgdg' : r < 0.9 ? 'sqdg' : 'pg';
        if (kind === 'ester' && tip) { const near = Math.hypot(x - tip.x, y - tip.y) < tip.r * 2.2; return r < (near ? 0.45 : 0.1) ? 'cl' : 'pl'; }
        return 'pl';
    };
    c.save(); if (faint) c.globalAlpha = 0.55;
    c.beginPath();
    pts.forEach(([x, y, nx, ny], i) => { const k = off - rH * 0.4; i ? c.lineTo(x - nx * k, y - ny * k) : c.moveTo(x - nx * k, y - ny * k); });
    for (let i = pts.length - 1; i >= 0; i--) { const [x, y, nx, ny] = pts[i], k = off - rH * 0.4; c.lineTo(x + nx * k, y + ny * k); }
    c.closePath(); c.fillStyle = band; c.fill();
    if (detail) {
        c.strokeStyle = tailC; c.lineWidth = Math.max(0.5, 0.1 * s); c.lineCap = 'round'; c.beginPath();
        pts.forEach(([x, y, nx, ny], i) => {
            for (const sg of [-1, 1]) {
                const hx = x + nx * off * sg, hy = y + ny * off * sg, n = sort(i, sg, x, y) === 'cl' ? [-0.3, -0.1, 0.1, 0.3] : [-0.2, 0.2];
                for (const t of n) {
                    const tx = -ny * t * s, ty = nx * t * s, ex = x + nx * 0.2 * s * sg + tx, ey = y + ny * 0.2 * s * sg + ty;
                    c.moveTo(hx + tx - nx * rH * sg, hy + ty - ny * rH * sg); c.lineTo(ex, ey);
                    if (kind === 'ether') for (const f of [0.35, 0.65]) { const bx = hx + (ex - hx) * f, by = hy + (ey - hy) * f; c.moveTo(bx, by); c.lineTo(bx + Math.sign(t) * -ny * 0.32 * s, by + Math.sign(t) * nx * 0.32 * s); }
                }
            }
        });
        c.stroke();
    }
    // Peroxidised lipids: one tail straight, the other kinked out at its peroxide
    const bad = (i, sg) => damage > 0 && hash(i + 7919, sg) < damage;
    if (damage > 0) {
        c.strokeStyle = d ? K.mix(K.ink('sienna'), '#000000', 0.1) : K.mix(K.ink('sienna'), '#1a1410', 0.25);
        c.lineWidth = Math.max(0.8, 0.15 * s); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
        pts.forEach(([x, y, nx, ny], i) => {
            for (const sg of [-1, 1]) {
                if (!bad(i, sg)) continue;
                const hx = x + nx * off * sg, hy = y + ny * off * sg;
                for (const t of [-0.2, 0.2]) {
                    const tx = -ny * t * s, ty = nx * t * s, ex = x + nx * 0.2 * s * sg + tx, ey = y + ny * 0.2 * s * sg + ty;
                    c.moveTo(hx + tx - nx * rH * sg, hy + ty - ny * rH * sg);
                    if (t > 0) c.lineTo(hx + (ex - hx) * 0.45 + tx * 3, hy + (ey - hy) * 0.45 + ty * 3);
                    c.lineTo(ex, ey);
                }
            }
        });
        c.stroke();
    }
    // Heads, by kind
    const ring = (hx, hy, r) => { c.moveTo(hx + r, hy); for (let k = 1; k <= 6; k++) { const a = k / 6 * TAU; c.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); } };
    const extra = [];
    c.beginPath();
    pts.forEach(([x, y, nx, ny], i) => {
        for (const sg of [-1, 1]) {
            const hx = x + nx * off * sg, hy = y + ny * off * sg, k = sort(i, sg, x, y);
            if (k === 'mgdg' || k === 'dgdg' || k === 'sqdg') {
                ring(hx, hy, rH * 1.1);
                if (k === 'dgdg') ring(hx + nx * sg * rH * 1.9, hy + ny * sg * rH * 1.9, rH * 0.95);
                if (k === 'sqdg') extra.push([hx + nx * sg * rH * 1.5, hy + ny * sg * rH * 1.5, 'sq']);
            } else if (k === 'cl') extra.push([hx, hy, 'cl', nx, ny]);
            else { c.moveTo(hx + rH, hy); c.arc(hx, hy, rH, 0, TAU); }
        }
    });
    c.fillStyle = headC; c.fill(); c.lineWidth = Math.max(0.35, 0.07 * s); c.strokeStyle = rim; c.stroke();
    if (damage > 0) {
        c.beginPath();
        pts.forEach(([x, y, nx, ny], i) => { for (const sg of [-1, 1]) if (bad(i, sg)) { const hx = x + nx * off * sg, hy = y + ny * off * sg; c.moveTo(hx + rH, hy); c.arc(hx, hy, rH, 0, TAU); } });
        c.fillStyle = K.mix(K.ink('sienna'), K.P.canvas, d ? 0.25 : 0.4); c.fill(); c.strokeStyle = cl.line; c.stroke();
    }
    for (const [hx, hy, k, nx, ny] of extra) {
        c.beginPath();
        if (k === 'sq') { c.arc(hx, hy, rH * 0.5, 0, TAU); c.fillStyle = sq.t[1]; c.fill(); c.strokeStyle = sq.line; c.stroke(); }
        else { for (const t of [-0.32, 0.32]) { const px = hx - ny * t * s, py = hy + nx * t * s; c.moveTo(px + rH * 0.85, py); c.arc(px, py, rH * 0.85, 0, TAU); } c.fillStyle = cl.t[2]; c.fill(); c.strokeStyle = cl.line; c.stroke(); }
    }
    c.restore();
}
