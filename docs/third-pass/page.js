// The proposal page: mock frames scaled from a 1440-wide design, the legend's
// draggable sentence, the enzyme card's rate budget, traces drawn from the
// engine (recorded for the mocks and Fig. 3, live for Fig. 2).
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const dark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };

// ── Specimen icons, the sim's own locator drawings in each theme ──
function setIcons() { const set = dark() ? ICONS['icons-dark'] : ICONS.icons; for (const im of $$('img[data-icon]')) im.src = set[+im.dataset.icon]; }
setIcons();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setIcons);
new MutationObserver(setIcons).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ── Mock frames ──
const CAPS = {
  today: 'Today: the settings column, with its Controls, Stats and Reference tabs.',
  a: 'A, the legend: the specimens, the conditions as a sentence (drag a value), the enzyme you last touched, and Fig. 2.',
  b: 'B, the aligned margin: the column is cut where the plate is, and panel c is a third register under the map.',
  c: 'C, the folio: the page scrolls, and panel c starts below a 900 px screen.',
};
function fit() {
  for (const m of $$('.mock')) {
    const inner = $('.mock-in', m), v = $$('[data-v]', inner).find(x => x.style.display === 'block') || $('[data-v]', inner);
    const k = m.clientWidth / (+m.dataset.w || 1440), h = +v.dataset.h;
    inner.style.transform = `scale(${k})`; inner.style.height = h + 'px'; m.style.height = Math.ceil(h * k) + 'px';
  }
}
function show(id) {
  for (const v of $$('#mock-main [data-v]')) v.style.display = v.dataset.v === id ? 'block' : 'none';
  for (const b of $$('[data-show]')) b.setAttribute('aria-pressed', String(b.dataset.show === id));
  $('#cap-main').textContent = CAPS[id];
  fit();
}
for (const b of $$('[data-show]')) b.addEventListener('click', () => show(b.dataset.show));
show('a');
new ResizeObserver(fit).observe($('#mock-main'));

// ── A sentence of draggable values ──
const pct = (x) => Math.round(x * 100);
const FIELDS = {
  light: { min: 0, max: 1, step: 0.05, text: (v) => v <= 0 ? 'darkness' : v >= 1 ? 'full sun' : `${pct(v)}% sun`, mark: (v) => v <= 0 ? 'dark' : `light ${pct(v)}%` },
  o2: { min: 0, max: 1, step: 0.05, text: (v) => v <= 0 ? 'anoxia' : v >= 1 ? 'air' : `${pct(v)}% of air’s oxygen`, mark: (v) => v <= 0 ? 'anoxia' : `O₂ ${pct(v)}%` },
  atp: { min: 0, max: 3, step: 0.1, text: (v) => `${v.toFixed(1)} mM/s`, mark: (v) => `ATP demand ${v.toFixed(1)}` },
  growth: { min: 0, max: 0.3, step: 0.01, text: (v) => `${v.toFixed(2)} /h`, mark: (v) => `growth ${v.toFixed(2)}` },
  slow: { list: [300, 100, 30, 10, 3], text: (v) => `${v}×`, mark: (v) => `slowed ${v}×` },
};
function sentence(el, vals, onChange) {
  const sv = (k) => `<span class="sv" data-k="${k}" role="slider" tabindex="0"></span>`;
  el.innerHTML = `In ${sv('light')} and ${sv('o2')}, the cell spends ATP at ${sv('atp')} and grows at ${sv('growth')}. Its chemistry runs ${sv('slow')} slower than life.`;
  const paint = (s) => {
    const k = s.dataset.k, F = FIELDS[k], v = vals[k];
    s.textContent = F.text(v);
    if (F.list) { s.setAttribute('aria-valuemin', 0); s.setAttribute('aria-valuemax', F.list.length - 1); s.setAttribute('aria-valuenow', F.list.indexOf(v)); }
    else { s.setAttribute('aria-valuemin', F.min); s.setAttribute('aria-valuemax', F.max); s.setAttribute('aria-valuenow', v); }
    s.setAttribute('aria-valuetext', F.text(v)); s.setAttribute('aria-label', { light: 'Light', o2: 'Oxygen', atp: 'ATP demand', growth: 'Growth', slow: 'Slowdown' }[k]);
  };
  const step = (s, n) => {
    const k = s.dataset.k, F = FIELDS[k];
    let v = vals[k];
    if (F.list) { const i = Math.max(0, Math.min(F.list.length - 1, F.list.indexOf(v) + n)); v = F.list[i]; }
    else v = Math.max(F.min, Math.min(F.max, Math.round((v + n * F.step) / F.step) * F.step));
    if (v === vals[k]) return;
    vals[k] = +v.toFixed(4); paint(s); onChange && onChange(k, vals[k]);
  };
  for (const s of $$('.sv', el)) {
    paint(s);
    let acc = 0, on = false;
    s.addEventListener('pointerdown', (e) => { on = true; acc = 0; s.setPointerCapture(e.pointerId); s.classList.add('drag'); e.preventDefault(); });
    s.addEventListener('pointermove', (e) => { if (!on) return; acc += e.movementX; while (Math.abs(acc) >= 7) { step(s, Math.sign(acc)); acc -= 7 * Math.sign(acc); } });
    const end = () => { on = false; s.classList.remove('drag'); };
    s.addEventListener('pointerup', end); s.addEventListener('pointercancel', end);
    s.addEventListener('keydown', (e) => {
      const n = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
      if (n) { step(s, n); e.preventDefault(); }
    });
  }
}
sentence($('[data-sentence="mockA"]'), { light: 1, o2: 1, atp: 0.4, growth: 0.07, slow: 30 });

