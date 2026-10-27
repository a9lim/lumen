// Entry point — wires the cell, the scene and the legend, then runs one
// loop: the model clock (wall time at the clock's speed), the window's
// sampling, flux, particles, Fig. 2's 5 Hz samples, the draw, and the live
// caption.
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
import { updateFlux } from './src/flux.js';
import { LINES } from './src/maplayout.js';
import { Membrane } from './src/membrane.js';
import { MapView } from './src/map.js';
import Renderer from './src/renderer.js';
import Particles from './src/particles.js';
import { drawLadder } from './src/ladder.js';
import Cell from './src/cell.js';
import Win from './src/window.js';
import { clockText } from './src/legend.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dom = cacheDOMElements();
Renderer.init(dom.canvas, document.getElementById('map-canvas'));
// A click pulses what it hits and brings it to the card; Fig. 2 marks it
Renderer.onPulse = (target, sign, hold) => {
    const ok = Cell.pulse(target, sign, hold);
    const first0 = [].concat(target)[0];
    if (!ok && first0 && !first0.startsWith('line:') && !(Array.isArray(target) && target.length > 2)) chooseEnzyme(target);
    if (ok) {
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
bindEvents(dom, hooks);
hooks.applyOrganism('cyanobacterium', true);
Renderer.endWarm();
Particles.seed();
frozen = reduced;

new ResizeObserver(() => requestAnimationFrame(() => Renderer.resize())).observe(document.getElementById('sim-container'));
new MutationObserver(() => { Renderer.themeChanged(); updateDashboard(); drawSpecimenIcons(); Trace.dirty = true; })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ── Caption: one line, the plate's live values (the specimen is panel a's title, the conditions are the legend's, each line's flux is the key's) ──
const setCaption = _colophon.caption(dom.caption, 400);
function captionText() {
    // the drawn ATP synthase's turns a second (negative backward): the model's rate at its centre, a third of a turn per ATP
    const turns = (Win.rate.ATPS || 0) / 3, a = Math.abs(turns);
    const parts = [`Δp ${Math.round(Cell.engine.dp())} mV`];
    if (Membrane.pos.atpSyn) parts.push(`ATP synthase ${a < 0.005 ? '0' : (turns < 0 ? '−' : '') + (a >= 100 ? Math.round(a).toLocaleString('en') : a >= 0.1 ? a.toFixed(1) : a.toFixed(2))} turns/s`);
    // Past the window's cap a centre is drawn one turnover in w (window.js)
    const w = Object.values(Win.thin);
    if (w.length) parts.push(`1 in ${Math.max(...w).toLocaleString('en')} turnovers drawn`);
    // Where the chemistry can't keep up with the clock, the speed it is running at
    const pace = kept * Win.speed;
    if (kept < 0.8) parts.push(`clock ${clockText(pace >= 1 ? Math.round(pace) : pace)}`);
    // each pair kept on one line, broken only after a ·
    return parts.map((p) => p.replace(/ /g, '\u00a0')).join(' · ');
}

// ── Loop ──
// The chemistry gets ENGINE_MS of each frame; what it can't reach in that is dropped, and kept (the share
// of the clock's model time it reached, smoothed over KEPT_TAU) says how fast the clock really runs
const ENGINE_MS = 8, KEPT_TAU = 1;
let last = performance.now(), traceT = 0, dashT = 0, ready = false, kept = 1;
Promise.race([_loadTextFonts(), new Promise(r => setTimeout(r, 1500))]).then(() => { ready = true; Renderer.themeChanged(); drawSpecimenIcons(); Trace.draw(dom.trace); });

function frame(now) {
    // the first frame's timestamp can precede the clock read above it
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.1));
    last = now;
    if (!frozen) {
        simState.time += dt;
        // The model clock: the frame's wall time at the clock's speed, as far as the chemistry gets
        if (simState.autoPlay && dt > 0) {
            const want = dt * Win.speed, got = want - Cell.engine.advance(want, ENGINE_MS);
            kept += (got / want - kept) * Math.min(1, dt / KEPT_TAU);
            Trace.tick(dt); traceT += dt;
        }
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
            if (dom.view() === 'ladder') drawLadder(dom.ladder);
            else if (traceT >= 0.2 || Trace.dirty) { traceT = 0; Trace.dirty = false; Trace.draw(dom.trace); }
        }
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
