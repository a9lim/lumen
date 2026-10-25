// Complexes — the membrane's proteins and small molecules, in David
// Goodsell's register: each protein is an assembly of its subunits drawn as
// one molecule (a dark silhouette, flat tones of one ink, a lighter seam
// where chains meet, no gloss), at roughly true relative size, after the
// published structures cut through the middle. Every shape draws at the local
// origin, the membrane midline under the complex's centre; y grows toward the
// stroma, matrix or cytoplasm (down) and shrinks toward the lumen (up). The
// caller translates and, on curved membranes, rotates. `s` is px per nm.

const TAU = Math.PI * 2;

// ─── Colour ───
const _rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function mix(a, b, t) {
    const x = _rgb(a), y = _rgb(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export function rgba(h, a) { const [r, g, b] = _rgb(h); return `rgba(${r},${g},${b},${a})`; }

/** The palette the scene draws with, rebuilt on theme change. */
export const P = { dark: false, canvas: '#FCFCFB', text: '#161514', text2: '#42413F', muted: '#666463', accent: '#983432', inks: {} };
export function readPalette() {
    const T = _themePalette();
    P.dark = T === _PALETTE.dark;
    P.canvas = T.canvas; P.text = T.text; P.text2 = T.textSecondary; P.muted = T.textMuted;
    P.accent = T.accent; P.panel = T.panelSolid; P.inks = T.inks;
    _toneCache.clear();
}
export const ink = (n) => P.inks[n];

/**
 * Goodsell's flat watercolour for an ink: three subunit tones (t[0] the body,
 * t[1] darker, t[2] paler), the silhouette's outline, the lighter seam where
 * subunits meet, and a dark fill for a reduced or charged small molecule.
 */
const _toneCache = new Map();
export function tones(base) {
    let s = _toneCache.get(base);
    if (!s) {
        const d = P.dark;
        s = {
            t: [mix(base, P.canvas, d ? 0.20 : 0.40), mix(base, P.canvas, d ? 0.06 : 0.26), mix(base, P.canvas, d ? 0.34 : 0.56)],
            line: d ? mix(base, '#000000', 0.58) : mix(base, '#1a1410', 0.52),
            seam: d ? mix(base, '#000000', 0.30) : mix(base, '#1a1410', 0.16),
            dark: d ? mix(base, '#000000', 0.2) : mix(base, '#1a1410', 0.3),
        };
        _toneCache.set(base, s);
    }
    return s;
}

// ─── Assemblies ───
function smoothClosed(c, pts) {
    const n = pts.length;
    c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    c.closePath();
}
/** A lumpy closed outline about (x, y), turned by rot. */
function lumpy(x, y, rx, ry, seed, rot) {
    const pts = [], cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < 22; i++) {
        const a = i / 22 * TAU;
        const r = 1 + 0.8 * (0.07 * Math.sin(2 * a + seed * 1.7) + 0.05 * Math.sin(3 * a + seed * 2.3) + 0.035 * Math.sin(5 * a + seed * 3.1));
        const px = rx * r * Math.cos(a), py = ry * r * Math.sin(a);
        pts.push([x + px * cr - py * sr, y + px * sr + py * cr]);
    }
    return pts;
}

/**
 * An assembly of subunits drawn as one molecule: every subunit stroked thick
 * in the outline, then filled over in its tone with a thin seam, so the
 * silhouette is dark and the joins between chains light. parts are
 * [dx, dy, rx, ry, rot°, tone, ink?] in nm; ink overrides the base.
 */
export function assembly(c, s, parts, base, seed = 1) {
    const paths = parts.map((p, i) => { const pa = new Path2D(); smoothClosed(pa, lumpy(p[0] * s, p[1] * s, p[2] * s, p[3] * s, seed + i * 1.37, (p[4] || 0) * Math.PI / 180)); return pa; });
    const lw = Math.max(0.8, 0.17 * s), sw = Math.max(0.5, 0.09 * s);
    c.lineJoin = 'round';
    for (let i = 0; i < parts.length; i++) { c.lineWidth = lw * 2; c.strokeStyle = tones(parts[i][6] ? ink(parts[i][6]) : base).line; c.stroke(paths[i]); }
    for (let i = 0; i < parts.length; i++) {
        const t = tones(parts[i][6] ? ink(parts[i][6]) : base);
        c.fillStyle = t.t[parts[i][5] || 0]; c.fill(paths[i]);
        c.lineWidth = sw; c.strokeStyle = t.seam; c.stroke(paths[i]);
    }
}

// Part lists, nm about the midline under the complex's centre (− is the lumen).
// half() mirrors one half of a symmetric dimer.
const half = (parts) => parts.concat(parts.map(p => [-p[0], p[1], p[2], p[3], -(p[4] || 0), p[5], p[6]]));
export const PARTS = {
    // PSII dimer: per monomer CP43 · D1 · D2 · CP47 (mirrored), PsbO, cyt c₅₅₀ and PsbU on the lumenal face
    psii: half([[-8.2, 0.2, 2.1, 2.9, 0, 0], [-5.3, 0.1, 1.5, 2.8, 4, 1], [-2.9, 0.2, 1.5, 2.8, -4, 2], [-0.8, 0.3, 1.0, 2.6, 0, 0],
        [-5.6, -4.1, 2.3, 1.55, 6, 0, 'violet'], [-2.6, -4.4, 1.25, 1.1, 0, 2, 'violet'], [-8.0, -3.5, 1.1, 0.9, 0, 1, 'violet'], [-4.8, 3.0, 2.6, 0.75, 0, 2]]),
    // LHCII trimer, cut through
    lhcii: [[-2.3, 0.1, 1.35, 2.6, 0, 0], [0, 0.2, 1.3, 2.5, 0, 1], [2.3, 0.1, 1.35, 2.6, 0, 2], [0, -2.9, 2.6, 0.55, 0, 2], [0, 2.9, 2.2, 0.5, 0, 2]],
    // PSI as a cyanobacterial trimer cut through two monomers: PsaA, PsaB, and each stromal ridge (PsaC, D, E)
    psiTrimer: [[-7.4, 0.1, 2.6, 2.9, 0, 0], [-2.6, 0.1, 2.5, 2.9, 0, 1], [2.6, 0.1, 2.5, 2.9, 0, 0], [7.4, 0.1, 2.6, 2.9, 0, 1], [0, 0.2, 0.9, 2.5, 0, 2],
        [-9.6, -2.8, 1.4, 0.8, 0, 2], [9.6, -2.8, 1.4, 0.8, 0, 2],
        [-4.6, 3.6, 1.2, 1.1, 0, 2], [-6.5, 3.4, 1.6, 1.0, 0, 1], [-2.8, 3.6, 1.2, 0.85, 0, 0],
        [5.4, 3.5, 1.15, 1.0, 0, 2], [3.6, 3.3, 1.4, 0.9, 0, 1], [7.2, 3.4, 1.1, 0.8, 0, 0]],
    // PSI as a plant monomer with its LHCI belt
    psiPlant: [[1.6, 0.1, 2.6, 2.9, 0, 0], [6.4, 0.1, 2.5, 2.9, 0, 1], [4.0, -2.8, 1.5, 0.8, 0, 2], [3.2, 3.6, 1.2, 1.1, 0, 2], [1.3, 3.4, 1.6, 1.0, 0, 1], [5.0, 3.6, 1.2, 0.85, 0, 0],
        [-3.0, 0.1, 1.9, 2.5, 0, 2, 'sap'], [-6.9, 0.1, 1.9, 2.5, 0, 0, 'sap']],
    // Cyt b₆f dimer: the b₆/subIV core, cyt f standing in the lumen, the Rieske head between
    b6f: half([[-2.5, 0.1, 2.2, 2.8, 0, 0], [-0.7, 0.2, 0.9, 2.6, 0, 1], [-3.1, -4.7, 1.25, 2.3, -8, 2], [-1.2, -3.4, 1.1, 0.85, 0, 1], [-2.4, 3.2, 1.6, 0.7, 0, 2]]),
    // Complex III (cyt bc₁) dimer: cyt b, cyt c₁ and the Rieske head on the lumenal side, the core proteins deep in the matrix
    bc1: half([[-2.3, 0.2, 2.1, 2.8, 0, 0], [-0.6, 0.2, 0.9, 2.6, 0, 1], [-3.4, -3.5, 1.5, 1.3, 0, 2], [-1.3, -3.2, 1.1, 0.85, 0, 1],
        [-3.1, 4.4, 2.3, 1.8, 0, 1], [-1.6, 7.4, 2.5, 1.9, 0, 0]]),
    fnr: [[0, 4.6, 2.5, 2.0, 0, 0], [1.2, 5.6, 1.4, 1.2, 0, 1]],
    // NDH-1: the membrane arm's modules under the transverse helix, a short hydrophilic arm
    ndh1: [[-7.6, 0.1, 1.8, 2.7, 0, 0], [-4.2, 0.1, 1.8, 2.7, 0, 1], [-0.8, 0.1, 1.8, 2.7, 0, 0], [2.4, 0.1, 1.6, 2.7, 0, 2], [5.2, 0.1, 1.6, 2.6, 0, 1],
        [-2.6, 2.7, 6.2, 0.45, 0, 2], [5.4, 4.0, 2.2, 1.6, 0, 0], [5.8, 6.6, 2.4, 1.4, 0, 2]],
    // Complex I: the same membrane arm, and the long matrix arm (Q and N modules)
    complexI: [[-7.6, 0.1, 1.8, 2.7, 0, 0], [-4.2, 0.1, 1.8, 2.7, 0, 1], [-0.8, 0.1, 1.8, 2.7, 0, 0], [2.4, 0.1, 1.6, 2.7, 0, 2], [5.2, 0.1, 1.6, 2.6, 0, 1],
        [-2.6, 2.7, 6.2, 0.45, 0, 2], [5.6, 4.2, 2.4, 1.7, 0, 0], [6.2, 7.2, 2.7, 1.8, 6, 2], [6.6, 10.4, 2.5, 1.6, 0, 1], [4.6, 12.4, 1.6, 1.2, 0, 0]],
    // Complex II: two anchors in the membrane, the iron–sulfur subunit, the flavoprotein
    sdh: [[-0.9, 0.1, 1.3, 2.7, 0, 0], [1.0, 0.2, 1.2, 2.6, 0, 2], [0.2, 4.0, 2.2, 1.3, 0, 1], [0.6, 6.9, 2.9, 1.9, 0, 0]],
    // Cyt c oxidase: subunits I and III, subunit II with its Cuᴀ domain on the lumenal side
    cytOx: [[-0.6, 0.0, 2.5, 2.8, 0, 0], [2.6, 0.1, 1.5, 2.7, 0, 1], [-3.0, 0.1, 0.9, 2.6, 0, 2], [-1.8, -3.9, 2.1, 1.35, 0, 2], [1.4, 3.1, 1.6, 0.7, 0, 1]],
    // NNT dimer: the transmembrane domains, and the NAD(H) and NADP(H) binding domains
    nnt: [[-2.2, 0.1, 2.1, 2.8, 0, 0], [2.2, 0.1, 2.1, 2.8, 0, 1], [-2.6, 4.6, 1.9, 1.7, 0, 2], [2.6, 4.6, 1.9, 1.7, 0, 0], [0, 6.9, 1.6, 1.2, 0, 1]],
    ucp: [[0, 0, 1.6, 2.9, 0, 0]],
};

export const psii = (c, s) => assembly(c, s, PARTS.psii, ink('sap'), 3);
export const lhcii = (c, s, n) => assembly(c, s, PARTS.lhcii, mix(ink('sap'), P.canvas, 0.15), 17 + n);
export const psi = (c, s, trimer) => assembly(c, s, trimer ? PARTS.psiTrimer : PARTS.psiPlant, ink('viridian'), 9);
export const b6f = (c, s, bc1) => assembly(c, s, bc1 ? PARTS.bc1 : PARTS.b6f, ink('prussian'), 7);
export const fnr = (c, s) => assembly(c, s, PARTS.fnr, ink('umber'), 11);
export const ndh1 = (c, s, mito) => assembly(c, s, mito ? PARTS.complexI : PARTS.ndh1, ink('indigo'), 5);
export const sdh = (c, s) => assembly(c, s, PARTS.sdh, ink('violet'), 12);
export const cytOx = (c, s) => assembly(c, s, PARTS.cytOx, ink('verdigris'), 8);
export const nnt = (c, s) => assembly(c, s, PARTS.nnt, ink('madder'), 14);
export const ucp = (c, s) => assembly(c, s, PARTS.ucp, ink('sienna'), 15);

/** Cyanobacterial phycobilisome: rods as stacks of phycocyanin discs fanning from an allophycocyanin core. */
export function phycobilisome(c, s) {
    const rod = tones(ink('indigo')), core = tones(ink('prussian')), lw = Math.max(0.7, 0.15 * s);
    for (const a of [-62, -31, 0, 31, 62]) {
        const r = a * Math.PI / 180, ux = Math.sin(r), uy = Math.cos(r);
        for (let k = 2; k >= 0; k--) {
            const d = 10.2 + k * 2.55;
            c.save(); c.translate(ux * d * s, (6.6 + uy * d) * s); c.rotate(-r);
            c.beginPath(); c.roundRect(-2.8 * s, -1.125 * s, 5.6 * s, 2.25 * s, 1.0 * s);
            c.fillStyle = rod.t[k === 0 ? 0 : k === 1 ? 2 : 1]; c.fill(); c.lineWidth = lw; c.strokeStyle = rod.line; c.stroke();
            c.restore();
        }
    }
    for (const [x, y] of [[0, 10.4], [-3.0, 6.4], [3.0, 6.4]]) {
        c.beginPath(); c.arc(x * s, y * s, 2.55 * s, 0, TAU); c.fillStyle = core.t[0]; c.fill(); c.lineWidth = lw; c.strokeStyle = core.line; c.stroke();
        c.beginPath(); c.arc(x * s, y * s, 1.1 * s, 0, TAU); c.fillStyle = core.t[2]; c.fill(); c.lineWidth = Math.max(0.5, 0.09 * s); c.strokeStyle = core.seam; c.stroke();
    }
}

/** Bacteriorhodopsin trimers in their hexagonal lattice, cut through: pairs of seven-helix bundles, each with its retinal. */
export function brPatch(c, s, n) {
    const b = ink('violet'), w = WIDTH_BR / n, ret = tones(ink('mulberry')).line;
    for (let i = 0; i < n; i++) {
        const x = -WIDTH_BR / 2 + w * (i + 0.5);
        assembly(c, s, [[x - 1.45, 0.1, 1.45, 2.6, 0, i % 2 ? 0 : 1], [x + 1.45, 0.1, 1.45, 2.6, 0, i % 2 ? 1 : 0], [x, -2.7, 2.2, 0.45, 0, 2], [x, 2.75, 2.0, 0.42, 0, 2]], b, 16 + i * 0.7);
        // Retinal, the chromophore that makes the membrane purple, across the middle of each bundle
        c.strokeStyle = ret; c.lineWidth = Math.max(0.8, 0.2 * s); c.lineCap = 'round';
        for (const dx of [-1.45, 1.45]) { c.beginPath(); c.moveTo((x + dx - 0.55) * s, -0.5 * s); c.lineTo((x + dx + 0.45) * s, 0.45 * s); c.stroke(); }
    }
}
const WIDTH_BR = 33;

// ─── ATP synthase ───
/** The stator's membrane part: the a subunit and the peripheral stalk (b₂) up to the head. */
export function atpStator(c, s, atype = false) {
    const m = ink('mulberry'), t = tones(m);
    assembly(c, s, [[4.2, 0.1, 1.35, 2.7, 0, 1]], m, 12);
    c.fillStyle = t.dark; c.beginPath(); c.roundRect(4.55 * s, 2.4 * s, 0.75 * s, 15.6 * s, 0.35 * s); c.fill();
    // An archaeal A-type synthase holds its head with two peripheral stalks, not one
    if (atype) { c.beginPath(); c.roundRect(-5.3 * s, 2.4 * s, 0.75 * s, 15.6 * s, 0.35 * s); c.fill(); }
}

/** The rotor at angle phase: the c-ring (n subunits, the cell's) and the bent central stalk, γ and ε. */
export function atpRotor(c, s, phase, n = 12) {
    // n c subunits, the ring's radius growing with them (about 2.4 nm for c8, 3.1 for c14)
    const t = tones(ink('mulberry')), lw = Math.max(0.6, 0.13 * s), r = 1.55 + 0.11 * n, h = 4.4, ring = [];
    for (let k = 0; k < n; k++) { const th = phase + k * TAU / n; ring.push({ x: r * Math.sin(th), w: Math.abs(Math.cos(th)), z: Math.cos(th) }); }
    ring.sort((a, b) => a.z - b.z);
    for (const q of ring) {
        const wd = (0.3 + 0.72 * q.w) * s;
        c.beginPath(); c.roundRect(q.x * s - wd / 2, -h / 2 * s, wd, h * s, 0.4 * s);
        c.fillStyle = q.z < 0 ? t.t[2] : t.t[0]; c.fill(); c.lineWidth = lw; c.strokeStyle = t.line; c.stroke();
    }
    const sw = 0.55 * Math.sin(phase);
    c.lineCap = 'round'; c.strokeStyle = t.line; c.lineWidth = 1.05 * s;
    c.beginPath(); c.moveTo(0, 2.0 * s); c.bezierCurveTo(sw * s, 4.5 * s, -sw * s, 7 * s, 0, 10.5 * s); c.stroke();
    c.strokeStyle = t.t[1]; c.lineWidth = 0.55 * s; c.stroke();
    c.beginPath(); c.ellipse(1.15 * Math.sin(phase) * s, 3.2 * s, (0.45 + 0.4 * Math.abs(Math.cos(phase))) * s, 0.65 * s, 0, 0, TAU);
    c.fillStyle = t.t[2]; c.fill(); c.lineWidth = lw; c.strokeStyle = t.line; c.stroke();
}

/**
 * The α₃β₃ head, showing Boyer's binding change. step is the ATP made so far
 * (a third of a turn each) and f the rotor's way into the next third. Each
 * front β swings between its states with f: open (out, empty), loose (ADP
 * and Pᵢ), tight (closed on ATP); from tight to open it lets the ATP go.
 */
export function atpHead(c, s, step, f) {
    const m = ink('mulberry'), hy = 12.8, e = f * f * (3 - 2 * f);
    assembly(c, s, [[-1.6, hy - 0.4, 2.3, 3.7, 0, 2], [1.6, hy - 0.4, 2.3, 3.7, 0, 2]], m, 30);
    const SW = [26, 8, -3], DX = [1.5, 0.35, -0.3];   // swing (°) and shift (nm) of a β in each state
    for (let i = 0; i < 2; i++) {
        const sg = i ? 1 : -1, st = ((step + i) % 3 + 3) % 3, nx = (st + 1) % 3;
        const rot = (SW[st] + (SW[nx] - SW[st]) * e) * sg, dx = DX[st] + (DX[nx] - DX[st]) * e;
        c.save(); c.translate(sg * (3.3 + dx) * s, (hy + 0.2) * s); c.rotate(rot * Math.PI / 180);
        assembly(c, s, [[0, 0, 2.35, 4.0, 0, 1]], m, 31 + i);
        const x = sg * 0.35 * s, y = -0.2 * s;
        if (st === 1) {
            molGlyph(c, x, y, s * 0.78, 'adp', 1, Math.PI / 2);
            const p = tones(ink('ochre')); c.beginPath(); c.arc(x + sg * 0.1 * s, y + 1.75 * s, 0.28 * s, 0, TAU);
            c.fillStyle = p.t[1]; c.fill(); c.lineWidth = Math.max(0.5, 0.09 * s); c.strokeStyle = p.line; c.stroke();
        } else if (st === 2) molGlyph(c, x + sg * e * 2.8 * s, y + e * 1.6 * s, s * 0.78, 'atp', 1 - e * e, Math.PI / 2);
        c.restore();
    }
    assembly(c, s, [[0, hy + 0.5, 2.5, 4.25, 0, 0], [0, hy + 4.9, 1.5, 0.95, 0, 2]], m, 33);
    // δ (OSCP) caps the head and holds the peripheral stalk
    assembly(c, s, [[3.3, hy + 4.6, 1.6, 0.85, 20, 2]], m, 34);
}

// ─── Small molecules and carriers ───
/** Plastoquinone (or ubiquinone, menaquinone): a ring head and an isoprenoid tail; the ring dark while it carries electrons. */
export function quinone(c, s, reduced) {
    const t = tones(ink('ochre'));
    c.strokeStyle = t.line; c.lineWidth = Math.max(0.8, 0.2 * s); c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0.6 * s, 0); for (let k = 1; k <= 6; k++) c.lineTo((0.6 + k * 0.55) * s, (k % 2 ? 0.32 : -0.32) * s); c.stroke();
    c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; c.lineTo(Math.cos(a) * 0.62 * s, Math.sin(a) * 0.62 * s); }
    c.closePath(); c.fillStyle = reduced ? t.line : P.canvas; c.fill(); c.lineWidth = Math.max(0.8, 0.16 * s); c.stroke();
}

