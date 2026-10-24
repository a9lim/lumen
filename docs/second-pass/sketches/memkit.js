/* ---------- a specimen's membrane in world px (after src/membrane.js), and what moves in it ---------- */
const WIDTH = { psii: 21, lhcii: 7.5, ndh1: 18, sdh: 7, pq: 4, cytb6f: 10, pc: 4, cytOx: 10, psi: 20, fd: 3, fnr: 6, atpSyn: 11, br: 33, nnt: 10, ucp: 4 };
const NAMES = { psii: 'PSII', ndh1: 'NDH-1', sdh: 'SDH', pq: 'PQ', cytb6f: 'cyt b₆f', pc: 'PC', cytOx: 'cyt oxidase', psi: 'PSI', fd: 'Fd', fnr: 'FNR', atpSyn: 'ATP synthase', nnt: 'NNT' };
const GAP = 3;

/** Lay out a thylakoid sac (the cyanobacterium) from x0 to x1 under `top`. o.lumen, o.below in nm; o.order */
function layoutSac(x0, x1, top, budgetH, o = {}) {
  const order = o.order || ['psii', 'ndh1', 'sdh', 'pq', 'cytb6f', 'pc', 'cytOx', 'psi', 'fd', 'fnr', 'atpSyn', 'nnt'];
  const outer = o.outer ?? 6, lumen = o.lumen ?? 10, below = o.below ?? 21, endL = o.endL ?? 6, endR = o.endR ?? 14;
  const foot = order.reduce((a, k) => a + WIDTH[k], 0) + GAP * (order.length - 1);
  const blockNm = outer + MEM + lumen + MEM + below;
  const s = o.s || Math.max(2.1, Math.min(o.smax || 7, (x1 - x0) / (foot + endL + endR), budgetH / blockNm));
  const L = { s, x0, x1, top, order };
  L.upperMid = top + (outer + MEM / 2) * s; L.mid = L.upperMid + (MEM + lumen) * s;
  L.memTop = L.mid - MEM / 2 * s; L.memBot = L.mid + MEM / 2 * s; L.bottom = L.mid + below * s;
  const span = x1 - x0 - (endL + endR) * s, spare = Math.max(0, span - foot * s);
  const extra = order.length > 1 ? Math.min(10 * s, spare / (order.length - 1)) : 0;
  let x = x0 + endL * s + (spare - extra * (order.length - 1)) / 2;
  L.items = []; L.pos = {};
  const yOf = { pq: L.mid, pc: L.memTop - 2.6 * s, fd: L.memBot + 2.4 * s, sdh: L.mid + 4 * s, fnr: L.mid + 4.6 * s };
  for (const k of order) { const w = WIDTH[k] * s, cx = x + w / 2; L.items.push({ key: k, x: cx }); L.pos[k] = { x: cx, y: yOf[k] ?? L.mid }; x += w + GAP * s + extra; }
  const xr = x1 - 12 * s, R = (L.mid - L.upperMid) / 2, cy = (L.mid + L.upperMid) / 2;
  L.xr = xr;
  L.paths = [[[x0 - 40, L.mid], [xr, L.mid], ...arcPts(xr, cy, R, Math.PI / 2, -Math.PI / 2), [x0 - 40, L.upperMid]]];
  L.lumen = { x0: x0 + 2, x1: xr + R * 0.6, y0: L.upperMid + MEM / 2 * s, y1: L.mid - MEM / 2 * s };
  // what the stroma's molecules keep clear of: the complexes' stromal parts, as ellipses [x, y, rx, ry]
  const P = L.pos, mid = L.mid;
  L.avoid = [];
  if (P.psii) L.avoid.push([P.psii.x, mid + 13 * s, 17 * s, 11 * s]);
  if (P.ndh1) L.avoid.push([P.ndh1.x + 5.3 * s, mid + 5.4 * s, 3.6 * s, 4 * s]);
  if (P.sdh) L.avoid.push([P.sdh.x, mid + 5.6 * s, 3.4 * s, 3.4 * s]);
  if (P.psi) L.avoid.push([P.psi.x, mid + 4 * s, 5 * s, 2 * s]);
  if (P.fnr) L.avoid.push([P.fnr.x, mid + 4.8 * s, 3.2 * s, 2.8 * s]);
  if (P.atpSyn) L.avoid.push([P.atpSyn.x + 0.8 * s, mid + 11.6 * s, 6.6 * s, 7.4 * s]);
  if (P.nnt) L.avoid.push([P.nnt.x, mid + 5 * s, 5 * s, 3.4 * s]);
  L.band = { x0: x0, x1: x1, y0: L.memBot + 1.1 * s, y1: L.bottom - 0.6 * s };
  return L;
}

