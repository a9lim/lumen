// Dashboard — the legend's live parts, read from the engine: the enzyme card
// (card.js) with its Pulse, Inhibit and Hold, the held enzyme's control
// coefficients against its paired baseline, and Fig. 2's readings (Δp's
// parts, ATP's sources, the exchange with the medium, the membrane's
// health). The canvas tooltip's last line comes from here too.
import Cell, { SYSTEM } from './cell.js';
import { HOLD } from './engine/engine.js';
import { MapView } from './map.js';
import { Membrane } from './membrane.js';
import { COMPLEX } from './mapbind.js';
import { F, RT } from './engine/thermo.js';
import { LINES } from './maplayout.js';
import Card, { mainReaction, targetName } from './card.js';

let _dom, _onVerb = null;
/** onVerb(target, what) hears the card's own Pulse, Inhibit and Hold, for Fig. 2's arrows. */
export function initDashboard(dom, onVerb) {
    _dom = dom; _onVerb = onVerb;
    Card.init(dom.card);
    const target = () => dom.enzymeSelect.value;
    dom.enzymePulse.addEventListener('click', () => { const t = target(); if (t && Cell.pulse(t, 1)) { _onVerb?.(t, 'pulse'); updateDashboard(); } });
    dom.enzymeInhibit.addEventListener('click', () => { const t = target(); if (t && Cell.pulse(t, -1)) { _onVerb?.(t, 'inhibit'); updateDashboard(); } });
    // Hold toggles a sustained ×(1 + HOLD) on the chosen enzyme, and its comparison
    dom.enzymeHold.addEventListener('click', () => {
        const t = target(); if (!t) return;
        if (Cell.held === t) { Cell.release(t); _onVerb?.(t, 'release'); } else if (Cell.pulse(t, 1, true)) _onVerb?.(t, 'hold');
        updateDashboard();
    });
    dom.enzymeSelect.addEventListener('change', () => { Card.show(dom.enzymeSelect.value); updateDashboard(); });
    Cell.onCompare = (c) => {
        updateDashboard();
        if (c.state !== 'done' || !c.C) return;
        // the strongest system flux it controls, in a toast
        const best = SYSTEM.filter(([r]) => r !== c.own && c.C[r] != null).sort((a, b) => Math.abs(c.C[b[0]]) - Math.abs(c.C[a[0]]))[0];
        if (best) showToast(`${heldName(c)}: control over ${best[1]} ${fmtC(c.C[best[0]])}`);
    };
}

/** Put a target in the card (and the select, when it lists it): your last click on the plate. */
export function chooseEnzyme(target) {
    const t = [].concat(target)[0];
    if (!_dom || !t) return;
    if ([..._dom.enzymeSelect.options].some(o => o.value === t)) _dom.enzymeSelect.value = t;
    Card.show(t);
    updateDashboard();
}

const fmtC = (c) => Math.abs(c) >= 10 ? c.toFixed(0) : c.toFixed(2).replace('-', '−');
/** A readout line: label–value pairs, each kept on one line, broken only after a ·. */
const pairs = (...ps) => ps.filter(Boolean).map((p) => `<span class="lu-pair">${p}</span>`).join('&nbsp;· ');
function heldName(c) {
    const sel = _dom && _dom.enzymeSelect, o = sel && [...sel.options].find(o => o.value === c.targets[0]);
    return o ? o.textContent : Cell.engine.reactions[Cell.engine.rIndex[c.own]].name;
}
/** The paired baseline's report: running (model seconds so far), cancelled, no steady state, or its control coefficients there. */
function controlText() {
    const c = Cell.compare; if (!c) return null;
    const how = `${heldName(c)} held <b>×${(1 + c.sign * HOLD).toFixed(1)}</b>`;
    if (c.state === 'running') return pairs(how, `settling <b>${c.t}</b> s`);
    if (c.state === 'cancelled') return pairs(how, 'cancelled');
    if (!c.steady) return pairs(how, `no steady state by <b>${c.t}</b> s`);
    const parts = [[c.own, 'own flux'], ...SYSTEM.filter(([r]) => r !== c.own)].filter(([r]) => c.C[r] != null).map(([r, n]) => `${n} <b>${fmtC(c.C[r])}</b>`);
    return pairs(how, `steady at <b>${c.t}</b> s`, ...(parts.length ? ['C: ' + parts[0], ...parts.slice(1)] : ['C: —']));
}

