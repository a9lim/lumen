// The engine along trajectories, headless: the integrator's guarantees
// (conservation, positivity, frame independence, accuracy), thermodynamics
// at work, and the archetypes' classic behaviours (VISION.md) whose failure
// wouldn't show on the plate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELLS } from '../src/engine/cells.js';
import { MOIETIES } from '../src/engine/species.js';
import { createEngine } from '../src/engine/engine.js';
import { runCompare, coefficients, HMAX } from '../src/compare.js';
import { RT } from '../src/engine/thermo.js';
import { makeRng } from '../src/engine/rng.js';

const cells = Object.keys(CELLS);
const run = (id, t, env) => { const e = createEngine(id, { env }); e.applyEnv(); e.advance(t); return e; };
const rate = (e, rid) => e.evaluate()[e.rIndex[rid]];
const ec = (e, c = 'c') => { const a = e.conc('atp', c), d = e.conc('adp', c), m = e.conc('amp', c); return (a + d / 2) / (a + d + m); };

// ─── The integrator ───

test('moieties hold and nothing goes negative along a trajectory, in every cell', () => {
    for (const id of cells) {
        const e = createEngine(id); e.applyEnv();
        const comps = Object.keys(e.model.comps).filter(c => c !== 'e');
        const before = {};
        for (const m of Object.keys(MOIETIES)) for (const c of comps) before[m + c] = e.moiety(m, c);
        e.advance(30);    // the picture, between steps
        for (const m of Object.keys(MOIETIES)) for (const c of comps) {
            const a = before[m + c], b = e.moiety(m, c);
            assert.ok(Math.abs(a - b) <= 1e-9 + 1e-7 * a, `${id}: ${m} in ${c} went ${a} → ${b}`);
        }
        // Δψ's charge and ΔpH's protons are signed: the membrane can be polarized either way
        for (let i = 0; i < e.x.length; i++) assert.ok(e.x[i] >= 0 || e.species[i].kind === 'charge' || e.species[i].key === 'h_l', `${id}: ${e.species[i].key} is ${e.x[i]}`);
    }
});

/** The integrator's steps are the same in a and b, and the pictures agree (their clocks differ only by rounding). */
function sameTrajectory(a, b) {
    assert.equal(a.integrator.t, b.integrator.t);
    for (let i = 0; i < a.x.length; i++) {
        assert.equal(a.integrator.x[i], b.integrator.x[i]);
        assert.ok(Math.abs(a.x[i] - b.x[i]) <= 1e-9 * (1 + Math.abs(a.x[i])), `${a.species[i].key}: ${a.x[i]} against ${b.x[i]}`);
    }
}

test('a trajectory is the same however the frames slice time, through a pulse', () => {
    const [a, b, c] = [0, 1, 2].map(() => run('cyanobacterium', 5));
    for (const e of [a, b, c]) e.pulse(e.rIndex.RBPC, 1);    // from outside, at the picture's time
    a.advance(45);
    for (let k = 0; k < 4500; k++) b.advance(0.01);
    const rng = makeRng(7); let t = 0;
    while (t < 45) { const dt = Math.min(45 - t, rng() * 0.5); c.advance(dt); t += dt; }
    sameTrajectory(a, b); sameTrajectory(a, c);
});

test('the clock gets there, or says by how much it fell short, and a change from outside happens at the picture', () => {
    const e = createEngine('cyanobacterium'); e.applyEnv();
    assert.equal(e.advance(3600), 0, 'an hour in one call');
    assert.equal(e.t, 3600);
    assert.ok(e.integrator.t > e.t && e.integrator.t - e.t <= 60, 'the integrator at most a step ahead of the picture');
    e.env.light = 0; e.applyEnv(); e.advance(0);
    assert.equal(e.integrator.t, e.t, 'brought back to the picture');
    // with no time to step, the picture waits where the integrator got to, and the rest is dropped, not owed
    const short = e.advance(600, 0);
    assert.ok(short > 0 && e.t === e.integrator.t && e.t + short === 4200, `short ${short} at ${e.t}`);
});

