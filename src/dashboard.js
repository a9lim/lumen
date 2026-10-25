// Dashboard — the margin's Stats tab, read from the engine: the inspector
// (an enzyme's rate and why: ΔG and its thermodynamic, saturation and
// regulation factors, with pulse and inhibit), the cofactor pools with their
// 60-second sparklines, Δp, oxidative stress, ATP's sources and the cell's
// exchange with its medium; and the held enzyme's control coefficients
// against its paired baseline. Updates are rAF-coalesced.
import { histories } from './state.js';
import Cell, { SYSTEM } from './cell.js';
import { HOLD, ZMV } from './engine/engine.js';
import { MapView } from './map.js';
import { Membrane } from './membrane.js';
import { COMPLEX } from './mapbind.js';
import { F, RT } from './engine/thermo.js';
import { LINES } from './maplayout.js';

let _dom;
export function initDashboard(dom) {
    _dom = dom;
    dom.enzymePulse?.addEventListener('click', () => { const t = dom.enzymeSelect.value; if (t) { Cell.pulse(t, 1); updateDashboard(); } });
    dom.enzymeInhibit?.addEventListener('click', () => { const t = dom.enzymeSelect.value; if (t) { Cell.pulse(t, -1); updateDashboard(); } });
    // Hold toggles a sustained ×(1 + HOLD) on the selected enzyme, and its comparison
    dom.enzymeHold?.addEventListener('click', () => {
        const t = dom.enzymeSelect.value; if (!t) return;
        if (Cell.held === t) Cell.release(t); else Cell.pulse(t, 1, true);
        updateDashboard();
    });
    dom.enzymeSelect?.addEventListener('change', () => updateDashboard());
    Cell.onCompare = (c) => {
        updateDashboard();
        if (c.state !== 'done' || !c.C) return;
        // the strongest system flux it controls, in a toast
        const best = SYSTEM.filter(([r]) => r !== c.own && c.C[r] != null).sort((a, b) => Math.abs(c.C[b[0]]) - Math.abs(c.C[a[0]]))[0];
        if (best) showToast(`${heldName(c)}: control over ${best[1]} ${fmtC(c.C[best[0]])}`);
    };
}

const fmtC = (c) => Math.abs(c) >= 10 ? c.toFixed(0) : c.toFixed(2).replace('-', '−');
function heldName(c) {
    const sel = _dom && _dom.enzymeSelect, o = sel && [...sel.options].find(o => o.value === c.targets[0]);
    return o ? o.textContent : Cell.engine.reactions[Cell.engine.rIndex[c.own]].name;
}
/** The paired baseline's report: running, its coefficients at the steady state, or why there are none. */
function controlText() {
    const c = Cell.compare; if (!c) return null;
    const how = `${heldName(c)} held ×${(1 + c.sign * HOLD).toFixed(1)}`;
    if (c.state === 'running') return `${how} against a paired baseline: running both to a steady state, ${c.t} s of model time so far.`;
    if (c.state === 'cancelled') return `${how}: conditions changed before a steady state, so no comparison. Hold it again.`;
    if (!c.steady) return `${how}: no steady state within ${c.t} s of model time, so no control coefficient.`;
    const parts = [[c.own, 'its own flux'], ...SYSTEM.filter(([r]) => r !== c.own)].filter(([r]) => c.C[r] != null).map(([r, n]) => `${n} ${fmtC(c.C[r])}`);
    return `${how}, at the steady state ${c.t} s on. Its control over ${parts.join(' · ')}` + (parts.length ? '.' : 'no flux large enough to judge.');
}

let _dirty = false;
export function markDashboardDirty() {
    if (_dirty) return;
    _dirty = true;
    requestAnimationFrame(() => { _dirty = false; updateDashboard(); });
}

