/* ---------- Fig. 4: the margin's Fig. 2, electrons by redox potential ----------
   The Z-scheme drawn live: every electron in flight in the membrane is a bead
   on this ladder, at the midpoint potential of the carrier it is on, rising
   at the two photosystems when a photon lands. Potentials are textbook
   midpoints (V, pH 7), approximate. */
const LADDER = {
  h2o: [0, 0.82, 'H₂O'], p680: [1, 1.2, 'P680'], p680x: [1, -0.7, 'P680*'], pheo: [2, -0.55, 'Pheo'], qa: [3, -0.1, 'Qᴀ'], pq: [4.2, 0.08, 'PQ'],
  fes: [5.2, 0.3, 'FeS'], f: [6, 0.36, 'f'], pc: [6.9, 0.37, 'PC'], p700: [8, 0.45, 'P700'], p700x: [8, -1.25, 'P700*'], a0: [8.9, -1.05, 'A₀'], a1: [9.7, -0.8, 'A₁'],
  fx: [10.5, -0.72, 'Fx'], fb: [11.4, -0.55, 'Fʙ'], fd: [12.3, -0.42, 'Fd'], fnr: [13.2, -0.38, 'FNR'], nadp: [14, -0.32, 'NADP⁺'],
  nadh: [2.6, -0.32, 'NADH'], ndh: [3.6, -0.2, 'NDH-1'], cox: [8.9, 0.35, 'cyt ox'], o2: [10, 0.82, 'O₂'],
};
const ZPATH = {
  photo: { nodes: ['p680', 'p680x', 'pheo', 'qa', 'pq', 'fes', 'f', 'pc', 'p700', 'p700x', 'a0', 'a1', 'fx', 'fb', 'fd', 'fnr', 'nadp'], B: [0, 4, 5, 7, 8, 14, 16] },
  resp: { nodes: ['nadh', 'ndh', 'pq', 'fes', 'f', 'pc', 'cox', 'o2'], B: [0, 2, 3, 5, 7] },
  cyclic: { nodes: ['p700', 'p700x', 'a0', 'a1', 'fx', 'fb', 'fd', 'pq', 'fes', 'f', 'pc', 'p700'], B: [0, 6, 7, 8, 10, 11] },
};
INITS.push(() => {
  const cv = $('#cv-z'); if (!cv) return;
  const cap = captioner($('#cap-z'));
  let L, Pt, cache = null, cacheKey = '', time = 0, k = 0, tick = 0;
  const S = { H: 20, atpOx: 0, leaked: 0 };
  const pump = (n, key) => { S.H += n; if (Pt && L.pos[key]) for (let i = 0; i < n; i++) spawnProtonUp(Pt, L.pos[key].x); };
  const fire = () => {
    const kind = ['photo', 'resp', 'photo', 'cyclic', 'photo', 'resp'][k++ % 6];
    if (kind === 'photo') { pump(2, 'psii'); spawnPhoton(Pt, 'psii'); spawnChain(Pt, ['psii', 'pq', 'cytb6f', 'pc', 'psi', 'fd', 'fnr'], { 2: () => pump(4, 'cytb6f'), 4: () => spawnPhoton(Pt, 'psi') }, 'photo'); }
    else if (kind === 'resp') { pump(4, 'ndh1'); spawnChain(Pt, ['ndh1', 'pq', 'cytb6f', 'pc', 'cytOx'], { 2: () => pump(4, 'cytb6f'), 3: () => pump(2, 'cytOx') }, 'resp'); }
    else { spawnPhoton(Pt, 'psi'); spawnChain(Pt, ['psi', 'fd', 'pq', 'cytb6f', 'pc', 'psi'], { 2: () => pump(4, 'cytb6f') }, 'cyclic'); }
  };
  const sk = makeSketch(cv, {
    layout() {
      const W = this.w, H = this.h, narrow = W < 640, mw = narrow ? W : Math.min(310, W * 0.3);
      this.mw = mw;
      const mx1 = narrow ? W : W - mw - 24;
      L = layoutSac(6, mx1, narrow ? 12 : Math.max(30, H / 2 - 150), narrow ? H * 0.3 : H - 60, { order: ['psii', 'ndh1', 'pq', 'cytb6f', 'pc', 'cytOx', 'psi', 'fd', 'fnr'], lumen: 9, below: 13, endR: 12 });
      Pt = makeParticles(L); for (let i = 0; i < S.H; i++) Pt.protons.push(poolProton(L));
      cacheKey = '';
    },
    step(dt) {
      time += dt; tick += dt;
      if (tick > 0.75) { tick = 0; fire(); }
      // no ATP synthase in this strip, so the lumen leaks back
      if ((time % 0.5) < dt) { const l = Math.floor(S.H * 0.08); S.H -= l; S.leaked += l; }
      stepParticles(Pt, dt, S);
    },
    draw() {
      const c = this.ctx, W = this.w, H = this.h, narrow = W < 640;
      c.fillStyle = tok.canvas; c.fillRect(0, 0, W, H);
      const key = [W, H, tok.dark].join();
      if (key !== cacheKey) {
        cache = cache || document.createElement('canvas'); cache.width = Math.round(W * this.dpr); cache.height = Math.round((L.bottom + 4) * this.dpr);
        const x = cache.getContext('2d'); x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); x.clearRect(0, 0, W, L.bottom + 4); drawSacStatic(x, L, true); cacheKey = key;
      }
      c.drawImage(cache, 0, 0, W, L.bottom + 4);
      drawParticles(c, Pt, true, time);
      const fsC = narrow ? 10.5 : 12;
      if (!narrow) callouts(c, L.items.filter(it => NAMES[it.key]).map(it => ({ x: it.x, y: L.mid + ({ psii: -5.6, cytb6f: -6.8, pc: -4.2, cytOx: -5.1, psi: -3.1, fd: 1.4, fnr: 2.8, pq: -0.4, ndh1: -2.9 })[it.key] * L.s, text: NAMES[it.key], key: it.key })), L.top + fsC + 1, fsC);
      // the margin column
      const mw = this.mw, x0 = narrow ? 0 : W - mw, y0 = narrow ? L.bottom + 18 : 0, y1 = H;
      c.save();
      if (!narrow) { c.strokeStyle = rgba(tok.text, tok.dark ? 0.13 : 0.12); c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + 0.5, 0); c.lineTo(x0 + 0.5, H); c.stroke(); }
      c.font = `${15}px ${FONT}`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      const tabs = ['Controls', 'Stats', 'Reference']; let tx = x0 + 20;
      for (const t of tabs) { c.fillStyle = t === 'Stats' ? tok.text : tok.muted; c.fillText(t, tx, y0 + 26); const w = c.measureText(t).width; if (t === 'Stats') { c.fillRect(tx, y0 + 34, w, 1); } tx += w + 18; }
      c.fillStyle = rgba(tok.text, tok.dark ? 0.13 : 0.12); c.fillRect(x0, y0 + 35, mw, 1);
      c.font = `italic ${13}px ${FONT}`; c.fillStyle = tok.muted; c.fillText('Electrons, by redox potential', x0 + 20, y0 + 60);
      // the ladder
      const lx0 = x0 + 58, lx1 = x0 + mw - 44, ly0 = y0 + 78, ly1 = y1 - 30;
      const X = (col) => lx0 + (lx1 - lx0) * col / 14, Y = (E) => ly0 + (ly1 - ly0) * (E + 1.4) / 2.7;
      c.font = `${10.5}px ${FONT}`; c.fillStyle = tok.muted; c.textAlign = 'right'; c.textBaseline = 'middle';
      for (const E of [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2]) {
        c.fillText((E > 0 ? '+' : E < 0 ? '−' : '') + Math.abs(E).toFixed(1), lx0 - 12, Y(E));
        c.fillStyle = rgba(tok.text, 0.07); c.fillRect(lx0 - 6, Math.round(Y(E)), lx1 - lx0 + 6, 1); c.fillStyle = tok.muted;
      }
      c.save(); c.translate(x0 + 12, (ly0 + ly1) / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.font = `italic ${11}px ${FONT}`; c.fillText('E′₀, volts; more reducing up', 0, 0); c.restore();
      // paths: linear and respiratory solid, cyclic dashed; photon jumps as wiggles
      const path = (nodes, col, dash) => {
        c.save(); c.strokeStyle = col; c.lineWidth = 1.1; if (dash) c.setLineDash(dash);
        c.beginPath(); nodes.forEach((n, i) => { const [cc, E] = LADDER[n]; const px = X(cc), py = Y(E); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); c.restore();
      };
      path(['h2o', 'p680'], rgba(tok.text, 0.35), [2, 2]);
      const lin = ZPATH.photo.nodes;
      // draw segments except the photon jumps
      const seg = (a, b, col, dash) => { const [ca, Ea] = LADDER[a], [cb, Eb] = LADDER[b]; c.save(); c.strokeStyle = col; c.lineWidth = 1.1; if (dash) c.setLineDash(dash); c.beginPath(); c.moveTo(X(ca), Y(Ea)); c.lineTo(X(cb), Y(Eb)); c.stroke(); c.restore(); };
      for (let i = 1; i < lin.length; i++) { const a = lin[i - 1], b = lin[i]; if (b === 'p680x' || b === 'p700x') { const px = X(LADDER[a][0]), ya = Y(LADDER[a][1]) - 4, yb = Y(LADDER[b][1]) + 8; c.save(); c.strokeStyle = ink('ochre'); c.lineWidth = 1.2; c.beginPath(); for (let yy = ya; yy >= yb; yy -= 1) { const xx = px + 2.6 * Math.sin((ya - yy) / 5.5 * TAU / 2); yy === ya ? c.moveTo(xx, yy) : c.lineTo(xx, yy); } c.stroke(); c.beginPath(); c.moveTo(px - 3.5, yb + 5); c.lineTo(px, yb); c.lineTo(px + 3.5, yb + 5); c.stroke(); c.restore(); continue; } seg(a, b, rgba(tok.text, 0.55)); }
      const rs = ZPATH.resp.nodes; for (let i = 1; i < rs.length; i++) if (!(rs[i - 1] === 'pq' || rs[i - 1] === 'fes' || rs[i - 1] === 'f')) seg(rs[i - 1], rs[i], mix(ink('indigo'), tok.canvas, 0.1));
      seg('fd', 'pq', rgba(tok.text, 0.45), [3, 3]);
      // carriers: a tick and a name
      c.font = `italic ${10.5}px ${FONT}`; c.textBaseline = 'middle';
      for (const [n, [cc, E, name]] of Object.entries(LADDER)) {
        const px = X(cc), py = Y(E), resp = ['nadh', 'ndh', 'cox', 'o2'].includes(n);
        c.strokeStyle = resp ? ink('indigo') : tok.text; c.lineWidth = 2; c.beginPath(); c.moveTo(px - 5, py); c.lineTo(px + 5, py); c.stroke();
                c.fillStyle = resp ? ink('indigo') : tok.text2;
        if (n === 'p680x' || n === 'p700x' || n === 'p680' || n === 'p700' || n === 'h2o' || n === 'o2') { c.textAlign = 'left'; c.fillText(name, px + 7, py); }
        else if (n === 'nadp') { c.textAlign = 'left'; c.fillText(name, px + 7, py); }
        else if (n === 'nadh') { c.textAlign = 'center'; c.fillText(name, px, py - 9); }
        else { c.textAlign = 'center'; const up = ['pc', 'f', 'fes', 'cox', 'pq', 'a1', 'fb', 'fnr'].includes(n); c.fillText(name, px, py + (up ? -9 : 10)); }
      }
      // beads: the electrons now in flight
      for (const e of Pt.electrons) {
        const Z = ZPATH[e.type]; if (!Z) continue;
        const n = e.pts.length - 1, u = Math.min(0.9999, e.progress) * n, si = Math.floor(u), sf = u - si;
        const idx = Z.B[si] + (Z.B[si + 1] - Z.B[si]) * sf, i0 = Math.floor(idx), fr = idx - i0;
        const A = LADDER[Z.nodes[i0]], B = LADDER[Z.nodes[Math.min(Z.nodes.length - 1, i0 + 1)]];
        const px = X(A[0] + (B[0] - A[0]) * fr), py = Y(A[1] + (B[1] - A[1]) * fr);
        c.beginPath(); c.arc(px, py, 3.2, 0, TAU); c.fillStyle = tok.canvas; c.fill(); c.lineWidth = 1.3; c.strokeStyle = e.type === 'resp' ? ink('indigo') : tok.text; c.stroke();
      }
      c.restore();
      cap(`Each electron in the strip is a bead on the ladder, at the potential of the carrier it is on. Light lifts it at P680 and again at P700; respiration (indigo) only falls, from NADH to oxygen. ${Pt.electrons.length} in flight.`);
    },
  });
  wirePause(sk, $('#pp-z'));
});
