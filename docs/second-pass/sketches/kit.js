/* ---------- Lumen second pass: the shared drawing kit ----------
   Two registers of drawing for every sketch: TODAY ports what Lumen draws now
   (src/complexes.js, src/membrane.js, src/mapdraw.js), PROPOSED is this pass.
   Shapes are in nanometres about a local origin on the membrane midline;
   y grows toward the stroma (down). `s` is pixels per nanometre. */

const ink = n => tok['ink-' + n];
const MEM = 5;            // bilayer thickness, nm
const LIPID = 0.85;       // lipid spacing along a leaflet, nm

/* ---------- colour ---------- */
const _shT = new Map(), _shP = new Map();
function themeKey() { return tok.dark ? 'd' : 'l'; }
/** Today's fill, outline and offset highlight (complexes.js shades). */
function shadesToday(base) {
  const k = base + themeKey();
  let s = _shT.get(k);
  if (!s) {
    const fill = mix(base, tok.canvas, tok.dark ? 0.16 : 0.3);
    s = tok.dark ? { fill, line: mix(base, '#000000', 0.5), hi: mix(fill, '#ffffff', 0.14) }
                 : { fill, line: mix(base, '#1a1410', 0.42), hi: mix(fill, '#ffffff', 0.45) };
    _shT.set(k, s);
  }
  return s;
}
/** Proposed: Goodsell's flat watercolour. Three subunit tones, a seam and an outline. */
function tones(base) {
  const k = base + themeKey();
  let s = _shP.get(k);
  if (!s) {
    const d = tok.dark;
    s = {
      t: [mix(base, tok.canvas, d ? 0.20 : 0.40), mix(base, tok.canvas, d ? 0.06 : 0.26), mix(base, tok.canvas, d ? 0.34 : 0.56)],
      line: d ? mix(base, '#000000', 0.58) : mix(base, '#1a1410', 0.52),
      seam: d ? mix(base, '#000000', 0.30) : mix(base, '#1a1410', 0.16),
      dark: d ? mix(base, '#000000', 0.2) : mix(base, '#1a1410', 0.3),
    };
    _shP.set(k, s);
  }
  return s;
}

/* ---------- blobs ---------- */
function smoothClosed(c, pts) {
  const n = pts.length;
  c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  c.closePath();
}
function blobPts(x, y, rx, ry, seed, rot = 0, n = 24, lump = 1) {
  const pts = [], cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    const r = 1 + lump * (0.07 * Math.sin(2 * a + seed * 1.7) + 0.05 * Math.sin(3 * a + seed * 2.3) + 0.035 * Math.sin(5 * a + seed * 3.1));
    const px = rx * r * Math.cos(a), py = ry * r * Math.sin(a);
    pts.push([x + px * cr - py * sr, y + px * sr + py * cr]);
  }
  return pts;
}
/** Today's protein body: fill, outline and an offset lighter body. */
function blobToday(c, x, y, rx, ry, seed, base, s) {
  const pts = blobPts(x, y, rx, ry, seed), hi = [];
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = 1 + 0.07 * Math.sin(2 * a + seed * 1.7) + 0.05 * Math.sin(3 * a + seed * 2.3) + 0.035 * Math.sin(5 * a + seed * 3.1); hi.push([x - rx * 0.12 + rx * r * Math.cos(a) * 0.6, y - ry * 0.16 + ry * r * Math.sin(a) * 0.56]); }
  const sh = shadesToday(base);
  c.beginPath(); smoothClosed(c, pts); c.fillStyle = sh.fill; c.fill();
  c.lineWidth = Math.max(0.7, 0.16 * s); c.strokeStyle = sh.line; c.stroke();
  c.save(); c.globalAlpha *= 0.55; c.beginPath(); smoothClosed(c, hi); c.fillStyle = sh.hi; c.fill(); c.restore();
}
const BT = (c, s, dx, dy, rx, ry, seed, base) => blobToday(c, dx * s, dy * s, rx * s, ry * s, seed, base, s);

/**
 * Proposed: an assembly of subunits drawn as one molecule. A dark silhouette
 * outline, each subunit in one of three tones of its ink, and a lighter seam
 * where subunits meet. parts: [dx, dy, rx, ry, rot°, tone, ink?] in nm.
 */
function assembly(c, s, parts, base, seed = 1) {
  const paths = parts.map((p, i) => {
    const pa = new Path2D(); const pts = blobPts(p[0] * s, p[1] * s, p[2] * s, p[3] * s, seed + i * 1.37, (p[4] || 0) * Math.PI / 180, 22, 0.8);
    smoothClosed(pa, pts); return pa;
  });
  const lw = Math.max(0.8, 0.17 * s);
  // the silhouette: every subunit stroked thick, then filled over
  for (let i = 0; i < parts.length; i++) { const sh = tones(parts[i][6] ? ink(parts[i][6]) : base); c.lineWidth = lw * 2; c.strokeStyle = sh.line; c.lineJoin = 'round'; c.stroke(paths[i]); }
  for (let i = 0; i < parts.length; i++) {
    const sh = tones(parts[i][6] ? ink(parts[i][6]) : base);
    c.fillStyle = sh.t[parts[i][5] || 0]; c.fill(paths[i]);
    c.lineWidth = Math.max(0.5, 0.09 * s); c.strokeStyle = sh.seam; c.stroke(paths[i]);
  }
}

