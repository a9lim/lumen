/* ---------- drawing the map, today (src/mapdraw.js) and as proposed ---------- */
const FREF = 0.55;
function trace(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); }
function sideDir(M, S) {
  let v;
  if (S.side === 'in') { const c0 = M.T(...KC); v = [c0[0] - S.pos[0], c0[1] - S.pos[1]]; }
  else v = ({ t: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0], tr: [0.6, -0.8], tl: [-0.7, -0.7], br: [0.7, 0.7], bl: [-0.7, 0.7] })[S.side];
  const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L];
}
const lineOn = (sc, line) => !(sc.off && sc.off[line]);
function segVis(M, sc, id) {
  const s = M.segs[id];
  if (lockedSeg(id, sc)) return { a: 0, hidden: true };
  return { a: lineOn(sc, s.line) ? 1 : 0, hidden: false };
}

/**
 * The whole map. o: { proposed, sc, flux, pools, hover, dt, pulses (seg id → 0..1), counts, keyRows }
 */
function drawMap(c, M, o) {
  const P = o.proposed, us = M.us, flux = o.flux, sc = o.sc;
  const idleMix = P ? (tok.dark ? 0.2 : 0.34) : (tok.dark ? 0.32 : 0.5);
  const idle = (b) => mix(b, tok.canvas, idleMix);
  const inkOf = (s, f) => { const b = ink(s.ink); return mix(idle(b), b, Math.min(1, Math.abs(f) * 6)); };
  const wmin = P ? Math.max(1.6, 2.0 * us) : 1.25;
  const weight = (f) => wmin + (6.2 * us - wmin) * Math.pow(Math.min(1, Math.abs(f) / FREF), 0.7);
  M.vis = {}; for (const id in M.segs) M.vis[id] = segVis(M, sc, id);
  for (const S of Object.values(M.st)) S.hidden = true;
  for (const seg of Object.values(M.segs)) if (!M.vis[seg.id].hidden) { M.st[seg.from].hidden = false; M.st[seg.to].hidden = false; }
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  if (P && sc.zones) drawZones(c, M);
  const segs = Object.values(M.segs).filter(s => !M.vis[s.id].hidden);
  // CO₂ spurs
  c.font = `italic ${Math.max(10, 11.5 * us)}px ${FONT}`;
  for (const [id, a0, b0] of CO2) {
    if (!a0) continue;
    const f = Math.abs(flux[id] || 0), v = M.vis[id];
    if (f < 0.04 || !v || v.hidden) continue;
    const A = M.T(...a0), B = M.T(...b0), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
    c.globalAlpha = Math.min(1, f * 8) * v.a;
    c.strokeStyle = rgba(tok.text, 0.45); c.lineWidth = 1; c.setLineDash([2.5, 2.5]);
    c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); c.setLineDash([]);
    c.fillStyle = tok.muted;
    c.textAlign = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : 'center';
    c.textBaseline = Math.abs(dx) > Math.abs(dy) ? 'middle' : (dy > 0 ? 'top' : 'alphabetic');
    c.fillText('CO₂', B[0] + dx / L * 3, B[1] + dy / L * 3);
  }
  c.globalAlpha = 1;
  // switched off: dashed hairlines
  c.setLineDash([3, 3.5]); c.lineWidth = 1;
  for (const s of segs) { if (M.vis[s.id].a > 0.98) continue; c.strokeStyle = mix(ink(s.ink), tok.canvas, 0.35); trace(c, s.pts); c.stroke(); }
  c.setLineDash([]);
  const live = segs.filter(s => M.vis[s.id].a > 0.02).sort((a, b) => Math.abs(flux[a.id] || 0) - Math.abs(flux[b.id] || 0));
  for (const s of live) { const f = flux[s.id] || 0; c.strokeStyle = o.hover === s.id ? ink(s.ink) : inkOf(s, f); c.lineWidth = weight(f); trace(c, s.pts); c.stroke(); }
  // trains
  c.strokeStyle = tok.canvas; c.lineCap = 'butt';
  for (const s of live) {
    const f = flux[s.id] || 0; if (Math.abs(f) < 0.02 || s.len < 6) continue;
    const w = weight(f), gap = 34 * us, n = Math.max(1, Math.round(s.len / gap)), step = s.len / n, dir = f > 0 ? 1 : -1, h = Math.max(1.1, w / 2 - 0.4), d = Math.min(h * 0.9, 3.2 * us);
    c.globalAlpha = Math.min(1, Math.abs(f) * 10); c.lineWidth = Math.max(1, 0.32 * w);
    for (let i = 0; i < n; i++) {
      const v = ((M.phase[s.id] + i * step) % s.len + s.len) % s.len; if (v < 4 || v > s.len - 4) continue;
      const [x, y, ang] = segAt(s, v), cs = Math.cos(ang), sn = Math.sin(ang), tx = cs * dir, ty = sn * dir, nx = -sn, ny = cs;
      c.beginPath(); c.moveTo(x - tx * d + nx * h, y - ty * d + ny * h); c.lineTo(x, y); c.lineTo(x - tx * d - nx * h, y - ty * d - ny * h); c.stroke();
    }
  }
  c.globalAlpha = 1; c.lineCap = 'round';
  // buffer bars where a gate stops an enzyme in its running direction
  for (const s of live) {
    if (!s.label && !PAIR[s.id]) continue;
    const rev = (flux[s.id] || 0) < -0.02;
    const g = gatesOf(s.id, o.pools, rev).find(q => q.f === 0);
    if (!g) continue;
    const [x, y, ang] = segAt(s, s.len / 2), nx = -Math.sin(ang), ny = Math.cos(ang), hh = weight(0) / 2 + 4.5 * us;
    c.strokeStyle = tok.text; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + nx * hh, y + ny * hh); c.lineTo(x - nx * hh, y - ny * hh); c.stroke();
  }
  drawStations(c, M, o, weight, inkOf);
  drawSegLabels(c, M, o);
  drawLoops(c, M, o);
  if (!P) drawTags(c, M, o);
  c.restore();
}