// ── The enzyme card: the rate as a budget, capacity times each factor, on a log scale ──
const fmt = (x) => { const a = Math.abs(x); return a === 0 ? '0' : a >= 10 ? x.toFixed(0) : a >= 1 ? x.toFixed(1) : a >= 0.01 ? x.toFixed(2) : x.toExponential(0); };
const logw = (x) => Math.max(0, Math.min(1, 1 + Math.log10(Math.max(x, 1e-6)) / 3)) * 100;
function card(el, c) {
  const rows = [['capacity', null, c.cap]];
  rows.push(['× thermodynamics', null, c.thermo]);
  rows.push(['× saturation', null, c.sat]);
  rows.push(['× regulation', null, c.reg]);
  if (c.pulse && Math.abs(c.pulse - 1) > 0.02) rows.push([c.pulse > 1 ? '× pulse' : '× inhibited', null, c.pulse]);
  let prod = 1, html = '';
  rows.forEach(([k, sub, f], i) => {
    const before = prod; if (i) prod *= f;
    const w = logw(prod), wb = logw(before);
    html += `<span class="k">${k}${sub ? ` <i>${sub}</i>` : ''}</span><span class="bar2"><span style="width:${w}%"></span>${i ? `<span class="cut" style="left:${w}%;width:${Math.max(0, wb - w)}%"></span>` : ''}</span><span class="v">${i ? f.toFixed(2) : fmt(f)}</span>`;
  });
  html += `<span class="k tot" style="font-weight:600;color:var(--text)">= rate</span><span class="bar2"><span style="width:${logw(prod)}%"></span></span><span class="v" style="font-weight:600">${fmt(c.v)}</span>`;
  const lim = [['thermo', c.thermo], ['sat', c.sat], ['reg', c.reg]].sort((a, b) => a[1] - b[1])[0];
  const why = lim[1] > 0.8 ? 'Nothing much holds it back: it runs near its capacity.'
    : lim[0] === 'thermo' ? (c.membrane ? 'Δp holds it near equilibrium: ' : 'It runs near equilibrium: ') + `ΔG is only ${c.dG.toFixed(1).replace('-', '−')} kJ/mol.`
    : lim[0] === 'sat' ? 'Its substrates are scarce: saturation holds it back most.'
    : `Regulation holds it back most${c.regWhy ? ': ' + c.regWhy : ''}.`;
  el.innerHTML = `<p class="card-name">${c.name}${c.sub ? ` <i>· ${c.sub}</i>` : ''}</p>`
    + `<p class="card-rate">${fmt(c.v)} mM/s${c.v < 0 ? ', backward' : ''}, ${(100 * Math.abs(c.v) / c.cap).toFixed(Math.abs(c.v) / c.cap < 0.1 ? 1 : 0)}% of its capacity; ΔG ${Number.isFinite(c.dG) ? c.dG.toFixed(1).replace('-', '−') : '−∞'} kJ/mol</p>`
    + `<div class="wf" style="--ink:${c.ink}">${html}</div><p class="card-why">${why}</p>`
    + `<p class="card-acts"><span>Pulse</span><span>Inhibit</span><span>Hold</span></p>`;
}
card($('[data-card="static"]'), { name: 'Cytochrome b₆f', sub: 'between PQ and PC', ink: 'var(--ink-prussian)', v: 1.957, cap: 20, dG: -0.5, thermo: 0.173, sat: 0.565, reg: 1, membrane: true });

