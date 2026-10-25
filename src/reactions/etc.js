// Electron Transport Chain, ATP Synthase, Bacteriorhodopsin, NNT.
// Manages proton pumping, electron flow visualization, and chemiosmotic ATP synthesis.
// How hard each may run against the gradient is energetics.js's, applied by the dispatcher.
import { store, simState, nadpFree } from '../state.js';
import { updateDashboard } from '../dashboard.js';
import Renderer from '../renderer.js';

/** Commit protons a chain in flight will pump downstream, and pump them when it gets there. */
function commit(count) { store.protonsPending += count; }
function land(count, complexKey) { store.protonsPending -= count; pumpProtons(count, complexKey); }

/** Pump protons into the gradient and spawn upward visual particles at the given complex. */
function pumpProtons(count, complexKey) {
    store.protonGradient += count; store.protonsPumped += count;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const cx = Renderer.etcComplexes[complexKey]?.cx;
            if (cx) Renderer.spawnProton(cx, 'up');
        }, i * 150);
    }
}

/**
 * Advance one ETC step. Three pathways:
 *   etc_resp  — respiratory (NADH/FADH2 → O2, pumps H+)
 *   etc_photo — linear photosynthetic (H2O → NADPH, pumps H+)
 *   etc_cyclic — cyclic photosynthetic (pumps H+ only, no net redox)
 */
export function advanceETC(pathway, stepIndex) {
    if (pathway === 'etc_resp') {
        if (!simState.oxygenAvailable || !simState.oxphosEnabled) return false;
        let src = null;
        // stepIndex 1 = Complex II (FADH2 entry); stepIndex 0 = Complex I (NADH entry);
        // default = prefer NADH, fall back to FADH2
        if (stepIndex === 1) {
            if (store.fadh2 > 0) { store.fadh2--; src = 'sdh'; }
            else return false;
        } else if (stepIndex === 0) {
            if (store.nadh > 0) { store.nadh--; src = 'ndh1'; pumpProtons(4, 'ndh1'); }
            else return false;
        } else {
            if (store.nadh > 0) { store.nadh--; src = 'ndh1'; pumpProtons(4, 'ndh1'); }
            else if (store.fadh2 > 0) { store.fadh2--; src = 'sdh'; }
        }
        if (src) {
            commit(6);
            store.electronsTransferred += 2;
            // ~2% electron leak at Complex I produces superoxide
            if (src === 'ndh1' && Math.random() < 0.02) { store.rosProduced++; }
            // Multi-hop electron chain: src → PQ → Cyt b6f → PC → Cyt c Oxidase
            Renderer.spawnElectronChain([src, 'pq', 'cytb6f', 'pc', 'cytOx'], 'resp', {
                2: () => {
                    land(4, 'cytb6f'); updateDashboard();
                    // ~2% electron leak at the Q-cycle
                    if (Math.random() < 0.02) { store.rosProduced++; }
                },
                3: () => { land(2, 'cytOx'); store.o2Consumed += 0.5; store.h2oProduced++; updateDashboard(); },
            });
            return true;
        }
    } else if (pathway === 'etc_photo') {
        // Linear (Z-scheme): PSII splits H2O, electrons flow to PSI, FNR reduces NADP+.
        // Electrons leave PSII only with an NADP⁺ to land on, held for them at FNR.
        if (!simState.lightOn || !simState.linearLightEnabled || nadpFree() < 1) return false;
        store.nadpBound++; commit(4);
        store.h2oSplit++; store.o2Produced += 0.5; store.electronsTransferred += 2;
        pumpProtons(2, 'psii');
        Renderer.spawnPhoton('psii');
        Renderer.spawnElectronChain(['psii', 'pq', 'cytb6f', 'pc', 'psi', 'fd', 'fnr'], 'photo', {
            2: () => {
                land(4, 'cytb6f'); updateDashboard();
                if (Math.random() < 0.02) { store.rosProduced++; }
            },
            4: () => { Renderer.spawnPhoton('psi'); },
            5: () => {
                store.nadpBound--; store.nadph++; Renderer.poolEvent('nadph', 1, 'fnr');
                updateDashboard();
            },
        });
        return true;
    } else if (pathway === 'etc_cyclic') {
        // Cyclic electron flow around PSI: pumps H+ without net NADPH production
        if (!simState.lightOn || !simState.cyclicLightEnabled) return false;
        store.electronsTransferred += 2; commit(4);
        Renderer.spawnPhoton('psi');
        Renderer.spawnElectronChain(['psi', 'fd', 'pq', 'cytb6f', 'pc', 'psi'], 'cyclic', {
            2: () => { land(4, 'cytb6f'); updateDashboard(); },
        });
        return true;
    }
    return false;
}

/** ATP Synthase: 4 H+ flow down gradient → 1 ATP (chemiosmotic coupling); run backward,
 *  it splits an ATP to pump 4 H+ out, as fermenting cells do to keep a gradient. */
export function advanceATPSynthase(direction) {
    if (direction === 'reverse') {
        if (store.atp < 1) return false;
        store.atp--; store.atpHydrolyzed++;
        pumpProtons(4, 'atpSyn');
        return true;
    }
    if (store.protonGradient >= 4 && store.atp < store.totalAtpAdp) {
        store.protonGradient -= 4; store.atp++; store.atpOxidative++;
        const cx = Renderer.etcComplexes.atpSyn?.cx;
        if (cx) for (let i = 0; i < 4; i++) setTimeout(() => Renderer.spawnProton(cx, 'down'), i * 350);
        return true;
    }
    return false;
}

/** Bacteriorhodopsin: archaeal light-driven proton pump (1 H+ per photon absorbed) */
export function advanceBacteriorhodopsin() {
    if (!simState.lightOn) return false;
    store.protonGradient += 1; store.protonsPumped += 1;
    Renderer.spawnPhoton('br');
    const cx = Renderer.etcComplexes.br?.cx;
    if (cx) Renderer.spawnProton(cx, 'up');
    return true;
}

/** NNT (transhydrogenase): uses 1 H+ to convert NADH → NADPH */
export function advanceNNT() {
    if (store.protonGradient < 1 || store.nadh < 1 || nadpFree() < 1) return false;
    store.protonGradient -= 1;
    store.nadh -= 1;
    store.nadph += 1;
    const cx = Renderer.etcComplexes.nnt?.cx;
    if (cx) Renderer.spawnProton(cx, 'down');
    return true;
}