function drawStations(c, M, o, weight, inkOf) {
  const us = M.us, sw = Math.max(1.3, 1.7 * us), rr = Math.max(3.4, 5 * us);
  for (const S of Object.values(M.st)) {
    if (S.hidden) continue;
    const [x, y] = S.pos;
    if (S.kind === 'corr') {
      c.save(); c.translate(x, y); c.rotate(Math.PI / 2); const len = M.gap + 2 * rr;
      c.beginPath(); c.roundRect(-len / 2, -rr, len, 2 * rr, rr); c.fillStyle = tok.canvas; c.fill(); c.lineWidth = sw; c.strokeStyle = tok.text; c.stroke(); c.restore();
    } else if (S.kind === 'hub') {
      c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fillStyle = tok.canvas; c.fill(); c.lineWidth = sw; c.strokeStyle = tok.text; c.stroke();
    } else if (S.anchor) {
      const seg = M.segs[S.seg], f = o.flux[S.seg] || 0, w = weight(f);
      const [dx, dy] = sideDir(M, S), nx = -Math.sin(S.ang), ny = Math.cos(S.ang), sg = nx * dx + ny * dy >= 0 ? 1 : -1, a0 = w / 2 - 0.5, a1 = w / 2 + 5 * us;
      c.globalAlpha = M.vis[S.seg].a > 0.5 ? 1 : 0.35; c.strokeStyle = inkOf(seg, f); c.lineWidth = Math.max(1.5, 2.4 * us); c.lineCap = 'butt';
      c.beginPath(); c.moveTo(S.anchor[0] + nx * sg * a0, S.anchor[1] + ny * sg * a0); c.lineTo(S.anchor[0] + nx * sg * a1, S.anchor[1] + ny * sg * a1); c.stroke();
      c.lineCap = 'round'; c.globalAlpha = 1;
      S.tickEnd = [S.anchor[0] + nx * sg * a1, S.anchor[1] + ny * sg * a1];
    }
  }
  const fs = Math.max(10.5, 13.5 * us);
  for (const S of Object.values(M.st)) {
    if (S.hidden) continue;
    const [dx, dy] = sideDir(M, S);
    let bx, by, d;
    if (S.kind === 'tick') { [bx, by] = S.tickEnd || S.pos; d = 3; } else { [bx, by] = S.pos; d = rr + (S.kind === 'corr' ? M.gap / 2 : 0) + 3; }
    const x = bx + dx * d, y = by + dy * d;
    let align, base;
    if (Math.abs(dx) > 0.75) { align = dx > 0 ? 'left' : 'right'; base = 'middle'; }
    else if (S.side.length === 2 || S.side === 'in') { align = dx >= 0.2 ? 'left' : dx <= -0.2 ? 'right' : 'center'; base = dy < 0 ? 'alphabetic' : 'top'; }
    else { align = 'center'; base = dy > 0 ? 'top' : 'alphabetic'; }
    const n = (o.counts && o.counts[S.id]) || 0, cnt = n > 0 ? ' ' + n : '';
    c.font = `${fs}px ${FONT}`; const wn = c.measureText(S.label).width;
    c.font = `${fs * 0.86}px ${FONT}`; const wc = cnt ? c.measureText(cnt).width : 0, W = wn + wc;
    const left = align === 'left' ? x : align === 'right' ? x - W : x - W / 2, yy = y + (base === 'top' ? 1 : 0);
    c.textAlign = 'left'; c.textBaseline = base;
    c.font = `${fs}px ${FONT}`; c.fillStyle = n > 0 ? tok.text : tok.muted; c.fillText(S.label, left, yy);
    if (cnt) { c.font = `${fs * 0.86}px ${FONT}`; c.fillStyle = tok.text2; c.fillText(cnt, left + wn, yy); }
  }
}

