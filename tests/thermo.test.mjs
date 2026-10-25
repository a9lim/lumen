// Thermodynamic consistency: around every internal cycle of every cell, the
// standard Gibbs energies sum to nothing (light left out), so no undriven
// loop of reactions can make ATP or pump a proton.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELLS } from '../src/engine/cells.js';
import { buildCell, stoichMatrix } from '../src/engine/model.js';
import { dg0 } from '../src/engine/thermo.js';

/** A basis of the null space of A (rows × cols), by reduced row echelon form. */
function nullSpace(A) {
    const n = A.length, m = A[0].length, M = A.map(r => r.slice()), piv = [];
    let rk = 0;
    for (let c = 0; c < m && rk < n; c++) {
        let p = rk; for (let i = rk + 1; i < n; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i;
        if (Math.abs(M[p][c]) < 1e-9) continue;
        [M[rk], M[p]] = [M[p], M[rk]];
        const d = M[rk][c]; for (let j = 0; j < m; j++) M[rk][j] /= d;
        for (let i = 0; i < n; i++) if (i !== rk && M[i][c]) { const f = M[i][c]; for (let j = 0; j < m; j++) M[i][j] -= f * M[rk][j]; }
        piv.push(c); rk++;
    }
    const free = [...Array(m).keys()].filter(c => !piv.includes(c));
    return free.map(f => { const v = new Array(m).fill(0); v[f] = 1; piv.forEach((c, r) => { v[c] = -M[r][f]; }); return v; });
}

test('every reaction has a standard Gibbs energy in every cell', () => {
    for (const id of Object.keys(CELLS)) {
        const m = buildCell(id);
        for (const r of m.reactions.filter(r => !r.sink)) assert.ok(Number.isFinite(dg0(m.cell, r)), `${id}: ${r.id}`);
    }
});

test('no internal cycle has a standard Gibbs energy of its own', () => {
    for (const id of Object.keys(CELLS)) {
        const m = buildCell(id);
        const { N } = stoichMatrix(m, s => !s.fixed, r => !r.sink);
        const cycles = nullSpace(N);
        const rx = m.reactions.filter(r => !r.sink);
        for (const v of cycles) {
            const dg = v.reduce((a, x, j) => a + x * dg0(m.cell, rx[j], true), 0);
            const size = v.reduce((a, x) => a + Math.abs(x), 0);
            const names = v.map((x, j) => Math.abs(x) > 1e-9 ? `${+x.toFixed(2)} ${rx[j].id}` : null).filter(Boolean).join(', ');
            assert.ok(Math.abs(dg) < 0.05 + 0.01 * size, `${id}: cycle ΔG′° ${dg.toFixed(2)} kJ/mol: ${names}`);
        }
    }
});
