/* ---------- Fig. 1: the plate, today and as proposed ----------
   A toy of Lumen's autoplay for the cyanobacterium (src/autoplay.js): the
   membrane tick every 0.4 s, Calvin's enzymes in turn, the 1.6 s maintenance
   drain and the 0.5 s leak, with the store's tallies driving what is drawn. */
INITS.push(() => {
  const cv = $('#cv-plate'); if (!cv) return;
  const cap = captioner($('#cap-plate'));
  const S = { atp: 12, nadh: 3, nadph: 31, fadh2: 1, H: 8, atpOx: 0, leaked: 0, acetylCoA: 0 };
  const env = { light: true, demand: true };
  const raw = {}, flux = {}, pulses = {};
  let proposed = true, L, M, Pt, St, cache = null, cacheKey = '', time = 0, tags = [], warming = false;
  const timers = { etc: 0, met: 0, drain: 0, leak: 0, calv: 0, step: 0 };
  const rotor = { phase: 0, target: 0, seen: 0 };
  const counts = { glucose: 6, g6p: 5, g3p: 2, rubp: 6, oaa: 2, fattyAcid: 4 };

  const record = (id, a) => { raw[id] = (raw[id] || 0) + a / 6; pulses[id] = 1; };
  const glyphAt = (id) => { if (warming) return null; const sg = M && M.segs[id]; if (!sg || !sg.lab || !sg.lab.box) return null; const b = sg.lab.box; return [b[2] - 9, (b[1] + b[3]) / 2]; };
  const labAt = (id) => { const sg = M && M.segs[PAIR_OF[id] || id] || M.segs[id]; return sg && sg.lab ? [sg.lab.x, sg.lab.y - 13] : null; };
  const PAIR_OF = { c6: 'g6', c5: 'g5', c3: 'g3', c2: 'g2', c10: 'p10' };
  const tagYield = (id, text, line) => { if (warming || !M) return; const p = labAt(id); if (p) tags.push({ text, x: p[0], y: p[1], color: ink(LINES[line].ink), age: 0, life: 1.5 }); };
  const pump = (n, key) => { S.H += n; if (Pt && !warming && L.pos[key]) for (let i = 0; i < n; i++) spawnProtonUp(Pt, L.pos[key].x); };
  const ev = (pool, d, site, thread) => { if (St && !warming) stromaEvent(St, { pool, d, site, thread }); };
  const site = (key, dx = 0, dy = 0) => L && L.pos[key] ? [L.pos[key].x + dx * L.s, L.mid + dy * L.s] : null;

  const chain = (keys, cb) => { if (warming || !Pt) { for (const i in cb) cb[i](); return; } spawnChain(Pt, keys, cb); };
  const photon = (k) => { if (!warming && Pt) spawnPhoton(Pt, k); };
  function membraneTick() {
    for (let k = 0; k < 3; k++) if (S.H >= 4 && S.atp < 40) { S.H -= 4; S.atp++; S.atpOx++; ev('atp', 1, site('atpSyn', 0, 12.8)); }
    if (S.nadh > 0 || S.fadh2 > 0) {
      const useN = S.nadh > 0;
      if (useN) { S.nadh--; ev('nadh', -1, site('ndh1', 5.8, 6.4)); pump(4, 'ndh1'); } else { S.fadh2--; ev('fadh2', -1, site('sdh', 0.6, 6.9)); }
      chain([useN ? 'ndh1' : 'sdh', 'pq', 'cytb6f', 'pc', 'cytOx'], { 2: () => pump(4, 'cytb6f'), 3: () => pump(2, 'cytOx') });
    }
    if (env.light) {
      pump(2, 'psii'); photon('psii');
      chain(['psii', 'pq', 'cytb6f', 'pc', 'psi', 'fd', 'fnr'], {
        2: () => pump(4, 'cytb6f'), 4: () => photon('psi'),
        5: () => { if (S.nadph < 40) { S.nadph++; ev('nadph', 1, site('fnr', 0, 4.6)); if (!proposed && Pt && !warming && !Pt.tags.length) Pt.tags.push({ age: 0 }); } },
      });
    }
    if (S.H >= 1 && S.nadh >= 1 && S.nadph < 40) { S.H--; S.nadh--; S.nadph++; ev('nadh', -1, site('nnt', 0, 5)); ev('nadph', 1, site('nnt', 0, 5)); }
  }
  // the Calvin cycle's enzymes in turn, each with its cofactors (src/reactions/calvin.js, glycolysis.js reversed)
  const CALVIN = [['c0', 'calvin'], ['c6', 'calvin', 'atp', 2], ['c5', 'calvin', 'nadph', 2], ['c3', 'calvin'], ['c2', 'calvin'], ['c10', 'calvin'], ['c7', 'calvin', 'atp', 1]];
  // in the dark: glycolysis down, PDH, the Krebs cycle (src/reactions/glycolysis.js, fermentation.js, krebs.js)
  const DARK = [['g0', 'glyc', 'atp', -1], ['g2', 'glyc', 'atp', -1], ['g5', 'glyc', 'nadh', 2], ['g6', 'glyc', 'atp', 2], ['g9', 'glyc', 'atp', 2], ['pdh', 'pdh', 'nadh', 2], ['kin', 'krebs'], ['k2', 'krebs', 'nadh', 1], ['k3', 'krebs', 'nadh', 1], ['k4', 'krebs', 'atp', 1], ['k5', 'krebs', 'fadh2', 1], ['k7', 'krebs', 'nadh', 1]];
  function enzymeTick() {
    const list = env.light ? CALVIN : DARK, e = list[timers.step++ % list.length], [id, line, pool, n] = e;
    const spend = pool && (line === 'calvin' ? -n : n);
    if (pool) {
      const tot = POOLS[pool];
      if (spend < 0 && S[pool] < -spend) return;
      if (spend > 0 && S[pool] + spend > tot) return;
      if (id === 'g2' && S.atp / 40 > 0.8) return;   // PFK, ATP ⊣
      if (id === 'c0' && S.atp / 40 < 0.15) return;  // RuBisCO activase needs ATP
      S[pool] += spend;
      const g = glyphAt(PAIR_OF[id] || id) || glyphAt(id);
      for (let k = 0; k < Math.abs(spend); k++) ev(pool, Math.sign(spend), null, g);
      tagYield(id, (spend > 0 ? '+' : '−') + Math.abs(spend) + ' ' + ({ atp: 'ATP', nadph: 'NADPH', nadh: 'NADH', fadh2: 'FADH₂' })[pool], line);
    }
    if (id === 'c0' && !env.light) return;
    record(id, line === 'calvin' || line === 'krebs' || line === 'pdh' ? 1 : env.light ? -1 : 1);
    if (id === 'k0' || id === 'kin') record('k0', 1);
    if (line === 'calvin') { const tw = { c6: 'g6', c5: 'g5', c3: 'g3', c2: 'g2', c10: 'p10' }[id]; }
  }
  function model(dt) {
    for (const k in timers) if (k !== 'step') timers[k] += dt;
    if (timers.etc > 0.4) { timers.etc = 0; membraneTick(); }
    if (timers.calv > (env.light ? 0.28 : 0.42)) { timers.calv = 0; if (env.demand || !env.light) enzymeTick(); }
    if (timers.met > 0.8) { timers.met = 0; if (env.light && env.demand) { record('g0', -0.6); record('g1', -0.5); record('g2', -0.4); record('g3', -0.4); } }
    if (timers.drain > 1.6) { timers.drain = 0; if (env.demand && S.atp > 2) S.atp -= 3; }
    if (timers.leak > 0.5) { timers.leak = 0; const l = Math.floor(S.H * 0.02); if (l > 0) { S.H -= l; S.leaked += l; } }
    // flux.js: a leaky integral with a 6 s memory, smoothed for drawing
    const k = Math.exp(-dt / 6), ks = 1 - Math.exp(-dt / 1.6);
    for (const id in raw) { raw[id] *= k; flux[id] = (flux[id] || 0) + (raw[id] - (flux[id] || 0)) * ks; }
    for (const id in pulses) pulses[id] = Math.max(0, pulses[id] - dt * 1.6);
    for (const t of tags) t.age += dt; tags = tags.filter(t => t.age < t.life);
    if (Pt) for (const t of Pt.tags) t.age += dt; if (Pt) Pt.tags = Pt.tags.filter(t => t.age < 1.6);
  }

  const sk = makeSketch(cv, {
    layout() {
      const W = this.w, H = this.h, narrow = W < 640, pad = narrow ? 10 : 16;
      const top = narrow ? 44 : 58;
      L = layoutSac(pad, W - pad, top, narrow ? H * 0.42 : Math.max(180, H * 0.44 - top), { below: proposed ? 23 : 21, smax: 9 });
      const mapTop = L.bottom + (narrow ? 46 : proposed ? 58 : 34);
      M = buildMap(pad, mapTop, W - 2 * pad, Math.max(150, H - mapTop - 10), proposed);
      const keep = Pt; Pt = makeParticles(L); if (keep) { Pt.seenAtp = S.atpOx; Pt.seenLeak = S.leaked; }
      for (let i = 0; i < Math.min(600, S.H); i++) Pt.protons.push(poolProton(L));
      St = makeStroma(L, S);
      cacheKey = '';
    },
    step(dt) {
      time += dt; model(dt);
      stepParticles(Pt, dt, S); stepStroma(St, dt, S);
      if (S.atpOx > rotor.seen) { rotor.target += (S.atpOx - rotor.seen) * TAU / 3; rotor.seen = S.atpOx; }
      if (rotor.target - rotor.phase > 2 * TAU) rotor.phase = rotor.target - 2 * TAU;
      const before = Math.floor(rotor.phase / (TAU / 3));
      rotor.phase += (rotor.target - rotor.phase) * Math.min(1, dt * 2.5);
      const after = Math.floor(rotor.phase / (TAU / 3));
      if (!proposed && after > before && L.pos.atpSyn) for (let k = before; k < after; k++) Pt.mols.push({ type: 'atp', x: L.pos.atpSyn.x + (Math.random() - 0.5) * 3 * L.s, y: L.mid + 17 * L.s, vx: (Math.random() - 0.5) * 6 * L.s, vy: (2 + Math.random() * 2) * L.s, rot: Math.random() * TAU, age: 0, life: 2.2 });
      for (const id in M.phase) M.phase[id] += (flux[id] || 0) * 42 * M.us * dt * 6;
    },
    draw() {
      const c = this.ctx, W = this.w, H = this.h;
      c.fillStyle = tok.canvas; c.fillRect(0, 0, W, H);
      // the still membrane, cached per theme, drawing and size
      const key = [W, H, tok.dark, proposed].join();
      if (key !== cacheKey) {
        cache = cache || document.createElement('canvas');
        cache.width = Math.round(W * this.dpr); cache.height = Math.round((L.bottom + 4) * this.dpr);
        const x = cache.getContext('2d'); x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); x.clearRect(0, 0, W, L.bottom + 4);
        drawSacStatic(x, L, proposed);
        cacheKey = key;
      }
      c.drawImage(cache, 0, 0, W, L.bottom + 4);
      const s = L.s, ap = L.pos.atpSyn;
      if (proposed) {
        if (ap) { c.save(); c.translate(ap.x, L.mid); PROPOSED.atpRotor(c, s, rotor.phase); PROPOSED.atpHead(c, s, Math.floor(rotor.phase / (TAU / 3)), (rotor.phase / (TAU / 3)) % 1); c.restore(); }
        drawStroma(c, St);
      } else if (ap) { c.save(); c.translate(ap.x, L.mid); TODAY.atpRotor(c, s, rotor.phase); c.restore(); }
      const pools = { atp: S.atp, nadh: S.nadh, nadph: S.nadph, fadh2: S.fadh2, H: S.H, acetylCoA: S.acetylCoA };
      drawMap(c, M, { proposed, sc: SCEN.cyano, flux, pools, pulses, counts, tags, hover: null });
      if (proposed) drawThreads(c, St);
      drawParticles(c, Pt, proposed, time);
      if (!proposed && Pt.tags.length && L.pos.fnr) { c.font = `italic 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = ink('viridian'); c.globalAlpha = clamp((1.6 - Pt.tags[0].age) * 1.5, 0, 1); c.fillText('NADPH', L.pos.fnr.x, L.mid + 15 * s + 12); c.globalAlpha = 1; }
      proposed ? furnitureProposed(c, W) : labelsToday(c);
      proposed ? drawKeyProposed(c, M, { flux, pools, sc: SCEN.cyano }) : drawKeyToday(c, M, { flux, pools, sc: SCEN.cyano });
      cap(captionText());
    },
    theme() { cacheKey = ''; },
  });
  function labelsToday(c) {
    const fs = 12, s = L.s, ly = L.lumen.y0 + fs + 2, rows = [];
    c.save(); c.font = `italic ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = tok.canvas; c.fillStyle = tok.muted;
    for (const it of L.items) {
      const k = it.key, text = NAMES[k]; if (!text) continue;
      if (k === 'fd' || k === 'fnr') { const y = L.mid + (k === 'fd' ? 7 : 11) * s + fs; c.strokeText(text, it.x, y); c.fillText(text, it.x, y); continue; }
      const w = text.length * fs * 0.6; let row = 0; while (rows[row] && rows[row] > it.x - w / 2 - 6) row++; rows[row] = it.x + w / 2;
      c.strokeText(text, it.x, ly + row * (fs + 3)); c.fillText(text, it.x, ly + row * (fs + 3));
    }
    c.textAlign = 'right'; c.strokeText('cytoplasm', L.x1 - 4, L.bottom - 4); c.fillText('cytoplasm', L.x1 - 4, L.bottom - 4);
    c.restore();
  }
  function furnitureProposed(c, W) {
    const s = L.s, fs = W < 640 ? 10.5 : 12.5;
    // callouts in the cytoplasm above the sac, leaders down through the lumen (and the bilayer, to Fd and FNR)
    const tops = { psii: -5.6, ndh1: -2.9, sdh: -2.9, pq: -0.4, cytb6f: -6.8, pc: -4.2, cytOx: -5.1, psi: -3.1, fd: 1.4, fnr: 2.8, atpSyn: -2.9, nnt: -2.9 };
    const items = L.items.filter(it => NAMES[it.key]).map(it => ({ x: it.x + (it.key === 'fd' ? 0 : 0), y: L.mid + tops[it.key] * s, text: NAMES[it.key], key: it.key }));
    callouts(c, items, L.top + fs + 1, fs);
    c.save(); c.font = `italic ${fs}px ${FONT}`; c.fillStyle = tok.muted;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('lumen', L.xr + (L.mid - L.upperMid) * 0.12, (L.lumen.y0 + L.lumen.y1) / 2);
    c.textAlign = 'right'; c.textBaseline = 'alphabetic'; c.fillText('cytoplasm', L.x1 - 4, L.bottom + 16);
    c.restore();
    // the register's title and its scale, under it; a hairline, and the map's title over it
    const yb = L.bottom + 16;
    panelTitle(c, L.x0 + 2, yb, 'a', 'Cyanobacterial thylakoid, cut through, to scale', fs);
    c.save(); c.font = `italic ${fs}px ${FONT}`; const tw = c.measureText('Cyanobacterial thylakoid, cut through, to scale').width; c.restore();
    scaleBar(c, L.x0 + 28 + tw, yb - 2, s, 10, 'nm', fs - 1.5);
    c.save(); c.strokeStyle = tok.dark ? 'rgba(236,235,234,.13)' : 'rgba(22,21,20,.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(L.x0, yb + 9.5); c.lineTo(L.x1, yb + 9.5); c.stroke(); c.restore();
    panelTitle(c, L.x0 + 2, yb + 9 + fs + 8, 'b', 'The carbon network, by flux', fs);
    // where the cut is: the cyanobacterium, its thylakoids, and the cut
    const [lx, ly] = M.T(20.3, -0.55), [lx2, ly2] = M.T(24.55, 2.25);
    if (lx2 - lx > 130) drawLocator(c, lx, ly, lx2 - lx, ly2 - ly, 'thylakoid', fs);
  }
  function captionText() {
    const turns = rotor.target / TAU, g = S.H;
    if (!proposed) return `Today. Cyanobacterial thylakoid ${env.light ? 'in the light' : 'in the dark'}: the pools are bars in the key. ${g} proton${g === 1 ? '' : 's'} in the thylakoid lumen.`;
    const full = S.atp >= 39;
    return `Proposed. Cyanobacterial thylakoid ${env.light ? 'in the light' : 'in the dark'}${env.demand ? '' : ', nothing spending ATP'}. ${S.atp} of 40 adenylates carry three phosphates, ${S.nadph} of 40 NADP carry hydride. ` +
      (full ? `ATP is full, so ATP synthase stops and ${g} protons back up in the lumen.` : `${g} proton${g === 1 ? '' : 's'} in the lumen; ATP synthase has turned ${turns.toFixed(1)} times.`);
  }
  const bT = $('#pl-today'), bP = $('#pl-prop'), bL = $('#pl-light'), bD = $('#pl-demand');
  const sync = () => { bT.setAttribute('aria-pressed', String(!proposed)); bP.setAttribute('aria-pressed', String(proposed)); bL.setAttribute('aria-pressed', String(env.light)); bD.setAttribute('aria-pressed', String(env.demand)); };
  bT.onclick = () => { proposed = false; sk.layout(); sync(); sk.draw(); };
  bP.onclick = () => { proposed = true; sk.layout(); sync(); sk.draw(); };
  bL.onclick = () => { env.light = !env.light; timers.step = 0; sync(); };
  bD.onclick = () => { env.demand = !env.demand; sync(); };
  wirePause(sk, $('#pp-plate'));
  sync();
  // warm up so the first frame is a living one
  const warm = () => { warming = true; for (let t = 0; t < 20; t += 1 / 30) model(1 / 30); warming = false; };
  warm();
});