test('long steps agree with a tight integrator from light into the dark', () => {
    const [a, ref] = [createEngine('cyanobacterium'), createEngine('cyanobacterium', { hmax: 0.5, rtol: 2e-4 })];
    for (const e of [a, ref]) { e.applyEnv(); e.advance(60); e.env.light = 0; e.applyEnv(); e.advance(120); e.evaluate(); }
    for (const r of ['ATPS', 'CYTOX', 'PSII', 'PFK', 'GLGP']) {
        const j = a.rIndex[r], x = a.state.v[j], y = ref.state.v[j];
        assert.ok(Math.abs(x - y) <= 0.02 * Math.abs(y) + 1e-4, `${r} ${x} against ${y}`);
    }
    assert.ok(Math.abs(a.dp() - ref.dp()) < 1, `Δp ${a.dp()} against ${ref.dp()}`);
});

// ─── Thermodynamics at work ───

test('every reaction runs downhill: no undriven step goes against its ΔG', () => {
    for (const id of cells) {
        const e = createEngine(id); e.applyEnv();
        for (const t of [0.2, 2, 20]) {
            e.advance(t - e.t);
            e.reactions.forEach((r, j) => {
                if (r.sink || r.photons || r.id === 'LEAK' || r.id === 'UCP' || r.exchange && r.id.startsWith('EX_o2')) return;
                const f = e.factors(j);
                if (!Number.isFinite(f.dG) || Math.abs(f.v) < 1e-9) return;
                assert.ok(f.v * f.dG <= 1e-9, `${id} t=${t}: ${r.id} runs ${f.v} against ΔG ${f.dG}`);
            });
        }
    }
});

test('at equilibrium a reaction stops, and pushing its quotient reverses it; activity cannot move it', () => {
    const e = createEngine('animalCell');
    const j = e.rIndex.PGI;
    // PGI: G6P ⇌ F6P, so F6P/G6P = e^(−ΔG'°/RT) at equilibrium
    const K = Math.exp(-e.coupling(j).dg0 / RT);
    e.set('g6p', 'c', 1); e.set('f6p', 'c', K);
    assert.ok(Math.abs(e.factors(j).v) < 1e-9);
    e.state.activity[j] = 10;
    assert.ok(Math.abs(e.factors(j).v) < 1e-8, 'more enzyme, same equilibrium');
    e.set('f6p', 'c', 2 * K); assert.ok(e.factors(j).v < 0, 'too much F6P runs it backward');
    e.set('f6p', 'c', 0.5 * K); assert.ok(e.factors(j).v > 0, 'too little runs it forward');
});

test("a polymer's amount leaves its reactions' equilibria alone", () => {
    const e = createEngine('cyanobacterium'), j = e.rIndex.GLGP;
    e.set('glycogen', 'c', 10); const small = e.factors(j).dG;
    e.set('glycogen', 'c', 300); const big = e.factors(j).dG;
    assert.ok(Math.abs(small - big) < 1e-9, `phosphorylase's ΔG ${small} with 10 mM stored, ${big} with 300`);
});

test('an empty store is not spent backward: synthesis needs a chain both ways, and carbon is kept', () => {
    // glycogen synthase pushed backward by spent ATP and piled-up ADP and PPᵢ, with nothing stored
    const e = createEngine('cyanobacterium'); e.applyEnv();
    e.state.activity.fill(0); e.state.activity[e.rIndex.GLGS] = 1;
    for (const [id, v] of Object.entries({ glycogen: 0, g6p: 0, atp: 0.01, adp: 2, ppi: 1, '3pg': 1 })) e.set(id, 'c', v);
    const carbon = () => e.species.reduce((s, sp, i) => s + (sp.carbon || 0) * e.x[i] * e.vol[i], 0), c0 = carbon();
    assert.equal(rate(e, 'GLGS'), 0);
    e.advance(600);
    assert.ok(e.conc('glycogen') >= 0 && Math.abs(carbon() - c0) < 1e-9 * c0, `glycogen ${e.conc('glycogen')}, carbon ${c0} → ${carbon()}`);
});

test('demand gives a bounded response and creates no substrate', () => {
    const e = run('animalCell', 30);
    e.dial.growth = 50;    // far beyond what supply can meet
    const c0 = e.moiety('coa', 'm');
    e.advance(60);
    const v = rate(e, 'BIOMASS'), max = 50 / 3600 * 300;
    assert.ok(v < 0.2 * max, `growth ${v} of a demand of ${max}`);
    assert.ok(Math.abs(e.moiety('coa', 'm') - c0) < 1e-6, 'CoA returned as it is used');
    for (let i = 0; i < e.x.length; i++) assert.ok(e.x[i] >= 0);
});