/** Enzyme labels. Proposed: each carries its pools as glyphs (Beck's connections), and its gates. */
function drawSegLabels(c, M, o) {
  const P = o.proposed, M2 = M, us = M.us, fs = Math.max(10, 11.5 * us);
  const isLive = (id) => id && M.vis[id] && !M.vis[id].hidden && M.vis[id].a > 0.02;
  c.font = `italic ${fs}px ${FONT}`; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (const s of Object.values(M.segs)) {
    if (!s.lab) continue;
    const pair = PAIR[s.id];
    if (!isLive(s.id) && !isLive(pair)) continue;
    const fa = o.flux[s.id] || 0, fb = pair ? o.flux[pair] || 0 : 0, f = fa - fb;
    const other = Math.abs(fb) > Math.abs(fa) + 0.005 || !isLive(s.id);
    const rev = (f < -0.02 || (!isLive(s.id) && isLive(pair)));
    const text = rev && s.rev ? s.rev : s.label;
    c.globalAlpha = 1;
    c.font = `italic ${fs}px ${FONT}`;
    const tw = c.measureText(text).width;
    // the cofactor glyphs go after the name; the label is laid out as one group
    let cof = [];
    if (P) {
      const id = other && pair ? pair : s.id, cc = COF[id];
      if (cc) cof = (id === pair ? cc[0] : (rev ? cc[1] : cc[0])) || [];
    }
    const gs = fs * 0.46, signW = (k, n) => { c.font = `${fs * 0.86}px ${FONT}`; return c.measureText((n > 0 ? '+' : '−') + (Math.abs(n) > 1 ? Math.abs(n) : '')).width; };
    const gws = cof.map(([k, n]) => signW(k, n) + 2.9 * gs + 4), gwid = cof.length ? 5 + gws.reduce((p, q) => p + q, 0) : 0;
    c.font = `italic ${fs}px ${FONT}`;
    const W = tw + gwid;
    let x0 = s.lab.align === 'left' ? s.lab.x : s.lab.align === 'right' ? s.lab.x - W : s.lab.x - W / 2;
    const y = s.lab.y;
    c.textAlign = 'left'; c.lineWidth = 3; c.strokeStyle = tok.canvas;
    c.fillStyle = o.hover === s.id ? tok.text : ink(other ? M.segs[pair].ink : s.ink);
    c.strokeText(text, x0, y); c.fillText(text, x0, y);
    const gid = other && pair ? pair : s.id;
    if (cof.length) {
      const pulse = (o.pulses && o.pulses[gid]) || 0, fl = Math.min(1, Math.abs(o.flux[gid] || 0) * 4);
      let gx = x0 + tw + 5;
      cof.forEach(([k, n], i) => {
        const made = n > 0, kind = made ? k : POOL_OF[k][1];
        c.save();
        c.fillStyle = tok.canvas; c.fillRect(gx - 1, y - fs * 0.6, gws[i], fs * 1.2);
        c.font = `${fs * 0.86}px ${FONT}`; c.fillStyle = tok.text2; c.textBaseline = 'middle';
        const sign = (made ? '+' : '−') + (Math.abs(n) > 1 ? Math.abs(n) : '');
        c.fillText(sign, gx, y + 0.5);
        const sw = c.measureText(sign).width;
        molGlyph(c, gx + sw + 1.5 * gs, y, gs * (1 + 0.3 * pulse), made ? k : POOL_OF[k][0], 0.5 + 0.5 * Math.max(pulse, fl), 0);
        c.restore();
        gx += gws[i];
      });
    }
    // gates on the track itself, across from the name: the effector and ⊣ (inhibits), → (needed) or ⊕ (activates)
    if (P) {
      const gates = gatesOf(gid, o.pools, rev), sg = M.segs[gid];
      gates.forEach((g, i) => {
        const strength = g.f === 0 ? 1 : g.how === '⊕' ? 0.8 : 1 - g.f;
        const [mx, my, ang] = segAt(sg, sg.len / 2), [ox, oy] = s.lab.out || [0, -1], ol = Math.hypot(ox, oy) || 1;
        const ux = -ox / ol, uy = -oy / ol, d0 = 4 + 2.2 * us, d1 = fs * 1.05;
        const ax = mx + ux * d0, ay = my + uy * d0, bx = mx + ux * (d0 + d1), by = my + uy * (d0 + d1);
        c.save(); c.globalAlpha = 0.4 + 0.6 * strength; c.strokeStyle = tok.text; c.lineWidth = 1.2; c.lineCap = 'butt';
        if (g.f > 0 && g.f < 1 && g.how !== '⊕') c.setLineDash([2, 1.6]);
        c.beginPath(); c.moveTo(bx, by); c.lineTo(ax, ay); c.stroke(); c.setLineDash([]);
        const px = -uy, py = ux;
        if (g.how === '⊣') { c.lineWidth = 1.6; c.beginPath(); c.moveTo(ax + px * 4, ay + py * 4); c.lineTo(ax - px * 4, ay - py * 4); c.stroke(); }
        else if (g.how === '→') { c.beginPath(); c.moveTo(ax + ux * 4 + px * 3, ay + uy * 4 + py * 3); c.lineTo(ax, ay); c.lineTo(ax + ux * 4 - px * 3, ay + uy * 4 - py * 3); c.stroke(); }
        else { c.beginPath(); c.arc(ax + ux * 3, ay + uy * 3, 3, 0, TAU); c.stroke(); }
        molGlyph(c, bx + ux * gs * 1.1, by + uy * gs * 1.1 + (Math.abs(uy) > 0.5 ? 0 : 0), gs, g.eff, 1, Math.abs(ux) > 0.7 ? 0 : 0);
        c.restore();
      });
    }
    s.lab.box = [x0 - 3, y - fs / 2 - 3, x0 + W + 3, y + fs / 2 + 3];
  }
  c.globalAlpha = 1;
}

