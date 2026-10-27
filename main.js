// Entry point — wires the cell, the scene and the legend, then runs one
// loop: the model clock (wall time slowed by the window's factor), the
// window's sampling, flux, particles, Fig. 2's 5 Hz samples, the draw, and
// the live caption.
//
// Lumen opens on a living frame: the cyanobacterium, already running, after
// a silent warm-up of its chemistry so the lines carry flux and the lumen
// holds protons from the first frame. Under reduced motion it opens on that
// frame held still, until the first interaction.
import { simState } from './src/state.js';
import { updateDashboard, factorText, chooseEnzyme, targetName } from './src/dashboard.js';
import Card, { mapPoint } from './src/card.js';
import Trace from './src/trace.js';
import Stroma from './src/stroma.js';
import { cacheDOMElements, bindEvents, drawSpecimenIcons } from './src/ui.js';
import { updateFlux, RUNNING } from './src/flux.js';
import { lineState } from './src/mapdraw.js';
import { LINES } from './src/maplayout.js';
import { Membrane } from './src/membrane.js';
import { MapView } from './src/map.js';
import Renderer from './src/renderer.js';
import Particles from './src/particles.js';
import { drawLadder } from './src/ladder.js';
import Cell from './src/cell.js';
import Win from './src/window.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dom = cacheDOMElements();
Renderer.init(dom.canvas, document.getElementById('map-canvas'));
// A click pulses what it hits and brings it to the card; Fig. 2 marks it
Renderer.onPulse = (target, sign, hold) => {
    const ok = Cell.pulse(target, sign, hold);
    const first0 = [].concat(target)[0];
    if (!ok && first0 && !first0.startsWith('line:') && !(Array.isArray(target) && target.length > 2)) chooseEnzyme(target);
    if (ok) {
        const hint = document.getElementById('lu-verb-hint');
        if (hint && !hint.hidden) { hint.hidden = true; try { localStorage.setItem('lumen.verb', 'used'); } catch { /* fine */ } }
        // a whole line (a loop's name) is marked by its line's name and leaves the card as it is
        const first = [].concat(target)[0], line = (Array.isArray(target) && target.length > 2) || first.startsWith('line:');
        const name = line && first.startsWith('seg:') ? LINES[MapView.segs[first.slice(4)].line].name : targetName(target);
        Trace.mark(`${name} ${hold ? 'held' : sign > 0 ? '×5' : '÷10'}`, 'v' + name + Trace.t);
        if (!line) chooseEnzyme(target);
    }
    return ok;
};
Renderer.onRelease = (target) => { Cell.release(target); Trace.mark(`${targetName(target)} let go`); updateDashboard(); };
Renderer.onFactors = (target) => factorText(target);
Renderer.onToggleLine = (line) => hooks.toggleLine && hooks.toggleLine(line);
// The pulse marks: a segment's or a complex's activity multiplier now (the largest of its reactions'), and whether it is held
const pulseOf = (target) => {
    const e = Cell.engine;
    if (!e) return null;
    let f = 1;
    for (const rid of Cell.targets(target)) { const p = e.pulseNow(e.rIndex[rid]); if (Math.abs(Math.log(p)) > Math.abs(Math.log(f))) f = p; }
    return { f, held: !!Cell.held && [].concat(Cell.held).includes(target) };
};
MapView.pulseOf = (id) => pulseOf('seg:' + id);
Membrane.pulseOf = (key) => pulseOf('mem:' + key);

let frozen = false;
const hooks = { onInteract: () => { frozen = false; } };
Renderer.onInteract = hooks.onInteract;
simState.autoPlay = !reduced;
try { if (localStorage.getItem('lumen.verb') === 'used') document.getElementById('lu-verb-hint').hidden = true; } catch { /* storage off: keep the hint */ }
bindEvents(dom, hooks);
hooks.applyOrganism('cyanobacterium', true);
Renderer.endWarm();
Particles.seed();
frozen = reduced;

