/* ---------- the transit map: Lumen's own layout (src/maplayout.js, src/map.js) ---------- */
const KC = [16.46, 7.54], KR = 2.6;
const kp = (a) => [KC[0] + KR * Math.cos(a * Math.PI / 180), KC[1] + KR * Math.sin(a * Math.PI / 180)];
const STATIONS = {
  glucose: [1, 3, 'Glucose', 'b'], g6p: [3, 3, 'G6P', 'b', 'hub'], f6p: [5, 3, 'F6P', 'b', 'corr'],
  f16bp: [7, 3, 'F1,6BP', 'b', 'corr'], g3p: [9, 3, 'G3P', 'b', 'corr'], bpg: [11, 3, '1,3-BPG', 'b', 'corr'],
  pga3: [13, 3, '3-PGA', 'b', 'corr'], pga2: [15, 3, '2-PGA', 'b'], pep: [17, 3, 'PEP', 'b'], pyruvate: [19, 3, 'Pyruvate', 'bl', 'hub'],
  pgl6: [3, 1.5, '6-PGL', 'l'], pga6: [4.5, 0, '6-PGA', 't'], r5p: [7, 1, 'R5P', 'tr', 'hub'], rubp: [13, 1, 'RuBP', 't'],
  acetaldehyde: [21, 3, 'Acetaldehyde', 'tr', 'hub'], ethanol: [23, 3, 'Ethanol', 'r'], aceticAcid: [21, 5, 'Acetic acid', 'r'],
  acetylCoA: [19, 5, 'Acetyl-CoA', 'tl', 'hub'],
  fattyAcid: [21, 7, 'Fatty acid', 'l', 'hub'], enoylCoA: [23, 7, 'Enoyl-CoA', 'r'], hydroxyCoA: [23, 9, 'OH-CoA', 'r'], ketoCoA: [21, 9, 'Keto-CoA', 'b'],
  citrate: [...kp(-45), 'Citrate', 'in', 'hub'], isocitrate: [...kp(0), 'Isocitrate', 'in'], akg: [...kp(45), 'α-KG', 'in'],
  succoa: [...kp(90), 'Suc-CoA', 'in'], succinate: [...kp(135), 'Succinate', 'in'], fumarate: [...kp(180), 'Fumarate', 'in'],
  malate: [...kp(225), 'Malate', 'in'], oaa: [...kp(270), 'OAA', 'in'],
};
const LINES = {
  glyc: { ink: 'sienna', name: 'Glycolysis', rev: 'Gluconeogenesis' },
  ppp: { ink: 'madder', name: 'Pentose phosphate' },
  calvin: { ink: 'viridian', name: 'Calvin cycle' },
  pdh: { ink: 'indigo', name: 'Pyruvate dehydrogenase' },
  krebs: { ink: 'prussian', name: 'Krebs cycle' },
  ferm: { ink: 'umber', name: 'Fermentation', rev: 'Ethanol salvage' },
  box: { ink: 'ochre', name: 'β-oxidation', rev: 'Fatty-acid synthesis' },
};
const TRACKS = {
  glyc: { line: 'glyc', pts: ['glucose', 'g6p', 'f6p', 'f16bp', 'g3p', 'bpg', 'pga3', 'pga2', 'pep', 'pyruvate'], off: true, segs: [
    ['g0', 'glucose', 'g6p', 'HK', 'G6Pase'], ['g1', 'g6p', 'f6p', 'PGI'], ['g2', 'f6p', 'f16bp', 'PFK', 'FBPase'], ['g3', 'f16bp', 'g3p', 'ALDO'],
    ['g5', 'g3p', 'bpg', 'GAPDH'], ['g6', 'bpg', 'pga3', 'PGK'], ['g7', 'pga3', 'pga2', 'PGM'], ['g8', 'pga2', 'pep', 'ENO'], ['g9', 'pep', 'pyruvate', 'PK', 'PC + PEPCK']] },
  calvin: { line: 'calvin', pts: ['r5p', 'rubp', 'pga3', 'bpg', 'g3p', 'f16bp', 'f6p', 'r5p'], off: true, closed: true, segs: [
    ['c7', 'r5p', 'rubp', 'PRK'], ['c0', 'rubp', 'pga3', 'RuBisCO'], ['c6', 'pga3', 'bpg', ''], ['c5', 'bpg', 'g3p', ''], ['c3', 'g3p', 'f16bp', ''], ['c2', 'f16bp', 'f6p', ''], ['c10', 'f6p', 'r5p', '']] },
  ppp: { line: 'ppp', pts: ['g6p', [3, 0], [6, 0], 'r5p', 'f6p'], off: true, segs: [
    ['p0', 'g6p', 'pgl6', 'G6PDH'], ['p1', 'pgl6', 'pga6', '6PGL'], ['p2', 'pga6', 'r5p', '6PGDH'], ['p10', 'r5p', 'f6p', 'TKT + TAL', 'TK + SBPase']] },
  pdh: { line: 'pdh', pts: ['pyruvate', 'acetylCoA'], segs: [['pdh', 'pyruvate', 'acetylCoA', 'PDH']] },
  ferm: { line: 'ferm', pts: ['pyruvate', 'acetaldehyde', 'ethanol'], segs: [['pdc', 'pyruvate', 'acetaldehyde', 'PDC'], ['adh', 'acetaldehyde', 'ethanol', 'ADH']] },
  acet: { line: 'ferm', pts: ['acetaldehyde', 'aceticAcid', 'acetylCoA'], segs: [['aldh', 'acetaldehyde', 'aceticAcid', 'ALDH'], ['acs', 'aceticAcid', 'acetylCoA', 'ACS']] },
  kin: { line: 'krebs', pts: ['acetylCoA', 'citrate'], segs: [['kin', 'acetylCoA', 'citrate', 'CS']] },
  krebs: { line: 'krebs', circle: true, segs: [
    ['k0', 'oaa', 'citrate', ''], ['k1', 'citrate', 'isocitrate', 'ACO'], ['k2', 'isocitrate', 'akg', 'IDH'], ['k3', 'akg', 'succoa', 'KGDH'],
    ['k4', 'succoa', 'succinate', 'SCS'], ['k5', 'succinate', 'fumarate', 'SDH'], ['k6', 'fumarate', 'malate', 'FUM'], ['k7', 'malate', 'oaa', 'MDH']] },
  box: { line: 'box', pts: ['fattyAcid', 'enoylCoA', 'hydroxyCoA', 'ketoCoA', 'fattyAcid'], closed: true, segs: [
    ['b0', 'fattyAcid', 'enoylCoA', 'ACAD', 'ACC + ER'], ['b1', 'enoylCoA', 'hydroxyCoA', 'ECH', 'DH'], ['b2', 'hydroxyCoA', 'ketoCoA', 'HACD', 'KR'], ['b3', 'ketoCoA', 'fattyAcid', 'Thiolase', 'KAS']] },
  bspur: { line: 'box', pts: ['fattyAcid', 'acetylCoA'], segs: [['bspur', 'fattyAcid', 'acetylCoA', '']] },
};
const PAIR = { g2: 'c2', g3: 'c3', g5: 'c5', g6: 'c6', p10: 'c10' };
const LOOPS = [
  { line: 'calvin', at: [10, 1.85], name: 'Calvin cycle', times: '×6' },
  { line: 'ppp', at: [4.75, 1.45], name: 'Pentose P', times: '×6' },
  { line: 'krebs', at: [KC[0], KC[1] + 0.1], name: 'Krebs cycle', times: '×2' },
  { line: 'box', at: [22, 8], name: 'β-oxidation', times: '×7' },
  { line: 'glyc', at: [5, 4.2], span: [1, 9], name: 'Glucose ⇌ G3P' },
  { line: 'glyc', at: [14, 4.2], span: [9, 19], name: 'G3P ⇌ pyruvate' },
];
const CO2 = [['c0', [13, 2], [13.7, 2]], ['pdc', [20, 3], [20, 3.62]], ['pdh', [19, 4], [18.35, 4]], ['p2', [5.85, 0.15], [6.4, -0.4]], ['k2', null], ['k3', null]];
const GRID = { x0: 0, x1: 24.6, y0: -0.75, y1: 10.5 };
const KEY_BOX = [1, 5.2, 12.6, 10.4];
const FLIP = new Set(['adh', 'c6', 'c5', 'c3', 'c2', 'c10']);
const LABEL_AT = {
  g0: [0, -0.45], g1: [0, -0.45], g2: [0, -0.45], g3: [0, -0.45], g5: [0, -0.45], g6: [0, -0.45], g7: [0, -0.45], g8: [0, -0.45], g9: [0, -0.45],
  c7: [0, -0.38], c0: [-0.2, 0], p10: { abs: [6.7, 1.95], align: 'left' },
  p0: [-0.25, -0.3], p1: { abs: [2.75, 0.5] }, p2: { abs: [5.35, 0.42] },
  pdh: [0.2, 0.05], pdc: [0, -0.42], adh: [0, 0.42], aldh: [0.2, 0], acs: [0, -0.4], kin: [0.3, 0.12],
  b0: [0, -0.4], b1: [0.22, 0], b2: [0, 0.42], b3: [-0.22, 0],
};
/** Proposed placements that clear today's collisions (FBPase on F6P, TK + SBPase on the corridor, HACD on Keto-CoA). */
const LABEL_AT_P = { p10: { abs: [6.35, 1.62], align: 'left' }, b2: [0.55, 0.42], c7: [0, -0.42], pdh: [0.2, -0.15] };