/** The still parts of the sac: lipids and protein bodies. proposed picks the drawing. */
function drawSacStatic(c, L, proposed, ox = 0) {
  const s = L.s, D = proposed ? PROPOSED : TODAY;
  for (const path of L.paths) proposed ? lipidsProposed(c, path, s, 'galacto', false, ox) : lipidsToday(c, path, s, 'galacto');
  const at = (x, y, f) => { c.save(); c.translate(x, y); f(); c.restore(); };
  for (const it of L.items) {
    const x = it.x, y = L.mid;
    switch (it.key) {
      case 'psii': at(x, y, () => { D.pbs(c, s); D.psii(c, s); }); break;
      case 'ndh1': at(x, y, () => D.ndh1(c, s, false)); break;
      case 'sdh': at(x, y, () => D.sdh(c, s)); break;
      case 'cytb6f': at(x, y, () => D.b6f(c, s)); break;
      case 'cytOx': at(x, y, () => D.cytOx(c, s)); break;
      case 'psi': at(x, y, () => D.psi(c, s)); break;
      case 'fnr': at(x, y, () => D.fnr(c, s)); break;
      case 'nnt': at(x, y, () => D.nnt(c, s)); break;
      case 'atpSyn': at(x, y, () => D.atpStator(c, s)); break;
    }
  }
}

