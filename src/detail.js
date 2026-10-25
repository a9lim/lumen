// Detail — what the cross-section shows once zoomed in past about 2.5×: the
// cofactors inside each complex, where its electrons actually sit, and its
// subunits' names. The electron's road runs through the same sites, so at any
// zoom an electron steps from cofactor to cofactor (Mn₄CaO₅, P680, pheophytin,
// Qᴀ, Qʙ; the Rieske cluster and heme f; P700, A₀, A₁ and the iron–sulfur
// clusters), instead of sliding from one complex's centre to the next.
// Positions are nm about each complex's centre and the membrane midline (−y the
// lumen), approximate, after the published structures cut through the middle.
import * as K from './complexes.js';

const TAU = Math.PI * 2;

/** A complex's cofactors in electron order: [kind, dx, dy, name]. variant picks the organism's form. */
function sitesOf(key, v) {
    switch (key) {
        case 'psii': return [['mn', 5.4, -2.4, 'Mn₄CaO₅'], ['chl2', 4.1, -1.0, 'P680'], ['pheo', 4.7, 0.3, 'Pheo'], ['q', 3.2, 1.6, 'Qᴀ'], ['q', 4.9, 1.75, 'Qʙ']];
        case 'cytb6f': return v.bc1
            ? [['fes', -1.3, -3.2, 'Rieske FeS'], ['heme', -3.4, -3.5, 'cyt c₁'], ['heme', -1.9, -0.9, 'bʟ'], ['heme', -1.9, 1.0, 'bʜ']]
            : [['fes', -1.2, -3.4, 'Rieske FeS'], ['heme', -3.3, -5.0, 'heme f'], ['heme', -1.9, -0.9, 'bʟ'], ['heme', -1.9, 1.0, 'bʜ']];
        case 'psi': {
            const x = v.psiTrimer ? -5 : 4;
            return [['chl2', x, -1.6, 'P700'], ['chl', x - 0.7, -0.5, 'A₀'], ['q', x - 1.25, 0.6, 'A₁'], ['fes', x, 2.0, 'Fx'], ['fes', x - 0.5, 3.4, 'Fᴀ'], ['fes', x + 0.7, 4.1, 'Fʙ']];
        }
        case 'ndh1': return v.mito
            ? [['flavin', 5.0, 12.0, 'FMN'], ['fes', 6.1, 10.4, 'N3'], ['fes', 6.5, 8.6, ''], ['fes', 6.1, 7.0, ''], ['fes', 5.7, 5.4, ''], ['fes', 5.0, 3.7, 'N2'], ['q', 3.6, 1.7, 'Q']]
            : [['fes', 5.8, 6.6, 'FeS'], ['fes', 5.5, 5.0, ''], ['fes', 5.0, 3.6, 'N2'], ['q', 3.6, 1.7, 'Q']];
        case 'sdh': return [['flavin', 0.6, 6.9, 'FAD'], ['fes', 0.2, 4.7, '2Fe-2S'], ['fes', 0.3, 3.6, ''], ['fes', 0.2, 2.6, '3Fe-4S'], ['q', 0.1, 1.2, 'Q'], ['heme', 0, -0.4, 'b']];
        case 'cytOx': return [['cu', -1.8, -3.9, 'Cuᴀ'], ['heme', -0.9, -0.7, 'a'], ['heme', 0.4, -0.5, 'a₃'], ['cu', 0.9, 0.1, 'Cuʙ']];
        case 'fnr': return [['flavin', 0.3, 4.8, 'FAD']];
        case 'pc': return [['cu', 0, 0, 'Cu']];
        case 'fd': return [['fes', 0, 0, '2Fe-2S']];
    }
    return null;
}