/** Which pool each enzyme draws on, the way its line is drawn and backward: [kind, n] with + made, − spent. */
const COF = {
  g0: [[['atp', -1]], []], g2: [[['atp', -1]], []], g5: [[['nadh', 2]], [['nadph', -2]]], g6: [[['atp', 2]], [['atp', -2]]], g9: [[['atp', 2]], [['atp', -2]]],
  c7: [[['atp', -1]]], c6: [[['atp', -2]]], c5: [[['nadph', -2]]],
  p0: [[['nadph', 1]]], p2: [[['nadph', 1]]], pdh: [[['nadh', 2]]], adh: [[['nadh', -2]], [['nadh', 2]]], aldh: [[['nadh', 2]]], acs: [[['atp', -2]]],
  k2: [[['nadh', 1]]], k3: [[['nadh', 1]]], k4: [[['atp', 1]], [['atp', -1]]], k5: [[['fadh2', 1]]], k7: [[['nadh', 1]], [['nadh', -1]]],
  b0: [[['fadh2', 1]], [['nadph', -1], ['atp', -1]]], b2: [[['nadh', 1]], [['nadph', -1]]], b3: [[], [['atp', -1]]],
};
const POOL_OF = { atp: ['atp', 'adp'], nadh: ['nadh', 'nad'], nadph: ['nadph', 'nadp'], fadh2: ['fadh2', 'fad'] };