/** A small carrier protein (plastocyanin, ferredoxin), darker while loaded. */
export function carrier(c, s, x, y, r, seed, base, loaded) {
    c.save(); c.translate(x, y);
    assembly(c, s, [[0, 0, r, r * 0.88, 0, loaded ? 1 : 2]], base, seed);
    c.restore();
}

/** O₂: two joined atoms. */
export function o2(c, s, x, y, rot) {
    const t = tones(ink('prussian'));
    for (const d of [-0.33, 0.33]) {
        c.beginPath(); c.arc(x + Math.cos(rot) * d * s, y + Math.sin(rot) * d * s, 0.42 * s, 0, TAU);
        c.fillStyle = t.t[2]; c.fill(); c.lineWidth = Math.max(0.5, 0.1 * s); c.strokeStyle = t.line; c.stroke();
    }
}

// ─── The cofactor pools ───
// Pattern before hue: ATP carries three phosphate beads and ADP two; a
// reduced carrier's ring is dark and an oxidised one pale; NADP carries NAD's
// extra 2′-phosphate bead; FAD is a three-lobed flavin.
export const MOL = {
    atp: { ink: 'ochre', n: 3 }, adp: { ink: 'ochre', n: 2 },
    nadh: { ink: 'prussian', red: true }, nad: { ink: 'prussian', red: false },
    nadph: { ink: 'viridian', red: true, p: true }, nadp: { ink: 'viridian', red: false, p: true },
    fadh2: { ink: 'madder', red: true, flavin: true }, fad: { ink: 'madder', red: false, flavin: true },
};
/** Each pool's charged or reduced form and its partner. */
export const POOL_FORMS = { atp: ['atp', 'adp'], nadh: ['nadh', 'nad'], nadph: ['nadph', 'nadp'], fadh2: ['fadh2', 'fad'] };