// ── Traces: rows of one quantity each, a shared time axis, arrows where something was done ──
function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function trace(svg, o) {
  svg.innerHTML = '';
  const [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
  const lw = o.lw ?? 110, rw = o.rw ?? 60, mh = o.mh ?? 26, ah = o.ah ?? 18, n = o.rows.length;
  const rh = (H - mh - ah) / n, x0 = lw, x1 = W - rw, fs = o.fs || 12.5;
  const X = (t) => x0 + (t - o.t0) / (o.t1 - o.t0) * (x1 - x0);
  const txt = (x, y, s, st) => { const t = el('text', { x, y, style: `font: ${st || ''} ${fs}px var(--font); fill: var(--muted)` }, svg); t.textContent = s; return t; };
  o.rows.forEach((r, i) => {
    const top = mh + i * rh, base = top + rh - 4;
    el('line', { x1: x0, x2: x1, y1: base + 0.5, y2: base + 0.5, style: 'stroke: var(--rule); stroke-width: 1' }, svg);
    const Y = (v) => base - (Math.max(r.min, Math.min(r.max, v)) - r.min) / (r.max - r.min) * (rh - 10);
    let d = '';
    for (const [t, v] of r.data) if (t >= o.t0 && t <= o.t1 && Number.isFinite(v)) d += (d ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(v).toFixed(1);
    if (d) el('path', { d, style: `fill: none; stroke: ${r.color}; stroke-width: ${o.sw || 1.5}; stroke-linejoin: round; stroke-linecap: round${r.dash ? '; stroke-dasharray: ' + r.dash : ''}` }, svg);
    if (o.inside) { txt(x0, top + fs + 1, r.label, 'italic'); }
    else txt(0, base - (rh - 10) / 2 + fs / 3, r.label, 'italic');
    const last = o.noVal ? null : r.data.filter(([t]) => t <= o.t1).pop();
    if (last) { const t = txt(W, o.inside ? top + fs + 1 : base - (rh - 10) / 2 + fs / 3, r.fmt(last[1])); t.setAttribute('text-anchor', 'end'); t.style.fill = 'var(--text)'; t.style.fontVariantNumeric = 'tabular-nums'; }
  });
  for (const [t, label] of o.marks || []) {
    if (t < o.t0 || t > o.t1) continue;
    const x = X(t);
    el('line', { x1: x, x2: x, y1: mh - 4, y2: H - ah, style: 'stroke: var(--rule-strong); stroke-width: 1; stroke-dasharray: 2 3' }, svg);
    el('path', { d: `M${x - 4} ${mh - 12}L${x + 4} ${mh - 12}L${x} ${mh - 5}Z`, style: 'fill: var(--text)' }, svg);
    const tt = txt(x, mh - 16, label, 'italic'); tt.style.fill = 'var(--text2)';
    tt.setAttribute('text-anchor', x > x1 - 60 ? 'end' : x < x0 + 40 ? 'start' : 'middle');
  }
  for (const [t, label] of o.ticks || []) {
    const x = X(t), tt = txt(x, H - 3, label); tt.setAttribute('text-anchor', t === o.t1 ? 'end' : t === o.t0 ? 'start' : 'middle');
    el('line', { x1: x, x2: x, y1: H - ah, y2: H - ah + 4, style: 'stroke: var(--rule-strong)' }, svg);
  }
}

// The mocks' trace: the lit cyanobacterium, 4 model seconds = the last two minutes at 30×
{
  const D = TRACE2, ix = (k) => D.cols.indexOf(k), wall = (t) => (t - 4) * 30;
  const col = (k, f = (x) => x) => D.rows.map(r => [wall(r[0]), f(r[ix(k)])]);
  const rows = [
    { label: 'Δp', color: 'var(--accent)', data: col('dp'), min: 80, max: 230, fmt: (v) => v.toFixed(0) + ' mV' },
    { label: 'ATP share', color: 'var(--ink-ochre)', data: col('atp'), min: 0.6, max: 0.95, fmt: (v) => pct(v) + '%' },
    { label: 'NADPH share', color: 'var(--ink-viridian)', data: col('nadph'), min: 0.5, max: 1, fmt: (v) => pct(v) + '%' },
    { label: 'O₂ made', color: 'var(--ink-verdigris)', data: col('psii', (x) => x / 2), min: 0, max: 4.6, fmt: (v) => v.toFixed(2) + ' mM/s' },
  ];
  const marks = [[wall(0.8), 'PSII ×5'], [wall(2.0), 'light 30%'], [wall(3.1), 'PFK ×5']];
  const ticks = [[-120, '−2 min'], [-60, '−1 min'], [0, 'now']];
  trace($('[data-trace="mockA"]'), { rows, marks, ticks, t0: -120, t1: 0, lw: 0, rw: 0, mh: 28, ah: 16, inside: true, fs: 12 });
  trace($('[data-trace="mockB"]'), { rows: rows.slice(0, 3), marks, ticks, t0: -120, t1: 0, lw: 104, rw: 64, mh: 24, ah: 14, fs: 12.5 });
  trace($('[data-trace="mockC"]'), { rows, marks, ticks, t0: -120, t1: 0, lw: 110, rw: 90, mh: 26, ah: 16, fs: 13 });
}

// Fig. 3: Chance and Williams on the engine (animal cell, 230 model seconds)
{
  const D = TRACE, ix = (k) => D.cols.indexOf(k), col = (k) => D.rows.map(r => [r[0], r[ix(k)]]);
  trace($('#cw-trace'), {
    rows: [
      { label: 'O₂ taken up', color: 'var(--ink-verdigris)', data: col('cytox').map(([t, v]) => [t, v / 2]), min: 0, max: 3.6, fmt: (v) => v.toFixed(2) + ' mM/s' },
      { label: 'Δp', color: 'var(--accent)', data: col('dp'), min: 0, max: 230, fmt: (v) => v.toFixed(0) + ' mV' },
      { label: 'ATP share', color: 'var(--ink-ochre)', data: col('atpFrac'), min: 0, max: 1, fmt: (v) => pct(v) + '%' },
      { label: 'NADH share', color: 'var(--ink-prussian)', data: col('nadhFrac'), min: 0, max: 0.8, fmt: (v) => pct(v) + '%' },
    ],
    marks: D.marks, t0: 0, t1: 230, lw: 120, rw: 20, noVal: true, mh: 30, ah: 22, fs: 13.5, sw: 1.7,
    ticks: [[0, '0'], [50, '50'], [100, '100'], [150, '150'], [200, '200 model s']],
  });
}

// ── Fig. 2, live: Lumen's engine in this page ──
{
  const E = LumenEngine.createEngine('cyanobacterium', { seed: 1 });
  E.applyEnv(); for (let t = 0; t < 40; t++) E.advance(1);
  const vals = { light: E.env.light, o2: E.env.o2, atp: E.dial.atp, growth: E.dial.growth, slow: 30 };
  const start = { ...vals }, snap = E.snapshot();
  const j = (r) => E.rIndex[r];
  const conc = (id) => E.conc(id, 'c');
  const share = (a, bs) => { const x = conc(a), y = bs.reduce((s, b) => s + conc(b), 0); return x + y > 0 ? x / (x + y) : 0; };
  const ENZ = [
    ['CYTBF', 'Cytochrome b₆f', 'between PQ and PC', 'prussian', true], ['PSII', 'Photosystem II', 'water to plastoquinone', 'sap', true],
    ['PSI', 'Photosystem I', 'plastocyanin to ferredoxin', 'viridian', true], ['FNR', 'Ferredoxin–NADP⁺ reductase', 'makes NADPH', 'umber', true],
    ['ATPS', 'ATP synthase', 'c₁₄ ring', 'mulberry', true], ['RBPC', 'RuBisCO', 'fixes CO₂', 'viridian', false],
    ['PRUK', 'Phosphoribulokinase', 'Calvin cycle', 'viridian', false], ['PFK', 'Phosphofructokinase', 'glycolysis', 'sienna', false],
    ['G6PDH', 'G6P dehydrogenase', 'pentose phosphate', 'madder', false],
  ];
  const sel = $('#live-enz');
  sel.innerHTML = ENZ.map(([id, n]) => `<option value="${id}">${n}</option>`).join('');
  const N = 1200, buf = [], marks = [];
  let wallT = 0, sampleT = 0, drawT = 0;
  const mark = (key, label) => {
    const m = marks[marks.length - 1];
    if (m && m.key === key && wallT - m.t < 1.5) { m.t = wallT; m.label = label; } else marks.push({ t: wallT, key, label });
  };
  const apply = (k, v) => {
    if (k === 'light' || k === 'o2') { E.env[k] = v; E.applyEnv(); }
    else if (k === 'atp' || k === 'growth') E.dial[k] = v;
    mark(k, FIELDS[k].mark(v));
    drawT = 1;
  };
  sentence($('[data-sentence="live"]'), vals, apply);
  for (const b of $$('[data-pulse]')) {
    const go = () => { E.pulse(j(b.dataset.pulse), 1); mark('p' + b.dataset.pulse + wallT, b.textContent + ' ×5'); drawT = 1; };
    b.addEventListener('click', go); b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { go(); e.preventDefault(); } });
  }
  $('#live-reset').addEventListener('click', () => {
    E.restore(snap); Object.assign(vals, start); E.env.light = vals.light; E.env.o2 = vals.o2; E.applyEnv(); E.dial.atp = vals.atp; E.dial.growth = vals.growth;
    sentence($('[data-sentence="live"]'), vals, apply); mark('reset' + wallT, 'reset');
  });
  sel.addEventListener('change', () => { drawT = 1; });
  function sample() {
    E.evaluate();
    buf.push([wallT, E.dp(), share('atp', ['adp', 'amp']), share('nadph', ['nadp']), Math.max(0, E.state.v[j('PSII')]) / 2]);
    if (buf.length > N) buf.shift();
  }
  function draw() {
    const t1 = wallT, t0 = t1 - 120, rel = (k) => buf.map(r => [r[0] - t1, r[k]]);
    trace($('#live-trace'), {
      rows: [
        { label: 'Δp', color: 'var(--accent)', data: rel(1), min: 0, max: 240, fmt: (v) => v.toFixed(0) + ' mV' },
        { label: 'ATP share', color: 'var(--ink-ochre)', data: rel(2), min: 0, max: 1, fmt: (v) => pct(v) + '%' },
        { label: 'NADPH share', color: 'var(--ink-viridian)', data: rel(3), min: 0, max: 1, fmt: (v) => pct(v) + '%' },
        { label: 'O₂ made', color: 'var(--ink-verdigris)', data: rel(4), min: 0, max: 4.6, fmt: (v) => v.toFixed(2) + ' mM/s' },
      ],
      marks: marks.filter(m => m.t > t0).map(m => [m.t - t1, m.label]), t0: -120, t1: 0, lw: 104, rw: 84, mh: 30, ah: 20, fs: 13,
      ticks: [[-120, '−2 min'], [-90, ''], [-60, '−1 min'], [-30, ''], [0, 'now']],
    });
    $('#live-clock').textContent = `chemistry slowed ${vals.slow}×`;
    const [id, name, sub, ink, membrane] = ENZ.find(x => x[0] === sel.value), k = j(id), f = E.factors(k);
    const eff = E.effectors(k).filter(x => x.f < 0.9).sort((a, b) => a.f - b.f).slice(0, 2);
    const nm = (w) => { const s = Array.isArray(w) ? w[0] : w; return { atp: 'ATP', adp: 'ADP', amp: 'AMP', light: 'light', dark: 'light', dp: 'Δp', nadph: 'NADPH', nadh: 'NADH', g6p: 'G6P' }[s] || s; };
    const regWhy = eff.map(x => `${nm(x.what)} ${x.how === 'inh' || x.what === 'dark' ? '⊣' : '→'} ${x.f.toFixed(2)}`).join(', ');
    card($('[data-card="live"]'), { name, sub, ink: `var(--ink-${ink})`, v: f.v, cap: E.capacity(k), dG: f.dG, thermo: f.thermo, sat: f.sat, reg: f.reg, regWhy, membrane, pulse: E.pulseNow(k) });
    const psi = E.psi(), ph = E.dpH();
    $('#live-read').innerHTML = `<span>Δp <b>${E.dp().toFixed(0)} mV</b> = Δψ ${psi.toFixed(0)} + ΔpH ${ph.toFixed(0)}</span><span>RuBisCO <b>${E.state.v[j('RBPC')].toFixed(2)} mM/s</b></span><span>ATP synthase <b>${E.state.v[j('ATPS')].toFixed(2)} mM/s</b></span>`;
  }
  for (let i = 0; i < N; i++) { wallT += 0.1; E.advance(0.1 / vals.slow); sample(); }
  draw();
  let last = performance.now(), visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; last = performance.now(); }).observe($('.demo'));
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (visible) {
      wallT += dt; E.advance(dt / vals.slow);
      if ((sampleT += dt) >= 0.1) { sampleT = 0; sample(); }
      if ((drawT += dt) >= 0.25) { drawT = 0; draw(); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
