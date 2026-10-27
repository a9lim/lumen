// Ladder — Fig. 2's other view: the Z-scheme drawn live. Every carrier
// stands at its midpoint potential (E′₀, volts at pH 7, more reducing up), and
// every electron now in flight in the membrane is a bead on it, at the carrier
// it has reached. Light lifts a bead at P680 and again at P700; respiration
// only falls, from NADH to oxygen. The potentials are rounded: the photosynthetic
// carriers in the order and placement of Stirbet et al. (2023), the respiratory
// couples from a standard table (see the reference overlay). A membrane with
// no chain (the anaerobe's) has no ladder, and Fig. 2's ladder view is
// disabled for it. Drawn only while Fig. 2 shows it.
import Particles from './particles.js';
import { Membrane } from './membrane.js';
import * as K from './complexes.js';

const TAU = Math.PI * 2;

// Carriers: [column, E′₀ (V), label]
const PHOTO = {
    h2o: [0, 0.82, 'H₂O'], p680: [1, 1.2, 'P680'], p680x: [1, -0.8, 'P680*'], pheo: [2, -0.6, 'Pheo'], qa: [2.9, -0.1, 'Qᴀ'], pq: [3.9, 0.1, 'PQ'],
    fes: [4.9, 0.3, 'FeS'], f: [5.7, 0.37, 'f'], pc: [6.5, 0.37, 'PC'], p700: [7.5, 0.45, 'P700'], p700x: [7.5, -1.3, 'P700*'],
    a0: [8.4, -1.05, 'A₀'], a1: [9.2, -0.8, 'A₁'], fx: [10, -0.7, 'Fx'], fb: [10.8, -0.55, 'Fʙ'], fd: [11.7, -0.43, 'Fd'], fnr: [12.6, -0.38, 'FNR'], nadp: [13.5, -0.32, 'NADP⁺'],
};
const SETS = {
    // the cyanobacterium: the Z-scheme, with respiration through the shared PQ, b₆f and PC; its NDH-1
    // takes ferredoxin (from PSI, or from NADPH through FNR in the dark), not NADH
    thylakoid: {
        nodes: { ...PHOTO, ndh: [4.6, -0.15, 'NDH-1'], succ: [4.7, 0.03, 'SDH'], cox: [8.6, 0.385, 'cyt ox'], o2: [9.6, 0.816, 'O₂'] },
        groups: { psii: ['p680', 'p680x', 'pheo', 'qa'], pq: ['pq'], cytb6f: ['fes', 'f'], pc: ['pc'], psi: ['p700', 'p700x', 'a0', 'a1', 'fx', 'fb'], fd: ['fd'], fnr: ['fnr', 'nadp'], ndh1: ['ndh'], sdh: ['succ'], cytOx: ['cox', 'o2'] },
        resp: ['ndh', 'succ', 'cox', 'o2'],
        lines: [['h2o', 'p680', 'dash'], ['p680', 'p680x', 'light'], ['p680x', 'pheo'], ['pheo', 'qa'], ['qa', 'pq'], ['pq', 'fes'], ['fes', 'f'], ['f', 'pc'], ['pc', 'p700'], ['p700', 'p700x', 'light'],
            ['p700x', 'a0'], ['a0', 'a1'], ['a1', 'fx'], ['fx', 'fb'], ['fb', 'fd'], ['fd', 'fnr'], ['fnr', 'nadp'], ['fd', 'pq', 'dash'],
            ['fd', 'ndh', 'dash'], ['ndh', 'pq', 'resp'], ['succ', 'pq', 'resp'], ['pc', 'cox', 'resp'], ['cox', 'o2', 'resp']],
    },
    // the composite: the same, with an NADH-fed complex I
    composite: {
        nodes: { ...PHOTO, nadh: [5.0, -0.32, 'NADH'], ndh: [4.6, -0.15, 'NDH-1'], succ: [4.7, 0.03, 'SDH'], cox: [8.6, 0.385, 'cyt ox'], o2: [9.6, 0.816, 'O₂'] },
        groups: { psii: ['p680', 'p680x', 'pheo', 'qa'], pq: ['pq'], cytb6f: ['fes', 'f'], pc: ['pc'], psi: ['p700', 'p700x', 'a0', 'a1', 'fx', 'fb'], fd: ['fd'], fnr: ['fnr', 'nadp'], ndh1: ['nadh', 'ndh'], sdh: ['succ'], cytOx: ['cox', 'o2'] },
        resp: ['nadh', 'ndh', 'succ', 'cox', 'o2'],
        lines: [['h2o', 'p680', 'dash'], ['p680', 'p680x', 'light'], ['p680x', 'pheo'], ['pheo', 'qa'], ['qa', 'pq'], ['pq', 'fes'], ['fes', 'f'], ['f', 'pc'], ['pc', 'p700'], ['p700', 'p700x', 'light'],
            ['p700x', 'a0'], ['a0', 'a1'], ['a1', 'fx'], ['fx', 'fb'], ['fb', 'fd'], ['fd', 'fnr'], ['fnr', 'nadp'], ['fd', 'pq', 'dash'],
            ['nadh', 'ndh', 'resp'], ['ndh', 'pq', 'resp'], ['succ', 'pq', 'resp'], ['pc', 'cox', 'resp'], ['cox', 'o2', 'resp']],
    },
    // the chloroplast: the Z-scheme and cyclic flow, no respiration
    chloroplast: {
        nodes: PHOTO,
        groups: { psii: ['p680', 'p680x', 'pheo', 'qa'], pq: ['pq'], cytb6f: ['fes', 'f'], pc: ['pc'], psi: ['p700', 'p700x', 'a0', 'a1', 'fx', 'fb'], fd: ['fd'], fnr: ['fnr', 'nadp'] },
        resp: [],
        lines: [['h2o', 'p680', 'dash'], ['p680', 'p680x', 'light'], ['p680x', 'pheo'], ['pheo', 'qa'], ['qa', 'pq'], ['pq', 'fes'], ['fes', 'f'], ['f', 'pc'], ['pc', 'p700'], ['p700', 'p700x', 'light'],
            ['p700x', 'a0'], ['a0', 'a1'], ['a1', 'fx'], ['fx', 'fb'], ['fb', 'fd'], ['fd', 'fnr'], ['fnr', 'nadp'], ['fd', 'pq', 'dash']],
    },
    // the crista: complexes I to IV, ubiquinone and cytochrome c; β-oxidation's electrons enter through ETF,
    // beside complex II (its label to the left, II's to the right)
    cristae: {
        nodes: { nadh: [0.8, -0.32, 'NADH'], ci: [2.4, -0.2, 'I'], succ: [2.4, 0.031, 'II'], etf: [2.4, -0.025, 'ETF'], uq: [4.2, 0.045, 'UQ'], ciii: [6.0, 0.28, 'III'], c: [7.8, 0.254, 'cyt c'], civ: [9.6, 0.385, 'IV'], o2: [11.6, 0.816, 'O₂'] },
        groups: { ndh1: ['nadh', 'ci'], sdh: ['succ'], pq: ['uq'], cytb6f: ['ciii'], pc: ['c'], cytOx: ['civ', 'o2'] },
        resp: ['nadh', 'ci', 'succ', 'etf', 'uq', 'ciii', 'c', 'civ', 'o2'],
        lines: [['nadh', 'ci', 'resp'], ['ci', 'uq', 'resp'], ['succ', 'uq', 'resp'], ['etf', 'uq', 'resp'], ['uq', 'ciii', 'resp'], ['ciii', 'c', 'resp'], ['c', 'civ', 'resp'], ['civ', 'o2', 'resp']],
    },
    // the halophile: its respiratory chain (menaquinone, cyt bc, halocyanin, cyt ba₃); bacteriorhodopsin moves no electron
    purple: {
        nodes: { nadh: [0.8, -0.32, 'NADH'], ndh: [2.4, -0.2, 'NDH'], succ: [2.4, 0.031, 'SDH'], mk: [4.2, -0.07, 'MK'], bc: [6.0, 0.28, 'bc'], hc: [7.8, 0.2, 'HC'], ba3: [9.6, 0.385, 'ba₃'], o2: [11.6, 0.816, 'O₂'] },
        groups: { ndh1: ['nadh', 'ndh'], sdh: ['succ'], pq: ['mk'], cytb6f: ['bc'], pc: ['hc'], cytOx: ['ba3', 'o2'] },
        resp: ['nadh', 'ndh', 'succ', 'mk', 'bc', 'hc', 'ba3', 'o2'],
        lines: [['nadh', 'ndh', 'resp'], ['ndh', 'mk', 'resp'], ['succ', 'mk', 'resp'], ['mk', 'bc', 'resp'], ['bc', 'hc', 'resp'], ['hc', 'ba3', 'resp'], ['ba3', 'o2', 'resp']],
    },
};
/** Whether a specimen's membrane has a chain to draw. */
export const hasLadder = (specId) => specId in SETS;
const E0 = -1.45, E1 = 1.3;