/** A cofactor about 2 nm long at (x, y), space-filling as Goodsell draws small molecules; s is px per nm. */
export function molGlyph(c, x, y, s, kind, a = 1, rot = 0) {
    const M = MOL[kind], t = tones(ink(M.ink)), lw = Math.max(0.6, 0.11 * s);
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (a < 1) c.globalAlpha *= a;
    c.lineJoin = 'round'; c.strokeStyle = t.line; c.lineWidth = lw;
    const ball = (bx, by, r, fill) => { c.beginPath(); c.arc(bx * s, by * s, r * s, 0, TAU); c.fillStyle = fill; c.fill(); c.stroke(); };
    const body = (bx, by, rx, ry, fill) => { c.beginPath(); c.ellipse(bx * s, by * s, rx * s, ry * s, 0, 0, TAU); c.fillStyle = fill; c.fill(); c.stroke(); };
    const pale = M.red ? t.dark : mix(t.t[2], P.canvas, 0.65);
    if (M.n) {
        // adenosine, then its phosphates in a short curved chain
        for (let k = M.n - 1; k >= 0; k--) ball(0.42 + k * 0.5, (k - 1) * 0.12, 0.3, t.t[1]);
        body(-0.3, 0, 0.62, 0.48, t.t[2]);
    } else if (M.flavin) {
        // the flavin's three lobes, then its adenosine tail
        body(0.95, 0.12, 0.42, 0.34, t.t[2]);
        c.beginPath(); for (const bx of [-0.78, -0.26, 0.26]) { c.moveTo((bx + 0.34) * s, -0.08 * s); c.ellipse(bx * s, -0.08 * s, 0.34 * s, 0.4 * s, 0, 0, TAU); }
        c.fillStyle = pale; c.fill(); c.stroke();
    } else {
        // the adenosine end (NADP's extra phosphate), the diphosphate, the nicotinamide ring
        if (M.p) ball(1.05, 0.5, 0.24, t.t[1]);
        body(0.72, 0, 0.5, 0.42, t.t[2]);
        ball(0.05, -0.12, 0.24, t.t[1]); ball(0.05, 0.3, 0.22, t.t[1]);
        body(-0.66, 0, 0.5, 0.42, pale);
    }
    c.restore();
}