function drawLoops(c, M, o) {
  const us = M.us, fs = Math.max(11, 14 * us);
  for (const L of M.loops) {
    const ids = M.tracks[L.line]?.segs || [];
    const vis = ids.map(id => M.vis[id]).filter(Boolean);
    if (!vis.length || vis.every(v => v.hidden) || Math.max(...vis.map(v => v.a)) < 0.35) continue;
    const base = ink(LINES[L.line].ink);
    c.font = `italic ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(L.name).width; c.font = `${fs * 0.82}px ${FONT}`;
    const wt = L.times ? c.measureText(' ' + L.times).width : 0, hw = (w + wt) / 2, x0 = L.pos[0] - hw;
    if (L.span) {
      const [a, b] = L.span, oo = -5 * us;
      c.strokeStyle = mix(base, tok.canvas, 0.4); c.lineWidth = 1;
      c.beginPath(); c.moveTo(a[0], a[1] + oo); c.lineTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(b[0], b[1] + oo); c.stroke();
    }
    c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = tok.canvas;
    c.font = `italic ${fs}px ${FONT}`; c.textAlign = 'left'; c.fillStyle = base;
    c.strokeText(L.name, x0, L.pos[1]); c.fillText(L.name, x0, L.pos[1]);
    if (L.times) { c.font = `${fs * 0.82}px ${FONT}`; c.fillStyle = tok.muted; c.strokeText(' ' + L.times, x0 + w, L.pos[1]); c.fillText(' ' + L.times, x0 + w, L.pos[1]); }
  }
}

function drawTags(c, M, o) {
  if (!o.tags) return;
  const fs = Math.max(10, 11.5 * M.us);
  c.font = `italic ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = tok.canvas;
  for (const t of o.tags) { c.globalAlpha = Math.min(1, (t.life - t.age) * 1.6, t.age * 8); c.fillStyle = t.color; c.strokeText(t.text, t.x, t.y - t.age * 10); c.fillText(t.text, t.x, t.y - t.age * 10); }
  c.globalAlpha = 1;
}

/** Proposed, for a cell with a mitochondrion: the matrix as a fare zone, its boundary a bilayer in miniature. */
function drawZones(c, M) {
  const [x0, y0] = M.T(13.25, 4.5), [x1, y1] = M.T(24.5, 10.45), r = M.U * 0.6;
  c.save();
  c.beginPath(); c.roundRect(x0, y0, x1 - x0, y1 - y0, r);
  c.fillStyle = tok.panel; c.fill();
  // the inner membrane: two rows of heads and a pale band between
  const Lc = lipidColors(), gap = 2.4;
  c.strokeStyle = Lc.band; c.lineWidth = gap * 2; c.stroke();
  for (const d of [-gap, gap]) {
    c.beginPath(); c.roundRect(x0 - d, y0 - d, x1 - x0 + 2 * d, y1 - y0 + 2 * d, r + d);
    c.setLineDash([1.6, 1.9]); c.lineCap = 'round'; c.strokeStyle = Lc.head; c.lineWidth = 2.2; c.stroke();
  }
  c.setLineDash([]);
  // the zone's name sits on its boundary, as a fare zone's does
  c.font = `italic ${Math.max(10.5, 13 * M.us)}px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle';
  const zl = 'mitochondrial matrix', zw = c.measureText(zl).width;
  c.fillStyle = tok.canvas; c.fillRect(x0 + r + 2, y0 - 9, zw + 12, 18);
  c.fillStyle = tok.muted; c.fillText(zl, x0 + r + 8, y0);
  c.textAlign = 'left'; c.fillText('cytosol', M.T(0.2, 0)[0], M.T(0, -0.6)[1]);
  c.restore();
}

/** Today's key (src/mapdraw.js drawKey): the lines by flux, and the pools as bars. */
function drawKeyToday(c, M, o) {
  const [gx0, gy0, gx1, gy1] = KEY_BOX, a = M.T(gx0, gy0), b = M.T(gx1, gy1), us = M.us;
  const x0 = a[0], y0 = a[1], x1 = b[0], y1 = b[1], fs = Math.max(10.5, 13 * us), colW = (x1 - x0) * 0.47;
  c.save(); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.font = `italic ${fs}px ${FONT}`; c.fillStyle = tok.muted; c.fillText('Lines, by flux', x0, y0 + fs);
  const rows = lineRows(M, o), rowH = Math.min(22 * us + 4, (y1 - y0 - fs - 34) / 7);
  const idle = (bb) => mix(bb, tok.canvas, tok.dark ? 0.32 : 0.5);
  rows.forEach((r, i) => {
    const y = y0 + fs + 8 + rowH * (i + 0.5);
    c.globalAlpha = r.on ? 1 : 0.55;
    if (r.on) { c.strokeStyle = mix(idle(ink(r.ink)), ink(r.ink), Math.min(1, r.flux * 6)); c.lineWidth = 1.25 + (6.2 * us - 1.25) * Math.pow(Math.min(1, r.flux / FREF), 0.7); } else { c.strokeStyle = ink(r.ink); c.lineWidth = 1; c.setLineDash([3, 3.5]); }
    c.beginPath(); c.moveTo(x0 + 3, y); c.lineTo(x0 + 22 * us, y); c.stroke(); c.setLineDash([]);
    c.font = `${fs}px ${FONT}`; c.textBaseline = 'middle'; c.fillStyle = r.flux > 0.02 ? tok.text : tok.muted; c.fillText(r.name, x0 + 30 * us, y);
    c.textAlign = 'right'; c.fillStyle = tok.text2; c.fillText(r.on ? Math.round(r.flux * 60) + '/min' : 'off', x0 + colW, y); c.textAlign = 'left';
  });
  c.globalAlpha = 1;
  const px0 = x0 + (x1 - x0) * 0.55, pw = x1 - px0;
  c.font = `italic ${fs}px ${FONT}`; c.fillStyle = tok.muted; c.textBaseline = 'alphabetic'; c.fillText('Pools', px0, y0 + fs);
  const p = o.pools, pools = [['ATP', 'ADP', p.atp, 40, ink('ochre')], ['NADH', 'NAD⁺', p.nadh, 40, ink('prussian')], ['NADPH', 'NADP⁺', p.nadph, 40, ink('viridian')], ['FADH₂', 'FAD', p.fadh2, 20, ink('madder')]];
  const ph = (y1 - y0 - fs - 8) / 5.4, bh = Math.max(3, 4.5 * us);
  pools.forEach(([a1, b1, v, tot, col], i) => {
    const y = y0 + fs + 8 + ph * i + ph * 0.5;
    c.font = `${fs}px ${FONT}`; c.fillStyle = tok.text2; c.textAlign = 'left'; c.fillText(pw < 190 ? a1 : `${a1} of ${a1} + ${b1}`, px0, y);
    c.fillStyle = tok.text; c.textAlign = 'right'; c.fillText(`${v} / ${tot}`, px0 + pw, y);
    c.fillStyle = col; c.fillRect(px0, y + 4, pw * v / tot, bh); c.strokeStyle = rgba(tok.text, 0.3); c.lineWidth = 1; c.strokeRect(px0 + 0.5, y + 4.5, pw - 1, bh - 1);
  });
  const y = y0 + fs + 8 + ph * 4.5, g = p.H;
  c.font = `${fs}px ${FONT}`; c.fillStyle = tok.text2; c.textAlign = 'left'; c.fillText('Proton gradient', px0, y);
  c.fillStyle = tok.text; c.textAlign = 'right'; c.fillText(String(g), px0 + pw, y);
  const n = Math.min(60, g), step = (pw - 2) / 60; c.fillStyle = tok.accent;
  for (let k = 0; k < n; k++) { c.beginPath(); c.arc(px0 + 1.5 + step * (k + 0.5), y + 4 + bh / 2, Math.min(step * 0.42, bh * 0.55), 0, TAU); c.fill(); }
  c.restore();
}
const SHORTN = { 'Pentose phosphate': 'Pentose P', 'Gluconeogenesis': 'Gluconeogen.', 'Fatty-acid synthesis': 'FA synthesis', 'Ethanol salvage': 'Salvage', 'Fermentation': 'Ferment.' };
function lineRows(M, o) {
  return Object.keys(LINES).map(id => {
    const segs = Object.values(M.segs).filter(s => s.line === id && !M.vis[s.id].hidden);
    if (!segs.length) return null;
    let mx = 0, sum = 0; for (const s of segs) { const f = o.flux[s.id] || 0; mx = Math.max(mx, Math.abs(f)); sum += f; }
    const L = LINES[id], rev = sum < -0.02 || (id === 'ferm' && (o.flux.adh || 0) < -0.02 && !(o.flux.pdc > 0));
    return { id, name: rev && L.rev ? L.rev : L.name, flux: mx, on: lineOn(o.sc, id), ink: L.ink };
  }).filter(Boolean);
}
/** Proposed key: the lines by flux on the left, and a cartouche of what the marks are, rows only for what's present. */
function drawKeyProposed(c, M, o) {
  const [gx0, gy0, gx1, gy1] = KEY_BOX, a = M.T(gx0, gy0), b = M.T(gx1, gy1), us = M.us;
  const x0 = a[0], y0 = a[1], x1 = b[0], fs = Math.max(10.5, 13 * us), colW = (x1 - x0) * 0.42;
  c.save(); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.font = `italic ${fs}px ${FONT}`; c.fillStyle = tok.muted; c.fillText('Lines, by flux', x0, y0 + fs);
  const rows = lineRows(M, o), rowH = Math.min(22 * us + 4, 26);
  rows.forEach((r, i) => {
    const y = y0 + fs + 8 + rowH * (i + 0.5);
    const idle = mix(ink(r.ink), tok.canvas, tok.dark ? 0.2 : 0.34), wmin = Math.max(1.6, 2.0 * us);
    if (r.on) { c.strokeStyle = mix(idle, ink(r.ink), Math.min(1, r.flux * 6)); c.lineWidth = wmin + (6.2 * us - wmin) * Math.pow(Math.min(1, r.flux / FREF), 0.7); } else { c.strokeStyle = ink(r.ink); c.lineWidth = 1; c.setLineDash([3, 3.5]); }
    c.lineCap = 'butt'; c.beginPath(); c.moveTo(x0 + 2, y); c.lineTo(x0 + 22 * us, y); c.stroke(); c.setLineDash([]);
    c.font = `${fs}px ${FONT}`; c.textBaseline = 'middle'; c.fillStyle = r.flux > 0.02 ? tok.text : tok.muted;
    let nm = r.name.replace('Pyruvate dehydrogenase', 'PDH');
    if (c.measureText(nm).width > colW - 30 * us - c.measureText('00/min').width - 8) nm = SHORTN[nm] || nm;
    c.fillText(nm, x0 + 30 * us, y);
    c.textAlign = 'right'; c.fillStyle = tok.text2; c.fillText(r.on ? Math.round(r.flux * 60) + '/min' : 'off', x0 + colW, y); c.textAlign = 'left';
  });
  const p = o.pools, sg = fs * 0.4;
  const pair = (k1, k2) => (cc, x, y) => { molGlyph(cc, x - 6, y, sg, k1, 1, 0); molGlyph(cc, x + 7, y, sg, k2, 1, 0); };
  const krows = [
    [(cc, x, y) => { cc.beginPath(); cc.arc(x, y, 3, 0, TAU); cc.fillStyle = tok.accent; cc.fill(); }, 'Proton, a unit of gradient', String(p.H), 'Proton'],
    [(cc, x, y) => { cc.beginPath(); cc.arc(x, y, 3, 0, TAU); cc.fillStyle = tok.canvas; cc.fill(); cc.lineWidth = 1.2; cc.strokeStyle = tok.text; cc.stroke(); }, 'Electron in transit'],
    [(cc, x, y) => wiggle(cc, x + 8, y, 1, 0, 3.2, 0.5, 1.2), 'Photon'],
    [pair('atp', 'adp'), 'ATP · ADP', p.atp + ' · ' + (40 - p.atp)],
    [pair('nadh', 'nad'), 'NADH · NAD⁺', p.nadh + ' · ' + (40 - p.nadh)],
    [pair('nadph', 'nadp'), 'NADPH · NADP⁺', p.nadph + ' · ' + (40 - p.nadph)],
    [pair('fadh2', 'fad'), 'FADH₂ · FAD', p.fadh2 + ' · ' + (20 - p.fadh2)],
    [(cc, x, y) => { cc.strokeStyle = tok.text; cc.lineWidth = 1.2; cc.beginPath(); cc.moveTo(x - 7, y); cc.lineTo(x + 5, y); cc.moveTo(x + 5, y - 4); cc.lineTo(x + 5, y + 4); cc.lineWidth = 1.5; cc.stroke(); }, 'A pool’s gate: ⊣ inhibits, → needed', '⊣ inhibits, → needed'],
  ];
  const xr = x1 - 0.75 * M.U, cw = Math.min(xr - x0 - colW - 24, 310);
  cartouche(c, xr - cw, y0 - 4, cw, krows, 'Reference', Math.max(10.5, 12.5 * us));
  c.restore();
}