/** Subunit names: [name, dx, dy]. */
function subunitsOf(key, v) {
    switch (key) {
        case 'psii': return [['CP43', 8.2, 0.2], ['D1', 6.1, 1.5], ['D2', 2.3, 0.6], ['CP47', -8.0, 0.2], ['PsbO', 5.6, -4.1]].concat(v.pbs ? [['APC', 0, 10.4], ['PC rods', 0, 16.6]] : []);
        case 'cytb6f': return v.bc1 ? [['cyt b', 2.3, 0.3], ['core 1', 3.1, 4.4], ['core 2', 1.6, 7.4]] : [['cyt f', 3.1, -4.7], ['b₆', 2.5, 0.5]];
        case 'psi': return v.psiTrimer ? [['PsaA', -7.6, -0.6], ['PsaB', -2.4, -0.6], ['PsaC', -4.6, 5.2]] : [['PsaA', 1.6, -0.6], ['PsaB', 6.4, -0.6], ['Lhca', -5, 0]];
        case 'ndh1': return v.mito ? [['membrane arm', -4.2, -0.7], ['matrix arm', 7.6, 9.0]] : [['membrane arm', -4.2, -0.7]];
        case 'sdh': return [['SdhA', 2.2, 7.6], ['SdhB', 2.0, 4.0]];
        case 'cytOx': return [['I', 0.2, 1.4], ['II', -2.6, -4.8], ['III', 2.6, 0.6]];
        case 'atpSyn': return [['c-ring', 0, 0], ['a', 4.2, 0], ['γ', 0.4, 6.4], ['α₃β₃', 0, 13.3], ['δ', 3.3, 17.6], ['b₂', 6.4, 8.5]];
        case 'nnt': return [['dI', -3.6, 4.6], ['dIII', 3.6, 4.6]];
    }
    return null;
}

/** The specimen's variants of each complex. */
export function variant(spec, specId) {
    return { bc1: spec.frame === 'cristae' || spec.frame === 'slayer', mito: specId === 'cristae', psiTrimer: spec.psiTrimer, pbs: spec.antenna === 'phycobilisome' };
}

/** The electron's waypoints through a complex, world px: its cofactors in order (or its centre). */
export function waypoints(key, p, mid, s, v) {
    const list = sitesOf(key, v);
    if (!list) return [[p.x, p.y]];
    // the b hemes sit off this road (the Q-cycle's other branch, complex II's side heme)
    return list.filter(q => !['bʟ', 'bʜ', 'b'].includes(q[3])).map(q => [p.x + q[1] * s, (key === 'pc' || key === 'fd' ? p.y : mid) + q[2] * s]);
}

function cofactor(c, s, k) {
    const lw = Math.max(0.8, 0.12 * s);
    c.lineJoin = 'round';
    if (k === 'chl' || k === 'chl2' || k === 'pheo') {
        const g = K.tones(K.ink('viridian'));
        for (const dx of k === 'chl2' ? [-0.42, 0.42] : [0]) {
            c.save(); c.translate(dx * s, 0); c.rotate(Math.PI / 4);
            c.beginPath(); c.roundRect(-0.4 * s, -0.4 * s, 0.8 * s, 0.8 * s, 0.18 * s); c.fillStyle = g.t[1]; c.fill(); c.lineWidth = lw; c.strokeStyle = g.line; c.stroke();
            if (k !== 'pheo') { c.beginPath(); c.arc(0, 0, 0.13 * s, 0, TAU); c.fillStyle = g.line; c.fill(); }
            c.restore();
        }
    } else if (k === 'q') {
        const o = K.tones(K.ink('ochre'));
        c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; c.lineTo(Math.cos(a) * 0.42 * s, Math.sin(a) * 0.42 * s); } c.closePath();
        c.fillStyle = o.t[1]; c.fill(); c.lineWidth = lw; c.strokeStyle = o.line; c.stroke();
    } else if (k === 'fes' || k === 'mn') {
        // a cubane in oblique: front face, top and side
        const t = K.tones(K.ink(k === 'mn' ? 'violet' : 'sienna')), a = 0.36 * s, d = 0.2 * s;
        c.beginPath(); c.rect(-a, -a + d, 2 * a - d, 2 * a - d); c.fillStyle = t.t[0]; c.fill();
        c.beginPath(); c.moveTo(-a, -a + d); c.lineTo(-a + d, -a); c.lineTo(a, -a); c.lineTo(a, a - d); c.lineTo(a - d, a); c.lineTo(a - d, -a + d); c.closePath(); c.fillStyle = t.t[2]; c.fill();
        c.lineWidth = lw; c.strokeStyle = t.line; c.beginPath(); c.rect(-a, -a + d, 2 * a - d, 2 * a - d);
        c.moveTo(-a, -a + d); c.lineTo(-a + d, -a); c.lineTo(a, -a); c.lineTo(a, a - d); c.lineTo(a - d, a); c.moveTo(a - d, -a + d); c.lineTo(a, -a); c.stroke();
    } else if (k === 'heme') {
        // a porphyrin edge-on, with its iron
        const t = K.tones(K.ink('umber'));
        c.beginPath(); c.roundRect(-0.6 * s, -0.16 * s, 1.2 * s, 0.32 * s, 0.14 * s); c.fillStyle = t.t[1]; c.fill(); c.lineWidth = lw; c.strokeStyle = t.line; c.stroke();
        c.beginPath(); c.arc(0, 0, 0.15 * s, 0, TAU); c.fillStyle = t.line; c.fill();
    } else if (k === 'flavin') {
        const t = K.tones(K.ink('madder'));
        c.beginPath(); for (const bx of [-0.52, 0, 0.52]) { c.moveTo((bx + 0.3) * s, 0); c.ellipse(bx * s, 0, 0.3 * s, 0.36 * s, 0, 0, TAU); } c.fillStyle = t.t[1]; c.fill(); c.lineWidth = lw; c.strokeStyle = t.line; c.stroke();
    } else if (k === 'cu') {
        const t = K.tones(K.ink('prussian'));
        c.beginPath(); c.arc(0, 0, 0.3 * s, 0, TAU); c.fillStyle = t.t[0]; c.fill(); c.lineWidth = lw; c.strokeStyle = t.line; c.stroke();
    }
}