/* ---------- particles (src/particles.js), shared by the sketches ---------- */
const CHAIN_TIME = 1.39;
function makeParticles(L) {
  return { L, electrons: [], protons: [], photons: [], mols: [], tags: [], _qa: 0, _ql: 0, seenAtp: 0, seenLeak: 0, short: 0 };
}
function spawnChain(Pt, keys, cb, type) {
  const pts = keys.map(k => Pt.L.pos[k]).filter(Boolean).map((p, i) => ({ x: p.x, y: p.y, key: keys[i] }));
  if (pts.length !== keys.length) { for (const i in cb) cb[i](); return; }
  Pt.electrons.push({ pts, progress: 0, cb: cb || {}, fired: 0, type });
}
function spawnProtonUp(Pt, x) { const s = Pt.L.s; Pt.protons.push({ x: x + (Math.random() - 0.5) * 3 * s, y: Pt.L.memBot + 3 * s, mode: 'up', a: 0, vx: 0, vy: 0 }); }
function spawnPhoton(Pt, key) {
  const t = Pt.L.pos[key]; if (!t) return;
  const L = Pt.L, s = L.s, a = -Math.PI / 2 - 0.55 + (Math.random() - 0.5) * 0.5;
  const tx = t.x + (Math.random() - 0.5) * 6 * s, ty = L.mid, d = Math.max(60, ty - L.top + 30);
  const sx = tx + Math.cos(a) * d / Math.abs(Math.sin(a)) * 0.6, sy = ty - d, len = Math.hypot(tx - sx, ty - sy);
  Pt.photons.push({ x: sx, y: sy, dx: (tx - sx) / len, dy: (ty - sy) / len, left: len, ph: Math.random() * TAU, key });
}
function poolProton(L) { const B = L.lumen; return { x: B.x0 + Math.random() * (B.x1 - B.x0), y: B.y0 + Math.random() * (B.y1 - B.y0), mode: 'lumen', a: 1, vx: 0, vy: 0 }; }
function confineLumen(p, B) {
  if (p.x < B.x0) { p.x = B.x0; p.vx = Math.abs(p.vx); } if (p.x > B.x1) { p.x = B.x1; p.vx = -Math.abs(p.vx); }
  if (p.y < B.y0) { p.y = B.y0; p.vy = Math.abs(p.vy); } if (p.y > B.y1) { p.y = B.y1; p.vy = -Math.abs(p.vy); }
}
/** Step what moves. store: { H, atpOx, leaked } (the model's tallies the pool follows). */
function stepParticles(Pt, dt, store) {
  const L = Pt.L, s = L.s, B = L.lumen;
  for (let i = Pt.electrons.length - 1; i >= 0; i--) {
    const e = Pt.electrons[i]; e.progress += dt / CHAIN_TIME;
    const n = e.pts.length - 1, seg = Math.min(n - 1, Math.floor(e.progress * n));
    while (e.fired <= seg) { const f = e.cb[e.fired]; e.fired++; if (f) f(); }
    if (e.progress >= 1) Pt.electrons.splice(i, 1);
  }
  let inPool = 0, up = 0;
  for (const p of Pt.protons) {
    if (p.mode === 'lumen') { inPool++; p.vx += (Math.random() - 0.5) * 900 * dt; p.vy += (Math.random() - 0.5) * 700 * dt; p.vx *= 0.94; p.vy *= 0.94; p.x += p.vx * dt; p.y += p.vy * dt; confineLumen(p, B); }
    else if (p.mode === 'up') { up++; p.a = Math.min(1, p.a + dt * 4); p.y -= 22 * s * dt; if (p.y < L.memTop - 1.5 * s) { p.mode = 'lumen'; p.vy = -60; } }
    else if (p.mode === 'site') { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), v = Math.max(60 * s, d * 5) * dt; if (d <= v) { p.x = p.tx; p.y = p.ty; p.mode = 'down'; } else { p.x += dx / d * v; p.y += dy / d * v; } }
    else if (p.mode === 'down') { p.y += 14 * s * dt; if (p.y > L.memBot + 1 * s) p.a -= dt * 3; }
  }
  Pt.protons = Pt.protons.filter(p => p.a > 0);
  const target = Math.min(600, Math.max(0, store.H - up));
  Pt._qa = Math.min(400, Pt._qa + Math.max(0, store.atpOx - Pt.seenAtp) * 4); Pt.seenAtp = store.atpOx;
  Pt._ql = Math.min(400, Pt._ql + Math.max(0, store.leaked - Pt.seenLeak)); Pt.seenLeak = store.leaked;
  if (inPool > target) {
    let n = inPool - target; const a = Math.min(n, Pt._qa); Pt._qa -= a; n -= a; sendProtons(Pt, a, 'atpSyn');
    const l = Math.min(n, Pt._ql); Pt._ql -= l; n -= l; sendProtons(Pt, l, null); sendProtons(Pt, n, 'nnt'); Pt.short = 0;
  } else if (inPool < target) { Pt.short += dt; if (Pt.short > 1) for (let k = 0; k < Math.min(8, target - inPool); k++) Pt.protons.push(poolProton(L)); }
  else { Pt.short = 0; Pt._qa = Math.min(Pt._qa, 8); Pt._ql = Math.min(Pt._ql, 8); }
  for (const p of Pt.photons) { const m = 300 * Math.max(0.6, s / 6) * dt; p.x += p.dx * m; p.y += p.dy * m; p.left -= m; p.ph += dt * 30; }
  Pt.photons = Pt.photons.filter(p => p.left > 0);
  for (const m of Pt.mols) { m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.rot += dt * 0.5; }
  Pt.mols = Pt.mols.filter(m => m.age < m.life);
}
function sendProtons(Pt, n, site) {
  if (n <= 0) return;
  const L = Pt.L, s = L.s, p0 = site && L.pos[site];
  const ex = p0 ? p0.x + (site === 'atpSyn' ? 3.4 * s : 0) : 0, ey = L.memTop;
  for (let k = 0; k < n; k++) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < Pt.protons.length; i++) { const p = Pt.protons[i]; if (p.mode !== 'lumen') continue; const d = p0 ? Math.abs(p.x - ex) + Math.abs(p.y - ey) * 0.5 : Math.random(); if (d < bd) { bd = d; best = i; } }
    if (best < 0) return;
    const p = Pt.protons[best]; p.mode = 'site'; if (p0) { p.tx = ex; p.ty = ey; } else { p.tx = p.x; p.ty = L.memTop; }
  }
}
const carrierOf = (a, b) => { for (const k of ['pq', 'pc', 'fd']) if (a === k || b === k) return k; return null; };
function drawCarrier(c, k, x, y, s, loaded, proposed) {
  if (k === 'pq') { c.save(); c.translate(x, y); (proposed ? PROPOSED : TODAY).quinone(c, s, loaded); c.restore(); return; }
  const base = k === 'pc' ? ink('prussian') : ink('sienna'), r = k === 'pc' ? 1.7 : 1.4;
  if (proposed) PROPOSED.carrier(c, s, x, y, r, k === 'pc' ? 19 : 22, base, loaded);
  else TODAY.carrier(c, s, x, y, r, k === 'pc' ? 19 : 22, loaded ? base : mix(base, tok.canvas, 0.3));
}
function drawParticles(c, Pt, proposed, time) {
  const L = Pt.L, s = L.s, pos = L.pos, busy = { pq: 0, pc: 0, fd: 0 };
  for (const e of Pt.electrons) {
    const n = e.pts.length - 1, t = Math.min(0.9999, e.progress) * n, i = Math.floor(t), f = t - i, a = e.pts[i], b = e.pts[i + 1];
    const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, ride = carrierOf(a.key, b.key);
    if (ride) { busy[ride]++; drawCarrier(c, ride, x, y, s, true, proposed); }
    else { c.beginPath(); c.arc(x, y, Math.max(1.6, 0.36 * s), 0, TAU); c.lineWidth = 1.2; c.strokeStyle = tok.text; c.fillStyle = tok.canvas; c.fill(); c.stroke(); }
  }
  const idle = { pq: 3, pc: 2, fd: 1 };
  for (const k in idle) { if (!pos[k]) continue; for (let j = busy[k]; j < idle[k]; j++) { const ph = j * 2.1 + k.length; drawCarrier(c, k, pos[k].x + (j - (idle[k] - 1) / 2) * 3.2 * s + Math.sin(time * 0.4 + ph) * 0.6 * s, pos[k].y + (k === 'pq' ? (j % 2 ? 0.7 : -0.7) * s : 0), s, false, proposed); } }
  c.fillStyle = tok.accent; const r = Math.max(1.5, 0.4 * s);
  for (const p of Pt.protons) { c.globalAlpha = clamp(p.a, 0, 1) * (p.mode === 'lumen' ? 1 : 0.42); c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill(); }
  c.globalAlpha = 1;
  for (const p of Pt.photons) wiggle(c, p.x, p.y, p.dx, p.dy, s, p.ph);
  for (const m of Pt.mols) { c.globalAlpha = clamp(Math.min(m.age * 3, (m.life - m.age) * 1.5), 0, 1); if (m.type === 'atp') TODAY.atp(c, s, m.x, m.y, m.rot); }
  c.globalAlpha = 1;
}

