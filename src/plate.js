// Plate furniture — what makes the figure read as a plate, shared with the
// siblings: the reference cartouche in a double hairline, a scale bar, the
// registers' titles, and callouts with hairline leaders. All draw in world
// pixels with the scene's palette (complexes.js P).
import * as K from './complexes.js';

const TAU = Math.PI * 2;
const rule = () => K.rgba(K.P.text, K.P.dark ? 0.13 : 0.12);

/**
 * The cartouche: a double hairline, an italic title, and rows of
 * [swatch(c, x, y), text, value?, shortText?]. Returns its height.
 */
export function cartouche(c, x, y, w, rows, fs, title = 'Reference') {
    const P = K.P, rh = fs * 1.55, h = fs * 2.2 + rows.length * rh + 8;
    c.save();
    c.fillStyle = P.canvas; c.fillRect(x, y, w, h);
    c.strokeStyle = K.rgba(P.text, P.dark ? 0.45 : 0.5); c.lineWidth = 1;
    c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
    c.strokeRect(Math.round(x) + 3.5, Math.round(y) + 3.5, Math.round(w) - 7, Math.round(h) - 7);
    c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = P.muted; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(title, x + w / 2, y + fs * 1.55);
    c.textBaseline = 'middle';
    rows.forEach(([sw, text, val, short], i) => {
        const ry = y + fs * 2.2 + rh * (i + 0.5) + 2;
        c.save(); sw(c, x + 22, ry); c.restore();
        c.font = `${fs}px ${_FONT.text}`; c.textAlign = 'left';
        const vw = val !== undefined ? c.measureText(val).width + 10 : 0;
        c.fillStyle = P.text; c.fillText(short && c.measureText(text).width > w - 52 - vw ? short : text, x + 40, ry);
        if (val !== undefined) { c.textAlign = 'right'; c.fillStyle = P.text2; c.fillText(val, x + w - 12, ry); }
    });
    c.restore();
    return h;
}

/** A scale bar of `nm` nanometres at s px per nm, the alternate half filled, as Miasma's. Returns its width with the label. */
export function scaleBar(c, x, y, s, nm, fs) {
    const P = K.P, half = nm / 2, w = nm * s;
    c.save();
    c.fillStyle = P.text; c.fillRect(x, y, half * s, 4);
    c.strokeStyle = P.text; c.lineWidth = 1; c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, 3);
    c.font = `${fs}px ${_FONT.text}`; c.fillStyle = P.text; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('0', x, y - 4); c.fillText(String(half), x + half * s, y - 4);
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
export function drawCallouts(c, items, fs, hoverKey) {
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
    }
    c.restore();
}
