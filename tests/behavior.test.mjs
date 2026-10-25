// The engine's behavior, headless (VISION.md, milestone 1's behavioral
// tests): conservation along trajectories, the clock's independence from how
// frames slice it, thermodynamics at work, respiratory control, anoxia,
// light, and bounded demand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELLS } from '../src/engine/cells.js';
import { MOIETIES } from '../src/engine/species.js';
import { createEngine } from '../src/engine/engine.js';
import { RT } from '../src/engine/thermo.js';
import { makeRng } from '../src/engine/rng.js';
import { EventQueue } from '../src/engine/events.js';

const cells = Object.keys(CELLS);
const run = (id, t, env) => { const e = createEngine(id, { env }); e.applyEnv(); e.advance(t); return e; };
const rate = (e, rid) => e.evaluate()[e.rIndex[rid]];

test('moieties hold and nothing goes negative along a trajectory, in every cell', () => {
    for (const id of cells) {
        const e = createEngine(id); e.applyEnv();
        const comps = Object.keys(e.model.comps).filter(c => c !== 'e');
        const before = {};
        for (const m of Object.keys(MOIETIES)) for (const c of comps) before[m + c] = e.moiety(m, c);
        e.advance(30);
        for (const m of Object.keys(MOIETIES)) for (const c of comps) {
            const a = before[m + c], b = e.moiety(m, c);
            assert.ok(Math.abs(a - b) <= 1e-9 + 1e-7 * a, `${id}: ${m} in ${c} went ${a} → ${b}`);
        }
        for (let i = 0; i < e.x.length; i++) assert.ok(e.x[i] >= 0, `${id}: ${e.species[i].key} is ${e.x[i]}`);
    }
});

test('a trajectory is the same however the frames slice time', () => {
    const a = createEngine('cyanobacterium'), b = createEngine('cyanobacterium'), c = createEngine('cyanobacterium');
    for (const e of [a, b, c]) e.applyEnv();
    a.advance(5);
    for (let k = 0; k < 500; k++) b.advance(0.01);
    const rng = makeRng(7); let t = 0;
    while (t < 5) { const dt = Math.min(5 - t, rng() * 0.05); c.advance(dt); t += dt; }
    assert.equal(a.t, b.t); assert.equal(a.t, c.t);
    for (let i = 0; i < a.x.length; i++) { assert.equal(a.x[i], b.x[i]); assert.equal(a.x[i], c.x[i]); }
});

test('seeded randomness replays, and a reset cancels pending events', () => {
    const r1 = makeRng(42), r2 = makeRng(42);
    for (let k = 0; k < 100; k++) assert.equal(r1(), r2());
    const s1 = makeRng(42).stream('window'), s2 = makeRng(42).stream('window'), s3 = makeRng(42).stream('other');
    assert.equal(s1(), s2()); assert.notEqual(makeRng(42).stream('window')(), s3());
    const e = createEngine('animalCell'); let fired = 0;
    e.events.at(0.5, () => fired++);
    e.reset(); e.advance(1);
    assert.equal(fired, 0);
    const q = new EventQueue(), seen = [];
    for (const t of [3, 1, 2, 1]) q.at(t, () => seen.push(t));
    q.runUntil(2.5);
    assert.deepEqual(seen, [1, 1, 2]);
});

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
    // PGI: G6P ⇌ F6P with ΔG'° 2.66 kJ/mol, so F6P/G6P = e^(−2.66/RT) at equilibrium
    const K = Math.exp(-2.66 / RT);
    e.set('g6p', 'c', 1); e.set('f6p', 'c', K);
    assert.ok(Math.abs(e.factors(j).v) < 1e-9);
    e.state.activity[j] = 10;
    assert.ok(Math.abs(e.factors(j).v) < 1e-8, 'more enzyme, same equilibrium');
    e.set('f6p', 'c', 2 * K); assert.ok(e.factors(j).v < 0, 'too much F6P runs it backward');
    e.set('f6p', 'c', 0.5 * K); assert.ok(e.factors(j).v > 0, 'too little runs it forward');
});

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

test('light drives the Calvin cycle; without its sink, electrons find the water–water cycle', () => {
    const e = run('plantChloroplast', 60);
    assert.ok(rate(e, 'RBPC') > 0.3, `RuBisCO at ${rate(e, 'RBPC')}`);
    assert.ok(e.dp() > 100);
    e.env.light = 0; e.advance(30);
    assert.ok(rate(e, 'RBPC') < 0.1 && rate(e, 'PSII') === 0, 'dark stops both');
    e.env.light = 1; e.advance(60);
    assert.ok(rate(e, 'RBPC') > 0.3, 'and light restarts them');
    const k = run('plantChloroplast', 30);
    for (const r of ['RBPC', 'PRUK']) k.state.activity[k.rIndex[r]] = 0;
    k.advance(30);
    assert.ok(rate(k, 'MEHLER') > 0.01, 'electrons go to O₂ when the Calvin cycle is knocked out');
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

test('bacteriorhodopsin alone powers the halophile in the light', () => {
    const e = run('archaeon', 60);
    assert.ok(e.dp() > 120 && rate(e, 'ATPS') > 0.1, `Δp ${e.dp()}, ATP synthase ${rate(e, 'ATPS')}`);
    e.env.light = 0; e.advance(60);
    assert.ok(e.dp() < 60, 'without light or O₂ it has nothing to run on');
});

test('the anaerobe runs its ATP synthase backward to keep a gradient', () => {
    const e = run('obligateAnaerobe', 60);
    assert.ok(rate(e, 'ATPS') < 0 && e.dp() > 60, `ATP synthase ${rate(e, 'ATPS')}, Δp ${e.dp()}`);
    assert.ok(rate(e, 'PDC') > 0.1, 'and ferments to ethanol');
});
