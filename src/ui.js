// UI wiring — the colophon, the margin (specimen, lines, conditions, dials,
// feed), organism presets and their cells and specimens, keyboard shortcuts,
// the about panel, info tips and the reference overlay.
import { simState, clearHistories } from './state.js';
import { updateTheme, cycleTheme, systemTheme } from './theme.js';
import { initDashboard, updateDashboard, fillInspector } from './dashboard.js';
import { resetFlux } from './flux.js';
import Renderer from './renderer.js';
import Particles from './particles.js';
import Stroma from './stroma.js';
import { MapView } from './map.js';
import { ORGANISMS } from './organisms.js';
import { SPECIMENS, SPECIMEN_OF } from './specimens.js';
import { REFERENCE } from './reference.js';
import { drawLocator } from './locator.js';
import { LINE_REACTIONS } from './mapbind.js';
import Cell, { SLOWDOWNS } from './cell.js';
import Win from './window.js';
import * as K from './complexes.js';

const _isPhone = () => window.matchMedia('(max-width: 760px)').matches;
const _buzz = (k) => { if (typeof _haptics !== 'undefined') _haptics.trigger(k); };

let inhibitMode = false;
window._lumenReverseMode = () => inhibitMode;

/** The DOM cache. Only IDs matter. */
export function cacheDOMElements() {
    const $ = (id) => document.getElementById(id);
    return {
        canvas: $('sim-canvas'), caption: $('lu-caption'),
        lightToggle: $('light-toggle'), oxygenToggle: $('oxygen-toggle'), uncouplingToggle: $('uncoupling-toggle'),
        lightDial: $('light-dial'), lightVal: $('light-val'), o2Dial: $('o2-dial'), o2Val: $('o2-val'),
        atpDial: $('atp-dial'), atpVal: $('atp-val'), growthDial: $('growth-dial'), growthVal: $('growth-val'), growthName: $('growth-name'),
        glycToggle: $('glyc-toggle'), pppToggle: $('ppp-toggle'), calvinToggle: $('calvin-toggle'),
        krebsToggle: $('krebs-toggle'), betaoxToggle: $('betaox-toggle'),
        resetBtn: $('reset-btn'), addGlucoseBtn: $('add-glucose-btn'), addFattyAcidBtn: $('add-fatty-acid-btn'),
        themeBtn: $('theme-btn'), menuBtn: $('menu-btn'), closeStats: $('close-stats'), dashboard: $('dashboard'),
        modeBtn: $('mode-btn'), speedUp: $('speed-up'), speedDown: $('speed-down'), speedVal: $('speed-val'),
        organismGroup: $('organism-group'), organismDesc: $('organism-desc'),
        protonsLeaked: $('protons-leaked'), protonMv: $('proton-mv'), psiMv: $('psi-mv'), phMv: $('ph-mv'), atpMv: $('atp-mv'), yieldNote: $('lu-yield'),
        atpBar: $('atp-bar'), atpRatio: $('atp-ratio'), nadhBar: $('nadh-bar'), nadhRatio: $('nadh-ratio'),
        nadphBar: $('nadph-bar'), nadphRatio: $('nadph-ratio'), poolsWhere: $('pools-where'),
        co2Net: $('co2-net'), o2Net: $('o2-net'), glcNet: $('glc-net'), growthNet: $('growth-net'),
        atpSubstrate: $('atp-substrate'), atpOxidative: $('atp-oxidative'), atpSourceSub: $('atp-source-sub'), atpSourceOx: $('atp-source-ox'),
        superoxide: $('superoxide'), peroxide: $('peroxide'), rosMade: $('ros-made'),
        healthBar: $('health-bar'), healthRatio: $('health-ratio'),
        enzymeSelect: $('lu-enzyme'), enzymeFactors: $('lu-enzyme-factors'), enzymePulse: $('lu-enzyme-pulse'), enzymeInhibit: $('lu-enzyme-inhibit'), enzymeHold: $('lu-enzyme-hold'), enzymeControl: $('lu-enzyme-control'),
        statsVisible: () => document.getElementById('tab-stats').classList.contains('active') && !document.body.classList.contains('lu-closed'),
    };
}