/**
 * The regulation gates of src/regulation.js, as marks: for a segment and the
 * pools, the effector, how it acts (⊣ inhibits, → is required, ⊕ activates)
 * and the gate's factor.
 */
function gatesOf(id, P, rev) {
  const a = P.atp / 40, nh = P.nadh / 40, np = P.nadph / 40, fd = P.fadh2 / 20, out = [];
  const add = (eff, how, f) => { if (f !== 1) out.push({ eff, how, f }); };
  if (id === 'g2' && !rev) add('atp', '⊣', a > 0.8 ? 0 : a > 0.6 ? 0.5 : 1);
  if (id === 'g9' && rev) add('atp', '→', a < 0.3 ? 0 : a < 0.5 ? 0.5 : 1);
  if (id === 'kin') add('atp', '⊣', a > 0.85 ? 0.3 : 1);
  if (id === 'k2') add('nadh', '⊣', nh > 0.75 ? 0 : nh > 0.5 ? 0.5 : 1);
  if (id === 'pdh') add('nadh', '⊣', nh > 0.7 && P.acetylCoA > 4 ? 0 : 1);
  if (id === 'p0') add('nadph', np < 0.2 ? '⊕' : '⊣', np < 0.2 ? 1.5 : np > 0.8 ? 0 : np > 0.6 ? 0.5 : 1);
  if (id === 'c0') add('atp', '→', a < 0.15 ? 0 : a < 0.3 ? 0.5 : 1);
  if (id === 'b0' && !rev) add('fadh2', '⊣', fd > 0.8 ? 0 : fd > 0.6 ? 0.5 : 1);
  return out;
}

