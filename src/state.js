// The app's state: its flags, and the picture the window draws. The cell's
// chemistry lives in the engine (src/engine/, held by cell.js); `store` is
// only what panel a shows of it, written by window.js and read by the
// drawing, so nothing on screen can feed back into the model.

// ─── Flags ───
export const simState = {
    time: 0,                    // wall seconds the scene has run (drawing only)
    autoPlay: true,             // the model clock runs
    lightOn: true, oxygenAvailable: true, uncouplingEnabled: false,   // mirrors of the environment and the UCP switch
    activeOrganism: 'cyanobacterium',
    specimen: 'thylakoid',
    lockedPathways: {},         // line → why this cell has none of it
    visualLightMode: true,
};

// ─── The picture ───
// Pool counts in the drawn slab (the charged or reduced member, and the total), the stations'
// counts, the lumen's protons (one per 2 mV of Δp), the sampled events' tallies (ATP made and
// split at the drawn ATP synthase, O₂ made and used, protons leaked, radicals made and taken)
// and the membrane's health
export const store = {
    atp: 0, totalAtpAdp: 0, nadh: 0, totalNad: 0, nadph: 0, totalNadp: 0, fadh2: 0, totalFad: 0,
    protonGradient: 0, atpOxidative: 0, atpHydrolyzed: 0, o2Produced: 0, o2Consumed: 0, protonsLeaked: 0,
    rosProduced: 0, rosScavenged: 0, cellHealth: 100,
};

// ─── Sparkline histories ───
// 300 samples at 5 Hz = 60-second sliding window per metric (ring buffers)
const _history = (cap) => ({ data: new Float32Array(cap), head: 0, count: 0, cap });
export function pushSample(h, v) { h.data[h.head] = v; h.head = (h.head + 1) % h.cap; if (h.count < h.cap) h.count++; }
export const histories = {
    atp: _history(300),
    nadh: _history(300),
    nadph: _history(300),
    gradient: _history(300),
};
export function clearHistories() { for (const h of Object.values(histories)) { h.head = 0; h.count = 0; h.data.fill(0); } }
