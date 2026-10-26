// Locator — where the cut comes from. A small line drawing of the cell or
// organelle each specimen's cross-section is cut from, with the cut boxed, as
// a map carries an inset of its region. The plate draws it in the map's top
// right (or its left column); the legend's row of specimens uses the same
// drawings, without the box, as its icons (mono: one colour throughout).
import * as K from './complexes.js';

const TAU = Math.PI * 2;

function capsule(c, x, y, w, h) {
    c.beginPath();
    if (w <= 0 || h <= 0) return;
    const r = h / 2;
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    c.lineTo(x + r, y + h); c.arc(x + r, y + r, r, Math.PI / 2, 3 * Math.PI / 2); c.closePath();
}
function lens(c, cx, cy, rx, ry) {
    c.beginPath(); c.moveTo(cx - rx, cy);
    c.bezierCurveTo(cx - rx * 0.7, cy - ry * 1.32, cx + rx * 0.7, cy - ry * 1.32, cx + rx, cy);
    c.bezierCurveTo(cx + rx * 0.7, cy + ry * 1.32, cx - rx * 0.7, cy + ry * 1.32, cx - rx, cy); c.closePath();
}
function hex(c, x, y, r) { c.moveTo(x + r, y); for (let k = 1; k <= 6; k++) { const a = k / 6 * TAU; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }

/**
 * Draw the locator for a specimen into the box (x, y, w, h).
 * opts: { mono: a colour for everything (icons), fs, label: the panel letter, caption }
 */
export function drawLocator(c, x, y, w, h, spec, opts = {}) {
    const P = K.P, fs = opts.fs || 12, mono = opts.mono;
    const line = mono || P.text2, faint = mono ? K.rgba(mono, 0.55) : K.rgba(P.text, 0.32), tint = (n, t = 0.1) => mono || K.mix(K.ink(n), P.canvas, t);
    const lw = opts.lw || 1.2, capH = opts.caption === false ? 0 : fs + 4, H = h - capH, cx = x + w / 2, cy = y + H / 2;
    let box = null;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    if (spec === 'thylakoid') {
        // a rod-shaped cyanobacterium: its envelope, concentric thylakoids, carboxysomes
        const cw = w * 0.84, ch = Math.min(H * 0.86, cw * 0.46), x0 = cx - cw / 2, y0 = cy - ch / 2;
        capsule(c, x0, y0, cw, ch); c.strokeStyle = line; c.lineWidth = lw; c.stroke();
        capsule(c, x0 + 2.2, y0 + 2.2, cw - 4.4, ch - 4.4); c.lineWidth = lw * 0.6; c.strokeStyle = faint; c.stroke();
        for (let k = 0; k < 3; k++) {
            const d = ch * (0.16 + k * 0.11);
            if (ch - 2 * d < 3) break;
            capsule(c, x0 + d, y0 + d, cw - 2 * d, ch - 2 * d); c.strokeStyle = tint('sap'); c.lineWidth = lw * 2.1; c.stroke();
            capsule(c, x0 + d, y0 + d, cw - 2 * d, ch - 2 * d); c.strokeStyle = mono ? (opts.ground || P.canvas) : P.canvas; c.lineWidth = lw * 0.8; c.stroke();
        }
        c.strokeStyle = tint('umber', 0.2); c.lineWidth = lw * 0.75;
        for (const dx of [-0.12, 0.1]) { c.beginPath(); hex(c, cx + dx * cw, cy, ch * 0.09); c.stroke(); }
        box = [x0 + cw - ch * 0.58 - 4, y0 + ch * 0.62, ch * 0.3, ch * 0.3];
    } else if (spec === 'chloroplast') {
        // a lens with its double envelope; grana stacks joined by stroma lamellae
        const rx = w * 0.43, ry = Math.min(H * 0.4, rx * 0.5);
        lens(c, cx, cy, rx, ry); c.strokeStyle = line; c.lineWidth = lw; c.stroke();
        lens(c, cx, cy, rx - 2.6, ry - 2); c.strokeStyle = faint; c.lineWidth = lw * 0.6; c.stroke();
        const stacks = [-0.6, -0.3, 0, 0.3, 0.58], gw = rx * 0.2, dh = Math.max(1.6, ry * 0.12);
        c.strokeStyle = tint('sap', 0.25); c.lineWidth = lw * 0.7;
        for (let i = 0; i < stacks.length - 1; i++) { const a = cx + stacks[i] * rx, b = cx + stacks[i + 1] * rx; c.beginPath(); c.moveTo(a + gw / 2, cy + (i % 2 ? dh : -dh)); c.lineTo(b - gw / 2, cy + (i % 2 ? -dh : dh)); c.stroke(); }
        c.fillStyle = tint('viridian');
        stacks.forEach((sx, i) => {
            const n = [4, 6, 7, 6, 4][i], gx = cx + sx * rx;
            for (let k = 0; k < n; k++) { c.beginPath(); c.roundRect(gx - gw / 2, cy - n * dh * 0.75 + k * dh * 1.5, gw, dh, dh / 2); c.fill(); }
        });
        box = [cx + 0.3 * rx - gw / 2 - 3, cy - ry * 0.32, gw + 6, ry * 0.64];
    } else if (spec === 'cristae') {
        // a mitochondrion: outer membrane, inner membrane folded into cristae from both sides
        const cw = w * 0.84, ch = Math.min(H * 0.82, cw * 0.48), x0 = cx - cw / 2, y0 = cy - ch / 2;
        capsule(c, x0, y0, cw, ch); c.strokeStyle = line; c.lineWidth = lw; c.stroke();
        capsule(c, x0 + 2.6, y0 + 2.6, cw - 5.2, ch - 5.2); c.strokeStyle = tint('mulberry', 0.15); c.lineWidth = lw * 0.8; c.stroke();
        const n = 7, g = Math.max(1.4, ch * 0.05);
        for (let k = 0; k < n; k++) {
            const fx = x0 + cw * (0.16 + 0.68 * k / (n - 1)), topSide = k % 2 === 0, len = ch * (0.5 + 0.1 * Math.sin(k * 2.1));
            const y1 = topSide ? y0 + 2.6 : y0 + ch - 2.6, y2 = topSide ? y1 + len : y1 - len;
            c.beginPath(); c.moveTo(fx - g, y1); c.lineTo(fx - g, y2 + (topSide ? -g : g)); c.arc(fx, y2 + (topSide ? -g : g), g, Math.PI, 0, !topSide); c.lineTo(fx + g, y1);
            c.stroke();
        }
        const kx = x0 + cw * (0.16 + 0.68 * 2 / (n - 1)), klen = ch * (0.5 + 0.1 * Math.sin(4.2));
        box = [kx - ch * 0.17, y0 + 2.6 + klen - ch * 0.26, ch * 0.34, ch * 0.32];
    } else if (spec === 'plasma') {
        // a Gram-positive rod: the thick wall, the membrane under it
        const cw = w * 0.82, ch = Math.min(H * 0.6, cw * 0.32), x0 = cx - cw / 2, y0 = cy - ch / 2;
        capsule(c, x0 - 3, y0 - 3, cw + 6, ch + 6); c.strokeStyle = tint('umber', 0.3); c.lineWidth = lw * 4; c.stroke();
        capsule(c, x0 + 1, y0 + 1, cw - 2, ch - 2); c.strokeStyle = line; c.lineWidth = lw; c.stroke();
        c.fillStyle = faint; for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(x0 + cw * (0.22 + 0.075 * k), cy + Math.sin(k * 1.9) * ch * 0.18, lw * 0.8, 0, TAU); c.fill(); }
        box = [x0 + cw * 0.55, y0 - 7, ch * 0.5, ch * 0.5];
    } else if (spec === 'purple') {
        // a halobacterium: its S-layer, its membrane, purple patches, gas vesicles
        const cw = w * 0.88, ch = Math.min(H * 0.5, cw * 0.22), x0 = cx - cw / 2, y0 = cy - ch / 2;
        capsule(c, x0 - 2.4, y0 - 2.4, cw + 4.8, ch + 4.8); c.strokeStyle = faint; c.setLineDash([1, 2]); c.lineWidth = lw; c.stroke(); c.setLineDash([]);
        capsule(c, x0, y0, cw, ch); c.strokeStyle = line; c.lineWidth = lw; c.stroke();
        c.strokeStyle = tint('violet', 0); c.lineWidth = lw * 2.6; c.lineCap = 'butt';
        for (const [a, b, top] of [[0.22, 0.36, 1], [0.58, 0.7, 1], [0.4, 0.52, 0], [0.75, 0.85, 0]]) { const yy = top ? y0 : y0 + ch; c.beginPath(); c.moveTo(x0 + cw * a, yy); c.lineTo(x0 + cw * b, yy); c.stroke(); }
        c.strokeStyle = faint; c.lineWidth = lw * 0.7; c.lineCap = 'round';
        for (const fx of [0.3, 0.47, 0.62]) { c.beginPath(); c.ellipse(x0 + cw * fx, cy, ch * 0.28, ch * 0.1, 0, 0, TAU); c.stroke(); }
        box = [x0 + cw * 0.58 - 2, y0 - ch * 0.35, ch * 0.7, ch * 0.62];
    } else {
        // the composite: no cell has it, so a bare stretch of membrane with every kind of complex
        const y0 = cy, x0 = x + w * 0.08, x1 = x + w * 0.92;
        c.strokeStyle = line; c.lineWidth = lw;
        c.beginPath(); c.moveTo(x0, y0 - 3); c.lineTo(x1, y0 - 3); c.moveTo(x0, y0 + 3); c.lineTo(x1, y0 + 3); c.stroke();
        const inks = ['sap', 'indigo', 'prussian', 'verdigris', 'viridian', 'mulberry', 'violet'];
        inks.forEach((n, i) => { const bx = x0 + (x1 - x0) * (i + 0.5) / inks.length; c.beginPath(); c.ellipse(bx, y0, (x1 - x0) / inks.length * 0.32, 5.5, 0, 0, TAU); c.fillStyle = mono ? (opts.ground || P.canvas) : K.mix(K.ink(n), P.canvas, 0.35); c.fill(); c.strokeStyle = mono || K.ink(n); c.stroke(); });
    }
    if (box && opts.label !== false) {
        const [bx, by, bw, bh] = box;
        c.strokeStyle = P.text; c.lineWidth = 1; c.setLineDash([2.5, 2]); c.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(bw), Math.round(bh)); c.setLineDash([]);
        if (opts.label) {
            const lx = x + w - 6, ly = Math.min(y + H - 2, by + bh + fs * 0.9);
            c.strokeStyle = K.rgba(P.text, 0.45); c.beginPath(); c.moveTo(bx + bw, by + bh / 2); c.lineTo(lx - 4, ly - fs * 0.35); c.stroke();
            c.font = `600 ${fs}px ${_FONT.text}`; c.fillStyle = P.text; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(opts.label, lx - 2, ly);
        }
    }
    if (opts.caption !== false) {
        c.font = `italic ${fs - 1}px ${_FONT.text}`; c.fillStyle = P.muted; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillText(opts.caption || 'Where the cut is', cx, y + h - 2);
    }
    c.restore();
}