let _dirty = false;
export function markDashboardDirty() {
    if (_dirty) return;
    _dirty = true;
    requestAnimationFrame(() => { _dirty = false; updateDashboard(); });
}

/**
 * The select's list: the membrane's complexes, then the cell's enzymes on
 * the map, by line. A new cell's card opens on `first`, its specimen's own
 * choice; a reset keeps the card's enzyme.
 */
export function fillInspector(first) {
    const sel = _dom && _dom.enzymeSelect;
    if (!sel || !Cell.engine) return;
    const keep = sel.value;
    sel.textContent = '';
    const groups = {};
    groups.Membrane = Object.keys(COMPLEX).filter(k => Membrane.pos[k] && Cell.targets('mem:' + k).length).map(k => ['mem:' + k, Membrane.spec.names[k] || k]);
    for (const [id, s] of Object.entries(MapView.segs)) {
        const parts = Cell.seg[id];
        if (!parts || !parts.length || !s.label) continue;
        const line = LINES[s.line].name;
        (groups[line] ||= []).push(['seg:' + id, s.label + (s.rev && s.rev !== s.label ? ' / ' + s.rev : '')]);
    }
    for (const [g, items] of Object.entries(groups)) {
        if (!items.length) continue;
        const og = document.createElement('optgroup'); og.label = g;
        for (const [v, t] of items) { const o = document.createElement('option'); o.value = v; o.textContent = t; og.appendChild(o); }
        sel.appendChild(og);
    }
    const has = (v) => [...sel.options].some(o => o.value === v);
    sel.value = first && has(first) ? first : has(keep) ? keep : sel.options[0]?.value || '';
    Card.show(sel.value);
}

/** The tooltip's last line for a target: its main reaction's rate (negative backward), ΔG, its three factors and any pulse. */
export function factorText(target) {
    const e = Cell.engine; if (!e) return null;
    const j = mainReaction(target); if (j == null) return null;
    const f = e.factors(j), p = e.pulseNow(j);
    const dG = Number.isFinite(f.dG) ? f.dG.toFixed(1).replace('-', '−') + ' kJ/mol' : f.dG > 0 ? '+∞' : '−∞';
    const held = Cell.held && [].concat(Cell.held).includes(target);
    const parts = [`${fmtR(f.v)} mM/s`, `ΔG ${dG}`, `thermodynamics ${f.thermo.toFixed(2)}`, `saturation ${f.sat.toFixed(2)}`, `regulation ${f.reg.toFixed(2)}`];
    if (held || Math.abs(p - 1) > 0.02) parts.push(`${held ? 'held ' : ''}×${p.toFixed(1)}`);
    return parts.join(' · ');
}

const fmt = (x) => { const a = Math.abs(x); return a === 0 ? '0' : a >= 10 ? x.toFixed(0) : a >= 1 ? x.toFixed(1) : a >= 0.01 ? x.toFixed(2) : x.toExponential(0); };
const num = (x) => fmt(x).replace('-', '−');
// a reading: small rates in plain decimals, not exponents
const fmtR = (x) => { const a = Math.abs(x); return (a === 0 ? '0' : a < 0.001 ? (x < 0 ? '−' : '') + '<0.001' : a < 0.01 ? x.toFixed(3) : fmt(x)).replace('-', '−'); };
const _set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
const _html = (el, t) => { if (el && el.innerHTML !== t) el.innerHTML = t; };

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
function yieldText() {
    const e = Cell.engine, has = (r) => r in e.rIndex, nH = (r) => has(r) ? e.coupling(e.rIndex[r]).nH : 0;
    if (!has('ATPS')) return '';
    const ring = e.cell.ring || 12, cost = -nH('ATPS') + (has('PIC') ? 1 : 0);
    const f = (x) => `<b>${x.toFixed(1)}</b>`, out = [];
    if (has('PSII')) out.push(`ATP/NADPH, linear ${f((nH('PSII') + nH('CYTBF')) / cost)}`);
    // complex I takes NADH; the cyanobacterium's NDH-1 takes ferredoxin, from NADPH through FNR in the dark
    const entry = has('NDH1') ? ['NDH1', 'NADH'] : has('NDH1F') ? ['NDH1F', 'NADPH'] : null;
    if (entry && has('CYTOX')) {
        const succ = nH('CYTBF') + nH('CYTOX');
        out.push(`P/O ${entry[1]} ${f((nH(entry[0]) + succ) / cost)}`, `succinate ${f(succ / cost)}`);
    }
    out.push(`H⁺/ATP ${f(cost)}`, `ring <b>c${String(ring).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d])}</b>`);
    return pairs(...out);
}

