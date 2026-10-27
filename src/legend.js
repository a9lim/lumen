// Legend — the conditions as label–value rows whose values are the controls:
// the light, the oxygen, ATP demand, growth (or a plastid's export), the
// uncoupler where the cell has one, and the slowdown. Drag a value sideways,
// step it with the arrow keys, or click it for a dial under the rows.
import Cell, { SLOWDOWNS } from './cell.js';
import Win from './window.js';
import { simState } from './state.js';

const pct = (v) => Math.round(v * 100);
const DRAG_PX = 7;   // px of drag per step
// The slowdown reads left to right as its number grows: 3× to 300×
const SLOW = [...SLOWDOWNS].sort((a, b) => a - b);

/** Each value: its range, how it reads, how it reads as a mark on Fig. 2, and its getter and setter. */
const FIELDS = {
    light: { name: 'Light', min: 0, max: 1, step: 0.05, get: (e) => e.env.light, set: (v) => Cell.setEnv('light', v),
        text: (v) => `${pct(v)}% sun`, mark: (v) => v <= 0 ? 'dark' : `light ${pct(v)}%` },
    o2: { name: 'Oxygen', min: 0, max: 1, step: 0.05, get: (e) => e.env.o2, set: (v) => Cell.setEnv('o2', v),
        text: (v) => `${pct(v)}% air`, mark: (v) => v <= 0 ? 'anoxia' : `O₂ ${pct(v)}%` },
    atp: { name: 'ATP demand', min: 0, max: 3, step: 0.1, get: (e) => e.dial.atp, set: (v) => Cell.setDial('atp', v),
        text: (v) => `${v.toFixed(1)} mM/s`, mark: (v) => `ATP demand ${v.toFixed(1)}` },
    growth: { name: 'Growth', min: 0, max: 0.3, step: 0.01, get: (e) => e.dial.growth, set: (v) => Cell.setDial('growth', v),
        text: (v) => `${v.toFixed(2)} /h`, mark: (v) => `growth ${v.toFixed(2)}` },
    export: { name: 'Export', min: 0, max: 2, step: 0.05, get: (e) => e.dial.export, set: (v) => Cell.setDial('export', v),
        text: (v) => `${v.toFixed(2)} mM/s`, mark: (v) => `export ${v.toFixed(2)}` },
    ucp: { name: 'Uncoupler', toggle: true, get: () => simState.uncouplingEnabled, set: (v) => { simState.uncouplingEnabled = v; Cell.applySwitches(); },
        text: (v) => v ? 'open' : 'shut', mark: (v) => v ? 'uncoupler' : 'uncoupler shut' },
    slow: { name: 'Slowdown', list: SLOW, get: () => Win.slow, set: (v) => { Win.slow = v; },
        text: (v) => `${v}×`, mark: (v) => `slowed ${v}×` },
};