/** The inspector's list: the cell's enzymes on the map, by line, then the membrane's complexes. */
export function fillInspector() {
    const sel = _dom && _dom.enzymeSelect;
    if (!sel || !Cell.engine) return;
    const keep = sel.value;
    sel.textContent = '';
    const groups = {};
    for (const [id, s] of Object.entries(MapView.segs)) {
        const parts = Cell.seg[id];
        if (!parts || !parts.length || !s.label) continue;
        const line = LINES[s.line].name;
        (groups[line] ||= []).push(['seg:' + id, s.label + (s.rev && s.rev !== s.label ? ' / ' + s.rev : '')]);
    }
    groups.Membrane = Object.keys(COMPLEX).filter(k => Membrane.pos[k] && Cell.targets('mem:' + k).length).map(k => ['mem:' + k, Membrane.spec.names[k] || k]);
    for (const [g, items] of Object.entries(groups)) {
        if (!items.length) continue;
        const og = document.createElement('optgroup'); og.label = g;
        for (const [v, t] of items) { const o = document.createElement('option'); o.value = v; o.textContent = t; og.appendChild(o); }
        sel.appendChild(og);
    }
    if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
}

/** A target's main reaction now: the one carrying the most. */
function mainReaction(target) {
    const e = Cell.engine, rids = Cell.targets(target);
    let best = null, bv = -1;
    for (const r of rids) { const j = e.rIndex[r], v = Math.abs(e.state.v[j]); if (v > bv) { bv = v; best = j; } }
    return best;
}

/** The inspector's text for a target, also the canvas tooltip's last line. */
export function factorText(target) {
    const e = Cell.engine; if (!e) return null;
    const j = mainReaction(target); if (j == null) return null;
    const f = e.factors(j), r = e.reactions[j];
    const dG = Number.isFinite(f.dG) ? f.dG.toFixed(1) + ' kJ/mol' : f.dG > 0 ? '+∞' : '−∞';
    const way = f.v < 0 ? ', running backward' : '';
    const held = Cell.held && [].concat(Cell.held).includes(target);
    const pulse = held ? `; held ×${e.pulseNow(j).toFixed(1)}, compared in Stats` : Math.abs(e.pulseNow(j) - 1) > 0.02 ? `; pulsed ×${e.pulseNow(j).toFixed(1)}` : '';
    return `${r.name}: ${fmt(f.v)} mM/s${way}; ΔG ${dG}; thermodynamics ${f.thermo.toFixed(2)}, saturation ${f.sat.toFixed(2)}, regulation ${f.reg.toFixed(2)}` + pulse;
}

const fmt = (x) => { const a = Math.abs(x); return a === 0 ? '0' : a >= 10 ? x.toFixed(0) : a >= 1 ? x.toFixed(1) : a >= 0.01 ? x.toFixed(2) : x.toExponential(0); };
const _set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
function bar(barEl, ratioEl, frac) {
    const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
    if (barEl) barEl.style.width = pct;
    _set(ratioEl, pct);
}

/** A sparkline in the margin's medium: a hairline in the pool's ink over a baseline. */
function spark(id, h, color) {
    const cv = document.getElementById(id);
    if (!cv || !cv.offsetWidth) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.offsetWidth, ht = cv.offsetHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(ht * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, ht);
    const T = _themePalette();
    c.strokeStyle = T.text + '26'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, ht - 0.5); c.lineTo(w, ht - 0.5); c.stroke();
    if (h.count < 2) return;
    c.strokeStyle = color; c.lineWidth = 1.3; c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i < h.count; i++) {
        const v = h.data[(h.head - h.count + i + h.cap) % h.cap];
        const x = w * (i + h.cap - h.count) / (h.cap - 1), y = 2 + (ht - 4) * (1 - v);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
}

