// The migration check (VISION.md, phase A step 3): every old handler in
// src/reactions/ that maps onto the new network's reactions changes the old
// store exactly as those reactions' stoichiometry says, projected onto the
// old store's keys. It checks the new table's transcription, not the
// chemistry, and it lists where the two models differ on purpose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { store, simState, resetState } from '../src/state.js';
import { advanceGlycolysis } from '../src/reactions/glycolysis.js';
import { advanceKrebs } from '../src/reactions/krebs.js';
import { advancePPP } from '../src/reactions/ppp.js';
import { advanceCalvin } from '../src/reactions/calvin.js';
import { advancePDH, advancePDC, advanceADH, advanceLDH, advanceALDH, advanceACS, advanceFermentation } from '../src/reactions/fermentation.js';
import { REACTIONS } from '../src/engine/network.js';

// New species → the old store's key (pentoses are one station there; the old store counts only
// the charged or reduced member of each cofactor pair)
const OLD = {
    glc__D: 'glucose', g6p: 'g6p', f6p: 'f6p', fdp: 'f16bp', g3p: 'g3p', '13dpg': 'bpg', '3pg': 'pga3', '2pg': 'pga2',
    pep: 'pep', pyr: 'pyruvate', lac__L: 'lactate', etoh: 'ethanol', acald: 'acetaldehyde', ac: 'aceticAcid',
    accoa: 'acetylCoA', cit: 'citrate', icit: 'isocitrate', akg: 'akg', succoa: 'succoa', succ: 'succinate',
    fum: 'fumarate', mal__L: 'malate', oaa: 'oaa', '6pgl': 'pgl6', '6pgc': 'pga6', r5p: 'r5p', ru5p__D: 'r5p',
    xu5p__D: 'r5p', rb15bp: 'rubp', atp: 'atp', nadh: 'nadh', nadph: 'nadph', co2: '+co2',
};
const KEYS = [...new Set(Object.values(OLD))];

/** What a combination of new reactions does to the old store's keys. */
function project(parts, n) {
    const d = {};
    for (const [rid, k] of parts) {
        for (const [term, nu] of Object.entries(REACTIONS[rid].stoich)) {
            const key = OLD[term.replace(/\[[clme]\]$/, '')];
            if (key) d[key] = (d[key] || 0) + nu * k * n;
        }
    }
    return d;
}

