// Model — a cell instantiated from cells.js and network.js: its species,
// each placed in a compartment, and its reactions as sparse stoichiometry
// over them. Headless: nothing here touches the page.
//
// Compartments: c the cytosol (the one aqueous compartment of a cell without
// a separate matrix), m the mitochondrial matrix, l the lumen side of the
// drawn membrane (where h_l, the translocated protons, live, and dq, the net
// charge moved there), e the medium. Water, buffered H⁺ and K⁺ are fixed; h_l is not.
import { SPECIES } from './species.js';
import { REACTIONS } from './network.js';
import { CELLS } from './cells.js';

/** Where a species tagged or untagged in a reaction lives in this cell. */
function place(id, tag, at, comps) {
    const s = SPECIES[id];
    if (!s) throw new Error('unknown species ' + id);
    const matrix = 'm' in comps;
    if (tag === 'e') return 'e';
    if (tag === 'l') return 'l';
    // Gases and small permeant molecules cross membranes freely: one pool, in the cytosol
    if (s.kind === 'gas' || s.permeant) return 'c';
    if (tag === 'm') return matrix ? 'm' : 'c';
    if (tag === 'c') return 'c';
    return at === 'mito' && matrix ? 'm' : 'c';
}

/** Build the model of a cell: species placed, reactions indexed. */
export function buildCell(cellId) {
    const cell = CELLS[cellId];
    if (!cell) throw new Error('unknown cell ' + cellId);
    const comps = { ...cell.compartments, e: Infinity };
    const species = [], index = {};
    const key = (id, comp) => {
        const k = id + '_' + comp;
        if (!(k in index)) {
            const s = SPECIES[id];
            index[k] = species.length;
            // Water and buffered H⁺ are fixed; h_l carries the proton-motive force
            const fixed = s.kind === 'fixed' && !(id === 'h' && comp === 'l');
            species.push({ key: k, id, comp, name: s.name, kind: s.kind, fixed, carbon: s.carbon, el: s.el, charge: s.charge });
        }
        return index[k];
    };
    const reactions = [];
    for (const rid of cell.reactions) {
        const r = REACTIONS[rid];
        if (!r) throw new Error(cellId + ': unknown reaction ' + rid);
        const stoich = [];
        // ATP synthase takes one proton per c subunit, three ATP a turn: ring/3 per ATP (cells.js)
        const eq = rid === 'ATPS' && cell.ring ? { ...r.stoich, 'h[l]': -cell.ring / 3, h: cell.ring / 3 - 1 } : r.stoich;
        for (const [term, nu] of Object.entries(eq)) {
            const m = /^(.+?)(?:\[([clme])\])?$/.exec(term);
            stoich.push([key(m[1], place(m[1], m[2], r.at, comps)), nu]);
        }
        reactions.push({ ...r, stoich, comp: r.at === 'mito' && 'm' in comps ? 'm' : 'c' });
    }
    key('dq', 'l');
    return { id: cellId, cell, comps, species, index, reactions };
}

/** Dense stoichiometric matrix (species × reactions), optionally only some species and reactions. */
export function stoichMatrix(model, keep = () => true, keepR = () => true) {
    const rows = model.species.map((s, i) => keep(s, i) ? i : -1).filter(i => i >= 0);
    const at = Object.fromEntries(rows.map((i, j) => [i, j]));
    const rx = model.reactions.filter(keepR);
    const N = rows.map(() => new Array(rx.length).fill(0));
    rx.forEach((r, j) => { for (const [i, nu] of r.stoich) if (i in at) N[at[i]][j] += nu; });
    return { N, rows };
}