/** The pools' shares in the slab's compartment: ATP of the adenylates, NADH of NAD, NADPH of NADP. */
export function poolShares() {
    const e = Cell.engine, m = 'm' in e.model.comps ? 'm' : 'c', c = (s) => e.conc(s, m);
    const ad = c('atp') + c('adp') + c('amp'), nad = c('nad') + c('nadh'), nadp = c('nadp') + c('nadph');
    return { atp: ad ? c('atp') / ad : 0, nadh: nad ? c('nadh') / nad : 0, nadph: nadp ? c('nadph') / nadp : 0, comp: m };
}

/** The Δp ATP synthase needs to make ATP now, mV: the phosphorylation potential over its protons per ATP. */
function atpThreshold() {
    const e = Cell.engine, m = 'm' in e.model.comps ? 'm' : 'c';
    if (!('ATPS' in e.rIndex)) return Infinity;
    const { nH, dg0 } = e.coupling(e.rIndex.ATPS);
    const atp = e.conc('atp', m), adp = e.conc('adp', m), pi = e.conc('pi', m);
    if (!adp || !pi) return Infinity;
    return (dg0 + RT * Math.log(atp / 1000 / (adp / 1000 * pi / 1000))) / (-nH * F) * 1000;
}

/**
 * What the membrane's stoichiometry yields, from the cell's own reactions: protons pumped per
 * two electrons over protons per ATP (the ring's, and in mitochondria the phosphate carrier's
 * one more, with ANT's charge: one proton-motive force's worth per ATP exported).
 */
export function yieldText() {
    const e = Cell.engine, has = (r) => r in e.rIndex, nH = (r) => has(r) ? e.coupling(e.rIndex[r]).nH : 0;
    if (!has('ATPS')) return '';
    const ring = e.cell.ring || 12, synth = -nH('ATPS'), carrier = has('PIC') ? 1 : 0, cost = synth + carrier;
    const f = (x) => x.toFixed(1), per = `${f(cost)} per ATP (${ring} c subunits turn for three ATP${carrier ? ', and exporting each ATP costs one more' : ''})`;
    const out = [];
    if (has('PSII')) {
        const lin = nH('PSII') + nH('CYTBF'), y = lin / cost;
        out.push(`ATP per NADPH by linear flow: ${f(y)}, from ${lin} protons per two electrons and ${per}. ` + (y < 1.5 - 1e-9 ? 'The Calvin cycle needs 1.5, so cyclic flow makes up the rest.' : 'That meets the Calvin cycle\u2019s 1.5 without cyclic flow.'));
    }
    // complex I takes NADH; the cyanobacterium's NDH-1 takes ferredoxin, from NADPH through FNR in the dark
    const entry = has('NDH1') ? ['NDH1', 'NADH'] : has('NDH1F') ? ['NDH1F', 'NADPH (through ferredoxin)'] : null;
    if (entry && has('CYTOX')) {
        const nadh = nH(entry[0]) + nH('CYTBF') + nH('CYTOX'), succ = nH('CYTBF') + nH('CYTOX');
        out.push(`P/O ${f(nadh / cost)} from ${entry[1]} and ${f(succ / cost)} from succinate: ${nadh} and ${succ} protons pumped per two electrons${has('PSII') ? ', ' + f(cost) + ' per ATP' : ', ' + per}.`);
    }
    if (has('BR') && !has('PSII')) out.push(`Bacteriorhodopsin pumps one proton per photon, so an ATP takes ${f(synth)} photons (${ring} c subunits turn for three ATP).`);
    if (!out.length) out.push(`No chain here. Run backward, ATP synthase spends an ATP to pump ${f(synth)} protons out (${ring} c subunits turn for three ATP).`);
    return out.join(' ');
}