test('repair is paid for: without its enzyme or ATP, damage stays', () => {
    const e = run('animalCell', 30);
    e.state.activity[e.rIndex.REPAIR] = 0;
    e.state.damage = 0.5; e.advance(5);
    assert.ok(e.state.damage >= 0.5 - 1e-9, `damage fell to ${e.state.damage} without repair`);
    const f = run('animalCell', 30);
    f.state.activity.fill(0); f.state.activity[f.rIndex.REPAIR] = 1;
    for (const c of ['c', 'm']) f.set('atp', c, 0);
    f.state.damage = 0.5; f.advance(5);
    assert.ok(f.state.damage > 0.49, `damage fell to ${f.state.damage} with no ATP`);
});

// ─── The membrane ───

test('every reaction moves the charges and protons across the membrane that its biology says', () => {
    // Written out independently of network.js: [charges, protons] moved to the lumen side per turnover
    const EXPECT = {
        NDH1: [4, 4], NDH1F: [4, 4], CYTBF: [2, 4], CYTOX: [4, 2], PSII: [2, 2], PSI: [1, 0], BR: [1, 1],
        NNT: [-1, -1], LEAK: [-1, -1], UCP: [-1, -1], ION: [-1, 0], KHE: [0, -1],
        MPC: [0, -1], PIC: [0, -1], ANT: [-1, 0], MAS: [-1, -1], ROSQ: [1, 2],
        SDH: [0, 0], ETFQO: [0, 0], FNR: [0, 0], CEF: [0, 0], MEHLER: [0, 0], NDH2: [0, 0],
    };
    for (const id of Object.keys(CELLS)) {
        const e = createEngine(id);
        for (const [r, [z, nH]] of Object.entries(EXPECT)) {
            if (!(r in e.rIndex)) continue;
            const c = e.coupling(e.rIndex[r]);
            assert.deepEqual([c.z, c.nH], [z, nH], `${id}: ${r}`);
        }
        // the c-ring sets ATP synthase's protons per ATP
        const a = e.coupling(e.rIndex.ATPS), n = (CELLS[id].ring || 12) / 3;
        assert.ok(Math.abs(a.z + n) < 1e-12 && Math.abs(a.nH + n) < 1e-12, `${id}: ATP synthase moves ${n}`);
    }
});

test('Δp divides as each membrane divides it: Δψ in mitochondria, ΔpH in thylakoids', () => {
    const m = run('animalCell', 60), t = run('plantChloroplast', 60);
    assert.ok(m.psi() > 0.7 * m.dp() && m.dpH() > 0, `mitochondrion: Δψ ${m.psi()} of ${m.dp()}`);
    assert.ok(t.dpH() > 0.7 * t.dp() && t.psi() > 0, `thylakoid: ΔpH ${t.dpH()} of ${t.dp()}`);
    // Nigericin's work: fast K⁺/H⁺ exchange collapses ΔpH, and Δψ takes up the slack
    const psi0 = m.psi();
    m.state.activity[m.rIndex.KHE] = 100; m.advance(30);
    assert.ok(Math.abs(m.dpH()) < 5 && m.psi() > psi0, `with nigericin ΔpH ${m.dpH()}, Δψ ${psi0} → ${m.psi()}`);
    // Valinomycin's (with K⁺): a fast counter-ion collapses Δψ, and ΔpH takes up the slack
    const ph0 = t.dpH();
    t.state.activity[t.rIndex.ION] = 100; t.advance(30);
    assert.ok(Math.abs(t.psi()) < 5 && t.dpH() > ph0, `with valinomycin Δψ ${t.psi()}, ΔpH ${ph0} → ${t.dpH()}`);
});

// ─── The verb ───

test('a hold against its paired baseline gives control coefficients at a steady state', () => {
    const e = run('animalCell', 40), j = e.rIndex.PFK;
    const snap = e.snapshot();
    const res = runCompare('animalCell', snap, [j], 1);
    assert.ok(res.steady, `no steady state in ${res.t} s`);
    const C = coefficients(res, 1, e.rIndex, ['PFK', 'EX_glc', 'CYTOX']);
    assert.ok(C.EX_glc > 0.05 && C.EX_glc < 2, `PFK's control over glucose uptake ${C.EX_glc}`);
    // the baseline copy is the cell left alone: it matches a plain run from the same state
    const b = createEngine('animalCell', { chemostat: true, hmax: HMAX }); b.restore(snap); for (let t = 0; t < res.t; t++) b.advance(1);
    b.evaluate();
    for (const r of ['PFK', 'CYTOX', 'ATPS']) assert.ok(Math.abs(b.state.v[b.rIndex[r]] - res.vb[b.rIndex[r]]) < 1e-12, r);
    assert.equal(e.pulseNow(j), 1, 'and the cell itself is untouched');
});

