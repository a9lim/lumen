// Card — the enzyme you last touched, in the legend: its ΔG and its rate,
// drawn as a budget, its capacity times each factor the engine puts on it
// (light, a switch, a pulse, thermodynamics, saturation, regulation), each
// bar the running product on a log scale, so the factor holding it back is
// the longest hatched stretch; under it, the effectors regulation is made
// of. It follows your last click on the plate; the select is its keyboard path.
import Cell from './cell.js';
import { MapView } from './map.js';
import { Membrane } from './membrane.js';
import { LINES } from './maplayout.js';
import { effectorName } from './flux.js';

// Each membrane complex's ink, as complexes.js paints it
const INK = { psii: 'sap', ndh1: 'indigo', sdh: 'violet', cytb6f: 'prussian', cytOx: 'verdigris', psi: 'viridian', fnr: 'umber', atpSyn: 'mulberry', br: 'violet', nnt: 'madder', ucp: 'sienna' };
// Each complex's full name, as the specimen has it
const LONG = { psii: 'Photosystem II', psi: 'Photosystem I', fnr: 'Ferredoxin–NADP⁺ reductase', atpSyn: 'ATP synthase', br: 'Bacteriorhodopsin', nnt: 'Transhydrogenase', ucp: 'Uncoupling protein', sdh: 'Succinate dehydrogenase' };
function longName(key) {
    const f = Membrane.spec.frame, mito = f === 'cristae';
    if (key === 'cytb6f') return mito || f === 'slayer' ? 'Cytochrome bc₁' : 'Cytochrome b₆f';
    if (key === 'cytOx') return mito ? 'Cytochrome c oxidase' : 'Cytochrome oxidase';
    if (key === 'ndh1') return mito ? 'NADH dehydrogenase' : 'NDH-1';
    return LONG[key] || Membrane.spec.names[key] || key;
}
const DECADES = 3;   // the budget's log scale spans capacity down to a thousandth

const fmt = (x) => { const a = Math.abs(x); return a === 0 ? '0' : a >= 10 ? x.toFixed(0) : a >= 1 ? x.toFixed(1) : a >= 0.01 ? x.toFixed(2) : x.toExponential(0).replace('e-', '×10⁻').replace(/(\d)$/, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]); };
const minus = (s) => s.replace('-', '−');
const logw = (x) => Math.max(0, Math.min(1, 1 + Math.log10(Math.max(x, 1e-9)) / DECADES)) * 100;

/** A target's main reaction now: the one carrying the most. */
export function mainReaction(target) {
    const e = Cell.engine, rids = Cell.targets(target);
    let best = null, bv = -1;
    for (const r of rids) { const j = e.rIndex[r], v = Math.abs(e.state.v[j]); if (v > bv) { bv = v; best = j; } }
    return best;
}

/** What a target is called on the plate: a segment's label, a complex's callout, a loop's line. */
export function targetName(target) {
    const t = [].concat(target)[0];
    if (!t) return '';
    const [kind, id] = t.split(':');
    if (kind === 'seg') { const s = MapView.segs[id]; return (s && (s.label || s.rev)) || id; }
    if (kind === 'mem') return Membrane.spec.names[id] || id;
    if (kind === 'line') return LINES[Object.keys(LINES).find(k => LINES[k].toggle === id)]?.name || id;
    return id;
}

/** Where the target's connections sit on the map, for its threads (null for the membrane's complexes). */
export function mapPoint(target) {
    const t = [].concat(target)[0];
    if (!t || !t.startsWith('seg:')) return null;
    const s = MapView.segs[t.slice(4)];
    return s && s.lab ? s.lab.glyphAt || [s.lab.x, s.lab.y] : null;
}

