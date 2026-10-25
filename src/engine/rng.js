// Seeded randomness. The chemistry itself is deterministic; randomness only
// samples what the window draws (which centre turns over, which molecule
// docks), each consumer on its own stream, so a replay with the same seed
// draws the same picture and display noise never reaches the model.

/** A 32-bit generator (mulberry32): rng() in [0, 1). */
export function makeRng(seed) {
    let a = seed >>> 0;
    const rng = () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    /** An independent stream for a named consumer, derived from this seed. */
    rng.stream = (name) => {
        let h = seed >>> 0;
        for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193) >>> 0;
        return makeRng(h);
    };
    /** Exponential waiting time at rate k (per unit time). */
    rng.wait = (k) => k > 0 ? -Math.log(1 - rng()) / k : Infinity;
    return rng;
}
