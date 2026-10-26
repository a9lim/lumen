// Frame-by-frame probe of Lumen's animation: pops, teleports, flips, frame times.
import { createRequire } from 'node:module';
const require = createRequire('/Users/a9lim/Work/Exploratory/package.json');
const { chromium } = require('playwright-core');
const CHROME = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const orgs = (process.argv[2] || 'cyanobacterium').split(',');
const secs = +(process.argv[3] || 8);
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--enable-gpu-rasterization'] });
const out = {};
for (const org of orgs) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:' + (process.env.PORT || 8791) + '/lumen/', { waitUntil: 'networkidle' });
  if (org !== 'cyanobacterium') { await page.evaluate(k => document.querySelector(`[data-org="${k}"]`).click(), org); }
  await page.waitForTimeout(1500);
  out[org] = await page.evaluate(async (secs) => {
    const b = '/lumen/src/';
    const P = (await import(b + 'particles.js')).default, S = (await import(b + 'stroma.js')).default;
    const R = (await import(b + 'renderer.js')).default, { store } = await import(b + 'state.js');
    const { Membrane: M } = await import(b + 'membrane.js');
    let id = 0; const tag = new WeakMap(); const tg = o => { if (!tag.has(o)) tag.set(o, ++id); return tag.get(o); };
    const prevP = new Map(), prevM = new Map(), prevE = new Map(), prevC = new Map();
    const st = { frames: 0, dts: [], protonPops: 0, protonPopsPos: [], protonJumps: 0, protonMaxStep: 0, siteSpeedMax: 0,
      elecMaxStep: 0, elecJumps: 0, carrierPops: 0, molFlips: 0, molFlipsInDock: 0, molFlipBack: 0, molJumps: 0, dockZipMax: 0,
      flipsByIdx: {}, molJumpEx: [], carrierMaxStep: 0, carrierJumps: 0, carrierBusy: [], elecWaiting: [], popFrames: {}, warm0: R.warm, poolErr: [], qaMax: 0, totals: [], molCount: [], rotorSteps: [], idleChange: 0 };
    const s = M.s; let lastT = performance.now(); let lastBusy = null; let lastRot = R.rotor.phase;
    const flipT = new Map();
    const t0 = performance.now();
    await new Promise(res => {
      const f = (now) => {
        st.frames++; st.dts.push(now - lastT); lastT = now;
        // protons
        const seenP = new Set();
        for (const p of P.protons) {
          const k = tg(p); seenP.add(k);
          const q = prevP.get(k);
          if (!q) { if (st.frames > 1 && p.mode === 'lumen' && p.a >= 0.99) { st.protonPops++; st.popFrames[st.frames] = (st.popFrames[st.frames] || 0) + 1; if (st.protonPopsPos.length < 5) st.protonPopsPos.push([Math.round(p.x), Math.round(p.y)]); } }
          else { const d = Math.hypot(p.x - q.x, p.y - q.y); st.protonMaxStep = Math.max(st.protonMaxStep, d); if (d > 2.5 * s) st.protonJumps++; if (q.mode === 'site') st.siteSpeedMax = Math.max(st.siteSpeedMax, d); }
          prevP.set(k, { x: p.x, y: p.y, mode: p.mode });
        }
        for (const k of [...prevP.keys()]) if (!seenP.has(k)) prevP.delete(k);
        // the drawn pool (pooled and crossing up) against the gradient it stands for
        const pe = P.protons.filter(p => p.mode === 'lumen' || p.mode === 'up').length - Math.min(600, store.protonGradient);
        st.poolErr.push(pe); st.qaMax = Math.max(st.qaMax, P._qa || 0);
        // electrons
        for (const e of P.electrons) {
          const k = tg(e), w = P.where(e), q = prevE.get(k);
          if (w.hidden || e.gone) { prevE.delete(k); continue; }
          if (q) { const d = Math.hypot(w.x - q.x, w.y - q.y); st.elecMaxStep = Math.max(st.elecMaxStep, d); if (d > 4 * s) st.elecJumps++; }
          prevE.set(k, { x: w.x, y: w.y });
        }
        // carriers: each instance's step (persistent carriers); before them, a loaded carrier appearing was a teleport
        if (P.carriers) {
          for (const c of P.carriers) {
            const k = tg(c), q = prevC.get(k);
            if (q) { const d = Math.hypot(c.x - q.x, c.y - q.y); st.carrierMaxStep = Math.max(st.carrierMaxStep, d); if (d > 3 * s) { st.carrierJumps++; if (c.ld > 0.5) st.carrierPops++; } }
            prevC.set(k, { x: c.x, y: c.y });
          }
          st.carrierBusy.push(P.carriers.filter(c => c.job).length / Math.max(1, P.carriers.length));
        } else { const busy = (P.riding || []).length; if (lastBusy !== null && busy > lastBusy) st.carrierPops += busy - lastBusy; lastBusy = busy; }
        st.elecWaiting.push(P.electrons.filter(e => e.st === 'need' && !e.hidden).length);
        // stroma molecules
        S.mols.forEach((m, i) => {
          const k = tg(m), q = prevM.get(k);
          if (q) {
            const d = Math.hypot(m.x - q.x, m.y - q.y); if (d > 3 * s) { st.molJumps++; if (st.molJumpEx.length < 4) st.molJumpEx.push([m.pool, Math.round(q.x), Math.round(q.y), Math.round(m.x), Math.round(m.y), !!m.dock, st.frames]); } if (m.dock || q.dock) st.dockZipMax = Math.max(st.dockZipMax, d);
            // a docked molecule changing its mind: the same dock's fate flips (its change on release is legitimate)
            if (q.dockObj && q.dockObj === m.dock && q.to !== m.dock.to) st.molFlipsInDock++;
            if (q.on !== m.on) { st.molFlips++; st.flipsByIdx[i] = (st.flipsByIdx[i] || 0) + 1; const lt = flipT.get(k); if (lt && now - lt < 1000) st.molFlipBack++; flipT.set(k, now); }
          }
          prevM.set(k, { x: m.x, y: m.y, on: m.on, dock: !!m.dock, dockObj: m.dock, to: m.dock && m.dock.to });
        });
        st.totals.push(store.totalAtpAdp + '/' + store.atp); st.molCount.push(S.mols.filter(m => m.pool === 'atp').length);
        const dr = R.rotor.phase - lastRot; lastRot = R.rotor.phase; st.rotorSteps.push(dr);
        if (now - t0 < secs * 1000) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    const dts = st.dts.slice(1).sort((a, b) => a - b);
    const q = p => dts[Math.floor(p * (dts.length - 1))];
    const flipIdx = Object.entries(st.flipsByIdx).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const rs = st.rotorSteps.map(Math.abs); const rmax = Math.max(...rs);
    return { s: +s.toFixed(2), frames: st.frames, fps: +(st.frames / secs).toFixed(1), dt50: q(0.5).toFixed(1), dt95: q(0.95).toFixed(1), dtMax: dts[dts.length - 1].toFixed(1), long: dts.filter(d => d > 34).length,
      protonPops: st.protonPops, popFrames: Object.entries(st.popFrames).slice(0, 6).map(([f, n]) => f + ':' + n).join(' '), warmAtStart: st.warm0, popPos: st.protonPopsPos, protonJumps: st.protonJumps, protonMaxStep: +st.protonMaxStep.toFixed(1), siteStepMax: +st.siteSpeedMax.toFixed(1),
      elecMaxStep: +st.elecMaxStep.toFixed(1), elecJumps: st.elecJumps, carrierPops: st.carrierPops, carrierMaxStep: +st.carrierMaxStep.toFixed(1), carrierJumps: st.carrierJumps,
      carrierBusy: st.carrierBusy.length ? +(st.carrierBusy.reduce((a, b) => a + b, 0) / st.carrierBusy.length).toFixed(2) : null, elecWaitingMean: +(st.elecWaiting.reduce((a, b) => a + b, 0) / st.elecWaiting.length).toFixed(1), electronsNow: P.electrons.length,
      molFlips: st.molFlips, molFlipsInDock: st.molFlipsInDock, molFlipBackWithin1s: st.molFlipBack, molJumps: st.molJumps, molJumpEx: st.molJumpEx, dockStepMax: +st.dockZipMax.toFixed(1),
      topFlippers: flipIdx, nMols: S.mols.length, totalsStart: st.totals[0], totalsEnd: st.totals[st.totals.length - 1], distinctTotals: new Set(st.totals.map(t => t.split('/')[0])).size, molCountAtp: st.molCount[0],
      poolErrMean: +(st.poolErr.reduce((a, b) => a + b, 0) / st.poolErr.length).toFixed(1), poolErrMax: Math.max(...st.poolErr.map(Math.abs)), qaMax: Math.round(st.qaMax),
      rotorMaxStepRad: +rmax.toFixed(3), protonsNow: P.protons.length, gradient: store.protonGradient };
  }, secs);
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