/* ---------- geometry ---------- */
function offsetPts(pts, d, closed) {
  const n = pts.length, out = [];
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
  for (let i = 0; i < n; i++) {
    const prev = closed ? pts[(i - 1 + n) % n] : pts[i - 1], next = closed ? pts[(i + 1) % n] : pts[i + 1];
    if (prev && next) {
      const n1 = nrm(prev, pts[i]), n2 = nrm(pts[i], next);
      let mx = n1[0] + n2[0], my = n1[1] + n2[1]; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
      const k = d / Math.max(0.5, mx * n1[0] + my * n1[1]);
      out.push([pts[i][0] + mx * k, pts[i][1] + my * k]);
    } else { const q = prev ? nrm(prev, pts[i]) : nrm(pts[i], next); out.push([pts[i][0] + q[0] * d, pts[i][1] + q[1] * d]); }
  }
  return out;
}
function rounded(pts, r) {
  const n = pts.length, out = [pts[0]];
  const line = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(L / 3)); for (let j = 1; j <= k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); };
  let cur = pts[0];
  for (let i = 1; i < n - 1; i++) {
    const A = pts[i - 1], Bp = pts[i], C = pts[i + 1];
    const l1 = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]) || 1, l2 = Math.hypot(C[0] - Bp[0], C[1] - Bp[1]) || 1, rr = Math.min(r, l1 / 2, l2 / 2);
    const p1 = [Bp[0] + (A[0] - Bp[0]) * rr / l1, Bp[1] + (A[1] - Bp[1]) * rr / l1], p2 = [Bp[0] + (C[0] - Bp[0]) * rr / l2, Bp[1] + (C[1] - Bp[1]) * rr / l2];
    line(cur, p1);
    for (let j = 1; j <= 10; j++) { const t = j / 10, v = 1 - t; out.push([v * v * p1[0] + 2 * v * t * Bp[0] + t * t * p2[0], v * v * p1[1] + 2 * v * t * Bp[1] + t * t * p2[1]]); }
    cur = p2;
  }
  line(cur, pts[n - 1]);
  return out;
}
function withLengths(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; }
function angleOf(id) { const v = STATIONS[id]; let a = Math.atan2(v[1] - KC[1], v[0] - KC[0]) * 180 / Math.PI; if (a < -90.5) a += 360; return a; }
function segAt(s, v) {
  const { pts, L } = s; let lo = 0, hi = L.length - 1;
  v = clamp(v, 0, L[hi]);
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= v) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], t = (v - L[lo]) / ((L[hi] - L[lo]) || 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
}

