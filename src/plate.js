// Plate furniture — what makes the figure read as a plate, shared with the
// siblings: a scale bar, the registers' titles, a hairline between them, and
// callouts with hairline leaders (the key's cartouche is mapdraw.js's). All
// draw in world pixels with the scene's palette (complexes.js P).
import * as K from './complexes.js';

const TAU = Math.PI * 2;
const rule = () => K.rgba(K.P.text, K.P.dark ? 0.13 : 0.12);

/** A scale bar of `nm` nanometres at s px per nm, the alternate half filled, as Miasma's. Returns its width with the label. */
export function scaleBar(c, x, y, s, nm, fs) {
    const P = K.P, half = nm / 2, w = nm * s;
    c.save();
    c.fillStyle = P.text; c.fillRect(x, y, half * s, 4);
    c.strokeStyle = P.text; c.lineWidth = 1; c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, 3);
    c.font = `${fs}px ${_FONT.text}`; c.fillStyle = P.text; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    // short bars (phones) keep only their ends' figures
    c.fillText('0', x, y - 4); if (w >= 56) c.fillText(String(half), x + half * s, y - 4);
    const lw = c.measureText(String(nm)).width;
    c.textAlign = 'left'; c.fillText(nm + ' nm', x + w - lw / 2, y - 4);
    const total = w + c.measureText(' nm').width + lw / 2;
    c.restore();
    return total;
}

/** A register's title: its letter, then what it shows. Returns the right edge. */
export function panelTitle(c, x, y, letter, text, fs) {
    const P = K.P;
    c.save(); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = `600 ${fs + 1}px ${_FONT.text}`; c.fillStyle = P.text; c.fillText(letter, x, y);
    const lw = c.measureText(letter).width;
    c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = P.muted; c.fillText(text, x + lw + 7, y);
    const r = x + lw + 7 + c.measureText(text).width;
    c.restore();
    return r;
}

/** A hairline across the plate. */
export function hairline(c, x0, x1, y) {
    c.save(); c.fillStyle = rule(); c.fillRect(x0, Math.round(y), x1 - x0, 1); c.restore();
}

/**
 * Callouts: labels in rows with hairline leaders down (or up) to their targets.
 * items: [{ key, x, y (target), text, row, ly (label baseline) }], laid out by the caller.
 */
export function drawCallouts(c, items, fs, hoverKey, markOf) {
    const P = K.P;
    c.save();
    c.font = `italic ${fs}px ${_FONT.text}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    for (const it of items) {
        const on = it.key === hoverKey, x = Math.round(it.x) + 0.5, y0 = it.ly + 4;
        c.strokeStyle = K.rgba(P.text, on ? 0.6 : 0.26); c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, y0); c.lineTo(x, it.y); c.stroke();
        c.beginPath(); c.arc(it.x, it.y, 1.4, 0, TAU); c.fillStyle = K.rgba(P.text, on ? 0.8 : 0.45); c.fill();
    }
    c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = P.canvas;
    for (const it of items) {
        c.strokeText(it.text, it.x, it.ly);
        c.fillStyle = it.key === hoverKey ? P.text : P.text2; c.fillText(it.text, it.x, it.ly);
        // a pulsed or held complex: its activity multiplier now, after its name
        const m = markOf && markOf(it.key);
        if (m) {
            c.save(); c.textAlign = 'left'; c.font = `italic ${fs * 0.9}px ${_FONT.text}`; c.globalAlpha = m.a; c.fillStyle = P.text;
            c.strokeText(m.text, it.x + it.w / 2 + 4, it.ly); c.fillText(m.text, it.x + it.w / 2 + 4, it.ly);
            c.restore();
        }
    }
    c.restore();
}
