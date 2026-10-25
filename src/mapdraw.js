// Map drawing — the transit map in the manner of Beck: one ink per line,
// ticks for single stations, rings and capsules for interchanges. Line
// weight and train speed read flux; trains are chevrons cut out of the line,
// pointing the way carbon runs, so a still frame still shows direction.
// Switched-off lines are dashed hairlines; an enzyme its regulation blocks
// carries a buffer bar across the track.
import { MapView, FLIP } from './map.js';
import { LINES, CO2, KEY_BOX, KC, PAIR, COF, parseCof } from './maplayout.js';
import { flux, RUNNING, segmentGate, segmentMain, cellHas } from './flux.js';
import { REACTIONS } from './engine/network.js';
import { cofactorGlyphs } from './mapbind.js';
import { store, simState } from './state.js';
import { SPECIMENS } from './specimens.js';
import { cartouche } from './plate.js';
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

export function drawMap(c, hover, dt) {
    const M = MapView, G = M.G, us = G.us, P = K.P;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const segs = Object.values(M.segs).filter(s => !M.vis[s.id].hidden);
    const spec = SPECIMENS[simState.specimen];
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
    // Gates: where a pool slows or stops an enzyme in the direction it runs, the pool's glyph stands
    // across the track from the name, with ⊣ (inhibits), → (needed) or ⊕ (activates); dashed while
    // the enzyme is only slowed, solid with a buffer bar across the track once it is stopped
    M.gates = 0;
    for (const s of live) {
        if (!s.label || M.vis[s.id].a < 0.5) continue;
        const g = segmentGate(s.id);
        if (g) { drawGate(c, s, g, us); M.gates++; }
    }
    drawStations(c, us);
    drawLabels(c, hover, us);
    drawLoops(c, us, hover);
    drawKey(c, us);
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
    c.restore();
}

function drawGate(c, s, g, us) {
    const P = K.P, fs = Math.max(10, 11.5 * us), gs = fs * 0.46;
    const [mx, my, ang] = at(s, s.len / 2), nx = -Math.sin(ang), ny = Math.cos(ang);
    // across the track from the label
    const [ox, oy] = s.lab.out, side = ox * nx + oy * ny > 0 ? -1 : 1, ux = nx * side, uy = ny * side;
    const w = weight(flux[s.id] || 0, us), d0 = w / 2 + 2.5, d1 = d0 + fs * 0.95;
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
        c.fillText(g.word, bx + ux * 2, by + uy * (fs * 0.6));
    }
    c.restore();
    if (g.factor === 0) {
        // the buffer bar, across the track
        const h = w / 2 + 4.5 * us;
        c.strokeStyle = P.text; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(mx + nx * h, my + ny * h); c.lineTo(mx - nx * h, my - ny * h); c.stroke();
    }
}

function at(s, v) {
    const { pts, L } = s; let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= v) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], t = (v - L[lo]) / ((L[hi] - L[lo]) || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
}

function sideDir(S) {
    let v;
    if (S.side === 'in') { const c0 = MapView.T(...KC); v = [c0[0] - S.pos[0], c0[1] - S.pos[1]]; }
    else v = MapView.Tdir(...({ t: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0], tr: [0.6, -0.8], tl: [-0.7, -0.7], br: [0.7, 0.7], bl: [-0.7, 0.7] })[S.side]);
    const L = Math.hypot(v[0], v[1]) || 1;
    return [v[0] / L, v[1] / L];
}

