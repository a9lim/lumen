// Network — every reaction the engine knows, as data. Each one is a single
// enzyme's reaction (VISION.md: identities first): hexokinase and glucose-6-
// phosphatase, PFK and FBPase, PK and PC + PEPCK, the two GAPDHs, β-oxidation
// and fatty-acid synthesis are all separate rows, never one row run backward.
//
// An equation names species by their ids in species.js. A bare species lives
// in the reaction's home compartment (`at`: 'cyto', or 'mito' for the
// mitochondrial matrix); a tag places it elsewhere: [c] the cytosol, [m] the
// matrix, [l] the lumen side of the drawn membrane, [e] the medium. Gases and
// permeant species always live in the cytosol, and in a cell without a
// separate matrix 'mito' is the cytosol too (cells.js). h[l] is the pool of
// protons translocated across the drawn membrane: the proton-motive force.
// Every equation balances in elements and charge against BiGG's formulas, at
// the protonation BiGG gives; buffered H⁺ and water are left out of rates.
//
// Fields: id, enzyme (the short name the map and tooltips use), name, eq,
// at, and what the cells and the rates add later (cells.js, rates.js).
import { ACYL, CHAIN } from './species.js';

export const REACTIONS = {};
function R(id, enzyme, name, eq, extra = {}) {
    REACTIONS[id] = { id, enzyme, name, eq, at: 'cyto', ...extra, stoich: parse(eq) };
}

/** 'a + 2 b[l] -> c' → { 'a': -1, 'b[l]': -2, 'c': 1 } (keys keep their tags). */
export function parse(eq) {
    const [lhs, rhs] = eq.split('->');
    const out = {};
    const side = (s, sign) => {
        for (const term of s.split(' + ')) {
            // A coefficient is a number and a space: ids may start with digits (13dpg, 3pg)
            const m = /^\s*(?:(\d+(?:\.\d+)?)\s+)?([\w.]+(?:\[[clme]\])?)\s*$/.exec(term);
            if (!m) throw new Error('bad term ' + JSON.stringify(term) + ' in ' + eq);
            out[m[2]] = (out[m[2]] || 0) + sign * (m[1] ? +m[1] : 1);
        }
    };
    side(lhs, -1); side(rhs, 1);
    for (const k in out) if (out[k] === 0) delete out[k];
    return out;
}

// ─── Glycolysis and gluconeogenesis ───
R('HEX1', 'HK', 'Hexokinase', 'glc__D + atp -> g6p + adp + h');
R('G6PP', 'G6Pase', 'Glucose-6-phosphatase', 'g6p + h2o -> glc__D + pi');
R('PGI', 'PGI', 'Phosphoglucose isomerase', 'g6p -> f6p');
R('PFK', 'PFK', 'Phosphofructokinase', 'f6p + atp -> fdp + adp + h');
R('FBP', 'FBPase', 'Fructose-1,6-bisphosphatase', 'fdp + h2o -> f6p + pi');
// Aldolase and triose phosphate isomerase as one step: the model has no separate DHAP
R('FBA', 'ALDO', 'Aldolase and triose phosphate isomerase', 'fdp -> 2 g3p');
R('GAPD', 'GAPDH', 'Glyceraldehyde-3-phosphate dehydrogenase', 'g3p + nad + pi -> 13dpg + nadh + h');
// The NADP-linked GAPDH of the Calvin cycle (and of phototrophs' gluconeogenesis), written oxidatively
R('GAPDP', 'GAPDH', 'NADP-glyceraldehyde-3-phosphate dehydrogenase', 'g3p + nadp + pi -> 13dpg + nadph + h');
R('PGK', 'PGK', 'Phosphoglycerate kinase', '13dpg + adp -> 3pg + atp');
R('PGM', 'PGM', 'Phosphoglycerate mutase', '3pg -> 2pg');
R('ENO', 'ENO', 'Enolase', '2pg -> pep + h2o');
R('PYK', 'PK', 'Pyruvate kinase', 'pep + adp + h -> pyr + atp');
// Glycogen (cyanobacteria) or starch (plastids): made through ADP-glucose, broken by phosphorylase
R('GLGS', 'GlgA', 'Glycogen (starch) synthesis', 'g6p + atp -> glycogen + adp + ppi');
R('GLGP', 'GlgP', 'Glycogen (starch) phosphorylase', 'glycogen + pi -> g6p');
// The bypasses around PK: pyruvate carboxylase (in the matrix where there is one), PEP carboxykinase (GTP counted as ATP)
R('PC', 'PC', 'Pyruvate carboxylase', 'pyr + atp + co2 + h2o -> oaa + adp + pi + 2 h', { at: 'mito' });
R('PPCK', 'PEPCK', 'PEP carboxykinase', 'oaa + atp -> pep + co2 + adp');
R('PPS', 'PPS', 'PEP synthetase', 'pyr + atp + h2o -> pep + amp + pi + 2 h');
// Anaplerosis in cyanobacteria and plants
R('PPC', 'PEPC', 'PEP carboxylase', 'pep + co2 + h2o -> oaa + pi + h');

