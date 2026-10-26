// Map drawing — the transit map in the manner of Beck: one ink per line,
// ticks for single stations, rings and capsules for interchanges. Line
// weight and train speed read flux; trains are chevrons cut out of the line,
// pointing the way carbon runs, so a still frame still shows direction.
// Switched-off lines are dashed hairlines; an enzyme its regulation blocks
// carries a buffer bar across the track.
import { MapView, FLIP } from './map.js';
import { LINES, CO2, KC, PAIR, COF, parseCof } from './maplayout.js';
import { flux, RUNNING, segmentGate, segmentMain, cellHas } from './flux.js';
import { REACTIONS } from './engine/network.js';
import { cofactorGlyphs } from './mapbind.js';
import { store, simState } from './state.js';
import { SPECIMENS } from './specimens.js';
import { synthesisOnly } from './mapbind.js';
import * as K from './complexes.js';

const TAU = Math.PI * 2;
const FREF = 3;      // mM of carbon per second drawn at full weight
const FINK = 0.8;   // mM of carbon per second drawn at full ink

/** An idle line is 2 px at two-thirds ink, so the network reads when quiet; flux thickens it to full ink. */
const weight = (f, us) => { const w0 = Math.max(1.6, 2 * us); return w0 + (6.2 * us - w0) * Math.pow(Math.min(1, Math.abs(f) / FREF), 0.7); };
function idleInk(base) { return K.mix(base, K.P.canvas, K.P.dark ? 0.2 : 0.34); }
function inkOf(seg, f) {
    const base = K.ink(seg.ink);
    return K.mix(idleInk(base), base, Math.min(1, Math.abs(f) / FINK));
}
function trace(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); }

/** The map's lines: zones, CO₂ spurs, switched-off and running lines, trains. Its names come after the threads (drawMapText). */
export function drawMapLines(c, hover, dt) {
    const M = MapView, G = M.G, us = G.us, P = K.P;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const segs = Object.values(M.segs).filter(s => !M.vis[s.id].hidden);
    const spec = SPECIMENS[simState.specimen];
    _fixed = [];
    if (spec && spec.zones) drawZones(c, us);
    // CO₂ spurs, only while their enzyme carries flux
    c.font = `italic ${Math.max(10, 11.5 * us)}px ${_FONT.text}`;
    for (const [id, a0, b0, a1, b1] of CO2) {
        const f = Math.abs(flux[id] || 0), v = M.vis[id];
        if (f < 2 * RUNNING || !v || v.hidden) continue;
        const a = M.G.rot && a1 ? a1 : a0, b = M.G.rot && b1 ? b1 : b0;
        const A = M.T(...a), B = M.T(...b), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
        c.globalAlpha = Math.min(1, f * 1.3) * v.a;
        c.strokeStyle = K.rgba(P.text, 0.45); c.lineWidth = 1; c.setLineDash([2.5, 2.5]);
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); c.setLineDash([]);
        c.fillStyle = P.muted;
        c.textAlign = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : 'center';
        c.textBaseline = Math.abs(dx) > Math.abs(dy) ? 'middle' : (dy > 0 ? 'top' : 'alphabetic');
        c.fillText('CO₂', B[0] + dx / L * 3, B[1] + dy / L * 3);
        _fixed.push([B[0] - 14, B[1] - 9, B[0] + 22, B[1] + 9]);
    }
    c.globalAlpha = 1;
    // Switched-off lines: dashed hairlines
    c.setLineDash([3, 3.5]); c.lineWidth = 1;
    for (const s of segs) {
        const a = M.vis[s.id].a;
        if (a > 0.98) continue;
        c.globalAlpha = 1 - a; c.strokeStyle = K.mix(K.ink(s.ink), P.canvas, 0.35);
        trace(c, s.pts); c.stroke();
    }
    c.setLineDash([]);
    // Running lines, the busiest on top
    const live = segs.filter(s => M.vis[s.id].a > 0.02).sort((a, b) => Math.abs(flux[a.id] || 0) - Math.abs(flux[b.id] || 0));
    for (const s of live) {
        const f = flux[s.id] || 0;
        c.globalAlpha = M.vis[s.id].a;
        c.strokeStyle = hover === s ? K.ink(s.ink) : inkOf(s, f); c.lineWidth = weight(f, us);
        trace(c, s.pts); c.stroke();
    }
    // Trains: chevrons in the ground colour, spaced along each line
    c.strokeStyle = P.canvas; c.lineCap = 'butt';
    for (const s of live) {
        const f = flux[s.id] || 0;
        if (Math.abs(f) < RUNNING || s.len < 6) continue;
        const w = weight(f, us), gapPx = 34 * us, n = Math.max(1, Math.round(s.len / gapPx)), step = s.len / n;
        const dir = f > 0 ? 1 : -1, h = Math.max(1.1, w / 2 - 0.4), d = Math.min(h * 0.9, 3.2 * us);
        c.globalAlpha = M.vis[s.id].a * Math.min(1, Math.abs(f) * 1.7); c.lineWidth = Math.max(1, 0.32 * w);
        for (let i = 0; i < n; i++) {
            let v = ((M.phase[s.id] + i * step) % s.len + s.len) % s.len;
            if (v < 4 || v > s.len - 4) continue;
            const [x, y, ang] = at(s, v), cs = Math.cos(ang), sn = Math.sin(ang);
            const tx = cs * dir, ty = sn * dir, nx = -sn, ny = cs;
            c.beginPath();
            c.moveTo(x - tx * d + nx * h, y - ty * d + ny * h); c.lineTo(x, y); c.lineTo(x - tx * d - nx * h, y - ty * d - ny * h);
            c.stroke();
        }
    }
    c.globalAlpha = 1; c.lineCap = 'round';
    _live = live;
}

