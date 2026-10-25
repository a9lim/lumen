// Entry point — wires the cell, the scene and the margin, then runs one
// loop: the model clock (wall time slowed by the window's factor), the
// window's sampling, flux, particles, 5 Hz sparkline samples, the draw, and
// the live caption.
//
// Lumen opens on a living frame: the cyanobacterium, already running, after
// a silent warm-up of its chemistry so the lines carry flux and the lumen
// holds protons from the first frame. Under reduced motion it opens on that
// frame held still, until the first interaction.
import { simState, histories, pushSample } from './src/state.js';
import { updateDashboard, poolShares, factorText } from './src/dashboard.js';
import { cacheDOMElements, bindEvents, drawSpecimenIcons } from './src/ui.js';
import { updateFlux, RUNNING } from './src/flux.js';
import { lineState } from './src/mapdraw.js';
import { LINES } from './src/maplayout.js';
import { Membrane } from './src/membrane.js';
import Renderer from './src/renderer.js';
import Particles from './src/particles.js';
import { drawLadder } from './src/ladder.js';
import Cell from './src/cell.js';
import Win from './src/window.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dom = cacheDOMElements();
Renderer.init(dom.canvas);
Renderer.onPulse = (target, sign, hold) => {
    const ok = Cell.pulse(target, sign, hold);
    // a hold shows its comparison in the inspector
    if (ok && hold) { const t = [].concat(target)[0]; if ([...dom.enzymeSelect.options].some(o => o.value === t)) dom.enzymeSelect.value = t; updateDashboard(); }
    return ok;
};
Renderer.onRelease = (target) => Cell.release(target);
Renderer.onFactors = (target) => factorText(target);

let frozen = false;
const hooks = { onInteract: () => { frozen = false; } };
Renderer.onInteract = hooks.onInteract;
simState.autoPlay = !reduced;
bindEvents(dom, hooks);
hooks.applyOrganism('cyanobacterium', true);
Renderer.endWarm();
Particles.seed();
frozen = reduced;

function sample() {
    const sh = poolShares();
    pushSample(histories.atp, sh.atp);
    pushSample(histories.nadh, sh.nadh);
    pushSample(histories.nadph, sh.nadph);
    pushSample(histories.gradient, Math.min(1, Cell.engine.dp() / 250));
}

new ResizeObserver(() => requestAnimationFrame(() => Renderer.resize())).observe(document.getElementById('sim-container'));
new MutationObserver(() => { Renderer.themeChanged(); updateDashboard(); drawSpecimenIcons(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ── Caption ──
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
    const lit = light <= 0 ? 'in the dark' : light < 0.95 ? `in ${Math.round(light * 100)}% sun` : 'in the light';
    if (Renderer.narrow) {
        return `${spec.name}, ${light > 0 ? 'light' : 'dark'}${o2 > 0 ? '' : ', no O₂'}${frozen ? ', still' : simState.autoPlay ? '' : ', paused'}; slowed ${Win.slow}×. `
            + (busiest && busiest.flux > RUNNING ? `${busiest.name} ${fmt(busiest.flux)} mM C/s. ` : '')
            + `Δp ${mv} mV` + (Membrane.pos.atpSyn ? `; ATP synthase ${back ? 'back ' : ''}${tps(turns)} turns/s.` : '.')
            + (Object.keys(Win.thin).length ? ` 1 in ${Math.max(...Object.values(Win.thin))} turnovers drawn.` : '');
    }
    let s = `${spec.name} ${lit}${o2 > 0 ? (o2 < 0.95 ? `, ${Math.round(o2 * 100)}% of air's oxygen` : '') : ', without oxygen'}${frozen ? ', held still' : simState.autoPlay ? '' : ', paused'}, its chemistry slowed ${Win.slow}×: ${spec.say}. `;
    s += busiest && busiest.flux > RUNNING ? `${busiest.name} carries the most carbon, ${fmt(busiest.flux)} mM of it a second. ` : 'No line is running. ';
    s += `Δp ${mv} mV, a proton drawn for every 2`;
    s += Membrane.pos.atpSyn ? `; this ATP synthase turns ${Math.abs(turns) < 0.005 ? 'not at all' : (back ? 'backward ' : '') + tps(turns) + ' times a second'}.` : '.';
    // Past the window's cap a centre is drawn one turnover in w (window.js)
    const thin = Object.entries(Win.thin).sort((a, b) => b[1] - a[1])[0];
    if (thin) { const n = spec.names[thin[0]] || thin[0]; s += ` ${n[0].toUpperCase() + n.slice(1)} turns over too fast to draw each time: one turnover in ${thin[1]} is shown.`; }
    return s;
}

// ── Loop ──
const ladder = document.getElementById('lu-ladder'), ladderNote = document.getElementById('lu-ladder-note');
let last = performance.now(), sparkT = 0, dashT = 0, ready = false;
Promise.race([_loadTextFonts(), new Promise(r => setTimeout(r, 1500))]).then(() => { ready = true; Renderer.themeChanged(); drawSpecimenIcons(); });

function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!frozen) {
        simState.time += dt;
        // The model clock: the frame's wall time, slowed
        if (simState.autoPlay) Cell.engine.advance(dt / Win.slow);
        Win.sample(simState.autoPlay ? dt : 0);
        updateFlux(dt);
        Renderer.update(dt);
        sparkT += dt; dashT += dt;
        if (sparkT > 0.2) { sparkT = 0; sample(); }
        if (dashT > 0.25) { dashT = 0; updateDashboard(); }
    }
    if (ready) {
        Renderer.draw(frozen ? 0 : dt);
        setCaption(captionText());
        if (dom.statsVisible()) {
            const note = drawLadder(ladder);
            if (ladderNote.textContent !== (note || '')) { ladderNote.textContent = note || ''; ladderNote.hidden = !note; }
        }
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