// ─── The animal cell ───

test('ADP stimulates respiration and more leak lowers Δp (respiratory control)', () => {
    const lo = createEngine('animalCell'), hi = createEngine('animalCell');
    lo.dial.atp = 0.2; hi.dial.atp = 2;
    for (const e of [lo, hi]) { e.applyEnv(); e.advance(60); }
    assert.ok(rate(hi, 'CYTOX') > 1.5 * rate(lo, 'CYTOX'), `O₂ use ${rate(lo, 'CYTOX')} → ${rate(hi, 'CYTOX')}`);
    assert.ok(hi.dp() < lo.dp(), 'working harder lowers Δp');
    const ucp = createEngine('animalCell'); ucp.applyEnv(); ucp.advance(60);
    const dp0 = ucp.dp(), o0 = rate(ucp, 'CYTOX');
    ucp.state.activity[ucp.rIndex.UCP] = 1; ucp.advance(30);
    assert.ok(ucp.dp() < dp0 - 10, `uncoupled Δp ${dp0} → ${ucp.dp()}`);
    assert.ok(rate(ucp, 'CYTOX') > o0, 'and the chain runs faster');
});

test('anoxia stops O₂ reduction at once, fermentation takes over, and O₂ brings it back', () => {
    const e = run('animalCell', 60);
    const lac0 = rate(e, 'LDH');
    e.env.o2 = 0; e.applyEnv(); e.advance(0.5);
    assert.ok(rate(e, 'CYTOX') < 0.02, `oxidase still at ${rate(e, 'CYTOX')}`);
    e.advance(30);
    assert.ok(rate(e, 'LDH') > 3 * lac0, 'lactate fermentation rises');
    assert.ok(rate(e, 'HEX1') > 1.5 * 0.17, 'glycolysis speeds up (Pasteur)');
    e.env.o2 = 1; e.applyEnv(); e.advance(30);
    assert.ok(rate(e, 'CYTOX') > 0.5, 'respiration recovers');
});

// ─── The night and the day (VISION.md, milestone 2): each archetype against its qualitative targets ───

/** The cell after 10 minutes in full sun, its store set to a dusk's (glucosyl mM). */
const dusk = (id, store) => { const e = run(id, 600); e.set('glycogen', 'c', store); return e; };

test('the cyanobacterium lives through a night on its glycogen, through the pentose phosphate pathway into NDH-1', () => {
    const e = dusk('cyanobacterium', 300), o2day = -rate(e, 'EX_o2');
    e.env.light = 0; e.advance(3600);
    // the store's carbon goes round the oxidative pentose phosphate pathway, not down glycolysis, and its
    // electrons enter the chain at NDH-1 (from NADPH, through ferredoxin)
    assert.ok(rate(e, 'G6PDH') > 3 * Math.abs(rate(e, 'PFK')), `G6PDH ${rate(e, 'G6PDH')} against PFK ${rate(e, 'PFK')}`);
    assert.ok(rate(e, 'NDH1F') > rate(e, 'NDH2') && rate(e, 'NDH1F') > rate(e, 'SDH'), `NDH-1 ${rate(e, 'NDH1F')}, NDH-2 ${rate(e, 'NDH2')}, SDH ${rate(e, 'SDH')}`);
    e.advance(11 * 3600);
    const o2 = rate(e, 'EX_o2');
    assert.ok(ec(e) > 0.9 && e.conc('glycogen') > 50, `at dawn: energy charge ${ec(e)}, glycogen ${e.conc('glycogen')} mM`);
    assert.ok(o2 > 0 && o2 < 0.1 * o2day, `it respires ${o2} mM O₂/s, against the day's ${o2day}`);
    assert.ok(Math.abs(rate(e, 'EX_lac')) < 1e-3, `and makes no lactate with oxygen: ${rate(e, 'EX_lac')}`);
});