let _live = [], _fixed = [];   // the lines pass's running segments, and the names it drew (the zone's, CO₂'s)

/**
 * The map's names, placed so they don't collide: stations first, then the
 * loops' names, the enzymes' names (each tries its side of the track, the
 * other side, then a little along it) and the gates, then the key.
 */
export function drawMapText(c, hover) {
    const M = MapView, us = M.G.us, boxes = [..._fixed];
    c.lineCap = 'round'; c.lineJoin = 'round';
    drawStations(c, us, boxes);
    drawLoops(c, us, hover, boxes);
    drawLabels(c, hover, us, boxes);
    // Gates: where a pool slows or stops an enzyme in the direction it runs, the pool's glyph stands
    // across the track from the name, with ⊣ (inhibits), → (needed) or ⊕ (activates); dashed while
    // the enzyme is only slowed, solid with a buffer bar across the track once it is stopped
    M.gates = 0;
    for (const s of _live) {
        if (!s.label || M.vis[s.id].a < 0.5) continue;
        const g = segmentGate(s.id);
        if (g) { drawGate(c, s, g, us, boxes); M.gates++; }
    }
    drawKey(c, us, hover);
}

/**
 * Fare zones: where the specimen keeps part of its network in a compartment of
 * its own (the animal cell's mitochondrial matrix), the zone is shaded and its
 * boundary drawn as a bilayer in miniature, crossed where pyruvate and
 * acetate enter. Its name sits on the boundary.
 */
function drawZones(c, us) {
    const M = MapView, P = K.P, a = M.T(13.25, 4.5), b = M.T(24.5, 10.45);
    const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]), r = M.G.U * 0.6;
    const u = K.ink('umber'), band = K.mix(u, P.canvas, P.dark ? 0.8 : 0.86), head = K.mix(u, P.canvas, P.dark ? 0.42 : 0.58), gap = 2.4;
    c.save();
    c.beginPath(); c.roundRect(x0, y0, x1 - x0, y1 - y0, r); c.fillStyle = P.panel; c.fill();
    c.strokeStyle = band; c.lineWidth = gap * 2; c.stroke();
    c.setLineDash([1.6, 1.9]); c.lineCap = 'round'; c.strokeStyle = head; c.lineWidth = 2.2;
    for (const d of [-gap, gap]) { c.beginPath(); c.roundRect(x0 - d, y0 - d, x1 - x0 + 2 * d, y1 - y0 + 2 * d, r + d); c.stroke(); }
    c.setLineDash([]);
    const fs = Math.max(10.5, 13 * us), name = 'mitochondrial matrix';
    c.font = `italic ${fs}px ${_FONT.text}`; c.textAlign = 'left'; c.textBaseline = 'middle';
    // on the boundary's quiet stretch: the top right, past acetate's crossing (on phones the right edge, near the bottom)
    const w = c.measureText(name).width, [lx, ly] = M.G.rot ? [x1 - w - 12, y1 - r - fs] : [x1 - r - w - 14, y0];
    c.fillStyle = P.canvas; c.fillRect(lx, ly - fs * 0.7, w + 12, fs * 1.4);
    c.fillStyle = P.muted; c.fillText(name, lx + 6, ly);
    _fixed.push([lx, ly - fs * 0.7, lx + w + 12, ly + fs * 0.7]);
    c.restore();
}