const Card = {
    el: null, target: null, _keys: '',

    init(el) { this.el = el; },

    /** Show a target: build its card; numbers follow in update(). */
    show(target) {
        this.target = target; this._keys = '';
        this.update();
    },

    update() {
        const e = Cell.engine, el = this.el;
        if (!el || !e || !this.target) return;
        const j = mainReaction(this.target);
        if (j == null) { el.innerHTML = '<p class="lu-card-rate">—</p>'; this._keys = ''; return; }
        const R = e.reactions[j], f = e.factors(j), cap = e.capacity(j), act = e.state.activity[j], pulse = e.pulseNow(j), v = f.v;
        const held = Cell.held && [].concat(Cell.held).includes(this.target);
        const lead = [['cap', 'capacity, mM/s', cap]];
        if (act < 1) lead.push(['act', '× switched off', act]);
        if (Math.abs(pulse - 1) > 0.02) lead.push(['pulse', held ? '× held' : pulse > 1 ? '× pulse' : '× inhibited', pulse]);
        const base = cap * act * pulse;
        let rows, rest = 1, conduct = false;
        if (f.law === 'leak') {
            // A conductance (the uncoupler, the leak): its rate is its conductance times what drives it, in mV
            conduct = true;
            rows = [['cap', 'conductance, mM/s', cap], ...lead.slice(1), ['drive', '× driving force', base > 0 ? Math.abs(v) / base : 0]];
        } else if (Number.isFinite(f.thermo) && f.sat > 0) {
            // What the listed factors don't account for is light (or damage)
            const listed = base * Math.abs(f.thermo) * f.sat * f.reg;
            rest = listed > 0 ? Math.abs(v) / listed : 1;
            rows = [...lead];
            if (Math.abs(rest - 1) > 0.02) rows.push(['rest', Math.abs(rest - e.env.light) < 0.03 ? '× light' : '× damage', rest]);
            rows.push(['thermo', '× thermodynamics', Math.abs(f.thermo)], ['sat', '× saturation', f.sat], ['reg', '× regulation', f.reg]);
        } else {
            // A substrate or product missing: ΔG is infinite and saturation zero, and only their product is finite
            rows = [...lead, ['reg', '× regulation', f.reg], ['ts', '× substrates and ΔG', base * f.reg > 0 ? Math.abs(v) / (base * f.reg) : 0]];
        }
        const keys = j + '|' + rows.map(r => r[0] + r[1]).join();
        const [kind, id] = String([].concat(this.target)[0]).split(':');
        if (keys !== this._keys) {
            this._keys = keys;
            const seg = kind === 'seg' && MapView.segs[id], ink = seg ? LINES[seg.line].ink : INK[id] || 'umber';
            el.innerHTML = `<p class="lu-card-name">${kind === 'mem' ? longName(id) : R.name}</p><p class="lu-card-rate"></p>`
                + `<div class="lu-budget" style="--ink: var(--ink-${ink})">`
                + rows.map(([k, label]) => `<span class="k" data-k="${k}">${label}</span><span class="b" data-b="${k}"><span></span><span class="cut"></span></span><span class="v" data-v="${k}"></span>`).join('')
                + `<span class="k tot">= rate</span><span class="b" data-b="rate"><span></span></span><span class="v tot" data-v="rate"></span></div><p class="lu-card-reg"></p>`;
        }
        const set = (sel, t) => { const n = el.querySelector(sel); if (n && n.textContent !== t) n.textContent = t; };
        const dG = Number.isFinite(f.dG) ? minus(f.dG.toFixed(1)) + ' kJ/mol' : f.dG > 0 ? '+∞' : '−∞';
        set('.lu-card-rate', [conduct ? '' : `ΔG ${dG}`, v < 0 ? 'backward' : ''].filter(Boolean).join(' · '));
        let prod = 1;
        for (const [k, , x] of rows) {
            const before = prod; if (k !== 'cap') prod *= x;
            const b = el.querySelector(`[data-b="${k}"]`), w = conduct ? 0 : logw(prod), wb = conduct ? 0 : logw(before);
            b.children[0].style.width = w + '%';
            b.children[1].style.left = w + '%'; b.children[1].style.width = Math.max(0, wb - w) + '%';
            const unit = conduct && k === 'cap' ? ' /mV' : conduct && k === 'drive' ? ' mV' : '';
            set(`[data-v="${k}"]`, (k === 'cap' || k === 'drive' ? fmt(x) : x >= 0.995 && x < 1.005 ? '1' : x >= 10 ? x.toFixed(0) : x.toFixed(2)) + unit);
        }
        el.querySelector('[data-b="rate"]').children[0].style.width = (conduct ? 0 : logw(Math.abs(v) / (cap || 1))) + '%';
        set('[data-v="rate"]', fmt(Math.abs(v)));
        // What regulation is made of: the two effectors holding it back most
        const eff = conduct || f.reg >= 0.95 ? [] : e.effectors(j).filter(x => x.f < 0.95).sort((a, b) => a.f - b.f).slice(0, 2);
        set('.lu-card-reg', eff.map(x => `${effectorName(x)} ×${x.f.toFixed(2)}`).join(' · '));
    },
};

export default Card;