const Legend = {
    el: null, dialBox: null, dial: null, dialName: null, dialVal: null,
    open: null,           // the field whose dial is showing
    onChange: null,       // (key, value, markText) after a change you made
    _last: { light: 1 },  // the light to return to when L switches it back on

    init(el, dialBox, onChange) {
        this.el = el; this.dialBox = dialBox; this.onChange = onChange;
        this.dial = dialBox.querySelector('input'); this.dialName = dialBox.querySelector('.lu-name'); this.dialVal = dialBox.querySelector('output');
        this.dial.addEventListener('input', () => {
            const F = FIELDS[this.open]; if (!F) return;
            this._apply(this.open, F.list ? F.list[+this.dial.value] : +this.dial.value);
        });
        this.dial.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const k = this.open; this.close(); this._span(k)?.focus(); e.stopPropagation(); } });
        document.addEventListener('pointerdown', (e) => { if (this.open && !this.el.contains(e.target) && !this.dialBox.contains(e.target)) this.close(); });
    },

    /** Write the rows for the cell now under the microscope: export instead of growth where it has TPT, the uncoupler where it has UCP. */
    build() {
        const has = Cell.has;
        const keys = ['light', 'o2', 'atp', has('TPT') ? 'export' : has('BIOMASS') ? 'growth' : null, has('UCP') ? 'ucp' : null, 'slow'].filter(Boolean);
        this.close();
        this.el.innerHTML = keys.map((k) => `<span class="lu-k">${FIELDS[k].name}</span><span><span class="lu-v${FIELDS[k].toggle ? ' tog' : ''}" data-k="${k}" tabindex="0" role="${FIELDS[k].toggle ? 'switch' : 'slider'}"></span></span>`).join('');
        for (const sp of this.el.querySelectorAll('.lu-v')) this._bind(sp);
        this.sync();
    },

    /** Show the values as they are now (a shortcut, a reset or a preset may have changed them). */
    sync() {
        const e = Cell.engine; if (!e || !this.el) return;
        if (e.env.light > 0) this._last.light = e.env.light;
        for (const sp of this.el.querySelectorAll('.lu-v')) this._paint(sp);
        if (this.open) this._fillDial(this.open);
    },

    /** L, O and U: light and oxygen between none and on, the uncoupler open or shut. */
    flip(k) {
        const e = Cell.engine; if (!e) return;
        if (k === 'light') this._apply('light', e.env.light > 0 ? 0 : this._last.light || 1);
        else if (k === 'o2') this._apply('o2', e.env.o2 > 0 ? 0 : 1);
        else if (k === 'ucp' && Cell.has('UCP')) this._apply('ucp', !simState.uncouplingEnabled);
    },
    /** , and . : the chemistry faster (−) or slower (+). */
    stepSlow(d) { const i = SLOW.indexOf(Win.slow); this._apply('slow', SLOW[Math.max(0, Math.min(SLOW.length - 1, i + d))]); },

    close() {
        if (!this.open) return;
        this._span(this.open)?.classList.remove('open');
        this.open = null; this.dialBox.hidden = true;
    },

    _span(k) { return this.el.querySelector(`.lu-v[data-k="${k}"]`); },
    _value(k) { return FIELDS[k].get(Cell.engine); },

    _paint(sp) {
        const k = sp.dataset.k, F = FIELDS[k], v = this._value(k);
        const t = F.text(v);
        if (sp.textContent !== t) sp.textContent = t;
        sp.setAttribute('aria-label', F.name);
        if (F.toggle) { sp.setAttribute('aria-checked', String(!!v)); return; }
        if (F.list) { sp.setAttribute('aria-valuemin', 0); sp.setAttribute('aria-valuemax', F.list.length - 1); sp.setAttribute('aria-valuenow', F.list.indexOf(v)); }
        else { sp.setAttribute('aria-valuemin', F.min); sp.setAttribute('aria-valuemax', F.max); sp.setAttribute('aria-valuenow', v); }
        sp.setAttribute('aria-valuetext', t);
    },

    /** Set a value, as you did: the model, its row, the dial, and a mark on Fig. 2. */
    _apply(k, v) {
        const F = FIELDS[k];
        if (F.toggle) v = !!v;
        else if (!F.list) v = +Math.max(F.min, Math.min(F.max, Math.round(v / F.step) * F.step)).toFixed(4);
        if (v === this._value(k)) return;
        F.set(v);
        if (k === 'light' && v > 0) this._last.light = v;
        const sp = this._span(k); if (sp) this._paint(sp);
        if (this.open === k) this._fillDial(k);
        this.onChange && this.onChange(k, v, F.mark(v));
    },
    _step(k, n) {
        const F = FIELDS[k], v = this._value(k);
        if (F.toggle) { this._apply(k, n > 0); return; }
        if (F.list) { const i = Math.max(0, Math.min(F.list.length - 1, F.list.indexOf(v) + n)); this._apply(k, F.list[i]); return; }
        this._apply(k, v + n * F.step);
    },

    _fillDial(k) {
        const F = FIELDS[k], v = this._value(k);
        this.dialName.textContent = F.name;
        if (F.list) { this.dial.min = 0; this.dial.max = F.list.length - 1; this.dial.step = 1; this.dial.value = F.list.indexOf(v); }
        else { this.dial.min = F.min; this.dial.max = F.max; this.dial.step = F.step; this.dial.value = v; }
        this.dialVal.textContent = F.text(v);
    },
    _toggleDial(k) {
        if (FIELDS[k].toggle) { this._step(k, this._value(k) ? -1 : 1); return; }
        if (this.open === k) { this.close(); return; }
        this.close();
        this.open = k; this._span(k)?.classList.add('open');
        this._fillDial(k); this.dialBox.hidden = false;
    },

    _bind(sp) {
        const k = sp.dataset.k;
        let x0 = 0, acc = 0, down = false, dragged = false;
        sp.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            down = true; dragged = false; x0 = e.clientX; acc = 0;
            sp.setPointerCapture(e.pointerId);
        });
        // a click (a press without a drag, or assistive technology's) toggles a switch or opens the dial
        sp.addEventListener('click', () => { if (dragged) { dragged = false; return; } this._toggleDial(k); });
        sp.addEventListener('pointermove', (e) => {
            if (!down) return;
            if (!dragged && Math.abs(e.clientX - x0) > 4) { dragged = true; sp.classList.add('drag'); acc = e.clientX - x0; }
            else if (dragged) acc += e.movementX;
            while (dragged && Math.abs(acc) >= DRAG_PX) { this._step(k, Math.sign(acc)); acc -= DRAG_PX * Math.sign(acc); }
        });
        const end = () => { if (!down) return; down = false; sp.classList.remove('drag'); };
        sp.addEventListener('pointerup', end);
        sp.addEventListener('pointercancel', () => { end(); dragged = false; });
        sp.addEventListener('keydown', (e) => {
            const n = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
            if (n) { this._step(k, n); e.preventDefault(); e.stopPropagation(); return; }
            const F = FIELDS[k];
            if (e.key === 'Home' && !F.toggle) { this._apply(k, F.list ? F.list[0] : F.min); e.preventDefault(); }
            else if (e.key === 'End' && !F.toggle) { this._apply(k, F.list ? F.list[F.list.length - 1] : F.max); e.preventDefault(); }
            else if (e.key === 'Enter' || e.key === ' ') { this._toggleDial(k); if (this.open === k) this.dial.focus(); e.preventDefault(); e.stopPropagation(); }
            else if (e.key === 'Escape' && this.open) { this.close(); e.stopPropagation(); }
        });
    },
};

export default Legend;