function drawGate(c, s, g, us, boxes) {
    const P = K.P, fs = Math.max(10, 11.5 * us), gs = fs * 0.46;
    const w = weight(flux[s.id] || 0, us), d0 = w / 2 + 2.5, d1 = d0 + fs * 0.95;
    // across the track from the label; where that is taken, along the track or on the label's side
    const [ox0, oy0] = s.lab.side || s.lab.out, place = [];
    for (const along of [0.5, 0.3, 0.7]) for (const flip of [false, true]) place.push([along, flip]);
    let geo = null;
    for (const [along, flip] of place) {
        const [mx, my, ang] = at(s, s.len * along), nx = -Math.sin(ang), ny = Math.cos(ang);
        const side = (ox0 * nx + oy0 * ny > 0 ? -1 : 1) * (flip ? -1 : 1), ux = nx * side, uy = ny * side;
        const bx = mx + ux * d1, by = my + uy * d1, r = fs * 0.75;
        const cx = bx + ux * fs * 0.55, cy = by + uy * fs * 0.55;
        const box = [Math.min(mx + ux * d0, cx) - r, Math.min(my + uy * d0, cy) - r, Math.max(mx + ux * d0, cx) + r, Math.max(my + uy * d0, cy) + r];
        if (!overlaps(box, boxes)) { geo = { mx, my, nx, ny, ux, uy, box }; break; }
    }
    // Nowhere clear by the track (a crowded junction): the gate follows the enzyme's name on its line instead
    if (!geo && s.lab.box) { drawGateInline(c, s, g, fs, boxes); return; }
    if (!geo) return;
    boxes.push(geo.box);
    const { mx, my, nx, ny, ux, uy } = geo;
    const ax = mx + ux * d0, ay = my + uy * d0, bx = mx + ux * d1, by = my + uy * d1, px = -uy, py = ux;
    const strength = g.factor === 0 ? 1 : g.how === '⊕' ? 0.8 : 1 - g.factor;
    c.save(); c.globalAlpha = 0.45 + 0.55 * strength; c.strokeStyle = P.text; c.lineWidth = 1.2; c.lineCap = 'butt';
    if (g.factor > 0 && g.how !== '⊕') c.setLineDash([2, 1.6]);
    c.beginPath(); c.moveTo(bx, by); c.lineTo(ax, ay); c.stroke(); c.setLineDash([]);
    if (g.how === '⊣') { c.lineWidth = 1.6; c.beginPath(); c.moveTo(ax + px * 4, ay + py * 4); c.lineTo(ax - px * 4, ay - py * 4); c.stroke(); }
    else if (g.how === '→') { c.beginPath(); c.moveTo(ax + ux * 4 + px * 3, ay + uy * 4 + py * 3); c.lineTo(ax, ay); c.lineTo(ax + ux * 4 - px * 3, ay + uy * 4 - py * 3); c.stroke(); }
    else { c.beginPath(); c.arc(ax + ux * 3, ay + uy * 3, 3, 0, TAU); c.moveTo(ax + ux * 3 + px * 1.8, ay + uy * 3 + py * 1.8); c.lineTo(ax + ux * 3 - px * 1.8, ay + uy * 3 - py * 1.8); c.stroke(); }
    // the effector: a pool's glyph, or its name in small italic (light, Δp, a metabolite)
    if (g.eff) K.molGlyph(c, bx + ux * gs * 1.3, by + uy * gs * 1.3, gs, g.eff);
    else {
        c.font = `italic ${fs * 0.86}px ${_FONT.text}`; c.fillStyle = P.text2; c.textBaseline = 'middle';
        c.textAlign = Math.abs(ux) > Math.abs(uy) ? (ux > 0 ? 'left' : 'right') : 'center';
        c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = P.canvas;
        c.strokeText(g.word, bx + ux * 2, by + uy * (fs * 0.6)); c.fillText(g.word, bx + ux * 2, by + uy * (fs * 0.6));
    }
    c.restore();
    if (g.factor === 0) {
        // the buffer bar, across the track
        const h = w / 2 + 4.5 * us;
        c.strokeStyle = P.text; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(mx + nx * h, my + ny * h); c.lineTo(mx - nx * h, my - ny * h); c.stroke();
    }
}