/* ---------- lipids ---------- */
function samplePath(path, step) {
  const pts = []; let carry = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (!L) continue;
    const nx = -dy / L, ny = dx / L;
    for (let d = carry; d < L; d += step) pts.push([a[0] + dx * d / L, a[1] + dy * d / L, nx, ny]);
    carry = (carry - L) % step; if (carry < 0) carry += step;
  }
  return pts;
}
/** Today: a head on each leaflet and two tails toward the middle (membrane.js drawLipids). */
function lipidsToday(c, path, s, kind, faint) {
  const lip = ink(kind === 'ether' ? 'umber' : 'ochre');
  const head = mix(lip, tok.canvas, tok.dark ? 0.15 : 0.38), rim = shadesToday(lip).line, tail = mix(tok.canvas, lip, tok.dark ? 0.42 : 0.5);
  const off = (MEM / 2 - 0.42) * s, rH = 0.4 * s, pts = samplePath(path, LIPID * s);
  c.save(); if (faint) c.globalAlpha = 0.6;
  c.strokeStyle = tail; c.lineWidth = Math.max(0.6, 0.13 * s); c.lineCap = 'round'; c.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y, nx, ny] = pts[i];
    for (const sg of [-1, 1]) {
      const hx = x + nx * off * sg, hy = y + ny * off * sg;
      for (const t of [-0.22, 0.22]) {
        const tx = -ny * t * s, ty = nx * t * s, ex = x + nx * 0.15 * s * sg + tx, ey = y + ny * 0.15 * s * sg + ty, w = Math.sin(i * 1.7 + t * 9 + sg) * 0.18 * s;
        c.moveTo(hx + tx - nx * rH * sg, hy + ty - ny * rH * sg); c.quadraticCurveTo((hx + ex) / 2 - ny * w, (hy + ey) / 2 + nx * w, ex, ey);
      }
    }
  }
  c.stroke(); c.beginPath();
  for (const [x, y, nx, ny] of pts) for (const sg of [-1, 1]) {
    const hx = x + nx * off * sg, hy = y + ny * off * sg;
    if (kind === 'galacto') { c.moveTo(hx + rH * 1.15, hy); for (let k = 1; k <= 6; k++) { const a = k / 6 * TAU; c.lineTo(hx + Math.cos(a) * rH * 1.15, hy + Math.sin(a) * rH * 1.15); } }
    else { c.moveTo(hx + rH, hy); c.arc(hx, hy, rH, 0, TAU); }
  }
  c.fillStyle = head; c.fill(); c.lineWidth = Math.max(0.4, 0.08 * s); c.strokeStyle = rim; c.stroke();
  c.restore();
}

/**
 * Proposed: Goodsell's bilayer. A pale band for the tails and a row of heads
 * on each face, in a warm neutral so ochre stays the quinones' and the light's.
 * Tails are drawn one by one only once zoomed in (s ≥ 9 px/nm). `ox` marks
 * peroxidised lipids: a fraction of tails kinked and darkened (cell damage).
 */
function lipidColors() {
  const u = ink('umber'), d = tok.dark;
  return { band: mix(u, tok.canvas, d ? 0.80 : 0.86), head: mix(u, tok.canvas, d ? 0.42 : 0.58), rim: mix(u, tok.canvas, d ? 0.12 : 0.18), tail: mix(u, tok.canvas, d ? 0.62 : 0.66), ox: d ? mix(ink('sienna'), '#000', 0.1) : mix(ink('sienna'), '#1a1410', 0.25) };
}
function lipidsProposed(c, path, s, kind, faint, ox = 0, seed = 0) {
  const L = lipidColors(), half = MEM / 2 * s, off = half - 0.42 * s, rH = 0.4 * s;
  const pts = samplePath(path, LIPID * s);
  c.save(); if (faint) c.globalAlpha = 0.55;
  // the tail band
  c.beginPath();
  const top = pts.map(([x, y, nx, ny]) => [x - nx * (off - rH * 0.4), y - ny * (off - rH * 0.4)]);
  const bot = pts.map(([x, y, nx, ny]) => [x + nx * (off - rH * 0.4), y + ny * (off - rH * 0.4)]);
  if (top.length) {
    c.moveTo(top[0][0], top[0][1]); for (const p of top) c.lineTo(p[0], p[1]);
    for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    c.closePath(); c.fillStyle = L.band; c.fill();
  }
  // tails: individually only when zoomed in; damaged ones always
  const rnd = mulberry32(1234 + seed);
  c.lineCap = 'round';
  const detail = s >= 9;
  c.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y, nx, ny] = pts[i];
    for (const sg of [-1, 1]) {
      const bad = rnd() < ox;
      if (!detail && !bad) continue;
      const hx = x + nx * off * sg, hy = y + ny * off * sg;
      for (const t of [-0.2, 0.2]) {
        const tx = -ny * t * s, ty = nx * t * s, ex = x + nx * 0.2 * s * sg + tx, ey = y + ny * 0.2 * s * sg + ty;
        if (bad) continue;
        c.moveTo(hx + tx - nx * rH * sg, hy + ty - ny * rH * sg); c.lineTo(ex, ey);
      }
    }
  }
  c.strokeStyle = L.tail; c.lineWidth = Math.max(0.5, 0.1 * s); c.stroke();
  // peroxidised tails: a kink partway down, in a darker sienna
  if (ox > 0) {
    const r2 = mulberry32(1234 + seed);
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [x, y, nx, ny] = pts[i];
      for (const sg of [-1, 1]) {
        if (!(r2() < ox)) continue;
        const hx = x + nx * off * sg, hy = y + ny * off * sg;
        // one tail straight, the other kinked out at its peroxide
        for (const t of [-0.2, 0.2]) {
          const tx = -ny * t * s, ty = nx * t * s, ex = x + nx * 0.2 * s * sg + tx, ey = y + ny * 0.2 * s * sg + ty;
          c.moveTo(hx + tx - nx * rH * sg, hy + ty - ny * rH * sg);
          if (t > 0) { const mx = hx + (ex - hx) * 0.45 + tx * 3, my = hy + (ey - hy) * 0.45 + ty * 3; c.lineTo(mx, my); }
          c.lineTo(ex, ey);
        }
      }
    }
    c.strokeStyle = L.ox; c.lineWidth = Math.max(0.8, 0.15 * s); c.stroke();
  }
  // heads
  c.beginPath();
  for (const [x, y, nx, ny] of pts) for (const sg of [-1, 1]) {
    const hx = x + nx * off * sg, hy = y + ny * off * sg;
    if (kind === 'galacto') { c.moveTo(hx + rH * 1.1, hy); for (let k = 1; k <= 6; k++) { const a = k / 6 * TAU; c.lineTo(hx + Math.cos(a) * rH * 1.1, hy + Math.sin(a) * rH * 1.1); } }
    else { c.moveTo(hx + rH, hy); c.arc(hx, hy, rH, 0, TAU); }
  }
  c.fillStyle = L.head; c.fill(); c.lineWidth = Math.max(0.35, 0.07 * s); c.strokeStyle = L.rim; c.stroke();
  c.restore();
}