new ResizeObserver(() => requestAnimationFrame(() => Renderer.resize())).observe(document.getElementById('sim-container'));
new MutationObserver(() => { Renderer.themeChanged(); updateDashboard(); drawSpecimenIcons(); Trace.dirty = true; })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ── Caption: one line, what the plate shows now ──
const setCaption = _colophon.caption(dom.caption, 400);
const fmt = (f) => f >= 10 ? f.toFixed(0) : f >= 1 ? f.toFixed(1) : f.toFixed(2);
function captionText() {
    const spec = Membrane.spec, e = Cell.engine;
    let busiest = null;
    for (const id of Object.keys(LINES)) {
        const st = lineState(id);
        if (st && st.on && (!busiest || st.flux > busiest.flux)) busiest = st;
    }
    // the drawn ATP synthase's turns a second: the model's rate at its centre, a third of a turn per ATP
    const mv = Math.round(e.dp()), turns = (Win.rate.ATPS || 0) / 3, back = turns < -0.005, light = e.env.light, o2 = e.env.o2;
    const tps = (x) => Math.abs(x) >= 0.1 ? Math.abs(x).toFixed(1) : Math.abs(x).toFixed(2);
    const lit = light <= 0 ? 'dark' : light < 0.95 ? `${Math.round(light * 100)}% sun` : 'light';
    const air = o2 <= 0 ? ', no O₂' : o2 < 0.95 ? `, ${Math.round(o2 * 100)}% O₂` : '';
    const state = frozen ? ', still' : simState.autoPlay ? '' : ', paused';
    const parts = [];
    parts.push(busiest && busiest.flux > RUNNING ? `${busiest.name} ${fmt(busiest.flux)} mM C/s` : 'no line running');
    parts.push(`Δp ${mv} mV`);
    if (Membrane.pos.atpSyn) parts.push(`ATP synthase ${Math.abs(turns) < 0.005 ? 'still' : (back ? 'back ' : '') + tps(turns) + ' turns/s'}`);
    // Past the window's cap a centre is drawn one turnover in w (window.js)
    const w = Object.values(Win.thin);
    const thin = w.length ? `; 1 in ${Math.max(...w)} turnovers drawn` : '';
    const name = Renderer.narrow ? spec.name.replace(/^(Cyanobacterial|Chloroplast|Mitochondrial|Anaerobe|Halophile|Composite) /, '') : spec.name;
    return `${name[0].toUpperCase() + name.slice(1)}, ${lit}${air}${state}; slowed ${Win.slow}×: ${parts.join(', ')}${thin}.`;
}

// ── Loop ──
let last = performance.now(), traceT = 0, dashT = 0, ready = false;
Promise.race([_loadTextFonts(), new Promise(r => setTimeout(r, 1500))]).then(() => { ready = true; Renderer.themeChanged(); drawSpecimenIcons(); Trace.draw(dom.trace); });

function frame(now) {
    // the first frame's timestamp can precede the clock read above it
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.1));
    last = now;
    if (!frozen) {
        simState.time += dt;
        // The model clock: the frame's wall time, slowed
        if (simState.autoPlay) { Cell.engine.advance(dt / Win.slow); Trace.tick(dt); traceT += dt; }
        Win.sample(simState.autoPlay ? dt : 0);
        updateFlux(dt);
        Renderer.update(dt);
        dashT += dt;
        if (dashT > 0.25) { dashT = 0; updateDashboard(); Stroma.focus = mapPoint(Card.target); }
    }
    if (ready) {
        Renderer.draw(frozen ? 0 : dt);
        setCaption(captionText());
        if (dom.legendVisible()) {
            if (dom.view() === 'ladder') {
                const note = drawLadder(dom.ladder);
                if (dom.ladderNote.textContent !== (note || '')) { dom.ladderNote.textContent = note || ''; dom.ladderNote.hidden = !note; }
            } else if (traceT >= 0.2 || Trace.dirty) { traceT = 0; Trace.dirty = false; Trace.draw(dom.trace); }
        }
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