function drawStations(c, us) {
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
    // Names, with the pool's count after them when there is one
    const fs = Math.max(10.5, 13.5 * us);
    for (const S of Object.values(M.st)) {
        if (S.hidden) continue;
        const [dx, dy] = sideDir(S);
        let bx, by, d;
        if (S.kind === 'tick') { [bx, by] = S.tickEnd || S.pos; d = 3; } else { [bx, by] = S.pos; d = rr + (S.kind === 'corr' ? M.G.gap / 2 : 0) + 3; }
        let x = bx + dx * d, y = by + dy * d, align, base;
        if (Math.abs(dx) > 0.75) { align = dx > 0 ? 'left' : 'right'; base = 'middle'; }
        else if (S.side.length === 2 || S.side === 'in') { align = dx >= 0.2 ? 'left' : dx <= -0.2 ? 'right' : 'center'; base = dy < 0 ? 'alphabetic' : 'top'; }
        else { align = 'center'; base = dy > 0 ? 'top' : 'alphabetic'; }
        const n = store[S.id] || 0, name = S.label, cnt = n > 0 ? ' ' + n : '';
        c.font = `${fs}px ${_FONT.text}`;
        const wName = c.measureText(name).width;
        c.font = `${fs * 0.86}px ${_FONT.text}`;
        const wCnt = cnt ? c.measureText(cnt).width : 0, W = wName + wCnt;
        const left = align === 'left' ? x : align === 'right' ? x - W : x - W / 2;
        const yy = y + (base === 'top' ? 1 : 0);
        c.textAlign = 'left'; c.textBaseline = base;
        c.font = `${fs}px ${_FONT.text}`; c.fillStyle = n > 0 ? P.text : P.muted; c.fillText(name, left, yy);
        if (cnt) { c.font = `${fs * 0.86}px ${_FONT.text}`; c.fillStyle = P.accent === P.text ? P.text : P.text2; c.fillText(cnt, left + wName, yy); }
        const top = base === 'top' ? yy : base === 'middle' ? yy - fs / 2 : yy - fs;
        S.box = [left - 2, top - 2, left + W + 2, top + fs + 2];
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

function drawLabels(c, hover, us) {
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
        const x0 = s.lab.align === 'left' ? s.lab.x : s.lab.align === 'right' ? s.lab.x - W : s.lab.x - W / 2, y = s.lab.y;
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
    }
    c.globalAlpha = 1;
}

function drawLoops(c, us, hover) {
    const M = MapView, P = K.P, fs = Math.max(11, 14 * us);
    for (const L of M.loops) {
        const segIds = M.tracks[L.line === 'glyc' ? 'glyc' : L.line === 'box' ? 'box' : L.line]?.segs || [];
        const vis = segIds.map(id => M.vis[id]).filter(Boolean);
        L.hidden = !vis.length || vis.every(v => v.hidden) || Math.max(...vis.map(v => v.a)) < 0.35;
        if (L.hidden) continue;
        const lst = lineState(L.line), back = lst && lst.rev && L.revName;
        const name = M.G.rot ? (back ? L.revShort : L.short) : back ? L.revName : L.name, base = K.ink(LINES[L.line].ink);
        c.font = `italic ${fs}px ${_FONT.text}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        const w = c.measureText(name).width;
        c.font = `${fs * 0.82}px ${_FONT.text}`;
        const wt = L.times ? c.measureText(' ' + L.times).width : 0;
        L.hw = (w + wt) / 2;
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
        const st = lineState(L.line), cc = COF[L.key], cof = cc && !M.G.rot ? (st && st.rev ? cc[1] : cc[0]) : [];
        if (cof.length) {
            const cfs = fs * 0.82, gw = connections(c, cof, 0, 0, cfs, 0, 0, false);
            const gx = L.span && !M.G.rot ? x0 + 2 * L.hw + 8 : L.pos[0] - gw / 2, gy = L.span && !M.G.rot ? L.pos[1] : L.pos[1] + fs * 1.05;
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

function drawKey(c, us) {
    const M = MapView, P = K.P, [gx0, gy0, gx1, gy1] = KEY_BOX;
    const a = M.T(gx0, gy0), b = M.T(gx1, gy1);
    const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
    const fs = Math.max(10.5, 13 * us), narrow = M.G.rot;
    const colW = narrow ? x1 - x0 : (x1 - x0) * 0.42;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = P.muted;
    c.fillText('Lines, by carbon flux (mM C/s)', x0, y0 + fs);
    const rows = Object.keys(LINES).map(lineState).filter(Boolean);
    const rowH = Math.min(22 * us + 4, (narrow ? (y1 - y0) * 0.45 : y1 - y0 - fs - 34) / 7);
    rows.forEach((r, i) => {
        const y = y0 + fs + 8 + rowH * (i + 0.5);
        if (r.on) { c.strokeStyle = K.mix(idleInk(K.ink(r.ink)), K.ink(r.ink), Math.min(1, r.flux / FINK)); c.lineWidth = weight(r.flux, us); c.setLineDash([]); }
        else { c.strokeStyle = K.ink(r.ink); c.lineWidth = 1; c.setLineDash([3, 3.5]); }
        c.lineCap = 'butt'; c.beginPath(); c.moveTo(x0 + 2, y); c.lineTo(x0 + 22 * us, y); c.stroke(); c.setLineDash([]); c.lineCap = 'round';
        c.font = `${fs}px ${_FONT.text}`; c.textBaseline = 'middle';
        let name = r.name;
        if (c.measureText(name).width > colW - 30 * us - c.measureText('0.0 mM/s').width - 8) name = SHORT[name] || name;
        c.fillStyle = r.flux > RUNNING ? P.text : P.muted; c.fillText(name, x0 + 30 * us, y);
        c.textAlign = 'right'; c.fillStyle = P.text2;
        c.fillText(r.on ? fmtFlux(r.flux) : 'off', x0 + colW, y);
        c.textAlign = 'left';
    });
    // The cartouche: what the marks are, rows only for what the scene shows, with the pools' counts
    const spec = SPECIMENS[simState.specimen] || SPECIMENS.composite, can = spec.can, gs = fs * 0.42;
    const pair = (k1, k2) => (cc, x, y) => { K.molGlyph(cc, x - 6.5, y, gs, k1); K.molGlyph(cc, x + 7.5, y, gs, k2); };
    const krows = [[(cc, x, y) => { cc.beginPath(); cc.arc(x, y, 3, 0, TAU); cc.fillStyle = P.accent; cc.fill(); }, 'Proton, 2 mV of Δp', String(store.protonGradient), 'Proton']];
    if (can.photo || can.resp || can.cyclic) krows.push([(cc, x, y) => { cc.beginPath(); cc.arc(x, y, 3, 0, TAU); cc.fillStyle = P.canvas; cc.fill(); cc.lineWidth = 1.2; cc.strokeStyle = P.text; cc.stroke(); }, 'Electron in transit']);
    if (simState.lightOn && (can.photo || can.brAuto)) krows.push([(cc, x, y) => photonSwatch(cc, x, y), 'Photon']);
    for (const [k, name, tot] of [['atp', 'ATP · ADP', 'totalAtpAdp'], ['nadh', 'NADH · NAD⁺', 'totalNad'], ['nadph', 'NADPH · NADP⁺', 'totalNadp'], ['fadh2', 'FADH₂ · FAD', 'totalFad']]) {
        if (!store[tot]) continue;   // FAD stays bound to its enzymes
        const [on, off] = K.POOL_FORMS[k];
        krows.push([pair(on, off), name, store[k] + ' · ' + (store[tot] - store[k]), name.split(' ')[0]]);
    }
    if (M.gates) krows.push([(cc, x, y) => { cc.strokeStyle = P.text; cc.lineWidth = 1.2; cc.beginPath(); cc.moveTo(x - 7, y); cc.lineTo(x + 5, y); cc.stroke(); cc.lineWidth = 1.6; cc.beginPath(); cc.moveTo(x + 5, y - 4); cc.lineTo(x + 5, y + 4); cc.stroke(); }, 'A pool’s gate: ⊣ inhibits, → needed', undefined, '⊣ inhibits, → needed']);
    const kfs = Math.max(10, 12.5 * us), xr = narrow ? x1 : x1 - 0.75 * M.G.U, cw = narrow ? x1 - x0 : Math.min(xr - x0 - colW - 24, 300);
    const ky = narrow ? y0 + fs + 16 + rowH * 7 : y0 - 4;
    cartouche(c, xr - cw, ky, cw, krows, kfs);
}

/** A short Feynman wiggle, for the cartouche. */
function photonSwatch(c, x, y) {
    c.strokeStyle = K.ink('ochre'); c.lineWidth = 1.1; c.lineCap = 'round';
    c.beginPath(); for (let k = 0; k <= 16; k++) { const t = k / 16, px = x - 8 + 16 * t, py = y + 2.2 * Math.sin(t * 4 * TAU / 2) * Math.sin(Math.PI * t); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
}