/**
 * The detail layer, over the membrane: cofactors and names, fading in from
 * 2.2× to 2.6× zoom. Text keeps its size on screen.
 */
export function drawDetail(c, M, zoom) {
    const a = Math.min(1, Math.max(0, (zoom - 2.2) / 0.4));
    if (a <= 0) return;
    const s = M.s, v = variant(M.spec, M.specId), fs = 11.5 / zoom, P = K.P;
    c.save(); c.globalAlpha = a;
    const names = [];
    for (const it of M.items) {
        const k = it.key, p = M.pos[k];
        if (!p || k === 'pc' || k === 'fd') continue;
        for (const [kind, dx, dy, name] of sitesOf(k, v) || []) {
            const x = p.x + dx * s, y = M.mid + dy * s;
            c.save(); c.translate(x, y); cofactor(c, s, kind); c.restore();
            if (name) names.push([name, x + 0.62 * s, y, 'site']);
        }
        for (const [name, dx, dy] of subunitsOf(k, v) || []) names.push([name, p.x + dx * s, M.mid + dy * s, 'sub']);
    }
    if (M.tip) for (const d of M.tip.dimer) for (const [name, dx, dy] of subunitsOf('atpSyn', v)) {
        const cs = Math.cos(d.rot), sn = Math.sin(d.rot);
        names.push([name, d.x + (dx * cs - dy * sn) * s, d.y + (dx * sn + dy * cs) * s, 'sub']);
    } else if (M.pos.atpSyn) for (const [name, dx, dy] of subunitsOf('atpSyn', v)) names.push([name, M.pos.atpSyn.x + dx * s, M.mid + dy * s, 'sub']);
    c.lineJoin = 'round'; c.textBaseline = 'middle';
    for (const [name, x, y, kind] of names) {
        c.font = kind === 'sub' ? `italic ${fs}px ${_FONT.text}` : `${fs * 0.88}px ${_FONT.text}`;
        c.textAlign = kind === 'sub' ? 'center' : 'left';
        c.lineWidth = 3 / zoom; c.strokeStyle = K.rgba(P.canvas, 0.85); c.strokeText(name, x, y);
        c.fillStyle = kind === 'sub' ? P.text : P.text2; c.fillText(name, x, y);
    }
    c.restore();
}

/** The loaded carriers' own cofactors (plastocyanin's copper, ferredoxin's cluster), over the carriers. */
export function drawCarrierSites(c, M, zoom, riding) {
    const a = Math.min(1, Math.max(0, (zoom - 2.2) / 0.4));
    if (a <= 0 || !riding.length) return;
    c.save(); c.globalAlpha = a;
    for (const [k, x, y] of riding) if (k !== 'pq') { c.save(); c.translate(x, y); cofactor(c, M.s, k === 'pc' ? 'cu' : 'fes'); c.restore(); }
    c.restore();
}
