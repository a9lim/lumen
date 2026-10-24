/* ---------- Fig. 2: the complexes up close ----------
   Today's blobs beside the proposed assemblies, at about 2.5× the plate's
   scale, where the real sim would switch on its detail: subunit names, the
   cofactors inside each complex, and the electron stepping between them.
   ATP synthase turns at its own pace and shows the binding change. */

// Cofactor sites (nm about each complex), approximate, after the structures:
// PSII's right monomer, the b6f monomer on the Qo side, PSI's A branch.
const COFACTORS = {
  psii: [['mn', 5.4, -2.4, 'Mn₄CaO₅'], ['chl2', 4.1, -1.0, 'P680'], ['pheo', 4.7, 0.3, 'Pheo'], ['q', 3.2, 1.6, 'Qᴀ'], ['fe', 4.0, 2.0], ['q', 4.9, 1.75, 'Qʙ']],
  b6f: [['fes', -1.2, -3.4, 'Rieske FeS'], ['heme', -3.3, -5.0, 'heme f'], ['heme', -1.9, -0.9, 'bʟ'], ['heme', -1.9, 1.0, 'bʜ']],
  psi: [['chl2', -5.0, -1.6, 'P700'], ['chl', -5.7, -0.5, 'A₀'], ['q', -6.25, 0.6, 'A₁'], ['fes', -5.0, 2.0, 'Fx'], ['fes', -5.5, 3.4, 'Fᴀ'], ['fes', -4.3, 4.1, 'Fʙ']],
};
const SUBUNITS = {
  psii: [['CP43', 8.2, 0.2], ['D1', 6.0, 1.6], ['D2', 2.4, 0.4], ['PsbO', 5.6, -4.1], ['CP47', -8.0, 0.2]],
  b6f: [['cyt f', 3.3, -4.6], ['b₆', 2.5, 0.4]],
  psi: [['PsaA', -7.6, -0.6], ['PsaB', -2.4, -0.6], ['PsaC', -4.6, 5.3]],
  atp: [['c-ring', 0, 0], ['a', 4.2, 0], ['α₃β₃', 0, 12.8], ['γ', 0.3, 6.4], ['δ', 3.3, 17.4], ['b₂', 6.8, 8.5]],
};
function drawCofactor(c, s, k, x, y) {
  const lw = Math.max(0.8, 0.12 * s);
  c.save(); c.translate(x * s, y * s); c.lineJoin = 'round';
  if (k === 'chl' || k === 'chl2' || k === 'pheo') {
    const g = tones(ink('viridian'));
    for (const dx of k === 'chl2' ? [-0.42, 0.42] : [0]) {
      c.save(); c.translate(dx * s, 0); c.rotate(Math.PI / 4);
      c.beginPath(); c.roundRect(-0.4 * s, -0.4 * s, 0.8 * s, 0.8 * s, 0.18 * s); c.fillStyle = g.t[1]; c.fill(); c.lineWidth = lw; c.strokeStyle = g.line; c.stroke();
      if (k !== 'pheo') { c.beginPath(); c.arc(0, 0, 0.13 * s, 0, TAU); c.fillStyle = g.line; c.fill(); }
      c.restore();
    }
  } else if (k === 'q') {
    const o = tones(ink('ochre')); c.beginPath(); hexPath(c, 0, 0, 0.42 * s); c.fillStyle = o.t[1]; c.fill(); c.lineWidth = lw; c.strokeStyle = o.line; c.stroke();
  } else if (k === 'fes' || k === 'mn') {
    // a cubane, drawn in oblique: two squares and their edges
    const t = tones(ink(k === 'mn' ? 'violet' : 'sienna')), a = 0.36 * s, d = 0.2 * s;
    c.beginPath(); c.rect(-a, -a + d, 2 * a - d, 2 * a - d); c.fillStyle = t.t[0]; c.fill();
    c.beginPath(); c.moveTo(-a, -a + d); c.lineTo(-a + d, -a); c.lineTo(a, -a); c.lineTo(a, a - d); c.lineTo(a - d, a); c.lineTo(a - d, -a + d); c.closePath(); c.fillStyle = t.t[2]; c.fill();
    c.lineWidth = lw; c.strokeStyle = t.line; c.beginPath(); c.rect(-a, -a + d, 2 * a - d, 2 * a - d); c.moveTo(-a, -a + d); c.lineTo(-a + d, -a); c.lineTo(a, -a); c.lineTo(a, a - d); c.lineTo(a - d, a); c.moveTo(a - d, -a + d); c.lineTo(a, -a); c.stroke();
  } else if (k === 'heme') {
    // a porphyrin edge-on: a short plate with its iron
    const t = tones(ink('umber'));
    c.beginPath(); c.roundRect(-0.6 * s, -0.16 * s, 1.2 * s, 0.32 * s, 0.14 * s); c.fillStyle = t.t[1]; c.fill(); c.lineWidth = lw; c.strokeStyle = t.line; c.stroke();
    c.beginPath(); c.arc(0, 0, 0.15 * s, 0, TAU); c.fillStyle = t.line; c.fill();
  } else if (k === 'fe') {
    c.beginPath(); c.arc(0, 0, 0.2 * s, 0, TAU); c.fillStyle = tones(ink('sienna')).line; c.fill();
  }
  c.restore();
}