// ─── Fermentation and salvage ───
R('LDH', 'LDH', 'Lactate dehydrogenase', 'pyr + nadh + h -> lac__L + nad');
R('PDC', 'PDC', 'Pyruvate decarboxylase', 'pyr + h -> acald + co2');
R('ADH', 'ADH', 'Alcohol dehydrogenase', 'acald + nadh + h -> etoh + nad');
R('ALDH', 'ALDH', 'Aldehyde dehydrogenase', 'acald + nad + h2o -> ac + nadh + 2 h');
R('ACS', 'ACS', 'Acetyl-CoA synthetase', 'ac + atp + coa -> accoa + amp + ppi', { at: 'mito' });
R('PDH', 'PDH', 'Pyruvate dehydrogenase', 'pyr + coa + nad -> accoa + co2 + nadh', { at: 'mito' });

// ─── Pentose phosphate pathway ───
R('G6PDH', 'G6PDH', 'Glucose-6-phosphate dehydrogenase', 'g6p + nadp -> 6pgl + nadph + h');
R('PGL', '6PGL', '6-Phosphogluconolactonase', '6pgl + h2o -> 6pgc + h');
R('GND', '6PGDH', '6-Phosphogluconate dehydrogenase', '6pgc + nadp -> ru5p__D + co2 + nadph');
R('RPI', 'RPI', 'Ribose-5-phosphate isomerase', 'r5p -> ru5p__D');
R('RPE', 'RPE', 'Ribulose-5-phosphate epimerase', 'ru5p__D -> xu5p__D');
R('TKT1', 'TKT', 'Transketolase', 'r5p + xu5p__D -> g3p + s7p');
R('TALA', 'TAL', 'Transaldolase', 'g3p + s7p -> e4p + f6p');
R('TKT2', 'TKT', 'Transketolase', 'e4p + xu5p__D -> f6p + g3p');

// ─── Calvin cycle ───
R('RBPC', 'RuBisCO', 'Ribulose-1,5-bisphosphate carboxylase/oxygenase', 'rb15bp + co2 + h2o -> 2 3pg + 2 h');
R('PRUK', 'PRK', 'Phosphoribulokinase', 'ru5p__D + atp -> rb15bp + adp + h');
R('SBA', 'ALDO', 'Aldolase (on E4P and DHAP)', 'e4p + g3p -> s17bp');
R('SBP', 'SBPase', 'Sedoheptulose-1,7-bisphosphatase', 's17bp + h2o -> s7p + pi');

// ─── Krebs cycle (in the matrix) ───
R('CS', 'CS', 'Citrate synthase', 'accoa + oaa + h2o -> cit + coa + h', { at: 'mito' });
R('ACONT', 'ACO', 'Aconitase', 'cit -> icit', { at: 'mito' });
R('ICDH', 'IDH', 'Isocitrate dehydrogenase', 'icit + nad -> akg + co2 + nadh', { at: 'mito' });
R('AKGDH', 'KGDH', 'α-Ketoglutarate dehydrogenase', 'akg + coa + nad -> succoa + co2 + nadh', { at: 'mito' });
R('SUCOAS', 'SCS', 'Succinyl-CoA synthetase (GTP counted as ATP)', 'succoa + adp + pi -> succ + coa + atp', { at: 'mito' });
// Complex II: its FAD is bound, and it hands the electrons straight to the quinone pool
R('SDH', 'SDH', 'Succinate dehydrogenase (complex II)', 'succ + q8 -> fum + q8h2', { at: 'mito', membrane: 'sdh' });
R('FUM', 'FUM', 'Fumarase', 'fum + h2o -> mal__L', { at: 'mito' });
R('MDH', 'MDH', 'Malate dehydrogenase', 'mal__L + nad -> oaa + nadh + h', { at: 'mito' });