/** A gate set after its enzyme's name and connections: the mark, then the effector. */
function drawGateInline(c, s, g, fs, boxes) {
    const P = K.P, b = s.lab.box, x = b[2] + 4, y = (b[1] + b[3]) / 2, gs = fs * 0.46;
    const strength = g.factor === 0 ? 1 : g.how === '⊕' ? 0.8 : 1 - g.factor;
    c.save(); c.globalAlpha = 0.45 + 0.55 * strength;
    c.font = `${fs}px ${_FONT.text}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = P.text;
    c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = P.canvas;
    c.strokeText(g.how, x, y); c.fillText(g.how, x, y);
    let w = c.measureText(g.how).width + 3;
    if (g.eff) { K.molGlyph(c, x + w + gs * 1.3, y, gs, g.eff); w += gs * 2.8; }
    else { c.font = `italic ${fs * 0.86}px ${_FONT.text}`; c.fillStyle = P.text2; c.strokeText(g.word, x + w, y); c.fillText(g.word, x + w, y); w += c.measureText(g.word).width; }
    c.restore();
    boxes.push([x - 2, b[1], x + w + 2, b[3]]);
}

/** Whether box [x0, y0, x1, y1] overlaps any in the list. */
function overlaps(b, list) {
    for (const o of list) if (o && b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return true;
    return false;
}

function at(s, v) {
    const { pts, L } = s; let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= v) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], t = (v - L[lo]) / ((L[hi] - L[lo]) || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
}

function sideDir(S, side = S.side) {
    let v;
    if (side === 'in') { const c0 = MapView.T(...KC); v = [c0[0] - S.pos[0], c0[1] - S.pos[1]]; }
    else v = MapView.Tdir(...({ t: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0], tr: [0.6, -0.8], tl: [-0.7, -0.7], br: [0.7, 0.7], bl: [-0.7, 0.7] })[side]);
    const L = Math.hypot(v[0], v[1]) || 1;
    return [v[0] / L, v[1] / L];
}

function drawStations(c, us, boxes) {
    const M = MapView, P = K.P, sw = Math.max(1.3, 1.7 * us), rr = Math.max(3.4, 5 * us);
    for (const S of Object.values(M.st)) {
        if (S.hidden) continue;
        const [x, y] = S.pos;
        if (S.kind === 'corr') {
            c.save(); c.translate(x, y); c.rotate(M.G.rot ? 0 : Math.PI / 2);
            const len = M.G.gap + 2 * rr;
            c.beginPath(); c.roundRect(-len / 2, -rr, len, 2 * rr, rr); c.fillStyle = P.canvas; c.fill(); c.lineWidth = sw; c.strokeStyle = P.text; c.stroke();
            c.restore();
        } else if (S.kind === 'hub') {
            boxes.push([x - rr, y - rr, x + rr, y + rr]);
            c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fillStyle = P.canvas; c.fill(); c.lineWidth = sw; c.strokeStyle = P.text; c.stroke();
        } else if (S.anchor) {
            const seg = M.segs[S.seg], f = flux[S.seg] || 0, w = weight(f, us);
            const [dx, dy] = sideDir(S), nx = -Math.sin(S.ang), ny = Math.cos(S.ang), sg = nx * dx + ny * dy >= 0 ? 1 : -1;
            const a0 = w / 2 - 0.5, a1 = w / 2 + 5 * us;
            c.globalAlpha = Math.max(0.35, M.vis[S.seg].a);
            c.strokeStyle = inkOf(seg, f); c.lineWidth = Math.max(1.5, 2.4 * us); c.lineCap = 'butt';
            c.beginPath(); c.moveTo(S.anchor[0] + nx * sg * a0, S.anchor[1] + ny * sg * a0); c.lineTo(S.anchor[0] + nx * sg * a1, S.anchor[1] + ny * sg * a1); c.stroke();
            c.lineCap = 'round'; c.globalAlpha = 1;
            S.tickEnd = [S.anchor[0] + nx * sg * a1, S.anchor[1] + ny * sg * a1];
        }
    }
    // Names, with the pool's count after them when there is one. An interchange whose name would
    // land on a neighbour's takes the next free side (a single station's side is its tick's)
    const fs = Math.max(10.5, 13.5 * us);
    for (const S of Object.values(M.st)) {
        if (S.hidden) continue;
        const n = store[S.id] || 0, name = S.label, cnt = n > 0 ? ' ' + n : '';
        c.font = `${fs}px ${_FONT.text}`;
        const wName = c.measureText(name).width;
        c.font = `${fs * 0.86}px ${_FONT.text}`;
        const wCnt = cnt ? c.measureText(cnt).width : 0, W = wName + wCnt;
        const sides = S.kind === 'hub' && S.side !== 'in' ? [S.side, ...['br', 'tr', 'tl', 'bl', 'r', 'l'].filter(x => x !== S.side)] : [S.side];
        let pick = null;
        for (const side of sides) {
            const [dx, dy] = sideDir(S, side);
            let bx, by, d;
            if (S.kind === 'tick') { [bx, by] = S.tickEnd || S.pos; d = 3; } else { [bx, by] = S.pos; d = rr + (S.kind === 'corr' ? M.G.gap / 2 : 0) + 3; }
            const x = bx + dx * d, y = by + dy * d;
            let align, base;
            if (Math.abs(dx) > 0.75) { align = dx > 0 ? 'left' : 'right'; base = 'middle'; }
            else if (side.length === 2 || side === 'in') { align = dx >= 0.2 ? 'left' : dx <= -0.2 ? 'right' : 'center'; base = dy < 0 ? 'alphabetic' : 'top'; }
            else { align = 'center'; base = dy > 0 ? 'top' : 'alphabetic'; }
            const left = align === 'left' ? x : align === 'right' ? x - W : x - W / 2, yy = y + (base === 'top' ? 1 : 0);
            const top = base === 'top' ? yy : base === 'middle' ? yy - fs / 2 : yy - fs;
            const cand = { left, yy, base, box: [left - 2, top - 2, left + W + 2, top + fs + 2] };
            if (!pick) pick = cand;
            if (!overlaps(cand.box, boxes)) { pick = cand; break; }
        }
        const { left, yy, base } = pick;
        c.textAlign = 'left'; c.textBaseline = base;
        c.font = `${fs}px ${_FONT.text}`; c.fillStyle = n > 0 ? P.text : P.muted; c.fillText(name, left, yy);
        // the count is molecules in the drawn slab (the key says so), muted beside the name
        if (cnt) { c.font = `${fs * 0.86}px ${_FONT.text}`; c.fillStyle = P.muted; c.fillText(cnt, left + wName, yy); }
        S.box = pick.box;
        boxes.push(S.box);
    }
}

/**
 * An enzyme's connections after its name: a sign and count in the text's
 * grey, then the pool's charged form as a glyph, brighter while its enzyme
 * runs and swelling when it fires. Returns the width; draw = false measures.
 */
function connections(c, list, x, y, fs, lit, pulse, draw) {
    const gs = fs * 0.46;
    let w = 0;
    c.save(); c.font = `${fs * 0.86}px ${_FONT.text}`; c.textBaseline = 'middle'; c.textAlign = 'left';
    for (const t of list) {
        const [pool, sg, n] = parseCof(t), sign = (sg > 0 ? '+' : '−') + n, sw = c.measureText(sign).width;
        if (draw) {
            c.fillStyle = K.P.canvas; c.fillRect(x + w - 1, y - fs * 0.6, sw + 3.2 * gs + 2, fs * 1.2);
            c.fillStyle = K.P.text2; c.fillText(sign, x + w, y + 0.5);
            K.molGlyph(c, x + w + sw + 1.6 * gs, y, gs * (1 + 0.3 * pulse), pool, 0.5 + 0.5 * Math.max(pulse, lit));
        }
        w += sw + 3.2 * gs + 4;
    }
    c.restore();
    return w;
}

// Corridor enzymes serve two tracks; each is labelled once, named for the way it runs

function drawLabels(c, hover, us, boxes) {
    const P = K.P, M = MapView, fs = Math.max(10, 11.5 * us);
    const isLive = (id) => id && M.vis[id] && !M.vis[id].hidden && M.vis[id].a > 0.02;
    c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const s of Object.values(M.segs)) {
        if (!s.lab) continue;
        const pair = PAIR[s.id];
        if (!isLive(s.id) && !isLive(pair)) { s.lab.box = null; continue; }
        const fa = flux[s.id] || 0, fb = pair ? flux[pair] || 0 : 0;
        const f = fa - fb, other = Math.abs(fb) > Math.abs(fa) + 0.03 || !isLive(s.id);
        // A cell that runs this line only backward labels it that way even while it idles
        const rev = f < -RUNNING || (!isLive(s.id) && isLive(pair)) || oneWay(s.line);
        // Which connections: the twin's when the Calvin track is the one running, else this line's, by direction
        const cid = other && pair ? pair : s.id;
        // A segment with several enzymes is named for, and connected to, the one carrying its flux
        const main = Math.abs(fa) + Math.abs(fb) > RUNNING && (M.cell?.seg[cid] || []).length > 1 ? segmentMain(cid) : null;
        const text = main ? REACTIONS[main[0]].enzyme : rev && s.rev ? s.rev : s.label;
        const cc = main ? cofactorGlyphs(REACTIONS[main[0]].stoich, Math.sign(main[1])) : M.cof[cid];
        // On phones the upright map has no room for connections: the stroma and the cartouche carry the pools
        const cof = cc && !M.G.rot ? (cid === pair ? cc[0] : rev ? cc[1] : cc[0]) : [];
        c.font = `italic ${fs}px ${_FONT.text}`;
        const tw = c.measureText(text).width, gw = cof.length ? 5 + connections(c, cof, 0, 0, fs, 0, 0, false) : 0, W = tw + gw;
        const { x: x0, y } = placeLabel(s, W, fs, boxes);
        c.globalAlpha = Math.max(0.4, Math.max(isLive(s.id) ? M.vis[s.id].a : 0, isLive(pair) ? M.vis[pair].a : 0));
        c.textAlign = 'left'; c.lineWidth = 3; c.strokeStyle = P.canvas;
        c.fillStyle = hover === s ? P.text : K.ink(other ? M.segs[pair].ink : s.ink);
        c.strokeText(text, x0, y); c.fillText(text, x0, y);
        if (cof.length) {
            const lit = Math.min(1, Math.abs(flux[cid] || 0) * 0.67);
            connections(c, cof, x0 + tw + 5, y, fs, lit, Math.max(M.pulse[s.id] || 0, pair ? M.pulse[pair] || 0 : 0), true);
            s.lab.glyphAt = [x0 + tw + 5 + fs * 1.3, y];
        } else s.lab.glyphAt = null;
        s.lab.box = [x0 - 3, y - fs / 2 - 3, x0 + W + 3, y + fs / 2 + 3];
        boxes.push(s.lab.box);
        // The pulse's factor now, the enzyme's activity multiplier, fading with the pulse: over the
        // name on the side away from the track, so it never runs into the next name along
        const pf = M.pulseOf ? M.pulseOf(s.id) : null;
        if (pf && Math.abs(pf.f - 1) > 0.03) {
            const t = (pf.held ? 'held ' : '') + '×' + (pf.f >= 1.95 ? pf.f.toFixed(1) : pf.f.toFixed(2)), away = s.lab.side && s.lab.side[1] > 0 ? 1 : -1;
            c.globalAlpha = Math.min(1, 0.35 + Math.abs(Math.log(pf.f)) / Math.log(5));
            c.font = `italic ${fs * 0.9}px ${_FONT.text}`; c.textAlign = 'left';
            c.lineWidth = 3; c.strokeStyle = P.canvas; c.fillStyle = K.ink(other ? M.segs[pair].ink : s.ink);
            c.strokeText(t, x0, y + away * fs * 1.05); c.fillText(t, x0, y + away * fs * 1.05);
        }
    }
    c.globalAlpha = 1;
}

/**
 * Where an enzyme's name goes: its own place by the track, else mirrored
 * across the track, else nudged along it either way, the first that clears
 * the names already placed. Records the side it took for the gate.
 */
function placeLabel(s, W, fs, boxes) {
    const L = s.lab, [mx, my, ang] = at(s, s.len / 2), tx = Math.cos(ang), ty = Math.sin(ang), nx = -ty, ny = tx;
    const ox = L.x - mx, oy = L.y - my, dn = ox * nx + oy * ny, step = MapView.G.U * 0.35;
    const flipA = { left: 'right', right: 'left', center: 'center' };
    const cands = [];
    for (const k of [0, 1, -1, 2, -2]) for (const flip of [false, true]) {
        const px = L.x + tx * step * k - (flip ? 2 * dn * nx : 0), py = L.y + ty * step * k - (flip ? 2 * dn * ny : 0);
        cands.push({ px, py, align: flip && Math.abs(nx) > 0.6 ? flipA[L.align] : L.align });
    }
    let pick = cands[0];
    for (const cd of cands) {
        const x0 = cd.align === 'left' ? cd.px : cd.align === 'right' ? cd.px - W : cd.px - W / 2;
        cd.x = x0; cd.y = cd.py; cd.box = [x0 - 2, cd.py - fs / 2 - 2, x0 + W + 2, cd.py + fs / 2 + 2];
        const B = MapView.bounds, inside = cd.box[0] > B.x0 - 10 && cd.box[2] < B.x1 + 10;
        if (inside && !overlaps(cd.box, boxes)) { pick = cd; break; }
    }
    if (pick.x === undefined) { const x0 = pick.align === 'left' ? pick.px : pick.align === 'right' ? pick.px - W : pick.px - W / 2; pick.x = x0; pick.y = pick.py; }
    L.side = [pick.px - mx, pick.py - my];
    return pick;
}

function drawLoops(c, us, hover, boxes) {
    const M = MapView, P = K.P, fs0 = Math.max(11, 14 * us);
    for (const L of M.loops) {
        const segIds = M.tracks[L.line === 'glyc' ? 'glyc' : L.line === 'box' ? 'box' : L.line]?.segs || [];
        const vis = segIds.map(id => M.vis[id]).filter(Boolean);
        L.hidden = !vis.length || vis.every(v => v.hidden) || Math.max(...vis.map(v => v.a)) < 0.35;
        if (L.hidden) continue;
        const lst = lineState(L.line), back = lst && lst.rev && L.revName;
        let name = M.G.rot ? (back ? L.revShort : L.short) : back ? L.revName : L.name, fs = fs0;
        const base = K.ink(LINES[L.line].ink);
        c.font = `italic ${fs}px ${_FONT.text}`;
        // A name inside a small loop shrinks to fit it (β-oxidation's square)
        if (L.fit && !M.G.rot) { const room = L.fit * M.G.U, w0 = c.measureText(name).width; if (w0 > room) fs = Math.max(10, fs * room / w0); }
        c.font = `italic ${fs}px ${_FONT.text}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        let w = c.measureText(name).width;
        c.font = `${fs * 0.82}px ${_FONT.text}`;
        const wt = L.times ? c.measureText(' ' + L.times).width : 0;
        L.hw = (w + wt) / 2;
        const st = lineState(L.line), cc = COF[L.key], cof = cc && !M.G.rot ? (st && st.rev ? cc[1] : cc[0]) : [];
        const cfs = fs * 0.82, gw = cof.length ? connections(c, cof, 0, 0, cfs, 0, 0, false) : 0, inLoop = !(L.span && !M.G.rot);
        // Its place: as laid out, or (the Krebs cycle's, inside a ring of names) the first alternative that clears them
        L.pos0 ||= L.pos;
        const cands = [L.pos0, ...(!M.G.rot && L.alt ? L.alt.map(([dx, dy]) => M.T(L.at[0] + dx, L.at[1] + dy)) : [])];
        const block = (p) => {
            const x0 = p[0] - L.hw, bb = [x0 - 2, p[1] - fs / 2 - 1, x0 + 2 * L.hw + 2, p[1] + fs / 2 + 1];
            if (cof.length && inLoop) { bb[0] = Math.min(bb[0], p[0] - gw / 2 - 2); bb[2] = Math.max(bb[2], p[0] + gw / 2 + 2); bb[3] = p[1] + fs * 1.05 + cfs * 0.6; }
            return bb;
        };
        L.pos = cands.find(p => !overlaps(block(p), boxes));
        // nowhere clear for the full name: its short one, wherever that fits
        if (!L.pos && L.short && !M.G.rot) {
            name = L.short; c.font = `italic ${fs}px ${_FONT.text}`; w = c.measureText(name).width; L.hw = (w + wt) / 2;
            L.pos = cands.find(p => !overlaps(block(p), boxes));
        }
        L.pos ||= cands[0];
        boxes.push(block(L.pos));
        const x0 = L.pos[0] - L.hw;
        if (L.span && !M.G.rot) {
            // A bracket under the corridor for the half-glycolysis services
            const [a, b] = L.span, o = M.G.rot ? [-5 * us, 0] : [0, -5 * us];
            c.strokeStyle = K.mix(base, P.canvas, 0.4); c.lineWidth = 1;
            c.beginPath(); c.moveTo(a[0] + o[0], a[1] + o[1]); c.lineTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(b[0] + o[0], b[1] + o[1]); c.stroke();
        }
        c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = P.canvas;
        c.font = `italic ${fs}px ${_FONT.text}`; c.textAlign = 'left'; c.fillStyle = hover === L ? P.text : base;
        c.strokeText(name, x0, L.pos[1]); c.fillText(name, x0, L.pos[1]);
        if (L.times) { c.font = `${fs * 0.82}px ${_FONT.text}`; c.fillStyle = P.muted; c.strokeText(' ' + L.times, x0 + w, L.pos[1]); c.fillText(' ' + L.times, x0 + w, L.pos[1]); }
        // A whole turn's net budget: under the name in a loop, after it on the corridor's brackets
        if (cof.length) {
            const gx = inLoop ? L.pos[0] - gw / 2 : x0 + 2 * L.hw + 8, gy = inLoop ? L.pos[1] + fs * 1.05 : L.pos[1];
            connections(c, cof, gx, gy, cfs, st ? Math.min(1, st.flux * 0.67) : 0, L.pulse || 0, true);
            L.glyphAt = [gx + cfs, gy];
        } else L.glyphAt = null;
    }
}

