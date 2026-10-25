// Map binding — what the transit map and the membrane show of the engine:
// each segment's reactions and the carbon each carries along it, each
// station's species, each drawn complex's reactions, and which reactions each
// line's switch knocks out. maplayout.js draws; engine/ computes; this joins
// them, per cell (a segment with none of its reactions in the cell leaves the
// map).
import { CHAIN, ACYL } from './engine/species.js';

const B = [16, 14, 12, 10, 8, 6, 4];

/**
 * Segment → its parts: [reaction, carbon per turnover along the drawn way
 * (negative where the reaction runs against it), which part of its flux the
 * segment takes: 'both', 'pos' or 'neg']. In a cell with the Calvin cycle the
 * corridor's reversible steps hand their backward flux to the Calvin track.
 */
export function segments(cellHas) {
    const calvin = cellHas('RBPC');
    const back = calvin ? 'pos' : 'both';
    const S = {
        g0: [['HEX1', 6], ['G6PP', -6], ['GLGP', 6], ['GLGS', -6]],
        g1: [['PGI', 6]],
        g2: calvin ? [['PFK', 6]] : [['PFK', 6], ['FBP', -6]],
        g3: [['FBA', 6, back]],
        g5: [['GAPD', 3, back], ...(calvin ? [] : [['GAPDP', 3]])],
        g6: [['PGK', 3, back]],
        g7: [['PGM', 3]], g8: [['ENO', 3]],
        g9: [['PYK', 3], ['PPCK', -3], ['PPS', -3]],
        c7: [['PRUK', 5]], c0: [['RBPC', 5]],
        c6: calvin ? [['PGK', -3, 'neg']] : [],
        c5: calvin ? [['GAPDP', -3], ['GAPD', -3, 'neg']] : [],
        c3: calvin ? [['FBA', -6, 'neg']] : [],
        c2: calvin ? [['FBP', 6]] : [],
        // The regeneration (TK + SBPase): the F6P it takes back toward the pentoses
        c10: calvin ? [['TKT2', -6, 'neg']] : [],
        p0: [['G6PDH', 6]], p1: [['PGL', 6]], p2: [['GND', 5]],
        p10: [['TKT2', 6, calvin ? 'pos' : 'both'], ['TALA', 6, calvin ? 'pos' : 'both']],
        pdh: [['PDH', 2]], pdc: [['PDC', 2]], adh: [['ADH', 2]], ldh: [['LDH', 3]], aldh: [['ALDH', 2]], acs: [['ACS', 2]],
        kin: [['CS', 2]], k0: [['CS', 4]], k1: [['ACONT', 6]], k2: [['ICDH', 5]], k3: [['AKGDH', 4]],
        k4: [['SUCOAS', 4]], k5: [['SDH', 4]], k6: [['FUM', 4]], k7: [['MDH', 4]],
        // β-oxidation by chain length; fatty-acid synthesis runs the loop backward, a round at a time
        b0: [...B.map(n => ['ACAD' + n, n]), ...B.map(n => ['FAS' + n, -n])],
        b1: [...B.map(n => ['ECH' + n, n]), ...B.map(n => ['FAS' + n, -n])],
        b2: [...B.map(n => ['HACD' + n, n]), ...B.map(n => ['FAS' + n, -n])],
        b3: [...B.map(n => ['KAT' + n, n]), ...B.map(n => ['FAS' + n, -n])],
        bspur: [...B.map(n => ['KAT' + n, n === 4 ? 4 : 2]), ...B.map(n => ['FAS' + n, n === 4 ? -4 : -2])],
    };
    for (const id in S) S[id] = S[id].filter(([r]) => cellHas(r)).map(([r, w, mode]) => [r, w, mode || 'both']);
    return S;
}

/** Station → [species id, compartment role ('cyto' or 'mito')], or a list of them summed. */
export const STATION = {
    glucose: [['glc__D', 'cyto']], g6p: [['g6p', 'cyto']], f6p: [['f6p', 'cyto']], f16bp: [['fdp', 'cyto']],
    g3p: [['g3p', 'cyto']], bpg: [['13dpg', 'cyto']], pga3: [['3pg', 'cyto']], pga2: [['2pg', 'cyto']], pep: [['pep', 'cyto']],
    pyruvate: [['pyr', 'cyto']], lactate: [['lac__L', 'cyto']], acetaldehyde: [['acald', 'cyto']], ethanol: [['etoh', 'cyto']],
    aceticAcid: [['ac', 'cyto']], acetylCoA: [['accoa', 'mito']],
    pgl6: [['6pgl', 'cyto']], pga6: [['6pgc', 'cyto']], r5p: [['r5p', 'cyto'], ['ru5p__D', 'cyto'], ['xu5p__D', 'cyto']], rubp: [['rb15bp', 'cyto']],
    citrate: [['cit', 'mito']], isocitrate: [['icit', 'mito']], akg: [['akg', 'mito']], succoa: [['succoa', 'mito']],
    succinate: [['succ', 'mito']], fumarate: [['fum', 'mito']], malate: [['mal__L', 'mito']], oaa: [['oaa', 'mito']],
    fattyAcid: ACYL.acyl.map(k => [k, 'mito']), enoylCoA: ACYL.enoyl.map(k => [k, 'mito']),
    hydroxyCoA: ACYL.hydroxy.map(k => [k, 'mito']), ketoCoA: ACYL.keto.map(k => [k, 'mito']),
};