/** Build the map into the box (x, y, w, h). proposed picks the cleared label placements. */
function buildMap(x, y, w, h, proposed) {
  const gw = GRID.x1 - GRID.x0, gh = GRID.y1 - GRID.y0, U = Math.min(w / gw, h / gh);
  const M = { U, ox: x + (w - U * gw) / 2, oy: y, us: clamp(U / 46, 0.55, 1.25), gap: clamp(U * 0.16, 3.5, 8), segs: {}, st: {}, tracks: {}, phase: {}, proposed };
  M.T = (gx, gy) => [M.ox + (gx - GRID.x0) * U, M.oy + (gy - GRID.y0) * U];
  for (const [id, def] of Object.entries(TRACKS)) {
    const tr = M.tracks[id] = { line: def.line, segs: [] };
    let pts;
    if (def.circle) { pts = []; for (let a = -90; a <= 270.01; a += 2) pts.push(M.T(KC[0] + KR * Math.cos(a * Math.PI / 180), KC[1] + KR * Math.sin(a * Math.PI / 180))); }
    else {
      let raw = def.pts.map(q => typeof q === 'string' ? M.T(STATIONS[q][0], STATIONS[q][1]) : M.T(q[0], q[1]));
      if (def.off) { if (def.closed) { const u = offsetPts(raw.slice(0, -1), M.gap / 2, true); raw = [...u, u[0]]; } else raw = offsetPts(raw, M.gap / 2, false); }
      pts = rounded(raw, U * 0.42);
    }
    let from = 0;
    def.segs.forEach(([sid, a, b, label, rev], i) => {
      let i0 = from, i1;
      if (def.circle) { i0 = Math.round((angleOf(a) + 90) / 2); i1 = Math.round((angleOf(b) + 90 + (angleOf(b) < angleOf(a) ? 360 : 0)) / 2); }
      else {
        const target = M.T(STATIONS[b][0], STATIONS[b][1]);
        if (i === def.segs.length - 1) i1 = pts.length - 1;
        else { let best = from, bd = 1e9; for (let k = from + 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - target[0], pts[k][1] - target[1]); if (d < bd) { bd = d; best = k; } } i1 = best; }
      }
      from = i1;
      const sp = pts.slice(i0, i1 + 1), sl = withLengths(sp);
      const seg = { id: sid, track: id, line: def.line, ink: LINES[def.line].ink, label, rev, from: a, to: b, pts: sp, L: sl, len: sl[sl.length - 1] };
      seg.lab = mapLabelAt(M, seg, def.circle);
      M.segs[sid] = seg; tr.segs.push(sid); M.phase[sid] = Math.random() * 40;
    });
  }
  for (const [id, v] of Object.entries(STATIONS)) M.st[id] = { id, gx: v[0], gy: v[1], pos: M.T(v[0], v[1]), label: v[2], side: v[3], kind: v[4] || 'tick' };
  for (const seg of Object.values(M.segs)) for (const [end, idx] of [[seg.from, 0], [seg.to, seg.pts.length - 1]]) {
    const S = M.st[end]; if (S.kind !== 'tick' || S.seg) continue;
    const a = seg.pts[Math.max(0, idx - 1)], b = seg.pts[Math.min(seg.pts.length - 1, idx + 1)];
    S.seg = seg.id; S.anchor = seg.pts[idx]; S.ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  M.loops = LOOPS.map(l => ({ ...l, pos: M.T(...l.at), span: l.span ? [M.T(l.span[0], l.at[1] - 0.2), M.T(l.span[1], l.at[1] - 0.2)] : null }));
  M.bottom = M.T(0, GRID.y1)[1];
  return M;
}
function mapLabelAt(M, seg, circle) {
  if (!seg.label) return null;
  let gx, gy;
  if (circle) {
    const a0 = angleOf(seg.from), a1 = angleOf(seg.to) + (angleOf(seg.to) < a0 ? 360 : 0), m = (a0 + a1) / 2 * Math.PI / 180, r = KR + 0.42;
    gx = KC[0] + r * Math.cos(m); gy = KC[1] + r * Math.sin(m);
  } else {
    const o = (M.proposed && LABEL_AT_P[seg.id]) || LABEL_AT[seg.id] || [0, -0.4];
    if (o.abs) [gx, gy] = o.abs;
    else { const A = STATIONS[seg.from], B = STATIONS[seg.to]; gx = (A[0] + B[0]) / 2 + o[0]; gy = (A[1] + B[1]) / 2 + o[1]; }
  }
  const p = M.T(gx, gy), mid = seg.pts[Math.floor(seg.pts.length / 2)], dx = p[0] - mid[0], dy = p[1] - mid[1];
  const o = (M.proposed && LABEL_AT_P[seg.id]) || LABEL_AT[seg.id];
  const align = o && o.align ? o.align : Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx > 0 ? 'left' : 'right') : 'center';
  return { x: p[0], y: p[1], align, out: [dx, dy] };
}

/* ---------- scenarios: steady fluxes for the sketches (events per second, + the line's way) ---------- */
const SCEN = {
  cyano: { name: 'Cyanobacterium in the light', locked: {}, off: {}, flux: { c7: 0.42, c0: 0.42, c6: 0.42, c5: 0.42, c3: 0.3, c2: 0.3, c10: 0.36, g0: -0.18, g1: -0.16, g2: -0.12, g3: -0.12, p0: 0.03, p1: 0.03, p2: 0.03, adh: -0.02, aldh: 0.02, acs: 0.02, b0: -0.05, b1: -0.05, b2: -0.05, b3: -0.05, bspur: -0.05 } },
  animal: { name: 'Animal cell in the dark', locked: { calvin: 1 }, off: { calvin: 1 }, zones: true, flux: { g0: 0.3, g1: 0.26, g2: 0.24, g3: 0.24, g5: 0.32, g6: 0.32, g7: 0.3, g8: 0.3, g9: 0.3, pdh: 0.34, kin: 0.34, k0: 0.34, k1: 0.3, k2: 0.3, k3: 0.28, k4: 0.28, k5: 0.26, k6: 0.26, k7: 0.26, p0: 0.08, p1: 0.08, p2: 0.08, p10: 0.06, b0: 0.12, b1: 0.12, b2: 0.12, b3: 0.12, bspur: 0.12 } },
};
function lockedSeg(id, sc) {
  const L = sc.locked;
  if (L.calvin && /^c\d/.test(id)) return true;
  return false;
}