/** Put the specimen's membrane under the microscope. */
function setSpecimen(id) {
    simState.specimen = id;
    Renderer.setSpecimen(id);
}

/** The specimen icons: each one's locator drawing, the chosen one in its inks and the rest in grey. */
export function drawSpecimenIcons() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const b of document.querySelectorAll('#organism-group [data-org]')) {
        const cv = b.querySelector('.lu-spec-icon'); if (!cv) continue;
        const w = cv.offsetWidth, h = cv.offsetHeight; if (!w) continue;
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
        const on = b.getAttribute('aria-checked') === 'true';
        drawLocator(c, 1, 1, w - 2, h - 2, SPECIMEN_OF[b.dataset.org], { caption: false, label: false, lw: 1, mono: on ? null : K.P.muted });
    }
}

/** Open or close the margin (a bottom sheet on phones). */
function setMargin(dom, open) {
    document.body.classList.toggle('lu-closed', !open);
    dom.menuBtn.setAttribute('aria-expanded', String(open));
}

const LINE_NAME = { glycolysis: 'glycolysis', ppp: 'pentose phosphate pathway', calvin: 'Calvin cycle', krebs: 'Krebs cycle', betaox: 'β-oxidation' };

export function bindEvents(dom, hooks) {
    initDashboard(dom);
    const touched = () => hooks.onInteract && hooks.onInteract();
    const pathwayRows = { glycolysis: dom.glycToggle, ppp: dom.pppToggle, calvin: dom.calvinToggle, krebs: dom.krebsToggle, betaox: dom.betaoxToggle };
    let lastLight = 1;

    /** Show the cell's own state in the margin: its lines, conditions and dials. */
    const syncMargin = () => {
        const e = Cell.engine, org = ORGANISMS[simState.activeOrganism];
        for (const [pw, t] of Object.entries(pathwayRows)) {
            const present = LINE_REACTIONS[pw].some(Cell.has);
            const reason = present ? '' : (org && org.lockedReason?.[pw]) || `This cell has no ${LINE_NAME[pw]}`;
            t.checked = present && Cell.lines[pw]; t.disabled = !present;
            t.closest('.lu-row').classList.toggle('locked', !present);
            t.closest('.lu-row').title = reason;
            simState.lockedPathways[pw] = present ? undefined : reason;
        }
        dom.lightToggle.checked = e.env.light > 0; dom.oxygenToggle.checked = e.env.o2 > 0;
        if (e.env.light > 0) lastLight = e.env.light;
        setDial(dom.lightDial, dom.lightVal, e.env.light, v => Math.round(v * 100) + '%');
        setDial(dom.o2Dial, dom.o2Val, e.env.o2, v => Math.round(v * 100) + '% air');
        setDial(dom.atpDial, dom.atpVal, e.dial.atp, v => v.toFixed(1) + ' mM/s');
        const exporter = Cell.has('TPT');
        dom.growthName.textContent = exporter ? 'Export to the cell' : 'Growth';
        dom.growthDial.max = exporter ? 2 : 0.3; dom.growthDial.step = exporter ? 0.05 : 0.01;
        setDial(dom.growthDial, dom.growthVal, exporter ? e.dial.export : e.dial.growth, v => exporter ? v.toFixed(2) + ' mM/s' : v.toFixed(2) + ' /h');
        dom.growthDial.disabled = !exporter && !Cell.has('BIOMASS');
        dom.growthDial.closest('.lu-dial').classList.toggle('locked', dom.growthDial.disabled);
        dom.addGlucoseBtn.disabled = !Cell.has('EX_glc'); dom.addFattyAcidBtn.disabled = !Cell.has('EX_fa');
    };
    const setDial = (el, out, v, fmt) => { el.value = v; el.dispatchEvent(new Event('input')); out.textContent = fmt(v); };

    /** Refill the scene's picture for the cell now under the microscope. */
    const refresh = () => {
        MapView.applyCell({ seg: Cell.seg, has: Cell.has, plastid: simState.specimen === 'chloroplast' });
        resetFlux(); clearHistories();
        Particles.clear(); Stroma.fill(); Particles.fill();
        fillInspector(); syncMargin(); updateDashboard();
    };

    // ── Organism presets: the cell, its switches and the specimen ──
    const applyOrganism = (key, quiet) => {
        for (const b of dom.organismGroup.querySelectorAll('[data-org]')) {
            const on = b.dataset.org === key;
            b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
        }
        const spec = SPECIMEN_OF[key];
        setSpecimen(spec);
        drawSpecimenIcons();
        simState.activeOrganism = key;
        simState.uncouplingEnabled = false; dom.uncouplingToggle.checked = false;
        Cell.use(key, spec);
        dom.organismDesc.textContent = key === 'custom' ? 'Every pathway and every complex on one membrane: a composite, not an organism' : ORGANISMS[key].desc;
        refresh();
        if (!quiet) _buzz('medium');
    };
    hooks.applyOrganism = applyOrganism;
    // The icons draw at their laid-out size, so again whenever the margin opens or resizes
    new ResizeObserver(() => drawSpecimenIcons()).observe(dom.organismGroup);
    dom.organismGroup.addEventListener('click', (e) => {
        const b = e.target.closest('[data-org]');
        if (b) { touched(); applyOrganism(b.dataset.org); }
    });
    dom.organismGroup.addEventListener('keydown', (e) => {
        const bs = [...dom.organismGroup.querySelectorAll('[data-org]')], i = bs.indexOf(document.activeElement);
        const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!d || i < 0) return;
        e.preventDefault(); const n = bs[(i + d + bs.length) % bs.length]; n.focus(); n.click();
    });

    // ── Switches: lines are knockouts; light and O₂ switch their dials between off and on ──
    for (const [pw, t] of Object.entries(pathwayRows)) _forms.bindToggle(t, v => { Cell.setLine(pw, v); touched(); });
    _forms.bindToggle(dom.lightToggle, v => { Cell.setEnv('light', v ? lastLight || 1 : 0); syncMargin(); updateTheme(dom.themeBtn); touched(); });
    _forms.bindToggle(dom.oxygenToggle, v => { Cell.setEnv('o2', v ? 1 : 0); syncMargin(); touched(); });
    _forms.bindToggle(dom.uncouplingToggle, v => { simState.uncouplingEnabled = v; Cell.applySwitches(); touched(); });
    const flip = (el) => { if (el.disabled) return; el.checked = !el.checked; el.dispatchEvent(new Event('change')); };

    // ── Dials ──
    _forms.bindSlider(dom.lightDial, dom.lightVal, v => { if (!Cell.engine || Cell.engine.env.light === v) return; Cell.setEnv('light', v); dom.lightToggle.checked = v > 0; if (v > 0) lastLight = v; updateTheme(dom.themeBtn); }, v => Math.round(v * 100) + '%');
    _forms.bindSlider(dom.o2Dial, dom.o2Val, v => { if (!Cell.engine || Cell.engine.env.o2 === v) return; Cell.setEnv('o2', v); dom.oxygenToggle.checked = v > 0; }, v => Math.round(v * 100) + '% air');
    _forms.bindSlider(dom.atpDial, dom.atpVal, v => { if (Cell.engine) Cell.setDial('atp', v); }, v => v.toFixed(1) + ' mM/s');
    _forms.bindSlider(dom.growthDial, dom.growthVal, v => { if (!Cell.engine) return; Cell.setDial(Cell.has('TPT') ? 'export' : 'growth', v); },
        v => Cell.has('TPT') ? v.toFixed(2) + ' mM/s' : v.toFixed(2) + ' /h');

    // ── Taps pulse or inhibit ──
    const syncMode = () => {
        dom.modeBtn.textContent = inhibitMode ? 'inhibit' : 'pulse';
        dom.modeBtn.setAttribute('aria-pressed', String(inhibitMode));
        dom.modeBtn.setAttribute('aria-label', inhibitMode ? 'Taps inhibit' : 'Taps pulse');
        dom.modeBtn.title = (inhibitMode ? 'Taps inhibit' : 'Taps pulse') + ' (X)';
    };
    dom.modeBtn.addEventListener('click', () => { inhibitMode = !inhibitMode; syncMode(); });
    syncMode();

    // ── The slowdown: how much slower than life the chemistry runs ──
    let slowIdx = SLOWDOWNS.indexOf(Win.slow);
    const setSlow = (d) => {
        slowIdx = Math.max(0, Math.min(SLOWDOWNS.length - 1, slowIdx + d));
        Win.slow = SLOWDOWNS[slowIdx];
        dom.speedVal.textContent = SLOWDOWNS[slowIdx] + '×';
        showToast('Chemistry slowed ' + SLOWDOWNS[slowIdx] + '×');
    };
    dom.speedVal.textContent = Win.slow + '×';
    dom.speedUp.addEventListener('click', () => setSlow(1));
    dom.speedDown.addEventListener('click', () => setSlow(-1));

    // ── Reset and feed ──
    dom.resetBtn.addEventListener('click', () => {
        touched(); Cell.reset(simState.specimen); refresh(); _buzz('warning');
    });
    const feed = (id, mM, name) => {
        touched();
        if (!Cell.has(id === 'glc__D' ? 'EX_glc' : 'EX_fa')) { showToast(`This cell takes up no ${name}`); return; }
        Cell.engine.feed(id, mM); showToast(`+${mM} mM ${name} in the medium`); _buzz('light');
    };
    const addGlucose = () => feed('glc__D', 5, 'glucose');
    const addFat = () => feed('hdca', 0.2, 'palmitate');
    dom.addGlucoseBtn.addEventListener('click', addGlucose);
    dom.addFattyAcidBtn.addEventListener('click', addFat);

    // ── Margin ──
    setMargin(dom, !_isPhone());
    dom.menuBtn.addEventListener('click', () => setMargin(dom, document.body.classList.contains('lu-closed')));
    dom.closeStats.addEventListener('click', () => setMargin(dom, false));
    const toggleMargin = (force) => setMargin(dom, force === false ? false : document.body.classList.contains('lu-closed'));

    // ── Keyboard ──
    const zoomAt = (f) => Renderer.camera.zoomBy(f, Renderer.W / 2, Renderer.H / 2);
    const shortcuts = [
        { key: 'Space', label: 'Play or pause', group: 'Simulation', action: () => document.querySelector('[data-colophon="play"]')?.click() },
        { key: ',', label: 'Slower chemistry', group: 'Simulation', action: () => setSlow(-1) },
        { key: '.', label: 'Faster chemistry', group: 'Simulation', action: () => setSlow(1) },
        { key: 'R', label: 'Reset', group: 'Simulation', action: () => dom.resetBtn.click() },
        { key: 'G', label: 'Add glucose', group: 'Simulation', action: addGlucose },
        { key: 'F', label: 'Add fatty acid', group: 'Simulation', action: addFat },
        { key: 'X', label: 'Taps pulse or inhibit', group: 'Simulation', action: () => dom.modeBtn.click() },
        { key: 'L', label: 'Toggle light', group: 'Conditions', action: () => flip(dom.lightToggle) },
        { key: 'O', label: 'Toggle oxygen', group: 'Conditions', action: () => flip(dom.oxygenToggle) },
        { key: 'U', label: 'Toggle uncoupling', group: 'Conditions', action: () => flip(dom.uncouplingToggle) },
        { key: '1', label: 'Toggle glycolysis', group: 'Lines', action: () => flip(dom.glycToggle) },
        { key: '2', label: 'Toggle pentose phosphate', group: 'Lines', action: () => flip(dom.pppToggle) },
        { key: '3', label: 'Toggle Calvin cycle', group: 'Lines', action: () => flip(dom.calvinToggle) },
        { key: '4', label: 'Toggle Krebs cycle', group: 'Lines', action: () => flip(dom.krebsToggle) },
        { key: '5', label: 'Toggle β-oxidation', group: 'Lines', action: () => flip(dom.betaoxToggle) },
        { key: 'T', label: 'Cycle theme', group: 'View', action: () => cycleTheme(dom.themeBtn) },
        { key: 'S', label: 'Toggle the margin', group: 'View', action: () => toggleMargin() },
        { key: 'Escape', label: 'Close the margin', group: 'View', action: () => toggleMargin(false) },
        { key: '[', label: 'Previous tab', group: 'View', action: () => cycleTab(-1) },
        { key: ']', label: 'Next tab', group: 'View', action: () => cycleTab(1) },
        { key: '=', label: 'Zoom in', group: 'View', action: () => zoomAt(1.25) },
        { key: '-', label: 'Zoom out', group: 'View', action: () => zoomAt(0.8) },
        { key: '0', label: 'Fit', group: 'View', action: () => Renderer.resetView() },
    ];
    initShortcuts(shortcuts, { helpTitle: 'Keyboard shortcuts' });

    // ── Colophon: play, theme, help ──
    const about = initAboutPanel({
        title: 'Lumen',
        lastUpdated: '2026-10-25',
        description: 'Explore how cells make energy. A membrane in cross-section sits above the cell’s carbon network, drawn as a transit map, and both run on one model of the cell’s chemistry, slowed so you can watch it. Each organism puts its own membrane under the microscope. Pulse an enzyme on the map or a complex in the membrane and watch where the push spreads and where it dies; change the light, the oxygen, the cell’s demand for ATP and its growth.',
        controls: [
            { label: 'Pulse an enzyme', value: 'Click it on the map or in the membrane' },
            { label: 'Inhibit it', value: 'Right-click (or X on touch)' },
            { label: 'Hold the pulse', value: 'Press and hold' },
            { label: 'A whole line', value: 'Click a loop’s name' },
            { label: 'Add substrate', value: 'Glucose (G) / fatty acid (F)' },
            { label: 'Knock out a line', value: 'Margin or keys 1–5' },
            { label: 'Conditions', value: 'Light (L) / oxygen (O) / uncoupling (U)' },
            { label: 'Play / pause', value: 'Space' },
            { label: 'Slow the chemistry', value: ', and .' },
            { label: 'Zoom / pan', value: '= / - / 0, scroll, drag' },
            { label: 'Margin', value: 'S, Esc, and [ / ] for tabs' },
        ],
        shortcuts: shortcuts,
        repo: 'https://github.com/a9lim/lumen',
    });
    const col = _colophon.mount({
        playing: simState.autoPlay,
        onPlay: () => { touched(); simState.autoPlay = !simState.autoPlay; return simState.autoPlay; },
        onHelp: () => about.show(),
        onTheme: (t) => systemTheme(t, dom.themeBtn),
    });
    hooks.setPlaying = (p) => col.setPlaying(p);
    dom.themeBtn.addEventListener('click', () => { cycleTheme(dom.themeBtn); _buzz('selection'); });
    updateTheme(dom.themeBtn);

    // ── Info tips and the reference overlay ──
    registerInfoTips({
        glycolysis: { title: 'Glycolysis', body: 'Splits glucose into 2 pyruvate, netting 2 ATP and 2 NADH. Its bypasses (G6Pase, FBPase, PC and PEPCK) run it back as gluconeogenesis. Switching a line off knocks out its enzymes.' },
        ppp: { title: 'Pentose phosphate pathway', body: 'Produces NADPH for biosynthesis and antioxidant defense, and the pentoses for nucleotides. Light switches it off in plastids and cyanobacteria.' },
        calvin: { title: 'Calvin cycle', body: 'Fixes CO₂ into sugar using ATP and NADPH from the light reactions; light switches its enzymes on. It runs back along the glycolysis corridor on its own track.' },
        krebs: { title: 'Krebs cycle (TCA)', body: 'Oxidizes acetyl-CoA to CO₂, producing NADH, GTP, and the quinol that succinate dehydrogenase hands straight to the chain. It stops when its NADH can’t be reoxidized.' },
        sunlight: { title: 'Sunlight', body: 'The light’s intensity, as a share of full sun. It drives the photosystems where the membrane has them, and bacteriorhodopsin in the archaeon.' },
        oxygen: { title: 'Ambient O₂', body: 'Oxygen in the medium, as a share of air. Without it the oxidase stops and fermentation (to lactate or to ethanol, as the organism has it) regenerates NAD⁺.' },
        engine: { title: 'The model', body: 'Each organism is a kinetic model: every reaction runs at its capacity times thermodynamics (1 − e^(ΔG/RT)), saturation and regulation, advanced in model time. The figure runs it slowed so it can be followed; slowing it changes how much chemistry a second shows, not the chemistry.' },
        demand: { title: 'Demand', body: 'ATP demand is the work the cell does that the model doesn’t draw: ion pumps, motility, turnover. Growth draws the precursors of new cell from the map, in E. coli’s core proportions; a plastid exports triose phosphate to its cell instead.' },
        protons: { title: 'Proton-motive force', body: 'Δp drives ATP synthase: four protons per ATP, twelve per turn. Each red dot in the lumen stands for 2 mV of it.' },
        ladder: { title: 'Electrons, by redox potential', body: 'Each carrier stands at its midpoint potential, more reducing at the top; each electron now moving in the membrane is a bead on it. Light lifts electrons at P680 and P700; respiration only falls, toward oxygen.' },
        betaox: { title: 'Beta oxidation', body: 'Breaks fatty acids into acetyl-CoA, two carbons a round, handing its electrons to NADH and the quinone pool. Fatty-acid synthesis is a separate pathway drawn running it backward: the only way the line runs in cyanobacteria and chloroplasts.' },
        uncoupling: { title: 'Uncoupling', body: 'Opens an uncoupling protein: protons leak back across the membrane, dissipating the gradient as heat, and the chain runs faster to keep up.' },
        oxStress: { title: 'Oxidative stress', body: 'Complex I and the Q-cycle leak electrons to O₂ as superoxide, more as Δp climbs. SOD, catalase and glutathione peroxidase (on NADPH) take it; what they miss peroxidises the membrane, which leaks protons and costs ATP to repair.' },
        inspector: { title: 'Inspect an enzyme', body: 'Its rate, and why: ΔG (thermodynamics: 1 − e^(ΔG/RT)), how saturated it is with its substrates, and how much its regulators hold it back. The rate is their product times its capacity. Hold raises its activity 10% and keeps it there. Two copies of the cell, one held and one not, then run to a steady state. Each flux’s response is the enzyme’s control coefficient over it: 1 means the flux follows the enzyme, 0 means it ignores it (Kacser & Burns 1973).' },
    });
    const openReference = initReferenceOverlay(document.getElementById('reference-overlay'), document.getElementById('reference-title'),
        document.getElementById('reference-body'), document.getElementById('reference-close'), REFERENCE);
    bindReferenceTriggers(openReference);
    setMobileHint('hint', 'Tap an enzyme or a complex to pulse it; X makes taps inhibit. Long-press for what it is and to hold it 10% up, compared in Stats; pinch to zoom.', '.panel-hint');
}