/** What a station is called in a cell that stores glycogen or starch at the corridor's head. */
export function stationLabel(id, cellHas, plastid) {
    if (id === 'glucose' && cellHas('GLGP')) return plastid ? 'Starch' : 'Glycogen';
    return null;
}

/** What a station counts in this cell: the polymer's glucosyl units where it stores one. */
export function stationSpecies(id, cellHas) {
    if (id === 'glucose' && cellHas('GLGP')) return [['glycogen', 'cyto']];
    return STATION[id];
}

/** A segment's names in this cell, where its enzymes differ from the map's usual ones: [forward, backward]. */
export function segmentLabels(id, cellHas) {
    if (id === 'g9' && !cellHas('PPCK') && cellHas('PPS')) return [null, 'PPS'];
    return null;
}

/** A segment's names in a cell with fatty-acid synthesis but no β-oxidation: the backward ones, always. */
export function synthesisOnly(cellHas) { return !cellHas('ACAD16') && cellHas('FAS16'); }

const POOL_GLYPH = { atp: 'atp', nadh: 'nadh', nadph: 'nadph' };
/**
 * The pools a reaction makes (+) or spends (−) per turnover, as the map's
 * connection glyphs ('nadh+1'), for its forward and its backward way; sign
 * −1 when the segment is drawn against the reaction.
 */
export function cofactorGlyphs(stoich, sign = 1) {
    const out = [];
    for (const [term, nu] of Object.entries(stoich)) {
        const id = term.replace(/\[[clme]\]$/, '');
        if (!POOL_GLYPH[id]) continue;
        out.push([POOL_GLYPH[id], nu * sign]);
    }
    const fmt = (list) => list.map(([k, n]) => k + (n > 0 ? '+' : '-') + Math.abs(n));
    return [fmt(out), fmt(out.map(([k, n]) => [k, -n]))];
}

/** Drawn complex → the reactions it runs (and a click pulses). */
export const COMPLEX = {
    psii: ['PSII'], ndh1: ['NDH1'], sdh: ['SDH'], cytb6f: ['CYTBF'], cytOx: ['CYTOX'], psi: ['PSI', 'CEF'],
    fnr: ['FNR'], atpSyn: ['ATPS'], br: ['BR'], nnt: ['NNT'], ucp: ['UCP'],
};

/** Each line's switch: the reactions it can knock out (a reaction stays while any of its lines is on). */
export const LINE_REACTIONS = {
    glycolysis: ['HEX1', 'PGI', 'PFK', 'FBA', 'GAPD', 'PGK', 'PGM', 'ENO', 'PYK', 'G6PP', 'FBP', 'PPCK', 'PPS', 'PC', 'GLGS', 'GLGP'],
    ppp: ['G6PDH', 'PGL', 'GND', 'RPI', 'RPE', 'TKT1', 'TALA', 'TKT2', 'PGI'],
    calvin: ['RBPC', 'PRUK', 'SBA', 'SBP', 'GAPDP', 'FBA', 'GAPD', 'PGK', 'FBP', 'RPI', 'RPE', 'TKT1', 'TKT2'],
    krebs: ['CS', 'ACONT', 'ICDH', 'AKGDH', 'SUCOAS', 'SDH', 'FUM', 'MDH', 'PDH'],
    betaox: [...B.flatMap(n => ['ACAD' + n, 'ECH' + n, 'HACD' + n, 'KAT' + n, 'FAS' + n]), 'ACC', 'FACS', 'CPT'],
};

/** The cofactor pools the window draws, by the charged or reduced member and its partners. */
export const POOLS = { atp: ['atp', ['adp', 'amp']], nadh: ['nadh', ['nad']], nadph: ['nadph', ['nadp']] };

export { CHAIN };