function arcPts(cx, cy, r, a0, a1) {
  const pts = [], n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / 3));
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}

/* ---------- complexes, today (complexes.js) ---------- */
const TODAY = {
  psii(c, s) { const g = ink('sap'), v = ink('violet'); BT(c, s, -5.2, 0.2, 5.4, 3.5, 3.3, g); BT(c, s, 5.2, 0.2, 5.4, 3.5, 4.1, g); BT(c, s, -4.4, -4.6, 3.1, 1.7, 5.2, v); BT(c, s, 4.4, -4.6, 3.1, 1.7, 5.9, v); },
  pbs(c, s) {
    const rod = ink('indigo'), core = ink('prussian');
    for (const a of [-58, -29, 0, 29, 58]) {
      const r = a * Math.PI / 180, ux = Math.sin(r), uy = Math.cos(r);
      for (let k = 0; k < 3; k++) { const d = 9.8 + k * 2.9; c.save(); c.translate(ux * d * s, (6.4 + uy * d) * s); c.rotate(-r); BT(c, s, 0, 0, 2.9, 1.25, 20 + k + a, rod); c.restore(); }
    }
    BT(c, s, -3.1, 6.1, 2.9, 2.6, 30, core); BT(c, s, 3.1, 6.1, 2.9, 2.6, 31, core); BT(c, s, 0, 9.9, 2.9, 2.6, 32, core);
  },
  psi(c, s) { const g = ink('viridian'); BT(c, s, -4.9, 0, 5.2, 3.4, 9.4, g); BT(c, s, 4.9, 0, 5.2, 3.4, 9.9, g); BT(c, s, 1.5, 4.2, 3.1, 1.5, 10.2, g); },
  b6f(c, s) { const b = ink('prussian'); BT(c, s, -2.4, 0, 2.7, 3.4, 6.7, b); BT(c, s, 2.4, 0, 2.7, 3.4, 7.3, b); BT(c, s, 0, -4.4, 3.9, 1.6, 8.1, mix(b, tok.canvas, 0.25)); },
  fnr(c, s) { BT(c, s, 0, 4.6, 2.7, 2.2, 11.6, ink('umber')); },
  ndh1(c, s, mito) { const b = ink('indigo'); BT(c, s, -1.5, 0.1, 8.6, 3.2, 5.7, b); if (mito) BT(c, s, 5.5, 7.2, 3.7, 6.2, 6.1, b); else BT(c, s, 5.2, 5.4, 3.3, 4.2, 6.1, b); },
  sdh(c, s) { const b = ink('violet'); BT(c, s, 0, 0.2, 2.5, 3.2, 12.1, b); BT(c, s, 0.4, 5.6, 3.3, 3.0, 12.7, b); },
  cytOx(c, s) { const b = ink('verdigris'); BT(c, s, 0, -0.2, 4.4, 3.6, 8.8, b); BT(c, s, -1, -4, 2.5, 1.3, 9.1, b); },
  nnt(c, s) { const b = ink('madder'); BT(c, s, 0, 0, 4.8, 3.2, 14.2, b); BT(c, s, -2.5, 5.6, 2.4, 2.4, 14.6, b); BT(c, s, 2.5, 5.6, 2.4, 2.4, 14.9, b); },
  atpStator(c, s) {
    const m = ink('mulberry'), sh = shadesToday(m);
    BT(c, s, 4.3, 0, 1.4, 3, 12.4, m);
    c.fillStyle = sh.line; c.fillRect(4.6 * s, 2.6 * s, 0.85 * s, 12.4 * s);
    const hy = 12.6;
    BT(c, s, -3.1, hy, 2.6, 4.1, 13.1, m); BT(c, s, 3.1, hy, 2.6, 4.1, 13.9, m);
    BT(c, s, 0, hy + 0.3, 2.8, 4.3, 14.6, mix(m, '#ffffff', tok.dark ? 0.08 : 0.18)); BT(c, s, 1.6, hy + 4.6, 1.5, 1.1, 15.2, m);
  },
  atpRotor(c, s, phase) {
    const m = ink('mulberry'), sh = shadesToday(m), r = 3, h = 4.6, ring = [];
    for (let k = 0; k < 12; k++) { const th = phase + k * TAU / 12; ring.push({ x: r * Math.sin(th), w: Math.abs(Math.cos(th)), z: Math.cos(th) }); }
    ring.sort((a, b) => a.z - b.z);
    c.lineWidth = Math.max(0.6, 0.14 * s); c.strokeStyle = sh.line;
    for (const q of ring) { const wd = (0.35 + 0.75 * q.w) * s; c.fillStyle = q.z < 0 ? mix(sh.fill, tok.canvas, 0.35) : sh.fill; c.beginPath(); c.roundRect(q.x * s - wd / 2, -h / 2 * s, wd, h * s, 0.4 * s); c.fill(); c.stroke(); }
    const sway = 0.45 * Math.sin(phase);
    c.strokeStyle = sh.line; c.lineWidth = 0.95 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 2.3 * s); c.quadraticCurveTo(sway * s, 5.5 * s, 0, 9 * s); c.stroke();
    c.fillStyle = sh.fill; c.beginPath(); c.ellipse(1.1 * Math.sin(phase) * s, 3.3 * s, (0.5 + 0.35 * Math.abs(Math.cos(phase))) * s, 0.7 * s, 0, 0, TAU); c.fill(); c.stroke();
  },
  quinone(c, s, reduced) {
    const o = ink('ochre'), sh = shadesToday(o);
    c.strokeStyle = sh.line; c.lineWidth = Math.max(0.8, 0.22 * s); c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0.6 * s, 0); for (let k = 1; k <= 6; k++) c.lineTo((0.6 + k * 0.55) * s, (k % 2 ? 0.35 : -0.35) * s); c.stroke();
    c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; c.lineTo(Math.cos(a) * 0.62 * s, Math.sin(a) * 0.62 * s); }
    c.closePath(); c.fillStyle = reduced ? sh.line : sh.fill; c.fill(); c.stroke();
  },
  carrier(c, s, x, y, r, seed, base) { blobToday(c, x, y, r * s, r * 0.9 * s, seed, base, s); },
  atp(c, s, x, y, rot) {
    c.save(); c.translate(x, y); c.rotate(rot); blobToday(c, 0, 0, 0.75 * s, 0.6 * s, 23, ink('umber'), s);
    const ph = shadesToday(ink('ochre'));
    for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc((0.7 + k * 0.62) * s, 0, 0.32 * s, 0, TAU); c.fillStyle = ph.fill; c.fill(); c.lineWidth = Math.max(0.5, 0.1 * s); c.strokeStyle = ph.line; c.stroke(); }
    c.restore();
  },
};