INITS.push(() => {
  const cv = $('#cv-close'); if (!cv) return;
  const cap = captioner($('#cap-close'));
  let mode = 'prop', L = null, time = 0;
  const rotor = { phase: 0, target: 0, made: 0, last: 0 };
  const elec = { t: 0 }, tour = { t: 0, fx: null }, TOUR = 13, ZOOM = 1.9;
  let molecules = [];

  // the electron's road through the strip, in [complex, cofactor index] stops, carriers between
  const ROAD = [['psii', 0], ['psii', 1, 'photon'], ['psii', 2], ['psii', 3], ['psii', 5], ['pq', -1], ['cytb6f', 0], ['cytb6f', 1], ['pc', -1], ['psi', 0, 'photon'], ['psi', 1], ['psi', 2], ['psi', 3], ['psi', 4], ['psi', 5], ['fd', -1]];
  const sk = makeSketch(cv, {
    layout() {
      const W = this.w, H = this.h, narrow = W < 640;
      const order = ['psii', 'pq', 'cytb6f', 'pc', 'psi', 'fd', 'atpSyn'];
      const top = narrow ? 26 : 34;
      L = layoutSac(narrow ? 0 : 10, W - (narrow ? 0 : 10), top, H - top - 8, { order, outer: 0, lumen: 7.5, below: 22, endL: 1, endR: 1, smax: 30 });
      // a single straight membrane: drop the sac's upper half
      L.paths = [[[-40, L.mid], [W + 40, L.mid]]];
      L.lumen = { x0: 0, x1: W, y0: L.top, y1: L.memTop };
      const s = L.s;
      if (L.pos.fd) L.pos.fd.y = L.mid + 5.2 * s;
      molecules = [];
      const r = mulberry32(5);
      for (let i = 0; i < 14; i++) molecules.push({ kind: ['atp', 'adp', 'nadph', 'nadp'][i % 4], x: r() * W, y: L.mid + (8 + r() * 14) * s, rot: r() * TAU });
    },
    step(dt) {
      time += dt;
      // ATP synthase: a third of a turn every 1.6 s
      if (time - rotor.last > 1.6) { rotor.last = time; rotor.target += TAU / 3; rotor.made++; }
      rotor.phase += (rotor.target - rotor.phase) * Math.min(1, dt * 3);
      elec.t = (elec.t + dt / 7) % 1;
      tour.t = (tour.t + dt) % TOUR;
    },
    draw() {
      const c = this.ctx, W = this.w, H = this.h, s = L.s, today = mode === 'today', detail = mode === 'detail';
      c.fillStyle = tok.canvas; c.fillRect(0, 0, W, H);
      const D = today ? TODAY : PROPOSED;
      // zoomed in: a tracking shot that follows the electron, then pans to ATP synthase and back
      let z = 1, stops = null, ex = 0, ey = 0, seg = 0, f = 0;
      if (detail) {
        z = ZOOM;
        stops = ROAD.map(([k, i]) => { const p = L.pos[k]; if (!p) return null; if (i < 0) return [p.x, p.y]; const cf = COFACTORS[k === 'cytb6f' ? 'b6f' : k][i]; return [p.x + cf[1] * s, L.mid + cf[2] * s]; }).filter(Boolean);
        const tE = 8.5, u = Math.min(1, tour.t / tE) * (stops.length - 1);
        seg = Math.min(stops.length - 2, Math.floor(u)); f = u - seg;
        const A = stops[seg], B = stops[seg + 1], hop = f < 0.62 ? 0 : (f - 0.62) / 0.38, e = hop * hop * (3 - 2 * hop);
        ex = A[0] + (B[0] - A[0]) * e; ey = A[1] + (B[1] - A[1]) * e;
        const ap = L.pos.atpSyn, sm = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
        const toAtp = sm(8.6, 9.8, tour.t) * (1 - sm(12.2, 13, tour.t));
        const fx = (ex + (ap.x - ex) * toAtp), fy = L.mid + (1 + 7.2 * toAtp) * s;
        tour.fx = tour.fx === null ? fx : tour.fx + (fx - tour.fx) * 0.18;
        tour.fy = tour.fy === undefined ? fy : tour.fy + (fy - tour.fy) * 0.18;
        c.save(); c.translate(W / 2, H * 0.48); c.scale(z, z); c.translate(-tour.fx, -tour.fy);
      }
      for (const path of L.paths) today ? lipidsToday(c, path, s, 'galacto') : lipidsProposed(c, path, s, 'galacto', false, 0);
      if (!today) for (const m of molecules) if (!L.pos.atpSyn || Math.abs(m.x - L.pos.atpSyn.x) > 9 * s) molGlyph(c, m.x, m.y, s * 1.1, m.kind, 0.9, m.rot + Math.sin(time * 0.3 + m.x) * 0.2);
      const at = (k, f) => { const p = L.pos[k]; if (!p) return; c.save(); c.translate(p.x, L.mid); f(); c.restore(); };
      at('psii', () => { D.pbs(c, s); D.psii(c, s); });
      at('cytb6f', () => D.b6f(c, s));
      at('psi', () => D.psi(c, s));
      at('fd', () => { if (today) TODAY.carrier(c, s, 0, 5.2 * s, 1.4, 22, ink('sienna')); else PROPOSED.carrier(c, s, 0, 5.2 * s, 1.4, 22, ink('sienna'), false); });
      at('atpSyn', () => {
        D.atpStator(c, s);
        if (today) TODAY.atpRotor(c, s, rotor.phase);
        else { PROPOSED.atpRotor(c, s, rotor.phase); PROPOSED.atpHead(c, s, Math.floor(rotor.phase / (TAU / 3) + 1e-6), (rotor.phase / (TAU / 3) + 1e-6) % 1); }
      });
      // quinones and plastocyanin at home
      const pq = L.pos.pq, pc = L.pos.pc;
      if (pq) for (let j = 0; j < 2; j++) { c.save(); c.translate(pq.x + (j - 0.5) * 3 * s, L.mid + (j ? 0.6 : -0.6) * s); D.quinone(c, s, false); c.restore(); }
      if (pc) drawCarrier(c, 'pc', pc.x, pc.y, s, false, !today);
      // the detail layer: cofactors, the electron's road, subunit names
      if (detail) {
        for (const [k, list] of Object.entries(COFACTORS)) at(k === 'b6f' ? 'cytb6f' : k, () => { for (const [kind, x, y] of list) drawCofactor(c, s, kind, x, y); });
        const fs = 12.5 / z;
        c.save(); c.font = `italic ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
        for (const [k, list] of Object.entries(SUBUNITS)) {
          const p = L.pos[k === 'b6f' ? 'cytb6f' : k === 'atp' ? 'atpSyn' : k]; if (!p) continue;
          for (const [name, x, y] of list) { const X = p.x + x * s, Y = L.mid + y * s; c.lineWidth = 3 / z; c.strokeStyle = rgba(tok.canvas, 0.85); c.strokeText(name, X, Y); c.fillStyle = tok.text; c.fillText(name, X, Y); }
        }
        // cofactor names under their sites
        c.font = `${fs * 0.88}px ${FONT}`;
        for (const [k, list] of Object.entries(COFACTORS)) { const p = L.pos[k === 'b6f' ? 'cytb6f' : k]; for (const [, x, y, name] of list) if (name) { const X = p.x + x * s + 0.62 * s, Y = L.mid + y * s; c.textAlign = 'left'; c.lineWidth = 3 / z; c.strokeStyle = tok.canvas; c.strokeText(name, X, Y); c.fillStyle = tok.text2; c.fillText(name, X, Y); } }
        c.restore();
        // the electron, stepping site to site, while the tour is on its road
        c.save(); c.setLineDash([1.5 / z, 3 / z]); c.strokeStyle = rgba(tok.text, 0.45); c.lineWidth = 1 / z;
        c.beginPath(); stops.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.restore();
        if (tour.t < 8.6) {
          c.beginPath(); c.arc(ex, ey, Math.max(2.2 / z, 0.3 * s), 0, TAU); c.fillStyle = tok.canvas; c.fill(); c.lineWidth = 1.4 / z; c.strokeStyle = tok.text; c.stroke();
          if (ROAD[seg + 1] && ROAD[seg + 1][2] === 'photon' && f < 0.62) { const p = stops[seg + 1]; wiggle(c, p[0], p[1] - 0.6 * s - (1 - f / 0.62) * 4 * s, 0, 1, s * 0.7, time * 20); }
        }
        // the front β subunits' states, read off the rotor
        const ap = L.pos.atpSyn, step = Math.floor(rotor.phase / (TAU / 3) + 1e-6), ST = ['β open, empty', 'β loose, ADP + Pᵢ', 'β tight, ATP'];
        c.save(); c.font = `italic ${fs * 0.9}px ${FONT}`; c.textBaseline = 'middle'; c.lineJoin = 'round';
        for (let i = 0; i < 2; i++) { const sg = i ? 1 : -1, X = ap.x + sg * 6.6 * s, Y = L.mid + 10.4 * s; c.textAlign = i ? 'left' : 'right'; c.lineWidth = 3 / z; c.strokeStyle = tok.canvas; const t = ST[(step + i) % 3]; c.strokeText(t, X, Y); c.fillStyle = tok.text2; c.fillText(t, X, Y); }
        c.restore();
      } else {
        // callouts, as on the plate
        const tops = { psii: -5.6, cytb6f: -6.8, psi: -3.1, atpSyn: -2.9, pq: -0.4, pc: -4.2, fd: 4 };
        const names = { psii: 'Photosystem II with its phycobilisome', cytb6f: 'cyt b₆f', psi: 'Photosystem I', atpSyn: 'ATP synthase', pq: 'PQ', pc: 'PC', fd: 'Fd' };
        if (!today) callouts(c, Object.keys(names).filter(k => L.pos[k]).map(k => ({ x: L.pos[k].x, y: L.mid + tops[k] * s, text: names[k], key: k })), 20, Math.max(11, Math.min(13.5, W / 90)));
        else { c.save(); c.font = `italic 12px ${FONT}`; c.fillStyle = tok.muted; c.textAlign = 'center'; for (const k of ['psii', 'cytb6f', 'psi', 'atpSyn']) c.fillText(names[k].split(' with')[0], L.pos[k].x, L.memTop - 8 * s); c.restore(); }
      }
      if (detail) c.restore();
      if (!today) scaleBar(c, 14, H - 12, s * z, detail ? 2 : 5, 'nm', 11.5);
      cap(today ? 'Today: each complex a lumpy blob with a lighter offset body, the bilayer a rope of heads and tails.' :
        detail ? 'Zoomed in, as the sim would draw past 2.5×: subunits named, cofactors drawn, the electron stepping from the manganese cluster through P680, pheophytin and the quinones, on plastoquinone and plastocyanin, through P700 and the iron–sulfur clusters to ferredoxin.' :
        `Proposed: each complex an assembly of subunits in one ink, Goodsell’s flat tones and seams. ATP synthase has made ${rotor.made} ATP; its β subunits step open, loose and tight, holding ADP and phosphate, then ATP, then letting it go.`);
    },
  });
  const bs = { today: $('#cl-today'), prop: $('#cl-prop'), detail: $('#cl-detail') };
  const sync = () => { for (const k in bs) bs[k].setAttribute('aria-pressed', String(mode === k)); };
  for (const k in bs) bs[k].onclick = () => { mode = k; sync(); sk.draw(); };
  wirePause(sk, $('#pp-close'));
  sync();
});