/** Full refresh, four times a second and after a click: the card, the hold's report, Fig. 2's readings. */
export function updateDashboard() {
    const e = Cell.engine;
    if (!_dom || !e) return;
    const v = e.state.v, has = (r) => r in e.rIndex, R = (rid) => has(rid) ? v[e.rIndex[rid]] * (e.model.comps[e.reactions[e.rIndex[rid]].comp] || 1) : 0;

    Card.update();
    Cell.checkCompare();
    _dom.enzymeHold.setAttribute('aria-pressed', String(!!Cell.held && Cell.held === _dom.enzymeSelect.value));
    const t = controlText(); _dom.enzymeControl.hidden = !t; _html(_dom.enzymeControl, t || '');

    // Fig. 2's readings: Δp and its parts, ATP's sources, the exchange with the medium, the membrane's health
    const lines = [];
    const th = atpThreshold();
    // Δp itself is Fig. 2's first row; here its parts, and the Δp ATP synthase needs
    const dp = [`Δψ <b>${num(Math.round(e.psi()))}</b>`, `ΔpH <b>${num(Math.round(e.dpH()))}</b>`];
    if (Number.isFinite(th)) dp.push(`ATP needs <b>${Math.round(th)}</b>`);
    dp[dp.length - 1] += ' mV';
    lines.push(pairs(...dp));
    if (has('ATPS')) {
        // ATP synthase's rate is negative while it runs backward, splitting ATP
        const sub = Math.max(0, R('PGK')) + Math.max(0, R('PYK')) + Math.max(0, R('SUCOAS'));
        lines.push(pairs(`ATP from synthase <b>${fmtR(R('ATPS'))}</b>`, `substrates <b>${fmtR(sub)}</b> mM/s`));
    }
    // Exchange with the medium, mM/s of cytosol: in, or out; then growth
    const ex = [];
    for (const [rid, name] of [['EX_o2', 'O₂'], ['EX_co2', 'CO₂'], ['EX_glc', 'glucose']]) {
        if (!has(rid)) continue;
        const x = R(rid);
        if (Math.abs(x) >= 0.005) ex.push(`${name} ${x > 0 ? 'in' : 'out'} <b>${fmtR(Math.abs(x))}</b>`);
    }
    if (ex.length) ex[ex.length - 1] += ' mM/s';
    if (has('BIOMASS')) ex.push(`growing <b>${fmtR(R('BIOMASS') / (300 / 3600))}</b> /h`);
    if (ex.length) { ex[0] = ex[0][0].toUpperCase() + ex[0].slice(1); lines.push(pairs(...ex)); }
    const m = 'm' in e.model.comps ? 'm' : 'c', health = 100 * (1 - e.state.damage);
    lines.push(pairs(`Membrane intact <b>${Math.round(health)}%</b>`, `O₂•⁻ <b>${fmtR(e.conc('o2s', m) * 1e6)}</b> nM`, `H₂O₂ <b>${fmtR(e.conc('h2o2', m) * 1e6)}</b> nM`));
    _html(_dom.readings, lines.map(l => `<p>${l}</p>`).join(''));
    _html(_dom.yieldNote, yieldText());
}

export { targetName };
