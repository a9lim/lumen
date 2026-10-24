/* ---------- Fig. 3: the map, its connections and its gates ----------
   The whole transit map at the size it draws on a laptop, running a steady
   scenario. The pools are set by hand here so the gates can be seen to act. */
INITS.push(() => {
  const cv = $('#cv-map'); if (!cv) return;
  const cap = captioner($('#cap-map'));
  let proposed = true, scen = 'cyano', M = null;
  const pools = { atp: 14, nadh: 4, nadph: 30, fadh2: 2, H: 8, acetylCoA: 2 };
  const pulses = {}, timers = {};
  const sk = makeSketch(cv, {
    layout() { M = buildMap(8, 26, this.w - 16, this.h - 34, proposed); },
    step(dt) {
      const sc = SCEN[scen];
      for (const id in M.phase) M.phase[id] += (sc.flux[id] || 0) * 42 * M.us * dt * 6;
      // fire each running enzyme now and then, at its flux, so its connections pulse
      for (const [id, f] of Object.entries(sc.flux)) {
        timers[id] = (timers[id] || Math.random()) - dt * Math.abs(f);
        if (timers[id] < 0) { timers[id] = 1; pulses[id] = 1; }
      }
      for (const id in pulses) pulses[id] = Math.max(0, pulses[id] - dt * 1.6);
    },
    draw() {
      const c = this.ctx, W = this.w, H = this.h, sc = SCEN[scen];
      c.fillStyle = tok.canvas; c.fillRect(0, 0, W, H);
      // a gate that stops an enzyme also stops its flux here
      const flux = {};
      for (const [id, f] of Object.entries(sc.flux)) { const g = gatesOf(id, pools, f < 0); flux[id] = g.some(q => q.f === 0) ? f * 0.05 : f; }
      const o = { proposed, sc, flux, pools, pulses, counts: { glucose: 6, g6p: 5, oaa: 2, rubp: 6, fattyAcid: 4, acetylCoA: pools.acetylCoA } };
      drawMap(c, M, o);
      proposed ? drawKeyProposed(c, M, o) : drawKeyToday(c, M, o);
      const gated = [];
      for (const id of Object.keys(COF).concat(['kin', 'c0'])) for (const g of gatesOf(id, pools, (sc.flux[id] || 0) < 0)) if (M.vis && M.vis[id] && !M.vis[id].hidden) gated.push((M.segs[id].label || id) + (g.f === 0 ? ' stopped' : g.how === '⊕' ? ' spurred' : ' slowed') + ' by ' + ({ atp: 'ATP', nadh: 'NADH', nadph: 'NADPH', fadh2: 'FADH₂' })[g.eff]);
      cap((proposed ? 'Proposed. ' : 'Today. ') + sc.name + '. ' + (proposed ? (gated.length ? gated.join('; ') + '.' : 'No gate is acting.') + ' Each enzyme carries its pools as glyphs: + made, − spent, pulsing when it fires.' : 'Pools appear only as bars in the key; a gate shows only when it stops an enzyme.'));
    },
  });
  const bT = $('#mp-today'), bP = $('#mp-prop'), sel = $('#mp-scen');
  const sync = () => { bT.setAttribute('aria-pressed', String(!proposed)); bP.setAttribute('aria-pressed', String(proposed)); };
  bT.onclick = () => { proposed = false; sk.layout(); sync(); sk.draw(); };
  bP.onclick = () => { proposed = true; sk.layout(); sync(); sk.draw(); };
  sel.onchange = () => { scen = sel.value; if (scen === 'animal') Object.assign(pools, { atp: 30, nadh: 22, nadph: 12, fadh2: 6 }); else Object.assign(pools, { atp: 14, nadh: 4, nadph: 30, fadh2: 2 }); syncSliders(); sk.draw(); };
  const sliders = ['atp', 'nadh', 'nadph', 'fadh2'].map(k => [k, $('#mp-' + k), $('#mp-' + k + '-v')]);
  const syncSliders = () => { for (const [k, el, out] of sliders) { el.value = pools[k]; out.textContent = pools[k] + ' of ' + POOLS[k]; } };
  for (const [k, el, out] of sliders) el.oninput = () => { pools[k] = +el.value; out.textContent = pools[k] + ' of ' + POOLS[k]; sk.draw(); };
  syncSliders();
  wirePause(sk, $('#pp-map'));
  sync();
});
