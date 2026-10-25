// The network's own consistency, against independent references: every
// reaction balances in elements and charge (BiGG's formulas), and every cell
// keeps the moieties specified by hand in species.js, per compartment.
// node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, MOIETIES } from '../src/engine/species.js';
import { REACTIONS } from '../src/engine/network.js';
import { CELLS } from '../src/engine/cells.js';
import { buildCell, stoichMatrix } from '../src/engine/model.js';

const baseId = (term) => term.replace(/\[[clme]\]$/, '');

test('every reaction balances in every element and in charge', () => {
    const bad = [];
    for (const r of Object.values(REACTIONS)) {
        if (r.sink) continue;    // biosynthetic demand takes carbon out of the network by design
        const sum = {}; let q = 0;
        for (const [term, nu] of Object.entries(r.stoich)) {
            const s = SPECIES[baseId(term)];
            assert.ok(s, `${r.id}: unknown species ${term}`);
            for (const [el, n] of Object.entries(s.el)) sum[el] = (sum[el] || 0) + nu * n;
            q += nu * s.charge;
        }
        const off = Object.entries(sum).filter(([, v]) => Math.abs(v) > 1e-9).map(([el, v]) => `${el} ${v > 0 ? '+' : ''}${v}`);
        if (Math.abs(q) > 1e-9) off.push(`charge ${q > 0 ? '+' : ''}${q}`);
        if (off.length) bad.push(`${r.id}: ${off.join(', ')}  (${r.eq})`);
    }
    assert.deepEqual(bad, []);
});

test('every cell builds from known reactions and species', () => {
    for (const id of Object.keys(CELLS)) {
        const m = buildCell(id);
        assert.ok(m.reactions.length > 10, id);
        for (const s of m.species) assert.ok(s.comp in m.comps, `${id}: ${s.key} in unknown compartment`);
    }
});

test('each cell conserves every moiety in every compartment', () => {
    for (const id of Object.keys(CELLS)) {
        const m = buildCell(id);
        for (const [moiety, members] of Object.entries(MOIETIES)) {
            for (const comp of Object.keys(m.comps)) {
                const vec = m.species.map(s => s.comp === comp ? members[s.id] || 0 : 0);
                if (!vec.some(Boolean)) continue;
                for (const r of m.reactions) {
                    const d = r.stoich.reduce((a, [i, nu]) => a + vec[i] * nu, 0);
                    assert.ok(Math.abs(d) < 1e-9, `${id}: ${r.id} changes ${moiety} in ${comp} by ${d}`);
                }
            }
        }
    }
});

test('each cell conserves carbon and phosphorus, medium included', () => {
    for (const id of Object.keys(CELLS)) {
        const m = buildCell(id);
        for (const el of ['C', 'P', 'N', 'S']) {
            for (const r of m.reactions.filter(r => !r.sink)) {
                const d = r.stoich.reduce((a, [i, nu]) => a + (m.species[i].fixed ? 0 : (m.species[i].el[el] || 0) * nu), 0);
                assert.ok(Math.abs(d) < 1e-9, `${id}: ${r.id} changes ${el} by ${d}`);
            }
        }
    }
});

/** Rank of a dense matrix by Gaussian elimination. */
function rank(A) {
    const M = A.map(r => r.slice()), n = M.length, m = n ? M[0].length : 0;
    let rk = 0;
    for (let col = 0; col < m && rk < n; col++) {
        let p = rk; for (let i = rk + 1; i < n; i++) if (Math.abs(M[i][col]) > Math.abs(M[p][col])) p = i;
        if (Math.abs(M[p][col]) < 1e-9) continue;
        [M[rk], M[p]] = [M[p], M[rk]];
        for (let i = 0; i < n; i++) if (i !== rk) { const f = M[i][col] / M[rk][col]; if (f) for (let j = col; j < m; j++) M[i][j] -= f * M[rk][j]; }
        rk++;
    }
    return rk;
}

// Conservation laws a cell has for a reason of its own, beyond the moieties and elements
const EXPECTED = {
    // No anaplerosis: acetyl-CoA enters and CO₂ leaves, so the cycle's intermediates sum to a constant
    archaeon: [['oaa', 'cit', 'icit', 'akg', 'succoa', 'succ', 'fum', 'mal__L']],
};

test("the moieties and elements span each cell's conservation laws", () => {
    for (const id of Object.keys(CELLS)) {
        const m = buildCell(id);
        const { N, rows } = stoichMatrix(m, s => !s.fixed, r => !r.sink);
        const laws = N.length - rank(N);    // dimension of the left null space
        // What we expect to be conserved: each moiety per compartment, C and P across the cell and its
        // medium, and electrons: with water and buffered H⁺ fixed, H − 2O − charge (reducing equivalents
        // relative to water) is conserved by every balanced reaction, PSII's included
        const vecs = [rows.map(i => { const s = m.species[i]; return (s.el.H || 0) - 2 * (s.el.O || 0) - s.charge; })];
        for (const members of Object.values(MOIETIES))
            for (const comp of Object.keys(m.comps)) {
                const v = rows.map(i => m.species[i].comp === comp ? members[m.species[i].id] || 0 : 0);
                if (v.some(Boolean)) vecs.push(v);
            }
        for (const el of ['C', 'P']) vecs.push(rows.map(i => m.species[i].el[el] || 0));
        for (const ids of EXPECTED[id] || []) vecs.push(rows.map(i => ids.includes(m.species[i].id) ? 1 : 0));
        const known = rank(vecs);
        assert.equal(laws, known, `${id}: ${laws} conservation laws, ${known} of them accounted for`);
    }
});