/* ---------- the stroma's pools as molecules (proposed) ----------
   One molecule per unit of each conserved pool: 40 ATP/ADP, 40 NAD(H),
   40 NADP(H), 20 FAD(H₂). The charged or reduced count always equals the
   store's; a change that has a place (ATP synthase, FNR, NDH-1, NNT, or an
   enzyme on the map) converts the molecule nearest that place. */
const POOLS = { atp: 40, nadh: 40, nadph: 40, fadh2: 20 };
function makeStroma(L, store, seed = 7) {
  const rnd = mulberry32(seed), mols = [];
  for (const [k, n] of Object.entries(POOLS)) for (let i = 0; i < n; i++) {
    const m = { pool: k, on: i < store[k], x: 0, y: 0, vx: 0, vy: 0, rot: rnd() * TAU, vr: 0, dock: null, flash: 0 };
    placeFree(L, m, rnd); mols.push(m);
  }
  return { L, mols, queue: [], threads: [], rnd };
}
function inAvoid(L, x, y, pad = 0) { for (const [ax, ay, rx, ry] of L.avoid) { const dx = (x - ax) / (rx + pad), dy = (y - ay) / (ry + pad); if (dx * dx + dy * dy < 1) return true; } return false; }
function placeFree(L, m, rnd) {
  const B = L.band;
  for (let t = 0; t < 60; t++) { m.x = B.x0 + rnd() * (B.x1 - B.x0); m.y = B.y0 + rnd() * (B.y1 - B.y0); if (!inAvoid(L, m.x, m.y, 4)) return; }
}
/** Queue a change with a place: { pool, d: ±1, site: [x, y] | null, thread: [x, y] | null } */
function stromaEvent(St, ev) { St.queue.push(ev); }
function stepStroma(St, dt, store) {
  const L = St.L, s = L.s, B = L.band, rnd = St.rnd;
  for (const m of St.mols) {
    m.flash = Math.max(0, m.flash - dt * 1.4);
    if (m.dock) {
      const D = m.dock, dx = D.x - m.x, dy = D.y - m.y, d = Math.hypot(dx, dy), v = Math.max(30 * s, d * 4) * dt;
      if (D.phase === 0) { if (d <= v) { m.x = D.x; m.y = D.y; D.phase = 1; D.t = 0; } else { m.x += dx / d * v; m.y += dy / d * v; } }
      else { D.t += dt; if (D.t > 0.18) { m.on = D.to; m.flash = 1; m.vx = D.ex * 5 * s; m.vy = D.ey * 5 * s; m.dock = null; } }
      continue;
    }
    m.vx += (rnd() - 0.5) * 60 * s * dt; m.vy += (rnd() - 0.5) * 60 * s * dt; m.vx *= 0.92; m.vy *= 0.92;
    m.vr += (rnd() - 0.5) * 2.5 * dt; m.vr *= 0.95; m.rot += m.vr * dt;
    const nx = m.x + m.vx * dt, ny = m.y + m.vy * dt;
    if (inAvoid(L, nx, ny, 2)) { m.vx *= -0.6; m.vy *= -0.6; } else { m.x = nx; m.y = ny; }
    if (m.x < B.x0) { m.x = B.x0; m.vx = Math.abs(m.vx); } if (m.x > B.x1) { m.x = B.x1; m.vx = -Math.abs(m.vx); }
    if (m.y < B.y0) { m.y = B.y0; m.vy = Math.abs(m.vy); } if (m.y > B.y1) { m.y = B.y1; m.vy = -Math.abs(m.vy); }
  }
  // reconcile each pool with the store, the queued changes first
  for (const k of Object.keys(POOLS)) {
    let on = 0; for (const m of St.mols) if (m.pool === k && (m.dock ? m.dock.to : m.on)) on++;
    let diff = store[k] - on;
    while (diff !== 0) {
      const d = diff > 0 ? 1 : -1, qi = St.queue.findIndex(e => e.pool === k && e.d === d), ev = qi >= 0 ? St.queue.splice(qi, 1)[0] : null;
      const near = ev && (ev.site || ev.thread);
      let best = null, bd = 1e18;
      for (const m of St.mols) {
        if (m.pool !== k || m.dock || m.on === (d > 0)) continue;
        const dd = near ? (m.x - near[0]) ** 2 + (m.y - near[1]) ** 2 * (ev.thread ? 0.15 : 1) : rnd();
        if (dd < bd) { bd = dd; best = m; }
      }
      if (!best) break;
      if (ev && ev.site) { const a = rnd() * TAU; best.dock = { x: ev.site[0], y: ev.site[1], to: d > 0, phase: 0, ex: Math.cos(a) * 0.5, ey: 0.6 + 0.4 * Math.abs(Math.sin(a)) }; }
      else { best.on = d > 0; best.flash = 1; if (ev && ev.thread) St.threads.push({ a: best, b: ev.thread, t: 0, col: ink(MOL[k].ink) }); }
      diff -= d;
    }
  }
  St.queue = St.queue.filter(e => (e.age = (e.age || 0) + dt) < 1.5);
  for (const t of St.threads) t.t += dt;
  St.threads = St.threads.filter(t => t.t < 1.1);
}
function drawStroma(c, St) {
  const s = St.L.s, gs = s * 1.1;
  for (const m of St.mols) {
    const kind = m.on ? m.pool : POOL_OF[m.pool][1];
    molGlyph(c, m.x, m.y, gs * (1 + 0.25 * m.flash * m.flash), kind, 1, m.rot);
  }
}
function drawThreads(c, St) {
  for (const t of St.threads) {
    const a = 1 - t.t / 1.1;
    c.save(); c.globalAlpha = a * 0.7; c.strokeStyle = t.col; c.lineWidth = 1; c.setLineDash([1.5, 3]); c.lineCap = 'round';
    c.beginPath(); c.moveTo(t.a.x, t.a.y); const my = (t.a.y + t.b[1]) / 2; c.bezierCurveTo(t.a.x, my, t.b[0], my, t.b[0], t.b[1]); c.stroke();
    c.restore();
  }
}