// ─── β-oxidation, one reaction per chain length (C16 → C4); the acyl-CoA
// dehydrogenase's FAD hands its electrons to ETF, and ETF:quinone
// oxidoreductase in the membrane passes them to the quinone pool ───
CHAIN.forEach((n, i) => {
    const a = ACYL.acyl[i], e = ACYL.enoyl[i], h = ACYL.hydroxy[i], k = ACYL.keto[i];
    R('ACAD' + n, 'ACAD', 'Acyl-CoA dehydrogenase', `${a} + etfox -> ${e} + etfred`, { at: 'mito', group: 'ACAD', chain: n });
    R('ECH' + n, 'ECH', 'Enoyl-CoA hydratase', `${e} + h2o -> ${h}`, { at: 'mito', group: 'ECH', chain: n });
    R('HACD' + n, 'HACD', '3-Hydroxyacyl-CoA dehydrogenase', `${h} + nad -> ${k} + nadh + h`, { at: 'mito', group: 'HACD', chain: n });
    R('KAT' + n, 'Thiolase', '3-Ketoacyl-CoA thiolase', n === 4 ? `${k} + coa -> 2 accoa` : `${k} + coa -> ${ACYL.acyl[i + 1]} + accoa`, { at: 'mito', group: 'KAT', chain: n });
});
R('ETFQO', 'ETF-QO', 'ETF:quinone oxidoreductase', 'etfred + q8 -> etfox + q8h2', { at: 'mito' });

// ─── Fatty-acid synthesis: a separate pathway on its own enzymes, which the
// model lumps per elongation round (condensation, reduction, dehydration,
// reduction) and runs on the same acyl-CoA species for want of ACP ───
R('ACC', 'ACC', 'Acetyl-CoA carboxylase', 'accoa + atp + co2 + h2o -> malcoa + adp + pi + 2 h');
R('FAS4', 'FAS', 'Fatty-acid synthase, first round', 'accoa + malcoa + 2 nadph + 3 h -> btcoa + co2 + coa + 2 nadp + h2o', { group: 'FAS', chain: 4 });
CHAIN.slice(1).forEach((n, j) => {
    const from = ACYL.acyl[CHAIN.indexOf(n)], to = ACYL.acyl[CHAIN.indexOf(n) - 1];
    R('FAS' + (n + 2), 'FAS', 'Fatty-acid synthase, one round', `${from} + malcoa + 2 nadph + 3 h -> ${to} + co2 + coa + 2 nadp + h2o`, { group: 'FAS', chain: n + 2 });
});
R('FACS', 'ACSL', 'Long-chain acyl-CoA synthetase', 'hdca + atp + coa -> pmtcoa + amp + ppi');

// ─── Housekeeping ───
R('ADK', 'ADK', 'Adenylate kinase', 'amp + atp -> 2 adp');
R('PPA', 'PPase', 'Inorganic pyrophosphatase', 'ppi + h2o -> 2 pi + h');
// The matrix's own, for the AMP and PPᵢ that its acyl-CoA synthetases make
R('ADKm', 'ADK', 'Adenylate kinase (matrix)', 'amp + atp -> 2 adp', { at: 'mito' });
R('PPAm', 'PPase', 'Inorganic pyrophosphatase (matrix)', 'ppi + h2o -> 2 pi + h', { at: 'mito' });
// The cell's ATP demand: the work it does that the model doesn't draw (ion pumps, motility, turnover)
R('ATPM', 'ATPase', 'ATP demand (maintenance)', 'atp + h2o -> adp + pi + h', { demand: 'atp' });
// Biosynthetic demand: the precursors one gram of dry cell is built from, per gram, mmol. E. coli's
// core biomass (BiGG e_coli_core, BIOMASS_Ecoli_core_w_GAM) with its nitrogen folded back onto
// carbon: each glutamate made from α-KG by NADPH (GDH), each glutamine from that glutamate by ATP
// (GS), so α-KG, NADPH and ATP carry the cost. The carbon and phosphorus leave the network: a sink.
R('BIOMASS', 'to the cell', 'Biosynthetic demand (E. coli core composition)',
    '1.496 3pg + 3.7478 accoa[m] + 60.0657 atp + 0.361 e4p + 0.0709 f6p + 0.129 g3p + 0.205 g6p + 1.0789 akg[m] + '
    + '1.7867 oaa[m] + 0.5191 pep + 2.8328 pyr + 0.8977 r5p + 3.547 nad + 18.225 nadph + 60.0657 h2o -> '
    + '60.0657 adp + 60.0657 pi + 3.7478 coa[m] + 3.547 nadh + 18.225 nadp', { demand: 'growth', sink: true });