let _cache = null, _key = '';

/** Draw the ladder into its canvas. */
export function drawLadder(cv) {
    const set = SETS[Membrane.specId];
    if (!cv || !cv.offsetWidth || !set) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.offsetWidth, h = cv.offsetHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d'), P = K.P;
    const x0 = 52, x1 = w - 46, y0 = 10, y1 = h - 12, cols = Math.max(...Object.values(set.nodes).map(n => n[0]), 1);
    const X = (col) => x0 + (x1 - x0) * col / cols, Y = (E) => y0 + (y1 - y0) * (E - E0) / (E1 - E0);
    // The still part: axis, paths and carriers, painted once per size, theme and specimen
    const key = [w, h, dpr, P.dark, Membrane.specId].join();
    if (key !== _key) {
        _cache = _cache || document.createElement('canvas');
        _cache.width = cv.width; _cache.height = cv.height;
        const g = _cache.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
        g.font = `10.5px ${_FONT.text}`; g.textBaseline = 'middle'; g.textAlign = 'right';
        for (const E of [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2]) {
            g.fillStyle = K.rgba(P.text, 0.07); g.fillRect(x0 - 4, Math.round(Y(E)), x1 - x0 + 30, 1);
            g.fillStyle = P.muted; g.fillText((E > 0 ? '+' : E < 0 ? '−' : '') + Math.abs(E).toFixed(1), x0 - 8, Y(E));
        }
        g.save(); g.translate(8, (y0 + y1) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.font = `italic 10.5px ${_FONT.text}`;
        g.fillText('E′₀ (V)', 0, 0); g.restore();
        const N = set.nodes, resp = K.ink('indigo');
        for (const [a, b, kind] of set.lines) {
            const A = N[a], B = N[b];
            if (kind === 'light') {
                // a photon lifts the electron: a wiggle the height of the jump
                const px = X(A[0]), ya = Y(A[1]) - 4, yb = Y(B[1]) + 7;
                g.strokeStyle = K.ink('ochre'); g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath();
                for (let yy = ya; yy >= yb; yy -= 1) { const xx = px + 2.6 * Math.sin((ya - yy) / 5.5 * Math.PI); yy === ya ? g.moveTo(xx, yy) : g.lineTo(xx, yy); }
                g.stroke(); g.beginPath(); g.moveTo(px - 3.5, yb + 5); g.lineTo(px, yb); g.lineTo(px + 3.5, yb + 5); g.stroke();
                continue;
            }
            g.strokeStyle = kind === 'resp' ? resp : K.rgba(P.text, kind === 'dash' ? 0.4 : 0.55); g.lineWidth = 1.1;
            if (kind === 'dash') g.setLineDash([3, 3]);
            g.beginPath(); g.moveTo(X(A[0]), Y(A[1])); g.lineTo(X(B[0]), Y(B[1])); g.stroke(); g.setLineDash([]);
        }
        g.font = `italic 10.5px ${_FONT.text}`;
        // Fd's label above its bar and FNR's below, so the dashed lines plainly leave Fd's
        const right = new Set(['p680', 'p680x', 'p700', 'p700x', 'h2o', 'nadp', 'o2', 'ndh', 'succ', 'cox']), up = new Set(['pc', 'fes', 'a1', 'fb', 'fd', 'nadh', 'ciii', 'c', 'civ', 'bc', 'hc', 'ba3', 'mk', 'uq']), left = new Set(['pq', 'qa', 'etf']);
        for (const [k, [col, E, name]] of Object.entries(N)) {
            const px = X(col), py = Y(E), r = set.resp.includes(k);
            g.strokeStyle = r ? resp : P.text; g.lineWidth = 2; g.beginPath(); g.moveTo(px - 5, py); g.lineTo(px + 5, py); g.stroke();
            g.fillStyle = r ? resp : P.text2;
            if (right.has(k)) { g.textAlign = 'left'; g.fillText(name, px + 7, py); }
            else if (left.has(k)) { g.textAlign = 'right'; g.fillText(name, px - 7, py); }
            else { g.textAlign = 'center'; g.fillText(name, px, py + (up.has(k) ? -9 : 10)); }
        }
        _key = key;
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(_cache, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The beads: each electron in flight, at the carrier it has reached
    for (const e of Particles.electrons) {
        const path = [], starts = [];
        // a chain that starts at FNR is FNR run backward: its electron comes from NADPH
        for (const [i, k] of e.keys.entries()) { starts.push(path.length); const g = set.groups[k] || []; path.push(...(i === 0 && k === 'fnr' ? [...g].reverse() : g)); }
        if (path.length < 2) continue;
        const n = e.keys.length - 1, u = Math.min(0.9999, e.progress) * n, si = Math.floor(u), f = u - si;
        // the last segment runs through the terminal group, unless the chain closes on its start (cyclic flow)
        const end = e.keys[0] === e.keys[n] ? starts[n] : path.length - 1;
        const a = starts[si], b = si + 1 < n ? starts[si + 1] : end, idx = a + (b - a) * f;
        const i0 = Math.min(path.length - 1, Math.floor(idx)), i1 = Math.min(path.length - 1, i0 + 1), fr = idx - i0;
        const A = set.nodes[path[i0]], B = set.nodes[path[i1]];
        if (!A || !B) continue;
        const px = X(A[0] + (B[0] - A[0]) * fr), py = Y(A[1] + (B[1] - A[1]) * fr), r = e.type === 'resp';
        c.beginPath(); c.arc(px, py, 3.3, 0, TAU); c.fillStyle = P.canvas; c.fill(); c.lineWidth = 1.3; c.strokeStyle = r ? K.ink('indigo') : P.text; c.stroke();
    }
}
