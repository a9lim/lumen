/* ===================================================================
   renderer.js — the scene: the specimen's cross-section above, the carbon
   network as a transit map below, one world under one camera. Desktop fits
   the world to the canvas; phones turn the map upright and pan and zoom it.
   The window (window.js) calls spawnProton / spawnPhoton / spawnElectronChain,
   poolEvent and mapEvent with what it samples; clicks go back out through
   onPulse and onRelease, tooltips ask onFactors.
   =================================================================== */
import { Membrane } from './membrane.js';
import { MapView } from './map.js';
import { drawMap } from './mapdraw.js';
import { PAIR } from './maplayout.js';
import Particles from './particles.js';
import Stroma from './stroma.js';
import { SPECIMENS } from './specimens.js';
import { simState, store } from './state.js';
import { flux, RUNNING } from './flux.js';
import { COMPLEX } from './mapbind.js';
import { ENZYMES, METABOLITES } from './info.js';
import * as K from './complexes.js';
import { panelTitle, scaleBar, hairline } from './plate.js';
import { drawLocator } from './locator.js';
import { drawDetail, drawCarrierSites } from './detail.js';

const TAU = Math.PI * 2;
const _ETC_INFO = { psii: 'PSII', ndh1: 'NDH1', sdh: 'SDH', pq: 'PQ', cytb6f: 'Cytb6f', pc: 'PC', cytOx: 'CytOx', psi: 'PSI', fd: 'Fd', fnr: 'FNR', atpSyn: 'ATPSyn', br: 'BR', nnt: 'NNT', ucp: 'UCP' };
const _SEG_INFO = { g0: 'HK', g1: 'PGI', g2: 'PFK', g3: 'ALDO', g5: 'GAPDH', g6: 'PGK', g7: 'PGM', g8: 'ENO', g9: 'PK', c7: 'PRK', c0: 'RuBisCO',
    c6: 'PGK', c5: 'GAPDH', c3: 'ALDO', c2: 'FBPase', c10: 'TKT', p0: 'G6PDH', p2: '6PGDH', p10: 'TKT', pdh: 'PDH', pdc: 'PDC', adh: 'ADH', ldh: 'LDH',
    aldh: 'ALDH', acs: 'ACS', kin: 'CS', k0: 'CS', k1: 'ACO', k2: 'IDH', k3: 'KGDH', k4: 'SCS', k5: 'SDH', k6: 'FUM', k7: 'MDH',
    b0: 'ACAD', b1: 'ECH', b2: 'HACD', b3: 'ACAT', bspur: 'ACAT' };
const _REV_INFO = { g0: 'G6Pase', g2: 'FBPase' };
const buzz = () => { if (typeof _haptics !== 'undefined') _haptics.trigger('light'); };
const HOLD_MS = 400;   // a press this long sustains a small perturbation until let go (and starts the paired baseline)
// What a stroma molecule's tooltip says
const _MOL_INFO = {
    atp: { on: 'ATP', off: 'ADP', total: 'totalAtpAdp', pool: 'adenylates', charged: 'carry three phosphates', what: 'Adenosine triphosphate / diphosphate', does: 'ATP synthase and the kinases make ATP; nearly every pathway spends it.' },
    nadh: { on: 'NADH', off: 'NAD⁺', total: 'totalNad', pool: 'NAD molecules', charged: 'are reduced', what: 'Nicotinamide adenine dinucleotide', does: 'Catabolism reduces NAD⁺; respiration hands NADH’s electrons to the chain.' },
    nadph: { on: 'NADPH', off: 'NADP⁺', total: 'totalNadp', pool: 'NADP molecules', charged: 'are reduced', what: 'NAD phosphate, the cell’s reducing power for building', does: 'FNR, the pentose phosphate pathway and NNT reduce it; the Calvin cycle and fatty-acid synthesis spend it.' },
    fadh2: { on: 'FADH₂', off: 'FAD', total: 'totalFad', pool: 'FAD molecules', charged: 'are reduced', what: 'Flavin adenine dinucleotide', does: 'Succinate dehydrogenase and β-oxidation reduce it; complex II passes its electrons to the quinone pool.' },
};
const _PAIR_OF = Object.fromEntries(Object.entries(PAIR).map(([a, b]) => [b, a]));   // a Calvin twin → the labelled corridor segment