test('without oxygen in the dark the cyanobacterium ferments, AtpΘ keeps its ATP, and oxygen brings it back', () => {
    const e = dusk('cyanobacterium', 300);
    e.env.light = 0; e.env.o2 = 0; e.applyEnv(); e.advance(3600);
    assert.ok(rate(e, 'EX_lac') > 0.02 && ec(e) > 0.7, `anoxic: lactate ${rate(e, 'EX_lac')}, energy charge ${ec(e)}`);
    // its ATP synthase doesn't split ATP to hold a gradient it can't use
    assert.ok(rate(e, 'ATPS') > -1e-3 && e.dp() < 30, `ATP synthase ${rate(e, 'ATPS')}, Δp ${e.dp()}`);
    e.env.o2 = 1; e.applyEnv(); e.advance(600);
    assert.ok(ec(e) > 0.95 && rate(e, 'EX_lac') < 1e-3, `oxygen back: energy charge ${ec(e)}, lactate ${rate(e, 'EX_lac')}`);
});

test('the chloroplast turns RuBisCO off at night, exports from its starch, and lets its thylakoid go flat', () => {
    const e = dusk('plantChloroplast', 300), rubisco = rate(e, 'RBPC');
    assert.ok(rate(e, 'TPT') > 0.03, `it exports by day: ${rate(e, 'TPT')}`);
    e.env.light = 0; e.advance(1800);
    assert.ok(rate(e, 'RBPC') < 0.01 * rubisco, `RuBisCO at night ${rate(e, 'RBPC')} against ${rubisco}`);
    assert.ok(rate(e, 'GLGP') > 0.005 && rate(e, 'TPT') > 0.01, `starch ${rate(e, 'GLGP')} out as triose ${rate(e, 'TPT')}`);
    assert.ok(e.dp() < 20 && ec(e) > 0.8, `Δp ${e.dp()}, energy charge ${ec(e)}`);
});

test("the cyanobacterium's day: growth takes most of the carbon it fixes, and the store fills with the rest", () => {
    const e = createEngine('cyanobacterium'); e.applyEnv(); e.env.light = 0; e.advance(600);
    const sun = (h) => h >= 6 && h <= 18 ? Math.sin(Math.PI * (h - 6) / 12) : 0, g0 = e.conc('glycogen');
    let fixed = 0, grown = 0, low = 1, dusk = 0, night = 0;
    // the sun stepped each five minutes, at their middle, and the energy charge read each minute: dusk's
    // crossing of the light switches lasts minutes, and half-hour steps would step over it
    for (let m = 0; m < 24 * 60; m += 5) {
        e.env.light = sun(6 + (m + 2.5) / 60);
        for (let k = 0; k < 5; k++) { e.advance(60); low = Math.min(low, ec(e)); }
        const v = e.evaluate();
        fixed += v[e.rIndex.RBPC] * 300; grown += v[e.rIndex.BIOMASS] * 300 * 42.6;   // mM of carbon: 42.6 C a gram
        if (m === 12 * 60 - 5) dusk = e.conc('glycogen');
        if (m >= 12 * 60) night = Math.max(night, Math.abs(v[e.rIndex.BIOMASS]));
    }
    assert.ok(grown > 0.5 * fixed, `growth took ${grown.toFixed(0)} of ${fixed.toFixed(0)} mM of carbon fixed`);
    const stored = (dusk - g0) * 6;
    assert.ok(stored > 0 && stored < 0.4 * fixed, `the store gained ${stored.toFixed(0)} mM of carbon`);
    assert.ok(low > 0.8 && night < 1e-4, `lowest energy charge ${low}, growth at night ${night}`);
});

test('nitrogen: ammonium taken up is nitrogen grown, through glutamine and glutamate synthase', () => {
    const e = run('cyanobacterium', 3600);
    const v = e.evaluate(), r = (k) => v[e.rIndex[k]], grow = r('BIOMASS');
    // the biomass row takes 4.9414 glutamate and 0.2557 glutamine a gram: 5.4528 nitrogen
    assert.ok(grow > 0, 'it grows');
    assert.ok(Math.abs(r('EX_nh4') - 5.4528 * grow) < 0.05 * r('EX_nh4'), `ammonium in ${r('EX_nh4')}, nitrogen grown ${5.4528 * grow}`);
    assert.ok(Math.abs(r('GLNS') - r('EX_nh4')) < 0.05 * r('GLNS') && r('GLUSy') > 0.9 * r('GLNS') - 0.2557 * grow,
        `GS ${r('GLNS')}, GOGAT ${r('GLUSy')}`);
});