/** A line's carbon flux for the key: mM of carbon per second, two figures. */
const fmtFlux = (f) => f >= 10 ? f.toFixed(0) : f >= 1 ? f.toFixed(1) : f >= 0.01 ? f.toFixed(2) : '0';

const SHORT = { 'Pentose phosphate': 'Pentose P', 'Pyruvate dehydrogenase': 'PDH', 'Gluconeogenesis': 'Gluconeogen.', 'Fatty-acid synthesis': 'FA synthesis', 'Ethanol salvage': 'Salvage', 'Lactate oxidation': 'Lactate ox.' };

/** Whether the cell runs this line only backward: fatty-acid synthesis without β-oxidation. */
const oneWay = (line) => line === 'box' && synthesisOnly(cellHas);

/** Line name, renamed when its trains run backward. */
export function lineState(id) {
    const M = MapView, segs = Object.values(M.segs).filter(s => s.line === id && !M.vis[s.id]?.hidden);
    if (!segs.length) return null;
    let mx = 0, sum = 0;
    for (const s of segs) { const f = flux[s.id] || 0; mx = Math.max(mx, Math.abs(f)); sum += f; }
    const L = LINES[id];
    let rev = sum < -RUNNING || oneWay(id), name = rev && L.rev ? L.rev : L.name;
    if (id === 'ferm') {
        // Fermentation runs pyruvate down to lactate or ethanol; salvage runs them back to fuel
        const f = (k) => flux[k] || 0, pos = (x) => Math.max(0, x);
        const ferm = Math.abs(f('pdc')) + pos(f('adh')) + pos(f('ldh')), lactOx = pos(-f('ldh'));
        const etOx = Math.abs(f('aldh')) + Math.abs(f('acs')) + pos(-f('adh'));
        rev = lactOx + etOx > ferm + RUNNING / 2;
        name = rev ? (lactOx > etOx ? 'Lactate oxidation' : L.rev) : L.name;
    }
    const on = Math.max(...segs.map(s => M.vis[s.id].a)) > 0.5;
    return { id, name, flux: mx, on, ink: L.ink, rev };
}