// ─── The drawn membrane ───
R('NDH1', 'NDH-1', 'NADH dehydrogenase (complex I)', 'nadh + q8 + 5 h -> nad + q8h2 + 4 h[l]', { at: 'mito', membrane: 'ndh1' });
// Cyanobacterial NDH-1 takes ferredoxin, not NADH (Schuller et al. 2019, 10.1126/science.aau3613); four
// protons per two electrons, like complex I, is inferred rather than measured. It serves respiration (with
// FNR run backward from NADPH) and cyclic flow. NDH-2 (NdbA–C) passes NADH to the quinone pool without
// pumping; in Synechocystis it is minor and regulatory (Howitt et al. 1999, 10.1128/JB.181.13.3994-4003.1999)
R('NDH1F', 'NDH-1', 'NDH-1 (ferredoxin:plastoquinone oxidoreductase)', '2 fdred + q8 + 6 h -> 2 fdox + q8h2 + 4 h[l]', { membrane: 'ndh1' });
R('NDH2', 'NDH-2', 'Type II NADH dehydrogenase', 'nadh + q8 + h -> nad + q8h2');
// Cytochrome b₆f or bc₁: the Q-cycle moves four protons for every two electrons
R('CYTBF', 'cyt b₆f', 'Cytochrome b₆f / bc₁ complex', 'q8h2 + 2 pcox[l] + 2 h -> q8 + 2 pcred[l] + 4 h[l]', { at: 'mito', membrane: 'cytb6f' });
// Written per two electrons, like the chain's other steps, so no carrier saturates to a high power
R('CYTOX', 'cyt oxidase', 'Cytochrome c oxidase (complex IV)', '2 pcred[l] + 0.5 o2 + 4 h -> 2 pcox[l] + h2o + 2 h[l]', { at: 'mito', membrane: 'cytOx' });
// Photosystems run on absorbed light (rates.js): two photons for PSII's two electrons, one for PSI's
R('PSII', 'PSII', 'Photosystem II', 'h2o + q8 + 2 h -> 0.5 o2 + q8h2 + 2 h[l]', { membrane: 'psii', photons: 2, nm: 680 });
R('PSI', 'PSI', 'Photosystem I', 'pcred[l] + fdox -> pcox[l] + fdred', { membrane: 'psi', photons: 1, nm: 700 });
R('FNR', 'FNR', 'Ferredoxin–NADP⁺ reductase', '2 fdred + nadp + h -> 2 fdox + nadph', { membrane: 'fnr' });
R('CEF', 'PGR5', 'Cyclic electron flow (ferredoxin to the quinone pool)', '2 fdred + q8 + 2 h -> 2 fdox + q8h2', { membrane: 'psi' });
R('MEHLER', 'Flv', 'Water–water cycle (ferredoxin to O₂)', '2 fdred + 0.5 o2 + 2 h -> 2 fdox + h2o', { membrane: 'psi' });
R('BR', 'BR', 'Bacteriorhodopsin', 'h -> h[l]', { membrane: 'br', photons: 1, nm: 568 });
// Twelve c subunits and three ATP a turn: four protons per ATP; each cell's ring sets its own (model.js)
R('ATPS', 'ATP synthase', 'ATP synthase', 'adp + pi + 4 h[l] -> atp + h2o + 3 h', { at: 'mito', membrane: 'atpSyn' });
R('NNT', 'NNT', 'Nicotinamide nucleotide transhydrogenase', 'nadh + nadp + h[l] -> nad + nadph + h', { at: 'mito', membrane: 'nnt' });
R('LEAK', 'leak', 'Proton leak across the bilayer', 'h[l] -> h', { at: 'mito' });
// Off until the uncoupling switch turns it on
R('UCP', 'UCP', 'Uncoupling protein', 'h[l] -> h', { at: 'mito', membrane: 'ucp', off: true });
// Counter-ions (K⁺ out of the lumen side, or Cl⁻ in) carry charge without protons, so Δψ relaxes
// into ΔpH; K⁺/H⁺ exchange moves a proton without charge, so ΔpH relaxes into Δψ. Their two
// conductances set how Δp divides (engine.js): mostly Δψ in mitochondria and bacteria, mostly
// ΔpH in thylakoids (Kramer et al. 2003)
R('ION', 'channels', 'Counter-ion channels (K⁺, Cl⁻)', 'k[l] -> k', { at: 'mito' });
R('KHE', 'KHE', 'K⁺/H⁺ exchange', 'h[l] + k -> h + k[l]', { at: 'mito' });

