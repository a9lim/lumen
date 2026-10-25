// Beta-oxidation / fatty acid synthesis — 4-step spiral cleaving 2C units.
// Forward (catabolic): uses FAD + NAD+, produces acetyl-CoA per round.
// Reverse (anabolic): uses NADPH + ATP, builds fatty acid chain.
// 7 rounds fully oxidize palmitoyl-CoA (C16) to 8 acetyl-CoA. Each molecule
// on the spiral carries its chain length (state.js acyl), so a round
// shortens the chain by the two carbons it releases.
import { store, simState, counters, acyl } from '../state.js';

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const C = n => 'C' + String(n).replace(/\d/g, d => SUB[d]);

/** Take a fatty acyl-CoA off the entry station: a shortened one if any, else palmitoyl-CoA. */
function takeAcyl() {
    if (acyl.short.length > store.fattyAcid) acyl.short.length = store.fattyAcid;
    store.fattyAcid--;
    return acyl.short.length ? acyl.short.shift() : 16;
}

/** Put a fatty acyl-CoA of n carbons back on the entry station. */
function putAcyl(n) {
    store.fattyAcid++;
    if (n < 16) acyl.short.push(n);
}

// The three intermediates: one length per molecule, mirrored into the store's counts
function sync() { store.enoylCoA = acyl.enoyl.length; store.hydroxyCoA = acyl.hydroxy.length; store.ketoCoA = acyl.keto.length; }
function put(stage, n) { acyl[stage].push(n); sync(); return n; }
function take(stage) { const n = acyl[stage].shift(); sync(); return n; }

export function advanceBetaOx(idx, direction) {
    if (!simState.betaoxEnabled) return false;
    const fwd = direction !== 'reverse';
    const rev = direction !== 'forward';

    if (idx === 0) {
        // ACAD (fwd): Acyl-CoA dehydrogenase — FAD-linked oxidation
        if (fwd && store.fattyAcid > 0 && store.fadh2 < store.totalFad) {
            const n = put('enoyl', takeAcyl()); store.fadh2++;
            return { enzyme: 'ACAD', reaction: `${C(n)} acyl-CoA + FAD → ${C(n)} enoyl-CoA + FADH₂`, yields: { fadh2: 1 } };
        // ACC+ER (rev): Enoyl reductase — NADPH-dependent reduction + ATP-dependent carboxylation
        } else if (rev && acyl.enoyl.length > 0 && store.nadph > 0 && store.atp > 0) {
            const n = take('enoyl'); putAcyl(n); store.nadph--; store.atp--;
            return { enzyme: 'ACC+ER', reaction: `${C(n)} enoyl-CoA + NADPH + ATP → ${C(n)} acyl-CoA + NADP⁺ + ADP`, yields: { nadphConsume: 1, atpConsume: 1 } };
        }
    }
    else if (idx === 1) {
        // ECH (fwd): Enoyl-CoA hydratase — hydration
        if (fwd && acyl.enoyl.length > 0) {
            const n = put('hydroxy', take('enoyl'));
            return { enzyme: 'ECH', reaction: `${C(n)} enoyl-CoA + H₂O → ${C(n)} OH-acyl-CoA`, yields: null };
        // DH (rev): Dehydratase — dehydration
        } else if (rev && acyl.hydroxy.length > 0) {
            const n = put('enoyl', take('hydroxy'));
            return { enzyme: 'DH', reaction: `${C(n)} OH-acyl-CoA → ${C(n)} enoyl-CoA + H₂O`, yields: null };
        }
    }
    else if (idx === 2) {
        // HACD (fwd): 3-Hydroxyacyl-CoA DH — NAD+-linked oxidation
        if (fwd && acyl.hydroxy.length > 0 && store.nadh < store.totalNad) {
            const n = put('keto', take('hydroxy')); store.nadh++;
            return { enzyme: 'HACD', reaction: `${C(n)} OH-acyl-CoA + NAD⁺ → ${C(n)} keto-CoA + NADH`, yields: { nadh: 1 } };
        // KR (rev): Ketoacyl reductase — NADPH-dependent reduction
        } else if (rev && acyl.keto.length > 0 && store.nadph > 0) {
            const n = put('hydroxy', take('keto')); store.nadph--;
            return { enzyme: 'KR', reaction: `${C(n)} keto-CoA + NADPH → ${C(n)} OH-acyl-CoA + NADP⁺`, yields: { nadphConsume: 1 } };
        }
    }
    else if (idx === 3) {
        // Thiolase (fwd): thiolytic cleavage releases one acetyl-CoA, shortens chain by 2C;
        // the last round splits acetoacetyl-CoA (C4) into two
        if (fwd && acyl.keto.length > 0) {
            const n = take('keto');
            if (n <= 4) {
                store.acetylCoA += 2;
                return { enzyme: 'Thiolase', reaction: 'Acetoacetyl-CoA + CoA → 2 Acetyl-CoA', yields: null };
            }
            putAcyl(n - 2); store.acetylCoA++;
            return { enzyme: 'Thiolase', reaction: `${C(n)} keto-CoA + CoA → ${C(n - 2)} acyl-CoA + Acetyl-CoA`, yields: null };
        // KAS (rev): Ketoacyl synthase — condensation extends chain by 2C at ATP cost.
        // It extends the longest chain short of C16, or starts one from two acetyl-CoA.
        } else if (rev && store.atp > 0 && store.acetylCoA > 0) {
            if (acyl.short.length > store.fattyAcid) acyl.short.length = store.fattyAcid;
            if (acyl.short.length) {
                const i = acyl.short.indexOf(Math.max(...acyl.short)), n = acyl.short.splice(i, 1)[0];
                store.fattyAcid--; store.acetylCoA--; store.atp--; put('keto', n + 2);
                return { enzyme: 'KAS', reaction: `${C(n)} acyl-CoA + Acetyl-CoA + ATP → ${C(n + 2)} keto-CoA + ADP`, yields: { atpConsume: 1 } };
            }
            if (store.acetylCoA >= 2) {
                store.acetylCoA -= 2; store.atp--; put('keto', 4);
                return { enzyme: 'KAS', reaction: '2 Acetyl-CoA + ATP → Acetoacetyl-CoA + ADP', yields: { atpConsume: 1 } };
            }
        }
    }
    return false;
}

