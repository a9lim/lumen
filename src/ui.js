// UI wiring — the colophon, the legend (the specimens, the conditions
// sentence, the knockouts, feeding, Fig. 2's views), organism presets and
// their cells and specimens, keyboard shortcuts, the about panel, info tips
// and the reference overlay.
import { simState } from './state.js';
import { updateTheme, cycleTheme, systemTheme } from './theme.js';
import { initDashboard, updateDashboard, fillInspector, targetName } from './dashboard.js';
import { resetFlux } from './flux.js';
import Renderer from './renderer.js';
import Particles from './particles.js';
import Stroma from './stroma.js';
import { MapView } from './map.js';
import { ORGANISMS } from './organisms.js';
import { SPECIMEN_OF } from './specimens.js';
import { REFERENCE } from './reference.js';
import { drawLocator } from './locator.js';
import { LINE_REACTIONS } from './mapbind.js';
import Cell from './cell.js';
import Legend from './legend.js';
import Trace from './trace.js';
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
        sentence: $('lu-sentence'), dialBox: $('lu-dialbox'),
        glycToggle: $('glyc-toggle'), pppToggle: $('ppp-toggle'), calvinToggle: $('calvin-toggle'),
        krebsToggle: $('krebs-toggle'), betaoxToggle: $('betaox-toggle'),
        resetBtn: $('reset-btn'), addGlucoseBtn: $('add-glucose-btn'), addFattyAcidBtn: $('add-fatty-acid-btn'), feed: $('lu-feed'),
        themeBtn: $('theme-btn'), menuBtn: $('menu-btn'), closeLegend: $('close-legend'), legend: $('legend'),
        modeBtn: $('mode-btn'),
        organismGroup: $('organism-group'), organismDesc: $('organism-desc'), specName: $('spec-name'), specCut: $('spec-cut'),
        yieldNote: $('lu-yield'), readings: $('lu-readings'), trace: $('lu-trace'), ladder: $('lu-ladder'), ladderNote: $('lu-ladder-note'),
        card: $('lu-card'), enzymeSelect: $('lu-enzyme'), enzymePulse: $('lu-enzyme-pulse'), enzymeInhibit: $('lu-enzyme-inhibit'), enzymeHold: $('lu-enzyme-hold'), enzymeControl: $('lu-enzyme-control'),
        legendVisible: () => Renderer.folio || !document.body.classList.contains('lu-closed'),
        view: () => document.querySelector('.lu-views [aria-pressed="true"]')?.dataset.view || 'trace',
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

/** Open or close the legend (a bottom sheet on phones). */
function setMargin(dom, open) {
    document.body.classList.toggle('lu-closed', !open);
    dom.menuBtn.setAttribute('aria-expanded', String(open));
}

const LINE_NAME = { glycolysis: 'glycolysis', ppp: 'pentose phosphate pathway', calvin: 'Calvin cycle', krebs: 'Krebs cycle', betaox: 'β-oxidation' };
// What the cut shows, after the specimen's name
const CUT = { thylakoid: 'a thylakoid, cut through', chloroplast: 'a thylakoid where it meets a granum', cristae: 'a crista, cut through',
    plasma: 'its plasma membrane, under the wall', purple: 'its purple membrane', composite: 'every complex on one membrane' };
// The enzyme the card opens on: something each specimen shows well
const FIRST = { cyanobacterium: 'mem:cytb6f', plantChloroplast: 'mem:cytb6f', animalCell: 'seg:g2', obligateAnaerobe: 'seg:g2', archaeon: 'mem:atpSyn', custom: 'mem:atpSyn' };