// ─── Reactive oxygen: the chain's leaks and the scavengers, in the matrix where there is one ───
// Complex I, and the Q-cycle's semiquinone at the Qo site (one electron to O₂, the other on to cytochrome c)
R('ROSI', 'leak', 'Superoxide from complex I', 'nadh + 2 o2 -> nad + 2 o2s + h', { at: 'mito', ros: 'ndh1' });
// (the Qo site releases its quinol's protons on the lumen side)
R('ROSQ', 'leak', 'Superoxide from the Q-cycle', 'q8h2 + o2 + pcox[l] -> q8 + o2s + pcred[l] + 2 h[l]', { at: 'mito', ros: 'cytb6f' });
R('SOD', 'SOD', 'Superoxide dismutase', '2 o2s + 2 h -> h2o2 + o2', { at: 'mito' });
R('CAT', 'CAT', 'Catalase', '2 h2o2 -> 2 h2o + o2', { at: 'mito' });
// Glutathione peroxidase, with glutathione reductase spending the NADPH
R('GPX', 'GPx', 'Glutathione peroxidase', 'h2o2 + nadph + h -> 2 h2o + nadp', { at: 'mito' });
// Repairing peroxidised membrane costs ATP (engine.js sets its rate from the damage)
R('REPAIR', 'repair', 'Membrane repair', 'atp + h2o -> adp + pi + h', { at: 'mito', demand: 'repair' });

// ─── Between the cytosol and the matrix (cells that have one), lumped:
// their carriers' anatomy and charges wait for milestone 3 ───
// z: charge moved to the lumen side (here the cytosol's) besides what the equation's lumen species
// carry, for carriers whose charges cross between the cytosol and the matrix (engine.js)
// The pyruvate and phosphate carriers symport a proton electroneutrally, so only ΔpH drives them;
// ANT swaps ATP⁴⁻ out for ADP³⁻ in, one charge, so only Δψ drives it
R('MPC', 'MPC', 'Mitochondrial pyruvate carrier', 'pyr[c] + h[l] -> pyr[m] + h[m]', { transport: true, z: 1 });
R('ANT', 'ANT', 'Adenine nucleotide translocase', 'atp[m] + adp[c] -> atp[c] + adp[m]', { transport: true, z: -1 });
R('PIC', 'PiC', 'Phosphate carrier', 'pi[c] + h[l] -> pi[m] + h[m]', { transport: true, z: 1 });
R('MAS', 'MAS', 'Malate–aspartate shuttle (NADH into the matrix)', 'nadh[c] + nad[m] + h[l] -> nad[c] + nadh[m] + h[m]', { transport: true });
R('OAAX', 'OAA out', 'Oxaloacetate out of the matrix, as malate', 'oaa[m] + nadh[m] + nad[c] -> oaa[c] + nad[m] + nadh[c]', { transport: true });
R('CPT', 'CPT', 'Carnitine shuttle (palmitoyl-CoA into the matrix)', 'pmtcoa[c] + coa[m] -> pmtcoa[m] + coa[c]', { transport: true });

// ─── Exchange with the medium ───
R('EX_glc', 'GLUT', 'Glucose uptake', 'glc__D[e] -> glc__D[c]', { exchange: true });
R('EX_fa', 'FAT', 'Fatty-acid uptake', 'hdca[e] -> hdca[c]', { exchange: true });
R('EX_o2', 'O₂', 'Oxygen exchange', 'o2[e] -> o2[c]', { exchange: true });
R('EX_co2', 'CO₂', 'Carbon dioxide exchange', 'co2[e] -> co2[c]', { exchange: true });
R('EX_pi', 'Pᵢ', 'Phosphate uptake', 'pi[e] -> pi[c]', { exchange: true });
R('EX_lac', 'MCT', 'Lactate export', 'lac__L[c] -> lac__L[e]', { exchange: true });
R('EX_etoh', 'EtOH', 'Ethanol export', 'etoh[c] -> etoh[e]', { exchange: true });
R('EX_ac', 'Ac', 'Acetate export', 'ac[c] -> ac[e]', { exchange: true });
// A plastid's ATP/ADP translocator: the medium of a chloroplast is its plant cell's cytosol
R('NTT', 'NTT', 'Plastid ATP/ADP translocator', 'atp[e] + adp[c] -> atp[c] + adp[e]', { exchange: true });
// A plastid's product goes to the cell: triose phosphate out for phosphate in
R('TPT', 'TPT', 'Triose phosphate/phosphate translocator', 'g3p[c] + pi[e] -> g3p[e] + pi[c]', { exchange: true, demand: 'export' });