/* ---------- complexes, proposed: subunit assemblies ----------
   Part lists are [dx, dy, rx, ry, rot°, tone, ink?], nm about the membrane
   midline under the complex's centre; − y is the lumen. Approximate
   silhouettes after the published structures, cut through the middle. */
const half = (parts) => parts.concat(parts.map(p => [-p[0], p[1], p[2], p[3], -(p[4] || 0), p[5], p[6]]));
const PARTS = {
  // PSII dimer: per monomer CP43 · D1 · D2 · CP47, PsbO and cyt c550 on the lumenal face
  psii: half([[-8.2, 0.2, 2.1, 2.9, 0, 0], [-5.3, 0.1, 1.5, 2.8, 4, 1], [-2.9, 0.2, 1.5, 2.8, -4, 2], [-0.8, 0.3, 1.0, 2.6, 0, 0],
    [-5.6, -4.1, 2.3, 1.55, 6, 0, 'violet'], [-2.6, -4.4, 1.25, 1.1, 0, 2, 'violet'], [-8.0, -3.5, 1.1, 0.9, 0, 1, 'violet'], [-4.8, 3.0, 2.6, 0.75, 0, 2]]),
  // Cyt b6f dimer: the b6/subIV core, cyt f standing in the lumen, the Rieske head between
  b6f: half([[-2.5, 0.1, 2.2, 2.8, 0, 0], [-0.7, 0.2, 0.9, 2.6, 0, 1], [-3.1, -4.7, 1.25, 2.3, -8, 2], [-1.2, -3.4, 1.1, 0.85, 0, 1], [-2.4, 3.2, 1.6, 0.7, 0, 2]]),
  // PSI, two monomers of the trimer cut through: PsaA, PsaB, and the stromal ridge (PsaC, D, E)
  psi: [[-7.4, 0.1, 2.6, 2.9, 0, 0], [-2.6, 0.1, 2.5, 2.9, 0, 1], [2.6, 0.1, 2.5, 2.9, 0, 0], [7.4, 0.1, 2.6, 2.9, 0, 1], [0, 0.2, 0.9, 2.5, 0, 2],
    [-9.6, -2.8, 1.4, 0.8, 0, 2], [9.6, -2.8, 1.4, 0.8, 0, 2],
    [-4.6, 3.6, 1.2, 1.1, 0, 2], [-6.5, 3.4, 1.6, 1.0, 0, 1], [-2.8, 3.6, 1.2, 0.85, 0, 0],
    [5.4, 3.5, 1.15, 1.0, 0, 2], [3.6, 3.3, 1.4, 0.9, 0, 1], [7.2, 3.4, 1.1, 0.8, 0, 0]],
  fnr: [[0, 4.6, 2.5, 2.0, 0, 0], [1.2, 5.6, 1.4, 1.2, 0, 1]],
  // NDH-1 / complex I: the membrane arm's antiporter modules under the transverse helix, and the hydrophilic arm
  ndh1: [[-7.6, 0.1, 1.8, 2.7, 0, 0], [-4.2, 0.1, 1.8, 2.7, 0, 1], [-0.8, 0.1, 1.8, 2.7, 0, 0], [2.4, 0.1, 1.6, 2.7, 0, 2], [5.2, 0.1, 1.6, 2.6, 0, 1],
    [-2.6, 2.7, 6.2, 0.45, 0, 2], [5.4, 4.0, 2.2, 1.6, 0, 0], [5.8, 6.6, 2.4, 1.4, 0, 2]],
  ndh1mito: [[-7.6, 0.1, 1.8, 2.7, 0, 0], [-4.2, 0.1, 1.8, 2.7, 0, 1], [-0.8, 0.1, 1.8, 2.7, 0, 0], [2.4, 0.1, 1.6, 2.7, 0, 2], [5.2, 0.1, 1.6, 2.6, 0, 1],
    [-2.6, 2.7, 6.2, 0.45, 0, 2], [5.6, 4.2, 2.4, 1.7, 0, 0], [6.2, 7.2, 2.7, 1.8, 6, 2], [6.6, 10.4, 2.5, 1.6, 0, 1], [4.6, 12.4, 1.6, 1.2, 0, 0]],
  sdh: [[-0.9, 0.1, 1.3, 2.7, 0, 0], [1.0, 0.2, 1.2, 2.6, 0, 2], [0.2, 4.0, 2.2, 1.3, 0, 1], [0.6, 6.9, 2.9, 1.9, 0, 0]],
  cytOx: [[-0.6, 0.0, 2.5, 2.8, 0, 0], [2.6, 0.1, 1.5, 2.7, 0, 1], [-3.0, 0.1, 0.9, 2.6, 0, 2], [-1.8, -3.9, 2.1, 1.35, 0, 2], [1.4, 3.1, 1.6, 0.7, 0, 1]],
  nnt: [[-2.2, 0.1, 2.1, 2.8, 0, 0], [2.2, 0.1, 2.1, 2.8, 0, 1], [-2.6, 4.6, 1.9, 1.7, 0, 2], [2.6, 4.6, 1.9, 1.7, 0, 0], [0, 6.9, 1.6, 1.2, 0, 1]],
  ucp: [[0, 0, 1.6, 2.9, 0, 0]],
};
const PROPOSED = {
  psii(c, s) { assembly(c, s, PARTS.psii, ink('sap'), 3); },
  b6f(c, s) { assembly(c, s, PARTS.b6f, ink('prussian'), 7); },
  psi(c, s) { assembly(c, s, PARTS.psi, ink('viridian'), 9); },
  fnr(c, s) { assembly(c, s, PARTS.fnr, ink('umber'), 11); },
  ndh1(c, s, mito) { assembly(c, s, mito ? PARTS.ndh1mito : PARTS.ndh1, ink('indigo'), 5); },
  sdh(c, s) { assembly(c, s, PARTS.sdh, ink('violet'), 12); },
  cytOx(c, s) { assembly(c, s, PARTS.cytOx, ink('verdigris'), 8); },
  nnt(c, s) { assembly(c, s, PARTS.nnt, ink('madder'), 14); },
  ucp(c, s) { assembly(c, s, PARTS.ucp, ink('sienna'), 15); },
  /** Phycobilisome: rods as stacks of phycocyanin discs fanning from an allophycocyanin core. */
  pbs(c, s) {
    const rod = tones(ink('indigo')), core = tones(ink('prussian')), lw = Math.max(0.7, 0.15 * s);
    const disc = (t, w, h, tone) => {
      c.beginPath(); c.roundRect(-w / 2 * s, -h / 2 * s, w * s, h * s, h * 0.45 * s);
      c.fillStyle = t.t[tone]; c.fill(); c.lineWidth = lw; c.strokeStyle = t.line; c.stroke();
    };
    for (const a of [-62, -31, 0, 31, 62]) {
      const r = a * Math.PI / 180, ux = Math.sin(r), uy = Math.cos(r);
      for (let k = 2; k >= 0; k--) {
        const d = 10.2 + k * 2.55;
        c.save(); c.translate(ux * d * s, (6.6 + uy * d) * s); c.rotate(-r); disc(rod, 5.6, 2.25, k === 0 ? 0 : k === 1 ? 2 : 1); c.restore();
      }
    }
    for (const [x, y] of [[0, 10.4], [-3.0, 6.4], [3.0, 6.4]]) {
      c.save(); c.translate(x * s, y * s);
      c.beginPath(); c.arc(0, 0, 2.55 * s, 0, TAU); c.fillStyle = core.t[0]; c.fill(); c.lineWidth = lw; c.strokeStyle = core.line; c.stroke();
      c.beginPath(); c.arc(0, 0, 1.1 * s, 0, TAU); c.fillStyle = core.t[2]; c.fill(); c.lineWidth = Math.max(0.5, 0.09 * s); c.strokeStyle = core.seam; c.stroke();
      c.restore();
    }
  },
  /** ATP synthase's stator: the a subunit, the peripheral stalk and the δ cap; the head is drawn live. */
  atpStator(c, s) {
    const m = ink('mulberry'), t = tones(m);
    assembly(c, s, [[4.2, 0.1, 1.35, 2.7, 0, 1]], m, 12);
    c.fillStyle = t.dark; c.beginPath(); c.roundRect(4.55 * s, 2.4 * s, 0.75 * s, 15.6 * s, 0.35 * s); c.fill();
  },
  /**
   * The rotor and the α₃β₃ head, which shows Boyer's binding change: the
   * three β subunits step open → loose → tight with every third of a turn,
   * so the front two show ADP + Pᵢ (loose), ATP (tight) or nothing (open)
   * as γ turns. phase is the rotor angle (a third of a turn per ATP).
   */
  atpRotor(c, s, phase) {
    const m = ink('mulberry'), t = tones(m), lw = Math.max(0.6, 0.13 * s), r = 2.9, h = 4.4;
    const ring = [];
    for (let k = 0; k < 12; k++) { const th = phase + k * TAU / 12; ring.push({ x: r * Math.sin(th), w: Math.abs(Math.cos(th)), z: Math.cos(th) }); }
    ring.sort((a, b) => a.z - b.z);
    for (const q of ring) {
      const wd = (0.3 + 0.72 * q.w) * s;
      c.beginPath(); c.roundRect(q.x * s - wd / 2, -h / 2 * s, wd, h * s, 0.4 * s);
      c.fillStyle = q.z < 0 ? t.t[2] : t.t[0]; c.fill(); c.lineWidth = lw; c.strokeStyle = t.line; c.stroke();
    }
    // the central stalk, γ and ε, bent as γ is, turning
    const sw = 0.55 * Math.sin(phase);
    c.lineCap = 'round'; c.strokeStyle = t.line; c.lineWidth = 1.05 * s;
    c.beginPath(); c.moveTo(0, 2.0 * s); c.bezierCurveTo(sw * s, 4.5 * s, -sw * s, 7 * s, 0, 10.5 * s); c.stroke();
    c.strokeStyle = t.t[1]; c.lineWidth = 0.55 * s; c.stroke();
    c.beginPath(); c.ellipse(1.15 * Math.sin(phase) * s, 3.2 * s, (0.45 + 0.4 * Math.abs(Math.cos(phase))) * s, 0.65 * s, 0, 0, TAU);
    c.fillStyle = t.t[2]; c.fill(); c.lineWidth = lw; c.strokeStyle = t.line; c.stroke();
  },
  /**
   * The head. step = ATP made so far (each a third of a turn); f is the
   * rotor's progress into the next third. Each front β swings between its
   * states with f: open (out, empty), loose (ADP and Pᵢ), tight (closed on
   * ATP); going from tight to open it lets its ATP go.
   */
  atpHead(c, s, step, f) {
    const m = ink('mulberry'), hy = 12.8, e = f * f * (3 - 2 * f);
    assembly(c, s, [[-1.6, hy - 0.4, 2.3, 3.7, 0, 2], [1.6, hy - 0.4, 2.3, 3.7, 0, 2]], m, 30);
    const SW = [26, 8, -3], DX = [1.5, 0.35, -0.3];   // swing (°) and shift (nm) of a β in each state
    for (let i = 0; i < 2; i++) {
      const sg = i ? 1 : -1, st = (step + i) % 3, nx = (st + 1) % 3;
      const rot = (SW[st] + (SW[nx] - SW[st]) * e) * sg, dx = DX[st] + (DX[nx] - DX[st]) * e;
      c.save(); c.translate(sg * (3.3 + dx) * s, (hy + 0.2) * s); c.rotate(rot * Math.PI / 180);
      assembly(c, s, [[0, 0, 2.35, 4.0, 0, 1]], m, 31 + i);
      // the nucleotide in its site (drawn on the β's visible face)
      const nxp = sg * 0.35 * s, nyp = -0.2 * s;
      if (st === 1) { molGlyph(c, nxp, nyp, s * 0.78, 'adp', 1 - 0.0 * e, Math.PI / 2); const p = tones(ink('ochre')); c.beginPath(); c.arc(nxp + sg * 0.1 * s, nyp + 1.75 * s, 0.28 * s, 0, TAU); c.fillStyle = p.t[1]; c.fill(); c.lineWidth = Math.max(0.5, 0.09 * s); c.strokeStyle = p.line; c.stroke(); }
      else if (st === 2) molGlyph(c, nxp + sg * e * 2.8 * s, nyp + e * 1.6 * s, s * 0.78, 'atp', 1 - e * e, Math.PI / 2);
      c.restore();
    }
    assembly(c, s, [[0, hy + 0.5, 2.5, 4.25, 0, 0], [0, hy + 4.9, 1.5, 0.95, 0, 2]], m, 33);
    // δ (OSCP) caps the head and holds the peripheral stalk
    assembly(c, s, [[3.3, hy + 4.6, 1.6, 0.85, 20, 2]], m, 34);
  },
  quinone(c, s, reduced) {
    const t = tones(ink('ochre'));
    c.strokeStyle = t.line; c.lineWidth = Math.max(0.8, 0.2 * s); c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0.6 * s, 0); for (let k = 1; k <= 6; k++) c.lineTo((0.6 + k * 0.55) * s, (k % 2 ? 0.32 : -0.32) * s); c.stroke();
    c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; c.lineTo(Math.cos(a) * 0.62 * s, Math.sin(a) * 0.62 * s); }
    c.closePath(); c.fillStyle = reduced ? t.line : tok.canvas; c.fill(); c.lineWidth = Math.max(0.8, 0.16 * s); c.stroke();
  },
  carrier(c, s, x, y, r, seed, base, loaded) {
    c.save(); c.translate(x, y);
    assembly(c, s, [[0, 0, r, r * 0.88, 0, loaded ? 1 : 2]], base, seed);
    c.restore();
  },
};