// [label, call, new reactions with extents per unit of the handler's n]
const CASES = [
    ['HK', () => advanceGlycolysis(0, 'forward'), [['HEX1', 1]]],
    ['G6Pase', () => advanceGlycolysis(0, 'reverse'), [['G6PP', 1]]],
    ['PGI', () => advanceGlycolysis(1, 'forward'), [['PGI', 1]]],
    ['PGI back', () => advanceGlycolysis(1, 'reverse'), [['PGI', -1]]],
    ['PFK', () => advanceGlycolysis(2, 'forward'), [['PFK', 1]]],
    ['FBPase', () => advanceGlycolysis(2, 'reverse'), [['FBP', 1]]],
    ['aldolase', () => advanceGlycolysis(3, 'forward'), [['FBA', 1]]],
    ['aldolase back', () => advanceGlycolysis(3, 'reverse'), [['FBA', -1]]],
    ['GAPDH', () => advanceGlycolysis(5, 'forward'), [['GAPD', 1]]],
    ['GAPDH back, Calvin', () => { simState.calvinEnabled = true; return advanceGlycolysis(5, 'reverse'); }, [['GAPDP', -1]]],
    ['GAPDH back, gluconeogenesis', () => { simState.calvinEnabled = false; const r = advanceGlycolysis(5, 'reverse'); simState.calvinEnabled = true; return r; }, [['GAPD', -1]]],
    ['PGK', () => advanceGlycolysis(6, 'forward'), [['PGK', 1]]],
    ['PGK back', () => advanceGlycolysis(6, 'reverse'), [['PGK', -1]]],
    ['PGM', () => advanceGlycolysis(7, 'forward'), [['PGM', 1]]],
    ['enolase', () => advanceGlycolysis(8, 'forward'), [['ENO', 1]]],
    ['PK', () => advanceGlycolysis(9, 'forward'), [['PYK', 1]]],
    ['PC + PEPCK', () => advanceGlycolysis(9, 'reverse'), [['PC', 1], ['PPCK', 1]]],
    ['citrate synthase', () => advanceKrebs(0, 'forward'), [['CS', 1]]],
    ['aconitase', () => advanceKrebs(1), [['ACONT', 1]]],
    ['IDH', () => advanceKrebs(2), [['ICDH', 1]]],
    ['KGDH', () => advanceKrebs(3), [['AKGDH', 1]]],
    ['SCS', () => advanceKrebs(4, 'forward'), [['SUCOAS', 1]]],
    ['fumarase', () => advanceKrebs(6), [['FUM', 1]]],
    ['MDH', () => advanceKrebs(7, 'forward'), [['MDH', 1]]],
    ['MDH back', () => advanceKrebs(7, 'reverse'), [['MDH', -1]]],
    ['G6PDH', () => advancePPP(0), [['G6PDH', 1]]],
    ['lactonase', () => advancePPP(1), [['PGL', 1]]],
    ['6PGDH', () => advancePPP(2), [['GND', 1]]],
    ['RuBisCO', () => advanceCalvin(0), [['RBPC', 1]]],
    ['PRK', () => advanceCalvin(7), [['PRUK', 1]]],
    ['PDH', () => advancePDH(), [['PDH', 1]]],
    ['LDH', () => advanceLDH('forward'), [['LDH', 1]]],
    ['LDH back', () => advanceLDH('reverse'), [['LDH', -1]]],
    ['ADH (ethanol oxidized)', () => advanceADH('forward'), [['ADH', -1]]],
    ['ADH (acetaldehyde reduced)', () => advanceADH('reverse'), [['ADH', 1]]],
    ['ALDH', () => advanceALDH(), [['ALDH', 1]]],
    ['ACS', () => advanceACS(), [['ACS', 1]]],
];
// Where the two differ on purpose:
//   ethanol fermentation (old PDC + ADH lumped as one) and the old PDC need anoxia; they are checked
//   as PDC + ADH with oxygen off below. Old SDH made free FADH₂; the new one hands electrons to the
//   quinone pool. The old non-oxidative PPP (6 R5P ⇌ 5 F6P), its Calvin twin, β-oxidation's steps
//   (old: chain lengths in arrays) and fatty-acid synthesis (new: lumped rounds on their own
//   enzymes) and the batch services have no one-to-one counterpart.

function fill(rng) {
    resetState();
    for (const k of KEYS) if (k[0] !== '+') store[k] = 4 + Math.floor(rng() * 8);
    store.atp = 50; store.nadh = 50; store.nadph = 50; store.fadh2 = 20;
    simState.oxygenAvailable = true; simState.ferments = { lactate: true, ethanol: true };
}

test('the old handlers change the store as the new reactions say', () => {
    let seed = 1; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const check = (label, call, parts) => {
        for (let k = 0; k < 5; k++) {
            fill(rng);
            const before = { ...store };
            const res = call();
            assert.ok(res, `${label} didn't fire`);
            const expect = project(parts, res.n);
            for (const key of KEYS) {
                const got = key === '+co2' ? store.co2Produced - before.co2Produced - (store.co2Fixed - before.co2Fixed) : store[key] - before[key];
                assert.equal(got, expect[key] || 0, `${label}: ${key} changed by ${got}, the new reactions say ${expect[key] || 0}`);
            }
        }
    };
    for (const [label, call, parts] of CASES) check(label, call, parts);
    check('fermentation to ethanol', () => { simState.oxygenAvailable = false; return advanceFermentation(); }, [['PDC', 1], ['ADH', 1]]);
    check('PDC', () => { simState.oxygenAvailable = false; return advancePDC(); }, [['PDC', 1]]);
});