/** Full refresh: after every frame's sample, coalesced. */
export function updateDashboard() {
    const e = Cell.engine;
    if (!_dom || !e) return;
    const v = e.state.v, R = (rid) => rid in e.rIndex ? v[e.rIndex[rid]] * (e.model.comps[e.reactions[e.rIndex[rid]].comp] || 1) : 0;
    const sh = poolShares();
    bar(_dom.atpBar, _dom.atpRatio, sh.atp);
    bar(_dom.nadhBar, _dom.nadhRatio, sh.nadh);
    bar(_dom.nadphBar, _dom.nadphRatio, sh.nadph);
    _set(_dom.poolsWhere, sh.comp === 'm' ? 'In the mitochondrial matrix, under the membrane' : 'In the cytoplasm, under the membrane');

    _set(_dom.protonMv, Math.round(e.dp()) + ' mV');
    // Δp's two parts: charge across the membrane, and the pH difference (lumen side more acid)
    _set(_dom.psiMv, Math.round(e.psi()) + ' mV');
    _set(_dom.phMv, Math.round(e.dpH()) + ' mV · ' + (e.dpH() / ZMV).toFixed(1).replace('-', '−') + ' pH');
    const th = atpThreshold();
    _set(_dom.atpMv, Number.isFinite(th) ? Math.round(th) + ' mV' : 'no ADP');
    _set(_dom.yieldNote, yieldText());
    _set(_dom.protonsLeaked, fmt(R('LEAK') + R('UCP')) + ' mM/s');

    const m = 'm' in e.model.comps ? 'm' : 'c';
    _set(_dom.superoxide, fmt(e.conc('o2s', m) * 1e6) + ' nM');
    _set(_dom.peroxide, fmt(e.conc('h2o2', m) * 1e6) + ' nM');
    _set(_dom.rosMade, fmt(R('ROSI') + R('ROSQ')) + ' mM/s');
    const health = 100 * (1 - e.state.damage);
    if (_dom.healthBar) {
        _dom.healthBar.style.width = health + '%';
        _dom.healthBar.dataset.level = health > 50 ? 'ok' : health > 20 ? 'low' : 'critical';
    }
    _set(_dom.healthRatio, Math.round(health) + '%');

    // ATP's sources: at the substrate (PGK, PK, succinyl-CoA synthetase) or by ATP synthase
    const sub = Math.max(0, R('PGK')) + Math.max(0, R('PYK')) + Math.max(0, R('SUCOAS')), ox = Math.max(0, R('ATPS'));
    _set(_dom.atpSubstrate, fmt(sub) + ' mM/s');
    _set(_dom.atpOxidative, fmt(ox) + (R('ATPS') < 0 ? ' (running backward)' : '') + ' mM/s');
    if (sub + ox > 0 && _dom.atpSourceSub) {
        _dom.atpSourceSub.style.width = (sub / (sub + ox) * 100) + '%';
        _dom.atpSourceOx.style.width = (ox / (sub + ox) * 100) + '%';
    }

    // Exchange with the medium, mM/s of cytosol: taken in, or given off (−)
    _set(_dom.o2Net, fmt(R('EX_o2')) + ' mM/s');
    _set(_dom.co2Net, fmt(R('EX_co2')) + ' mM/s');
    _set(_dom.glcNet, fmt(R('EX_glc')) + ' mM/s');
    _set(_dom.growthNet, fmt(R('BIOMASS') / (300 / 3600)) + ' /h');

    // The inspector, and the held enzyme's comparison
    if (_dom.enzymeSelect && _dom.enzymeSelect.value) _set(_dom.enzymeFactors, factorText(_dom.enzymeSelect.value) || '—');
    Cell.checkCompare();
    if (_dom.enzymeHold) _dom.enzymeHold.setAttribute('aria-pressed', String(!!Cell.held && Cell.held === _dom.enzymeSelect.value));
    if (_dom.enzymeControl) { const t = controlText(); _dom.enzymeControl.hidden = !t; _set(_dom.enzymeControl, t || ''); }

    if (_dom.statsVisible && !_dom.statsVisible()) return;
    const T = _themePalette();
    spark('spark-atp', histories.atp, T.atp);
    spark('spark-nadh', histories.nadh, T.nadh);
    spark('spark-nadph', histories.nadph, T.nadph);
    spark('spark-gradient', histories.gradient, T.accent);
}