/* ---------- small molecules: the cofactor pools ----------
   Pattern before hue: ATP has three phosphate beads and ADP two; a reduced
   carrier's ring is filled and an oxidised one hollow; NADP carries NAD's
   extra 2′-phosphate bead; FAD is a three-ring flavin. */
const MOL = {
  atp: { ink: 'ochre', n: 3 }, adp: { ink: 'ochre', n: 2 },
  nadh: { ink: 'prussian', red: true }, nad: { ink: 'prussian', red: false },
  nadph: { ink: 'viridian', red: true, p: true }, nadp: { ink: 'viridian', red: false, p: true },
  fadh2: { ink: 'madder', red: true, flavin: true }, fad: { ink: 'madder', red: false, flavin: true },
};
function hexPath(c, x, y, r, rot = Math.PI / 6) { c.moveTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r); for (let k = 1; k <= 6; k++) { const a = rot + k / 6 * TAU; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
/**
 * A cofactor at (x, y), about 2 nm long, space-filling as Goodsell draws small
 * molecules: an adenosine body and its phosphate beads; NAD's two nucleotides
 * joined at the diphosphate, the nicotinamide end dark when reduced and pale
 * when oxidised; FAD's three-lobed flavin the same way. a is opacity.
 */
function molGlyph(c, x, y, s, kind, a = 1, rot = 0) {
  const M = MOL[kind], t = tones(ink(M.ink)), lw = Math.max(0.6, 0.11 * s);
  c.save(); c.translate(x, y); c.rotate(rot); if (a < 1) c.globalAlpha *= a;
  c.lineJoin = 'round'; c.strokeStyle = t.line;
  const ball = (bx, by, r, fill) => { c.beginPath(); c.arc(bx * s, by * s, r * s, 0, TAU); c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.stroke(); };
  const body = (bx, by, rx, ry, fill) => { c.beginPath(); c.ellipse(bx * s, by * s, rx * s, ry * s, 0, 0, TAU); c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.stroke(); };
  if (M.n) {
    // adenosine, then the phosphates in a short curved chain
    for (let k = M.n - 1; k >= 0; k--) ball(0.42 + k * 0.5, (k - 1) * 0.12, 0.3, t.t[1]);
    body(-0.3, 0, 0.62, 0.48, t.t[2]);
  } else if (M.flavin) {
    // the flavin, three lobes in a row, and its adenosine tail
    body(0.95, 0.12, 0.42, 0.34, t.t[2]);
    const f = M.red ? t.dark : tok.canvas;
    c.beginPath(); for (const bx of [-0.78, -0.26, 0.26]) c.ellipse(bx * s, -0.08 * s, 0.34 * s, 0.4 * s, 0, 0, TAU);
    c.fillStyle = f; c.fill(); c.lineWidth = lw; c.stroke();
    if (!M.red) { c.beginPath(); for (const bx of [-0.78, -0.26, 0.26]) c.ellipse(bx * s, -0.08 * s, 0.34 * s, 0.4 * s, 0, 0, TAU); c.fillStyle = t.t[2]; c.globalAlpha *= 0.35; c.fill(); }
  } else {
    // nicotinamide end, the diphosphate, the adenosine end (with NADP's 2′-phosphate)
    if (M.p) ball(1.05, 0.5, 0.24, t.t[1]);
    body(0.72, 0, 0.5, 0.42, t.t[2]);
    ball(0.05, -0.12, 0.24, t.t[1]); ball(0.05, 0.3, 0.22, t.t[1]);
    c.beginPath(); c.ellipse(-0.66 * s, 0, 0.5 * s, 0.42 * s, 0, 0, TAU); c.fillStyle = M.red ? t.dark : tok.canvas; c.fill(); c.lineWidth = lw; c.stroke();
    if (!M.red) { c.globalAlpha *= 0.35; c.fillStyle = t.t[2]; c.fill(); }
  }
  c.restore();
}

/** Superoxide, O₂•⁻: two atoms and the radical's dot. */
function superoxide(c, x, y, s, rot, a = 1) {
  const col = tok.dark ? mix(tok.text, tok.canvas, 0.15) : tok.text;
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= a;
  for (const d of [-0.34, 0.34]) { c.beginPath(); c.arc(d * s, 0, 0.42 * s, 0, TAU); c.fillStyle = tok.canvas; c.fill(); c.lineWidth = Math.max(0.8, 0.13 * s); c.strokeStyle = col; c.stroke(); }
  c.beginPath(); c.arc(0, -0.75 * s, Math.max(1, 0.13 * s), 0, TAU); c.fillStyle = col; c.fill();
  c.restore();
}

/** A photon as a Feynman wiggle along (dx, dy), its tip at (x, y). lam is the wiggle period in nm. */
function wiggle(c, x, y, dx, dy, s, ph, lam = 1.0, col = ink('ochre')) {
  const len = 5 * s, nx = -dy, ny = dx;
  c.beginPath();
  for (let k = 0; k <= 22; k++) {
    const t = k / 22, al = -len * (1 - t), off = 0.55 * s * Math.sin(ph + t * len / (lam * s) * TAU / 1.4) * Math.sin(Math.PI * t);
    const px = x + dx * al + nx * off, py = y + dy * al + ny * off;
    k ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.strokeStyle = col; c.lineWidth = Math.max(1, 0.2 * s); c.lineCap = 'round'; c.stroke();
}

/* ---------- plate furniture ---------- */
/** The sibling sims' cartouche: a double hairline, an italic title, rows of [swatch fn, text]. */
function cartouche(c, x, y, w, rows, title = 'Reference', fs = 13) {
  const rh = fs * 1.55, h = fs * 2.2 + rows.length * rh + 8;
  c.save();
  c.fillStyle = tok.canvas; c.fillRect(x, y, w, h);
  c.strokeStyle = rgba(tok.text, tok.dark ? 0.45 : 0.5); c.lineWidth = 1;
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); c.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
  c.font = `italic ${fs}px ${FONT}`; c.fillStyle = tok.muted; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText(title, x + w / 2, y + fs * 1.55);
  c.textAlign = 'left'; c.textBaseline = 'middle';
  rows.forEach(([sw, text, val, short], i) => {
    const ry = y + fs * 2.2 + rh * (i + 0.5) + 2;
    c.save(); sw(c, x + 22, ry); c.restore();
    c.font = `${fs}px ${FONT}`; c.fillStyle = tok.text;
    const room = w - 52 - (val !== undefined ? c.measureText(val).width + 10 : 0);
    c.fillText(short && c.measureText(text).width > room ? short : text, x + 40, ry);
    if (val !== undefined) { c.textAlign = 'right'; c.fillStyle = tok.text2; c.fillText(val, x + w - 12, ry); c.textAlign = 'left'; }
  });
  c.restore();
  return h;
}
/** A scale bar in nanometres, alternate segments filled, as Miasma's. */
function scaleBar(c, x, y, s, nm = 10, label = 'nm', fs = 12) {
  const seg = nm / 2, w = nm * s;
  c.save();
  c.strokeStyle = tok.text; c.lineWidth = 1;
  for (let k = 0; k < 2; k++) { c.fillStyle = k ? tok.canvas : tok.text; c.fillRect(x + k * seg * s, y, seg * s, 4); }
  c.strokeRect(x + 0.5, y + 0.5, w - 1, 3);
  c.font = `${fs}px ${FONT}`; c.fillStyle = tok.text; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText('0', x, y - 4); c.fillText(String(seg), x + seg * s, y - 4); c.textAlign = 'left'; c.fillText(nm + ' ' + label, x + w - c.measureText(String(nm)).width / 2, y - 4);
  c.restore();
}
/** Callouts: labels in a row with hairline leaders down to their targets. items: [{ x, y, text, key }] */
function callouts(c, items, top, fs, hover) {
  c.save(); c.font = `italic ${fs}px ${FONT}`; c.textBaseline = 'alphabetic'; c.textAlign = 'center';
  const rows = [];
  const placed = items.slice().sort((a, b) => a.x - b.x).map(it => {
    const w = c.measureText(it.text).width; let row = 0;
    while (rows[row] !== undefined && rows[row] > it.x - w / 2 - 8) row++;
    rows[row] = it.x + w / 2;
    return { ...it, row, w };
  });
  for (const it of placed) {
    const ly = top + it.row * (fs + 4);
    c.strokeStyle = rgba(tok.text, it.key === hover ? 0.6 : 0.28); c.lineWidth = 1;
    c.beginPath(); c.moveTo(Math.round(it.x) + 0.5, ly + 4); c.lineTo(Math.round(it.x) + 0.5, it.y); c.stroke();
    c.beginPath(); c.arc(it.x, it.y, 1.4, 0, TAU); c.fillStyle = rgba(tok.text, 0.5); c.fill();
    c.lineWidth = 3; c.strokeStyle = tok.canvas; c.lineJoin = 'round'; c.strokeText(it.text, it.x, ly);
    c.fillStyle = it.key === hover ? tok.text : tok.text2; c.fillText(it.text, it.x, ly);
  }
  c.restore();
}
function panelTitle(c, x, y, letter, text, fs = 13) {
  c.save(); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.font = `600 ${fs + 1}px ${FONT}`; c.fillStyle = tok.text; c.fillText(letter, x, y);
  const w = c.measureText(letter).width;
  c.font = `italic ${fs}px ${FONT}`; c.fillStyle = tok.muted; c.fillText(text, x + w + 7, y);
  c.restore();
}