export function bindEvents(dom, hooks) {
    const touched = () => hooks.onInteract && hooks.onInteract();
    const mark = (label, key) => Trace.mark(label, key);
    initDashboard(dom, (t, what) => mark(`${targetName(t)} ${{ pulse: '×5', inhibit: '÷10', hold: 'held', release: 'let go' }[what]}`));
    const pathwayRows = { glycolysis: dom.glycToggle, ppp: dom.pppToggle, calvin: dom.calvinToggle, krebs: dom.krebsToggle, betaox: dom.betaoxToggle };

    /** Show the cell's own state in the legend: its conditions, its knockouts, what it can be fed. */
    const syncLegend = () => {
        const org = ORGANISMS[simState.activeOrganism];
        for (const [pw, t] of Object.entries(pathwayRows)) {
            const present = LINE_REACTIONS[pw].some(Cell.has);
            const reason = present ? '' : (org && org.lockedReason?.[pw]) || `This cell has no ${LINE_NAME[pw]}`;
            t.checked = present && Cell.lines[pw]; t.disabled = !present;
            simState.lockedPathways[pw] = present ? undefined : reason;
        }
        Legend.sync();
        // Feed only what the cell can take up
        const glc = Cell.has('EX_glc'), fa = Cell.has('EX_fa');
        dom.addGlucoseBtn.hidden = !glc; dom.addFattyAcidBtn.hidden = !fa;
        dom.feed.querySelector('.lu-sep').hidden = !(glc && fa); dom.feed.hidden = !(glc || fa);
    };
    hooks.syncLegend = syncLegend;

    /** Refill the scene's picture for the cell now under the microscope. */
    const refresh = (fresh) => {
        MapView.applyCell({ seg: Cell.seg, has: Cell.has, plastid: simState.specimen === 'chloroplast' });
        Renderer.cellChanged();
        resetFlux();
        if (fresh) Trace.reset();
        // a representative instant, as at boot: protons at the gradient, electrons and photons in transit
        Particles.clear(); Stroma.fill(); Particles.fill(); Particles.seed();
        fillInspector(fresh ? FIRST[simState.activeOrganism] : null); syncLegend(); updateDashboard();
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
        simState.uncouplingEnabled = false;
        Cell.use(key, spec);
        dom.specName.textContent = key === 'custom' ? 'Custom' : ORGANISMS[key].name.replace(/ Cell$/, ' cell').replace(/ (Anaerobe|Chloroplast)$/, (m) => m.toLowerCase());
        dom.specCut.textContent = '· ' + CUT[spec];
        dom.organismDesc.textContent = key === 'custom' ? 'Every pathway and every complex on one membrane: a composite, not an organism.' : ORGANISMS[key].desc + '.';
        Legend.build();
        refresh(true);
        if (!quiet) _buzz('medium');
    };
    hooks.applyOrganism = applyOrganism;
    // The icons draw at their laid-out size, so again whenever the legend opens or resizes
    new ResizeObserver(() => drawSpecimenIcons()).observe(dom.organismGroup);
    dom.organismGroup.addEventListener('click', (e) => {
        const b = e.target.closest('[data-org]');
        if (b && b.getAttribute('aria-checked') !== 'true') { touched(); applyOrganism(b.dataset.org); }
    });
    dom.organismGroup.addEventListener('keydown', (e) => {
        const bs = [...dom.organismGroup.querySelectorAll('[data-org]')], i = bs.indexOf(document.activeElement);
        const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!d || i < 0) return;
        e.preventDefault(); const n = bs[(i + d + bs.length) % bs.length]; n.focus(); n.click();
    });

    // ── The conditions sentence ──
    Legend.init(dom.sentence, dom.dialBox, (k, v, label) => {
        touched();
        if (k === 'light') updateTheme(dom.themeBtn);
        if (k === 'slow') showToast('Chemistry slowed ' + v + '×');
        else mark(label, k);
    });

    // ── Knockouts: a line's switch takes out its enzymes; the plate's key is their face ──
    const setLine = (pw, on) => {
        const t = pathwayRows[pw];
        if (!t || t.disabled) return;
        t.checked = on; Cell.setLine(pw, on); touched();
        mark(`${LINE_NAME[pw]} ${on ? 'on' : 'off'}`, 'line' + pw);
    };
    for (const [pw, t] of Object.entries(pathwayRows)) t.addEventListener('change', () => setLine(pw, t.checked));
    const flip = (pw) => { const t = pathwayRows[pw]; if (t && !t.disabled) setLine(pw, !t.checked); };
    hooks.toggleLine = flip;

    // ── Taps pulse or inhibit ──
    const syncMode = () => {
        dom.modeBtn.textContent = inhibitMode ? 'taps inhibit' : 'taps pulse';
        dom.modeBtn.setAttribute('aria-pressed', String(inhibitMode));
        dom.modeBtn.setAttribute('aria-label', inhibitMode ? 'Taps inhibit' : 'Taps pulse');
        dom.modeBtn.title = (inhibitMode ? 'Taps inhibit' : 'Taps pulse') + ' (X)';
    };
    dom.modeBtn.addEventListener('click', () => { inhibitMode = !inhibitMode; syncMode(); });
    syncMode();

    // ── Reset and feed ──
    dom.resetBtn.addEventListener('click', () => {
        touched(); Cell.reset(simState.specimen); refresh(false); mark('reset'); _buzz('warning');
    });
    const feed = (id, mM, name) => {
        touched();
        if (!Cell.has(id === 'glc__D' ? 'EX_glc' : 'EX_fa')) { showToast(`This cell takes up no ${name}`); return; }
        Cell.engine.feed(id, mM); mark('+ ' + name, 'feed' + id + Trace.t); showToast(`+${mM} mM ${name} in the medium`); _buzz('light');
    };
    const addGlucose = () => feed('glc__D', 5, 'glucose');
    const addFat = () => feed('hdca', 0.2, 'palmitate');
    dom.addGlucoseBtn.addEventListener('click', addGlucose);
    dom.addFattyAcidBtn.addEventListener('click', addFat);

    // ── Fig. 2: the trace, or the ladder ──
    const views = [...document.querySelectorAll('.lu-views [data-view]')];
    const setView = (v) => {
        for (const b of views) b.setAttribute('aria-pressed', String(b.dataset.view === v));
        for (const p of document.querySelectorAll('.lu-view')) p.hidden = p.dataset.view !== v;
        document.getElementById('fig2-title').textContent = v === 'ladder' ? 'Electrons, by redox potential' : 'The last two minutes';
    };
    for (const b of views) b.addEventListener('click', () => setView(b.dataset.view));

    // ── The legend ──
    setMargin(dom, !_isPhone());
    dom.menuBtn.addEventListener('click', () => setMargin(dom, document.body.classList.contains('lu-closed')));
    dom.closeLegend.addEventListener('click', () => setMargin(dom, false));
    const toggleMargin = (force) => setMargin(dom, force === false ? false : document.body.classList.contains('lu-closed'));

    // ── Keyboard ──
    const zoomAt = (f) => Renderer.camera.zoomBy(f, Renderer.W / 2, Renderer.H / 2);
    const shortcuts = [
        { key: 'Space', label: 'Play or pause', group: 'Simulation', action: () => document.querySelector('[data-colophon="play"]')?.click() },
        { key: ',', label: 'Faster chemistry', group: 'Simulation', action: () => Legend.stepSlow(-1) },
        { key: '.', label: 'Slower chemistry', group: 'Simulation', action: () => Legend.stepSlow(1) },
        { key: 'R', label: 'Reset', group: 'Simulation', action: () => dom.resetBtn.click() },
        { key: 'G', label: 'Add glucose', group: 'Simulation', action: addGlucose },
        { key: 'F', label: 'Add fatty acid', group: 'Simulation', action: addFat },
        { key: 'X', label: 'Taps pulse or inhibit', group: 'Simulation', action: () => dom.modeBtn.click() },
        { key: 'L', label: 'Light off or on', group: 'Conditions', action: () => Legend.flip('light') },
        { key: 'O', label: 'Oxygen off or on', group: 'Conditions', action: () => Legend.flip('o2') },
        { key: 'U', label: 'Uncoupler', group: 'Conditions', action: () => Legend.flip('ucp') },
        { key: '1', label: 'Knock out glycolysis', group: 'Lines', action: () => flip('glycolysis') },
        { key: '2', label: 'Knock out the pentose phosphate pathway', group: 'Lines', action: () => flip('ppp') },
        { key: '3', label: 'Knock out the Calvin cycle', group: 'Lines', action: () => flip('calvin') },
        { key: '4', label: 'Knock out the Krebs cycle', group: 'Lines', action: () => flip('krebs') },
        { key: '5', label: 'Knock out β-oxidation', group: 'Lines', action: () => flip('betaox') },
        { key: 'V', label: 'Fig. 2: trace or ladder', group: 'View', action: () => setView(dom.view() === 'trace' ? 'ladder' : 'trace') },
        { key: 'T', label: 'Cycle theme', group: 'View', action: () => cycleTheme(dom.themeBtn) },
        { key: 'S', label: 'Show or hide the legend', group: 'View', action: () => toggleMargin() },
        { key: 'Escape', label: 'Close the legend', group: 'View', action: () => { if (Legend.open) Legend.close(); else toggleMargin(false); } },
        { key: '=', label: 'Zoom in', group: 'View', action: () => zoomAt(1.25) },
        { key: '-', label: 'Zoom out', group: 'View', action: () => zoomAt(0.8) },
        { key: '0', label: 'Fit', group: 'View', action: () => Renderer.resetView() },
    ];
    initShortcuts(shortcuts, { helpTitle: 'Keyboard shortcuts' });

    // ── Colophon: play, theme, help ──
    const about = initAboutPanel({
        title: 'Lumen',
        lastUpdated: '2026-10-26',
        description: 'Explore how cells make energy. A membrane in cross-section sits above the cell’s carbon network, drawn as a transit map, and both run on one model of the cell’s chemistry, slowed so you can watch it. Each organism puts its own membrane under the microscope. Pulse an enzyme on the map or a complex in the membrane and watch where the push spreads and where it dies; change the light, the oxygen, the cell’s demand for ATP and its growth.',
        controls: [
            { label: 'Pulse an enzyme', value: 'Click it on the map or in the membrane' },
            { label: 'Inhibit it', value: 'Right-click (or X on touch)' },
            { label: 'Hold it 10% up', value: 'Press and hold; the card compares it' },
            { label: 'A whole line', value: 'Click a loop’s name' },
            { label: 'Knock out a line', value: 'Click it in the plate’s key, or 1–5' },
            { label: 'Conditions', value: 'Drag a value in the legend’s sentence' },
            { label: 'Light, oxygen, uncoupler', value: 'L / O / U' },
            { label: 'Add substrate', value: 'Glucose (G) / fatty acid (F)' },
            { label: 'Play / pause', value: 'Space' },
            { label: 'Chemistry faster / slower', value: ', and .' },
            { label: 'Zoom / pan', value: '= / - / 0, scroll, drag' },
            { label: 'Legend', value: 'S; V turns Fig. 2 to the ladder' },
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
        conditions: { title: 'Conditions', body: 'What the cell lives in and what it is asked to do. Each dotted value is a control: drag it sideways, step it with the arrow keys, or click it for a dial. Light is a share of full sun and oxygen a share of air’s. ATP demand is the work the model doesn’t draw (ion pumps, motility, turnover); growth draws new cell’s precursors from the map, and a plastid exports triose phosphate instead. Slowing the chemistry changes how much of it a second shows, not the chemistry.' },
        inspector: { title: 'The enzyme', body: 'The last enzyme you clicked on the plate, or chose here. Its rate is its capacity times each factor the model puts on it: thermodynamics (1 − e^(ΔG/RT)), saturation with its substrates, and regulation, with light, a switch or a pulse where they act. Each bar is the rate so far on a log scale; the hatched part is what that factor took away. Hold raises its activity 10% and keeps it there while two copies of the cell, one held and one not, run to a steady state; each flux’s response is the enzyme’s control coefficient over it (Kacser & Burns 1973).' },
        trace: { title: 'Fig. 2', body: 'The last two minutes of the cell, sampled while the chemistry runs: Δp, the share of the adenylates that is ATP, the reduced share of the cell’s main carrier, and its headline flux. Each arrow is something you did. The ladder view stands every carrier of the chain at its midpoint potential, with each electron now in flight as a bead on it.' },
    });
    const openReference = initReferenceOverlay(document.getElementById('reference-overlay'), document.getElementById('reference-title'),
        document.getElementById('reference-body'), document.getElementById('reference-close'), REFERENCE);
    bindReferenceTriggers(openReference);
    for (const b of document.querySelectorAll('[data-ref]')) b.addEventListener('click', () => openReference(b.dataset.ref));
    setMobileHint('lu-verb-hint', 'Tap an enzyme or a complex to pulse it and bring it here; “taps” under the plate makes taps inhibit. Long-press holds it 10% up and compares; pinch to zoom.');
}