/** Batch: the rounds that oxidize one fatty acyl-CoA (palmitoyl-CoA: 8 Acetyl-CoA + 7 FADH2 + 7 NADH) */
export function runBetaOxCycle() {
    if (!simState.betaoxEnabled || store.fattyAcid < 1) return false;
    if (acyl.short.length > store.fattyAcid) acyl.short.length = store.fattyAcid;
    // Palmitoyl-CoA if there is one, else the first chain the spiral has shortened
    const n = store.fattyAcid > acyl.short.length ? 16 : acyl.short[0], t = n / 2 - 1;
    if (store.totalFad - store.fadh2 < t || store.totalNad - store.nadh < t) return false;
    if (n === 16) store.fattyAcid--; else takeAcyl();
    store.acetylCoA += n / 2;
    store.fadh2 += t;
    store.nadh += t;
    counters.betaoxRuns++;
    const from = n === 16 ? 'Palmitoyl-CoA' : `${C(n)} acyl-CoA`;
    return { enzyme: `β-Oxidation (×${t})`, reaction: `${from} → ${n / 2} Acetyl-CoA + ${t} FADH₂ + ${t} NADH`, yields: { fadh2: t, nadh: t } };
}

/** Batch: de novo fatty acid synthesis (8 Acetyl-CoA + 14 NADPH + 14 ATP → Palmitoyl-CoA).
 *  Uses different cofactors than degradation: NADPH (not NADH/FADH2) and ATP. */
export function runBetaOxReverse() {
    if (!simState.betaoxEnabled) return false;
    if (store.acetylCoA < 8 || store.nadph < 14 || store.atp < 14) return false;
    store.acetylCoA -= 8;
    store.nadph -= 14;
    store.atp -= 14;
    store.fattyAcid++;
    return { enzyme: 'FA synthesis (×7)', reaction: '8 Acetyl-CoA + 14 NADPH + 14 ATP → Palmitoyl-CoA', yields: { nadphConsume: 14, atpConsume: 14 } };
}
