/* ---------- Fig. 6: stress, drawn ----------
   Active ROS as superoxide radicals near where they leaked (complex I and
   complex III), one per unit of rosProduced − rosScavenged; cell health as
   the share of lipids whose tails are drawn peroxidised and kinked. */
INITS.push(() => {
  const cv = $('#cv-stress'); if (!cv) return;
  const cap = captioner($('#cap-stress'));
  let proposed = true, L, time = 0, cache = null, cacheKey = '';
  const st = { health: 62, ros: 4 };
  let rad = [];
  const sk = makeSketch(cv, {
    layout() {
      const W = this.w, H = this.h;
      L = layoutSac(8, W - 8, 16, H - 24, { order: ['ndh1', 'sdh', 'pq', 'cytb6f', 'pc', 'cytOx', 'atpSyn'], outer: 2, lumen: 8, below: 18, endL: 4, endR: 14 });
      L.paths = [[[-40, L.mid], [W + 40, L.mid]], [[-40, L.upperMid], [W + 40, L.upperMid]]];
      cacheKey = ''; rad = [];
    },
    step(dt) {
      time += dt;
      const src = [L.pos.ndh1 && [L.pos.ndh1.x + 5 * L.s, L.mid + 7 * L.s], L.pos.cytb6f && [L.pos.cytb6f.x, L.mid + 3.5 * L.s]].filter(Boolean);
      while (rad.length < st.ros) { const p = src[rad.length % src.length]; rad.push({ x: p[0], y: p[1], vx: (Math.random() - 0.5) * 20, vy: 10 + Math.random() * 10, rot: Math.random() * TAU }); }
      rad.length = Math.min(rad.length, st.ros);
      for (const r of rad) { r.vx += (Math.random() - 0.5) * 120 * dt; r.vy += (Math.random() - 0.5) * 120 * dt; r.vx *= 0.95; r.vy *= 0.95; r.x += r.vx * dt; r.y += r.vy * dt; r.rot += dt; r.y = clamp(r.y, L.memBot + 2 * L.s, L.bottom - L.s); r.x = clamp(r.x, 10, this.w - 10); }
    },
    draw() {
      const c = this.ctx, W = this.w, H = this.h, s = L.s;
      c.fillStyle = tok.canvas; c.fillRect(0, 0, W, H);
      const ox = proposed ? (100 - st.health) / 100 * 0.6 : 0, key = [W, H, tok.dark, proposed, Math.round(ox * 50)].join();
      if (key !== cacheKey) {
        cache = cache || document.createElement('canvas'); cache.width = Math.round(W * this.dpr); cache.height = Math.round(H * this.dpr);
        const x = cache.getContext('2d'); x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); x.clearRect(0, 0, W, H);
        for (const [i, path] of L.paths.entries()) proposed ? lipidsProposed(x, path, s, 'ester', false, ox, i) : lipidsToday(x, path, s, 'ester');
        const D = proposed ? PROPOSED : TODAY;
        const at = (k, f) => { const p = L.pos[k]; if (!p) return; x.save(); x.translate(p.x, L.mid); f(); x.restore(); };
        at('ndh1', () => D.ndh1(x, s, true)); at('sdh', () => D.sdh(x, s)); at('cytb6f', () => D.b6f(x, s)); at('cytOx', () => D.cytOx(x, s)); at('atpSyn', () => { D.atpStator(x, s); if (proposed) { PROPOSED.atpRotor(x, s, 0.4); PROPOSED.atpHead(x, s, 0, 0); } else TODAY.atpRotor(x, s, 0.4); });
        cacheKey = key;
      }
      c.drawImage(cache, 0, 0, W, H);
      if (proposed) for (const r of rad) superoxide(c, r.x, r.y, s * 1.5, r.rot);
      const fs = 12;
      c.save(); c.font = `italic ${fs}px ${FONT}`; c.fillStyle = tok.muted; c.textAlign = 'right'; c.textBaseline = 'alphabetic'; c.fillText('matrix', W - 10, L.bottom - 4);
      if (!proposed) { c.textAlign = 'left'; c.fillText('Cell health ' + st.health + '%, ' + st.ros + ' active ROS: in the Stats tab only', 12, L.bottom - 4); }
      c.restore();
      cap(proposed ? `Proposed. Cell health ${st.health}%: ${Math.round(ox * 100)}% of lipid tails drawn peroxidised. ${st.ros} superoxide radical${st.ros === 1 ? '' : 's'} drift from complex I and the Q-cycle until scavenged.` : 'Today. Nothing in the scene changes with oxidative stress; health and ROS are numbers in the Stats tab.');
    },
  });
  const bT = $('#st-today'), bP = $('#st-prop');
  const sync = () => { bT.setAttribute('aria-pressed', String(!proposed)); bP.setAttribute('aria-pressed', String(proposed)); };
  bT.onclick = () => { proposed = false; sync(); sk.draw(); }; bP.onclick = () => { proposed = true; sync(); sk.draw(); };
  const h = $('#st-health'), hv = $('#st-health-v'), r = $('#st-ros'), rv = $('#st-ros-v');
  h.value = st.health; r.value = st.ros; hv.textContent = st.health + '%'; rv.textContent = st.ros;
  h.oninput = () => { st.health = +h.value; hv.textContent = st.health + '%'; sk.draw(); };
  r.oninput = () => { st.ros = +r.value; rv.textContent = st.ros; sk.draw(); };
  wirePause(sk, $('#pp-stress')); sync();
});
