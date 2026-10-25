// Model-time events: a priority queue of things due at a model time (a
// sampled centre's next turnover, a pulse wearing off). The engine pops them
// as its clock passes; the renderer only watches. A reset clears the queue,
// so nothing scheduled before it lands after.

export class EventQueue {
    constructor() { this.heap = []; this.seq = 0; }
    get size() { return this.heap.length; }
    clear() { this.heap.length = 0; }
    /** Schedule fn at model time t; ties keep the order they were scheduled in. */
    at(t, fn, tag) {
        const h = this.heap, e = { t, fn, tag, n: this.seq++ };
        h.push(e);
        for (let i = h.length - 1; i > 0;) {
            const p = (i - 1) >> 1;
            if (less(h[p], h[i])) break;
            [h[p], h[i]] = [h[i], h[p]]; i = p;
        }
        return e;
    }
    peek() { return this.heap[0]; }
    pop() {
        const h = this.heap, top = h[0], last = h.pop();
        if (h.length) {
            h[0] = last;
            for (let i = 0; ;) {
                const l = 2 * i + 1, r = l + 1;
                let m = i;
                if (l < h.length && less(h[l], h[m])) m = l;
                if (r < h.length && less(h[r], h[m])) m = r;
                if (m === i) break;
                [h[m], h[i]] = [h[i], h[m]]; i = m;
            }
        }
        return top;
    }
    /** Run every event due by time t, in order; an event may schedule more. */
    runUntil(t) {
        let n = 0;
        while (this.heap.length && this.heap[0].t <= t) { const e = this.pop(); e.fn(e.t); n++; }
        return n;
    }
    /** Drop every event with this tag. */
    cancel(tag) { this.heap = this.heap.filter(e => e.tag !== tag); this.heap.sort((a, b) => less(a, b) ? -1 : 1); }
}
const less = (a, b) => a.t < b.t || (a.t === b.t && a.n < b.n);