const Renderer = {
    canvas: null, ctx: null, W: 0, H: 0, dpr: 1, camera: null,
    worldW: 0, worldH: 0, narrow: false,
    etcComplexes: {}, membraneY: 0, membraneH: 0,
    specId: 'thylakoid',
    onPulse: null, onRelease: null, onFactors: null, onInteract: null,
    hover: null, warm: false, _warmUntil: 0,
    rotor: { phase: 0, target: 0, seen: 0, split: 0 },
    _o2: { out: 0, in: 0 },
    _cache: null, _cacheKey: '', _wantKey: '', _wantT: 0,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = createCamera({ width: 100, height: 100, zoom: 1, minZoom: 1, maxZoom: 4, clamp: (c) => this._clamp(c) });
        this.resize();
        this.camera.bindWheel(canvas);
        this.camera.bindZoomButtons({
            zoomIn: document.getElementById('zoom-in-btn'), zoomOut: document.getElementById('zoom-out-btn'),
            reset: document.getElementById('zoom-reset-btn'), display: document.getElementById('zoom-indicator'),
            onReset: () => this.resetView(),
        });
        this._initInteraction();
        K.readPalette();
    },

    resize() {
        const r = this.canvas.parentElement.getBoundingClientRect();
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.W = Math.max(10, Math.round(r.width)); this.H = Math.max(10, Math.round(r.height));
        this.canvas.width = Math.round(this.W * this.dpr); this.canvas.height = Math.round(this.H * this.dpr);
        this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
        this.layout();
        this.camera.viewportW = this.W; this.camera.viewportH = this.H;
        this.resetView();
    },

    /** Lay out the membrane and the map for the current specimen and size. */
    layout() {
        const W = this.W, H = this.H, narrow = this.narrow = W < 640;
        const pad = narrow ? 12 : 18, top = narrow ? 14 : 66;
        const memBottom = Membrane.layout(this.specId, pad, W - pad, top, narrow, narrow ? 1e9 : Math.max(200, H * 0.46 - top));
        // The registers' titles and the scale bar sit between them
        this.titleY = memBottom + (narrow ? 15 : 18);
        const mapTop = memBottom + (narrow ? 48 : 58);
        const mh = MapView.build(pad, mapTop, W - 2 * pad, Math.max(200, H - mapTop - 12), narrow);
        this.worldW = W; this.worldH = Math.max(H, mapTop + mh + (narrow ? 24 : 14));
        this.etcComplexes = {};
        for (const [k, p] of Object.entries(Membrane.pos)) this.etcComplexes[k] = { cx: p.x, cy: p.y };
        this.membraneY = Membrane.memTop; this.membraneH = Membrane.memBot - Membrane.memTop;
        Particles.fill();
        Stroma.gapY = Membrane.bottom + 4;
        Stroma.relayout();
        this._cacheKey = '';
    },

    setSpecimen(id) {
        if (!SPECIMENS[id] || id === this.specId) return;
        this.specId = id;
        Particles.clear();
        this.layout();
    },

    resetView() {
        const c = this.camera;
        c.zoom = 1; c.x = this.W / 2; c.y = this.H / 2;
        this._clamp(c);
    },

    _clamp(cam) {
        const vw = cam.viewportW / cam.zoom, vh = cam.viewportH / cam.zoom;
        cam.zoom = Math.max(cam.minZoom, cam.zoom);
        cam.x = this.worldW <= vw ? this.worldW / 2 : Math.max(vw / 2, Math.min(this.worldW - vw / 2, cam.x));
        cam.y = this.worldH <= vh ? vh / 2 : Math.max(vh / 2, Math.min(this.worldH - vh / 2, cam.y));
    },

    themeChanged() { K.readPalette(); this._cacheKey = ''; },

    // ─── Engine hooks ───
    spawnProton(cx, dir) {
        if (this.warm || performance.now() < this._warmUntil) return;
        Particles.spawnProton(cx, dir);
    },
    spawnPhoton(key) { if (!this.warm) Particles.spawnPhoton(key); },
    spawnElectronChain(keys, type, callbacks, gates) {
        // Warming up, or a chain this specimen can't draw: its own effects land at once, and a
        // gated complex's land when that complex turns over (the window's short hop)
        if (this.warm || !Particles.spawnElectronChain(keys, type, callbacks, gates)) {
            for (let i = 0; i < keys.length; i++) if (callbacks && callbacks[i] && !(gates && gates[i])) callbacks[i]();
        }
    },
    /** A pool changed at a membrane complex (FNR's NADPH, from the chain's callback). */
    poolEvent(pool, d, siteKey) { if (!this.warm) Stroma.event(pool, d, Membrane.sites[siteKey]); },
    endWarm() { Stroma.fill(); this.warm = false; this._warmUntil = performance.now() + 1300; this.rotor.seen = store.atpOxidative; this.rotor.split = store.atpHydrolyzed; this._o2.out = Math.floor(store.o2Produced); this._o2.in = Math.floor(store.o2Consumed); Particles.fill(); Particles.seed(); },

    // ─── Per frame ───
    update(dt) {
        const R = this.rotor, s = Membrane.s, ox = store.atpOxidative, hy = store.atpHydrolyzed;
        // A third of a turn forward per ATP made, back per ATP split (a reset zeroes both tallies)
        if (ox < R.seen || hy < R.split) { R.seen = ox; R.split = hy; }
        R.target += (ox - R.seen - (hy - R.split)) * TAU / 3; R.seen = ox; R.split = hy;
        R.phase = Math.max(R.target - 2 * TAU, Math.min(R.target + 2 * TAU, R.phase));
        R.phase += (R.target - R.phase) * Math.min(1, dt * 2.5);
        const o = Math.floor(store.o2Produced), i = Math.floor(store.o2Consumed);
        if (o < this._o2.out || i < this._o2.in) { this._o2.out = o; this._o2.in = i; }
        if (o > this._o2.out && Membrane.pos.psii) Particles.emit('o2out', Membrane.pos.psii.x, Membrane.memTop - 5 * s);
        if (i > this._o2.in && Membrane.pos.cytOx) Particles.emit('o2in', Membrane.pos.cytOx.x, Membrane.memBot + 2 * s);
        this._o2.out = o; this._o2.in = i;
        Particles.update(dt);
        Stroma.update(dt);
        MapView.update(dt);
    },

    draw(dt) {
        const c = this.ctx;
        MapView.updateVis(dt);
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        c.fillStyle = K.P.canvas; c.fillRect(0, 0, this.W, this.H);
        c.save();
        this.camera.applyToCanvas(c);
        this._drawCache(c);
        Membrane.drawLive(c, this.rotor.phase);
        Stroma.draw(c, Membrane.s * this.camera.zoom * this.dpr);
        Stroma.drawRadicals(c);
        drawMap(c, this.hover && this.hover.kind !== 'mem' ? (this.hover.seg || this.hover.loop) : null, dt);
        Stroma.drawThreads(c);
        drawDetail(c, Membrane, this.camera.zoom);
        Particles.draw(c);
        drawCarrierSites(c, Membrane, this.camera.zoom, Particles.riding || []);
        Membrane.drawLabels(c, this.hover && this.hover.kind === 'mem' ? this.hover.key : null);
        this._drawTitles(c);
        // Where the cut is: the map's empty top right, on wide screens (the composite has no cell)
        if (!this.narrow && this.specId !== 'composite') {
            const [lx, ly] = MapView.T(20.3, -0.55), [lx2, ly2] = MapView.T(24.55, 2.25);
            if (lx2 - lx > 120) drawLocator(c, lx, ly, lx2 - lx, ly2 - ly, this.specId, { fs: 12, label: 'a' });
        }
        c.restore();
    },

    /** Panel a's title and scale under the cross-section, a hairline, panel b's title over the map. */
    _drawTitles(c) {
        const n = this.narrow, fs = n ? 10.5 : 12.5, x0 = Membrane.x0, y = this.titleY, spec = Membrane.spec;
        const r = panelTitle(c, x0 + 2, y, 'a', n ? spec.name : spec.name + ', cut through, to scale', fs);
        scaleBar(c, r + (n ? 14 : 22), y - 2, Membrane.s, 10, fs - 1.5);
        c.save(); c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = K.P.muted; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
        if (!n || Membrane.x1 - r > 150) c.fillText(spec.sides.below, Membrane.x1 - 2, y);
        c.restore();
        hairline(c, x0, Membrane.x1, y + 9);
        panelTitle(c, x0 + 2, y + 9 + fs + 8, 'b', n ? 'Carbon network' : 'The carbon network, by flux', fs);
    },

    /** The membrane's still parts, painted once per layout, theme and zoom. */
    _drawCache(c) {
        const z = this.camera.zoom, sc = Math.min(z * this.dpr, Math.sqrt(9e6 / (this.worldW * (Membrane.bottom + 4))));
        // Cell health is drawn as peroxidised lipids, up to 60% of them, repainted in twentieths
        const damage = Math.round(Math.min(1, Math.max(0, (100 - store.cellHealth) / 100)) * 0.6 * 20) / 20;
        const key = [this.specId, this.W, this.H, K.P.dark, damage, Math.round(sc * 4) / 4].join();
        if (key !== this._cacheKey) {
            // While a zoom is still changing, keep scaling the old paint; repaint once it has held for 140 ms
            const now = performance.now();
            if (key !== this._wantKey) { this._wantKey = key; this._wantT = now; }
            const sameScene = this._cache && this._cacheKey && this._cacheKey.split(',').slice(0, 5).join() === key.split(',').slice(0, 5).join();
            if (!sameScene || now - this._wantT >= 140) {
                const w = Math.ceil(this.worldW * sc), h = Math.ceil((Membrane.bottom + 4) * sc);
                const cv = this._cache && this._cache.width === w && this._cache.height === h ? this._cache : Object.assign(document.createElement('canvas'), { width: w, height: h });
                const x = cv.getContext('2d');
                x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h); x.setTransform(sc, 0, 0, sc, 0, 0);
                Membrane.drawStatic(x, this.camera.zoom, damage);
                this._cache = cv; this._cacheKey = key; this._cacheScale = sc;
            }
        }
        if (this._cache) c.drawImage(this._cache, 0, 0, this._cache.width / this._cacheScale, this._cache.height / this._cacheScale);
    },

    /**
     * The window sampled a map reaction changing a pool in the slab: a
     * molecule changes form and a thread runs from it to the enzyme's
     * connection on the map, which pulses.
     */
    mapEvent(pool, d, rid) {
        if (this.warm || !MapView.cell) return;
        const seg = MapView.cell.seg;
        for (const id in seg) {
            if (!seg[id].some(([r]) => r === rid)) continue;
            const v = MapView.vis[id];
            if (!v || v.hidden) continue;
            const owner = _PAIR_OF[id] || id, sg = MapView.segs[owner];
            MapView.pulse[id] = 1;
            const to = sg && sg.lab ? sg.lab.glyphAt || [sg.lab.x, sg.lab.y] : null;
            Stroma.event(pool, d, null, to);
            return;
        }
    },

    // ─── Input ───
    _pick(clientX, clientY) {
        const r = this.canvas.getBoundingClientRect();
        const w = this.camera.screenToWorld(clientX - r.left, clientY - r.top);
        const tol = 9 / this.camera.zoom;
        for (const h of Membrane.hit) {
            if (Math.abs(w.x - h.x) < h.w / 2 && Math.abs(w.y - h.y) < h.h / 2) return { kind: 'mem', key: h.key };
        }
        const B = Membrane.band;
        if (B && w.y > B.y0 - 4 && w.y < B.y1 + 4) { const m = Stroma.pick(w.x, w.y, Math.max(tol, 1.2 * Membrane.s)); if (m) return { kind: 'mol', m }; }
        return MapView.hitTest(w.x, w.y, tol);
    },

    _info(hit) {
        if (!hit) return null;
        if (hit.kind === 'mem') {
            const info = ENZYMES[_ETC_INFO[hit.key]];
            if (!info) return null;
            const name = Membrane.spec.names[hit.key];
            const f = this.onFactors && this.onFactors('mem:' + hit.key);
            return { ...info, name: info.name + (name && !info.name.includes(name) ? ' (' + name + ')' : ''), note: f || null };
        }
        if (hit.kind === 'seg') {
            const s = hit.seg, rev = (flux[s.id] || 0) < -RUNNING, info = ENZYMES[(rev && _REV_INFO[s.id]) || _SEG_INFO[s.id]];
            const f = this.onFactors && this.onFactors('seg:' + s.id);
            return info ? { ...info, note: f || null } : null;
        }
        if (hit.kind === 'loop') return ENZYMES[hit.loop.info] || null;
        if (hit.kind === 'station') return METABOLITES[hit.st.id] || null;
        if (hit.kind === 'mol') {
            const k = hit.m.pool, on = hit.m.on, M = _MOL_INFO[k], tot = store[M.total], n = store[k];
            return { name: on ? M.on : M.off, full: M.what, desc: `One of ${tot} ${M.pool} in the drawn slab (its mean count at the cell's concentration); ${n} ${M.charged}. ${M.does}` };
        }
        return null;
    },

    /** What a hit pulses: a complex's reactions, a segment's (with its corridor twin's), or a loop's line. */
    _target(hit) {
        if (!hit) return null;
        if (hit.kind === 'mem') return COMPLEX[hit.key] ? 'mem:' + hit.key : null;
        if (hit.kind === 'seg') { const id = hit.seg.id, twin = PAIR[id] || _PAIR_OF[id]; return twin ? ['seg:' + id, 'seg:' + twin] : 'seg:' + id; }
        if (hit.kind === 'loop') return hit.loop.segs ? hit.loop.segs.map(id => 'seg:' + id) : 'line:' + hit.loop.toggle;
        return null;
    },

    /** Pulse (sign 1) or inhibit (−1) what's under the pointer, each enzyme once; hold sustains it. */
    _fire(hit, sign, hold = false) {
        const t = this._target(hit);
        if (!t || !this.onPulse) return false;
        if (this.onInteract) this.onInteract();
        return this.onPulse(t, sign, hold);
    },
    _let(hit) { const t = this._target(hit); if (t && this.onRelease) this.onRelease(t); },

    _tip(x, y, info) {
        if (!this._tooltip) { this._tooltip = createSimTooltip(); this._tooltip.el.classList.add('canvas-tip'); }
        let html = '<strong>' + info.name + '</strong>';
        if (info.full) html += '<br><span class="ct-full">' + info.full + '</span>';
        if (info.eq) html += '<br><span class="ct-eq">' + info.eq + '</span>';
        html += '<br>' + info.desc;
        if (info.regulation) html += '<br><em>' + info.regulation + '</em>';
        if (info.note) html += '<br><em>' + info.note + '</em>';
        this._tooltip.el.innerHTML = html;
        this._tooltip.show(x, y);
    },

    _initInteraction() {
        const c = this.canvas;
        let down = null, moved = false, holdTimer = 0, held = null;
        c.addEventListener('mousedown', (e) => {
            down = { x: e.clientX, y: e.clientY, b: e.button }; moved = false;
            // Held still on an enzyme, the pulse holds at its peak until let go
            clearTimeout(holdTimer);
            const hit = this._pick(e.clientX, e.clientY);
            holdTimer = setTimeout(() => { if (down && !moved && this._fire(hit, down.b === 0 ? 1 : -1, true)) { held = hit; buzz(); } }, HOLD_MS);
        });
        window.addEventListener('mousemove', (e) => {
            if (down && down.b === 0) {
                if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 4) moved = true;
                if (moved) { this.camera.panBy(e.movementX, e.movementY); this._tooltip?.hide(); return; }
            }
            if (e.target !== c) return;
            const hit = this._pick(e.clientX, e.clientY);
            this.hover = hit;
            const info = this._info(hit);
            c.style.cursor = hit && (hit.kind === 'seg' || hit.kind === 'loop' || (hit.kind === 'mem' && COMPLEX[hit.key])) ? 'pointer' : hit ? 'help' : (this.camera.zoom > 1.001 || this.worldH > this.H + 1 ? 'grab' : '');
            if (info) this._tip(e.clientX, e.clientY, info); else this._tooltip?.hide();
        });
        window.addEventListener('mouseup', (e) => {
            clearTimeout(holdTimer);
            if (held) { this._let(held); held = null; }
            else if (down && !moved && e.target === c) {
                if (this._fire(this._pick(e.clientX, e.clientY), e.button === 0 ? 1 : -1)) buzz();
            }
            down = null;
        });
        c.addEventListener('contextmenu', (e) => e.preventDefault());
        c.addEventListener('mouseleave', () => { this.hover = null; this._tooltip?.hide(); });
        // Losing the window lets go of a hold, wherever the pointer was released
        const letGo = () => { clearTimeout(holdTimer); clearTimeout(touchTimer); if (held) { this._let(held); held = null; } down = null; tap = false; };
        window.addEventListener('blur', letGo);
        document.addEventListener('visibilitychange', () => { if (document.hidden) letGo(); });

        // Touch: one finger pans and taps, holding still sustains (with the long-press tooltip), two pinch
        let t0 = null, tap = false, pinch = 0, touchTimer = 0;
        c.addEventListener('touchstart', (e) => {
            clearTimeout(touchTimer);
            if (e.touches.length === 2) {
                const [a, b] = e.touches; pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); tap = false;
                if (held) { this._let(held); held = null; }
            } else if (e.touches.length === 1) {
                const t = e.touches[0];
                t0 = { x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY }; tap = true;
                const hit = this._pick(t.clientX, t.clientY);
                touchTimer = setTimeout(() => {
                    if (!tap) return;
                    tap = false;   // a long press is not a tap
                    const inhibit = typeof window._lumenReverseMode === 'function' && window._lumenReverseMode();
                    if (this._fire(hit, inhibit ? -1 : 1, true)) { held = hit; buzz(); }
                }, HOLD_MS);
            }
        }, { passive: true });
        c.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const r = c.getBoundingClientRect();
            if (e.touches.length === 2 && pinch) {
                const [a, b] = e.touches, d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                this.camera.zoomBy(d / pinch, (a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top); pinch = d;
            } else if (e.touches.length === 1 && t0) {
                const t = e.touches[0];
                if (Math.abs(t.clientX - t0.x) + Math.abs(t.clientY - t0.y) > 8) { tap = false; clearTimeout(touchTimer); }
                this.camera.panBy(t.clientX - t0.lx, t.clientY - t0.ly); t0.lx = t.clientX; t0.ly = t.clientY;
            }
        }, { passive: false });
        const touchOver = () => { clearTimeout(touchTimer); if (held) { this._let(held); held = null; } tap = false; t0 = null; pinch = 0; };
        c.addEventListener('touchcancel', touchOver);
        c.addEventListener('touchend', (e) => {
            clearTimeout(touchTimer);
            if (held && !e.touches.length) { this._let(held); held = null; tap = false; }
            if (tap && e.changedTouches.length === 1 && e.touches.length === 0) {
                const t = e.changedTouches[0];
                const inhibit = typeof window._lumenReverseMode === 'function' && window._lumenReverseMode();
                if (this._fire(this._pick(t.clientX, t.clientY), inhibit ? -1 : 1)) buzz();
            }
            if (e.touches.length < 2) pinch = 0;
            if (!e.touches.length) { tap = false; t0 = null; }
        });
        if (window.matchMedia('(pointer: coarse)').matches && typeof bindTooltipTouch === 'function') {
            if (!this._tooltip) { this._tooltip = createSimTooltip(); this._tooltip.el.classList.add('canvas-tip'); }
            bindTooltipTouch(c, (x, y) => {
                const info = this._info(this._pick(x, y));
                return info ? { text: info.name + (info.eq ? '\n' + info.eq : '') + '\n' + info.desc, screenX: x, screenY: y } : null;
            }, this._tooltip);
        }
    },
};

export default Renderer;