/**
 * The plate's key, one cartouche: the lines by carbon flux at the left, each
 * row its line's knockout switch (a box, filled while its enzymes are on),
 * and the marks at the right, rows only for what the scene shows, with the
 * pools' counts. A cell's missing lines are named once, under the lines.
 */
const KEYS = { glycolysis: 1, ppp: 2, calvin: 3, krebs: 4, betaox: 5 };
/** The key's height at its fullest, side by side (for the phones' map canvas). */
export function keyHeight(us) { const fs = Math.max(10.5, 12.5 * us), rh = Math.round(fs * 1.55); return fs * 2.3 + 8 * rh + fs * 1.8 + 12; }
function drawKey(c, us, hover) {
    const M = MapView, P = K.P, [gx0, gy0, gx1, gy1] = M.keyBox, ks = M.keyScreen, narrow = M.G.rot && !ks;
    const a = M.T(gx0, gy0), b = M.T(gx1, gy1);
    const x0 = ks ? ks.x : Math.min(a[0], b[0]), y0 = ks ? ks.y : Math.min(a[1], b[1]), x1 = ks ? ks.x + ks.w : Math.max(a[0], b[0]);
    const fs = Math.max(10.5, 12.5 * us), rh = Math.round(fs * 1.55), pad = 12;
    const lines = Object.keys(LINES).map(lineState).filter(Boolean);
    const missing = Object.entries(LINES).filter(([id, L]) => L.toggle && !lineState(id)).map(([, L]) => L.name);
    // The marks: rows only for what the scene shows, with the pools' counts
    const spec = SPECIMENS[simState.specimen] || SPECIMENS.composite, can = spec.can, gs = fs * 0.42;
    const pair = (k1, k2) => (cc, x, y) => { K.molGlyph(cc, x - 6.5, y, gs, k1); K.molGlyph(cc, x + 7.5, y, gs, k2); };
    const marks = [[(cc, x, y) => { cc.beginPath(); cc.arc(x, y, 3, 0, TAU); cc.fillStyle = P.accent; cc.fill(); }, 'Proton, 2 mV of Δp', String(store.protonGradient), 'Proton, 2 mV']];
    if (can.photo || can.resp || can.cyclic) marks.push([(cc, x, y) => { cc.beginPath(); cc.arc(x, y, 3, 0, TAU); cc.fillStyle = P.canvas; cc.fill(); cc.lineWidth = 1.2; cc.strokeStyle = P.text; cc.stroke(); }, 'Electron in transit', undefined, 'Electron']);
    if (simState.lightOn && (can.photo || can.brAuto)) marks.push([(cc, x, y) => photonSwatch(cc, x, y), 'Photon']);
    for (const [k, name, tot] of [['atp', 'ATP · ADP', 'totalAtpAdp'], ['nadh', 'NADH · NAD⁺', 'totalNad'], ['nadph', 'NADPH · NADP⁺', 'totalNadp']]) {
        if (!store[tot]) continue;
        const [on, off] = K.POOL_FORMS[k];
        marks.push([pair(on, off), name, store[k] + ' · ' + (store[tot] - store[k])]);
    }
    if (M.gates) marks.push([(cc, x, y) => { cc.strokeStyle = P.text; cc.lineWidth = 1.2; cc.beginPath(); cc.moveTo(x - 7, y); cc.lineTo(x + 5, y); cc.stroke(); cc.lineWidth = 1.6; cc.beginPath(); cc.moveTo(x + 5, y - 4); cc.lineTo(x + 5, y + 4); cc.stroke(); }, '⊣ inhibits, → needed']);
    // Layout: two columns side by side, or stacked on the upright phone map
    const W = narrow ? x1 - x0 : Math.min(x1 - x0, 560 * us), colL = narrow ? W - 2 * pad : (W - 2 * pad) * 0.47, colR = narrow ? W - 2 * pad : W - 2 * pad - colL - 22;
    const nL = lines.length + (missing.length ? 1 : 0), head = fs * 2.3;
    const H = narrow ? head + (nL + marks.length) * rh + fs * 2.6 + pad + 8 : head + Math.max(nL, marks.length) * rh + fs * 1.8 + pad;
    const bx = narrow ? x0 : x0, by = y0;
    c.save();
    c.fillStyle = P.canvas; c.fillRect(bx, by, W, H);
    c.strokeStyle = K.rgba(P.text, P.dark ? 0.45 : 0.5); c.lineWidth = 1;
    c.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(W) - 1, Math.round(H) - 1);
    c.strokeRect(Math.round(bx) + 3.5, Math.round(by) + 3.5, Math.round(W) - 7, Math.round(H) - 7);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = P.muted;
    const lx = bx + pad, rx = narrow ? lx : lx + colL + 22, ty = by + fs * 1.6;
    c.fillText('Lines, by carbon flux (mM C/s)', lx, ty);
    if (!narrow) c.fillText('Marks', rx, ty);
    c.textBaseline = 'middle';
    M.keyRows = [];
    lines.forEach((r, i) => {
        const y = by + head + rh * (i + 0.5), L = LINES[r.id], tog = L.toggle && !simState.lockedPathways[L.toggle] ? L.toggle : null;
        // the switch: a box filled with the line's ink while its enzymes are on
        if (tog) {
            c.lineWidth = 1; c.strokeStyle = r.on ? K.ink(r.ink) : P.muted; c.strokeRect(Math.round(lx) + 0.5, Math.round(y - 5) + 0.5, 10, 10);
            if (r.on) { c.fillStyle = K.ink(r.ink); c.fillRect(lx + 3, y - 2, 5, 5); }
        }
        const sx = lx + 18;
        if (r.on) { c.strokeStyle = K.mix(idleInk(K.ink(r.ink)), K.ink(r.ink), Math.min(1, r.flux / FINK)); c.lineWidth = weight(r.flux, us); c.setLineDash([]); }
        else { c.strokeStyle = K.ink(r.ink); c.lineWidth = 1; c.setLineDash([3, 3.5]); }
        c.lineCap = 'butt'; c.beginPath(); c.moveTo(sx, y); c.lineTo(sx + 20 * us, y); c.stroke(); c.setLineDash([]); c.lineCap = 'round';
        c.font = `${fs}px ${_FONT.text}`;
        let name = r.name;
        if (c.measureText(name).width > colL - 26 * us - 18 - c.measureText('0.00').width - 8) name = SHORT[name] || name;
        const hov = hover && hover.line === r.id;
        c.fillStyle = hov ? P.text : r.on && r.flux > RUNNING ? P.text : P.muted; c.textAlign = 'left'; c.fillText(name, sx + 26 * us, y);
        if (hov) { const nw = c.measureText(name).width; c.fillRect(sx + 26 * us, y + fs * 0.55, nw, 1); }
        c.textAlign = 'right'; c.fillStyle = P.text2; c.fillText(r.on ? fmtFlux(r.flux) : 'off', lx + colL, y);
        c.textAlign = 'left';
        M.keyRows.push({ line: r.id, toggle: tog, on: r.on, name: r.name, flux: fmtFlux(r.flux) + ' mM C/s', key: KEYS[tog] || '', box: [lx - 4, y - rh / 2, lx + colL + 4, y + rh / 2] });
    });
    if (missing.length) {
        const y = by + head + rh * (lines.length + 0.5);
        c.font = `italic ${fs * 0.92}px ${_FONT.text}`; c.fillStyle = P.muted;
        let t = 'Not in this cell: ' + missing.join(', ').replace('Pentose phosphate', 'pentose phosphate').replace('Glycolysis', 'glycolysis');
        while (c.measureText(t).width > colL && missing.length > 1) { missing.pop(); t = 'Not in this cell: ' + missing.join(', ') + '…'; }
        c.fillText(t, lx, y);
    }
    // The marks
    const my0 = narrow ? by + head + rh * nL + fs * 1.4 : by + head;
    if (narrow) { c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = P.muted; c.textBaseline = 'alphabetic'; c.fillText('Marks', rx, my0 - fs * 0.5); c.textBaseline = 'middle'; }
    marks.forEach(([sw, text, val, short], i) => {
        const y = my0 + rh * (i + 0.5);
        c.save(); sw(c, rx + 9, y); c.restore();
        c.font = `${fs}px ${_FONT.text}`; c.textAlign = 'left'; c.fillStyle = P.text;
        const room = colR - 26 - (val !== undefined ? c.measureText(val).width + 8 : 0);
        c.fillText(short && c.measureText(text).width > room ? short : text, rx + 26, y);
        if (val !== undefined) { c.textAlign = 'right'; c.fillStyle = P.text2; c.fillText(val, rx + colR, y); }
    });
    // What the counts are
    c.font = `italic ${fs * 0.9}px ${_FONT.text}`; c.fillStyle = P.muted; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText('Counts are molecules in the drawn slab, here and at the stations.', lx, by + H - pad + 2);
    c.restore();
}

/** A short Feynman wiggle, for the cartouche. */
function photonSwatch(c, x, y) {
    c.strokeStyle = K.ink('ochre'); c.lineWidth = 1.1; c.lineCap = 'round';
    c.beginPath(); for (let k = 0; k <= 16; k++) { const t = k / 16, px = x - 8 + 16 * t, py = y + 2.2 * Math.sin(t * 4 * TAU / 2) * Math.sin(Math.PI * t); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
}
