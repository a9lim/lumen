// Dashboard — the legend's live parts, read from the engine: the enzyme card
// (card.js) with its Pulse, Inhibit and Hold, the held enzyme's control
// coefficients against its paired baseline, and Fig. 2's readings (Δp and its
// parts, ATP's sources, the exchange with the medium, the membrane's
// health). The canvas tooltip's last line comes from here too.
import Cell, { SYSTEM } from './cell.js';
import { HOLD, ZMV } from './engine/engine.js';
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

/** The tooltip's last line for a target: its rate and its three factors. */
export function factorText(target) {
    const e = Cell.engine; if (!e) return null;
    const j = mainReaction(target); if (j == null) return null;
    const f = e.factors(j), r = e.reactions[j];
    const dG = Number.isFinite(f.dG) ? f.dG.toFixed(1).replace('-', '−') + ' kJ/mol' : f.dG > 0 ? '+∞' : '−∞';
    const way = f.v < 0 ? ', running backward' : '';
    const held = Cell.held && [].concat(Cell.held).includes(target);
    const pulse = held ? `; held ×${e.pulseNow(j).toFixed(1)}` : Math.abs(e.pulseNow(j) - 1) > 0.02 ? `; pulsed ×${e.pulseNow(j).toFixed(1)}` : '';
    return `${r.name}: ${fmt(f.v)} mM/s${way}; ΔG ${dG}; thermodynamics ${f.thermo.toFixed(2)}, saturation ${f.sat.toFixed(2)}, regulation ${f.reg.toFixed(2)}` + pulse;
}

const fmt = (x) => { const a = Math.abs(x); return a === 0 ? '0' : a >= 10 ? x.toFixed(0) : a >= 1 ? x.toFixed(1) : a >= 0.01 ? x.toFixed(2) : x.toExponential(0); };
const num = (x) => fmt(x).replace('-', '−');
// a reading: small rates in plain decimals, not exponents
const fmtR = (x) => { const a = Math.abs(x); return a === 0 ? '0' : a < 0.001 ? 'under 0.001' : a < 0.01 ? x.toFixed(3) : fmt(x); };
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
export function yieldText() {
    const e = Cell.engine, has = (r) => r in e.rIndex, nH = (r) => has(r) ? e.coupling(e.rIndex[r]).nH : 0;
    if (!has('ATPS')) return '';
    const ring = e.cell.ring || 12, synth = -nH('ATPS'), carrier = has('PIC') ? 1 : 0, cost = synth + carrier;
    const f = (x) => x.toFixed(1), per = `${f(cost)} per ATP (${ring} c subunits turn for three ATP${carrier ? ', and exporting each ATP costs one more' : ''})`;
    const out = [];
    if (has('PSII')) {
        const lin = nH('PSII') + nH('CYTBF'), y = lin / cost;
        out.push(`ATP per NADPH by linear flow: ${f(y)}, from ${lin} protons per two electrons and ${per}. ` + (y < 1.5 - 1e-9 ? 'The Calvin cycle needs 1.5, so cyclic flow makes up the rest.' : 'That meets the Calvin cycle’s 1.5 without cyclic flow.'));
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

/** Full refresh, four times a second and after a click: the card, the hold's report, Fig. 2's readings. */
export function updateDashboard() {
    const e = Cell.engine;
    if (!_dom || !e) return;
    const v = e.state.v, has = (r) => r in e.rIndex, R = (rid) => has(rid) ? v[e.rIndex[rid]] * (e.model.comps[e.reactions[e.rIndex[rid]].comp] || 1) : 0;

    Card.update();
    Cell.checkCompare();
    _dom.enzymeHold.setAttribute('aria-pressed', String(!!Cell.held && Cell.held === _dom.enzymeSelect.value));
    const t = controlText(); _dom.enzymeControl.hidden = !t; _set(_dom.enzymeControl, t || '');

    // Fig. 2's readings: Δp and its parts, ATP's sources, the exchange with the medium, the membrane's health
    const lines = [];
    const th = atpThreshold();
    lines.push(`Δp <b>${Math.round(e.dp())} mV</b>: Δψ ${num(Math.round(e.psi()))} and ΔpH ${num(Math.round(e.dpH()))} (${num(+(e.dpH() / ZMV).toFixed(1))} pH units)` + (Number.isFinite(th) ? `; making ATP needs ${Math.round(th)}.` : '.'));
    if (has('ATPS')) {
        const sub = Math.max(0, R('PGK')) + Math.max(0, R('PYK')) + Math.max(0, R('SUCOAS')), ox = R('ATPS');
        lines.push(ox < -0.005 ? `ATP synthase runs backward, splitting <b>${fmt(-ox)} mM/s</b>; substrates make ${fmt(sub)}.`
            : `ATP made <b>${fmt(ox)} mM/s</b> by ATP synthase, ${fmt(sub)} by substrates.`);
    }
    // Exchange with the medium, mM/s of cytosol: in, or out
    const ex = [];
    for (const [rid, name] of [['EX_o2', 'O₂'], ['EX_co2', 'CO₂'], ['EX_glc', 'glucose']]) {
        if (!has(rid)) continue;
        const x = R(rid);
        if (Math.abs(x) >= 0.005) ex.push(`${name} ${x > 0 ? 'in' : 'out'} ${fmtR(Math.abs(x))}`);
    }
    let exch = ex.length ? ex.join(', ') + ' mM/s' : '';
    if (has('BIOMASS')) exch += (exch ? '; ' : '') + `growing ${fmtR(R('BIOMASS') / (300 / 3600))} /h`;
    if (exch) lines.push(exch[0].toUpperCase() + exch.slice(1) + '.');
    const m = 'm' in e.model.comps ? 'm' : 'c', health = 100 * (1 - e.state.damage);
    lines.push(`Membrane ${Math.round(health)}% intact; superoxide ${fmtR(e.conc('o2s', m) * 1e6)} nM, peroxide ${fmtR(e.conc('h2o2', m) * 1e6)} nM.`);
    _html(_dom.readings, lines.map(l => `<p>${l}</p>`).join(''));
    _set(_dom.yieldNote, yieldText());
}

export { targetName };
